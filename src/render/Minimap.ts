import type { Pt } from '../core/types';
import type { Game } from '../game/Game';
import type { UIState } from '../ui/UIState';
import type { Renderer } from './Renderer';

/** Minimapa en forma de rombo (misma proyección isométrica que el juego). */
export class Minimap {
  private ctx: CanvasRenderingContext2D;
  private base: HTMLCanvasElement;
  private baseCtx: CanvasRenderingContext2D;
  private baseAt = -99;
  size = 200;

  constructor(public canvas: HTMLCanvasElement, public game: Game, public renderer: Renderer, public ui: UIState) {
    this.ctx = canvas.getContext('2d')!;
    this.base = document.createElement('canvas');
    this.base.width = game.map.w; this.base.height = game.map.h;
    this.baseCtx = this.base.getContext('2d')!;
    this.resize();
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.size = Math.max(100, Math.floor(Math.min(r.width, r.height)) || 200);
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.size * dpr;
    this.canvas.height = this.size * dpr;
  }

  private get k() { return this.size / (this.game.map.w + this.game.map.h); }

  toMini(wx: number, wy: number): Pt {
    const k = this.k;
    return { x: (wx - wy) * k + this.game.map.h * k, y: ((wx + wy) * k) / 2 + this.size / 4 };
  }

  fromMini(mx: number, my: number): Pt {
    const k = this.k;
    const a = (mx - this.game.map.h * k) / k, b = ((my - this.size / 4) * 2) / k;
    return { x: (a + b) / 2, y: (b - a) / 2 };
  }

  private rebuildBase() {
    const g = this.game, m = g.map;
    const src = this.renderer.minimapPixels;
    if (!src) return;
    const img = new ImageData(new Uint8ClampedArray(src.data), m.w, m.h);
    const d = img.data;
    for (const e of g.nodes) {
      if (e.dead) continue;
      const nd = g.reg.resourceNodes.get(e.defId);
      if (!nd) continue;
      const n = parseInt(nd.minimapColor.slice(1), 16);
      const i = (e.ty * m.w + e.tx) * 4;
      d[i] = (n >> 16) & 255; d[i + 1] = (n >> 8) & 255; d[i + 2] = n & 255;
    }
    this.baseCtx.putImageData(img, 0, 0);
  }

  render() {
    const g = this.game, ctx = this.ctx, k = this.k, S = this.size, dpr = window.devicePixelRatio || 1;
    if (g.time - this.baseAt > 2 || this.baseAt > g.time) { this.baseAt = g.time; this.rebuildBase(); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, S, S);
    const ox = g.map.h * k, oy = S / 4;
    ctx.setTransform(dpr * k, (dpr * k) / 2, -dpr * k, (dpr * k) / 2, dpr * ox, dpr * oy);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.base, 0, 0);
    const human = g.human;
    for (const e of g.actors) {
      if (e.dead) continue;
      if (!this.renderer.isVisible(e)) continue;
      ctx.fillStyle = g.players[e.owner].color;
      if (e.kind === 'building') ctx.fillRect(e.tx, e.ty, e.size, e.size);
      else ctx.fillRect(e.x - 0.9, e.y - 0.9, 1.8, 1.8);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.renderer.fogCanvas, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    void human;

    // Avisos de ataque
    const now = g.time;
    this.ui.pings = this.ui.pings.filter(p => now - p.t < 3);
    for (const p of this.ui.pings) {
      const q = this.toMini(p.x, p.y);
      const f = ((now - p.t) % 1);
      ctx.strokeStyle = `rgba(255,60,60,${1 - f})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(q.x, q.y, 4 + f * 10, 0, Math.PI * 2); ctx.stroke();
    }

    // Rectángulo de la vista
    const cam = this.renderer.cam;
    const corners = [[0, 0], [cam.viewW, 0], [cam.viewW, cam.viewH], [0, cam.viewH]].map(([x, y]) => {
      const w = cam.screenToWorld(x, y);
      return this.toMini(w.x, w.y);
    });
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    corners.forEach((c, i) => (i ? ctx.lineTo(c.x, c.y) : ctx.moveTo(c.x, c.y)));
    ctx.closePath();
    ctx.stroke();
  }
}
