import { BALANCE } from '../config/balance';
import { PLAYER_COLORS } from '../core/constants';
import { TICK_DT } from '../core/constants';
import type { Registry } from '../core/Registry';
import { Game, type GameOptions } from '../game/Game';
import { LockstepPeer, type Turn } from '../game/net/lockstep';
import { predictOrder, type NetCommand } from '../game/net/netCommands';
import { snapshot, type SaveData } from '../game/save';
import type { OrderSink } from '../app/orders';
import { contentHash, pack, unpack } from './codec';
import { NET_PROTOCOL, type LobbySettings, type LobbySlot, type LobbyState, type NetMessage, type PlayerStatus, type Transport } from './protocol';

/**
 * Una partida en red, de la sala al final. No toca el DOM ni el render: la interfaz (`ui/Lobby`,
 * `app/App`) escucha sus eventos y le pasa el tiempo con `frame(dt)`. Así se prueba en Node con
 * un transporte en memoria (tests/netgame.test.ts).
 *
 * - **Anfitrión:** lleva la sala, crea la partida (todos empiezan con su partida guardada, no con
 *   la semilla: la generación del mapa no es determinista entre navegadores) y retransmite los
 *   turnos de todos. Por eso decide sin ambigüedad quién juega en cada tick: si alguien se va,
 *   sabe cuál fue su último turno (`drop`) y la IA juega por él; si vuelve, le manda la partida
 *   de ese momento y le hace sitio unos ticks más adelante (`add`).
 * - **Invitado:** solo habla con el anfitrión. Si se desincroniza o vuelve de segundo plano tras
 *   ser sustituido, pide la partida (`resync`) y sigue.
 * - Mide la latencia (ping) y el anfitrión ajusta el retardo de entrada para todos.
 */

const NB = BALANCE.net;

/** Ticks de retardo para tantos ms reales a esta velocidad de juego. */
export function delayTicks(ms: number, speed: number): number {
  return Math.max(NB.delayMin, Math.ceil(ms / (TICK_DT * 1000 / (speed || 1))));
}

export interface NetGameOptions {
  transport: Transport;
  role: 'host' | 'guest';
  /** Identificador estable de este cliente (para reconocerlo si se reconecta). */
  clientId: string;
  name: string;
  /** Versión del juego: los clientes con otra no entran. */
  build: string;
  /** Registro de contenido para estos mods (el mismo que usa App.start). */
  registry: (mods: string[]) => Registry;
  /** Prepara el tipo de mapa antes de generarlo (los mapas reales cargan sus datos). */
  prepareMap?: (reg: Registry, mapType: string) => Promise<void>;
  /** Anfitrión: opciones y jugador iniciales de la sala. */
  settings?: LobbySettings;
  me?: { civ: string; color: number };
  code?: string;
  now?: () => number;
  /** Huella del estado en cada comprobación (para pruebas y depuración). */
  onHash?: (tick: number, hash: number) => void;
}

export interface NetEvents {
  /** La sala ha cambiado. */
  lobby: LobbyState;
  /** Empieza la partida, o se ha vuelto a cargar (resincronización o reconexión). */
  game: { game: Game; resync: boolean };
  /** No se puede entrar o se ha parado la partida. */
  refused: string;
  /** Sin noticias del anfitrión. */
  hostLost: void;
  /** Estado de los jugadores (latencia, quién se ha ido). */
  status: PlayerStatus[];
  /** Aviso para la interfaz. */
  info: string;
}

interface ClientInfo {
  clientId: string;
  peerId: string | null;
  pid?: number;
  name: string;
  rtt?: number;
  rttDev?: number;
  /** Ms que ha esperado turnos (y la espera más larga) desde el último cálculo del retardo. */
  waited?: number;
  waitedMax?: number;
  away: boolean;
  connected: boolean;
  /** Ya no juega (la IA lleva sus tropas). */
  dropped: boolean;
}

let idCounter = 0;

export class NetGame implements OrderSink {
  readonly online = true;
  readonly role: 'host' | 'guest';
  lobby: LobbyState | null = null;
  game: Game | null = null;
  peer: LockstepPeer | null = null;
  /** Jugador de este cliente en la partida. */
  pid = 0;
  /** Latencia de ida y vuelta con el anfitrión (invitados) o la peor de los invitados (anfitrión). */
  rtt: number | null = null;
  status: PlayerStatus[] = [];
  /** Ms que lleva esperando turnos (0 = no espera). */
  waitingMs = 0;
  /** Se ha detectado una desincronización (y se ha pedido la partida). */
  desyncs = 0;
  /** Esperando la partida del anfitrión (resincronización o reconexión). */
  loading = false;
  ended = false;

  private t: Transport;
  private o: NetGameOptions;
  private now: () => number;
  private hostPeer: string | null = null;
  private lastHostMsg = 0;
  private hostLostSent = false;
  private clients = new Map<string, ClientInfo>();
  private byPeer = new Map<string, string>();
  private inbox: { msg: NetMessage; from: string }[] = [];
  private listeners: { [K in keyof NetEvents]?: ((v: NetEvents[K]) => void)[] } = {};
  private acc = 0;
  private lastPing = 0;
  private lastDelay = 0;
  private lowerVotes = 0;
  private lastStatus = 0;
  private waitStart = new Map<number, number>();
  /** Ms esperando turnos (y la espera más larga) desde el último informe o cálculo del retardo. */
  private waited = 0;
  private waitedMax = 0;
  private delaySpeed = 0;
  /** Hasta cuándo no se sube el retardo por esperas (alguien acaba de irse, volver o salir de la app). */
  private calmUntil = 0;
  /** Fracción del tiempo que alguien ha esperado turnos en el último cálculo (para la interfaz). */
  waitShare = 0;
  /** Anfitrión: mensajes guardados para quien está recibiendo la partida (se mandan después de ella). */
  private holding = new Map<string, NetMessage[]>();
  private waitSince = 0;
  private applyingOwn = false;
  private droppedSelf = false;
  /** El anfitrión ha avisado de que está en segundo plano. */
  hostAway = false;
  private away = false;
  private resyncAsked = false;
  private reg: Registry | null = null;

  constructor(o: NetGameOptions) {
    this.o = o;
    this.t = o.transport;
    this.role = o.role;
    this.now = o.now ?? (() => performance.now());
    this.lastHostMsg = this.now();
    this.t.onMessage = (msg, from) => this.onMessage(msg, from);
    this.t.onPeerJoin = id => this.onJoin(id);
    this.t.onPeerLeave = id => this.onLeave(id);
    if (o.role === 'host') {
      const me = o.me ?? { civ: 'random', color: 0 };
      this.lobby = {
        settings: o.settings!, hostId: o.clientId, code: o.code ?? '', started: false,
        slots: [{ kind: 'human', clientId: o.clientId, name: o.name, civ: me.civ, color: me.color, difficulty: 'normal', connected: true }],
      };
      this.clients.set(o.clientId, { clientId: o.clientId, peerId: null, name: o.name, away: false, connected: true, dropped: false });
    }
    for (const p of this.t.peers()) this.onJoin(p);
  }

  get isHost() { return this.role === 'host'; }

  /** Transporte de la partida (para preguntarle cómo va cada conexión). */
  get transport(): Transport { return this.t; }

  /** Par del transporte de un cliente (anfitrión) o del anfitrión (invitado), para la interfaz. */
  peerOf(clientId: string): string | null {
    if (this.isHost) return this.clients.get(clientId)?.peerId ?? null;
    return clientId === this.lobby?.hostId ? this.hostPeer : null;
  }

  on<K extends keyof NetEvents>(evt: K, fn: (v: NetEvents[K]) => void): () => void {
    const l = (this.listeners[evt] ??= []) as ((v: NetEvents[K]) => void)[];
    l.push(fn);
    return () => { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); };
  }
  private emit<K extends keyof NetEvents>(evt: K, v: NetEvents[K]) {
    for (const fn of [...(this.listeners[evt] ?? [])] as ((v: NetEvents[K]) => void)[]) fn(v);
  }

  // ------------------------------------------------------------ sala

  /** Anfitrión: cambia opciones de la partida. */
  setSettings(s: Partial<LobbySettings>) {
    if (!this.isHost || !this.lobby || this.lobby.started) return;
    this.lobby.settings = { ...this.lobby.settings, ...s };
    this.broadcastLobby();
  }

  /** Anfitrión: añade un puesto de la IA. */
  addAI() {
    const l = this.lobby;
    if (!this.isHost || !l || l.started || l.slots.length >= NB.maxPlayers) return;
    l.slots.push({ kind: 'ai', name: 'IA', civ: 'random', color: this.freeColor(), difficulty: 'normal' });
    this.broadcastLobby();
  }

  /** Anfitrión: cambia o quita un puesto de la IA. */
  editSlot(i: number, s: Partial<LobbySlot> | null) {
    const l = this.lobby;
    if (!this.isHost || !l || l.started || !l.slots[i] || l.slots[i].kind !== 'ai') return;
    if (s === null) l.slots.splice(i, 1);
    else this.applyPick(l.slots[i], s);
    this.broadcastLobby();
  }

  /** El jugador de este cliente cambia de nombre, civilización o color. */
  pick(s: { name?: string; civ?: string; color?: number }) {
    if (this.isHost) {
      const slot = this.lobby?.slots.find(x => x.clientId === this.o.clientId);
      if (slot && !this.lobby!.started) { this.applyPick(slot, s); this.broadcastLobby(); }
    } else if (this.hostPeer) this.t.send({ k: 'pick', ...s }, this.hostPeer);
  }

  private applyPick(slot: LobbySlot, s: { name?: string; civ?: string; color?: number; difficulty?: LobbySlot['difficulty'] }) {
    if (s.name !== undefined) slot.name = String(s.name).slice(0, 18) || slot.name;
    if (s.civ !== undefined) slot.civ = String(s.civ);
    if (s.difficulty !== undefined) slot.difficulty = s.difficulty;
    // Un color solo lo tiene un jugador
    if (s.color !== undefined && s.color >= 0 && s.color < PLAYER_COLORS.length && !this.lobby!.slots.some(x => x !== slot && x.color === s.color)) slot.color = s.color;
  }

  private freeColor() {
    const used = new Set(this.lobby?.slots.map(s => s.color));
    return Math.max(0, PLAYER_COLORS.findIndex((_, i) => !used.has(i)));
  }

  private broadcastLobby() {
    if (!this.lobby) return;
    this.t.send({ k: 'lobby', lobby: this.lobby });
    this.emit('lobby', this.lobby);
  }

  /** Anfitrión: empieza la partida. */
  async start(): Promise<void> {
    const l = this.lobby;
    if (!this.isHost || !l || l.started) return;
    l.started = true;
    try { await this.createAndSend(l); } catch (err) {
      console.error(err);
      l.started = false;
      this.emit('info', 'No se pudo crear la partida');
    }
  }

  private async createAndSend(l: LobbyState) {
    const reg = this.o.registry(l.settings.mods);
    const civIds = [...reg.civs.keys()];
    const players = l.slots.map(s => {
      const civ = s.civ === 'random' || !reg.civs.has(s.civ) ? civIds[Math.floor(Math.random() * civIds.length)] : s.civ;
      const name = s.kind === 'ai' ? `IA (${reg.civs.get(civ)?.name ?? civ})` : s.name;
      return { name, civ, color: PLAYER_COLORS[s.color], human: s.kind === 'human', difficulty: s.difficulty };
    });
    const opts: GameOptions = { ...l.settings, players, seed: Math.floor(Math.random() * 1e9), online: true };
    await this.o.prepareMap?.(reg, opts.mapType);
    const fresh = new Game(reg, opts);
    const save = snapshot(fresh);
    const assign: Record<string, number> = {};
    l.slots.forEach((s, i) => { if (s.kind === 'human' && s.clientId) assign[s.clientId] = i + 1; });
    for (const c of this.clients.values()) c.pid = assign[c.clientId];
    const msg: NetMessage = { k: 'start', save: await pack(JSON.stringify(save)), assign, delay: delayTicks(NB.delayStartMs, opts.speed), content: contentHash(reg) };
    this.broadcastLobby();
    this.t.send(msg);
    await this.handleStart(msg);
  }

  // ------------------------------------------------------------ mensajes

  private onJoin(peerId: string) {
    if (this.isHost) {
      // El invitado se presenta con 'hello'; la sala ya la puede ver
      if (this.lobby) this.t.send({ k: 'lobby', lobby: this.lobby }, peerId);
    } else {
      this.t.send({ k: 'hello', clientId: this.o.clientId, name: this.o.name, proto: NET_PROTOCOL, build: this.o.build }, peerId);
    }
  }

  private onLeave(peerId: string) {
    if (this.isHost) {
      const id = this.byPeer.get(peerId);
      this.byPeer.delete(peerId);
      const c = id ? this.clients.get(id) : undefined;
      if (!c || c.peerId !== peerId) return;
      c.connected = false;
      c.peerId = null;
      if (this.lobby && !this.lobby.started) {
        // En la sala: se libera su puesto
        this.lobby.slots = this.lobby.slots.filter(s => s.clientId !== c.clientId);
        this.clients.delete(c.clientId);
        this.broadcastLobby();
      } else this.emit('info', `${c.name} se ha desconectado`);
    } else if (peerId === this.hostPeer) {
      this.hostPeer = null;
      this.lastHostMsg = Math.min(this.lastHostMsg, this.now() - NB.hostLost + 3000);
    }
  }

  private onMessage(msg: NetMessage, from: string) {
    if (this.ended) return;
    // Mientras se carga la partida, los turnos esperan (llegan en orden después de ella)
    if (this.loading && (msg.k === 'turn' || msg.k === 'drop' || msg.k === 'add' || msg.k === 'delay')) { this.inbox.push({ msg, from }); return; }
    if (this.isHost) this.hostMessage(msg, from);
    else this.guestMessage(msg, from);
  }

  private hostMessage(msg: NetMessage, from: string) {
    const id = this.byPeer.get(from);
    const c = id ? this.clients.get(id) : undefined;
    switch (msg.k) {
      case 'hello': return this.hello(msg, from);
      case 'ping':
        this.t.send({ k: 'pong', t: msg.t }, from);
        if (c && msg.w !== undefined) { c.waited = (c.waited ?? 0) + msg.w; c.waitedMax = Math.max(c.waitedMax ?? 0, msg.wm ?? 0); }
        return;
      case 'pong': if (c) this.measure(c, this.now() - msg.t); return;
      case 'pick': {
        const slot = this.lobby?.slots.find(s => s.clientId === id);
        if (slot && !this.lobby!.started) { this.applyPick(slot, msg); this.broadcastLobby(); }
        return;
      }
      case 'turn': {
        if (!c || c.pid === undefined || msg.t.from !== c.pid || !this.peer || c.dropped) return;
        this.peer.receive(msg.t);
        // Se retransmite a los demás, sin su huella: la de referencia es la del anfitrión
        const others = this.othersThan(from);
        this.toGame({ k: 'turn', t: { from: msg.t.from, tick: msg.t.tick, cmds: msg.t.cmds } }, others);
        return;
      }
      case 'away': if (c) { c.away = msg.on; this.calmUntil = this.now() + NB.delayCalm; this.emit('info', msg.on ? `${c.name} ha salido de la app` : `${c.name} ha vuelto`); } return;
      case 'resync': if (c && c.pid !== undefined) void this.sendSnap(c); return;
      case 'bye': if (c) { c.connected = false; if (c.pid !== undefined && !c.dropped && this.peer) this.dropPlayer(c); } return;
    }
  }

  private hello(msg: Extract<NetMessage, { k: 'hello' }>, from: string) {
    if (msg.proto !== NET_PROTOCOL || msg.build !== this.o.build) {
      this.t.send({ k: 'refuse', reason: 'Tenéis versiones distintas del juego: recargad la página (o actualizad la app) los dos' }, from);
      return;
    }
    const l = this.lobby!;
    let c = this.clients.get(msg.clientId);
    if (l.started) {
      // Partida empezada: solo vuelven los que ya jugaban
      if (!c || c.pid === undefined) { this.t.send({ k: 'refuse', reason: 'La partida ya ha empezado' }, from); return; }
      if (c.peerId && c.peerId !== from) this.byPeer.delete(c.peerId);
      c.peerId = from; c.connected = true; c.away = false;
      this.byPeer.set(from, c.clientId);
      this.emit('info', `${c.name} ha vuelto a conectar`);
      void this.sendSnap(c);
      return;
    }
    if (!c) {
      if (l.slots.length >= NB.maxPlayers) { this.t.send({ k: 'refuse', reason: 'La sala está llena' }, from); return; }
      c = { clientId: msg.clientId, peerId: from, name: msg.name, away: false, connected: true, dropped: false };
      this.clients.set(c.clientId, c);
      l.slots.push({ kind: 'human', clientId: c.clientId, name: msg.name.slice(0, 18) || 'Jugador', civ: 'random', color: this.freeColor(), difficulty: 'normal', connected: true });
    } else { c.peerId = from; c.connected = true; }
    this.byPeer.set(from, c.clientId);
    this.broadcastLobby();
  }

  private guestMessage(msg: NetMessage, from: string) {
    if (this.hostPeer && from !== this.hostPeer && msg.k !== 'lobby') return;
    if (from === this.hostPeer || msg.k === 'lobby') { this.lastHostMsg = this.now(); this.hostLostSent = false; }
    switch (msg.k) {
      case 'lobby':
        // Quien manda la sala es el anfitrión
        if (msg.lobby.hostId === this.o.clientId) return;
        this.hostPeer = from;
        this.lastHostMsg = this.now();
        this.lobby = msg.lobby;
        this.emit('lobby', msg.lobby);
        return;
      case 'refuse': this.ended = true; this.emit('refused', msg.reason); return;
      case 'start': this.hostPeer ??= from; void this.handleStart(msg); return;
      case 'ping': this.t.send({ k: 'pong', t: msg.t }, from); return;
      case 'pong': this.rtt = this.ewma(this.rtt, this.now() - msg.t); return;
      case 'turn': this.peer?.receive(msg.t); return;
      case 'drop':
        this.peer?.drop(msg.pid, msg.last);
        if (msg.pid === this.pid) {
          // Pide volver en el próximo fotograma (si está en segundo plano o congelado, no avanza:
          // pedirlo ya haría que lo esperasen otra vez)
          this.droppedSelf = true;
          this.emit('info', 'La IA juega por ti mientras vuelves');
        }
        return;
      case 'add': this.peer?.add(msg.pid, msg.from); return;
      case 'delay': this.peer?.setDelay(msg.d); return;
      case 'snap': this.hostPeer ??= from; void this.handleSnap(msg); return;
      case 'status': this.status = msg.players; this.emit('status', msg.players); return;
      case 'away':
        this.hostAway = msg.on;
        this.emit('info', msg.on ? 'El anfitrión ha salido de la app: la partida sigue cuando vuelva' : 'El anfitrión ha vuelto');
        return;
    }
  }

  // ------------------------------------------------------------ partida

  private async handleStart(msg: Extract<NetMessage, { k: 'start' }>) {
    if (this.game) return;
    this.loading = true;
    try {
      const save: SaveData = JSON.parse(await unpack(msg.save));
      const reg = this.reg = this.o.registry(save.opts.mods);
      if (contentHash(reg) !== msg.content) {
        this.ended = true;
        this.t.send({ k: 'bye' });
        this.emit('refused', 'El contenido del juego no coincide con el del anfitrión: recargad la página los dos');
        return;
      }
      const pid = msg.assign[this.o.clientId];
      const game = new Game(reg, save.opts, save);
      this.pid = pid ?? 0;
      game.humanId = this.pid || game.humanId;
      const humans = game.players.filter(p => p.isHuman).map(p => p.id);
      this.attach(game, new LockstepPeer(game, this.pid, humans, this.peerOpts(msg.delay)));
      this.emit('game', { game, resync: false });
    } finally {
      this.loading = false;
      this.flushInbox();
    }
  }

  private peerOpts(delay: number, prefill = true) {
    return {
      delay, hashEvery: NB.hashEvery, prefill, onHash: this.o.onHash,
      // Las órdenes propias ya se confirmaron (sonido) al darlas
      onApply: (pid: number, phase: 'before' | 'after') => { this.applyingOwn = phase === 'before' && pid === this.pid; },
    };
  }

  private attach(game: Game, peer: LockstepPeer) {
    this.game = game;
    this.peer = peer;
    this.acc = 0;
    this.droppedSelf = false;
    this.resyncAsked = false;
    game.events.filter = (evt, p) => !(this.applyingOwn && evt === 'orderIssued' && p.playerId === this.pid);
  }

  private flushInbox() {
    const q = this.inbox;
    this.inbox = [];
    for (const { msg, from } of q) this.onMessage(msg, from);
  }

  /** Anfitrión: manda la partida de este momento a quien vuelve o se ha desincronizado. */
  private async sendSnap(c: ClientInfo) {
    const peer = this.peer, game = this.game;
    if (!peer || !game || c.pid === undefined || !c.peerId) return;
    const pid = c.pid;
    // Deja de jugar donde lo dejó y vuelve unos ticks más adelante (lo mismo para todos)
    if (peer.active(pid)) {
      const last = peer.lastTurnOf(pid);
      peer.drop(pid, last);
      this.toGame({ k: 'drop', pid, last }, this.othersThan(c.peerId));
    }
    const until = Math.max(0, ...peer.membership().filter(m => m.pid === pid).map(m => m.until));
    const from = Math.max(game.tick + peer.delay, until) + 3;
    peer.add(pid, from);
    this.calmUntil = this.now() + NB.delayCalm;
    this.toGame({ k: 'add', pid, from }, this.othersThan(c.peerId));
    c.dropped = false;
    if (game.players[pid].data.aiControl) peer.issue({ t: 'ai', pid, on: false });
    // La partida y los turnos ya conocidos, del mismo instante; se comprime después
    const save = JSON.stringify(snapshot(game)), pending = peer.pendingTurns(), membership = peer.membership();
    const delay = peer.delay, to = c.peerId;
    // Lo que se le mande mientras se comprime espera y va justo detrás de la partida
    this.holding.set(to, this.holding.get(to) ?? []);
    const packed = await pack(save);
    this.t.send({ k: 'snap', save: packed, membership, pending, pid, delay }, to);
    const held = this.holding.get(to) ?? [];
    this.holding.delete(to);
    for (const m of held) this.t.send(m, to);
  }

  private othersThan(peerId: string): string[] { return this.t.peers().filter(p => p !== peerId && this.byPeer.has(p)); }

  /** Pares de los clientes que están en la partida (han saludado). */
  private gamePeers(): string[] { return this.t.peers().filter(p => this.byPeer.has(p)); }

  /** Anfitrión: mensaje de la partida (turnos, quién juega...); a quien espera su partida se le guarda. */
  private toGame(msg: NetMessage, to: string[]) {
    const now: string[] = [];
    for (const p of to) {
      const held = this.holding.get(p);
      if (held) held.push(msg); else now.push(p);
    }
    if (now.length) this.t.send(msg, now);
  }

  private async handleSnap(msg: Extract<NetMessage, { k: 'snap' }>) {
    this.loading = true;
    try {
      const save: SaveData = JSON.parse(await unpack(msg.save));
      const reg = this.reg ?? this.o.registry(save.opts.mods);
      this.reg = reg;
      const game = new Game(reg, save.opts, save);
      this.pid = msg.pid;
      game.humanId = msg.pid;
      const peer = new LockstepPeer(game, msg.pid, msg.membership, this.peerOpts(msg.delay, false));
      for (const t of msg.pending) peer.receive(t);
      this.attach(game, peer);
      this.emit('game', { game, resync: true });
    } finally {
      this.loading = false;
      this.flushInbox();
    }
  }

  private askResync(reason: string) {
    if (this.resyncAsked || !this.hostPeer) return;
    this.resyncAsked = true;
    this.t.send({ k: 'resync', reason }, this.hostPeer);
  }

  /** Anfitrión: el jugador ya no juega después de su último turno; la IA toma el mando. */
  private dropPlayer(c: ClientInfo) {
    this.calmUntil = this.now() + NB.delayCalm;
    const peer = this.peer!, pid = c.pid!;
    const last = peer.lastTurnOf(pid);
    peer.drop(pid, last);
    c.dropped = true;
    this.toGame({ k: 'drop', pid, last }, this.gamePeers());
    peer.issue({ t: 'ai', pid, on: true });
    this.waitStart.delete(pid);
  }

  // ------------------------------------------------------------ órdenes

  send(cmd: NetCommand): null {
    const g = this.game, peer = this.peer;
    if (!g || !peer || this.droppedSelf) return null;
    // La confirmación (sonido) se da ya, aunque la orden se ejecute unos ticks después
    const pr = predictOrder(g, this.pid, cmd);
    if (pr) g.events.emit('orderIssued', { playerId: this.pid, kind: pr.kind, at: pr.at });
    peer.issue(cmd);
    return null;
  }

  // ------------------------------------------------------------ bucle

  /** Avanza la partida: tantos ticks como toquen por el reloj, si están los turnos de todos. */
  frame(dt: number) {
    const now = this.now();
    this.housekeeping(now);
    const g = this.game, peer = this.peer;
    if (!g || !peer || this.loading || this.ended) return;
    this.acc += dt * (g.opts.speed || 1);
    const t0 = now;
    let steps = 0;
    while (this.acc >= TICK_DT || (steps < 2000 && this.behind())) {
      if (!peer.ready()) break;
      peer.step();
      this.acc = Math.max(0, this.acc - TICK_DT);
      steps++;
      this.flushTurns();
      if (peer.desync) this.onDesync(peer.desync.from, peer.desync.tick);
      if (this.now() - t0 > NB.catchUpBudget) break;
    }
    if (this.acc >= TICK_DT && !peer.ready()) {
      // Faltan turnos: el reloj se para (no se acumula retraso que luego haya que recuperar).
      // Se anota cuánto, para que el anfitrión suba el retardo si hace falta
      this.acc = TICK_DT;
      if (!this.waitSince) this.waitSince = now;
      this.waitingMs = now - this.waitSince;
      this.waited += dt * 1000;
      this.waitedMax = Math.max(this.waitedMax, this.waitingMs + dt * 1000);
    } else { this.waitSince = 0; this.waitingMs = 0; }
  }

  /** Fracción del tick en curso, para que el dibujo interpole entre ticks. */
  get alpha() { return Math.min(1, this.acc / TICK_DT); }

  /** ¿Hay turnos de sobra (los demás van por delante)? Entonces se ejecutan sin esperar al reloj. */
  private behind(): boolean {
    const p = this.peer!;
    return p.readyAhead(p.delay + 4) > p.delay + 2;
  }

  /**
   * Las huellas no coinciden. El invitado pide la partida del anfitrión, que es la de referencia
   * (el anfitrión solo lo anota: el invitado también lo ve, con la huella del anfitrión).
   */
  private onDesync(from: number, tick: number) {
    const peer = this.peer!;
    peer.clearDesync();
    this.desyncs++;
    if (!this.isHost) {
      if (this.resyncAsked) return;
      this.emit('info', `⚠ Desincronización en el tick ${tick}: se vuelve a cargar la partida del anfitrión`);
      this.askResync('desincronización');
      return;
    }
    const name = this.game?.players[from]?.name ?? `Jugador ${from}`;
    this.emit('info', `⚠ ${name} se ha desincronizado en el tick ${tick}: va a recibir la partida`);
  }

  private flushTurns() {
    const peer = this.peer!;
    for (const t of peer.endTurn()) {
      if (this.isHost) {
        this.toGame({ k: 'turn', t }, this.gamePeers());
      } else if (this.hostPeer) this.t.send({ k: 'turn', t }, this.hostPeer);
    }
  }

  /** Para la interfaz: nombres de los jugadores a los que se espera. */
  waitingNames(): string[] {
    const g = this.game, p = this.peer;
    if (!g || !p || !this.waitingMs) return [];
    return p.waitingFor().map(pid => g.players[pid]?.name ?? `Jugador ${pid}`);
  }

  private lastFrameAt = 0;

  private housekeeping(now: number) {
    // Si este dispositivo ha estado parado (congelado, dormido), las esperas cuentan desde ahora
    if (this.lastFrameAt && now - this.lastFrameAt > 2000) {
      this.lastHostMsg = Math.max(this.lastHostMsg, now);
      this.waitStart.clear();
    }
    this.lastFrameAt = now;
    if (this.droppedSelf && !this.away && !this.loading) this.askResync('vuelta');
    if (now - this.lastPing >= NB.pingEvery) {
      this.lastPing = now;
      if (this.isHost) {
        const to = this.t.peers().filter(p => this.byPeer.has(p));
        if (to.length) this.t.send({ k: 'ping', t: now }, to);
      } else if (this.hostPeer) {
        this.t.send({ k: 'ping', t: now, w: Math.round(this.waited), wm: Math.round(this.waitedMax) }, this.hostPeer);
        this.waited = 0; this.waitedMax = 0;
      }
    }
    if (this.isHost) this.hostHousekeeping(now);
    else if (!this.hostLostSent && !this.away && (this.lobby || this.game) && now - this.lastHostMsg > (this.hostAway ? NB.hostAwayLost : NB.hostLost)) {
      this.hostLostSent = true;
      this.emit('hostLost', undefined);
    }
  }

  private hostHousekeeping(now: number) {
    const peer = this.peer, game = this.game;
    if (!peer || !game) return;
    // ¿A quién se espera, y desde cuándo? Pasado el plazo, la IA juega por él
    const waiting = new Set(this.waitingMs > 0 ? peer.waitingFor() : []);
    for (const pid of [...this.waitStart.keys()]) if (!waiting.has(pid)) this.waitStart.delete(pid);
    for (const pid of waiting) {
      if (pid === this.pid) continue;
      const since = this.waitStart.get(pid) ?? now;
      this.waitStart.set(pid, since);
      const c = [...this.clients.values()].find(x => x.pid === pid);
      const limit = !c || !c.connected || c.away ? NB.dropAway : NB.dropSilent;
      if (c && now - since > limit) this.dropPlayer(c);
    }
    // Retardo de entrada: sube enseguida (por latencia o porque alguien ha esperado) y baja despacio.
    // Se recalcula también al cambiar la velocidad (un tick dura menos)
    const speed = game.opts.speed || 1;
    if (now - this.lastDelay >= NB.delayEvery || speed !== this.delaySpeed) {
      const span = Math.max(1, now - this.lastDelay);
      this.lastDelay = now;
      this.delaySpeed = speed;
      const tickMs = TICK_DT * 1000 / speed;
      const guests = [...this.clients.values()].filter(c => c.pid !== undefined && c.clientId !== this.o.clientId && c.connected && !c.dropped && c.rtt !== undefined);
      const worst = guests.reduce((m, c) => Math.max(m, c.rtt! / 2 + NB.jitterFactor * (c.rttDev ?? 0)), 0);
      this.rtt = guests.length ? Math.max(...guests.map(c => c.rtt!)) : null;
      // Con 3 o más humanos, el turno de un invitado pasa por el anfitrión hasta otro invitado
      const hops = guests.length >= 2 ? 2 : 1;
      // Esperas de verdad (picos que el ping medio no ve): las propias y las que cuentan los invitados
      const waited = Math.max(this.waited, ...guests.map(c => c.waited ?? 0)) / span;
      const waitedMax = Math.max(this.waitedMax, ...guests.map(c => c.waitedMax ?? 0));
      this.waited = 0; this.waitedMax = 0;
      for (const c of guests) { c.waited = 0; c.waitedMax = 0; }
      this.waitShare = waited;
      const max = Math.max(NB.delayMin, Math.ceil(NB.delayMaxMs / tickMs));
      let want = Math.ceil((worst * hops + NB.delayMargin) / tickMs);
      // Solo cuentan las esperas cortas (variación de la red): las largas son cortes o alguien que
      // se ha ido, y no se arreglan con más retardo
      const jitterWait = waitedMax <= NB.waitIsJitter && now >= this.calmUntil;
      if (jitterWait && waited > NB.waitRaise) want = Math.max(want, peer.delay + Math.max(1, Math.ceil(waitedMax / tickMs)));
      want = Math.min(max, Math.max(NB.delayMin, want));
      let d = peer.delay;
      if (want > d) { d = want; this.lowerVotes = 0; } else if (want < d && waited <= NB.waitLowerOk) {
        // Si sobra mucho, baja de dos en dos
        if (++this.lowerVotes >= NB.delayLowerAfter) { d = Math.max(want, d - (d - want >= 3 ? 2 : 1)); this.lowerVotes = 0; }
      } else this.lowerVotes = 0;
      if (d !== peer.delay) {
        peer.setDelay(d);
        this.toGame({ k: 'delay', d }, this.gamePeers());
      }
    }
    if (now - this.lastStatus >= 1000) {
      this.lastStatus = now;
      this.status = game.players.filter(p => p.isHuman).map(p => {
        const c = [...this.clients.values()].find(x => x.pid === p.id);
        const state: PlayerStatus['state'] = !c ? 'gone' : c.dropped ? (p.data.aiControl ? 'ai' : 'gone') : !c.connected ? 'gone' : c.away ? 'away' : 'ok';
        return { pid: p.id, name: p.name, rtt: c?.clientId === this.o.clientId ? 0 : c?.rtt !== undefined ? Math.round(c.rtt) : undefined, state };
      });
      this.toGame({ k: 'status', players: this.status }, this.gamePeers());
      this.emit('status', this.status);
    }
  }

  private ewma(prev: number | null, v: number) { return prev === null ? v : prev * 0.8 + v * 0.2; }

  private measure(c: ClientInfo, rtt: number) {
    if (c.rtt === undefined) { c.rtt = rtt; c.rttDev = rtt / 4; return; }
    c.rttDev = (c.rttDev ?? 0) * 0.75 + Math.abs(rtt - c.rtt) * 0.25;
    c.rtt = c.rtt * 0.8 + rtt * 0.2;
  }

  // ------------------------------------------------------------ ciclo de vida

  /** La app pasa a segundo plano (o vuelve). */
  setAway(away: boolean) {
    if (this.away === away) return;
    this.away = away;
    // El anfitrión avisa a todos: la partida se para hasta que vuelva (no se le puede sustituir)
    if (this.isHost) { if (this.game) this.toGame({ k: 'away', on: away }, this.gamePeers()); return; }
    if (this.hostPeer) this.t.send({ k: 'away', on: away }, this.hostPeer);
    if (!away) this.lastHostMsg = this.now();
  }

  /** Invitado: vuelve a pedir la partida (p. ej. tras perder la conexión con el anfitrión). */
  retry() {
    this.hostLostSent = false;
    this.resyncAsked = false;
    this.lastHostMsg = this.now();
    for (const p of this.t.peers()) this.onJoin(p);
  }

  /** Se va de la partida o de la sala. */
  leave() {
    if (this.ended) return;
    this.ended = true;
    try { this.t.send({ k: 'bye' }); } catch { /* ya cerrado */ }
    this.t.close();
    if (this.game) this.game.events.filter = null;
  }

  /** Id único para mensajes de prueba y depuración. */
  static nextId() { return ++idCounter; }
}
