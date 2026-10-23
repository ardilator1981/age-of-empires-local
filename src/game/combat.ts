import type { AttackType, Bonus } from '../core/types';
import type { Entity } from './Entity';
import type { Game } from './Game';
import { BALANCE } from '../config/balance';
import { edgeDist, setOrder } from './actions';
import { advantage, heightDamageFactor, heightOf } from './heightRules';
import { retaliation } from './army/stances';
import { cos, hypot, sin } from './fmath';

export interface DamageInfo {
  attack: number;
  type: AttackType;
  bonus: Bonus[];
  owner: number;
  attackerId: number;
  /** Altura del terreno del atacante. */
  fromHeight?: number;
  /** Ataque a distancia (las reglas de altura cambian). */
  ranged?: boolean;
  /** Daño de área: radio, pérdida de daño en el borde y daño ya reducido por la distancia al centro. */
  splash?: { radius: number; falloff: number };
  /** Factor del daño final (el área lo usa para atenuar el borde). */
  mul?: number;
  /** El daño no se reduce con la armadura (aceite hirviendo). */
  ignoreArmor?: boolean;
}

export interface Projectile {
  sx: number; sy: number;
  ex: number; ey: number;
  /** Altura inicial en píxeles (zoom 1). */
  sh: number;
  t: number;
  dur: number;
  targetId: number;
  info: DamageInfo;
  style: string;
  /** No sigue al objetivo: cae en (ex, ey) (proyectiles de área). */
  fixed?: boolean;
  done?: boolean;
}

/** Ataca a `t`: cuerpo a cuerpo aplica el daño ya; a distancia lanza un proyectil. */
export function performAttack(game: Game, a: Entity, t: Entity) {
  if (!game.canAttack(a, t, true)) return;
  const p = game.players[a.owner];
  const def = game.defOf(a);
  const info: DamageInfo = {
    attack: p.getStat(def, 'attack') * auraOf(game, a).attackMul,
    type: def.attackType ?? 'melee',
    bonus: def.bonus ?? [],
    owner: a.owner,
    attackerId: a.id,
    fromHeight: heightOf(game, a),
    ranged: p.getStat(def, 'range') >= 1,
  };
  a.attackAnim = 0.35;
  // Marca visible de ventaja de altura (la interfaz la muestra sobre la unidad)
  const adv = advantage(game, a, t);
  if (adv.range > 0 || adv.damage !== 0) a.data.heightAdv = { ...adv, until: game.time + 2.5 };
  else delete a.data.heightAdv;
  if (info.ranged) {
    // Área: cae donde estaba el objetivo, con el error de puntería de la unidad
    let ex = t.x, ey = t.y;
    if (def.splash) {
      info.splash = { radius: def.splash.radius, falloff: def.splash.falloff ?? 0.5 };
      const scatter = def.splash.scatter ?? 0;
      if (scatter > 0) {
        const ang = game.rng() * Math.PI * 2, r = Math.sqrt(game.rng()) * scatter;
        ex += cos(ang) * r; ey += sin(ang) * r;
      }
    }
    const d = hypot(ex - a.x, ey - a.y);
    game.projectiles.push({
      sx: a.x, sy: a.y, ex, ey,
      sh: a.kind === 'building' ? 40 : 14,
      t: 0, dur: Math.max(0.15, d / BALANCE.combat.projectileSpeed), targetId: t.id, info, style: def.projectile ?? 'arrow',
      ...(info.splash ? { fixed: true } : {}),
    });
  } else {
    dealDamage(game, t, info);
  }
}

/** Bonificación del aura de una unidad propia cercana (p. ej. el General), si la tiene ahora. */
export function auraOf(game: Game, e: Entity): { attackMul: number; armorAdd: number } {
  const a = e.data.aura as { attackMul: number; armorAdd: number; until: number } | undefined;
  return a && a.until >= game.time ? a : { attackMul: 1, armorAdd: 0 };
}

export function computeDamage(game: Game, t: Entity, info: DamageInfo): number {
  const tp = game.players[t.owner];
  const tdef = game.defOf(t);
  const armor = tp.getStat(tdef, info.type === 'melee' ? 'armorMelee' : 'armorPierce') + auraOf(game, t).armorAdd;
  let dmg = info.ignoreArmor ? info.attack : Math.max(0, info.attack - armor);
  for (const b of info.bonus) if (tdef.classes.includes(b.vs)) dmg += b.amount;
  // Ventaja de altura (valores en BALANCE.highGround)
  if (info.fromHeight !== undefined) {
    const diff = (info.fromHeight - heightOf(game, t)) / BALANCE.relief.levelStep;
    dmg *= heightDamageFactor(diff, !!info.ranged);
  }
  if (info.mul !== undefined) dmg *= info.mul;
  return Math.max(1, Math.round(dmg * 10) / 10);
}

export function dealDamage(game: Game, t: Entity, info: DamageInfo) {
  if (t.dead || t.kind === 'resource' || t.inside) return;
  const dmg = computeDamage(game, t, info);
  t.hp -= dmg;
  t.lastHitAt = game.time;
  const attacker = game.get(info.attackerId);
  game.events.emit('damaged', { target: t, attacker, amount: dmg });

  const tp = game.players[t.owner];
  if (tp.isHuman && game.isEnemy(info.owner, t.owner)) {
    const kind = t.kind === 'building' ? 'building' : 'unit';
    const text = kind === 'building' ? '¡Están atacando un edificio!' : '¡Te están atacando!';
    if (game.warn(tp, 'attacked:' + kind, text, BALANCE.alerts.attackEvery, { x: t.x, y: t.y })) {
      game.events.emit('underAttack', { playerId: tp.id, target: t, attacker, kind });
    }
  }
  // Contraataque de unidades militares desocupadas, según su postura
  if (attacker && t.kind === 'unit' && !t.order) {
    const def = game.unitDef(t);
    if (!def.gatherer && (def.attack ?? 0) > 0 && game.canAttack(t, attacker, false)) {
      const o = retaliation(game, t, attacker);
      if (o) setOrder(t, o);
    }
  }
  if (t.hp <= 0) game.kill(t, attacker);
}

export function updateProjectiles(game: Game, dt: number) {
  for (const pr of game.projectiles) {
    const tgt = game.get(pr.targetId);
    if (tgt && !pr.fixed) { pr.ex = tgt.x; pr.ey = tgt.y; }
    pr.t += dt / pr.dur;
    if (pr.t >= 1) {
      pr.done = true;
      if (pr.info.splash) splashDamage(game, pr);
      else if (tgt) dealDamage(game, tgt, pr.info);
    }
  }
  game.projectiles = game.projectiles.filter(p => !p.done);
}

/**
 * El asedio solo elige edificios por su cuenta, salvo el que lleva la clase `antiUnit`
 * (catapulta, escorpión, artillería de campaña), que también dispara a las tropas.
 */
export function buildingsOnly(def: { classes: string[] }): boolean {
  return def.classes.includes('siege') && !def.classes.includes('antiUnit');
}

/** Daño de área en el punto de caída: a todos los enemigos dentro del radio, más flojo hacia el borde. */
function splashDamage(game: Game, pr: Projectile) {
  const { radius, falloff } = pr.info.splash!;
  const attacker = game.get(pr.info.attackerId);
  // Se recoge antes de dañar: matar a uno cambia las listas
  const hit: { e: Entity; mul: number }[] = [];
  for (const e of game.actors) {
    if (e.dead || e.kind === 'resource' || !game.isEnemy(pr.info.owner, e.owner)) continue;
    if (attacker && game.reg.combatRules.length && !game.canAttack(attacker, e, true)) continue;
    const d = Math.max(0, hypot(e.x - pr.ex, e.y - pr.ey) - (e.kind === 'building' ? e.size / 2 : 0));
    if (d > radius) continue;
    hit.push({ e, mul: 1 - falloff * (d / radius) });
  }
  for (const h of hit) dealDamage(game, h.e, { ...pr.info, mul: h.mul });
}

/** Tramo de muro o empalizada (no su puerta): lo último que atacan las tropas a pie. */
function wallLike(game: Game, e: Entity): boolean {
  const c = game.reg.building(e.defId).classes;
  return c.includes('wall') && !c.includes('gate');
}

/**
 * Enemigo más cercano a `from` dentro de `radius`.
 * Las unidades tienen prioridad sobre los edificios; `buildingsOnly` para asedio.
 */
export function findEnemyNear(game: Game, from: Entity, radius: number, includeBuildings: boolean, buildingsOnly = false, accept?: (e: Entity, d: number) => boolean): Entity | null {
  let bestU: Entity | null = null, bestUD = radius;
  let bestB: Entity | null = null, bestBD = radius;
  for (const e of game.actors) {
    if (e.dead || !game.isEnemy(from.owner, e.owner)) continue;
    // Reglas de los mods (zona de batalla, tregua...); los edificios no se mueven: tienen que poder golpear ya
    if (game.reg.combatRules.length && !game.canAttack(from, e, from.kind === 'building')) continue;
    if (e.kind === 'unit') {
      if (buildingsOnly) continue;
      const d = hypot(e.x - from.x, e.y - from.y) - (from.kind === 'building' ? from.size / 2 : 0);
      if (d < bestUD && (!accept || accept(e, d))) { bestUD = d; bestU = e; }
    } else if (includeBuildings || buildingsOnly) {
      let d = from.kind === 'unit' ? edgeDist(from, e) : hypot(e.x - from.x, e.y - from.y);
      // Las tropas a pie prefieren cualquier otra cosa antes que picar un muro (el asedio y las puertas no tienen esa manía)
      if (from.kind === 'unit' && wallLike(game, e) && !game.unitDef(from).classes.includes('siege')) d *= BALANCE.defense.wallTargetPenalty;
      if (d < bestBD && (!accept || accept(e, d))) { bestBD = d; bestB = e; }
    }
  }
  return bestU ?? bestB;
}
