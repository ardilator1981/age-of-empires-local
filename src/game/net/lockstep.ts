import { TICK_DT } from '../../core/constants';
import type { Game } from '../Game';
import { stateHash } from './hash';
import { applyNetCommand, type NetCommand } from './netCommands';

/**
 * Pasos sincronizados (lockstep) para una partida en red. Prototipo de medición: no hay
 * transporte; quien lo usa envía los `Turn` que salen de `endTurn()` y entrega los que llegan
 * con `receive()` (ver tests/net/simnet.ts y docs/multijugador.md).
 *
 * Cada cliente ejecuta la simulación entera. Las órdenes que da su jugador en el tick t se
 * ejecutan en todos los clientes en el tick t + `delay` (el retardo de entrada, que tapa la
 * latencia de la red). Un tick solo avanza cuando han llegado los turnos de todos los jugadores
 * para ese tick (aunque estén vacíos); si falta alguno, el cliente espera. Cada `hashEvery`
 * ticks el turno lleva la huella del estado, y si la de otro cliente no coincide con la propia,
 * se anota en `desync`.
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

export interface LockstepOptions {
  /** Ticks de retardo de entrada (1 o más). */
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
}

export class LockstepPeer {
  readonly delay: number;
  readonly hashEvery: number;
  desync: Desync | null = null;
  /** Órdenes ejecutadas por este cliente (todas las de todos los jugadores). */
  executed = 0;
  private turns = new Map<number, Map<number, NetCommand[]>>();
  private local: NetCommand[] = [];
  private hashes = new Map<number, number>();
  private pendingChecks: { from: number; tick: number; hash: number }[] = [];
  private lastHash: { tick: number; hash: number } | null = null;

  /** `players`: ids de los jugadores que mandan órdenes por la red (los humanos). */
  constructor(readonly game: Game, readonly me: number, readonly players: number[], private opts: LockstepOptions) {
    this.delay = Math.max(1, opts.delay);
    this.hashEvery = opts.hashEvery ?? 20;
    // Los primeros ticks no tienen órdenes de nadie
    if (opts.prefill !== false) for (let t = game.tick + 1; t <= game.tick + this.delay; t++) {
      for (const p of players) this.slot(t).set(p, []);
    }
  }

  private slot(tick: number) {
    let m = this.turns.get(tick);
    if (!m) this.turns.set(tick, m = new Map());
    return m;
  }

  /** Orden del jugador local: sale en el próximo `endTurn()`. */
  issue(cmd: NetCommand) { this.local.push(cmd); }

  /** ¿Están los turnos de todos para el siguiente tick? */
  ready(): boolean {
    return (this.turns.get(this.game.tick + 1)?.size ?? 0) === this.players.length;
  }

  /** Jugadores cuyo turno falta para el siguiente tick (a quién se está esperando). */
  waitingFor(): number[] {
    const m = this.turns.get(this.game.tick + 1);
    return this.players.filter(p => !m?.has(p));
  }

  /** Ejecuta el siguiente tick: las órdenes de todos (por orden de jugador) y la simulación. */
  step() {
    if (!this.ready()) throw new Error('Faltan turnos para el tick ' + (this.game.tick + 1));
    const g = this.game, t = g.tick + 1, m = this.turns.get(t)!;
    this.turns.delete(t);
    for (const p of this.players) {
      for (const c of m.get(p)!) { applyNetCommand(g, p, c); this.executed++; }
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

  /** Cierra el turno local: las órdenes dadas desde el último, para el tick actual + retardo. */
  endTurn(): Turn {
    const turn: Turn = { from: this.me, tick: this.game.tick + this.delay, cmds: this.local };
    this.local = [];
    if (this.lastHash) { turn.check = this.lastHash; this.lastHash = null; }
    this.slot(turn.tick).set(this.me, turn.cmds);
    return turn;
  }

  /** Turno de otro jugador recibido por la red. */
  receive(turn: Turn) {
    if (turn.tick > this.game.tick) this.slot(turn.tick).set(turn.from, turn.cmds);
    if (turn.check) {
      const c = { from: turn.from, ...turn.check };
      if (!this.compare(c)) this.pendingChecks.push(c);
    }
  }

  /** Compara una huella ajena con la propia; devuelve false si aún no se ha llegado a ese tick. */
  private compare(c: { from: number; tick: number; hash: number }): boolean {
    const mine = this.hashes.get(c.tick);
    if (mine === undefined) return c.tick <= this.game.tick - this.hashEvery * 50;
    if (mine !== c.hash && (!this.desync || c.tick < this.desync.tick)) this.desync = { tick: c.tick, from: c.from, mine, theirs: c.hash };
    return true;
  }
}
