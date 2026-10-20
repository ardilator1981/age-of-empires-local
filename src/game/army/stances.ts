import { BALANCE } from '../../config/balance';
import { MELEE_RANGE } from '../../core/constants';
import type { Order, Pt } from '../../core/types';
import { edgeDist } from '../actions';
import { findEnemyNear } from '../combat';
import type { Entity } from '../Entity';
import type { Game } from '../Game';
import { rangeBonus } from '../heightRules';
import { hypot } from '../fmath';

/**
 * Posturas de combate:
 * - agresiva: ataca a lo que ve y lo persigue.
 * - defensiva: ataca a lo que se acerca, persigue poco (BALANCE.army.defensiveLeash) y vuelve a su sitio.
 * - mantener posición: no se mueve; solo ataca a lo que tiene a su alcance.
 * - sin ataque: no ataca nunca, ni para defenderse.
 */
export type Stance = 'aggressive' | 'defensive' | 'hold' | 'passive';

export const STANCES: { id: Stance; name: string; icon: string; desc: string }[] = [
  { id: 'aggressive', name: 'Agresiva', icon: '⚔️', desc: 'Ataca a todo lo que ve y lo persigue.' },
  { id: 'defensive', name: 'Defensiva', icon: '🛡️', desc: 'Ataca a lo que se acerca, persigue poco y vuelve a su sitio.' },
  { id: 'hold', name: 'Mantener posición', icon: '⚓', desc: 'No se mueve: solo ataca a lo que tiene a su alcance.' },
  { id: 'passive', name: 'Sin ataque', icon: '🕊️', desc: 'No ataca ni se defiende: evita el combate.' },
];

export function stanceOf(u: Entity): Stance { return (u.stance as Stance) ?? BALANCE.army.defaultStance; }

/** Alcance de ataque de una unidad contra un objetivo (con la ventaja de altura). */
export function reachOf(game: Game, u: Entity, t: Entity): number {
  const range = game.players[u.owner].getStat(game.unitDef(u), 'range');
  return range >= 1 ? range + rangeBonus(game, u, t, range) : MELEE_RANGE + (t.kind === 'unit' ? 0 : 0.25);
}

/** Sitio al que vuelve una unidad defensiva (su posición cuando se quedó quieta). */
export function anchorOf(u: Entity): Pt {
  const a = u.data.anchor as Pt | undefined;
  if (a && hypot(a.x - u.x, a.y - u.y) <= BALANCE.army.defensiveLeash + 1.5) return a;
  u.data.anchor = { x: u.x, y: u.y };
  return u.data.anchor;
}

/**
 * Enemigo al que debería atacar una unidad según su postura (o null).
 * `anchor` es su sitio (hueco de la formación o posición de reposo); `accept` restringe más.
 * Quieta, una unidad solo busca unidades (como en AoE2); avanzando al ataque (`buildings`),
 * también edificios.
 */
export function stanceTarget(game: Game, u: Entity, anchor: Pt, accept?: (e: Entity) => boolean, buildings = false): Entity | null {
  const st = stanceOf(u);
  if (st === 'passive') return null;
  const def = game.unitDef(u);
  if (def.gatherer || !(def.attack ?? 0)) return null;
  const los = game.players[u.owner].getStat(def, 'los');
  const siege = def.classes.includes('siege');
  const leash = BALANCE.army.defensiveLeash;
  return findEnemyNear(game, u, los, siege || buildings, siege, (e, d) => {
    if (accept && !accept(e)) return false;
    if (st === 'hold') return d <= reachOf(game, u, e) + 0.05;
    if (st === 'defensive') return hypot(e.x - anchor.x, e.y - anchor.y) <= leash + reachOf(game, u, e);
    return true;
  });
}

/** Orden de ataque automática acorde con la postura. */
export function engageOrder(u: Entity, t: Entity, anchor: Pt): Order {
  const st = stanceOf(u);
  if (st === 'hold') return { type: 'attack', targetId: t.id, auto: true, hold: true };
  if (st === 'defensive') return { type: 'attack', targetId: t.id, auto: true, anchor: { x: anchor.x, y: anchor.y }, leash: BALANCE.army.defensiveLeash };
  return { type: 'attack', targetId: t.id, auto: true };
}

/** ¿Responde esta unidad (quieta) a quien le ataca? Devuelve la orden o null. */
export function retaliation(game: Game, u: Entity, attacker: Entity): Order | null {
  const st = stanceOf(u);
  if (st === 'passive') return null;
  const anchor = anchorOf(u);
  if (st === 'hold') return edgeDist(u, attacker) <= reachOf(game, u, attacker) + 0.05 ? engageOrder(u, attacker, anchor) : null;
  if (st === 'defensive' && hypot(attacker.x - anchor.x, attacker.y - anchor.y) > BALANCE.army.defensiveLeash + reachOf(game, u, attacker)) return null;
  return engageOrder(u, attacker, anchor);
}
