import type { Pt } from '../core/types';
import { setOrder } from './actions';
import type { Entity } from './Entity';
import type { Game } from './Game';

/**
 * Formación sencilla en filas, de cara a `facing`: cuerpo a cuerpo delante, a distancia
 * detrás, asedio al fondo y las unidades con aura (el General) en el centro de la retaguardia.
 *
 * Es el gancho para un sistema de formaciones completo: quien quiera formaciones de verdad
 * (cuña, columna, dispersa...) puede sustituir esta función sin tocar a quien la usa
 * (la IA de la guerra declarada y el botón "Ejército al punto").
 */
export function formationSlots(game: Game, units: Entity[], center: Pt, facing: Pt, spacing = 0.9): Map<number, Pt> {
  const out = new Map<number, Pt>();
  if (!units.length) return out;
  const fl = Math.hypot(facing.x, facing.y) || 1;
  const fx = facing.x / fl, fy = facing.y / fl;
  const sx = -fy, sy = fx; // eje lateral de las filas
  const rank = (u: Entity) => {
    const d = game.unitDef(u);
    if (d.aura) return 3;
    if (d.classes.includes('siege')) return 4;
    return game.players[u.owner].getStat(d, 'range') >= 1 ? 2 : 1;
  };
  const sorted = [...units].sort((a, b) => rank(a) - rank(b) || a.id - b.id);
  const cols = Math.max(4, Math.ceil(Math.sqrt(sorted.length * 2.5)));
  const used = new Set<number>();
  let row = 0, col = 0, lastRank = rank(sorted[0]);
  for (const u of sorted) {
    const r = rank(u);
    if (r !== lastRank && col > 0) { row++; col = 0; }
    lastRank = r;
    const lateral = (col % 2 ? -1 : 1) * Math.ceil(col / 2) * spacing;
    const back = row * spacing * 1.1;
    let x = center.x + sx * lateral - fx * back, y = center.y + sy * lateral - fy * back;
    // Si cae en roca o agua, la casilla libre más cercana (sin repetir)
    const fx0 = Math.floor(x), fy0 = Math.floor(y);
    if (!game.map.walkable(fx0, fy0) || used.has(fy0 * game.map.w + fx0)) {
      const f = game.findFreeTile(x, y, 4);
      if (f) { x = f.x; y = f.y; }
    }
    used.add(Math.floor(y) * game.map.w + Math.floor(x));
    out.set(u.id, { x, y });
    if (++col >= cols) { row++; col = 0; }
  }
  return out;
}

/** Mueve las unidades a sus puestos en formación. */
export function moveInFormation(game: Game, units: Entity[], center: Pt, facing: Pt) {
  const slots = formationSlots(game, units, center, facing);
  for (const u of units) {
    const s = slots.get(u.id);
    if (s) setOrder(u, { type: 'move', x: s.x, y: s.y });
  }
}
