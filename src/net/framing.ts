import type { NetMessage } from './protocol';

/**
 * Trozos numerados para los transportes por WebRTC. Un canal de datos acepta mensajes de tamaño
 * limitado, y Trystero manda los grandes por otro camino (pueden llegar después que uno pequeño
 * enviado más tarde). La partida necesita orden estricto (la partida guardada antes que los turnos
 * que la siguen), así que cada mensaje se parte en trozos pequeños con número de secuencia y se
 * recomponen en orden al recibir.
 */

/** Trozo: número de mensaje, número de trozo, total de trozos y texto. */
export interface Frame { s: number; i: number; n: number; d: string }

const CHUNK = 12_000;

export class Framer {
  private seq = 0;
  encode(msg: NetMessage): Frame[] {
    const text = JSON.stringify(msg), s = this.seq++, n = Math.max(1, Math.ceil(text.length / CHUNK));
    return Array.from({ length: n }, (_, i) => ({ s, i, n, d: text.slice(i * CHUNK, (i + 1) * CHUNK) }));
  }
}

export class Deframer {
  private next = 0;
  private parts = new Map<number, string[]>();
  private done = new Map<number, NetMessage>();

  /** Añade un trozo; devuelve los mensajes que ya se pueden entregar, en orden. */
  push(f: Frame): NetMessage[] {
    if (f.s < this.next) return [];
    const p = this.parts.get(f.s) ?? new Array<string>(f.n);
    p[f.i] = f.d;
    this.parts.set(f.s, p);
    let complete = true;
    for (let i = 0; i < f.n; i++) if (p[i] === undefined) { complete = false; break; }
    if (complete) {
      this.parts.delete(f.s);
      this.done.set(f.s, JSON.parse(p.join('')));
    }
    const out: NetMessage[] = [];
    while (this.done.has(this.next)) { out.push(this.done.get(this.next)!); this.done.delete(this.next++); }
    return out;
  }
}

export const isFrame = (x: unknown): x is Frame =>
  !!x && typeof x === 'object' && typeof (x as Frame).s === 'number' && typeof (x as Frame).d === 'string';
