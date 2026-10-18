import type { Order, Pt } from '../core/types';
import type { Entity } from './Entity';
import type { Game } from './Game';
import type { Player } from './Player';
import { findPath, lineClear, smoothPath, type GoalRect } from './pathfinding';

export const MOVING = 0;
export const ARRIVED = 1;
export const UNREACHABLE = 2;

/** Distancia del borde de la unidad `u` al borde del objetivo `t`. */
export function edgeDist(u: Entity, t: Entity): number {
  if (t.kind === 'unit') return Math.hypot(t.x - u.x, t.y - u.y) - u.radius - t.radius;
  const dx = Math.max(t.tx - u.x, 0, u.x - (t.tx + t.size));
  const dy = Math.max(t.ty - u.y, 0, u.y - (t.ty + t.size));
  return Math.hypot(dx, dy) - u.radius;
}

export function dist(a: Pt, b: Pt): number { return Math.hypot(a.x - b.x, a.y - b.y); }

function rectOf(t: Entity): GoalRect {
  if (t.kind === 'unit') {
    const x = Math.floor(t.x), y = Math.floor(t.y);
    return { x0: x, y0: y, x1: x, y1: y };
  }
  return { x0: t.tx, y0: t.ty, x1: t.tx + t.size - 1, y1: t.ty + t.size - 1 };
}

export function setOrder(u: Entity, order: Order | null) {
  u.order = order;
  u.path = [];
  u.pathFor = 0;
  u.working = false;
}

/** Calcula un camino hasta un punto. */
export function moveTo(game: Game, u: Entity, x: number, y: number) {
  const m = game.map;
  const gx = Math.floor(x), gy = Math.floor(y);
  const walk = m.walkable(gx, gy);
  const r = findPath(m, u.x, u.y, { x0: gx, y0: gy, x1: gx, y1: gy }, walk ? 0 : 1);
  const raw = r.path;
  if (walk && r.reached) {
    if (raw.length) raw[raw.length - 1] = { x, y };
    else raw.push({ x, y });
  }
  u.path = smoothPath(m, u.x, u.y, raw);
  u.pathFor = -1;
}

/**
 * Acerca la unidad al objetivo hasta quedar a `range` casillas.
 * Devuelve ARRIVED, MOVING o UNREACHABLE.
 */
export function approach(game: Game, u: Entity, t: Entity, range: number): number {
  const d = edgeDist(u, t);
  if (d <= range) { u.path.length = 0; return ARRIVED; }
  if (u.unreachableFor === t.id && game.time < u.unreachableUntil) return UNREACHABLE;
  const st = approachStep(game, u, t, d);
  if (st === UNREACHABLE) { u.unreachableFor = t.id; u.unreachableUntil = game.time + 1; }
  return st;
}

/** ¿Puede la unidad llegar hasta el objetivo? (comprobación instantánea por regiones) */
export function canReach(game: Game, u: { x: number; y: number }, t: Entity): boolean {
  const m = game.map;
  const r = m.regionAt(u.x, u.y);
  if (r < 0) return true;
  if (t.kind === 'unit') return m.regionAt(t.x, t.y) === r || m.regionAt(t.x, t.y) < 0;
  const walk = t.kind === 'building' && !!game.reg.building(t.defId).walkable;
  return m.rectTouchesRegion(t.tx, t.ty, t.tx + t.size - 1, t.ty + t.size - 1, r, walk);
}

function approachStep(game: Game, u: Entity, t: Entity, d: number): number {
  const m = game.map;
  if (!canReach(game, u, t)) { u.path.length = 0; return UNREACHABLE; }
  if (t.kind === 'unit') {
    if (!u.path.length || u.pathFor !== t.id || game.time >= u.nextRepath) {
      u.nextRepath = game.time + 0.5 + game.rng() * 0.3;
      u.pathFor = t.id;
      if (d < 4 && lineClear(m, u.x, u.y, t.x, t.y)) {
        u.path = [{ x: t.x, y: t.y }];
      } else {
        const r = findPath(m, u.x, u.y, rectOf(t), 0);
        const raw = r.path;
        if (r.reached) raw.push({ x: t.x, y: t.y });
        u.path = smoothPath(m, u.x, u.y, raw);
        if (!u.path.length) return UNREACHABLE;
      }
    }
    return MOVING;
  }
  if (!u.path.length || u.pathFor !== t.id || game.time >= u.nextRepath) {
    const walkableTarget = t.kind === 'building' && !!game.reg.building(t.defId).walkable;
    const r = findPath(m, u.x, u.y, rectOf(t), walkableTarget ? 0 : 1);
    u.path = smoothPath(m, u.x, u.y, r.path);
    u.pathFor = t.id;
    u.nextRepath = game.time + 4 + game.rng();
    if (!u.path.length) {
      // Último tramo en línea recta hasta el borde del objetivo (p. ej. desde una esquina)
      const cx = Math.max(t.tx, Math.min(u.x, t.tx + t.size)), cy = Math.max(t.ty, Math.min(u.y, t.ty + t.size));
      const dx = u.x - cx, dy = u.y - cy, dd = Math.hypot(dx, dy) || 1;
      const px = cx + (dx / dd) * (u.radius + 0.1), py = cy + (dy / dd) * (u.radius + 0.1);
      if (dd < 2 && m.walkable(Math.floor(px), Math.floor(py))) { u.path = [{ x: px, y: py }]; return MOVING; }
      return UNREACHABLE;
    }
  }
  return MOVING;
}

export function face(u: Entity, t: Pt) {
  const sx = (t.x - u.x) - (t.y - u.y);
  if (Math.abs(sx) > 0.01) u.facing = sx > 0 ? 1 : -1;
}

/** Edificio de depósito más cercano que acepte el recurso. */
export function nearestDrop(game: Game, p: Player, res: string, x: number, y: number): Entity | null {
  let best: Entity | null = null, bestD = Infinity;
  for (const e of game.buildings) {
    if (e.owner !== p.id || !e.complete || e.dead) continue;
    const def = game.reg.building(e.defId);
    if (!def.dropSite?.includes(res)) continue;
    const d = Math.hypot(e.x - x, e.y - y) - e.size / 2;
    if (d < bestD) { bestD = d; best = e; }
  }
  return best;
}

/** ¿Se puede llegar al objetivo desde `from`? (los árboles del interior de un bosque no) */
export function isAccessible(game: Game, e: Entity, from: { x: number; y: number }): boolean {
  return canReach(game, from, e);
}

/**
 * Nodo de recurso más cercano que cumpla el filtro y sea alcanzable desde `from`
 * (por defecto, desde el propio punto de búsqueda).
 */
export function nearestNode(game: Game, x: number, y: number, maxDist: number, filter: (e: Entity) => boolean, from?: { x: number; y: number }): Entity | null {
  const origin = from ?? { x, y };
  let best: Entity | null = null, bestD = maxDist;
  for (const list of [game.nodes, game.buildings]) {
    for (const e of list) {
      if (e.dead || !e.resType || e.amount <= 0) continue;
      const dx = Math.abs(e.x - x), dy = Math.abs(e.y - y);
      if (dx > bestD || dy > bestD) continue;
      const d = Math.hypot(dx, dy);
      if (d < bestD && filter(e) && canReach(game, origin, e)) { bestD = d; best = e; }
    }
  }
  return best;
}

/** ¿Hay ya otro aldeano trabajando esta granja? */
export function isFarmTaken(game: Game, farm: Entity, except?: Entity): boolean {
  for (const e of game.units) {
    if (e === except || e.dead) continue;
    if (e.order?.type === 'gather' && e.order.targetId === farm.id) return true;
  }
  return false;
}
