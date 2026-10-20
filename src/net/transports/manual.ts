import { fromB64, toB64 } from '../codec';
import { Deframer, Framer, isFrame } from '../framing';
import type { NetMessage, Transport } from '../protocol';

/**
 * WebRTC sin intermediarios: los dos navegadores se pasan a mano (copiar y pegar, o un QR) la
 * descripción de la conexión. No hay señalización de nadie; solo los STUN públicos y gratuitos
 * para averiguar la dirección de cada uno (en la misma wifi ni eso hace falta) y, si se configura,
 * un TURN para las redes que no dejan conectar directamente.
 *
 * Es una estrella: el anfitrión crea una invitación por cada jugador (`ManualHost.invite`) y cada
 * invitado responde con su código (`joinManual`).
 */

export const STUN: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
];

/** Espera a tener todas las direcciones posibles (sin señalización no se pueden mandar después). */
function gathered(pc: RTCPeerConnection, ms = 3000): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise(res => {
    const t = setTimeout(res, ms);
    pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); res(); } });
  });
}

/** Código corto y copiable de una descripción de conexión: comprimida y en base64 para URL. */
export async function encodeSignal(kind: 'o' | 'a', sdp: string): Promise<string> {
  const text = JSON.stringify({ k: kind, s: sdp });
  if (typeof CompressionStream === 'undefined') return 'R' + b64url(new TextEncoder().encode(text));
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return 'Z' + b64url(new Uint8Array(await new Response(stream).arrayBuffer()));
}

export async function decodeSignal(code: string): Promise<{ k: 'o' | 'a'; s: string }> {
  const c = code.trim().replace(/^.*[#&?](unirse|respuesta)=/, '').replace(/\s+/g, '');
  const bytes = fromB64(c.slice(1).replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((c.length - 1 + 3) % 4));
  let text: string;
  if (c[0] === 'Z') text = await new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
  else if (c[0] === 'R') text = new TextDecoder().decode(bytes);
  else throw new Error('Código no válido');
  const v = JSON.parse(text);
  if ((v.k !== 'o' && v.k !== 'a') || typeof v.s !== 'string') throw new Error('Código no válido');
  return v;
}

const b64url = (b: Uint8Array) => toB64(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** Una conexión con un par por un canal de datos ordenado, con trozos numerados. */
class Link {
  framer = new Framer();
  deframer = new Deframer();
  channel: RTCDataChannel | null = null;
  constructor(readonly id: string, readonly pc: RTCPeerConnection) {}
}

abstract class ManualBase implements Transport {
  abstract readonly selfId: string;
  onMessage: (msg: NetMessage, from: string) => void = () => {};
  onPeerJoin: (peerId: string) => void = () => {};
  onPeerLeave: (peerId: string) => void = () => {};
  protected links = new Map<string, Link>();

  protected wire(link: Link, ch: RTCDataChannel) {
    link.channel = ch;
    ch.onopen = () => this.onPeerJoin(link.id);
    // En algunos navegadores el canal llega ya abierto
    if (ch.readyState === 'open') queueMicrotask(() => this.onPeerJoin(link.id));
    ch.onclose = () => { if (this.links.delete(link.id)) this.onPeerLeave(link.id); };
    ch.onmessage = e => {
      let f: unknown;
      try { f = JSON.parse(e.data); } catch { return; }
      if (!isFrame(f)) return;
      for (const m of link.deframer.push(f)) this.onMessage(m, link.id);
    };
    link.pc.onconnectionstatechange = () => {
      if (link.pc.connectionState === 'failed' || link.pc.connectionState === 'closed') ch.close();
    };
  }

  send(msg: NetMessage, to?: string | string[]) {
    const list = to === undefined ? [...this.links.keys()] : Array.isArray(to) ? to : [to];
    for (const id of list) {
      const l = this.links.get(id);
      if (!l?.channel || l.channel.readyState !== 'open') continue;
      for (const f of l.framer.encode(msg)) l.channel.send(JSON.stringify(f));
    }
  }

  peers() { return [...this.links.values()].filter(l => l.channel?.readyState === 'open').map(l => l.id); }

  close() {
    for (const l of this.links.values()) { l.channel?.close(); l.pc.close(); }
    this.links.clear();
  }
}

/** Anfitrión: una invitación (código) por jugador. */
export class ManualHost extends ManualBase {
  readonly selfId = 'anfitrion';
  private n = 0;
  constructor(private ice: RTCIceServer[]) { super(); }

  /** Crea una invitación. `accept` recibe el código de respuesta del invitado. */
  async invite(): Promise<{ code: string; accept: (answer: string) => Promise<void>; cancel: () => void }> {
    const pc = new RTCPeerConnection({ iceServers: this.ice });
    const link = new Link(`jugador-${++this.n}`, pc);
    this.links.set(link.id, link);
    this.wire(link, pc.createDataChannel('aoe', { ordered: true }));
    await pc.setLocalDescription(await pc.createOffer());
    await gathered(pc);
    const code = await encodeSignal('o', pc.localDescription!.sdp);
    return {
      code,
      accept: async answer => {
        const a = await decodeSignal(answer);
        if (a.k !== 'a') throw new Error('Ese código es una invitación, no una respuesta');
        await pc.setRemoteDescription({ type: 'answer', sdp: a.s });
      },
      cancel: () => { if (link.channel?.readyState !== 'open') { pc.close(); this.links.delete(link.id); } },
    };
  }
}

/** Invitado: con el código del anfitrión crea la respuesta, que hay que devolverle. */
export async function joinManual(offer: string, ice: RTCIceServer[]): Promise<{ transport: Transport; answer: string }> {
  const o = await decodeSignal(offer);
  if (o.k !== 'o') throw new Error('Ese código es una respuesta: pide al anfitrión su invitación');
  const t = new ManualGuest();
  const pc = new RTCPeerConnection({ iceServers: ice });
  const link = new Link('anfitrion', pc);
  t.add(link);
  pc.ondatachannel = e => t.attach(link, e.channel);
  await pc.setRemoteDescription({ type: 'offer', sdp: o.s });
  await pc.setLocalDescription(await pc.createAnswer());
  await gathered(pc);
  return { transport: t, answer: await encodeSignal('a', pc.localDescription!.sdp) };
}

class ManualGuest extends ManualBase {
  readonly selfId = Math.random().toString(36).slice(2, 10);
  add(link: Link) { this.links.set(link.id, link); }
  attach(link: Link, ch: RTCDataChannel) { this.wire(link, ch); }
}
