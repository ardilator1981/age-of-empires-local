import { BALANCE } from '../../config/balance';
import type { AIPlugin, BuildingDef, OverlayFn, TechDef, UnitDef } from '../../core/types';
import type { Registry } from '../../core/Registry';
import { PEACE, ALLIANCE, accept, breakTreaty, decline, diploState, goodwill, propose, proposalsFor, relation, withRelation, WAR } from '../../game/diplomacy';
import { spyCommand, spyProblem, spyWait, stealWait, stealableTech } from '../../game/espionage';
import { hypot } from '../../game/fmath';
import type { Entity } from '../../game/Entity';
import type { Game } from '../../game/Game';
import { isPost, nearestPost, tradeCommand, tradeProblem, activeRoutes } from '../../game/trade';

/**
 * Comercio, diplomacia y espionaje (fase 5 de docs/civilizaciones.md): el mercado, la caravana, el
 * espía, sus tecnologías y la IA que los usa. La lógica está en `game/trade.ts`, `game/diplomacy.ts`
 * y `game/espionage.ts`.
 */

const T = BALANCE.trade, D = BALANCE.diplomacy, E = BALANCE.espionage;

export const tradeBuildings: BuildingDef[] = [
  {
    id: 'market', name: 'Mercado', icon: '🏪', category: 'economy',
    description: 'Puesto comercial: sus caravanas viajan a otros puestos y cobran oro según la distancia (más con un rival en paz o aliado). Aquí se entrenan caravanas y espías.',
    classes: ['building', 'tradePost'], cost: { wood: 150, stone: 50 }, buildTime: 45, size: 3,
    hp: 1200, armor: { melee: 0, pierce: 6 }, los: 5, age: 1,
    sprite: 'building', spriteParams: { style: 'hall', height: 18, roofHeight: 12, wall: '#d8c9a0', roof: '#a4572f' },
  },
];

export const tradeUnits: UnitDef[] = [
  {
    id: 'caravan', name: 'Caravana', icon: '🐪',
    description: 'Va y viene entre dos puestos comerciales cobrando oro por la distancia. Elige un puesto propio lejano o de alguien que no esté en guerra contigo. Indefensa: escóltala.',
    classes: ['trader'], cost: { wood: 100, gold: 50 }, trainTime: 30, trainedAt: ['market', 'tradingCompany', 'bank'],
    hp: 70, armor: { melee: 0, pierce: 1 }, speed: 0.9, los: 4, pop: 1, age: 1, radius: 0.3,
    sprite: 'cart', spriteParams: {},
  },
  {
    id: 'spy', name: 'Espía', icon: '🕵️',
    description: 'Invisible salvo junto a torres, castillos, centros urbanos o espías enemigos. Informa, roba tecnología, sabotea y soborna. Si falla, cae. Descansa un rato tras cada misión.',
    classes: ['spy'], cost: { gold: 90 }, trainTime: 30, trainedAt: ['market'],
    hp: 25, armor: { melee: 0, pierce: 0 }, speed: 1.15, los: 6, pop: 1, age: 2, radius: 0.2, maxAlive: 3, stealth: true,
    sprite: 'humanoid', spriteParams: { hood: '#2b2b33', cape: true, legs: '#2b2b33' },
  },
];

export const tradeTechs: TechDef[] = [
  {
    id: 'caravanserai', name: 'Caravasar', icon: '🛖', cost: { wood: 100, gold: 200 }, researchTime: 45, age: 2, researchedAt: 'market',
    description: 'Posadas de ruta: las caravanas cobran un 20% más.',
    effects: [{ type: 'tradeYield', mul: 1.2 }],
  },
  {
    id: 'counterespionage', name: 'Contraespionaje', icon: '🔍', cost: { gold: 150 }, researchTime: 40, age: 2, researchedAt: 'market',
    description: 'Patrullas e informantes: la vigilancia descubre a los espías al doble de distancia.',
    effects: [],
  },
  {
    id: 'bankingHouses', name: 'Casas de cambio', icon: '💱', cost: { gold: 350 }, researchTime: 50, age: 4, researchedAt: 'market',
    requiresTechs: ['caravanserai'],
    description: 'Letras de cambio: las caravanas cobran un 25% más.',
    effects: [{ type: 'tradeYield', mul: 1.25 }],
  },
];

/** Datos que cambian contenido ya registrado: puestos comerciales y bonos de civilización. */
export function registerTrade(reg: Registry) {
  tradeBuildings.forEach(b => reg.addBuilding(b));
  tradeUnits.forEach(u => reg.addUnit(u));
  tradeTechs.forEach(t => reg.addTech(t));
  for (const id of ['tradingCompany', 'bank']) reg.patchBuilding(id, b => { if (!b.classes.includes('tradePost')) b.classes.push('tradePost'); });
  const bonus = (civ: string, mul: number, text: string) => reg.patchCiv(civ, c => { c.bonuses.push({ type: 'tradeYield', mul }); c.bonusText.push(text); });
  bonus('persia', 1.25, 'Rutas de la Seda: caravanas +25% de ganancia');
  bonus('china', 1.15, 'Gran Canal: caravanas +15% de ganancia');
  bonus('ethiopia', 1.1, 'Ruta del incienso y el oro: caravanas +10% de ganancia');
  bonus('britain', 1.1, 'Compañías de comercio: caravanas +10% de ganancia');
}

// ------------------------------------------------------------------ dibujo

/** Dibuja las rutas comerciales en marcha del jugador (línea de puntos dorada entre los puestos). */
export const drawRoutes: OverlayFn = o => {
  const g = o.game;
  if (!g.reg.units.has('caravan')) return;
  const routes = activeRoutes(g, g.humanId);
  if (!routes.length) return;
  const ctx = o.ctx;
  ctx.save();
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(241,196,15,0.75)';
  for (const r of routes) {
    const a = o.project(r.home.x, r.home.y), b = o.project(r.dest.x, r.dest.y);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  ctx.restore();
};

// ------------------------------------------------------------------ IA

function armyOf(game: Game, pid: number): number {
  let n = 0;
  for (const u of game.units) if (!u.dead && u.owner === pid && !u.inside) { const d = game.unitDef(u); if (!d.gatherer && (d.attack ?? 0) > 0) n++; }
  return n;
}

/** Mercado y caravanas de la IA: construye el mercado, mantiene unas caravanas y las manda a la mejor ruta. */
export const tradeAI: AIPlugin = {
  id: 'trade',
  think(ctx) {
    const { game: g, player: p } = ctx;
    if (p.age < 1 || ctx.villagers.length < 14) return;
    const markets = ctx.buildings.filter(b => b.defId === 'market' && b.complete);
    if (!p.countAll('market')) {
      if (ctx.canSpend({ wood: 150, stone: 50 })) ctx.build('market');
      return;
    }
    if (!markets.length && !ctx.buildings.some(b => isPost(g, b))) return;
    const caravans = g.units.filter(u => !u.dead && u.owner === p.id && u.defId === 'caravan');
    const want = T.aiCaravans[Math.min(p.age, T.aiCaravans.length - 1)];
    if (caravans.length + ctx.buildings.reduce((n, b) => n + b.queue.filter(q => q.id === 'caravan').length, 0) < want && ctx.army.length >= 4) {
      if (ctx.canSpend({ wood: 100, gold: 50 })) ctx.train('caravan');
    }
    // Rutas: a los puestos de quien no está en guerra con ella (cuanto más lejos, mejor), o a uno propio lejano
    for (const u of caravans) {
      if (u.order) continue;
      const home = nearestPost(g, p.id, u.x, u.y);
      if (!home) continue;
      let best: Entity | null = null, bs = -1;
      for (const b of g.buildings) {
        if (!isPost(g, b) || b.owner === 0 || tradeProblem(g, p.id, home, b)) continue;
        const rel = b.owner === p.id ? 0 : relation(g, p.id, b.owner) === ALLIANCE ? T.allyMul : T.foreignMul;
        const score = Math.min(T.maxDist, hypot(home.x - b.x, home.y - b.y)) * (b.owner === p.id ? T.domesticMul : rel);
        if (score > bs) { bs = score; best = b; }
      }
      if (best) tradeCommand(g, p.id, { units: [u.id], dest: best.id });
    }
  },
};

/** Diplomacia de la IA: responde a propuestas, pide la paz si va peor y la rompe cuando se ve mucho más fuerte. */
export const diplomacyAI: AIPlugin = {
  id: 'diplomacy',
  think(ctx) {
    const { game: g, player: p } = ctx;
    const d = diploState(g);
    if (!d || g.data.war) return;
    const diff = p.difficulty;
    const mine = ctx.army.length;
    // 1. Responde a lo que le proponen
    for (const pr of proposalsFor(g, p.id)) {
      const theirs = armyOf(g, pr.from);
      if (pr.kind === 'peace') {
        const winning = mine > theirs * 1.5 && mine >= 8;
        if (!winning || goodwill(g, p.id, pr.from) >= D.aiGoodwill || diff === 'easy') accept(g, p.id, pr.id); else decline(g, p.id, pr.id);
      } else {
        const common = withRelation(g, p.id, WAR).some(q => relation(g, pr.from, q) === WAR);
        if (common) accept(g, p.id, pr.id); else decline(g, p.id, pr.id);
      }
    }
    if (g.time < (p.data.diploAt ?? 0)) return;
    p.data.diploAt = g.time + D.aiProposeEvery;
    // 2. Pide la paz a quien le gana (si no hay ya propuesta suya) y propone alianza contra un enemigo común
    for (const q of withRelation(g, p.id, WAR)) {
      if (d.proposals.some(x => x.from === p.id && x.to === q)) continue;
      if (mine * D.aiPeaceRatio < armyOf(g, q) && ctx.villagers.length >= 6) propose(g, p.id, q, 'peace');
    }
    for (const q of withRelation(g, p.id, PEACE)) {
      if (d.proposals.some(x => x.from === p.id && x.to === q)) continue;
      const common = withRelation(g, p.id, WAR).some(e => relation(g, q, e) === WAR);
      if (common) propose(g, p.id, q, 'alliance');
    }
    // 3. Rompe la paz con quien ve mucho más débil (o, pasado mucho tiempo, con cualquiera si es agresiva)
    if (diff === 'easy' || p.age < D.aiBreakAge || mine < D.aiBreakArmy) return;
    for (const q of withRelation(g, p.id, PEACE)) {
      const since = g.time - d.since[p.id * d.n + q];
      const ratio = diff === 'hard' ? 1.2 : D.aiBreakRatio;
      if (since >= D.aiBreakAfter && mine >= armyOf(g, q) * ratio || since >= D.aiBreakAfter * 2) { breakTreaty(g, p.id, q); break; }
    }
  },
};

/** Espías de la IA: entrena uno y lo manda a robar tecnología, sabotear o informar sobre el vecino enemigo. */
export const spyAI: AIPlugin = {
  id: 'spies',
  think(ctx) {
    const { game: g, player: p } = ctx;
    if (p.age < 2 || !ctx.buildings.some(b => b.defId === 'market' && b.complete)) return;
    const spies = g.units.filter(u => !u.dead && u.owner === p.id && u.defId === 'spy');
    const queued = ctx.buildings.reduce((n, b) => n + b.queue.filter(q => q.id === 'spy').length, 0);
    if (!spies.length && !queued && ctx.canSpend({ gold: E.aiMinGold })) { ctx.train('spy'); return; }
    for (const u of spies) {
      if (u.order || spyWait(g, u) > 0) continue;
      const foes = g.players.slice(1).filter(q => q.id !== p.id && !q.defeated && g.isEnemy(p.id, q.id));
      if (!foes.length) continue;
      // El enemigo con el edificio más cercano al espía
      let foe = foes[0], fd = Infinity;
      for (const b of g.buildings) {
        if (b.dead || !foes.some(q => q.id === b.owner)) continue;
        const dd = hypot(b.x - u.x, b.y - u.y);
        if (dd < fd) { fd = dd; foe = g.players[b.owner]; }
      }
      const blds = g.buildings.filter(b => !b.dead && b.owner === foe.id && b.complete && !g.buildingDef(b).walkable);
      if (!blds.length) continue;
      const near = (list: Entity[]) => list.reduce((a, b) => hypot(a.x - u.x, a.y - u.y) <= hypot(b.x - u.x, b.y - u.y) ? a : b);
      const gold = p.res.gold ?? 0;
      let act: 'steal' | 'sabotage' | 'intel' = 'intel';
      if (gold >= E.aiMinGold && stealWait(g, p) === 0 && stealableTech(g, p, foe)) act = 'steal';
      else if (p.age >= 3 && g.rng() < 0.5) act = 'sabotage';
      else if (g.rng() < 0.3) continue;
      const pool = act === 'sabotage' ? blds.filter(b => b.queue.length) : blds;
      const target = near(pool.length ? pool : blds);
      if (!spyProblem(g, p.id, act, target)) spyCommand(g, p.id, { units: [u.id], act, target: target.id });
    }
  },
};
