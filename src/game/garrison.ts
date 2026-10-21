import { BUILD_RANGE } from '../core/constants';
import type { OrderHandler } from '../core/types';
import { ARRIVED, UNREACHABLE, approach, setOrder } from './actions';
import type { Entity } from './Entity';
import type { Game } from './Game';

/**
 * Refugio de unidades (genérico y mínimo): un edificio con `shelter` en su definición admite
 * unidades propias de ciertas clases. La unidad guarda en `inside` el id del edificio; no hay
 * lista aparte, así que el estado se guarda solo con la entidad.
 */

/** Unidades refugiadas en el edificio. */
export function garrisonOf(game: Game, b: Entity): Entity[] {
  return game.units.filter(u => !u.dead && u.inside === b.id);
}

/** ¿Puede `u` refugiarse en `b` ahora mismo? (mismo dueño, clase admitida, edificio terminado y con sitio) */
export function canShelter(game: Game, u: Entity, b: Entity): boolean {
  if (u.kind !== 'unit' || b.kind !== 'building' || u.dead || b.dead || u.owner !== b.owner || !b.complete) return false;
  const sh = game.reg.building(b.defId).shelter;
  if (!sh) return false;
  const classes = game.unitDef(u).classes;
  if (!sh.classes.some(c => classes.includes(c))) return false;
  if (u.inside === b.id) return false;
  return garrisonOf(game, b).length < sh.capacity;
}

/** ¿Es `u` de una clase que algún refugio de su dueño admite? (para mostrar el botón «Refugiarse») */
export function canShelterSomewhere(game: Game, u: Entity): boolean {
  return game.buildings.some(b => canShelter(game, u, b));
}

/** El refugio propio más cercano donde cabe `u`. */
export function nearestShelter(game: Game, u: Entity): Entity | null {
  let best: Entity | null = null, bd = Infinity;
  for (const b of game.buildings) {
    if (!canShelter(game, u, b)) continue;
    const d = (b.x - u.x) ** 2 + (b.y - u.y) ** 2;
    if (d < bd) { bd = d; best = b; }
  }
  return best;
}

export function enterShelter(game: Game, u: Entity, b: Entity) {
  setOrder(u, null);
  u.inside = b.id;
  u.x = u.px = b.x;
  u.y = u.py = b.y;
  game.events.emit('garrisoned', { entity: u, building: b });
}

/** Saca a `u` del refugio y la deja junto al edificio. */
export function leaveShelter(game: Game, u: Entity) {
  const b = game.entities.get(u.inside);
  u.inside = 0;
  setOrder(u, null);
  if (!b) return;
  const spot = game.findFreeTile(b.x, b.y + b.size / 2 + 0.5, 12);
  if (spot) { u.x = u.px = spot.x; u.y = u.py = spot.y; }
  game.events.emit('ungarrisoned', { entity: u, building: b });
}

/** Orden `garrison`: va hasta el edificio y entra. */
export const garrisonOrder: OrderHandler = {
  update(game, u, o) {
    const b = game.get(o.targetId);
    if (!b || !canShelter(game, u, b)) { setOrder(u, null); return; }
    const st = approach(game, u, b, BUILD_RANGE);
    if (st === ARRIVED) enterShelter(game, u, b);
    else if (st === UNREACHABLE) {
      o.fails = (o.fails ?? 0) + 1;
      if (o.fails > 3) setOrder(u, null);
    }
  },
};
