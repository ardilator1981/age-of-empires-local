import type { Turn, Membership } from '../game/net/lockstep';

/**
 * Mensajes entre clientes de una partida en red. Todos son datos simples (JSON) y viajan por un
 * canal fiable y ordenado (ver `Transport`). El anfitrión manda: lleva la sala, decide quién
 * juega y retransmite los turnos de todos (los invitados solo hablan con él).
 */

/** Sube si cambian los mensajes de forma incompatible. */
export const NET_PROTOCOL = 1;

export type Difficulty = 'easy' | 'normal' | 'hard';

/** Opciones de la partida que elige el anfitrión (las mismas que el menú). */
export interface LobbySettings {
  mapType: string;
  mapSize: number;
  startingResources: 'low' | 'standard' | 'high';
  startAge: number;
  victory: string;
  visibility: 'normal' | 'explored' | 'revealed';
  popLimit: number;
  speed: number;
  mods: string[];
  warPrepMinutes?: number;
}

/** Un puesto de la sala: un jugador humano (anfitrión o invitado) o uno de la IA. */
export interface LobbySlot {
  kind: 'human' | 'ai';
  /** Identificador del cliente que ocupa el puesto (humanos). */
  clientId?: string;
  name: string;
  /** Civilización o 'random'. */
  civ: string;
  /** Índice en PLAYER_COLORS. */
  color: number;
  difficulty: Difficulty;
  connected?: boolean;
}

export interface LobbyState {
  settings: LobbySettings;
  slots: LobbySlot[];
  /** clientId del anfitrión. */
  hostId: string;
  /** Código de la sala (para invitar). */
  code: string;
  started: boolean;
}

/** Datos grandes (la partida guardada): comprimidos con gzip y en base64 si se puede. */
export interface Packed { z: boolean; d: string }

/** Estado de cada jugador en la partida, para la interfaz (lo manda el anfitrión). */
export interface PlayerStatus {
  pid: number;
  name: string;
  /** Ida y vuelta con el anfitrión, en ms. */
  rtt?: number;
  state: 'ok' | 'away' | 'gone' | 'ai';
}

export type NetMessage =
  /** Invitado → anfitrión, al conectar (también al reconectar). */
  | { k: 'hello'; clientId: string; name: string; proto: number; build: string }
  /** Anfitrión → invitado: no puede entrar. */
  | { k: 'refuse'; reason: string }
  /** Anfitrión → todos: cómo está la sala. */
  | { k: 'lobby'; lobby: LobbyState }
  /** Invitado → anfitrión: su nombre, civilización o color. */
  | { k: 'pick'; name?: string; civ?: string; color?: number }
  /** Anfitrión → todos: empieza la partida, con su partida guardada y qué jugador es cada uno. */
  | { k: 'start'; save: Packed; assign: Record<string, number>; delay: number; content: number }
  /**
   * Un turno: del invitado al anfitrión, y del anfitrión a todos (los retransmitidos, y el suyo, que
   * cierra el tick: con `forced`, los jugadores cuyo turno no llegó a tiempo y queda vacío).
   */
  | { k: 'turn'; t: Turn; forced?: number[] }
  /** Anfitrión → todos: el jugador deja de jugar después del tick `last` (la IA juega por él). */
  | { k: 'drop'; pid: number; last: number }
  /** Anfitrión → todos: el jugador vuelve a jugar desde el tick `from`. */
  | { k: 'add'; pid: number; from: number }
  /** Anfitrión → todos: retardo de entrada (ticks) según la latencia medida. */
  | { k: 'delay'; d: number }
  /** `w`: ms que ha esperado turnos desde el último ping, y `wm` la espera más larga (para el retardo). */
  | { k: 'ping'; t: number; w?: number; wm?: number }
  | { k: 'pong'; t: number }
  /** Invitado → anfitrión: ha pasado a segundo plano (o ha vuelto). */
  | { k: 'away'; on: boolean }
  /** Invitado → anfitrión: necesita la partida (reconexión o desincronización). */
  | { k: 'resync'; reason: string }
  /** Anfitrión → invitado: la partida en este tick, quién juega y los turnos ya conocidos. */
  | { k: 'snap'; save: Packed; membership: Membership[]; pending: Turn[]; pid: number; delay: number }
  /** Anfitrión → todos: quién está y con qué latencia. */
  | { k: 'status'; players: PlayerStatus[] }
  /** Se va a propósito. */
  | { k: 'bye' };

/**
 * Canal entre clientes: fiable y ordenado entre cada par. Lo implementan las pestañas
 * (BroadcastChannel), Trystero (WebRTC con señalización pública) y el código o QR (WebRTC sin
 * intermediarios).
 */
export interface Transport {
  readonly selfId: string;
  /** Envía a un par, a varios o, sin `to`, a todos. */
  send(msg: NetMessage, to?: string | string[]): void;
  onMessage: (msg: NetMessage, from: string) => void;
  onPeerJoin: (peerId: string) => void;
  onPeerLeave: (peerId: string) => void;
  /** Pares conectados ahora. */
  peers(): string[];
  /** Cómo va la conexión con un par (WebRTC): directa o por el TURN. */
  connectionKind?(peerId: string): Promise<'directa' | 'turn' | null>;
  close(): void;
}
