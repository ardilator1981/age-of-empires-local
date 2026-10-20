import { TICK_DT } from '../../core/constants';
import type { Game } from '../Game';
import { stateHash } from './hash';
import { applyNetCommand, type NetCommand } from './netCommands';

/**
 * Pasos sincronizados (lockstep) para una partida en red. No sabe nada del transporte: quien lo
 * usa (`src/net/NetGame.ts`, o la red simulada de los tests) envía los `Turn` que salen de
 * `endTurn()` y entrega los que llegan con `receive()`.
 *
 * Cada cliente ejecuta la simulación entera. Las órdenes que da su jugador en el tick t se
 * ejecutan en todos los clientes en el tick t + `delay` (el retardo de entrada, que tapa la
 * latencia de la red). Un tick solo avanza cuando han llegado los turnos de todos los jugadores
 * que juegan en ese tick (aunque estén vacíos); si falta alguno, el cliente espera. Cada
 * `hashEvery` ticks el turno lleva la huella del estado, y si la de otro cliente no coincide con
 * la propia, se anota en `desync`.
 *
 * Los jugadores pueden irse (`drop`: sus turnos dejan de esperarse a partir de un tick) y volver
 * (`add`: se esperan otra vez desde un tick). Todos los clientes tienen que aplicar lo mismo en
 * los mismos ticks: en `NetGame` lo decide el anfitrión, por el que pasan todos los turnos.
 *
 * La IA no necesita nada: forma parte de la simulación y da lo mismo en todos los clientes.
 */

export interface Turn {
  from: number;
  /** Tick en el que se ejecutan estas órdenes. */
  tick: number;
  cmds: NetCommand[];
  /** Huella del estado al terminar el tick `check.tick` (comprobación de sincronía). */
  check?: { tick: number; hash: number };
}

export interface Desync { tick: number; from: number; mine: number; theirs: number }

/** Ticks en los que juega cada jugador (ambos incluidos). */
export interface Membership { pid: number; from: number; until: number }

export interface LockstepOptions {
  /** Ticks de retardo de entrada (1 o más). Se puede cambiar durante la partida (`setDelay`). */
  delay: number;
  /** Cada cuántos ticks se envía la huella del estado (por defecto, cada segundo). */
  hashEvery?: number;
  /** Se llama con la huella de cada tick en que se calcula. */
  onHash?: (tick: number, hash: number) => void;
  /**
   * Turnos vacíos para los primeros `delay` ticks (por defecto, sí). Quien se une a una partida
   * empezada no los pone: recibe los que ya se enviaron.
   */
  prefill?: boolean;
  /** Antes y después de ejecutar las órdenes de un jugador (p. ej. para silenciar avisos propios). */
  onApply?: (pid: number, phase: 'before' | 'after') => void;
}

export class LockstepPeer {
  delay: number;
  readonly hashEvery: number;
  desync: Desync | null = null;
  /** Órdenes ejecutadas por este cliente (todas las de todos los jugadores). */
  executed = 0;
  private turns = new Map<number, Map<number, NetCommand[]>>();
  private local: NetCommand[] = [];
  private hashes = new Map<number, number>();
  private pendingChecks: { from: number; tick: number; hash: number }[] = [];
  private lastHash: { tick: number; hash: number } | null = null;
  private members = new Map<number, Membership>();
  /** Último tick para el que este cliente ha enviado su turno. */
  private lastSent: number;
  /** Último tick del que se ha recibido turno de cada jugador. */
  private lastFrom = new Map<number, number>();

  /** `players`: ids de los jugadores que mandan órdenes por la red (los humanos). */
  constructor(readonly game: Game, readonly me: number, players: number[] | Membership[], private opts: LockstepOptions) {
    this.delay = Math.max(1, opts.delay);
    this.hashEvery = opts.hashEvery ?? 20;
    for (const p of players) {
      const m = typeof p === 'number' ? { pid: p, from: game.tick + 1, until: Infinity } : { ...p, until: p.until ?? Infinity };
      this.members.set(m.pid, m);
    }
    this.lastSent = game.tick;
    // Los primeros ticks no tienen órdenes de nadie
    if (opts.prefill !== false) {
      for (let t = game.tick + 1; t <= game.tick + this.delay; t++) {
        for (const m of this.members.values()) if (this.plays(m, t)) this.slot(t).set(m.pid, []);
      }
      this.lastSent = game.tick + this.delay;
    } else {
      // Se une a una partida empezada: sus turnos empiezan cuando le toque jugar
      const mine = this.members.get(me);
      if (mine) this.lastSent = Math.max(game.tick, mine.from - 1);
    }
  }

  private plays(m: Membership, t: number) { return t >= m.from && t <= m.until; }

  private slot(tick: number) {
    let m = this.turns.get(tick);
    if (!m) this.turns.set(tick, m = new Map());
    return m;
  }

  /** Jugadores que juegan en el tick `t`, por orden de id. */
  playersAt(t: number): number[] {
    return [...this.members.values()].filter(m => this.plays(m, t)).map(m => m.pid).sort((a, b) => a - b);
  }

  /** Quién juega y desde cuándo (para quien se une a la partida). */
  membership(): Membership[] { return [...this.members.values()].map(m => ({ ...m })); }

  /** Orden del jugador local: sale en el próximo `endTurn()`. */
  issue(cmd: NetCommand) { this.local.push(cmd); }

  /** ¿Están los turnos de todos para el siguiente tick? */
  ready(): boolean { return this.waitingFor().length === 0; }

  /** Jugadores cuyo turno falta para el siguiente tick (a quién se está esperando). */
  waitingFor(): number[] {
    const t = this.game.tick + 1, m = this.turns.get(t);
    return this.playersAt(t).filter(p => !m?.has(p));
  }

  /** Ejecuta el siguiente tick: las órdenes de todos (por orden de jugador) y la simulación. */
  step() {
    if (!this.ready()) throw new Error('Faltan turnos para el tick ' + (this.game.tick + 1));
    const g = this.game, t = g.tick + 1, m = this.turns.get(t);
    this.turns.delete(t);
    for (const p of this.playersAt(t)) {
      const cmds = m?.get(p) ?? [];
      if (!cmds.length) continue;
      this.opts.onApply?.(p, 'before');
      for (const c of cmds) { applyNetCommand(g, p, c); this.executed++; }
      this.opts.onApply?.(p, 'after');
    }
    g.update(TICK_DT);
    if (t % this.hashEvery === 0) {
      const h = stateHash(g);
      this.hashes.set(t, h);
      this.hashes.delete(t - this.hashEvery * 50);
      this.lastHash = { tick: t, hash: h };
      this.opts.onHash?.(t, h);
      this.pendingChecks = this.pendingChecks.filter(c => !this.compare(c));
    }
  }

  /**
   * Cierra el turno local: las órdenes dadas desde el último, para el tick actual + retardo.
   * Normalmente sale un turno. Si el retardo ha subido, salen también turnos vacíos para los
   * ticks intermedios; si ha bajado, ninguno hasta que el reloj alcanza lo ya enviado (las órdenes
   * esperan al siguiente).
   */
  endTurn(): Turn[] {
    const mine = this.members.get(this.me);
    const target = this.game.tick + this.delay;
    const out: Turn[] = [];
    if (!mine) { this.local = []; return out; }
    while (this.lastSent < target) {
      const tick = ++this.lastSent;
      if (!this.plays(mine, tick)) continue;
      const turn: Turn = { from: this.me, tick, cmds: tick === target ? this.local : [] };
      if (tick === target) this.local = [];
      this.slot(tick).set(this.me, turn.cmds);
      out.push(turn);
    }
    if (out.length && this.lastHash) { out[out.length - 1].check = this.lastHash; this.lastHash = null; }
    return out;
  }

  /** Cambia el retardo de entrada (en ticks) para los próximos turnos. */
  setDelay(d: number) { this.delay = Math.max(1, Math.round(d)); }

  /** Turno de otro jugador recibido por la red. */
  receive(turn: Turn) {
    const m = this.members.get(turn.from);
    if (turn.tick > this.game.tick && m && this.plays(m, turn.tick)) this.slot(turn.tick).set(turn.from, turn.cmds);
    this.lastFrom.set(turn.from, Math.max(this.lastFrom.get(turn.from) ?? 0, turn.tick));
    if (turn.check) {
      const c = { from: turn.from, ...turn.check };
      if (!this.compare(c)) this.pendingChecks.push(c);
    }
  }

  /** Último tick del que ha llegado (o se ha enviado, si es el propio) turno de un jugador. */
  lastTurnOf(pid: number): number {
    if (pid === this.me) return this.lastSent;
    return this.lastFrom.get(pid) ?? this.members.get(pid)?.from ?? this.game.tick;
  }

  /** El jugador deja de jugar después del tick `last`: sus turnos posteriores ya no se esperan. */
  drop(pid: number, last: number) {
    const m = this.members.get(pid);
    if (!m) return;
    m.until = last;
    for (const [t, slot] of this.turns) if (t > last) slot.delete(pid);
  }

  /** El jugador vuelve (o entra) a jugar desde el tick `from`. */
  add(pid: number, from: number) {
    this.members.set(pid, { pid, from, until: Infinity });
    if (pid === this.me) this.lastSent = Math.max(this.lastSent, from - 1);
  }

  /** Turnos ya conocidos para ticks futuros (para quien se une: no le llegarán de otra forma). */
  pendingTurns(): Turn[] {
    const out: Turn[] = [];
    for (const [tick, slot] of [...this.turns].sort((a, b) => a[0] - b[0])) {
      if (tick <= this.game.tick) continue;
      for (const [from, cmds] of slot) out.push({ from, tick, cmds });
    }
    return out;
  }

  /** Compara una huella ajena con la propia; devuelve false si aún no se ha llegado a ese tick. */
  private compare(c: { from: number; tick: number; hash: number }): boolean {
    const mine = this.hashes.get(c.tick);
    if (mine === undefined) return c.tick <= this.game.tick - this.hashEvery * 50;
    if (mine !== c.hash && (!this.desync || c.tick < this.desync.tick)) this.desync = { tick: c.tick, from: c.from, mine, theirs: c.hash };
    return true;
  }
}
