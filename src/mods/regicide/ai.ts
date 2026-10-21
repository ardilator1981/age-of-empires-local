import { BALANCE } from '../../config/balance';
import type { AIContext, AIPlugin } from '../../core/types';
import { Commands } from '../../game/commands';
import { hypot } from '../../game/fmath';
import { nearestShelter } from '../../game/garrison';
import { kingOf, regicideOn, rivalKings } from './rules';

const R = BALANCE.regicide;

/**
 * IA del modo "Matar al rey": esconde a su rey en el refugio más cercano (si no hay, lo aparta de
 * las tropas enemigas o lo lleva a casa) y manda a por el rey rival al ejército que ya está en
 * territorio enemigo: al rey mismo si está a la vista, o al edificio donde se esconde.
 */
export const regicideAI: AIPlugin = {
  id: 'regicide',
  think(ctx: AIContext) {
    const { game: g, player: p, army, home } = ctx;
    if (!regicideOn(g)) return;

    // Proteger al propio rey
    const king = kingOf(g, p.id);
    if (king && !king.inside && king.order?.type !== 'garrison') {
      const shelter = nearestShelter(g, king);
      if (shelter) Commands.garrison(g, [king], shelter);
      else {
        // Sin refugio: lejos de las tropas enemigas cercanas, o en casa si no hay peligro
        let fx = 0, fy = 0, n = 0;
        for (const u of g.units) {
          if (u.dead || !g.isEnemy(p.id, u.owner) || (g.unitDef(u).attack ?? 0) <= 0) continue;
          if (hypot(u.x - king.x, u.y - king.y) < R.aiDangerRadius) { fx += u.x; fy += u.y; n++; }
        }
        if (n) {
          const dx = king.x - fx / n, dy = king.y - fy / n, d = hypot(dx, dy) || 1;
          const spot = g.findFreeTile(king.x + (dx / d) * 8, king.y + (dy / d) * 8, 6);
          if (spot && !king.order) Commands.move(g, [king], spot.x, spot.y);
        } else if (!king.order && hypot(king.x - home.x, king.y - home.y) > 6) Commands.move(g, [king], home.x, home.y);
      }
    }

    // Buscar al rey rival: el más cercano a la base
    const foes = rivalKings(g, p.id).sort((a, b) => hypot(a.x - home.x, a.y - home.y) - hypot(b.x - home.x, b.y - home.y));
    const foe = foes[0];
    if (!foe) return;
    const inn = g.get(foe.inside);
    const deep = army.filter(a => hypot(a.x - home.x, a.y - home.y) > R.aiHuntDistance);
    for (const a of deep) {
      // Una orden por objetivo: no se repite mientras la unidad siga a por él
      const key = inn ? -inn.id : foe.id;
      if (a.data.kingHunt === key && a.order) continue;
      a.data.kingHunt = key;
      if (inn) Commands.attackMove(g, [a], inn.x, inn.y);
      else Commands.attack(g, [a], foe);
    }
  },
};
