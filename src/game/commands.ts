import type { OrderKind } from '../core/EventBus';
import type { Pt } from '../core/types';
import { BALANCE } from '../config/balance';
import { setOrder } from './actions';
import { createGroup, groupOf, reshape, type Group, type GroupMode } from './army/groups';
import type { FormationType } from './army/formations';
import type { Stance } from './army/stances';
import type { Entity } from './Entity';
import type { Game } from './Game';
import { buildingAvail, exploreAvail, techAvail, unitAvail } from './rules';
import { canGatherFrom, isHuntable } from './wildlife';

/**
 * Todas las acciones de los jugadores (humano o IA) pasan por aquí.
 * Tener un único punto de entrada facilita añadir repeticiones, multijugador o
 * guardado de partida en el futuro.
 */

function formation(n: number, x: number, y: number): Pt[] {
  const cols = Math.ceil(Math.sqrt(n)), rows = Math.ceil(n / cols), sp = 0.75;
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const c = i % cols, r = Math.floor(i / cols);
    out.push({ x: x + (c - (cols - 1) / 2) * sp, y: y + (r - (rows - 1) / 2) * sp });
  }
  return out;
}

function ownUnits(units: Entity[], pid: number) {
  return units.filter(u => u.kind === 'unit' && !u.dead && u.owner === pid);
}

/** Tropas que van en formación (no los aldeanos ni lo que no ataca). */
function soldiers(game: Game, units: Entity[]) {
  return units.filter(u => u.kind === 'unit' && !u.dead && !game.unitDef(u).gatherer && (game.unitDef(u).attack ?? 0) > 0);
}

/** Formación elegida para estas unidades (la más repetida) o la de por defecto. */
export function formationFor(units: Entity[]): FormationType {
  const n = new Map<string, number>();
  for (const u of units) { const f = u.data.formation ?? BALANCE.army.defaultFormation; n.set(f, (n.get(f) ?? 0) + 1); }
  return ([...n.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? BALANCE.army.defaultFormation) as FormationType;
}

/** Orden táctica para un grupo en formación. */
export interface TacticalOrder {
  kind: GroupMode;
  /** Destino (move, attack, retreat, zone) o ruta (patrol, 2 o más puntos). */
  points?: Pt[];
  /** escort: unidad a proteger. */
  targetId?: number;
  zoneRadius?: number;
  /** Hacia dónde mirar al llegar. */
  facing?: Pt;
}

/** Avisa de una orden aceptada (la interfaz la confirma con un sonido). */
function issued(game: Game, playerId: number, kind: OrderKind, at: Pt) {
  game.events.emit('orderIssued', { playerId, kind, at: { x: at.x, y: at.y } });
}

export const Commands = {
  move(game: Game, units: Entity[], x: number, y: number) {
    // Las tropas, en formación; el resto (aldeanos...), en un grupo sencillo
    const army = soldiers(game, units);
    if (army.length >= 2) {
      Commands.army(game, army, { kind: 'move', points: [{ x, y }] }, false);
      units = units.filter(u => !army.includes(u));
      if (!units.length) return;
    }
    const spots = formation(units.length, x, y);
    // Asigna los huecos por orden de cercanía para que no se crucen
    const sorted = [...units].sort((a, b) => (a.x + a.y) - (b.x + b.y));
    const ss = [...spots].sort((a, b) => (a.x + a.y) - (b.x + b.y));
    sorted.forEach((u, i) => {
      const s = ss[i];
      const ok = game.map.walkable(Math.floor(s.x), Math.floor(s.y));
      setOrder(u, { type: 'move', x: ok ? s.x : x, y: ok ? s.y : y });
    });
  },

  attack(game: Game, units: Entity[], target: Entity) {
    for (const u of units) if ((game.unitDef(u).attack ?? 0) > 0) setOrder(u, { type: 'attack', targetId: target.id });
  },

  attackMove(game: Game, units: Entity[], x: number, y: number) {
    const army = soldiers(game, units);
    if (army.length >= 2) {
      Commands.army(game, army, { kind: 'attack', points: [{ x, y }] }, false);
      units = units.filter(u => !army.includes(u));
      if (!units.length) { issued(game, army[0].owner, 'attack', { x, y }); return; }
    }
    const spots = formation(units.length, x, y);
    units.forEach((u, i) => setOrder(u, { type: 'attackMove', x: spots[i].x, y: spots[i].y, scanAt: 0 }));
    if (units.length) issued(game, units[0].owner, 'attack', { x, y });
  },

  /**
   * Orden táctica en formación: mover, avanzar atacando, patrullar, retirada, escoltar o
   * mantener una zona. Los aldeanos y lo que no ataca no entran en la formación.
   */
  army(game: Game, units: Entity[], order: TacticalOrder, notify = true): Group | null {
    const army = order.kind === 'retreat' || order.kind === 'move' ? units.filter(u => u.kind === 'unit' && !u.dead && !game.unitDef(u).gatherer) : soldiers(game, units);
    let route = order.points ?? [];
    if (order.kind === 'escort') {
      const t = game.get(order.targetId);
      if (!t) return null;
      route = [{ x: t.x, y: t.y }];
    }
    if (!army.length || !route.length) return null;
    const grp = createGroup(game, army.filter(u => u.id !== order.targetId), {
      type: formationFor(army), mode: order.kind, route, escortId: order.targetId, zoneRadius: order.zoneRadius, finalFacing: order.facing,
    });
    if (grp && notify) issued(game, army[0].owner, order.kind === 'attack' || order.kind === 'patrol' ? 'attack' : 'move', route[0]);
    return grp;
  },

  /** Elige la formación de estas unidades (y la aplica ya si van en grupo). */
  setFormation(game: Game, units: Entity[], type: FormationType) {
    const touched = new Set<Group>();
    for (const u of units) {
      if (u.kind !== 'unit') continue;
      u.data.formation = type;
      const grp = groupOf(game, u);
      if (grp) touched.add(grp);
    }
    for (const grp of touched) reshape(game, grp, type);
  },

  /** Cambia la postura de combate. */
  setStance(game: Game, units: Entity[], stance: Stance) {
    for (const u of units) {
      if (u.kind !== 'unit') continue;
      u.stance = stance;
      u.data.anchor = { x: u.x, y: u.y };
      // Una orden automática de antes ya no vale con la nueva postura
      if (u.order?.type === 'attack' && u.order.auto) setOrder(u, null);
    }
  },

  gather(game: Game, units: Entity[], target: Entity) {
    for (const u of units) {
      if (!canGatherFrom(game, u, target)) continue;
      setOrder(u, { type: 'gather', targetId: target.id, phase: 'gather' });
    }
  },

  build(game: Game, units: Entity[], target: Entity) {
    for (const u of units) if (game.unitDef(u).builder) setOrder(u, { type: 'build', targetId: target.id });
  },

  /** Exploración automática (solo las unidades que la tienen disponible). */
  explore(game: Game, units: Entity[]) {
    for (const u of units) {
      if (u.kind === 'unit' && exploreAvail(game, game.players[u.owner], u.defId).ok) setOrder(u, { type: 'explore' });
    }
  },

  stop(game: Game, units: Entity[]) {
    for (const u of units) if (u.kind === 'unit') setOrder(u, null);
  },

  /** Clic derecho: decide qué hacer según el objetivo. Devuelve el tipo de acción. */
  smart(game: Game, pid: number, units: Entity[], x: number, y: number, target: Entity | null): OrderKind | null {
    const kind = smartOrder(game, pid, units, x, y, target);
    if (kind) issued(game, pid, kind, target && !target.dead ? target : { x, y });
    return kind;
  },

  placeBuilding(game: Game, pid: number, defId: string, tx: number, ty: number, builders: Entity[]): Entity | null {
    const p = game.players[pid];
    const def = game.reg.building(defId);
    if (!buildingAvail(game, p, defId).ok || !game.canPlace(defId, tx, ty, pid)) return null;
    p.pay(p.getCost(def));
    const b = game.placeBuilding(defId, pid, tx, ty, false);
    Commands.build(game, ownUnits(builders, pid), b);
    issued(game, pid, 'build', b);
    return b;
  },

  train(game: Game, building: Entity, unitId: string): boolean {
    const p = game.players[building.owner];
    if (!building.complete || building.queue.length >= 15) return false;
    const id = p.resolveUnit(unitId);
    if (!unitAvail(game, p, id).ok) return false;
    const def = game.reg.unit(id);
    const cost = p.getCost(def);
    p.pay(cost);
    building.queue.push({ kind: 'unit', id, time: p.getStat(def, 'trainTime'), progress: 0, cost });
    return true;
  },

  research(game: Game, building: Entity, techId: string): boolean {
    const p = game.players[building.owner];
    if (!building.complete || building.queue.length >= 15) return false;
    if (!techAvail(game, p, techId).ok) return false;
    const def = game.reg.tech(techId);
    const cost = p.getCost(def);
    p.pay(cost);
    building.queue.push({ kind: 'tech', id: techId, time: def.researchTime, progress: 0, cost });
    return true;
  },

  cancel(game: Game, building: Entity, index: number) {
    const item = building.queue[index];
    if (!item) return;
    building.queue.splice(index, 1);
    game.players[building.owner].refund(item.cost);
  },

  setRally(game: Game, building: Entity, x: number, y: number, target?: Entity | null) {
    building.rally = { x, y, targetId: target?.id };
    issued(game, building.owner, 'move', { x, y });
  },

  delete(game: Game, e: Entity) {
    if (e.kind === 'building' && !e.complete) {
      // Devuelve lo que no se ha llegado a construir
      game.players[e.owner].refund(game.players[e.owner].getCost(game.buildingDef(e)), 1 - e.progress);
    }
    for (const q of e.queue) game.players[e.owner].refund(q.cost);
    e.queue = [];
    game.kill(e);
  },
};

/**
 * Qué haría el clic derecho con estas unidades sobre este objetivo, sin hacerlo. Sirve para que la
 * interfaz responda al momento (marca y sonido) aunque en red la orden se ejecute un poco después.
 */
export function smartKind(game: Game, pid: number, units: Entity[], target: Entity | null): OrderKind | null {
  const mine = ownUnits(units, pid);
  if (!mine.length) return null;
  if (target && !target.dead) {
    if (game.isEnemy(pid, target.owner) && target.kind !== 'resource' && mine.some(u => game.canAttack(u, target, false))) return 'attack';
    if (target.kind === 'resource' || isHuntable(game, pid, target) || (target.kind === 'building' && !!target.resType && target.owner === pid && target.complete)) return 'gather';
    if (target.kind === 'building' && target.owner === pid) return 'build';
  }
  return 'move';
}

/** Orden contextual: decide qué hacer según el objetivo y la da. */
function smartOrder(game: Game, pid: number, units: Entity[], x: number, y: number, target: Entity | null): OrderKind | null {
  const mine = ownUnits(units, pid);
  if (!mine.length) return null;
  if (target && !target.dead) {
    if (game.isEnemy(pid, target.owner) && target.kind !== 'resource' && mine.some(u => game.canAttack(u, target, false))) {
      const fighters = mine.filter(u => (game.unitDef(u).attack ?? 0) > 0);
      Commands.attack(game, fighters, target);
      const rest = mine.filter(u => !fighters.includes(u));
      if (rest.length) Commands.move(game, rest, x, y);
      return 'attack';
    }
    const gatherable = target.kind === 'resource' || isHuntable(game, pid, target) || (target.kind === 'building' && !!target.resType && target.owner === pid && target.complete);
    if (gatherable) {
      const g = mine.filter(u => canGatherFrom(game, u, target));
      Commands.gather(game, g, target);
      const rest = mine.filter(u => !g.includes(u));
      if (rest.length) Commands.move(game, rest, target.x, target.y);
      return 'gather';
    }
    if (target.kind === 'building' && target.owner === pid) {
      const builders = mine.filter(u => game.unitDef(u).builder);
      const rest = mine.filter(u => !builders.includes(u));
      if (!target.complete || target.hp < target.maxHp) {
        Commands.build(game, builders, target);
      } else {
        const def = game.buildingDef(target);
        for (const u of builders) {
          if (u.carry && u.carry.amount > 0 && def.dropSite?.includes(u.carry.type)) {
            setOrder(u, { type: 'gather', phase: 'return', targetId: 0, lastX: u.data.lastNodeX ?? u.x, lastY: u.data.lastNodeY ?? u.y, nodeKind: u.data.lastNodeKind });
          } else rest.push(u);
        }
      }
      if (rest.length) Commands.move(game, rest, x, y);
      return 'build';
    }
  }
  Commands.move(game, mine, x, y);
  return 'move';
}
