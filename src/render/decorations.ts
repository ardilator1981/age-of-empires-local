import { prop } from './art/props';
import type { Game } from '../game/Game';
import { SpriteCache, ellipse, seeded } from './draw';

/**
 * Decoración del suelo (solo visual, no afecta a la simulación): matas de
 * hierba, flores, arbustos, piedrecitas, helechos, juncos... Es lo que da al
 * terreno el aspecto "orgánico" de AoE2. Se genera de forma determinista a
 * partir del terreno de cada casilla.
 */

export interface Deco {
  x: number;
  y: number;
  /** Coordenadas isométricas sin altura (para descartar rápido las que no se ven). */
  ix: number;
  iy: number;
  kind: string;
  v: number;
  tile: number;
}

/** Qué decoraciones pueden aparecer en cada tipo de textura y con qué probabilidad por casilla. */
const BY_PATTERN: Record<string, [string, number][]> = {
  grass: [['tuft', 0.55], ['dryTuft', 0.3], ['flowers', 0.12], ['shrub', 0.06], ['pebbles', 0.05]],
  dirt: [['pebbles', 0.3], ['dryTuft', 0.18], ['tuft', 0.06]],
  forest: [['fern', 0.45], ['tuft', 0.25], ['shrub', 0.08], ['pebbles', 0.06]],
  sand: [['reeds', 0.1], ['pebbles', 0.08], ['dryTuft', 0.06]],
  desert: [['dryShrub', 0.1], ['pebbles', 0.12], ['dryTuft', 0.1]],
  snow: [['snowRock', 0.06]],
  rock: [['snowRock', 0.12]],
};

/** Todas las decoraciones posibles (para la lista de arte pendiente, npm run art-todo). */
export const DECORATION_KINDS: string[] = [...new Set([...Object.values(BY_PATTERN).flat().map(([k]) => k), 'reeds'])];

function hash(x: number, y: number, k: number): number {
  let h = (x * 374761393 + y * 668265263 + k * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function generateDecorations(game: Game): Deco[] {
  const m = game.map, reg = game.reg;
  const out: Deco[] = [];
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const t = reg.terrains[m.terrain[y * m.w + x]];
    const list = BY_PATTERN[t.pattern ?? ''];
    if (!list) continue;
    // Junto al agua, juncos
    let nearWater = false;
    if (t.walkable) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (m.inBounds(nx, ny) && reg.terrains[m.terrain[ny * m.w + nx]].water) nearWater = true;
      }
    }
    let k = 0;
    for (const [kind, p] of nearWater ? [['reeds', 0.6] as [string, number], ...list] : list) {
      // Zonas con más vegetación y zonas más peladas
      const patch = 0.55 + 0.9 * hash(Math.floor(x / 5), Math.floor(y / 5), 99);
      if (hash(x, y, k++) > p * patch) continue;
      const px = x + 0.15 + hash(x, y, k + 10) * 0.7, py = y + 0.15 + hash(x, y, k + 20) * 0.7;
      out.push({ x: px, y: py, ix: (px - py) * 32, iy: (px + py) * 16, kind, v: Math.floor(hash(x, y, k + 30) * 4), tile: y * m.w + x });
    }
  }
  return out;
}

const cache = new SpriteCache();
const DARK = 'rgba(22,14,6,0.55)';

function blade(c: CanvasRenderingContext2D, x: number, y: number, h: number, lean: number, color: string) {
  c.strokeStyle = color; c.lineWidth = 1; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + lean * 0.4, y - h * 0.6, x + lean, y - h); c.stroke();
}

const PAINTERS: Record<string, [number, number, number, number, (c: CanvasRenderingContext2D, rnd: () => number) => void]> = {
  // [ancho, alto, anclaX, anclaY, dibujo]
  tuft: [22, 14, 11, 12, (c, rnd) => {
    c.fillStyle = 'rgba(0,0,0,0.18)'; ellipse(c, 2, 0, 7, 2); c.fill();
    const cols = ['#4f7a24', '#62902c', '#7da23a', '#3e6a1e'];
    for (let i = 0; i < 11; i++) blade(c, (rnd() - 0.5) * 9, 0, 5 + rnd() * 6, (rnd() - 0.5) * 7, cols[i % 4]);
  }],
  dryTuft: [22, 14, 11, 12, (c, rnd) => {
    c.fillStyle = 'rgba(0,0,0,0.15)'; ellipse(c, 2, 0, 7, 2); c.fill();
    const cols = ['#a89848', '#bca85a', '#8a7a38', '#c8b46a'];
    for (let i = 0; i < 10; i++) blade(c, (rnd() - 0.5) * 9, 0, 4 + rnd() * 6, (rnd() - 0.5) * 8, cols[i % 4]);
  }],
  flowers: [22, 14, 11, 12, (c, rnd) => {
    for (let i = 0; i < 6; i++) blade(c, (rnd() - 0.5) * 9, 0, 3 + rnd() * 5, (rnd() - 0.5) * 5, '#4f7a24');
    const petal = ['#f2e05a', '#f4f0f0', '#d880c8', '#e86a4a'][Math.floor(rnd() * 4)];
    for (let i = 0; i < 5; i++) {
      const x = (rnd() - 0.5) * 12, y = -2 - rnd() * 7;
      c.fillStyle = petal; ellipse(c, x, y, 1.3, 1.1); c.fill();
      c.fillStyle = '#c89a20'; ellipse(c, x, y, 0.4, 0.4); c.fill();
    }
  }],
  shrub: [30, 22, 15, 19, (c, rnd) => {
    c.fillStyle = 'rgba(0,0,0,0.25)'; ellipse(c, 4, 0, 11, 3.5); c.fill();
    const blobs: [number, number, number][] = [[-4, -5, 5], [4, -5, 5], [0, -9, 6], [-1, -4, 5]];
    c.fillStyle = '#1e3a14';
    for (const [x, y, r] of blobs) { ellipse(c, x, y, r + 0.8, r * 0.8 + 0.8); c.fill(); }
    blobs.forEach(([x, y, r], i) => { c.fillStyle = ['#355f22', '#3d6c26', '#4a7c2c', '#2f5620'][i]; ellipse(c, x, y, r, r * 0.8); c.fill(); });
    for (let i = 0; i < 14; i++) {
      c.fillStyle = rnd() < 0.5 ? 'rgba(160,200,100,0.45)' : 'rgba(20,40,10,0.4)';
      ellipse(c, (rnd() - 0.5) * 14, -3 - rnd() * 10, 1.2, 1); c.fill();
    }
  }],
  dryShrub: [28, 18, 14, 16, (c, rnd) => {
    c.fillStyle = 'rgba(0,0,0,0.2)'; ellipse(c, 3, 0, 9, 3); c.fill();
    c.strokeStyle = '#6a5228'; c.lineWidth = 0.9;
    for (let i = 0; i < 14; i++) {
      const a = -Math.PI / 2 + (rnd() - 0.5) * 2.2, l = 4 + rnd() * 7;
      c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * l, Math.sin(a) * l * 0.9); c.stroke();
    }
  }],
  pebbles: [22, 12, 11, 9, (c, rnd) => {
    for (let i = 0; i < 4; i++) {
      const x = (rnd() - 0.5) * 12, y = (rnd() - 0.5) * 4, r = 1.2 + rnd() * 1.8;
      c.fillStyle = 'rgba(0,0,0,0.25)'; ellipse(c, x + 0.8, y + 0.6, r, r * 0.6); c.fill();
      c.fillStyle = ['#a39888', '#8c8274', '#b8ad9a'][i % 3]; ellipse(c, x, y, r, r * 0.65); c.fill();
      c.strokeStyle = DARK; c.lineWidth = 0.5; c.stroke();
      c.fillStyle = 'rgba(255,255,240,0.35)'; ellipse(c, x - r * 0.3, y - r * 0.25, r * 0.35, r * 0.2); c.fill();
    }
  }],
  fern: [26, 16, 13, 13, (c, rnd) => {
    c.fillStyle = 'rgba(0,0,0,0.2)'; ellipse(c, 2, 0, 8, 2.4); c.fill();
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.42 + (rnd() - 0.5) * 0.2, l = 7 + rnd() * 4;
      const ex = Math.cos(a) * l, ey = Math.sin(a) * l * 0.8;
      c.strokeStyle = '#3a6420'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(ex * 0.5, ey * 0.8, ex, ey); c.stroke();
      for (let k = 1; k < 5; k++) {
        const px = ex * (k / 5), py = ey * (k / 5);
        c.strokeStyle = k % 2 ? '#4f8028' : '#5f9230';
        c.beginPath(); c.moveTo(px, py); c.lineTo(px + 2, py - 1.5); c.moveTo(px, py); c.lineTo(px - 2, py - 1.5); c.stroke();
      }
    }
  }],
  reeds: [20, 20, 10, 18, (c, rnd) => {
    for (let i = 0; i < 9; i++) blade(c, (rnd() - 0.5) * 8, 0, 9 + rnd() * 7, (rnd() - 0.5) * 4, i % 2 ? '#6a8a3a' : '#7c9a44');
    for (let i = 0; i < 3; i++) {
      const x = (rnd() - 0.5) * 6;
      c.fillStyle = '#6a4424'; ellipse(c, x, -12 - rnd() * 3, 1, 2.4); c.fill();
    }
  }],
  snowRock: [24, 16, 12, 12, (c, rnd) => {
    c.fillStyle = 'rgba(0,0,0,0.22)'; ellipse(c, 2, 0, 8, 2.6); c.fill();
    for (let i = 0; i < 2; i++) {
      const x = (rnd() - 0.5) * 8, r = 3 + rnd() * 2.5;
      c.fillStyle = '#7a746c'; ellipse(c, x, -r * 0.4, r, r * 0.7); c.fill();
      c.strokeStyle = DARK; c.lineWidth = 0.6; c.stroke();
      c.fillStyle = '#f2f6fa'; ellipse(c, x - 0.5, -r * 0.8, r * 0.75, r * 0.3); c.fill();
    }
  }],
};

export function drawDecoration(ctx: CanvasRenderingContext2D, d: Deco, sx: number, sy: number, z: number) {
  // Con imagen (public/sprites/decorations/deco-<tipo>.json) se dibuja ella; si no, el dibujo por código
  const art = prop('decorations', `deco-${d.kind}`);
  if (art && art.drawFrame(ctx, d.v, sx, sy, z)) return;
  const p = PAINTERS[d.kind];
  if (!p) return;
  const [w, h, ax, ay, paint] = p;
  cache.draw(ctx, `${d.kind}${d.v}`, w, h, ax, ay, sx, sy, z, c => paint(c, seeded(d.v * 17 + d.kind.length * 3 + 1)));
}
