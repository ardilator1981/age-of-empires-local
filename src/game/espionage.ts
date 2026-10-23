import { BALANCE } from '../config/balance';
import type { CombatRule, OrderHandler, System } from '../core/types';
import { ARRIVED, UNREACHABLE, approach, setOrder } from './actions';
import { isAllied } from './diplomacy';
import type { Entity } from './Entity';
import type { Game } from './Game';
import type { Player } from './Player';
import { hypot } from './fmath';

/**
 * Espionaje (docs/civilizaciones.md §8b), alcance mínimo:
 * - Espía (`UnitDef.stealth`): invisible y no se le puede atacar, salvo cerca de un edificio de
 *   vigilancia (torre, castillo, centro urbano) o de otro espía enemigo del que lo mira.
 * - Orden `spy` con una acción: `intel` (informe y zona revelada un rato), `steal` (copiar una
 *   tecnología del enemigo de edad igual o menor), `sabotage` (daña un edificio y retrasa su
 *   cola) y `bribe` (convierte una unidad enemiga en agente doble: su dueño real ve lo que ve).
 * - Fallar cuesta el espía. Cada espía tiene enfriamiento; robar, además, enfriamiento del jugador.
 * - Un agente doble puede ser descubierto junto a los edificios de vigilancia de su dueño: muere.
 * Todo el estado es simple: `entity.data` (`spyReady`, `agentOf`), `player.data.stealReady` y
 * `game.data.reveals`. Las tiradas usan `game.rng()`.
 */

const E = BALANCE.espionage;
export type SpyAct = 'intel' | 'steal' | 'sabotage' | 'bribe';
export const SPY_ACTS: SpyAct[] = ['intel', 'steal', 'sabotage', 'bribe'];
export const ACT_NAMES: Record<SpyAct, string> = { intel: 'Informe', steal: 'Robar tecnología', sabotage: 'Sabotear', bribe: 'Sobornar' };

interface Reveal { pid: number; x: number; y: number; r: number; until: number }

const detects = (game: Game, pid: number) => E.detectRadius * (game.players[pid].researched.has('counterespionage') ? 2 : 1);

/** ¿Es una unidad con sigilo? */
export const isStealth = (game: Game, u: Entity) => u.kind === 'unit' && !!game.reg.units.get(u.defId)?.stealth;

/** ¿No puede verlo/atacarlo el jugador `pid`? (sigilo y sin detector cerca) */
export function hiddenFrom(game: Game, spy: Entity, pid: number): boolean {
  if (!isStealth(game, spy) || pid === spy.owner || pid === 0 || isAllied(game, pid, spy.owner)) return false;
  const r = detects(game, pid);
  for (const b of game.buildings) {
    if (b.dead || b.owner !== pid || !b.complete) continue;
    const cls = game.buildingDef(b).classes;
    if ((cls.includes('tower') || cls.includes('castle') || cls.includes('townCenter')) && hypot(b.x - spy.x, b.y - spy.y) - b.size / 2 <= r) return false;
  }
  for (const u of game.units) {
    if (u.dead || u.owner !== pid || u === spy || !isStealth(game, u)) continue;
    if (hypot(u.x - spy.x, u.y - spy.y) <= r) return false;
  }
  return true;
}

/** Regla de combate: a un espía oculto no se le puede atacar. */
export const stealthRule: CombatRule = (game, a, t) => !(t.kind === 'unit' && isStealth(game, t) && hiddenFrom(game, t, a.owner));

function reveals(game: Game): Reveal[] { return (game.data.reveals ??= []) as Reveal[]; }

/** Marca como visible y explorado lo revelado por informes de espía (se llama en el sistema de visión). */
export function revealAreas(game: Game, p: Player) {
  const rs = game.data.reveals as Reveal[] | undefined;
  if (!rs || !rs.length) return;
  const m = game.map;
  for (const r of rs) {
    if (r.pid !== p.id || r.until <= game.time) continue;
    for (let y = Math.max(0, Math.floor(r.y - r.r)); y <= Math.min(m.h - 1, Math.ceil(r.y + r.r)); y++) {
      for (let x = Math.max(0, Math.floor(r.x - r.r)); x <= Math.min(m.w - 1, Math.ceil(r.x + r.r)); x++) {
        if (hypot(x + 0.5 - r.x, y + 0.5 - r.y) > r.r) continue;
        p.visible[y * m.w + x] = 1; p.explored[y * m.w + x] = 1;
      }
    }
  }
}

/** Tecnología que `p` puede copiar de `foe`: la más cara que le sirva. */
export function stealableTech(game: Game, p: Player, foe: Player): string | null {
  let best: string | null = null, bc = -1;
  for (const id of foe.researched) {
    const t = game.reg.techs.get(id);
    if (!t || p.researched.has(id) || t.setsAge !== undefined || t.age > p.age) continue;
    if (t.civs && !t.civs.includes(p.civ.id)) continue;
    if (t.requiresTechs?.some(r => !p.researched.has(r))) continue;
    if (t.excludes?.some(x => p.researched.has(x)) || [...p.researched].some(x => game.reg.techs.get(x)?.excludes?.includes(id))) continue;
    const c = Object.values(t.cost).reduce<number>((s, v) => s + (v ?? 0), 0);
    if (c > bc) { bc = c; best = id; }
  }
  return best;
}

export function spyWait(game: Game, u: Entity): number { return Math.max(0, Math.ceil((u.data.spyReady ?? 0) - game.time)); }
export function stealWait(game: Game, p: Player): number { return Math.max(0, Math.ceil((p.data.stealReady ?? 0) - game.time)); }

/** Motivo por el que `pid` no puede hacer esa acción contra ese objetivo (null = puede). */
export function spyProblem(game: Game, pid: number, act: SpyAct, target: Entity | undefined): string | null {
  if (!target || target.dead) return 'El objetivo ya no está';
  if (target.owner === 0 || target.owner === pid) return 'Elige un objetivo enemigo';
  if (isAllied(game, pid, target.owner)) return 'No se espía a los aliados';
  if (act === 'bribe') {
    if (target.kind !== 'unit') return 'Solo se soborna a unidades';
    const cls = game.unitDef(target).classes;
    if (cls.includes('hero') || cls.includes('siege') || cls.includes('livestock') || game.unitDef(target).flying || isStealth(game, target) || target.data.agentOf) return 'Esa unidad no se deja sobornar';
  } else if (target.kind !== 'building') return 'Hay que elegir un edificio';
  if (act === 'sabotage' && game.buildingDef(target).walkable) return 'No hay nada que sabotear ahí';
  return null;
}

function die(game: Game, u: Entity, why: string) {
  game.notify(`🕵️ ${why}`, u.owner, 'warn', { x: u.x, y: u.y });
  game.events.emit('spyCaught', { playerId: u.owner, at: { x: u.x, y: u.y } });
  game.kill(u);
}

function done(game: Game, u: Entity) {
  u.data.spyReady = game.time + E.cooldown;
  setOrder(u, null);
}

/** Resuelve la acción cuando el espía llega. */
function perform(game: Game, u: Entity, act: SpyAct, t: Entity) {
  const p = game.players[u.owner], foe = game.players[t.owner], at = { x: t.x, y: t.y };
  const roll = (chance: number) => game.rng() < chance;
  switch (act) {
    case 'intel': {
      if (!roll(E.successIntel)) return die(game, u, 'Tu espía ha sido capturado');
      const army = game.units.filter(x => !x.dead && x.owner === foe.id && !game.unitDef(x).gatherer && (game.unitDef(x).attack ?? 0) > 0).length;
      const vills = game.units.filter(x => !x.dead && x.owner === foe.id && game.unitDef(x).gatherer).length;
      const res = ['food', 'wood', 'gold', 'stone'].map(r => `${Math.floor(foe.res[r] ?? 0)} ${(game.reg.resources.get(r)?.name ?? r).toLowerCase()}`).join(', ');
      game.notify(`🕵️ Informe sobre ${foe.name} (${game.reg.ageName(foe.age)}): ${army} soldados, ${vills} aldeanos. Almacén: ${res}`, p.id, 'good', at);
      reveals(game).push({ pid: p.id, x: t.x, y: t.y, r: E.intelRadius, until: game.time + E.intelDuration });
      game.events.emit('spyAction', { playerId: p.id, act, at });
      return done(game, u);
    }
    case 'steal': {
      if (stealWait(game, p) > 0) return game.notify('🕵️ Aún no puedes robar otra tecnología', p.id, 'warn'), done(game, u);
      const id = stealableTech(game, p, foe);
      if (!id) return game.notify(`🕵️ ${foe.name} no tiene nada que puedas copiar ahora`, p.id, 'info'), done(game, u);
      const tech = game.reg.tech(id), cost = p.getCost(tech);
      for (const r of Object.keys(cost)) cost[r] = Math.round((cost[r] ?? 0) * E.stealCostFrac);
      if (!p.canAfford(cost)) return game.reject(p.id, 'resources', `Robar ${tech.name} cuesta ${Object.entries(cost).map(([r, v]) => `${v} de ${(game.reg.resources.get(r)?.name ?? r).toLowerCase()}`).join(', ')}`), done(game, u);
      p.pay(cost);
      p.data.stealReady = game.time + E.stealCooldown;
      if (!roll(E.successSteal)) return die(game, u, `Tu espía ha sido descubierto robando ${tech.name}`);
      p.researched.add(id);
      p.addEffects(tech.effects, game);
      p.rebuildModifiers(game);
      game.notify(`🕵️ ¡Tecnología robada: ${tech.name}!`, p.id, 'good', at);
      game.notify(`🕵️ Alguien ha robado vuestra tecnología (${tech.name})`, foe.id, 'warn', at);
      game.events.emit('techResearched', { player: p, techId: id });
      game.events.emit('spyAction', { playerId: p.id, act, at });
      return done(game, u);
    }
    case 'sabotage': {
      if (!roll(E.successSabotage)) return die(game, u, 'Tu espía ha sido capturado al sabotear');
      t.hp = Math.max(1, t.hp - t.maxHp * E.sabotageHp);
      if (t.queue[0]) t.queue[0].progress *= 1 - E.sabotageQueue;
      game.notify(`🔥 Sabotaje en ${game.buildingDef(t).name.toLowerCase()} de ${foe.name}`, p.id, 'good', at);
      game.notify(`🔥 Sabotaje: ${game.buildingDef(t).name} dañado y con la producción retrasada`, foe.id, 'warn', at);
      game.events.emit('spyAction', { playerId: p.id, act, at });
      return done(game, u);
    }
    case 'bribe': {
      if (!p.canAfford({ gold: E.bribeCost })) return game.reject(p.id, 'resources', `Sobornar cuesta ${E.bribeCost} de oro`), done(game, u);
      p.pay({ gold: E.bribeCost });
      if (!roll(E.successBribe)) return die(game, u, 'El soborno ha fallado y tu espía ha sido capturado');
      t.data.agentOf = p.id;
      game.notify(`🕵️ Tienes un agente doble: ${game.unitDef(t).name.toLowerCase()} de ${foe.name} (ves lo que él ve)`, p.id, 'good', at);
      game.events.emit('spyAction', { playerId: p.id, act, at });
      return done(game, u);
    }
  }
}

/** Orden `spy`: va hasta el objetivo y hace la acción. */
export const spyOrder: OrderHandler = {
  update(game, u, o) {
    const t = game.get(o.targetId);
    if (spyProblem(game, u.owner, o.act, t)) { setOrder(u, null); return; }
    const st = approach(game, u, t!, 1.1);
    if (st === ARRIVED) perform(game, u, o.act, t!);
    else if (st === UNREACHABLE) {
      o.fails = (o.fails ?? 0) + 1;
      if (o.fails > 3) setOrder(u, null);
    }
  },
};

/** Orden de red `spy`: `{ units, act, target }`. */
export function spyCommand(game: Game, pid: number, args: any): boolean {
  const act = args?.act as SpyAct, t = game.get(Number(args?.target));
  if (!SPY_ACTS.includes(act)) return false;
  const spies = (Array.isArray(args.units) ? args.units : []).map((id: number) => game.get(id))
    .filter((u: Entity | undefined): u is Entity => !!u && u.owner === pid && isStealth(game, u));
  if (!spies.length) return false;
  const why = spyProblem(game, pid, act, t);
  if (why) { game.reject(pid, 'other', why); return false; }
  const ready = spies.filter((u: Entity) => spyWait(game, u) === 0);
  if (!ready.length) { game.reject(pid, 'requirement', `El espía descansa ${spyWait(game, spies[0])} s`); return false; }
  // Uno solo por orden: el más cercano
  const u = ready.reduce((a: Entity, b: Entity) => hypot(a.x - t!.x, a.y - t!.y) <= hypot(b.x - t!.x, b.y - t!.y) ? a : b);
  setOrder(u, { type: 'spy', act, targetId: t!.id });
  game.events.emit('orderIssued', { playerId: pid, kind: 'move', at: { x: t!.x, y: t!.y } });
  return true;
}

/** Caduca los informes y descubre a los agentes dobles que pasan junto a la vigilancia de su dueño. */
export class EspionageSystem implements System {
  constructor(private game: Game) {}
  update() {
    const g = this.game;
    if (g.tick % 20 !== 0) return;
    const rs = g.data.reveals as Reveal[] | undefined;
    if (rs && rs.some(r => r.until <= g.time)) g.data.reveals = rs.filter(r => r.until > g.time);
    if (g.tick % (20 * E.agentCheckEvery) !== 0) return;
    for (const u of g.units) {
      const by = u.data.agentOf;
      if (u.dead || by === undefined) continue;
      const owner = g.players[u.owner], spymaster = g.players[by];
      if (owner.defeated || spymaster.defeated || isAllied(g, u.owner, by)) { delete u.data.agentOf; continue; }
      const r = detects(g, u.owner);
      const watched = g.buildings.some(b => !b.dead && b.owner === u.owner && b.complete && (g.buildingDef(b).classes.some(c => c === 'tower' || c === 'castle' || c === 'townCenter')) && hypot(b.x - u.x, b.y - u.y) - b.size / 2 <= r);
      if (watched && g.rng() < E.agentDiscoverChance) {
        delete u.data.agentOf;
        g.notify('🕵️ Un agente doble ha sido descubierto y ejecutado', by, 'warn', { x: u.x, y: u.y });
        g.notify('🕵️ ¡Has descubierto a un agente doble entre los tuyos!', u.owner, 'good', { x: u.x, y: u.y });
        g.kill(u);
      }
    }
  }
}
