import { BALANCE } from '../../config/balance';
import type { AIContext, AIPlugin, Cost, Pt } from '../../core/types';
import { Commands } from '../../game/commands';
import { queuedUnits, unitAvail } from '../../game/rules';
import { moveInFormation } from '../../game/formation';
import type { Game } from '../../game/Game';
import {
  activeWar, battlePointInfo, conditions, declarableTargets, declareWar, enemyOf, GENERAL, inCircle, isTownCenter, warState, type War,
} from './war';
import { hypot } from '../../game/fmath';

const W = BALANCE.war;

/** Centro urbano (o cualquier edificio) de un jugador. */
function baseOf(game: Game, pid: number): Pt | null {
  const b = game.buildings.find(e => !e.dead && e.owner === pid && isTownCenter(game, e)) ?? game.buildings.find(e => !e.dead && e.owner === pid);
  return b ? { x: b.x, y: b.y } : null;
}

/**
 * Punto de batalla que elige la IA: entre las dos bases, donde la parte de su lado del
 * círculo tenga más altura que la del rival (le da ventaja a sus arqueros).
 */
export function chooseBattlePoint(game: Game, pid: number, target: number): Pt | null {
  const a = baseOf(game, pid), b = baseOf(game, target);
  if (!a || !b) return null;
  const dx = b.x - a.x, dy = b.y - a.y, d = hypot(dx, dy) || 1;
  const ux = dx / d, uy = dy / d, px = -uy, py = ux;
  const th = game.map.tileHeights(), m = game.map;
  const sideMax = (c: Pt, sign: number) => {
    let best = -Infinity;
    for (let ty = Math.floor(c.y - W.circleRadius); ty <= c.y + W.circleRadius; ty++) for (let tx = Math.floor(c.x - W.circleRadius); tx <= c.x + W.circleRadius; tx++) {
      if (!m.inBounds(tx, ty) || !m.walkable(tx, ty)) continue;
      const rx = tx + 0.5 - c.x, ry = ty + 0.5 - c.y;
      if (hypot(rx, ry) > W.circleRadius || (rx * ux + ry * uy) * sign > 0) continue;
      best = Math.max(best, th[ty * m.w + tx]);
    }
    return best;
  };
  let best: Pt | null = null, bs = -Infinity;
  for (let t = 0.3; t <= 0.71; t += 0.05) for (let off = -16; off <= 16; off += 4) {
    const c = { x: a.x + dx * t + px * off, y: a.y + dy * t + py * off };
    if (!battlePointInfo(game, pid, target, c.x, c.y).ok) continue;
    const score = sideMax(c, 1) - sideMax(c, -1) - Math.abs(t - 0.45) * 4 - Math.abs(off) * 0.05;
    if (score > bs) { bs = score; best = c; }
  }
  return best;
}

/** Puesto de espera dentro del círculo, en su mitad y en lo más alto que encuentre. */
export function stagingPoint(game: Game, w: War, pid: number): { at: Pt; facing: Pt } {
  const home = baseOf(game, pid) ?? { x: w.x, y: w.y };
  const d = hypot(home.x - w.x, home.y - w.y) || 1;
  const ux = (home.x - w.x) / d, uy = (home.y - w.y) / d;
  const m = game.map, th = m.tileHeights();
  const c0 = { x: w.x + ux * w.r * 0.5, y: w.y + uy * w.r * 0.5 };
  let best = game.findFreeTile(c0.x, c0.y, 6) ?? c0, bh = -Infinity;
  for (let ty = Math.floor(c0.y - w.r * 0.45); ty <= c0.y + w.r * 0.45; ty++) for (let tx = Math.floor(c0.x - w.r * 0.45); tx <= c0.x + w.r * 0.45; tx++) {
    if (!m.inBounds(tx, ty) || !m.walkable(tx, ty) || hypot(tx + 0.5 - w.x, ty + 0.5 - w.y) > w.r - 2) continue;
    // Más alto, y sin alejarse mucho del centro de su mitad
    const h = th[ty * m.w + tx] - hypot(tx + 0.5 - c0.x, ty + 0.5 - c0.y) * 0.08;
    if (h > bh) { bh = h; best = { x: tx + 0.5, y: ty + 0.5 }; }
  }
  return { at: best, facing: { x: -ux, y: -uy } };
}

export const warAI: AIPlugin = {
  id: 'declared-war',
  think(ctx: AIContext) {
    const { game: g, player: p, army } = ctx;
    const st = warState(g);
    if (!st) return;
    const c = conditions(g, p);

    // Castillo y General en cuanto se pueda; mientras falte el General, se reserva su coste
    // (la IA no gasta esos recursos en otra cosa, pero sigue entrenando con lo que sobre)
    let reserve: Cost | undefined;
    if (p.age >= W.requiredAge && g.reg.units.has(GENERAL)) {
      if (p.countAll('castle') === 0 && g.reg.buildings.has('castle') && ctx.canSpend(p.getCost(g.reg.building('castle')))) ctx.build('castle');
      const queued = queuedUnits(g, p, GENERAL) > 0;
      if (!c.general && !queued) {
        if (p.count('castle') > 0 && unitAvail(g, p, GENERAL).ok) ctx.train(GENERAL);
        else if (p.count('castle') > 0 && !unitAvail(g, p, GENERAL).reason?.startsWith('Disponible')) reserve = p.getCost(g.reg.unit(GENERAL));
      }
      // Si el General no cabe (población llena), se despide a la tropa más barata para hacerle sitio
      if (!c.general && (queued || unitAvail(g, p, GENERAL).ok) && p.popUsed >= p.popCap && army.length && g.time - (p.data.warFreedAt ?? -99) > 10) {
        p.data.warFreedAt = g.time;
        const value = (u: (typeof army)[number]) => Object.values(p.getCost(g.unitDef(u))).reduce<number>((s, v) => s + (v ?? 0), 0);
        const cheapest = army.filter(u => u.defId !== GENERAL).sort((a, b) => value(a) - value(b))[0];
        if (cheapest) Commands.delete(g, cheapest);
      }
    }

    // Exploración: alguien a caballo (o cualquiera) hasta la base rival más cercana; en paz no hay peligro
    if (!c.discovered.length && g.time > 90 && g.time - (p.data.warScoutAt ?? -999) > 40) {
      p.data.warScoutAt = g.time;
      const rider = army.find(u => g.unitDef(u).autoExplore) ?? army[0];
      let goal: Pt | null = null, gd = Infinity;
      for (const q of g.players.slice(1)) {
        if (q.id === p.id || q.defeated) continue;
        const b = baseOf(g, q.id);
        if (b && hypot(b.x - ctx.home.x, b.y - ctx.home.y) < gd) { gd = hypot(b.x - ctx.home.x, b.y - ctx.home.y); goal = b; }
      }
      if (rider && goal) Commands.move(g, [rider], goal.x + 4, goal.y + 4);
    }

    // Declarar
    const targets = declarableTargets(g, p);
    if (targets.length && (army.length >= W.aiMinArmy || g.time - (st.readySince[p.id] ?? g.time) >= W.aiMaxWait)) {
      const home = ctx.home;
      const target = targets.sort((a, b) => {
        const pa = baseOf(g, a), pb = baseOf(g, b);
        return (pa ? hypot(pa.x - home.x, pa.y - home.y) : 1e9) - (pb ? hypot(pb.x - home.x, pb.y - home.y) : 1e9);
      })[0];
      const pt = chooseBattlePoint(g, p.id, target);
      if (pt) declareWar(g, p.id, target, pt.x, pt.y);
    }

    const w = activeWar(g, p.id);
    // En la batalla y la conquista no se ahorra: tropas
    if (w && w.phase !== 'prep') reserve = undefined;
    // En paz (o preparando), un ejército de tamaño razonable: si no, llena la población y la IA no avanza
    const holdTraining = (!w || w.phase === 'prep') && army.length >= g.opts.popLimit * W.aiPeaceArmyShare;
    if (!w) return { holdTraining, reserve }; // en paz, la IA reúne su ejército en casa como siempre (no puede atacar a nadie)

    if (w.phase === 'prep') {
      // Espera en formación, en lo alto de su mitad del círculo; recoloca cada 15 s a las que lleguen
      if (g.time - (p.data.warStageAt ?? -999) > 15) {
        p.data.warStageAt = g.time;
        const s = stagingPoint(g, w, p.id);
        const away = army.filter(u => !u.order && hypot(u.x - s.at.x, u.y - s.at.y) > 5);
        if (away.length) moveInFormation(g, away.length === army.length ? army : away, s.at, s.facing);
      }
      return { armyHandled: true, holdTraining, reserve };
    }
    if (w.phase === 'battle') {
      // El General no carga: se queda tras sus tropas, dentro del círculo (su aura llega a 7 casillas
      // y si cae se pierde la batalla)
      const gen = army.find(u => u.defId === GENERAL);
      const troops = army.filter(u => u !== gen);
      if (gen) {
        const home = baseOf(g, p.id) ?? { x: w.x, y: w.y };
        const inside = troops.filter(u => inCircle(w, u));
        const cx = inside.length ? inside.reduce((s, u) => s + u.x, 0) / inside.length : w.x;
        const cy = inside.length ? inside.reduce((s, u) => s + u.y, 0) / inside.length : w.y;
        const hd = hypot(home.x - cx, home.y - cy) || 1;
        let tx = cx + ((home.x - cx) / hd) * 3, ty = cy + ((home.y - cy) / hd) * 3;
        const cd = hypot(tx - w.x, ty - w.y);
        if (cd > w.r - 1.5) { tx = w.x + ((tx - w.x) / cd) * (w.r - 1.5); ty = w.y + ((ty - w.y) / cd) * (w.r - 1.5); }
        const spot = g.findFreeTile(tx, ty, 4) ?? { x: tx, y: ty };
        if (hypot(gen.x - spot.x, gen.y - spot.y) > 2.5 && gen.order?.type !== 'move') Commands.move(g, [gen], spot.x, spot.y);
      }
      // A por el enemigo dentro del círculo; las que estén fuera, al círculo
      const foes = g.units.filter(u => !u.dead && u.owner === enemyOf(w, p.id) && inCircle(w, u));
      const idle = troops.filter(u => !u.order || u.order.type === 'move');
      if (idle.length) {
        const t = foes[0] ?? { x: w.x, y: w.y };
        Commands.attackMove(g, idle, t.x, t.y);
      }
      return { armyHandled: true, holdTraining, reserve };
    }
    // Conquista: la IA sigue su plan de siempre (el ganador ataca el pueblo rival; el perdedor se defiende)
    return { holdTraining, reserve };
  },
};
