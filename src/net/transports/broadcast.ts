import type { NetMessage, Transport } from '../protocol';

/**
 * Pestañas del mismo navegador (BroadcastChannel). No sirve para jugar con nadie, pero sí para
 * probar todo el multijugador en un ordenador, sin red. Cada pestaña se presenta al entrar y
 * manda un latido cada segundo; si deja de latir (pestaña cerrada), los demás lo dan por ido.
 */

type Packet =
  | { t: 'hi'; from: string }
  | { t: 'ack'; from: string; to: string }
  | { t: 'beat'; from: string }
  | { t: 'bye'; from: string }
  | { t: 'msg'; from: string; to?: string[]; data: NetMessage };

const BEAT = 1000, TIMEOUT = 3500;

export class TabTransport implements Transport {
  readonly selfId = Math.random().toString(36).slice(2, 10);
  onMessage: (msg: NetMessage, from: string) => void = () => {};
  onPeerJoin: (peerId: string) => void = () => {};
  onPeerLeave: (peerId: string) => void = () => {};
  private ch: BroadcastChannel;
  private seen = new Map<string, number>();
  private timer: ReturnType<typeof setInterval>;

  constructor(room: string) {
    this.ch = new BroadcastChannel(`aoe-net-${room}`);
    this.ch.onmessage = e => this.receive(e.data as Packet);
    this.post({ t: 'hi', from: this.selfId });
    this.timer = setInterval(() => {
      this.post({ t: 'beat', from: this.selfId });
      const now = Date.now();
      for (const [id, at] of this.seen) if (now - at > TIMEOUT) this.gone(id);
    }, BEAT);
    // Al cerrar la pestaña, se despide
    addEventListener('pagehide', this.bye);
  }

  private bye = () => this.post({ t: 'bye', from: this.selfId });

  private post(p: Packet) { try { this.ch.postMessage(p); } catch { /* canal cerrado */ } }

  private receive(p: Packet) {
    if (p.from === this.selfId) return;
    const known = this.seen.has(p.from);
    if (p.t === 'bye') { this.gone(p.from); return; }
    if (p.t === 'ack' && p.to !== this.selfId) return;
    this.seen.set(p.from, Date.now());
    if (!known) {
      if (p.t === 'hi') this.post({ t: 'ack', from: this.selfId, to: p.from });
      this.onPeerJoin(p.from);
    }
    if (p.t === 'msg' && (!p.to || p.to.includes(this.selfId))) this.onMessage(p.data, p.from);
  }

  private gone(id: string) {
    if (!this.seen.delete(id)) return;
    this.onPeerLeave(id);
  }

  send(msg: NetMessage, to?: string | string[]) {
    this.post({ t: 'msg', from: this.selfId, to: to === undefined ? undefined : Array.isArray(to) ? to : [to], data: msg });
  }

  peers() { return [...this.seen.keys()]; }

  close() {
    this.bye();
    clearInterval(this.timer);
    removeEventListener('pagehide', this.bye);
    this.ch.close();
  }
}
