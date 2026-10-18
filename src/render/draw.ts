import type { Pt } from '../core/types';

/** Utilidades de dibujo compartidas por los sprites. */

export function hexToRgb(hex: string): [number, number, number] {
  if (hex.startsWith('rgb')) {
    const [r, g, b] = hex.replace(/[^\d,.]/g, '').split(',').map(Number);
    return [r, g, b];
  }
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Aclara (f > 0) u oscurece (f < 0) un color. */
export function shade(hex: string, f: number): string {
  const [r, g, b] = hexToRgb(hex);
  const t = f < 0 ? 0 : 255, p = Math.abs(f);
  return `rgb(${Math.round((t - r) * p + r)},${Math.round((t - g) * p + g)},${Math.round((t - b) * p + b)})`;
}

export function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
}

export function poly(ctx: CanvasRenderingContext2D, pts: Pt[]) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}

export function up(p: Pt, h: number): Pt { return { x: p.x, y: p.y - h }; }

export function lerpPt(a: Pt, b: Pt, t: number): Pt { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; }

/** Pequeño generador aleatorio determinista a partir de una semilla. */
export function seeded(seed: number): () => number {
  let s = Math.floor(seed * 1e9) || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/**
 * Caché de sprites pre-renderizados a un canvas (para árboles, rocas...).
 * Se dibujan a resolución 2x para que se vean nítidos con zoom.
 */
export class SpriteCache {
  private map = new Map<string, { c: HTMLCanvasElement; ax: number; ay: number; w: number; h: number }>();
  private static RES = 2;

  draw(ctx: CanvasRenderingContext2D, key: string, w: number, h: number, ax: number, ay: number, x: number, y: number, z: number,
       paint: (c: CanvasRenderingContext2D) => void) {
    let e = this.map.get(key);
    if (!e) {
      const c = document.createElement('canvas');
      const R = SpriteCache.RES;
      c.width = Math.ceil(w * R); c.height = Math.ceil(h * R);
      const cx = c.getContext('2d')!;
      cx.scale(R, R);
      cx.translate(ax, ay);
      paint(cx);
      e = { c, ax, ay, w, h };
      this.map.set(key, e);
    }
    ctx.drawImage(e.c, x - e.ax * z, y - e.ay * z, e.w * z, e.h * z);
  }
}
