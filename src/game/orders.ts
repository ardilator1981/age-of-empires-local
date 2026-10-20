import { BALANCE } from '../config/balance';
import { BUILD_RANGE, DROP_RANGE, GATHER_RANGE, MELEE_RANGE } from '../core/constants';
import type { Order, OrderHandler } from '../core/types';
import {
  ARRIVED, UNREACHABLE, approach, canReach, edgeDist, face, isFarmTaken, moveTo, nearestDrop, nearestNode, pathBudget, setOrder,
} from './actions';
import { findEnemyNear, performAttack } from './combat';
import { rangeBonus } from './heightRules';
import type { Entity } from './Entity';
import type { Game } from './Game';
import { hypot } from './fmath';

/**
 * Manejadores de órdenes básicos. Cada uno se registra en el Registry con un
 * `type`; un mod puede añadir órdenes nuevas (patrullar, curar, convertir...) o
 * reemplazar estas.
 */

export const moveOrder: OrderHandler = {
  update(game, u, o) {
    if (!o.started) {
      if (!pathBudget(game)) return; // se calcula en un tick próximo
      moveTo(game, u, o.x, o.y);
      o.started = true;
    }
    if (!u.path.length) setOrder(u, null);
  },
};

/**
 * Un paso de ataque contra `t`. Devuelve false si hay que abandonar.
 * Con `o.hold` (mantener posición) no se mueve: si el objetivo no está a su alcance, lo deja.
 */
export function attackStep(game: Game, u: Entity, o: Order, t: Entity): boolean {
  if (!game.canAttack(u, t, false)) return false;
  const p = game.players[u.owner];
  const def = game.unitDef(u);
  const range = p.getStat(def, 'range');
  // Desde lo alto, las unidades a distancia alcanzan más lejos
  let r = range >= 1 ? range + rangeBonus(game, u, t, range) : MELEE_RANGE + (t.kind === 'unit' ? 0 : 0.25);
  // Si una regla de los mods no le deja golpear desde donde está (p. ej. fuera de la zona de batalla), se acerca más
  if (game.reg.combatRules.length && !game.canAttack(u, t, true)) r = MELEE_RANGE;
  if (o.hold && edgeDist(u, t) > r + 0.05) return false;
  const st = o.hold ? ARRIVED : approach(game, u, t, r);
  if (st === ARRIVED) {
    face(u, t);
    if (u.cooldown <= 0) {
      performAttack(game, u, t);
      u.cooldown = p.getStat(def, 'reloadTime');
    }
    o.fails = 0;
  } else if (st === UNREACHABLE) {
    o.fails = (o.fails ?? 0) + 1;
    if (o.fails > 3) return false;
  }
  return true;
}

/**
 * Siguiente enemigo al que atacar cerca de la unidad (primero unidades, luego edificios;
 * el asedio solo edificios). Se salta lo que no se puede alcanzar y `skip`.
 */
function nextTarget(game: Game, u: Entity, radius: number, skip = 0): Entity | null {
  const siege = game.unitDef(u).classes.includes('siege');
  return findEnemyNear(game, u, radius, true, siege, e => e.id !== skip && canReach(game, u, e));
}

/** Termina una orden de ataque automática: la unidad defensiva vuelve a su sitio. */
function endAuto(u: Entity, o: Order) {
  if (o.anchor && hypot(u.x - o.anchor.x, u.y - o.anchor.y) > 0.6) {
    setOrder(u, { type: 'move', x: o.anchor.x, y: o.anchor.y });
    u.data.anchor = o.anchor;
  } else setOrder(u, null);
}

export const attackOrder: OrderHandler = {
  update(game, u, o) {
    const los = game.players[u.owner].getStat(game.unitDef(u), 'los');
    const t = game.get(o.targetId);
    if (t && o.auto && edgeDist(u, t) > los + 2) { endAuto(u, o); return; }
    // Postura defensiva: no se aleja más de la correa
    if (o.anchor && hypot(u.x - o.anchor.x, u.y - o.anchor.y) > o.leash) { endAuto(u, o); return; }
    if (!t || t.kind === 'resource' || !attackStep(game, u, o, t)) {
      if (o.auto) { endAuto(u, o); return; }
      // Una orden dada por el jugador no se acaba al caer el objetivo (o si no se llega a él):
      // sigue con lo más cercano, como al asaltar un pueblo edificio a edificio.
      const next = nextTarget(game, u, los + 2, o.targetId);
      if (!next) { setOrder(u, null); return; }
      o.targetId = next.id; o.fails = 0; u.path = [];
    }
  },
};

/** Avanza hacia un punto atacando a cualquier enemigo que encuentre. */
export const attackMoveOrder: OrderHandler = {
  update(game, u, o) {
    const def = game.unitDef(u);
    const los = game.players[u.owner].getStat(def, 'los');
    let t = game.get(o.targetId);
    if (t && edgeDist(u, t) > los + 3) t = undefined;
    if (!t && game.time >= (o.scanAt ?? 0)) {
      o.scanAt = game.time + 0.5;
      t = nextTarget(game, u, los, o.skip) ?? undefined;
      if (t) { o.targetId = t.id; o.moving = false; u.path = []; }
    }
    if (t) {
      // Si no se puede llegar a él, se ignora un rato y se sigue con otro
      if (!attackStep(game, u, o, t)) { o.skip = t.id; o.targetId = 0; o.fails = 0; o.scanAt = 0; }
      return;
    }
    o.targetId = 0;
    if (!o.moving) {
      if (!pathBudget(game)) return;
      moveTo(game, u, o.x, o.y);
      o.moving = true;
    }
    if (!u.path.length) setOrder(u, null);
  },
};

/** Separación (en casillas) de los puntos candidatos de la exploración automática. */
const EXPLORE_STEP = 4;

/**
 * Exploración automática: va al punto sin explorar alcanzable más cercano (prefiriendo
 * seguir en la misma dirección) y, cuando lo descubre, elige otro. Termina cuando no queda
 * nada alcanzable por explorar.
 */
export const exploreOrder: OrderHandler = {
  update(game, u, o) {
    const m = game.map, p = game.players[u.owner];
    if (game.time < (o.scanAt ?? 0)) return;
    o.scanAt = game.time + 0.5;
    const cw = Math.ceil(m.w / EXPLORE_STEP), ch = Math.ceil(m.h / EXPLORE_STEP);
    // Sin niebla propia (IA), la orden lleva su propia cuenta de lo visto
    if (!p.isHuman) {
      const seen: Uint8Array = o.seen ??= new Uint8Array(cw * ch);
      const los = p.getStat(game.unitDef(u), 'los');
      for (let cy = 0; cy < ch; cy++) for (let cx = 0; cx < cw; cx++) {
        const x = cx * EXPLORE_STEP + EXPLORE_STEP / 2, y = cy * EXPLORE_STEP + EXPLORE_STEP / 2;
        if (hypot(x - u.x, y - u.y) <= los) seen[cy * cw + cx] = 1;
      }
    }
    const done = (cx: number, cy: number) => p.isHuman
      ? p.explored[Math.min(m.h - 1, cy * EXPLORE_STEP + (EXPLORE_STEP >> 1)) * m.w + Math.min(m.w - 1, cx * EXPLORE_STEP + (EXPLORE_STEP >> 1))] === 1
      : o.seen[cy * cw + cx] === 1;
    const bad: Set<number> = o.bad ??= new Set<number>();
    if (o.cell !== undefined) {
      const cx = o.cell % cw, cy = (o.cell / cw) | 0;
      if (!done(cx, cy)) {
        if (u.path.length) return; // sigue de camino
        if (o.moved) bad.add(o.cell); // llegó y no se ve: se descarta
      }
    }
    if (!pathBudget(game)) { o.scanAt = 0; return; }
    const reg = m.regionAt(u.x, u.y);
    const hx = o.hx ?? 0, hy = o.hy ?? 0;
    let best = -1, bs = Infinity;
    for (let cy = 0; cy < ch; cy++) for (let cx = 0; cx < cw; cx++) {
      const c = cy * cw + cx;
      if (bad.has(c) || done(cx, cy)) continue;
      const x = Math.min(m.w - 1, cx * EXPLORE_STEP + (EXPLORE_STEP >> 1)), y = Math.min(m.h - 1, cy * EXPLORE_STEP + (EXPLORE_STEP >> 1));
      if (!m.walkable(x, y) || (reg >= 0 && m.region(x, y) !== reg)) continue;
      const dx = x - u.x, dy = y - u.y, d = hypot(dx, dy) || 1;
      const score = d - 6 * ((dx * hx + dy * hy) / d); // girar poco: barre el mapa en vez de zigzaguear
      if (score < bs) { bs = score; best = c; }
    }
    if (best < 0) {
      if (p.isHuman) game.notify('Exploración terminada: no queda nada por descubrir a su alcance', p.id, 'info');
      setOrder(u, null);
      return;
    }
    const tx = (best % cw) * EXPLORE_STEP + (EXPLORE_STEP >> 1) + 0.5, ty = ((best / cw) | 0) * EXPLORE_STEP + (EXPLORE_STEP >> 1) + 0.5;
    const d = hypot(tx - u.x, ty - u.y) || 1;
    o.hx = (tx - u.x) / d; o.hy = (ty - u.y) / d;
    o.cell = best;
    moveTo(game, u, tx, ty);
    o.moved = true;
    if (!u.path.length && d > 1.5) bad.add(best);
  },
};

function findNextNode(game: Game, u: Entity, o: Order): Entity | null {
  const x = o.lastX ?? u.x, y = o.lastY ?? u.y;
  const kind = o.nodeKind;
  const res = o.resType;
  return nearestNode(game, x, y, 10, e => {
    if (e.kind === 'resource') return kind ? e.defId === kind : e.resType === res;
    // Granjas propias libres
    return e.kind === 'building' && e.owner === u.owner && e.complete && e.defId === kind && !isFarmTaken(game, e, u);
  }, u);
}

export const gatherOrder: OrderHandler = {
  update(game, u, o, dt) {
    const p = game.players[u.owner];
    const def = game.unitDef(u);
    const cap = p.getStat(def, 'carryCapacity');
    u.working = false;

    if (o.phase === 'return') {
      if (!u.carry || u.carry.amount <= 0) { o.phase = 'gather'; return; }
      const drop = nearestDrop(game, p, u.carry.type, u.x, u.y);
      if (!drop) {
        if (p.isHuman) game.warn(p, 'nodrop', 'Construye un edificio donde depositar recursos', 15);
        setOrder(u, null);
        return;
      }
      const st = approach(game, u, drop, DROP_RANGE);
      if (st === ARRIVED) {
        p.res[u.carry.type] = (p.res[u.carry.type] ?? 0) + u.carry.amount;
        p.stats.gathered += u.carry.amount;
        u.carry.amount = 0;
        if (o.idleAfter) setOrder(u, null);
        else o.phase = 'gather';
      } else if (st === UNREACHABLE) setOrder(u, null);
      return;
    }

    let t = game.get(o.targetId);
    const valid = t && t.resType && t.amount > 0 && (t.kind === 'resource' || (t.owner === u.owner && t.complete));
    if (!valid) {
      const next = findNextNode(game, u, o);
      if (next) { o.targetId = next.id; t = next; }
      else {
        if (u.carry && u.carry.amount > 0) { o.phase = 'return'; o.idleAfter = true; }
        else setOrder(u, null);
        return;
      }
    }
    const target = t!;
    o.resType = target.resType;
    if (!u.carry || u.carry.type !== target.resType) u.carry = { type: target.resType!, amount: 0 };
    if (u.carry.amount >= cap) { o.phase = 'return'; return; }

    const st = approach(game, u, target, GATHER_RANGE);
    if (st === UNREACHABLE) {
      o.fails = (o.fails ?? 0) + 1;
      if (o.fails > 3) {
        // Prueba con otro nodo del mismo tipo
        o.lastX = u.x; o.lastY = u.y; o.nodeKind = target.defId;
        const alt = nearestNode(game, u.x, u.y, 10, e => e !== target && e.defId === target.defId && e.kind === 'resource');
        if (alt) { o.targetId = alt.id; o.fails = 0; } else setOrder(u, null);
      }
      return;
    }
    if (st !== ARRIVED) return;

    o.fails = 0;
    o.lastX = target.x; o.lastY = target.y; o.nodeKind = target.defId;
    u.data.lastNodeX = target.x; u.data.lastNodeY = target.y; u.data.lastNodeKind = target.defId;
    face(u, target);
    u.working = true;
    const rate = target.gatherRate * p.gatherMult(target.resType!);
    const amt = Math.min(rate * dt, target.amount, cap - u.carry.amount);
    target.amount -= amt;
    u.carry.amount += amt;
    if (target.amount <= 0.001) game.deplete(target, u.owner);
  },
};

/** Al terminar de construir: los aldeanos se ponen a trabajar en algo lógico. */
function afterBuild(game: Game, u: Entity, b: Entity) {
  const def = game.buildingDef(b);
  if (def.gatherable && !isFarmTaken(game, b, u)) {
    setOrder(u, { type: 'gather', targetId: b.id, phase: 'gather' });
    return;
  }
  if (def.dropSite) {
    const node = nearestNode(game, b.x, b.y, 9, e => e.kind === 'resource' && def.dropSite!.includes(e.resType!));
    if (node) { setOrder(u, { type: 'gather', targetId: node.id, phase: 'gather' }); return; }
  }
  let other: Entity | null = null, best = 12;
  for (const e of game.buildings) {
    if (e.owner !== u.owner || e.complete || e.dead) continue;
    const d = hypot(e.x - u.x, e.y - u.y);
    if (d < best) { best = d; other = e; }
  }
  setOrder(u, other ? { type: 'build', targetId: other.id } : null);
}

export const buildOrder: OrderHandler = {
  update(game, u, o, dt) {
    const b = game.get(o.targetId);
    u.working = false;
    if (!b || b.kind !== 'building' || b.owner !== u.owner) { setOrder(u, null); return; }
    if (b.complete && b.hp >= b.maxHp) { afterBuild(game, u, b); return; }
    const st = approach(game, u, b, BUILD_RANGE);
    if (st === UNREACHABLE) {
      o.fails = (o.fails ?? 0) + 1;
      if (o.fails > 3) setOrder(u, null);
      return;
    }
    if (st !== ARRIVED) return;
    face(u, b);
    u.working = true;
    const p = game.players[u.owner];
    const bt = Math.max(1, p.getStat(game.buildingDef(b), 'buildTime'));
    if (!b.complete) {
      const dp = dt / bt;
      b.progress = Math.min(1, b.progress + dp);
      b.hp = Math.min(b.maxHp, b.hp + b.maxHp * dp);
      if (b.progress >= 1) game.completeBuilding(b);
    } else {
      b.hp = Math.min(b.maxHp, b.hp + (b.maxHp / (bt * BALANCE.combat.repairTimeFactor)) * dt);
    }
  },
};
