import { HALF_H, HALF_W } from '../core/constants';
import type { Pt, SpriteContext } from '../core/types';
import type { Entity } from '../game/Entity';
import type { Game } from '../game/Game';
import type { UIState } from '../ui/UIState';
import { Camera } from './Camera';
import { ellipse, poly, up } from './draw';

interface Drawn { e: Entity; sx: number; sy: number }

function hash2(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export class Renderer {
  readonly ctx: CanvasRenderingContext2D;
  readonly cam = new Camera();
  dpr = 1;
  /** Terreno a 1 píxel por casilla (lo usa el minimapa). */
  terrainLow!: HTMLCanvasElement;
  /** Píxeles del terreno a 1 px por casilla (copia para el minimapa). */
  terrainPixels!: ImageData;
  terrainVersion = -1;
  private terrainBig!: HTMLCanvasElement;
  private tex = 16;
  readonly fogCanvas: HTMLCanvasElement;
  private fogCtx: CanvasRenderingContext2D;
  private fogImg: ImageData;
  private fogVersion = -1;
  /** Entidades dibujadas en el último frame (para seleccionar con el ratón). */
  drawn: Drawn[] = [];

  constructor(public canvas: HTMLCanvasElement, public game: Game, public ui: UIState) {
    this.ctx = canvas.getContext('2d')!;
    const m = game.map;
    this.fogCanvas = document.createElement('canvas');
    this.fogCanvas.width = m.w; this.fogCanvas.height = m.h;
    this.fogCtx = this.fogCanvas.getContext('2d')!;
    this.fogImg = this.fogCtx.createImageData(m.w, m.h);
    this.resize();
    const tc = game.list.find(e => e.owner === game.humanId && e.kind === 'building');
    if (tc) this.cam.centerOn(tc.x + 2, tc.y + 2);
  }

  resize() {
    this.dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth, h = window.innerHeight;
    this.canvas.width = Math.floor(w * this.dpr);
    this.canvas.height = Math.floor(h * this.dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.cam.viewW = w;
    this.cam.viewH = h;
  }

  project = (wx: number, wy: number): Pt => this.cam.worldToScreen(wx, wy);

  // ------------------------------------------------------------ cachés

  private buildTerrain() {
    const m = this.game.map, reg = this.game.reg;
    this.terrainVersion = m.version;
    const low = document.createElement('canvas');
    low.width = m.w; low.height = m.h;
    const lctx = low.getContext('2d')!;
    const img = lctx.createImageData(m.w, m.h);
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const t = reg.terrains[m.terrain[y * m.w + x]];
      const f = 1 + (hash2(x, y) - 0.5) * (t.variance / 100);
      const i = (y * m.w + x) * 4;
      img.data[i] = Math.min(255, t.color[0] * f);
      img.data[i + 1] = Math.min(255, t.color[1] * f);
      img.data[i + 2] = Math.min(255, t.color[2] * f);
      img.data[i + 3] = 255;
    }
    lctx.putImageData(img, 0, 0);
    this.terrainLow = low;
    this.terrainPixels = img;

    this.tex = m.w <= 128 ? 16 : 10;
    const T = this.tex;
    const big = document.createElement('canvas');
    big.width = m.w * T; big.height = m.h * T;
    const b = big.getContext('2d')!;
    b.imageSmoothingEnabled = true;
    b.imageSmoothingQuality = 'high';
    b.drawImage(low, 0, 0, big.width, big.height);
    const bi = b.getImageData(0, 0, big.width, big.height);
    const d = bi.data;
    for (let y = 0; y < big.height; y++) for (let x = 0; x < big.width; x++) {
      const i = (y * big.width + x) * 4;
      const n = (hash2(x, y) - 0.5) * 18 + (hash2(x >> 2, y >> 2) - 0.5) * 10;
      d[i] += n; d[i + 1] += n; d[i + 2] += n * 0.7;
    }
    b.putImageData(bi, 0, 0);
    this.terrainBig = big;
  }

  private updateFog() {
    const v = this.game.data.visionVersion ?? 0;
    if (v === this.fogVersion) return;
    this.fogVersion = v;
    const p = this.game.human, d = this.fogImg.data;
    for (let i = 0; i < p.explored.length; i++) {
      d[i * 4 + 3] = !p.explored[i] ? 255 : !p.visible[i] ? 115 : 0;
    }
    this.fogCtx.putImageData(this.fogImg, 0, 0);
  }

  /** ¿Ve el jugador humano esta entidad? */
  isVisible(e: Entity): boolean {
    const p = this.game.human;
    if (e.owner === p.id) return true;
    const m = this.game.map;
    const i = Math.floor(e.y) * m.w + Math.floor(e.x);
    return e.kind === 'unit' ? p.visible[i] === 1 : p.explored[i] === 1;
  }

  // ------------------------------------------------------------ dibujo

  private spriteCtx(e: Entity | null, defId: string, kind: string, sx: number, sy: number, owner: number, foot?: SpriteContext['foot']): SpriteContext | null {
    const reg = this.game.reg;
    let def: any, sprite: string, params: Record<string, any>;
    if (kind === 'resource') {
      def = reg.resourceNodes.get(defId);
      if (!def) return null;
      sprite = def.sprite; params = def.spriteParams ?? {};
    } else {
      def = kind === 'unit' ? reg.units.get(defId) : reg.buildings.get(defId);
      if (!def) return null;
      sprite = def.sprite; params = def.spriteParams ?? {};
    }
    void sprite;
    return {
      ctx: this.ctx, x: sx, y: sy, z: this.cam.zoom, time: this.game.time,
      color: this.game.players[owner]?.color ?? '#aaa', entity: e, def, params, project: this.project, foot,
    };
  }

  private drawEntity(e: Entity, sx: number, sy: number) {
    const s = this.spriteCtx(e, e.defId, e.kind, sx, sy, e.owner, e.kind !== 'unit' ? { tx: e.tx, ty: e.ty, size: e.size } : undefined);
    if (!s) return;
    const fn = this.game.reg.sprites.get(s.def.sprite);
    if (fn) fn(s);
    else {
      this.ctx.fillStyle = s.color;
      ellipse(this.ctx, sx, sy - 8 * s.z, 6 * s.z, 6 * s.z);
      this.ctx.fill();
    }
  }

  render(alpha: number) {
    const { ctx, cam, game, ui } = this;
    const z = cam.zoom, W = cam.viewW, H = cam.viewH, dpr = this.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    if (game.map.version !== this.terrainVersion) this.buildTerrain();
    this.updateFog();

    // Terreno: una sola imagen con transformación afín isométrica
    const o = cam.worldToScreen(0, 0);
    const a = (HALF_W * z) / this.tex, b = (HALF_H * z) / this.tex;
    ctx.setTransform(dpr * a, dpr * b, -dpr * a, dpr * b, dpr * o.x, dpr * o.y);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.terrainBig, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Restos en el suelo
    for (const d of game.decals) {
      const age = game.time - d.time;
      const p = cam.worldToScreen(d.x, d.y);
      if (p.x < -100 || p.y < -100 || p.x > W + 100 || p.y > H + 100) continue;
      const m = game.map, i = Math.floor(d.y) * m.w + Math.floor(d.x);
      if (!game.human.explored[i]) continue;
      ctx.globalAlpha = Math.max(0, 1 - age / 40);
      if (d.kind === 'corpse') {
        ctx.fillStyle = 'rgba(70,20,15,0.6)'; ellipse(ctx, p.x, p.y, 8 * z, 3 * z); ctx.fill();
        ctx.fillStyle = d.color; ellipse(ctx, p.x + 2 * z, p.y - 1 * z, 5 * z, 2 * z); ctx.fill();
      } else {
        for (let k = 0; k < d.size * 4; k++) {
          const rx = Math.sin(k * 12.9898 + d.x) * d.size * 0.4, ry = Math.cos(k * 78.233 + d.y) * d.size * 0.4;
          const q = cam.worldToScreen(d.x + rx, d.y + ry);
          ctx.fillStyle = k % 2 ? '#6d655c' : '#3f3a35';
          ellipse(ctx, q.x, q.y, 5 * z, 3 * z); ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;

    // Clasificar entidades visibles
    const sel = new Set(ui.selection);
    const ground: Drawn[] = [], items: (Drawn & { depth: number })[] = [];
    for (const e of game.list) {
      if (e.dead) continue;
      const rx = e.px + (e.x - e.px) * alpha, ry = e.py + (e.y - e.py) * alpha;
      const p = cam.worldToScreen(rx, ry);
      const margin = (e.size * 40 + 80) * z;
      if (p.x < -margin || p.y < -margin || p.x > W + margin || p.y > H + margin * 1.5) continue;
      if (!this.isVisible(e)) continue;
      const d: Drawn = { e, sx: p.x, sy: p.y };
      if (e.kind === 'building' && game.reg.building(e.defId).walkable) ground.push(d);
      else items.push({ ...d, depth: rx + ry });
    }
    items.sort((a, b) => a.depth - b.depth);

    for (const d of ground) this.drawEntity(d.e, d.sx, d.sy);

    // Anillos de selección (debajo de los sprites)
    for (const d of [...ground, ...items]) {
      if (!sel.has(d.e.id)) continue;
      const col = d.e.owner === game.humanId ? '#7dff7d' : d.e.owner === 0 ? '#ffffff' : '#ff6b6b';
      ctx.strokeStyle = col;
      ctx.lineWidth = Math.max(1, 1.5 * z);
      if (d.e.kind === 'unit') {
        ellipse(ctx, d.sx, d.sy, (d.e.radius * 40 + 2) * z, (d.e.radius * 20 + 1) * z);
        ctx.stroke();
      } else {
        const e = d.e;
        poly(ctx, [this.project(e.tx, e.ty), this.project(e.tx + e.size, e.ty), this.project(e.tx + e.size, e.ty + e.size), this.project(e.tx, e.ty + e.size)]);
        ctx.stroke();
      }
    }

    for (const d of items) this.drawEntity(d.e, d.sx, d.sy);
    this.drawn = [...ground, ...items];

    // Proyectiles
    for (const pr of game.projectiles) {
      const t = Math.min(1, pr.t);
      const wx = pr.sx + (pr.ex - pr.sx) * t, wy = pr.sy + (pr.ey - pr.sy) * t;
      const i = Math.floor(wy) * game.map.w + Math.floor(wx);
      if (!game.human.visible[i]) continue;
      const hgt = pr.sh * (1 - t) + 8 * t + Math.sin(Math.PI * t) * 22;
      const p = cam.worldToScreen(wx, wy);
      const t2 = Math.min(1, t + 0.05);
      const p2 = cam.worldToScreen(pr.sx + (pr.ex - pr.sx) * t2, pr.sy + (pr.ey - pr.sy) * t2);
      const h2 = pr.sh * (1 - t2) + 8 * t2 + Math.sin(Math.PI * t2) * 22;
      const dx = p2.x - p.x, dy = (p2.y - h2 * z) - (p.y - hgt * z);
      const len = Math.hypot(dx, dy) || 1;
      const L = (pr.style === 'arrow' ? 7 : 4) * z;
      ctx.strokeStyle = pr.style === 'arrow' ? '#3b2a18' : '#8a8f94';
      ctx.lineWidth = Math.max(1, (pr.style === 'arrow' ? 1.2 : 2.5) * z);
      ctx.beginPath();
      ctx.moveTo(p.x - (dx / len) * L, p.y - hgt * z - (dy / len) * L);
      ctx.lineTo(p.x, p.y - hgt * z);
      ctx.stroke();
    }

    // Niebla de guerra
    ctx.setTransform(dpr * HALF_W * z, dpr * HALF_H * z, -dpr * HALF_W * z, dpr * HALF_H * z, dpr * o.x, dpr * o.y);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.fogCanvas, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.drawOverlays(sel);
  }

  private drawOverlays(sel: Set<number>) {
    const { ctx, cam, game, ui } = this;
    const z = cam.zoom;
    for (const d of this.drawn) {
      const e = d.e;
      if (!sel.has(e.id) && !(e.kind === 'building' && !e.complete && e.owner === game.humanId)) continue;
      if (e.kind === 'resource') continue;
      const isUnit = e.kind === 'unit';
      const w = (isUnit ? 22 : 16 + e.size * 10) * z;
      const top = isUnit ? d.sy - (e.radius > 0.3 ? 40 : 34) * z : this.project(e.tx, e.ty).y - (e.size * 6 + 40) * z;
      const x = d.sx - w / 2;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(x - 1, top - 1, w + 2, 5);
      ctx.fillStyle = e.owner === game.humanId ? '#3fdc3f' : '#e33';
      ctx.fillRect(x, top, w * Math.max(0, e.hp / e.maxHp), 3);
      if (e.kind === 'building' && !e.complete) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(x - 1, top + 4, w + 2, 4);
        ctx.fillStyle = '#4aa3ff'; ctx.fillRect(x, top + 5, w * e.progress, 2);
      }
      if (e.kind === 'building' && e.owner === game.humanId && e.rally && sel.has(e.id)) {
        const r = this.project(e.rally.x, e.rally.y);
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(d.sx, d.sy); ctx.lineTo(r.x, r.y); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x, r.y - 16 * z); ctx.stroke();
        ctx.fillStyle = game.human.color;
        poly(ctx, [{ x: r.x, y: r.y - 16 * z }, { x: r.x + 9 * z, y: r.y - 13 * z }, { x: r.x, y: r.y - 10 * z }]); ctx.fill();
      }
    }

    // Fantasma de construcción
    if (ui.placing) {
      const { defId, tx, ty, valid } = ui.placing;
      const def = game.reg.building(defId);
      const pts = [this.project(tx, ty), this.project(tx + def.size, ty), this.project(tx + def.size, ty + def.size), this.project(tx, ty + def.size)];
      ctx.fillStyle = valid ? 'rgba(80,255,80,0.25)' : 'rgba(255,60,60,0.35)';
      poly(ctx, pts); ctx.fill();
      ctx.globalAlpha = 0.65;
      const c = this.project(tx + def.size / 2, ty + def.size / 2);
      const s = this.spriteCtx(null, defId, 'building', c.x, c.y, game.humanId, { tx, ty, size: def.size });
      if (s) game.reg.sprites.get(def.sprite)?.(s);
      ctx.globalAlpha = 1;
    }

    // Marcadores de órdenes
    const now = performance.now() / 1000;
    ui.markers = ui.markers.filter(m => now - m.t < 0.6);
    for (const m of ui.markers) {
      const k = (now - m.t) / 0.6;
      const p = this.project(m.x, m.y);
      ctx.strokeStyle = m.color; ctx.globalAlpha = 1 - k; ctx.lineWidth = 2;
      ellipse(ctx, p.x, p.y, (4 + k * 12) * z, (2 + k * 6) * z); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    if (ui.dragBox) {
      const b = ui.dragBox;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      const x = Math.min(b.x0, b.x1), y = Math.min(b.y0, b.y1), w = Math.abs(b.x1 - b.x0), h = Math.abs(b.y1 - b.y0);
      ctx.fillRect(x, y, w, h); ctx.strokeRect(x + 0.5, y + 0.5, w, h);
    }
  }

  // ------------------------------------------------------------ selección con el ratón

  pickAt(sx: number, sy: number): Entity | null {
    const z = this.cam.zoom;
    let best: Entity | null = null, bestD = Infinity;
    for (let i = this.drawn.length - 1; i >= 0; i--) {
      const { e, sx: ex, sy: ey } = this.drawn[i];
      if (e.kind !== 'unit') continue;
      const r = e.radius > 0.3 ? 15 : 9, hgt = e.radius > 0.3 ? 32 : 28;
      if (Math.abs(sx - ex) < r * z && sy > ey - hgt * z && sy < ey + 4 * z) {
        const d = Math.hypot(sx - ex, sy - (ey - 12 * z));
        if (d < bestD) { bestD = d; best = e; }
      }
    }
    if (best) return best;
    for (let i = this.drawn.length - 1; i >= 0; i--) {
      const { e, sx: ex, sy: ey } = this.drawn[i];
      if (e.kind === 'building') {
        const h = (e.size * 10 + 26) * z;
        const T = this.project(e.tx, e.ty), R = this.project(e.tx + e.size, e.ty);
        const B = this.project(e.tx + e.size, e.ty + e.size), L = this.project(e.tx, e.ty + e.size);
        const walk = this.game.reg.building(e.defId).walkable;
        const shape = walk ? [T, R, B, L] : [L, up(L, h), up(T, h), up(R, h), R, B];
        if (pointInPoly(sx, sy, shape)) return e;
      } else if (e.kind === 'resource') {
        const isTree = this.game.reg.resourceNodes.get(e.defId)?.sprite === 'tree';
        if (isTree ? Math.abs(sx - ex) < 11 * z && sy > ey - 46 * z && sy < ey + 6 * z
                   : Math.abs(sx - ex) < 18 * z && Math.abs(sy - ey + 4 * z) < 12 * z) return e;
      }
    }
    return null;
  }

  unitsInBox(x0: number, y0: number, x1: number, y1: number, owner: number): Entity[] {
    const minX = Math.min(x0, x1), maxX = Math.max(x0, x1), minY = Math.min(y0, y1), maxY = Math.max(y0, y1);
    const z = this.cam.zoom;
    return this.drawn
      .filter(d => d.e.kind === 'unit' && d.e.owner === owner && d.sx >= minX && d.sx <= maxX && d.sy - 12 * z >= minY - 10 * z && d.sy - 12 * z <= maxY + 10 * z)
      .map(d => d.e);
  }
}

function pointInPoly(x: number, y: number, pts: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i], b = pts[j];
    if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
