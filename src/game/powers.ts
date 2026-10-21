import type { Cost, PowerDef, System } from '../core/types';
import { BALANCE } from '../config/balance';
import { hypot } from './fmath';
import type { Entity } from './Entity';
import type { Game } from './Game';
import type { Player } from './Player';
import type { Avail } from './rules';

/**
 * Poderes activos (docs/civilizaciones.md §5, `PowerDef`). Todo el estado es simple y se guarda:
 * - `player.data.powerReady[id]`: tiempo de partida en el que se puede volver a usar.
 * - `game.data.powerFx`: efectos con duración o pagos pendientes (tregua, zona de tierra quemada,
 *   oro que vuelve de una expedición, deuda), que `PowerSystem` va cumpliendo.
 */

/** Efecto con duración o pago diferido. `at` = cuándo termina o se cobra. */
export type PowerFx =
  | { t: 'truce'; pid: number; until: number }
  | { t: 'zone'; pid: number; x: number; y: number; r: number; until: number; slow: number }
  | { t: 'pay'; pid: number; at: number; res: string; amount: number; debt?: boolean };

export function powerFx(game: Game): PowerFx[] {
  return (game.data.powerFx ??= []) as PowerFx[];
}

/** Poderes que tiene el jugador por civilización y edad (estén o no listos). */
export function playerPowers(game: Game, p: Player): PowerDef[] {
  const out: PowerDef[] = [];
  for (const d of game.reg.powers.values()) {
    if (d.civs && !d.civs.includes(p.civ.id)) continue;
    if (p.age < d.minAge || (d.maxAge !== undefined && p.age > d.maxAge)) continue;
    out.push(d);
  }
  return out;
}

/** Segundos que faltan para poder usar el poder (0 = listo). */
export function powerWait(game: Game, p: Player, id: string): number {
  return Math.max(0, Math.ceil((p.data.powerReady?.[id] ?? 0) - game.time));
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export function powerAvail(game: Game, p: Player, id: string): Avail {
  const d = game.reg.powers.get(id);
  if (!d || !playerPowers(game, p).includes(d)) return { visible: false, ok: false };
  const wait = powerWait(game, p, id);
  if (wait > 0) return { visible: true, ok: false, reason: `Disponible en ${clock(wait)}`, code: 'requirement' };
  if (d.cost && !p.canAfford(d.cost)) {
    const lack = Object.entries(d.cost).filter(([r, v]) => (p.res[r] ?? 0) < (v ?? 0)).map(([r, v]) => `${Math.ceil((v ?? 0) - (p.res[r] ?? 0))} de ${(game.reg.resources.get(r)?.name ?? r).toLowerCase()}`);
    return { visible: true, ok: false, reason: `Falta ${lack.join(', ')}`, code: 'resources' };
  }
  return { visible: true, ok: true };
}

/** Usa un poder. Devuelve si se ha hecho; si no, avisa al jugador de por qué. Es la orden de red `power`. */
export function usePower(game: Game, pid: number, args: any): boolean {
  const p = game.players[pid];
  const d = p && typeof args?.id === 'string' ? game.reg.powers.get(args.id) : undefined;
  if (!p || !d) return false;
  const a = powerAvail(game, p, d.id);
  if (!a.ok) { if (a.visible) game.rejectAvail(pid, a); return false; }
  const x = Number(args.x), y = Number(args.y);
  if (d.target === 'point' && !(Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0 && x < game.map.w && y < game.map.h)) return false;
  const why = d.apply(game, p, { x, y });
  if (why) { game.reject(pid, 'other', why); return false; }
  if (d.cost) p.pay(d.cost as Cost);
  (p.data.powerReady ??= {})[d.id] = game.time + d.cooldown;
  game.events.emit('powerUsed', { playerId: pid, powerId: d.id, at: d.target === 'point' ? { x, y } : undefined });
  return true;
}

/** ¿Hay una tregua en vigor que afecte a este jugador? */
export function inTruce(game: Game, pid: number): boolean {
  const fx = game.data.powerFx as PowerFx[] | undefined;
  return !!fx && fx.some(f => f.t === 'truce' && f.pid === pid && f.until > game.time);
}

/** Regla de combate del Tributo: mientras dura, ni el que pagó ataca ni se le ataca. */
export function truceRule(game: Game, attacker: Entity, target: Entity): boolean {
  if (!game.data.powerFx) return true;
  return !(inTruce(game, attacker.owner) || inTruce(game, target.owner));
}

/** Factor de velocidad de una unidad dentro de una zona de tierra quemada enemiga (1 = ninguno). */
export function zoneSpeedFactor(game: Game, u: Entity): number {
  const fx = game.data.powerFx as PowerFx[] | undefined;
  if (!fx || !fx.length) return 1;
  let k = 1;
  for (const f of fx) {
    if (f.t !== 'zone' || f.until <= game.time || !game.isEnemy(f.pid, u.owner)) continue;
    if (hypot(u.x - f.x, u.y - f.y) <= f.r) k = Math.min(k, f.slow);
  }
  return k;
}

/** Cumple los pagos diferidos y retira los efectos que han terminado. */
export class PowerSystem implements System {
  constructor(private game: Game) {}
  update() {
    const g = this.game, fx = g.data.powerFx as PowerFx[] | undefined;
    if (!fx || !fx.length) return;
    const keep: PowerFx[] = [];
    for (const f of fx) {
      if (f.t === 'pay') {
        if (f.at > g.time) { keep.push(f); continue; }
        const p = g.players[f.pid];
        if (f.amount >= 0) { p.res[f.res] = (p.res[f.res] ?? 0) + f.amount; g.notify(`💰 Llegan ${f.amount} de ${(g.reg.resources.get(f.res)?.name ?? f.res).toLowerCase()}`, f.pid, 'good'); continue; }
        // Deuda: se cobra lo que haya y el resto se reintenta
        const owed = -f.amount, paid = Math.min(owed, Math.floor(p.res[f.res] ?? 0));
        p.res[f.res] = (p.res[f.res] ?? 0) - paid;
        if (paid < owed) keep.push({ ...f, at: g.time + BALANCE.powers.credit.retryEvery, amount: -(owed - paid) });
        else g.notify('🏦 Deuda saldada', f.pid, 'info');
      } else if (f.until > g.time) keep.push(f);
      else if (f.t === 'truce') g.notify('🕊 Termina la tregua del Tributo', f.pid, 'warn');
    }
    g.data.powerFx = keep;
  }
}

/** ¿Tiene el jugador una deuda sin saldar? */
export function hasDebt(game: Game, pid: number): boolean {
  const fx = game.data.powerFx as PowerFx[] | undefined;
  return !!fx && fx.some(f => f.t === 'pay' && f.pid === pid && f.amount < 0);
}
