import type { System } from '../../core/types';
import { BALANCE } from '../../config/balance';
import { setOrder } from '../actions';
import { rangeBonus } from '../heightRules';
import { castVision, eyeHeight, sightRadius } from '../vision';
import { findEnemyNear, performAttack, updateProjectiles } from '../combat';
import { anchorOf, engageOrder, stanceTarget } from '../army/stances';
import type { Entity } from '../Entity';
import type { Game } from '../Game';
import { hypot } from '../fmath';
import { isHuntable } from '../wildlife';

/**
 * Sistemas básicos de la simulación. Se registran en el Registry desde el mod
 * core con una prioridad; un mod puede sustituir cualquiera por el suyo.
 */

/** Recalcula población y recuentos de cada jugador. */
export class PlayerStatsSystem implements System {
  constructor(private game: Game) {}
  update() {
    const g = this.game;
    for (const p of g.players) { p.counts.clear(); p.pending.clear(); p.popUsed = 0; p.popCap = 0; }
    for (const e of g.actors) {
      if (e.dead || e.owner === 0) continue;
      const p = g.players[e.owner];
      if (e.kind === 'unit') {
        p.counts.set(e.defId, (p.counts.get(e.defId) ?? 0) + 1);
        p.popUsed += g.unitDef(e).pop;
      } else if (e.kind === 'building') {
        if (e.complete) {
          p.counts.set(e.defId, (p.counts.get(e.defId) ?? 0) + 1);
          p.popCap += p.getStat(g.buildingDef(e), 'popProvided');
          const q = e.queue[0];
          if (q && q.kind === 'unit' && q.progress > 0) p.popUsed += g.reg.unit(q.id).pop;
        } else {
          p.pending.set(e.defId, (p.pending.get(e.defId) ?? 0) + 1);
        }
      }
    }
    for (const p of g.players) p.popCap = Math.min(p.popCap, g.opts.popLimit);
  }
}

/** Ejecuta la orden actual de cada unidad. */
export class OrderSystem implements System {
  constructor(private game: Game) {}
  update(dt: number) {
    const g = this.game;
    for (const u of g.units) {
      if (u.dead) continue;
      if (u.cooldown > 0) u.cooldown -= dt;
      if (u.attackAnim > 0) u.attackAnim -= dt;
      if (!u.order) { u.working = false; continue; }
      const h = g.reg.orders.get(u.order.type);
      if (h) h.update(g, u, u.order, dt);
      else setOrder(u, null);
    }
  }
}

/** Mueve las unidades por su camino y las separa entre sí. */
export class MovementSystem implements System {
  private buckets = new Map<number, Entity[]>();
  constructor(private game: Game) {}

  private tryMove(u: Entity, nx: number, ny: number): boolean {
    const m = this.game.map;
    const cur = m.walkable(Math.floor(u.x), Math.floor(u.y));
    if (m.walkable(Math.floor(nx), Math.floor(ny)) || !cur) { u.x = nx; u.y = ny; return true; }
    if (m.walkable(Math.floor(nx), Math.floor(u.y))) { u.x = nx; return true; }
    if (m.walkable(Math.floor(u.x), Math.floor(ny))) { u.y = ny; return true; }
    return false;
  }

  update(dt: number) {
    const g = this.game, m = g.map, mv = BALANCE.movement;
    const units: Entity[] = [];
    for (const u of g.units) {
      if (u.dead) continue;
      units.push(u);
      if (!u.path.length) { u.moving = false; continue; }
      let speed = g.players[u.owner].getStat(g.unitDef(u), 'speed');
      // En formación, las que ya están en su hueco van al paso de la más lenta
      if (u.order?.type === 'formation' && u.data.speedCap) speed = Math.min(speed, u.data.speedCap);
      // Cuesta arriba se avanza más despacio (BALANCE.movement)
      const t0 = u.path[0], dd = hypot(t0.x - u.x, t0.y - u.y);
      if (dd > 0.01) {
        const k = Math.min(0.5, dd) / dd;
        const grade = (m.heightAt(u.x + (t0.x - u.x) * k, u.y + (t0.y - u.y) * k) - m.heightAt(u.x, u.y)) / Math.min(0.5, dd);
        if (grade > 0) speed *= Math.max(mv.minSpeedFactor, 1 - mv.uphillSlowPerGrade * grade);
      }
      let step = speed * dt;
      u.moving = true;
      while (step > 0 && u.path.length) {
        const t = u.path[0];
        const dx = t.x - u.x, dy = t.y - u.y, d = hypot(dx, dy);
        const sx = dx - dy;
        if (Math.abs(sx) > 0.02) u.facing = sx > 0 ? 1 : -1;
        if (d <= step) {
          if (!this.tryMove(u, t.x, t.y)) { u.path = []; break; }
          u.path.shift();
          step -= d;
        } else {
          if (!this.tryMove(u, u.x + (dx / d) * step, u.y + (dy / d) * step)) { u.path = []; }
          step = 0;
        }
      }
    }

    // Separación suave entre unidades cercanas (rejilla espacial)
    const b = this.buckets;
    b.clear();
    for (const u of units) {
      const k = (Math.floor(u.y) << 12) | Math.floor(u.x);
      let l = b.get(k);
      if (!l) { l = []; b.set(k, l); }
      l.push(u);
    }
    for (const u of units) {
      const fx = Math.floor(u.x), fy = Math.floor(u.y);
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        const l = b.get(((fy + oy) << 12) | (fx + ox));
        if (!l) continue;
        for (const o of l) {
          if (o.id <= u.id) continue;
          const dx = o.x - u.x, dy = o.y - u.y;
          const min = u.radius + o.radius;
          const d2 = dx * dx + dy * dy;
          if (d2 >= min * min) continue;
          const d = Math.sqrt(d2) || 0.01;
          const push = (min - d) * 0.35;
          // Giro ligero para que las unidades se rodeen en vez de chocar de frente
          const ux = d2 === 0 ? 1 : dx / d, uy = d2 === 0 ? 0 : dy / d;
          const nx = (ux * 0.88 - uy * 0.48) * push, ny = (uy * 0.88 + ux * 0.48) * push;
          // Las unidades en marcha empujan; las paradas ceden el paso. Dos unidades que
          // avanzan casi juntas se empujan poco, para que en los pasos estrechos se encolen
          // en vez de bloquearse.
          const both = u.moving && o.moving ? 0.35 : 1;
          const wu = (u.moving ? 0.25 : u.working ? 0.6 : 1) * both, wo = (o.moving ? 0.25 : o.working ? 0.6 : 1) * both;
          this.tryMove(u, u.x - nx * wu, u.y - ny * wu);
          this.tryMove(o, o.x + nx * wo, o.y + ny * wo);
        }
      }
    }

    // Unidades atascadas: recalculan el camino
    for (const u of units) {
      if (!u.path.length) { u.stuck = 0; continue; }
      const speed = g.players[u.owner].getStat(g.unitDef(u), 'speed');
      if (hypot(u.x - u.px, u.y - u.py) < speed * dt * 0.25) u.stuck += dt;
      else u.stuck = Math.max(0, u.stuck - dt);
      if (u.stuck > 1.5) {
        u.stuck = 0;
        const goal = u.path[u.path.length - 1];
        u.path = [];
        u.nextRepath = 0;
        if (u.order?.type === 'move' && goal) u.order.started = false;
      }
    }
  }
}

/** Colas de entrenamiento e investigación de los edificios. */
export class ProductionSystem implements System {
  constructor(private game: Game) {}

  update(dt: number) {
    const g = this.game;
    for (const b of g.buildings) {
      if (b.dead || !b.complete || !b.queue.length) continue;
      const p = g.players[b.owner];
      const item = b.queue[0];
      if (item.kind === 'unit' && item.progress === 0) {
        const pop = g.reg.unit(item.id).pop;
        if (p.popUsed + pop > p.popCap) {
          if (p.isHuman) {
            const text = p.popCap >= g.opts.popLimit ? 'Has alcanzado el límite de población' : 'Necesitas construir más casas';
            if (g.warn(p, 'housed', text, 12)) g.events.emit('actionRejected', { playerId: p.id, reason: 'population', text });
          }
          continue;
        }
        p.popUsed += pop;
      }
      item.progress += dt / Math.max(0.1, item.time);
      if (item.progress < 1) continue;
      b.queue.shift();
      if (item.kind === 'unit') this.finishUnit(b, item.id);
      else this.finishTech(b, item.id);
    }
  }

  private finishUnit(b: Entity, unitId: string) {
    const g = this.game;
    const p = g.players[b.owner];
    const id = p.resolveUnit(unitId);
    const rally = b.rally;
    const tx = rally ? rally.x : b.tx + b.size + 0.5, ty = rally ? rally.y : b.ty + b.size + 0.5;
    // Casilla libre junto al edificio, en dirección al punto de reunión
    let best: { x: number; y: number } | null = null, bestD = Infinity;
    for (let r = 1; r <= 4 && !best; r++) {
      for (let y = b.ty - r; y < b.ty + b.size + r; y++) for (let x = b.tx - r; x < b.tx + b.size + r; x++) {
        const edge = x === b.tx - r || y === b.ty - r || x === b.tx + b.size + r - 1 || y === b.ty + b.size + r - 1;
        if (!edge || !g.map.walkable(x, y)) continue;
        const d = hypot(x + 0.5 - tx, y + 0.5 - ty);
        if (d < bestD) { bestD = d; best = { x: x + 0.5, y: y + 0.5 }; }
      }
    }
    const pos = best ?? g.findFreeTile(b.x, b.y + b.size, 10) ?? { x: b.x, y: b.y + b.size / 2 + 0.5 };
    const u = g.spawnUnit(id, b.owner, pos.x, pos.y);
    p.stats.trained++;
    if (rally) {
      const t = g.get(rally.targetId);
      const def = g.unitDef(u);
      if (t && def.gatherer && (t.kind === 'unit' ? isHuntable(g, u.owner, t) : t.resType && (t.kind === 'resource' || t.owner === u.owner))) setOrder(u, { type: 'gather', targetId: t.id, phase: 'gather' });
      else if (t && def.builder && t.kind === 'building' && t.owner === u.owner && !t.complete) setOrder(u, { type: 'build', targetId: t.id });
      else setOrder(u, { type: 'move', x: rally.x, y: rally.y });
    }
    g.events.emit('unitTrained', { entity: u, building: b });
  }

  private finishTech(b: Entity, techId: string) {
    const g = this.game;
    const p = g.players[b.owner];
    const t = g.reg.tech(techId);
    p.researched.add(techId);
    p.addEffects(t.effects, g);
    if (t.setsAge !== undefined) {
      p.age = t.setsAge;
      g.events.emit('ageReached', { player: p, age: p.age });
      const name = g.reg.ageName(p.age);
      g.notify(p.isHuman ? `¡Has avanzado a la ${name}!` : `${p.name} ha avanzado a la ${name}`, undefined, p.isHuman ? 'good' : 'info');
    } else if (p.isHuman) {
      g.notify(`Investigación completada: ${t.name}`, p.id, 'good');
    }
    g.events.emit('techResearched', { player: p, techId });
  }
}

/** Proyectiles, edificios defensivos y adquisición automática de objetivos. */
export class CombatSystem implements System {
  constructor(private game: Game) {}
  update(dt: number) {
    const g = this.game;
    updateProjectiles(g, dt);
    for (const e of g.actors) {
      if (e.dead) continue;
      if (e.kind === 'building') {
        if (!e.complete) continue;
        const def = g.buildingDef(e);
        if (!def.attack) continue;
        e.cooldown -= dt;
        if (e.cooldown > 0) continue;
        const p = g.players[e.owner];
        const range = p.getStat(def, 'range');
        // Torres y castillos en alto alcanzan más lejos (BALANCE.highGround)
        const t = findEnemyNear(g, e, range + BALANCE.highGround.rangeCap, false, false, (en, d) => d <= range + rangeBonus(g, e, en, range));
        if (t) { performAttack(g, e, t); e.cooldown = p.getStat(def, 'reloadTime'); }
        else e.cooldown = 0.5;
      } else if (e.kind === 'unit' && !e.order && g.time >= e.scanAt) {
        e.scanAt = g.time + 0.6;
        const def = g.unitDef(e);
        if (def.gatherer || !(def.attack ?? 0)) continue;
        // Cada postura decide a qué atacar y hasta dónde (army/stances)
        const anchor = anchorOf(e);
        const t = stanceTarget(g, e, anchor);
        if (t) setOrder(e, engageOrder(e, t, anchor));
      }
    }
  }
}

/** Niebla de guerra del jugador humano. */
export class VisionSystem implements System {
  constructor(private game: Game) {
    // Solo en una partida nueva: una cargada trae su niebla. Recalcularla aquí, con las posiciones
    // de este instante, la haría distinta de la original (y `explored` cambia dónde se puede construir)
    if (game.tick === 0) this.recompute();
  }

  private recompute() {
    const g = this.game, m = g.map;
    for (const p of g.players) {
      if (!p.isHuman) continue;
      if (g.opts.visibility === 'revealed') { p.visible.fill(1); p.explored.fill(1); continue; }
      p.visible.fill(0);
      // Varias unidades en la misma casilla ven lo mismo: se calcula una vez
      const done = new Set<number>();
      for (const e of g.actors) {
        if (e.owner !== p.id || e.dead) continue;
        const r = sightRadius(g, e), eye = eyeHeight(g, e);
        const key = ((Math.floor(e.y) * m.w + Math.floor(e.x)) * 64 + Math.round(r * 2)) * 16 + Math.round(eye * 2);
        if (done.has(key)) continue;
        done.add(key);
        castVision(m, e.x, e.y, eye, r, p.visible, p.explored);
      }
    }
    g.data.visionVersion = (g.data.visionVersion ?? 0) + 1;
  }

  update() { if (this.game.tick % 5 === 0) this.recompute(); }
}

/**
 * Auras (`aura` en la definición de una unidad, p. ej. el General): cada medio segundo
 * marca a las unidades propias cercanas con la bonificación. Combate la lee en `auraOf`.
 */
export class AuraSystem implements System {
  private next = 0;
  private any: boolean;
  constructor(private game: Game) {
    this.any = [...game.reg.units.values()].some(d => d.aura);
  }
  save() { return { next: this.next }; }
  load(s: any) { this.next = s?.next ?? 0; }
  update() {
    const g = this.game;
    if (!this.any || g.time < this.next) return;
    this.next = g.time + 0.5;
    for (const src of g.units) {
      if (src.dead) continue;
      const aura = g.unitDef(src).aura;
      if (!aura) continue;
      const r2 = aura.radius * aura.radius;
      for (const u of g.units) {
        if (u.dead || u === src || u.owner !== src.owner) continue;
        const dx = u.x - src.x, dy = u.y - src.y;
        if (dx * dx + dy * dy > r2) continue;
        u.data.aura = { attackMul: aura.attackMul ?? 1, armorAdd: aura.armorAdd ?? 0, until: g.time + 0.75, from: src.id };
      }
    }
  }
}

/** Comprueba derrotas y fin de partida según la condición de victoria elegida. */
export class VictorySystem implements System {
  constructor(private game: Game) {}
  update() {
    const g = this.game;
    if (g.over || g.tick % 20 !== 0) return;
    const vic = g.reg.victories.get(g.opts.victory) ?? [...g.reg.victories.values()][0];
    if (!vic) return;
    for (const p of g.players.slice(1)) {
      if (p.defeated || !vic.isDefeated(g, p)) continue;
      p.defeated = true;
      g.events.emit('playerDefeated', { player: p });
      g.notify(p.isHuman ? 'Has sido derrotado' : `${p.name} ha sido derrotado`, undefined, p.isHuman ? 'warn' : 'good');
    }
    // El final no depende de qué jugador mira esta copia (`humanId`): en una partida en red, cada
    // cliente tiene el suyo y todos deben acabar en el mismo tick. Termina cuando caen todos los
    // humanos o cuando solo queda un jugador en pie; `won` es para el jugador de esta copia.
    const all = g.players.slice(1), humans = all.filter(p => p.isHuman), alive = all.filter(p => !p.defeated);
    if ((humans.length && humans.every(p => p.defeated)) || (all.length > 1 && alive.length <= 1)) {
      g.over = true;
      g.events.emit('gameOver', { won: !g.human.defeated });
    }
  }
}

