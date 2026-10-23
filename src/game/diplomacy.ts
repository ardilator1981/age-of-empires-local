import { BALANCE } from '../config/balance';
import type { System } from '../core/types';
import type { Game } from './Game';

/**
 * Diplomacia (docs/civilizaciones.md §8): tabla de relaciones entre jugadores.
 * - Guerra (por defecto): se pueden atacar.
 * - Paz: nadie ataca a nadie; se puede comerciar (salvo embargo).
 * - Alianza: además comparten visión y la partida acaba con victoria compartida.
 *
 * Todo el estado es simple y vive en `game.data.diplo` (se guarda y entra en la huella). Las
 * consultas nunca lo crean; solo lo hacen `initDiplomacy` (partida nueva) y las órdenes.
 * `Game.isEnemy` lo consulta, así que combate, visión, IA y ratón lo respetan sin más.
 */

export const WAR = 0, PEACE = 1, ALLIANCE = 2;
export type Rel = 0 | 1 | 2;
export type ProposalKind = 'peace' | 'alliance';

export interface Proposal { id: number; from: number; to: number; kind: ProposalKind; until: number }

export interface DiploState {
  n: number;
  /** Relación entre i y j en [i*n+j] (simétrica). */
  rel: number[];
  /** Momento del último cambio de la pareja (para el bloqueo de tratados). */
  since: number[];
  /** embargo[i*n+j] = 1: i ha decretado un embargo contra j. */
  embargo: number[];
  /** Valor acumulado de los tributos que j ha dado a i, en [i*n+j] (buena voluntad de la IA). */
  goodwill: number[];
  proposals: Proposal[];
  nextId: number;
}

const D = BALANCE.diplomacy;

/** Modos de juego que no admiten paz ni alianzas (Guerra declarada, Matar al rey). */
export const diplomacyOff = (game: Game) => !!game.data.war || !!game.data.noDiplomacy;

export function diploState(game: Game): DiploState | undefined { return game.data.diplo; }

export function initDiplomacy(game: Game) {
  const n = game.players.length, z = () => new Array<number>(n * n).fill(0);
  game.data.diplo = { n, rel: z(), since: z(), embargo: z(), goodwill: z(), proposals: [], nextId: 1 } as DiploState;
}

function ensure(game: Game): DiploState {
  if (!game.data.diplo) initDiplomacy(game);
  return game.data.diplo;
}

/** Relación entre dos jugadores (0 = guerra si no hay tabla). */
export function relation(game: Game, a: number, b: number): Rel {
  if (a === b) return ALLIANCE;
  const d = diploState(game);
  return d ? (d.rel[a * d.n + b] as Rel) : WAR;
}
export const isAllied = (game: Game, a: number, b: number) => relation(game, a, b) === ALLIANCE;
export const atPeace = (game: Game, a: number, b: number) => relation(game, a, b) >= PEACE;

export function embargoed(game: Game, a: number, b: number): boolean {
  const d = diploState(game);
  return !!d && (d.embargo[a * d.n + b] === 1 || d.embargo[b * d.n + a] === 1);
}

/** ¿Pueden comerciar `a` y `b`? (propio, o en paz o alianza y sin embargo). Devuelve el motivo si no. */
export function tradeBlock(game: Game, a: number, b: number): string | null {
  if (a === b) return null;
  if (relation(game, a, b) === WAR) return 'Solo se comercia con quien no está en guerra con nosotros';
  if (embargoed(game, a, b)) return 'Hay un embargo entre los dos';
  return null;
}

export function goodwill(game: Game, from: number, to: number): number {
  const d = diploState(game);
  return d ? d.goodwill[to * d.n + from] : 0;
}

export function proposalsFor(game: Game, pid: number): Proposal[] {
  return diploState(game)?.proposals.filter(p => p.to === pid) ?? [];
}

/** Jugadores vivos (sin Naturaleza) con los que `pid` tiene esa relación. */
export function withRelation(game: Game, pid: number, rel: Rel): number[] {
  return game.players.slice(1).filter(q => q.id !== pid && !q.defeated && relation(game, pid, q.id) === rel).map(q => q.id);
}

/** ¿Están todos los jugadores dados aliados entre sí? (victoria compartida) */
export function allAllied(game: Game, ids: number[]): boolean {
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) if (!isAllied(game, ids[i], ids[j])) return false;
  return true;
}

const name = (game: Game, id: number) => game.players[id].name;
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.ceil(s % 60)).padStart(2, '0')}`;

function setRelation(game: Game, a: number, b: number, rel: Rel) {
  const d = ensure(game), old = d.rel[a * d.n + b] as Rel;
  if (old === rel) return;
  d.rel[a * d.n + b] = d.rel[b * d.n + a] = rel;
  d.since[a * d.n + b] = d.since[b * d.n + a] = game.time;
  d.proposals = d.proposals.filter(p => !((p.from === a && p.to === b) || (p.from === b && p.to === a)));
  game.events.emit('diplomacyChanged', { a, b, rel, old });
}

const REL_TEXT = ['guerra', 'paz', 'alianza'];

function reject(game: Game, pid: number, text: string): false {
  game.reject(pid, 'other', text);
  return false;
}

function usable(game: Game, pid: number, other: number): string | null {
  if (diplomacyOff(game)) return 'En este modo de juego no hay diplomacia';
  const p = game.players[pid], q = game.players[other];
  if (!p || !q || pid === other || pid === 0 || other === 0) return 'Jugador no válido';
  if (p.defeated || q.defeated) return 'Ese jugador ya ha caído';
  return null;
}

/** Propone paz o alianza. Si el otro ya la había propuesto, se cierra el trato. */
export function propose(game: Game, pid: number, to: number, kind: ProposalKind): boolean {
  const why = usable(game, pid, to);
  if (why) return reject(game, pid, why);
  const d = ensure(game), cur = relation(game, pid, to);
  if (kind === 'peace' && cur !== WAR) return reject(game, pid, 'Ya no estáis en guerra');
  if (kind === 'alliance' && cur !== PEACE) return reject(game, pid, cur === ALLIANCE ? 'Ya sois aliados' : 'Primero hace falta la paz');
  if (kind === 'alliance' && game.time - d.since[pid * d.n + to] < D.treatyLock && d.since[pid * d.n + to] > 0) {
    return reject(game, pid, `Tratado reciente: espera ${clock(D.treatyLock - (game.time - d.since[pid * d.n + to]))}`);
  }
  if (d.proposals.some(p => p.from === pid && p.to === to && p.kind === kind)) return reject(game, pid, 'Ya has hecho esa propuesta');
  const mutual = d.proposals.find(p => p.from === to && p.to === pid && p.kind === kind);
  if (mutual) { accept(game, pid, mutual.id); return true; }
  d.proposals.push({ id: d.nextId++, from: pid, to, kind, until: game.time + D.proposalTtl });
  game.notify(`🕊 Has propuesto ${kind === 'peace' ? 'la paz' : 'una alianza'} a ${name(game, to)}`, pid, 'info');
  game.notify(`🕊 ${name(game, pid)} te propone ${kind === 'peace' ? 'la paz' : 'una alianza'}`, to, 'good');
  game.events.emit('diplomacyProposal', { from: pid, to, kind });
  return true;
}

export function accept(game: Game, pid: number, id: number): boolean {
  const d = diploState(game), pr = d?.proposals.find(p => p.id === id && p.to === pid);
  if (!d || !pr) return false;
  const why = usable(game, pid, pr.from);
  if (why) { d.proposals = d.proposals.filter(p => p !== pr); return reject(game, pid, why); }
  setRelation(game, pid, pr.from, pr.kind === 'peace' ? PEACE : ALLIANCE);
  const txt = pr.kind === 'peace' ? 'Paz' : 'Alianza';
  for (const [x, y] of [[pid, pr.from], [pr.from, pid]]) game.notify(`🤝 ${txt} con ${name(game, y)}`, x, 'good');
  for (const o of game.players.slice(1)) if (o.id !== pid && o.id !== pr.from) game.notify(`🤝 ${name(game, pid)} y ${name(game, pr.from)}: ${REL_TEXT[pr.kind === 'peace' ? PEACE : ALLIANCE]}`, o.id, 'info');
  return true;
}

export function decline(game: Game, pid: number, id: number): boolean {
  const d = diploState(game), pr = d?.proposals.find(p => p.id === id && p.to === pid);
  if (!d || !pr) return false;
  d.proposals = d.proposals.filter(p => p !== pr);
  game.notify(`✖ ${name(game, pid)} rechaza tu propuesta`, pr.from, 'warn');
  game.events.emit('diplomacyRefused', { from: pr.from, to: pid });
  return true;
}

/**
 * Baja un escalón la relación con `other`: de alianza a paz y de paz a guerra (declararla).
 * Hay un bloqueo tras cada cambio para que no se firme y rompa a cada momento.
 */
export function breakTreaty(game: Game, pid: number, other: number): boolean {
  const why = usable(game, pid, other);
  if (why) return reject(game, pid, why);
  const d = ensure(game), cur = relation(game, pid, other);
  if (cur === WAR) return reject(game, pid, 'Ya estáis en guerra');
  const left = D.treatyLock - (game.time - d.since[pid * d.n + other]);
  if (d.since[pid * d.n + other] > 0 && left > 0) return reject(game, pid, `Tratado reciente: espera ${clock(left)}`);
  setRelation(game, pid, other, (cur - 1) as Rel);
  if (cur === PEACE) {
    game.notify(`⚔️ Has declarado la guerra a ${name(game, other)}`, pid, 'good');
    game.notify(`⚔️ ¡${name(game, pid)} te ha declarado la guerra!`, other, 'warn');
    for (const o of game.players.slice(1)) if (o.id !== pid && o.id !== other) game.notify(`⚔️ ${name(game, pid)} ha declarado la guerra a ${name(game, other)}`, o.id, 'info');
  } else {
    game.notify(`La alianza con ${name(game, other)} se ha roto: quedáis en paz`, pid, 'info');
    game.notify(`💔 ${name(game, pid)} rompe la alianza: quedáis en paz`, other, 'warn');
  }
  return true;
}

/** Regala recursos (pierde `tributeFee` por el camino). Sube la buena voluntad de la IA. */
export function tribute(game: Game, pid: number, to: number, res: string, amount: number): boolean {
  const why = usable(game, pid, to);
  if (why) return reject(game, pid, why);
  amount = Math.floor(Number(amount));
  const p = game.players[pid], r = game.reg.resources.get(res);
  if (!r || !(amount >= D.tributeMin)) return reject(game, pid, `El tributo mínimo es ${D.tributeMin}`);
  if ((p.res[res] ?? 0) < amount) return reject(game, pid, `No tienes ${amount} de ${r.name.toLowerCase()}`);
  const d = ensure(game), got = Math.floor(amount * (1 - D.tributeFee));
  p.res[res] -= amount;
  game.players[to].res[res] = (game.players[to].res[res] ?? 0) + got;
  d.goodwill[pid * d.n + to] += got * (res === 'gold' ? 1 : 0.6);
  game.notify(`🎁 Envías ${amount} de ${r.name.toLowerCase()} a ${name(game, to)} (le llegan ${got})`, pid, 'good');
  game.notify(`🎁 ${name(game, pid)} te envía ${got} de ${r.name.toLowerCase()}`, to, 'good');
  game.events.emit('tribute', { from: pid, to, res, amount: got });
  return true;
}

export function setEmbargo(game: Game, pid: number, target: number, on: boolean): boolean {
  const why = usable(game, pid, target);
  if (why) return reject(game, pid, why);
  const d = ensure(game);
  if (d.embargo[pid * d.n + target] === (on ? 1 : 0)) return false;
  d.embargo[pid * d.n + target] = on ? 1 : 0;
  game.notify(on ? `⛔ Embargo comercial a ${name(game, target)}` : `Embargo a ${name(game, target)} levantado`, pid, 'info');
  game.notify(on ? `⛔ ${name(game, pid)} te impone un embargo comercial` : `${name(game, pid)} levanta el embargo`, target, on ? 'warn' : 'good');
  return true;
}

/** Orden de red `diplo`: `{ a: 'propose'|'accept'|'decline'|'break'|'tribute'|'embargo', ... }`. */
export function diploCommand(game: Game, pid: number, args: any): boolean {
  switch (args?.a) {
    case 'propose': return args.kind === 'peace' || args.kind === 'alliance' ? propose(game, pid, Number(args.to), args.kind) : false;
    case 'accept': return accept(game, pid, Number(args.id));
    case 'decline': return decline(game, pid, Number(args.id));
    case 'break': return breakTreaty(game, pid, Number(args.to));
    case 'tribute': return tribute(game, pid, Number(args.to), String(args.res), args.amount);
    case 'embargo': return setEmbargo(game, pid, Number(args.to), !!args.on);
  }
  return false;
}

/** Caduca las propuestas sin respuesta y las de jugadores caídos. */
export class DiplomacySystem implements System {
  constructor(private game: Game) {}
  update() {
    const g = this.game, d = diploState(g);
    if (!d || !d.proposals.length || g.tick % 20 !== 0) return;
    const keep: Proposal[] = [];
    for (const p of d.proposals) {
      if (g.players[p.from].defeated || g.players[p.to].defeated) continue;
      if (p.until > g.time) { keep.push(p); continue; }
      g.notify(`⌛ ${name(g, p.to)} no ha respondido a tu propuesta`, p.from, 'info');
    }
    d.proposals = keep;
  }
}
