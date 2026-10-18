import type { TerrainDef } from '../core/types';

/**
 * Texturas procedurales de terreno (256x256, repetibles sin costuras).
 * Cada TerrainDef elige una con `pattern`; un mod puede añadir las suyas con
 * `terrainPatterns.set('lava', (t, ctx) => ...)`.
 *
 * Las texturas están en coordenadas de mundo: la dirección "arriba en pantalla"
 * es (-1, -1) y la luz viene de -x (arriba a la izquierda), como en AoE2.
 */

export const TEX = 256;

export interface PatternCtx {
  /** Ruido de valor periódico: u, v en [0,1), `period` celdas por textura. */
  noise(u: number, v: number, period: number): number;
  /** Ruido fractal periódico. */
  fbm(u: number, v: number, period: number, octaves: number): number;
  rnd(): number;
  set(x: number, y: number, c: number[], a?: number): void;
  get(x: number, y: number): number[];
}

export type PatternFn = (t: TerrainDef, p: PatternCtx, out: Uint8ClampedArray) => void;

type RGB = number[];
const mix = (a: RGB, b: RGB, k: number): RGB => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const mul = (a: RGB, k: number): RGB => [a[0] * k, a[1] * k, a[2] * k];
const sstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

function makeCtx(seed: number, out: Uint8ClampedArray): PatternCtx {
  const hash = (x: number, y: number, p: number) => {
    x = ((x % p) + p) % p; y = ((y % p) + p) % p;
    let h = (x * 374761393 + y * 668265263 + seed * 982451653) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const noise = (u: number, v: number, p: number) => {
    const x = u * p, y = v * p;
    const ix = Math.floor(x), iy = Math.floor(y);
    let fx = x - ix, fy = y - iy;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    const a = hash(ix, iy, p), b = hash(ix + 1, iy, p), c = hash(ix, iy + 1, p), d = hash(ix + 1, iy + 1, p);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
  const fbm = (u: number, v: number, p: number, oct: number) => {
    let s = 0, t = 0, a = 1;
    for (let i = 0; i < oct; i++) { s += a * noise(u, v, p); t += a; a *= 0.5; p *= 2; }
    return s / t;
  };
  let r = seed * 9301 + 49297;
  const rnd = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
  const idx = (x: number, y: number) => ((((y % TEX) + TEX) % TEX) * TEX + (((x % TEX) + TEX) % TEX)) * 4;
  return {
    noise, fbm, rnd,
    set(x, y, c, a = 1) {
      const i = idx(Math.round(x), Math.round(y));
      out[i] = out[i] + (c[0] - out[i]) * a;
      out[i + 1] = out[i + 1] + (c[1] - out[i + 1]) * a;
      out[i + 2] = out[i + 2] + (c[2] - out[i + 2]) * a;
      out[i + 3] = 255;
    },
    get(x, y) { const i = idx(Math.round(x), Math.round(y)); return [out[i], out[i + 1], out[i + 2]]; },
  };
}

/** Rellena cada píxel con fn(u, v). */
function fill(p: PatternCtx, fn: (u: number, v: number) => RGB) {
  for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
    const c = fn(x / TEX, y / TEX);
    const g = (p.rnd() - 0.5) * 10;
    p.set(x, y, [c[0] + g, c[1] + g, c[2] + g * 0.7]);
  }
}

/** Trazo corto (briznas, grietas...). */
function stroke(p: PatternCtx, x: number, y: number, dx: number, dy: number, len: number, color: RGB, a: number) {
  for (let i = 0; i < len; i++) p.set(x + dx * i, y + dy * i, color, a * (1 - i / (len * 1.4)));
}

/** Piedrecita con luz por arriba-izquierda y sombra abajo-derecha. */
function pebble(p: PatternCtx, x: number, y: number, r: number, color: RGB) {
  for (let dy = -r - 1; dy <= r + 1; dy++) for (let dx = -r - 1; dx <= r + 1; dx++) {
    const d = Math.hypot(dx, dy);
    if (d <= r) {
      const lit = (-dx - dy) / (r * 1.6);
      p.set(x + dx, y + dy, mul(color, 1 + lit * 0.35), 0.95);
    } else if (d <= r + 1.2 && dx + dy > 0) {
      p.set(x + dx, y + dy, [40, 30, 20], 0.35);
    }
  }
}

export const terrainPatterns = new Map<string, PatternFn>();

terrainPatterns.set('grass', (_t, p) => {
  const dark: RGB = [74, 98, 34], mid: RGB = [116, 134, 52], light: RGB = [158, 150, 76], dry: RGB = [176, 150, 88];
  fill(p, (u, v) => {
    const n = p.fbm(u, v, 8, 5), m = p.fbm(u + 0.37, v + 0.11, 4, 3), d = p.fbm(u + 0.7, v + 0.4, 4, 4);
    let c = mix(dark, mid, sstep(0.25, 0.7, n));
    c = mix(c, light, sstep(0.55, 0.8, m) * 0.6);
    c = mix(c, dry, sstep(0.6, 0.78, d) * 0.65);
    return c;
  });
  for (let i = 0; i < 5200; i++) {
    const x = p.rnd() * TEX, y = p.rnd() * TEX;
    const c = p.get(x, y);
    const dark = p.rnd() < 0.55;
    const j = (p.rnd() - 0.5) * 0.6;
    stroke(p, x, y, -0.7 + j, -0.7 - j, 2 + p.rnd() * 3, mul(c, dark ? 0.72 : 1.22), 0.8);
  }
  for (let i = 0; i < 70; i++) {
    const c: RGB = p.rnd() < 0.5 ? [236, 222, 120] : [240, 240, 230];
    p.set(p.rnd() * TEX, p.rnd() * TEX, c, 0.75);
  }
});

terrainPatterns.set('dirt', (_t, p) => {
  const c1: RGB = [136, 96, 56], c2: RGB = [172, 128, 80], c3: RGB = [198, 160, 108];
  fill(p, (u, v) => {
    const n = p.fbm(u, v, 8, 5), m = p.fbm(u + 0.5, v + 0.2, 16, 3);
    return mix(mix(c1, c2, sstep(0.2, 0.75, n)), c3, sstep(0.6, 0.85, m) * 0.5);
  });
  for (let i = 0; i < 260; i++) pebble(p, p.rnd() * TEX, p.rnd() * TEX, 0.8 + p.rnd() * 1.6, mix([150, 136, 112], [196, 178, 146], p.rnd()));
});

terrainPatterns.set('forest', (_t, p) => {
  const c1: RGB = [40, 56, 24], c2: RGB = [70, 82, 34];
  fill(p, (u, v) => mix(c1, c2, sstep(0.2, 0.8, p.fbm(u, v, 8, 5))));
  const leaves: RGB[] = [[122, 86, 38], [96, 70, 32], [140, 110, 46], [52, 70, 28], [84, 96, 40]];
  for (let i = 0; i < 2400; i++) {
    const x = p.rnd() * TEX, y = p.rnd() * TEX, c = leaves[Math.floor(p.rnd() * leaves.length)];
    p.set(x, y, c, 0.85); p.set(x + 1, y, c, 0.6);
  }
});

terrainPatterns.set('sand', (_t, p) => {
  const c1: RGB = [198, 174, 120], c2: RGB = [228, 208, 156];
  fill(p, (u, v) => {
    const n = p.fbm(u, v, 8, 4);
    const rip = Math.sin((u - v) * Math.PI * 2 * 14 + p.fbm(u, v, 4, 3) * 9) * 0.5 + 0.5;
    return mul(mix(c1, c2, sstep(0.2, 0.8, n)), 0.95 + rip * 0.08);
  });
});

terrainPatterns.set('desert', (_t, p) => {
  const c1: RGB = [186, 146, 86], c2: RGB = [222, 186, 120];
  fill(p, (u, v) => mix(c1, c2, sstep(0.2, 0.8, p.fbm(u, v, 8, 5))));
  for (let k = 0; k < 18; k++) {
    let x = p.rnd() * TEX, y = p.rnd() * TEX, a = p.rnd() * Math.PI * 2;
    for (let i = 0; i < 30; i++) { p.set(x, y, [130, 96, 56], 0.45); a += (p.rnd() - 0.5) * 0.9; x += Math.cos(a); y += Math.sin(a); }
  }
});

terrainPatterns.set('water', (_t, p) => {
  const c1: RGB = [30, 74, 128], c2: RGB = [50, 106, 160];
  fill(p, (u, v) => {
    const n = p.fbm(u, v, 4, 5);
    const streak = Math.sin((u - v) * Math.PI * 2 * 10 + p.fbm(u, v, 8, 2) * 8) * 0.5 + 0.5;
    return mul(mix(c1, c2, sstep(0.2, 0.8, n)), 0.94 + streak * 0.1);
  });
});

terrainPatterns.set('shallows', (_t, p) => {
  const c1: RGB = [70, 126, 136], c2: RGB = [104, 156, 152], sand: RGB = [170, 166, 122];
  fill(p, (u, v) => {
    const n = p.fbm(u, v, 8, 4), s = p.fbm(u + 0.3, v, 4, 4);
    return mix(mix(c1, c2, n), sand, sstep(0.55, 0.8, s) * 0.55);
  });
});

terrainPatterns.set('snow', (_t, p) => {
  const shadow: RGB = [180, 194, 214], white: RGB = [242, 246, 250], mid: RGB = [222, 230, 240];
  fill(p, (u, v) => {
    const n = p.fbm(u, v, 8, 5), m = p.fbm(u + 0.2, v + 0.6, 4, 3);
    return mix(mix(shadow, mid, sstep(0.25, 0.6, n)), white, sstep(0.55, 0.85, m));
  });
  for (let i = 0; i < 300; i++) p.set(p.rnd() * TEX, p.rnd() * TEX, [255, 255, 255], 0.9);
});

terrainPatterns.set('rock', (_t, p) => {
  const c1: RGB = [84, 78, 72], c2: RGB = [134, 128, 118], c3: RGB = [160, 154, 142];
  fill(p, (u, v) => {
    const n = p.fbm(u, v, 8, 5);
    const strata = Math.sin((u + v) * Math.PI * 2 * 6 + p.fbm(u, v, 4, 3) * 10) * 0.5 + 0.5;
    return mix(mix(c1, c2, sstep(0.25, 0.75, n)), c3, strata * 0.25);
  });
  for (let k = 0; k < 40; k++) {
    let x = p.rnd() * TEX, y = p.rnd() * TEX, a = p.rnd() * Math.PI * 2;
    for (let i = 0; i < 26; i++) {
      p.set(x, y, [44, 40, 36], 0.6);
      p.set(x - 1, y - 1, [176, 170, 160], 0.3);
      a += (p.rnd() - 0.5) * 1.1; x += Math.cos(a); y += Math.sin(a);
    }
  }
});

/** Textura genérica a partir del color del terreno. */
const generic: PatternFn = (t, p) => {
  const c = t.color, v = t.variance / 100;
  fill(p, (u, w) => mul(c, 1 + (p.fbm(u, w, 8, 5) - 0.5) * v * 2));
};

/** Genera la textura de detalle de un terreno (RGBA 256x256). */
export function buildPattern(t: TerrainDef, seed: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(TEX * TEX * 4);
  const p = makeCtx(seed, out);
  (terrainPatterns.get(t.pattern ?? '') ?? generic)(t, p, out);
  return out;
}

/** Color medio de una textura (para el minimapa). */
export function averageColor(data: Uint8ClampedArray): [number, number, number] {
  let r = 0, g = 0, b = 0;
  const n = data.length / 4;
  for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2]; }
  return [r / n, g / n, b / n];
}

/** Ruido repetible de 256x256 (un canal) para bordes irregulares y reflejos. */
export function buildNoise(seed: number): Uint8Array {
  const tmp = new Uint8ClampedArray(TEX * TEX * 4);
  const p = makeCtx(seed, tmp);
  const out = new Uint8Array(TEX * TEX);
  for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) out[y * TEX + x] = Math.round(p.fbm(x / TEX, y / TEX, 8, 4) * 255);
  return out;
}
