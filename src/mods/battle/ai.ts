import { BALANCE } from '../../config/balance';
import type { AIPlugin, Pt } from '../../core/types';
import { setOrder } from '../../game/actions';
import { createGroup } from '../../game/army/groups';
import { hypot } from '../../game/fmath';
import type { Game } from '../../game/Game';
import { aliveMembers, battleState, regiments, type Regiment } from './state';

const B = BALANCE.battle;

/** Distancia al enemigo más cercano (a sus unidades). */
function enemyDistance(game: Game, r: Regiment): number {
  let bd = Infinity;
  for (const e of game.units) {
    if (e.dead || e.inside || !game.isEnemy(r.owner, e.owner)) continue;
    bd = Math.min(bd, hypot(e.x - r.center.x, e.y - r.center.y));
  }
  return bd;
}

/** Punto al que replegarse: en dirección contraria al enemigo más cercano, a `aiRegroupDistance` casillas. */
function regroupPoint(game: Game, r: Regiment): Pt {
  let near: { x: number; y: number } | null = null, bd = Infinity;
  for (const e of game.units) {
    if (e.dead || e.inside || !game.isEnemy(r.owner, e.owner)) continue;
    const d = hypot(e.x - r.center.x, e.y - r.center.y);
    if (d < bd) { bd = d; near = e; }
  }
  const ux = near ? r.center.x - near.x : -r.facing.x, uy = near ? r.center.y - near.y : -r.facing.y, d = hypot(ux, uy) || 1;
  const x = Math.max(2, Math.min(game.map.w - 3, r.center.x + (ux / d) * B.aiRegroupDistance));
  const y = Math.max(2, Math.min(game.map.h - 3, r.center.y + (uy / d) * B.aiRegroupDistance));
  return game.findFreeTile(x, y, 8) ?? { x: r.center.x, y: r.center.y };
}

/** Repliega un regimiento: se retira en orden (sin pánico ni luchar) para recuperar moral lejos del enemigo. */
function startRegroup(game: Game, r: Regiment) {
  const us = aliveMembers(game, r);
  if (!us.length) return;
  r.regroup = true;
  r.regroupStance = us[0].stance;
  for (const u of us) { u.stance = 'passive'; u.data.aiHold = true; }
  createGroup(game, us, { type: 'loose', mode: 'retreat', route: [regroupPoint(game, r)] });
}

/** Devuelve el regimiento a la línea: postura de antes y la IA vuelve a mandarlo. */
function endRegroup(game: Game, r: Regiment) {
  r.regroup = false;
  for (const u of aliveMembers(game, r)) {
    u.stance = r.regroupStance ?? 'aggressive';
    delete u.data.aiHold;
    if (u.order?.type === 'formation') setOrder(u, null);
  }
}

/**
 * IA de la capa táctica (fase 1): retira los regimientos con la moral por debajo de `aiRetreatBelow`,
 * los deja recuperarse lejos del enemigo y los devuelve a la línea al llegar a `aiRejoinAbove`.
 * Los que ya huyen por el pánico los lleva el sistema de la batalla. El resto (qué atacar, cuándo)
 * lo sigue decidiendo la IA de siempre. El despliegue y el plan de batalla son de la fase 4.
 */
export const battleAI: AIPlugin = {
  id: 'battle',
  think({ game, player }) {
    if (!battleState(game)) return;
    for (const r of regiments(game)) {
      if (r.owner !== player.id || r.hero || r.routed) continue;
      if (!r.regroup) { if (r.morale < B.aiRetreatBelow && enemyDistance(game, r) > B.aiDisengage) startRegroup(game, r); continue; }
      // Recuperado, o alcanzado por el enemigo (no se puede replegar con él encima): vuelve a luchar
      if (r.morale >= B.aiRejoinAbove || enemyDistance(game, r) < B.aiCaught) endRegroup(game, r);
      // Algo (otra orden) lo sacó de la retirada: de vuelta a ella
      else if (aliveMembers(game, r).some(u => u.order && u.order.type !== 'formation')) {
        const us = aliveMembers(game, r);
        createGroup(game, us, { type: 'loose', mode: 'retreat', route: [regroupPoint(game, r)] });
      }
    }
  },
};
