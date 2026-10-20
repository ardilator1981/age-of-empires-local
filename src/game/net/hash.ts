import type { Game } from '../Game';
import { PLAYER_FIELDS } from '../save';

/**
 * Huella (hash de 32 bits) de todo el estado de la simulación, para detectar si dos copias
 * de la misma partida se han desincronizado.
 *
 * Recorre lo mismo que guarda `save.ts` (entidades con todos sus campos, jugadores, proyectiles,
 * restos, relojes, generador aleatorio, `game.data` y el estado de los sistemas), más la niebla
 * de este instante. Los números con decimales entran con sus 64 bits exactos: una diferencia en
 * el último bit cambia la huella. No incluye el mapa (no cambia durante la partida) ni nada del
 * render o la interfaz.
 */

const f64 = new Float64Array(1);
const u32 = new Uint32Array(f64.buffer);
const keyHashes = new Map<string, number>();

export class Hasher {
  h = 0x811c9dc5;

  word(w: number) {
    // Mezcla tipo murmur: barata y suficiente para detectar diferencias (no es criptográfica)
    let k = Math.imul(w | 0, 0xcc9e2d51);
    k = (k << 15) | (k >>> 17);
    this.h = Math.imul(this.h ^ Math.imul(k, 0x1b873593), 5) + 0xe6546b64 | 0;
  }

  num(n: number) {
    if (Number.isInteger(n) && n >= -0x80000000 && n <= 0x7fffffff) { this.word(1); this.word(n); return; }
    if (Number.isNaN(n)) { this.word(2); return; }
    f64[0] = n;
    this.word(3); this.word(u32[0]); this.word(u32[1]);
  }

  str(s: string) {
    this.word(4); this.word(s.length);
    for (let i = 0; i < s.length; i++) this.word(s.charCodeAt(i));
  }

  /** Nombre de campo: su huella se calcula una vez (los nombres se repiten en cada entidad). */
  key(k: string) {
    let kh = keyHashes.get(k);
    if (kh === undefined) {
      const t = new Hasher();
      t.str(k);
      kh = t.h;
      if (keyHashes.size < 4096) keyHashes.set(k, kh);
    }
    this.word(kh);
  }

  value(v: unknown) {
    if (v === null || v === undefined) { this.word(5); return; }
    switch (typeof v) {
      case 'number': this.num(v); return;
      case 'string': this.str(v); return;
      case 'boolean': this.word(v ? 7 : 6); return;
      case 'function': return;
    }
    if (ArrayBuffer.isView(v)) {
      // Arrays tipados (niebla, relieve...): sus bytes, de 4 en 4
      this.word(8); this.word(v.byteLength);
      if (v.byteOffset % 4 === 0 && v.byteLength % 4 === 0) {
        const w = new Int32Array(v.buffer, v.byteOffset, v.byteLength / 4);
        for (let i = 0; i < w.length; i++) this.word(w[i]);
      } else {
        const b = new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
        for (let i = 0; i < b.length; i++) this.word(b[i]);
      }
      return;
    }
    if (Array.isArray(v)) {
      this.word(9); this.word(v.length);
      for (const x of v) this.value(x);
      return;
    }
    if (v instanceof Map) {
      this.word(10); this.word(v.size);
      for (const [k, x] of v) { this.value(k); this.value(x); }
      return;
    }
    if (v instanceof Set) {
      this.word(11); this.word(v.size);
      for (const x of v) this.value(x);
      return;
    }
    const o = v as Record<string, unknown>;
    this.word(12);
    for (const k of Object.keys(o)) {
      if (o[k] === undefined || typeof o[k] === 'function') continue;
      this.key(k); this.value(o[k]);
    }
  }
}

/** Huella del estado de la partida en este tick. */
export function stateHash(game: Game): number {
  const h = new Hasher();
  h.num(game.tick); h.num(game.time); h.num(game.rngState); h.num(game.nextEntityId); h.value(game.over);
  for (const p of game.players) {
    h.num(p.id);
    for (const k of PLAYER_FIELDS) h.value((p as any)[k]);
    h.value(p.visible);
  }
  // Las muertas de este tick salen de la lista al acabar el tick (y no se guardan)
  for (const e of game.list) if (!e.dead) h.value(e);
  h.value(game.projectiles);
  h.value(game.decals);
  h.value(game.data);
  game.systems.forEach((s, i) => { h.str(game.systemIds[i]); h.value(s.save?.()); });
  return h.h >>> 0;
}
