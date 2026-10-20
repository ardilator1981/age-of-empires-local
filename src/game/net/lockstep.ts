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

/**
 * Un tramo de ticks en el que juega un jugador (ambos incluidos). Un jugador que se va y vuelve
 * tiene varios tramos: los anteriores se conservan porque otros clientes pueden ir unos ticks
 * por delante y haber ejecutado ya sus órdenes de entonces.
 */
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
  private members: Membership[] = [];
  /** Último tick para el que este cliente ha enviado su turno. */
  private lastSent: number;
  /** Último tick del que se ha recibido turno de cada jugador. */
  private lastFrom = new Map<number, number>();

  /** `players`: ids de los jugadores que mandan órdenes por la red (los humanos). */
  constructor(readonly game: Game, readonly me: number, players: number[] | Membership[], private opts: LockstepOptions) {
    this.delay = Math.max(1, opts.delay);
    this.hashEvery = opts.hashEvery ?? 20;
    for (const p of players) {
      this.members.push(typeof p === 'number' ? { pid: p, from: game.tick + 1, until: Infinity } : { ...p, until: p.until ?? Infinity });
    }
    this.lastSent = game.tick;
    // Los primeros ticks no tienen órdenes de nadie
    if (opts.prefill !== false) {
      for (let t = game.tick + 1; t <= game.tick + this.delay; t++) {
        for (const pid of this.playersAt(t)) this.slot(t).set(pid, []);
      }
      this.lastSent = game.tick + this.delay;
    } else {
      // Se une a una partida empezada: sus turnos empiezan cuando le toque jugar
      const mine = this.openSpan(me);
      if (mine) this.lastSent = Math.max(game.tick, mine.from - 1);
    }
  }

  /** ¿Juega `pid` en el tick `t`? */
  plays(pid: number, t: number) { return this.members.some(m => m.pid === pid && t >= m.from && t <= m.until); }

  /** Tramo abierto (sin final) de un jugador, si sigue jugando. */
  private openSpan(pid: number) { return this.members.find(m => m.pid === pid && m.until === Infinity); }

  private slot(tick: number) {
    let m = this.turns.get(tick);
    if (!m) this.turns.set(tick, m = new Map());
    return m;
  }

  /** Jugadores que juegan en el tick `t`, por orden de id. */
  playersAt(t: number): number[] {
    return [...new Set(this.members.filter(m => t >= m.from && t <= m.until).map(m => m.pid))].sort((a, b) => a - b);
  }

  /** Quién juega y en qué ticks (para quien se une a la partida). */
  membership(): Membership[] { return this.members.map(m => ({ ...m })); }

  /** ¿Sigue jugando (sin fecha de salida)? */
  active(pid: number) { return !!this.openSpan(pid); }

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
    const target = this.game.tick + this.delay;
    const out: Turn[] = [];
    if (!this.members.some(m => m.pid === this.me && m.until > this.lastSent)) { this.local = []; return out; }
    while (this.lastSent < target) {
      const tick = ++this.lastSent;
      if (!this.plays(this.me, tick)) continue;
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
    if (turn.tick > this.game.tick && this.plays(turn.from, turn.tick)) this.slot(turn.tick).set(turn.from, turn.cmds);
    this.lastFrom.set(turn.from, Math.max(this.lastFrom.get(turn.from) ?? 0, turn.tick));
    if (turn.check) {
      const c = { from: turn.from, ...turn.check };
      if (!this.compare(c)) this.pendingChecks.push(c);
    }
  }

  /** Último tick del que ha llegado (o se ha enviado, si es el propio) turno de un jugador. */
  lastTurnOf(pid: number): number {
    if (pid === this.me) return this.lastSent;
    return this.lastFrom.get(pid) ?? this.game.tick;
  }

  /** Cuántos ticks seguidos se podrían ejecutar ya (si son muchos, los demás van por delante). */
  readyAhead(max = 64): number {
    let n = 0;
    for (let t = this.game.tick + 1; n < max; t++, n++) {
      const slot = this.turns.get(t);
      if (this.playersAt(t).some(p => !slot?.has(p))) break;
    }
    return n;
  }

  /** El jugador deja de jugar después del tick `last`: sus turnos posteriores ya no se esperan. */
  drop(pid: number, last: number) {
    const m = this.openSpan(pid);
    if (!m) return;
    m.until = Math.max(m.from - 1, last);
    for (const [t, slot] of this.turns) if (t > m.until) slot.delete(pid);
  }

  /** El jugador vuelve (o entra) a jugar desde el tick `from` (después de su último tramo). */
  add(pid: number, from: number) {
    if (this.openSpan(pid)) return;
    this.members.push({ pid, from, until: Infinity });
    if (pid === this.me) this.lastSent = Math.max(this.lastSent, from - 1);
  }

  /** Olvida una desincronización ya atendida. */
  clearDesync() { this.desync = null; }

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
