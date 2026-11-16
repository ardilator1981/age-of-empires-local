import { BALANCE } from '../../config/balance';
import type { CommandFilter, NetCommandHandler } from '../../core/types';
import type { Entity } from '../../game/Entity';
import type { Game } from '../../game/Game';
import { Commands } from '../../game/commands';
import { hypot } from '../../game/fmath';
import { aliveMembers, battleState, moraleCap, regimentOf, regiments, type Regiment } from './state';

const B = BALANCE.battle;

/**
 * Órdenes de jugador de la capa táctica (`{ t: 'mod', id: 'battle', args }`): correr o caminar
 * (`run`), cargar hacia un punto (`charge`) y arengar (`harangue`). Van por la cola de turnos en
 * red, así que solo usan datos simples: ids y coordenadas.
 */

/** Soldados propios (con regimiento, que no huye) de una lista de ids. */
function soldiers(game: Game, pid: number, ids: unknown): Entity[] {
  if (!Array.isArray(ids)) return [];
  const out: Entity[] = [];
  for (const id of ids) {
    const u = typeof id === 'number' ? game.get(id) : undefined;
    if (!u || u.kind !== 'unit' || u.owner !== pid) continue;
    const r = regimentOf(game, u);
    if (r && !r.routed) out.push(u);
  }
  return out;
}

function regimentsOf(game: Game, units: Entity[]): Regiment[] {
  const set = new Map<number, Regiment>();
  for (const u of units) { const r = regimentOf(game, u); if (r) set.set(r.id, r); }
  return [...set.values()];
}

/** General propio vivo (la unidad), si lo hay. */
export function generalOf(game: Game, pid: number): Entity | undefined {
  for (const r of regiments(game)) {
    if (r.owner === pid && r.hero) return aliveMembers(game, r)[0];
  }
  return undefined;
}

export interface OrderState { ok: boolean; reason?: string; wait?: number }

/** ¿Puede el jugador dar órdenes de mando (cargar, arengar)? Sin General, no. */
export function commandState(game: Game, pid: number): OrderState {
  return battleState(game)?.generalDead[pid] ? { ok: false, reason: 'Sin General no se puede ordenar la carga ni arengar' } : { ok: true };
}

/** Arengar: hace falta un General vivo y han de haber pasado `harangueCooldown` s desde la última. */
export function harangueState(game: Game, pid: number): OrderState {
  const st = battleState(game);
  if (!st) return { ok: false, reason: 'Capa táctica desactivada' };
  const c = commandState(game, pid);
  if (!c.ok) return c;
  if (!generalOf(game, pid)) return { ok: false, reason: 'Necesitas un General vivo para arengar' };
  const wait = Math.ceil((st.harangued[pid] ?? -Infinity) + B.harangueCooldown - game.time);
  return wait > 0 ? { ok: false, reason: `Podrás arengar de nuevo en ${wait} s`, wait } : { ok: true };
}

/** Órdenes de movimiento y ataque de las tropas, que se retrasan cuando el General ha caído. */
const DELAYED = new Set(['smart', 'move', 'attackMove', 'attack', 'army', 'stop']);

/**
 * Mando limitado (§3.9): sin General no se pueden cambiar las formaciones, y las órdenes de las
 * tropas tardan `noGeneralDelay` s en cumplirse. Las de la economía (construir, entrenar...) no.
 */
export const battleCommandFilter: CommandFilter = (game, pid, c) => {
  const st = battleState(game);
  if (!st || !st.generalDead[pid]) return;
  if (c.t === 'formation') return 'Sin General no se pueden cambiar las formaciones';
  if (!DELAYED.has(c.t)) return;
  const units: unknown[] = Array.isArray(c.units) ? c.units : [];
  if (!units.some(id => { const u = typeof id === 'number' ? game.get(id) : undefined; return !!u && u.owner === pid && !!regimentOf(game, u); })) return;
  st.queue.push({ at: game.time + B.noGeneralDelay, pid, c: JSON.parse(JSON.stringify(c)) });
  game.warn(game.players[pid], 'cmdDelay', `🎖️ Sin General las órdenes tardan ${B.noGeneralDelay} s en cumplirse`, 8);
  return true;
};

export const battleOrder: NetCommandHandler = (game, pid, args) => {
  const st = battleState(game);
  if (!st || !args) return false;
  switch (args.op) {
    case 'run': {
      const regs = regimentsOf(game, soldiers(game, pid, args.units));
      if (!regs.length) return false;
      // Si alguno no corre, todos corren; si todos corren, todos caminan
      const on = regs.some(r => !r.running);
      for (const r of regs) {
        if (on && r.fatigue >= 100) continue;
        r.running = on; r.stillFor = 0;
      }
      return true;
    }
    case 'charge': {
      const x = Number(args.x), y = Number(args.y);
      if (!(Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0 && x < game.map.w && y < game.map.h)) return false;
      const c = commandState(game, pid);
      if (!c.ok) { game.reject(pid, 'other', c.reason!); return false; }
      const units = soldiers(game, pid, args.units);
      if (!units.length) return false;
      // Avanzar atacando a toda velocidad: el ímpetu lo da correr hacia un regimiento enemigo cercano
      if (!Commands.army(game, units, { kind: 'attack', points: [{ x, y }] }, true)) return false;
      for (const r of regimentsOf(game, units)) { if (r.fatigue < 100) { r.running = true; r.stillFor = 0; } }
      return true;
    }
    case 'harangue': {
      const a = harangueState(game, pid);
      if (!a.ok) { game.reject(pid, 'other', a.reason!); return false; }
      const gen = generalOf(game, pid)!;
      let n = 0;
      for (const r of regiments(game)) {
        if (r.owner !== pid || r.routed || r.hero) continue;
        if (hypot(r.center.x - gen.x, r.center.y - gen.y) > B.harangueRadius) continue;
        r.morale = Math.min(moraleCap(st, r), r.morale + B.harangue);
        n++;
      }
      st.harangued[pid] = game.time;
      game.notify(`📣 El General arenga a ${n} regimiento${n === 1 ? '' : 's'}`, pid, 'good', { x: gen.x, y: gen.y });
      return true;
    }
  }
  return false;
};
