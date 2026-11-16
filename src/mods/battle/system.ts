import { BALANCE } from '../../config/balance';
import type { DamageModifier, Pt, System } from '../../core/types';
import type { Entity } from '../../game/Entity';
import type { Game } from '../../game/Game';
import { createGroup } from '../../game/army/groups';
import { cos, hypot, sin } from '../../game/fmath';
import { aliveMembers, battleState, hitZone, kindOf, moraleCap, regimentOf, regiments, type BattleState, type Regiment } from './state';

const B = BALANCE.battle;

function norm(v: Pt): Pt { const d = hypot(v.x, v.y) || 1; return { x: v.x / d, y: v.y / d }; }

function isMelee(game: Game, u: Entity): boolean {
  return game.players[u.owner].getStat(game.unitDef(u), 'range') < 1;
}

/**
 * Factor del daño de un golpe (`reg.addDamageModifier`): ablandamiento general, ángulo (flanco y
 * retaguardia), huida, vacilación y carga. Es puro: lo que cambia el estado (moral, ímpetu) lo hacen
 * los eventos `damaged` y `entityDied`.
 */
export const battleDamage: DamageModifier = (game, t, info) => {
  if (t.kind !== 'unit') return 1;
  const tr = regimentOf(game, t);
  if (!tr) return 1;
  const a = game.get(info.attackerId);
  const hasBonus = !!a && a.kind === 'unit' && game.unitDef(a).bonus?.some(b => game.unitDef(t).classes.includes(b.vs));
  let mul = hasBonus ? B.bonusMul : B.damageMul;
  if (!a || a.kind !== 'unit') return mul;
  const zone = hitZone(tr, a);
  if (tr.routed) mul *= B.routedDamage;
  else if (zone === 'rear') mul *= B.rearMul;
  else if (zone === 'flank') mul *= B.flankMul;
  const ar = regimentOf(game, a);
  if (ar) {
    if (!ar.routed && ar.morale < B.wavering) mul *= B.waveringDamage;
    // Primer golpe de cada jinete de una carga; de frente contra lanceros, anulada
    if (ar.charging && !ar.struck.includes(a.id) && !(tr.lance && !tr.routed && zone === 'front')) mul *= B.chargeMul;
  }
  return mul;
};

/**
 * Capa táctica: regimientos automáticos, moral, huida y recuperación, ímpetu de la carga, orientación
 * y General caído. La moral se actualiza a `BALANCE.battle.step` segundos, después del combate.
 */
export class BattleSystem implements System {
  constructor(private game: Game) {
    game.events.on('damaged', ev => this.onDamaged(ev.target, ev.attacker));
    game.events.on('entityDied', ev => this.onDied(ev.entity));
  }

  private state(): BattleState {
    return (this.game.data.battle ??= { regs: {}, next: 1, generalDead: {}, acc: 0 });
  }

  // ------------------------------------------------------------------ eventos
  private onDamaged(t: Entity, a: Entity | undefined) {
    const g = this.game, st = battleState(g);
    if (!st || t.kind !== 'unit') return;
    const tr = regimentOf(g, t);
    if (!tr || !a || a.kind !== 'unit') return;
    // Fuego propio (artillería): moral, una vez por regimiento y tick
    if (a.owner === t.owner) {
      if (tr.ffTick !== g.tick) { tr.ffTick = g.tick; tr.morale -= B.friendlyFireMorale; }
      return;
    }
    const melee = isMelee(g, a);
    const zone = hitZone(tr, a);
    const w = melee ? 1 : B.rangedWeight, d = hypot(a.x - tr.center.x, a.y - tr.center.y) || 1;
    tr.threat.x += (a.x - tr.center.x) / d * w;
    tr.threat.y += (a.y - tr.center.y) / d * w;
    if (!tr.routed && melee) {
      if (zone === 'rear') tr.rearUntil = g.time + B.hitLingers;
      else if (zone === 'flank') tr.flankUntil = g.time + B.hitLingers;
    }
    const ar = regimentOf(g, a);
    if (ar && ar.charging && !ar.struck.includes(a.id)) {
      ar.struck.push(a.id);
      if (ar.chargeUntil < 0) ar.chargeUntil = g.time + B.chargeLasts;
      if (tr.lance && !tr.routed && zone === 'front') {
        // Muro de lanzas: carga anulada y contragolpe
        a.hp -= B.spearCounter;
        if (a.hp <= 0) g.kill(a, t);
      } else if (!ar.chargeHit.includes(tr.id)) {
        ar.chargeHit.push(tr.id);
        tr.morale -= B.chargeHit;
      }
    }
  }

  private onDied(e: Entity) {
    const g = this.game, st = battleState(g);
    if (!st || e.kind !== 'unit') return;
    const r = regimentOf(g, e);
    if (r) r.morale -= (100 / r.initial) / 5 * B.perLoss;
    const d = g.unitDef(e);
    if (d.classes.includes('hero') && d.aura) {
      st.generalDead[e.owner] = true;
      for (const x of regiments(g)) if (x.owner === e.owner) x.morale -= B.generalDead;
      const p = g.players[e.owner];
      g.notify(p.isHuman ? '🎖️ ¡Ha caído tu General! Las tropas pierden la moral' : `🎖️ ¡Ha caído el General de ${p.name}!`, undefined, p.isHuman ? 'warn' : 'good', { x: e.x, y: e.y });
    }
  }

  // ------------------------------------------------------------------ sistema
  update(dt: number) {
    const g = this.game, st = this.state();
    if (g.tick % 20 === 0) this.assign(st);
    this.refresh(st);
    st.acc += dt;
    if (st.acc + 1e-9 < B.step) return;
    const step = st.acc;
    st.acc = 0;
    this.think(st, step);
  }

  /** Reparte los soldados sin regimiento: se unen a uno cercano del mismo tipo con hueco o forman uno nuevo. */
  private assign(st: BattleState) {
    const g = this.game;
    for (const u of g.units) {
      if (u.dead || u.inside || u.onWall || regimentOf(g, u)) continue;
      const k = kindOf(g, u);
      if (!k) continue;
      let best: Regiment | undefined, bd = B.joinRadius;
      for (const r of Object.values(st.regs)) {
        if (r.owner !== u.owner || r.defId !== u.defId || r.members.length >= r.size || r.routed) continue;
        const d = hypot(r.center.x - u.x, r.center.y - u.y);
        if (d <= bd) { bd = d; best = r; }
      }
      if (!best) {
        const id = st.next++;
        best = {
          id, owner: u.owner, defId: u.defId, cls: k.cls, members: [], initial: 0, size: k.size, morale: k.morale, base: k.morale,
          routed: false, prevStance: 'aggressive', lance: g.unitDef(u).classes.includes('spear'), cavalry: k.cls === 'cavalry', hero: k.cls === 'hero',
          center: { x: u.x, y: u.y }, facing: this.defaultFacing(u), vx: 0, vy: 0, threat: { x: 0, y: 0 }, lastPos: null, lastEnemyNear: -99,
          flankUntil: 0, rearUntil: 0, chargeT: 0, charging: false, chargeUntil: -1, struck: [], chargeHit: [], ffTick: -1,
        };
        st.regs[id] = best;
      }
      best.members.push(u.id);
      best.initial = Math.max(best.initial, best.members.length);
      u.data.reg = best.id;
    }
  }

  /** Mira hacia el enemigo más cercano (o hacia el centro del mapa). */
  private defaultFacing(u: Entity): Pt {
    const g = this.game;
    let best: Entity | null = null, bd = Infinity;
    for (const e of g.units) {
      if (e.dead || !g.isEnemy(u.owner, e.owner)) continue;
      const d = hypot(e.x - u.x, e.y - u.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best ? norm({ x: best.x - u.x, y: best.y - u.y }) : norm({ x: g.map.w / 2 - u.x, y: g.map.h / 2 - u.y });
  }

  /** Quita a los muertos, borra los regimientos vacíos y recalcula centros. */
  private refresh(st: BattleState) {
    const g = this.game;
    for (const r of Object.values(st.regs)) {
      r.members = r.members.filter(id => !!g.get(id));
      if (!r.members.length) { delete st.regs[r.id]; continue; }
      let x = 0, y = 0;
      for (const id of r.members) { const u = g.get(id)!; x += u.x; y += u.y; }
      r.center = { x: x / r.members.length, y: y / r.members.length };
    }
  }

  private think(st: BattleState, step: number) {
    const g = this.game, now = g.time;
    // Un General nuevo levanta el techo de moral
    for (const k of Object.keys(st.generalDead)) {
      const pid = Number(k);
      if (st.generalDead[pid] && g.units.some(u => !u.dead && u.owner === pid && g.unitDef(u).classes.includes('hero') && g.unitDef(u).aura)) delete st.generalDead[pid];
    }
    const regs = Object.values(st.regs);
    for (const r of regs) {
      const c = r.center, cap = moraleCap(st, r);
      // Enemigo más cercano y recuento cercano (de los enemigos, solo cuerpo a cuerpo)
      let dEnemy = Infinity, own = 0, foe = 0, nearest: Entity | null = null;
      for (const u of g.units) {
        if (u.dead || u.inside) continue;
        const d = hypot(u.x - c.x, u.y - c.y);
        if (u.owner === r.owner) { if (d <= B.nearRadius) own++; continue; }
        if (!g.isEnemy(r.owner, u.owner)) continue;
        if (d < dEnemy) { dEnemy = d; nearest = u; }
        if (d <= B.nearRadius && isMelee(g, u)) foe++;
      }
      if (dEnemy <= B.pursuitRadius) r.lastEnemyNear = now;
      this.orient(r, step);
      this.charge(r, step, regs);

      if (!r.routed) {
        if (now < r.rearUntil) r.morale -= B.rearPerSec * step;
        else if (now < r.flankUntil) r.morale -= B.flankPerSec * step;
        if (dEnemy <= B.nearRadius && foe >= B.outnumbered * own) r.morale -= B.outnumberedPerSec * step;
        if (!r.hero && this.generalNear(regs, r)) r.morale = Math.min(cap, r.morale + B.generalPerSec * step);
        if (dEnemy > B.farRadius) r.morale = Math.min(cap, r.morale + B.farPerSec * step);
        else if (dEnemy > B.reserveRadius) r.morale = Math.min(cap, r.morale + B.reservePerSec * step);
        r.morale = Math.min(r.morale, 100);
        if (r.morale <= 0) this.rout(regs, st, r, nearest);
      } else {
        // Sigue sin aceptar órdenes: si algo la sacó de la retirada, vuelve a ella
        if (aliveMembers(g, r).some(u => u.order?.type !== 'formation')) this.flee(r, nearest);
        if (now - r.lastEnemyNear >= B.recoverAfter && dEnemy > B.farRadius) this.recover(r, cap);
      }
    }
  }

  private generalNear(regs: Regiment[], r: Regiment): boolean {
    for (const o of regs) {
      if (!o.hero || o.owner !== r.owner || o.routed) continue;
      if (hypot(o.center.x - r.center.x, o.center.y - r.center.y) <= B.auraRadius) return true;
    }
    return false;
  }

  /** Velocidad del centro y orientación: la de la marcha si se mueve; parado, gira hacia donde le pegan (con límite de giro). */
  private orient(r: Regiment, step: number) {
    const last = r.lastPos;
    r.lastPos = { x: r.center.x, y: r.center.y };
    const decay = Math.max(0, 1 - step / B.turnMemory);
    r.threat.x *= decay; r.threat.y *= decay;
    if (last) { r.vx = (r.center.x - last.x) / step; r.vy = (r.center.y - last.y) / step; }
    const v = hypot(r.vx, r.vy);
    // En marcha mira hacia donde va (giro más rápido); parado, hacia donde le pegan
    if (v > B.marchSpeed) this.turnTo(r, { x: r.vx / v, y: r.vy / v }, B.turnRate * 2, step);
    else if (!r.routed && hypot(r.threat.x, r.threat.y) > 0.5) this.turnTo(r, norm(r.threat), B.turnRate, step);
  }

  /** Gira la orientación hacia `w` como mucho `rate` grados por segundo (sin trigonometría de `Math`). */
  private turnTo(r: Regiment, w: Pt, rate: number, step: number) {
    const f = r.facing;
    const th = rate * Math.PI / 180 * step, c = cos(th), s = sin(th);
    if (f.x * w.x + f.y * w.y >= c) { r.facing = w; return; }
    const sg = f.x * w.y - f.y * w.x >= 0 ? 1 : -1;
    r.facing = norm({ x: f.x * c - sg * f.y * s, y: sg * f.x * s + f.y * c });
  }

  /** Ímpetu de la caballería: avanzar a toda velocidad hacia un regimiento enemigo cercano. */
  private charge(r: Regiment, step: number, regs: Regiment[]) {
    if (!r.cavalry) return;
    const g = this.game;
    if (r.routed) { r.charging = false; r.chargeT = 0; return; }
    const v = hypot(r.vx, r.vy);
    let ref = Infinity;
    for (const u of aliveMembers(g, r)) ref = Math.min(ref, g.players[u.owner].getStat(g.unitDef(u), 'speed'));
    let aligned = -1;
    for (const o of regs) {
      if (o.routed || !g.isEnemy(r.owner, o.owner)) continue;
      const dx = o.center.x - r.center.x, dy = o.center.y - r.center.y, d = hypot(dx, dy) || 1;
      if (d > B.chargeRange) continue;
      aligned = Math.max(aligned, (r.vx * dx + r.vy * dy) / (d * (v || 1)));
    }
    if (v >= B.chargeSpeedFraction * ref && aligned >= 0.6) r.chargeT += step;
    else r.chargeT = Math.max(0, r.chargeT - step * 2);
    if (!r.charging && r.chargeT >= B.chargeBuildUp) { r.charging = true; r.chargeUntil = -1; r.struck = []; r.chargeHit = []; }
    // Termina 3 s después del primer golpe, o si se detiene sin golpear
    else if (r.charging && ((r.chargeUntil >= 0 && g.time > r.chargeUntil) || (r.chargeUntil < 0 && r.chargeT <= 0))) { r.charging = false; r.chargeT = 0; }
  }

  // ------------------------------------------------------------------ huida y recuperación
  private rout(regs: Regiment[], st: BattleState, r: Regiment, nearest: Entity | null) {
    const g = this.game;
    r.routed = true; r.morale = 0; r.charging = false; r.chargeT = 0; r.lastEnemyNear = g.time;
    const us = aliveMembers(g, r);
    if (us.length) r.prevStance = us[0].stance;
    this.flee(r, nearest);
    // Contagio a los vecinos propios; ánimo a los enemigos que lo ven
    for (const o of regs) {
      if (o === r || o.routed) continue;
      const d = hypot(o.center.x - r.center.x, o.center.y - r.center.y);
      if (o.owner === r.owner && d <= B.contagionRadius) o.morale -= B.contagion;
      else if (g.isEnemy(r.owner, o.owner) && d <= B.sightRadius) o.morale = Math.min(moraleCap(st, o), o.morale + B.enemyRouts);
    }
  }

  /** Orden de huida: todos sin atacar, en dirección contraria al enemigo más cercano. */
  private flee(r: Regiment, nearest: Entity | null) {
    const g = this.game, us = aliveMembers(g, r);
    if (!us.length) return;
    const away = nearest ? norm({ x: r.center.x - nearest.x, y: r.center.y - nearest.y }) : { x: -r.facing.x, y: -r.facing.y };
    const tx = Math.max(2, Math.min(g.map.w - 3, r.center.x + away.x * B.fleeDistance));
    const ty = Math.max(2, Math.min(g.map.h - 3, r.center.y + away.y * B.fleeDistance));
    const to = g.findFreeTile(tx, ty, 12) ?? { x: r.center.x, y: r.center.y };
    for (const u of us) u.stance = 'passive';
    createGroup(g, us, { type: 'loose', mode: 'retreat', route: [to] });
  }

  private recover(r: Regiment, cap: number) {
    r.routed = false;
    r.morale = Math.min(cap, B.recoverTo);
    for (const u of aliveMembers(this.game, r)) u.stance = r.prevStance;
  }
}
