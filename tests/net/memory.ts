/**
 * Transporte en memoria para probar `NetGame` sin red: canal fiable y ordenado entre cada par,
 * con latencia, y un reloj que avanza a mano (`hub.advance`).
 */
import type { NetMessage, Transport } from '../../src/net/protocol';

interface Packet { at: number; from: string; to: string; json: string }

export class MemoryHub {
  now = 0;
  /** Latencia de ida en ms, y variación máxima añadida a cada mensaje. */
  latency = 20;
  jitter = 0;
  /** Picos (wifi, internet): con esta probabilidad un mensaje tarda `spikeMs` más (y los de detrás esperan). */
  spikeChance = 0;
  spikeMs = 0;
  private rnd = 1;
  bytes = 0;
  private nodes = new Map<string, MemoryTransport>();
  private queue: Packet[] = [];
  private linkLast = new Map<string, number>();

  join(id: string): MemoryTransport {
    const t = new MemoryTransport(this, id);
    const others = [...this.nodes.values()];
    this.nodes.set(id, t);
    for (const other of others) other.onPeerJoin(id);
    return t;
  }

  /** Se va (o se corta la conexión): los demás reciben onPeerLeave. */
  leave(id: string) {
    if (!this.nodes.delete(id)) return;
    this.queue = this.queue.filter(p => p.to !== id && p.from !== id);
    for (const other of this.nodes.values()) other.onPeerLeave(id);
  }

  peersOf(id: string) { return [...this.nodes.keys()].filter(k => k !== id); }

  enqueue(from: string, to: string, msg: NetMessage) {
    if (!this.nodes.has(to)) return;
    const json = JSON.stringify(msg);
    this.bytes += json.length;
    const key = `${from}>${to}`;
    // Variación determinista (para que las mediciones se puedan repetir)
    this.rnd = (this.rnd * 16807) % 2147483647;
    let at = this.now + this.latency + (this.rnd / 2147483647) * this.jitter;
    this.rnd = (this.rnd * 16807) % 2147483647;
    if (this.rnd / 2147483647 < this.spikeChance) at += this.spikeMs;
    at = Math.max(this.linkLast.get(key) ?? 0, at);
    this.linkLast.set(key, at);
    this.queue.push({ at, from, to, json });
  }

  /** Avanza el reloj y entrega lo que haya llegado. */
  advance(ms: number) {
    this.now += ms;
    this.queue.sort((a, b) => a.at - b.at);
    while (this.queue.length && this.queue[0].at <= this.now) {
      const p = this.queue.shift()!;
      this.nodes.get(p.to)?.onMessage(JSON.parse(p.json), p.from);
    }
  }
}

export class MemoryTransport implements Transport {
  onMessage: (msg: NetMessage, from: string) => void = () => {};
  onPeerJoin: (peerId: string) => void = () => {};
  onPeerLeave: (peerId: string) => void = () => {};
  constructor(private hub: MemoryHub, readonly selfId: string) {}
  send(msg: NetMessage, to?: string | string[]) {
    const list = to === undefined ? this.hub.peersOf(this.selfId) : Array.isArray(to) ? to : [to];
    for (const t of list) this.hub.enqueue(this.selfId, t, msg);
  }
  peers() { return this.hub.peersOf(this.selfId); }
  close() { this.hub.leave(this.selfId); }
}
