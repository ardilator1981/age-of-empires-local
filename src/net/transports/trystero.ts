import type { Room, TurnServerConfig } from '@trystero-p2p/core';
import { selfId } from '@trystero-p2p/core';
import { Deframer, Framer, isFrame, type Frame } from '../framing';
import type { NetMessage, Transport } from '../protocol';

/**
 * WebRTC entre pares con Trystero: se encuentran a través de redes públicas y gratuitas (relés de
 * Nostr, rastreadores de BitTorrent o brókeres MQTT), sin servidor propio. Después, los datos van
 * directos entre los navegadores y cifrados; la señalización va cifrada con el código de la sala.
 *
 * Varias estrategias de respaldo: el anfitrión espera en todas a la vez; el invitado prueba la
 * primera y, si en unos segundos no encuentra a nadie, añade la siguiente.
 */

export type Strategy = 'nostr' | 'torrent' | 'mqtt';
export const STRATEGIES: [Strategy, string][] = [['nostr', 'Nostr'], ['torrent', 'BitTorrent'], ['mqtt', 'MQTT']];

const loaders: Record<Strategy, () => Promise<{ joinRoom: (cfg: any, room: string, cb?: any) => Room }>> = {
  nostr: () => import('@trystero-p2p/nostr'),
  torrent: () => import('@trystero-p2p/torrent'),
  mqtt: () => import('@trystero-p2p/mqtt'),
};

const APP_ID = 'aoe-local-multijugador-v1';
/** Segundos sin encontrar a nadie antes de probar la siguiente estrategia. */
const ESCALATE_MS = 8000;

export interface TrysteroOptions {
  host: boolean;
  /** Orden en que se prueban (el anfitrión usa todas). */
  strategies: Strategy[];
  /** TURN opcional (para redes que no dejan conectar directamente). */
  turn?: TurnServerConfig[];
  /** Mensajes de estado para la interfaz ("Buscando por Nostr..."). */
  onState?: (text: string) => void;
}

interface Joined { strategy: Strategy; room: Room; send: (f: Frame, target?: string[] | string) => Promise<void> }

export class TrysteroTransport implements Transport {
  readonly selfId = selfId;
  onMessage: (msg: NetMessage, from: string) => void = () => {};
  onPeerJoin: (peerId: string) => void = () => {};
  onPeerLeave: (peerId: string) => void = () => {};
  private rooms: Joined[] = [];
  /** Por qué sala se habla con cada par (la primera por la que llegó). */
  private route = new Map<string, Joined>();
  private framers = new Map<string, Framer>();
  private deframers = new Map<string, Deframer>();
  private closed = false;
  private escalate: ReturnType<typeof setTimeout> | null = null;

  constructor(private code: string, private o: TrysteroOptions) {
    const list = o.host ? o.strategies : o.strategies.slice(0, 1);
    for (const s of list) void this.join(s);
    if (!o.host) this.scheduleEscalate(1);
  }

  private scheduleEscalate(i: number) {
    if (i >= this.o.strategies.length) return;
    this.escalate = setTimeout(() => {
      if (this.closed || this.route.size) return;
      this.o.onState?.(`Probando también por ${STRATEGIES.find(s => s[0] === this.o.strategies[i])?.[1]}…`);
      void this.join(this.o.strategies[i]);
      this.scheduleEscalate(i + 1);
    }, ESCALATE_MS);
  }

  private async join(strategy: Strategy) {
    try {
      const { joinRoom } = await loaders[strategy]();
      if (this.closed) return;
      const room = joinRoom({ appId: APP_ID, password: this.code, turnConfig: this.o.turn?.length ? this.o.turn : undefined }, this.code, {
        onJoinError: (e: { error: string }) => this.o.onState?.(`No se pudo conectar (${e.error})`),
      });
      const action = room.makeAction<any>('m');
      const joined: Joined = { strategy, room, send: (f, target) => action.send(f as any, { target: target ?? null }) };
      action.onMessage = (data: unknown, ctx: { peerId: string }) => {
        if (this.route.get(ctx.peerId) !== joined || !isFrame(data)) return;
        let d = this.deframers.get(ctx.peerId);
        if (!d) this.deframers.set(ctx.peerId, d = new Deframer());
        for (const m of d.push(data)) this.onMessage(m, ctx.peerId);
      };
      room.onPeerJoin = id => {
        if (this.route.has(id)) return;
        this.route.set(id, joined);
        this.framers.set(id, new Framer());
        this.deframers.set(id, new Deframer());
        this.o.onState?.(`Conectado por ${STRATEGIES.find(s => s[0] === strategy)?.[1]}`);
        this.onPeerJoin(id);
      };
      room.onPeerLeave = id => {
        if (this.route.get(id) !== joined) return;
        this.route.delete(id);
        this.framers.delete(id);
        this.deframers.delete(id);
        this.onPeerLeave(id);
      };
      this.rooms.push(joined);
    } catch (err) {
      console.warn('[red] Trystero', strategy, err);
      this.o.onState?.(`No se pudo usar ${strategy}`);
    }
  }

  send(msg: NetMessage, to?: string | string[]) {
    const list = to === undefined ? [...this.route.keys()] : Array.isArray(to) ? to : [to];
    for (const id of list) {
      const r = this.route.get(id), f = this.framers.get(id);
      if (!r || !f) continue;
      for (const frame of f.encode(msg)) r.send(frame, id).catch(err => console.warn('[red] envío', err));
    }
  }

  peers() { return [...this.route.keys()]; }

  /** Ida y vuelta medida por Trystero con un par (ms). */
  ping(id: string): Promise<number> | null { return this.route.get(id)?.room.ping(id) ?? null; }

  close() {
    this.closed = true;
    if (this.escalate) clearTimeout(this.escalate);
    for (const r of this.rooms) void r.room.leave();
    this.rooms = [];
    this.route.clear();
  }
}
