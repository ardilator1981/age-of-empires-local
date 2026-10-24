import { BUILD_RANGE } from '../core/constants';
import type { OrderHandler, WalkwayDef } from '../core/types';
import { ARRIVED, UNREACHABLE, approach, setOrder } from './actions';
import type { Entity } from './Entity';
import type { Game } from './Game';
import { hypot } from './fmath';

/**
 * Paso de ronda (puesto de tiro): un edificio con `walkway` en su definición (murallas de piedra y
 * fortificadas, torre de muralla) admite unidades a distancia propias encima. A diferencia del
 * refugio (`garrison.ts`), arriba se las ve y **siguen disparando** sin moverse (postura «mantener
 * posición»), desde más alto (las reglas de altura de `heightRules` cuentan la altura del muro) y con
 * armadura extra. Solo se les puede atacar a distancia; si el tramo cae, bajan.
 *
 * La unidad guarda en `onWall` el id del tramo (0 = en el suelo) y en `data.wallFrom` la casilla
 * desde la que subió (para bajar por el mismo lado). No hay lista aparte: se guarda con la entidad.
 */

/** Definición del paso de ronda de un edificio (o undefined si no tiene). */
export function walkwayOf(game: Game, b: Entity): WalkwayDef | undefined {
  return b.kind === 'building' ? game.reg.buildings.get(b.defId)?.walkway : undefined;
}

/** Unidades subidas a este tramo. */
export function postedOn(game: Game, b: Entity): Entity[] {
  return game.units.filter(u => !u.dead && u.onWall === b.id);
}

/** Plazas ocupadas o pedidas por tramo: las unidades arriba y las que van de camino (orden `mountWall`). */
function usage(game: Game): Map<number, number> {
  const used = new Map<number, number>();
  for (const u of game.units) {
    if (u.dead) continue;
    const id = u.onWall || (u.order?.type === 'mountWall' ? u.order.targetId as number : 0);
    if (id) used.set(id, (used.get(id) ?? 0) + 1);
  }
  return used;
}

/** ¿Es `u` de las unidades que este paso de ronda admite? (clase, a distancia y sin clases excluidas) */
export function fitsWalkway(game: Game, u: Entity, w: WalkwayDef): boolean {
  if (u.kind !== 'unit' || u.dead || u.inside) return false;
  const def = game.unitDef(u);
  if (game.players[u.owner].getStat(def, 'range') < 1) return false;
  if (!w.classes.some(c => def.classes.includes(c))) return false;
  return !(w.exclude ?? []).some(c => def.classes.includes(c));
}

/** ¿Puede `u` subir a `b` ahora mismo? `used` = plazas ocupadas (de `usage`), si ya se tienen. */
export function canMount(game: Game, u: Entity, b: Entity, used?: Map<number, number>): boolean {
  const w = walkwayOf(game, b);
  if (!w || b.dead || !b.complete || b.owner !== u.owner || u.onWall === b.id || !fitsWalkway(game, u, w)) return false;
  const n = used ? used.get(b.id) ?? 0 : postedOn(game, b).length;
  return n < w.capacity;
}

/** ¿Hay algún paso de ronda propio al que `u` pueda subir? (para mostrar el botón) */
export function canMountSomewhere(game: Game, u: Entity): boolean {
  if (u.kind !== 'unit' || u.onWall) return false;
  const used = usage(game);
  return game.buildings.some(b => b.owner === u.owner && canMount(game, u, b, used));
}

/**
 * Reparte las unidades por los pasos de ronda propios: primero `target` (si se da y tiene sitio) y
 * después los tramos libres más cercanos a él (o a cada unidad). Devuelve cuántas suben.
 */
export function assignPosts(game: Game, units: Entity[], target: Entity | null): number {
  const used = usage(game);
  let n = 0;
  for (const u of units) {
    if (u.onWall && u.onWall === target?.id) continue;
    const from = target ?? u;
    let best: Entity | null = null, bd = Infinity;
    if (target && canMount(game, u, target, used)) best = target;
    else {
      for (const b of game.buildings) {
        if (b.owner !== u.owner || !canMount(game, u, b, used)) continue;
        const d = hypot(b.x - from.x, b.y - from.y);
        if (d < bd) { bd = d; best = b; }
      }
    }
    if (!best) continue;
    // Si estaba en otro tramo, la orden nueva la baja (OrderSystem)
    setOrder(u, { type: 'mountWall', targetId: best.id });
    used.set(best.id, (used.get(best.id) ?? 0) + 1);
    n++;
  }
  return n;
}

/** Sube a `u` al tramo `b`: se queda en su centro, quieta, y vuelve a elegir objetivo enseguida. */
export function mountWall(game: Game, u: Entity, b: Entity) {
  setOrder(u, null);
  u.data.wallFrom = { x: u.x, y: u.y };
  u.onWall = b.id;
  u.x = u.px = b.x;
  u.y = u.py = b.y;
  u.moving = false;
  u.scanAt = 0;
  game.events.emit('wallMounted', { entity: u, building: b });
}

/** Baja a `u` del paso de ronda por el lado desde el que subió (o a la casilla libre más cercana). */
export function leaveWall(game: Game, u: Entity) {
  const b = game.entities.get(u.onWall);
  u.onWall = 0;
  const from = u.data.wallFrom as { x: number; y: number } | undefined;
  delete u.data.wallFrom;
  const m = game.map;
  let spot: { x: number; y: number } | null = null;
  if (from && m.walkableFor(Math.floor(from.x), Math.floor(from.y), u.owner)) spot = from;
  else spot = game.findFreeTile(from?.x ?? u.x, from?.y ?? u.y, 12);
  if (spot) { u.x = u.px = spot.x; u.y = u.py = spot.y; }
  u.path = [];
  if (b) game.events.emit('wallLeft', { entity: u, building: b });
}

/** Armadura extra (cuerpo a cuerpo y a distancia) de una unidad por estar en el paso de ronda. */
export function wallArmor(game: Game, u: Entity): number {
  if (!u.onWall) return 0;
  const b = game.entities.get(u.onWall);
  return b ? walkwayOf(game, b)?.armor ?? 0 : 0;
}

/** Orden `mountWall`: va hasta el tramo y sube. */
export const mountWallOrder: OrderHandler = {
  update(game, u, o) {
    const b = game.get(o.targetId);
    const w = b && walkwayOf(game, b);
    // Al llegar se comprueba de nuevo el sitio (sin contarse a sí misma, que ya lo tenía pedido)
    if (!b || !w || b.dead || !b.complete || b.owner !== u.owner || !fitsWalkway(game, u, w)) { setOrder(u, null); return; }
    const st = approach(game, u, b, BUILD_RANGE);
    if (st === ARRIVED) {
      if (postedOn(game, b).length < w.capacity) mountWall(game, u, b);
      else setOrder(u, null);
    } else if (st === UNREACHABLE) {
      o.fails = (o.fails ?? 0) + 1;
      if (o.fails > 3) setOrder(u, null);
    }
  },
};
