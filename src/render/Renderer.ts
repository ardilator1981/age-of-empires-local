import { ELEV_PX, HALF_H, HALF_W } from '../core/constants';
import type { Pt, SpriteContext } from '../core/types';
import type { Entity } from '../game/Entity';
import type { Decal, Game } from '../game/Game';
import type { UIState } from '../ui/UIState';
import { Camera } from './Camera';
import { ellipse, poly, up } from './draw';
import { TerrainGL } from './TerrainGL';
import { artFor } from './art/artRegistry';
import { type Deco, drawDecoration, generateDecorations } from './decorations';

interface Drawn { e: Entity; sx: number; sy: number; hb: number }

function hash2(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}


export class Renderer {
  readonly ctx: CanvasRenderingContext2D;
  readonly cam = new Camera();
  dpr = 1;
  /** Terreno con relieve (WebGL2). null = render plano de reserva. */
  readonly gl: TerrainGL | null;
  private flatTerrain: HTMLCanvasElement | null = null;
  private flatPixels: ImageData | null = null;
  private flatVersion = -1;
  private tex = 16;
  readonly fogCanvas: HTMLCanvasElement;
  private fogCtx: CanvasRenderingContext2D;
  private fogImg: ImageData;
  private fogBytes: Uint8Array;
  private fogVersion = -1;
  /** Entidades dibujadas en el último frame (para seleccionar con el ratón). */
  drawn: Drawn[] = [];
  private decos: Deco[] = [];
  private decoVersion = -1;

  constructor(public canvas: HTMLCanvasElement, terrainCanvas: HTMLCanvasElement, public game: Game, public ui: UIState) {
    this.ctx = canvas.getContext('2d')!;
    const m = game.map;
    this.gl = TerrainGL.create(terrainCanvas, game);
    terrainCanvas.style.display = this.gl ? '' : 'none';
    if (this.gl) {
      this.cam.elev = ELEV_PX;
      this.cam.heightAt = (x, y) => m.heightAt(x, y);
    }
    this.fogCanvas = document.createElement('canvas');
    this.fogCanvas.width = m.w; this.fogCanvas.height = m.h;
    this.fogCtx = this.fogCanvas.getContext('2d')!;
    this.fogImg = this.fogCtx.createImageData(m.w, m.h);
    this.fogBytes = new Uint8Array(m.w * m.h);
    this.resize();
    const tc = game.buildings.find(e => e.owner === game.humanId);
    if (tc) this.cam.centerOn(tc.x + 2, tc.y + 2);
  }

  resize() {
    this.dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth, h = window.innerHeight;
    this.canvas.width = Math.floor(w * this.dpr);
    this.canvas.height = Math.floor(h * this.dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.gl?.resize(w, h, this.dpr);
    this.cam.viewW = w;
    this.cam.viewH = h;
  }

  project = (wx: number, wy: number): Pt => this.cam.worldToScreen(wx, wy);

  /** Colores del terreno para el minimapa (1 px por casilla). */
  get minimapPixels(): ImageData | null {
    if (this.gl) { this.gl.sync(); return this.gl.minimap; }
    if (this.flatVersion !== this.game.map.version) this.buildFlatTerrain();
    return this.flatPixels;
  }

  /** Altura de la base de una entidad estática (los edificios se asientan a una altura fija). */
  private baseHeight(e: Entity): number {
    if (!this.gl) return 0;
    if (e.kind === 'building') return this.game.map.baseHeight(e.tx, e.ty, e.size);
    return this.game.map.heightAt(e.x, e.y);
  }

  // ------------------------------------------------------------ render plano de reserva

  private buildFlatTerrain() {
    const m = this.game.map, reg = this.game.reg;
    this.flatVersion = m.version;
    const low = document.createElement('canvas');
    low.width = m.w; low.height = m.h;
    const lctx = low.getContext('2d')!;
    const img = lctx.createImageData(m.w, m.h);
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const t = reg.terrains[m.terrain[y * m.w + x]];
      const f = 1 + (hash2(x, y) - 0.5) * (t.variance / 100);
      const i = (y * m.w + x) * 4;
      img.data[i] = t.color[0] * f; img.data[i + 1] = t.color[1] * f; img.data[i + 2] = t.color[2] * f; img.data[i + 3] = 255;
    }
    lctx.putImageData(img, 0, 0);
    this.flatPixels = img;
    this.tex = m.w <= 128 ? 16 : 10;
    const T = this.tex;
    const big = document.createElement('canvas');
    big.width = m.w * T; big.height = m.h * T;
    const b = big.getContext('2d', { willReadFrequently: true })!;
    b.imageSmoothingEnabled = true;
    b.drawImage(low, 0, 0, big.width, big.height);
    const bi = b.getImageData(0, 0, big.width, big.height);
    for (let y = 0; y < big.height; y++) for (let x = 0; x < big.width; x++) {
      const i = (y * big.width + x) * 4, n = (hash2(x, y) - 0.5) * 18 + (hash2(x >> 2, y >> 2) - 0.5) * 10;
      bi.data[i] += n; bi.data[i + 1] += n; bi.data[i + 2] += n * 0.7;
    }
    b.putImageData(bi, 0, 0);
    this.flatTerrain = big;
  }

  private updateFog() {
    const v = this.game.data.visionVersion ?? 0;
    if (v === this.fogVersion) return;
    this.fogVersion = v;
    const p = this.game.human, f = this.fogBytes;
    for (let i = 0; i < f.length; i++) f[i] = !p.explored[i] ? 255 : !p.visible[i] ? 120 : 0;
    if (this.gl) { this.gl.updateFog(f); return; }
    const d = this.fogImg.data;
    for (let i = 0; i < f.length; i++) d[i * 4 + 3] = f[i];
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

  /** Explorada pero sin visión actual: se dibuja oscurecida. */
  private inFog(e: Entity): boolean {
    const p = this.game.human;
    if (e.owner === p.id || this.game.opts.visibility === 'revealed') return false;
    const m = this.game.map;
    return !p.visible[Math.floor(e.y) * m.w + Math.floor(e.x)];
  }

  // ------------------------------------------------------------ dibujo

  /** Contexto para dibujar un sprite. `hb` = altura base fija (edificios). */
  spriteCtx(e: Entity | null, defId: string, kind: string, sx: number, sy: number, owner: number, foot?: SpriteContext['foot'], hb?: number): SpriteContext | null {
    const reg = this.game.reg;
    const def: any = kind === 'resource' ? reg.resourceNodes.get(defId) : kind === 'unit' ? reg.units.get(defId) : reg.buildings.get(defId);
    if (!def) return null;
    const project = hb === undefined ? this.project : (wx: number, wy: number) => this.cam.worldToScreen(wx, wy, hb);
    return {
      ctx: this.ctx, x: sx, y: sy, z: this.cam.zoom, time: this.game.time,
      color: this.game.players[owner]?.color ?? '#aaa', entity: e, def, params: def.spriteParams ?? {}, project, foot,
      age: this.game.players[owner]?.age ?? 0,
    };
  }

  private drawEntity(d: Drawn) {
    const e = d.e;
    const isStatic = e.kind !== 'unit';
    const s = this.spriteCtx(e, e.defId, e.kind, d.sx, d.sy, e.owner, isStatic ? { tx: e.tx, ty: e.ty, size: e.size } : undefined, e.kind === 'building' ? d.hb : undefined);
    if (!s) return;
    const fn = this.game.reg.sprites.get(s.def.sprite);
    const fogged = isStatic && this.inFog(e);
    if (fogged) this.ctx.filter = 'brightness(55%)';
    if (fn) fn(s);
    else {
      this.ctx.fillStyle = s.color;
      ellipse(this.ctx, d.sx, d.sy - 8 * s.z, 6 * s.z, 6 * s.z);
      this.ctx.fill();
    }
    if (fogged) this.ctx.filter = 'none';
  }

  /** Animación de muerte del sprite de la unidad (si la tiene). */
  private drawDeath(d: Decal, p: Pt, age: number): boolean {
    if (!d.defId) return false;
    const s = this.spriteCtx(null, d.defId, 'unit', p.x, p.y, d.owner ?? 0);
    const fn = s && this.game.reg.sprites.get(s.def.sprite);
    return !!(s && fn?.death?.(s, age, d.facing ?? 1));
  }

  /** Matas, flores, piedras... (solo decorativo). */
  private drawDecorations() {
    const { ctx, cam, game } = this;
    const m = game.map;
    if (this.decoVersion !== m.version) { this.decoVersion = m.version; this.decos = generateDecorations(game); }
    const z = cam.zoom;
    if (z < 0.42) return;
    const W = cam.viewW, H = cam.viewH, hw = W / 2, hh = H / 2;
    const p = game.human, elev = cam.elev;
    const all = game.opts.visibility === 'revealed';
    for (const d of this.decos) {
      const sx = (d.ix - cam.x) * z + hw;
      if (sx < -30 || sx > W + 30) continue;
      let sy = (d.iy - cam.y) * z + hh;
      if (sy < -30 || sy > H + 140 * z) continue;
      if (m.occupant[d.tile] || !p.explored[d.tile]) continue;
      if (elev) sy -= m.heightAt(d.x, d.y) * elev * z;
      const lit = all || p.visible[d.tile];
      if (!lit) ctx.globalAlpha = 0.4;
      drawDecoration(ctx, d, sx, sy, z);
      if (!lit) ctx.globalAlpha = 1;
    }
  }

  /** Altura aproximada (px a zoom 1) de un edificio sobre su huella, para barras de vida, selección y sombra. */
  private buildingHeight(e: Entity): number {
    const procedural = e.size * 14 + 46;
    const art = artFor(this.game.reg, 'building', e.defId);
    const top = art?.heightAbove(this.game.players[e.owner]?.age ?? 0, e.size);
    return top ? Math.max(procedural * 0.6, top - e.size * 16) : procedural;
  }

  /** Sombra suave de un edificio hacia abajo a la derecha. */
  private buildingShadow(d: Drawn) {
    const e = d.e, ctx = this.ctx, z = this.cam.zoom;
    if (this.game.reg.building(e.defId).walkable) return;
    const h = this.buildingHeight(e) * (e.complete ? 1 : 0.3 + 0.7 * e.progress);
    const ox = h * 0.5 * z, oy = h * 0.2 * z;
    const fp = this.footprint(e, d.hb);
    const pts = [...fp, ...fp.map(q => ({ x: q.x + ox, y: q.y + oy }))];
    const hull = convexHull(pts);
    ctx.fillStyle = this.inFog(e) ? 'rgba(0,0,0,0.12)' : 'rgba(10,6,0,0.24)';
    poly(ctx, hull); ctx.fill();
  }

  /** Esquinas en pantalla de la huella de un edificio a su altura base. */
  footprint(e: { tx: number; ty: number; size: number }, hb: number): Pt[] {
    const c = this.cam;
    return [c.worldToScreen(e.tx, e.ty, hb), c.worldToScreen(e.tx + e.size, e.ty, hb), c.worldToScreen(e.tx + e.size, e.ty + e.size, hb), c.worldToScreen(e.tx, e.ty + e.size, hb)];
  }

  render(alpha: number) {
    const { ctx, cam, game, ui } = this;
    const z = cam.zoom, W = cam.viewW, H = cam.viewH, dpr = this.dpr;
    this.updateFog();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    let o: Pt = cam.worldToScreen(0, 0, 0);
    if (this.gl) {
      this.gl.render(cam, game.time);
      ctx.clearRect(0, 0, W, H);
    } else {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      if (game.map.version !== this.flatVersion) this.buildFlatTerrain();
      o = cam.worldToScreen(0, 0, 0);
      const a = (HALF_W * z) / this.tex, b = (HALF_H * z) / this.tex;
      ctx.setTransform(dpr * a, dpr * b, -dpr * a, dpr * b, dpr * o.x, dpr * o.y);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(this.flatTerrain!, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // Restos en el suelo
    const m = game.map;
    for (const d of game.decals) {
      const age = game.time - d.time;
      const p = cam.worldToScreen(d.x, d.y);
      if (p.x < -100 || p.y < -100 || p.x > W + 100 || p.y > H + 100) continue;
      if (!game.human.visible[Math.floor(d.y) * m.w + Math.floor(d.x)]) continue;
      ctx.globalAlpha = Math.max(0, 1 - age / 40);
      if (d.kind === 'corpse' && this.drawDeath(d, p, age)) {
        // animación de muerte de la hoja de sprites
      } else if (d.kind === 'corpse') {
        ctx.fillStyle = 'rgba(70,20,15,0.55)'; ellipse(ctx, p.x, p.y, 10 * z, 4 * z); ctx.fill();
        ctx.fillStyle = d.color; ellipse(ctx, p.x + 2 * z, p.y - 1 * z, 6 * z, 2.4 * z); ctx.fill();
      } else {
        for (let k = 0; k < d.size * 5; k++) {
          const rx = Math.sin(k * 12.9898 + d.x) * d.size * 0.42, ry = Math.cos(k * 78.233 + d.y) * d.size * 0.42;
          const q = cam.worldToScreen(d.x + rx, d.y + ry);
          ctx.fillStyle = k % 3 === 0 ? '#2b2420' : k % 2 ? '#7a7066' : '#4f4740';
          ellipse(ctx, q.x, q.y, 6 * z, 3.5 * z); ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;

    this.drawDecorations();

    // Clasificar entidades visibles
    const sel = new Set(ui.selection);
    const ground: Drawn[] = [], items: (Drawn & { depth: number })[] = [];
    for (const e of game.list) {
      if (e.dead) continue;
      const rx = e.px + (e.x - e.px) * alpha, ry = e.py + (e.y - e.py) * alpha;
      const hb = e.kind === 'unit' ? 0 : this.baseHeight(e);
      const p = e.kind === 'unit' ? cam.worldToScreen(rx, ry) : cam.worldToScreen(rx, ry, hb);
      const margin = (e.size * 50 + 100) * z;
      if (p.x < -margin || p.y < -margin * 0.6 || p.x > W + margin || p.y > H + margin * 1.6) continue;
      if (!this.isVisible(e)) continue;
      const d: Drawn = { e, sx: p.x, sy: p.y, hb };
      if (e.kind === 'building' && game.reg.building(e.defId).walkable) ground.push(d);
      else items.push({ ...d, depth: rx + ry });
    }
    items.sort((a, b) => a.depth - b.depth);

    for (const d of ground) this.drawEntity(d);
    // Sombras proyectadas de los edificios (la luz viene de arriba a la izquierda)
    for (const d of items) if (d.e.kind === 'building') this.buildingShadow(d);

    // Anillos de selección (debajo de los sprites)
    for (const d of [...ground, ...items]) {
      if (!sel.has(d.e.id)) continue;
      const col = d.e.owner === game.humanId ? '#ffffff' : d.e.owner === 0 ? '#f4e6a0' : '#ff6b6b';
      ctx.strokeStyle = col;
      ctx.lineWidth = Math.max(1, 1.4 * z);
      if (d.e.kind === 'unit') {
        ellipse(ctx, d.sx, d.sy, (d.e.radius * 48 + 3) * z, (d.e.radius * 24 + 1.5) * z);
        ctx.stroke();
      } else {
        poly(ctx, this.footprint(d.e, d.hb));
        ctx.stroke();
      }
    }

    for (const d of items) this.drawEntity(d);
    this.drawn = [...ground, ...items];

    // Proyectiles
    for (const pr of game.projectiles) {
      const t = Math.min(1, pr.t);
      const wx = pr.sx + (pr.ex - pr.sx) * t, wy = pr.sy + (pr.ey - pr.sy) * t;
      if (!game.human.visible[Math.floor(wy) * m.w + Math.floor(wx)]) continue;
      const hgt = pr.sh * (1 - t) + 10 * t + Math.sin(Math.PI * t) * 26;
      const p = cam.worldToScreen(wx, wy);
      const t2 = Math.min(1, t + 0.05);
      const p2 = cam.worldToScreen(pr.sx + (pr.ex - pr.sx) * t2, pr.sy + (pr.ey - pr.sy) * t2);
      const h2 = pr.sh * (1 - t2) + 10 * t2 + Math.sin(Math.PI * t2) * 26;
      const dx = p2.x - p.x, dy = (p2.y - h2 * z) - (p.y - hgt * z);
      const len = Math.hypot(dx, dy) || 1;
      const L = (pr.style === 'arrow' ? 9 : 5) * z;
      ctx.strokeStyle = pr.style === 'arrow' ? '#2e2214' : '#8a8f94';
      ctx.lineWidth = Math.max(1, (pr.style === 'arrow' ? 1.3 : 2.8) * z);
      ctx.beginPath();
      ctx.moveTo(p.x - (dx / len) * L, p.y - hgt * z - (dy / len) * L);
      ctx.lineTo(p.x, p.y - hgt * z);
      ctx.stroke();
      if (pr.style === 'arrow') {
        ctx.fillStyle = '#e8e2d0';
        ellipse(ctx, p.x - (dx / len) * L, p.y - hgt * z - (dy / len) * L, 1.2 * z, 1.2 * z); ctx.fill();
      }
    }

    // Niebla de guerra (en WebGL ya va en el terreno)
    if (!this.gl) {
      ctx.setTransform(dpr * HALF_W * z, dpr * HALF_H * z, -dpr * HALF_W * z, dpr * HALF_H * z, dpr * o.x, dpr * o.y);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(this.fogCanvas, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

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
      const w = (isUnit ? 26 : 22 + e.size * 12) * z;
      const top = isUnit ? d.sy - (e.radius > 0.3 ? 52 : 44) * z : this.footprint(e, d.hb)[0].y - this.buildingHeight(e) * z;
      const x = d.sx - w / 2;
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(x - 1, top - 1, w + 2, 5);
      ctx.fillStyle = e.owner === game.humanId ? '#3fdc3f' : '#e33';
      ctx.fillRect(x, top, w * Math.max(0, e.hp / e.maxHp), 3);
      if (e.kind === 'building' && !e.complete) {
        ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(x - 1, top + 4, w + 2, 4);
        ctx.fillStyle = '#4aa3ff'; ctx.fillRect(x, top + 5, w * e.progress, 2);
      }
      if (e.kind === 'building' && e.owner === game.humanId && e.rally && sel.has(e.id)) {
        const r = this.project(e.rally.x, e.rally.y);
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(d.sx, d.sy); ctx.lineTo(r.x, r.y); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x, r.y - 18 * z); ctx.stroke();
        ctx.fillStyle = game.human.color;
        poly(ctx, [{ x: r.x, y: r.y - 18 * z }, { x: r.x + 10 * z, y: r.y - 15 * z }, { x: r.x, y: r.y - 11 * z }]); ctx.fill();
      }
    }

    // Fantasma de construcción
    if (ui.placing) {
      const { defId, tx, ty, valid } = ui.placing;
      const def = game.reg.building(defId);
      const hb = this.gl ? game.map.baseHeight(tx, ty, def.size) : 0;
      ctx.fillStyle = valid ? 'rgba(80,255,80,0.25)' : 'rgba(255,60,60,0.35)';
      poly(ctx, this.footprint({ tx, ty, size: def.size }, hb)); ctx.fill();
      ctx.globalAlpha = 0.7;
      const c = cam.worldToScreen(tx + def.size / 2, ty + def.size / 2, hb);
      const s = this.spriteCtx(null, defId, 'building', c.x, c.y, game.humanId, { tx, ty, size: def.size }, hb);
      if (s) game.reg.sprites.get(def.sprite)?.(s);
      ctx.globalAlpha = 1;
    }

    // Marcadores de órdenes
    const now = performance.now() / 1000;
    ui.markers = ui.markers.filter(mk => now - mk.t < 0.6);
    for (const mk of ui.markers) {
      const k = (now - mk.t) / 0.6;
      const p = this.project(mk.x, mk.y);
      ctx.strokeStyle = mk.color; ctx.globalAlpha = 1 - k; ctx.lineWidth = 2;
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
      const big = e.radius > 0.3;
      const r = big ? 20 : 12, hgt = big ? 44 : 38;
      if (Math.abs(sx - ex) < r * z && sy > ey - hgt * z && sy < ey + 5 * z) {
        const d = Math.hypot(sx - ex, sy - (ey - 16 * z));
        if (d < bestD) { bestD = d; best = e; }
      }
    }
    if (best) return best;
    for (let i = this.drawn.length - 1; i >= 0; i--) {
      const { e, sx: ex, sy: ey, hb } = this.drawn[i];
      if (e.kind === 'building') {
        const h = this.buildingHeight(e) * z;
        const [T, R, B, L] = this.footprint(e, hb);
        const walk = this.game.reg.building(e.defId).walkable;
        const shape = walk ? [T, R, B, L] : [L, up(L, h), up(T, h), up(R, h), R, B];
        if (pointInPoly(sx, sy, shape)) return e;
      } else if (e.kind === 'resource') {
        const isTree = this.game.reg.resourceNodes.get(e.defId)?.sprite === 'tree';
        if (isTree ? Math.abs(sx - ex) < 14 * z && sy > ey - 62 * z && sy < ey + 6 * z
                   : Math.abs(sx - ex) < 20 * z && Math.abs(sy - ey + 5 * z) < 14 * z) return e;
      }
    }
    return null;
  }

  unitsInBox(x0: number, y0: number, x1: number, y1: number, owner: number): Entity[] {
    const minX = Math.min(x0, x1), maxX = Math.max(x0, x1), minY = Math.min(y0, y1), maxY = Math.max(y0, y1);
    const z = this.cam.zoom;
    return this.drawn
      .filter(d => d.e.kind === 'unit' && d.e.owner === owner && d.sx >= minX && d.sx <= maxX && d.sy - 16 * z >= minY - 12 * z && d.sy - 16 * z <= maxY + 12 * z)
      .map(d => d.e);
  }
}

function convexHull(pts: Pt[]): Pt[] {
  const p = [...pts].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Pt[] = [], upper: Pt[] = [];
  for (const q of p) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q); }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

function pointInPoly(x: number, y: number, pts: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i], b = pts[j];
    if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
