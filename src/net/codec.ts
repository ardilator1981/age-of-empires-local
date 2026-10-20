import type { Registry } from '../core/Registry';
import { Hasher } from '../game/net/hash';
import type { Packed } from './protocol';

/** Comprime un texto con gzip y lo pasa a base64 (si el navegador no sabe, va tal cual). */
export async function pack(text: string): Promise<Packed> {
  if (typeof CompressionStream === 'undefined') return { z: false, d: text };
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  return { z: true, d: toB64(bytes) };
}

export async function unpack(p: Packed): Promise<string> {
  if (!p.z) return p.d;
  const stream = new Blob([fromB64(p.d) as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

export function toB64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export function fromB64(b64: string): Uint8Array {
  const s = atob(b64), out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/**
 * Huella del contenido del juego (unidades, edificios, tecnologías, civilizaciones, edades,
 * mapas y victorias con sus números). Dos clientes con versiones distintas del juego o de los
 * mods tienen huellas distintas, y la partida no empieza.
 */
export function contentHash(reg: Registry): number {
  const h = new Hasher();
  const defs = (m: Map<string, unknown>) => JSON.stringify([...m.values()]);
  h.str(defs(reg.units)); h.str(defs(reg.buildings)); h.str(defs(reg.techs)); h.str(defs(reg.civs));
  h.str(defs(reg.resources)); h.str(defs(reg.resourceNodes)); h.str(JSON.stringify(reg.ages));
  h.str([...reg.mapTypes.keys(), ...reg.victories.keys(), ...reg.systems.map(s => s.id), ...reg.netCommands.keys()].join(','));
  return h.h >>> 0;
}
