import { BALANCE } from '../config/balance';
import { BUILD_RANGE } from '../core/constants';
import type { OrderHandler } from '../core/types';
import { ARRIVED, UNREACHABLE, approach, setOrder } from './actions';
import { ALLIANCE, relation, tradeBlock } from './diplomacy';
import type { Entity } from './Entity';
import type { Game } from './Game';
import { hypot } from './fmath';

/**
 * Comercio (docs/civilizaciones.md §8): una caravana (`classes: ['trader']`) va y viene entre dos
 * puestos comerciales (edificios con la clase `tradePost`: mercado, compañía comercial, banco) y
 * cobra oro en cada llegada, proporcional a la distancia entre ellos.
 * - Ruta propia: poco (`domesticMul`). Con un extranjero en paz: más, y el dueño del puesto de
 *   destino cobra una parte. Con un aliado, más aún. Con quien está en guerra o con embargo, no.
 * - Cada caravana extra en la misma ruta rinde menos (`saturation`).
 * - La orden `trade` (`{ home, dest, phase }`) es de datos simples: se guarda con la unidad.
 */

const T = BALANCE.trade;
export const TRADER = 'trader';
export const TRADE_POST = 'tradePost';

export function isPost(game: Game, b: Entity | undefined): b is Entity {
  return !!b && !b.dead && b.kind === 'building' && b.complete && game.buildingDef(b).classes.includes(TRADE_POST);
}

export const isTrader = (game: Game, u: Entity) => u.kind === 'unit' && !u.dead && game.unitDef(u).classes.includes(TRADER);

/** Por qué no puede ir `pid` a comerciar con ese puesto (null = puede). */
export function tradeProblem(game: Game, pid: number, home: Entity, dest: Entity): string | null {
  if (!isPost(game, dest)) return 'Eso no es un puesto comercial';
  const why = tradeBlock(game, pid, dest.owner);
  if (why) return why;
  if (home === dest) return 'Elige otro puesto';
  const d = hypot(home.x - dest.x, home.y - dest.y);
  if (d < T.minDist) return `Ruta demasiado corta (mínimo ${T.minDist} casillas)`;
  return null;
}

/** Puesto propio terminado más cercano a un punto. */
export function nearestPost(game: Game, pid: number, x: number, y: number): Entity | null {
  let best: Entity | null = null, bd = Infinity;
  for (const b of game.buildings) {
    if (b.owner !== pid || !isPost(game, b)) continue;
    const d = hypot(b.x - x, b.y - y);
    if (d < bd) { bd = d; best = b; }
  }
  return best;
}

/** Cuántas caravanas del jugador hacen ahora esta ruta (en cualquier sentido). */
export function routeLoad(game: Game, pid: number, a: number, b: number): number {
  let n = 0;
  for (const u of game.units) {
    const o = u.order;
    if (u.dead || u.owner !== pid || o?.type !== 'trade') continue;
    if ((o.home === a && o.dest === b) || (o.home === b && o.dest === a)) n++;
  }
  return n;
}

/** Oro de una llegada (para el dueño de la caravana) y lo que cobra el otro puesto. */
export function legProfit(game: Game, u: Entity, home: Entity, dest: Entity): { owner: number; partner: number } {
  const p = game.players[u.owner];
  const dist = Math.min(T.maxDist, hypot(home.x - dest.x, home.y - dest.y));
  const rel = dest.owner === u.owner ? 0 : relation(game, u.owner, dest.owner) === ALLIANCE ? T.allyMul : T.foreignMul;
  const mul = dest.owner === u.owner ? T.domesticMul : rel;
  const sat = Math.max(T.saturationMin, 1 - T.saturation * (routeLoad(game, u.owner, home.id, dest.id) - 1));
  const gold = dist * T.perTile * mul * sat * (1 + T.ageBonus * p.age) * p.tradeMult();
  const owner = Math.round(gold);
  return { owner, partner: dest.owner === u.owner ? 0 : Math.round(owner * T.partnerShare) };
}

function pay(game: Game, pid: number, amount: number, at: Entity) {
  if (amount <= 0) return;
  const p = game.players[pid];
  p.res.gold = (p.res.gold ?? 0) + amount;
  p.data.tradeTotal = (p.data.tradeTotal ?? 0) + amount;
  game.events.emit('tradeProfit', { playerId: pid, amount, at: { x: at.x, y: at.y } });
}

function cancel(game: Game, u: Entity, why: string) {
  setOrder(u, null);
  game.warn(game.players[u.owner], 'tradeCancel', `🐪 Ruta comercial cancelada: ${why}`, 8, { x: u.x, y: u.y });
}

/** Orden `trade`: va al puesto de destino, cobra, vuelve al de origen, cobra, y así hasta que se le dé otra orden. */
export const tradeOrder: OrderHandler = {
  update(game, u, o) {
    let home = game.get(o.home);
    const dest = game.get(o.dest);
    if (!isPost(game, home)) {
      // Se perdió el puesto de origen: se busca otro propio
      home = nearestPost(game, u.owner, u.x, u.y) ?? undefined;
      if (!home) return cancel(game, u, 'sin puesto comercial propio');
      o.home = home.id;
    }
    if (!isPost(game, dest)) return cancel(game, u, 'el puesto de destino ya no existe');
    const why = tradeProblem(game, u.owner, home, dest);
    if (why) return cancel(game, u, why.toLowerCase());
    const target = o.phase === 'back' ? home : dest;
    const st = approach(game, u, target, BUILD_RANGE);
    if (st === ARRIVED) {
      const { owner, partner } = legProfit(game, u, home, dest);
      pay(game, u.owner, owner, target);
      if (dest.owner !== u.owner) pay(game, dest.owner, partner, dest);
      o.phase = o.phase === 'back' ? 'out' : 'back';
      o.legs = (o.legs ?? 0) + 1;
      u.path = [];
    } else if (st === UNREACHABLE) {
      o.fails = (o.fails ?? 0) + 1;
      if (o.fails > 3) cancel(game, u, 'no hay camino');
    }
  },
};

/** Orden de red `trade`: `{ units, dest }`. Las caravanas parten del puesto propio más cercano. */
export function tradeCommand(game: Game, pid: number, args: any): boolean {
  const dest = game.get(Number(args?.dest));
  const units = (Array.isArray(args?.units) ? args.units : []).map((id: number) => game.get(id))
    .filter((u: Entity | undefined): u is Entity => !!u && u.owner === pid && isTrader(game, u));
  if (!units.length || !dest) return false;
  let sent = 0, last = '';
  for (const u of units) {
    const home = nearestPost(game, pid, u.x, u.y);
    if (!home) { last = 'Necesitas un puesto comercial propio'; continue; }
    const why = tradeProblem(game, pid, home, dest);
    if (why) { last = why; continue; }
    setOrder(u, { type: 'trade', home: home.id, dest: dest.id, phase: 'out', legs: 0 });
    sent++;
  }
  if (!sent) { game.reject(pid, 'other', last); return false; }
  game.events.emit('orderIssued', { playerId: pid, kind: 'move', at: { x: dest.x, y: dest.y } });
  return true;
}

/** Rutas en marcha de un jugador (para dibujarlas). */
export function activeRoutes(game: Game, pid: number): { home: Entity; dest: Entity; n: number }[] {
  const seen = new Map<string, { home: Entity; dest: Entity; n: number }>();
  for (const u of game.units) {
    const o = u.order;
    if (u.dead || u.owner !== pid || o?.type !== 'trade') continue;
    const home = game.get(o.home), dest = game.get(o.dest);
    if (!home || !dest) continue;
    const k = home.id < dest.id ? `${home.id}-${dest.id}` : `${dest.id}-${home.id}`;
    const r = seen.get(k);
    if (r) r.n++; else seen.set(k, { home, dest, n: 1 });
  }
  return [...seen.values()];
}
