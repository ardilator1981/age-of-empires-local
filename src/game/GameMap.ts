import type { Registry } from '../core/Registry';
import type { TerrainDef } from '../core/types';

/** Rejilla de casillas: terreno, obstáculos y ocupante (edificio o recurso). */
export class GameMap {
  terrain: Uint8Array;
  /** Nº de obstáculos en la casilla (edificios no caminables, árboles, minas). */
  blocked: Uint8Array;
  /** Id de la entidad estática que ocupa la casilla (0 = libre). */
  occupant: Int32Array;
  /** Se incrementa cuando cambia el terreno (para regenerar cachés de render). */
  version = 0;
  /** Altura de cada vértice de la rejilla ((w+1) x (h+1)), en niveles de elevación. */
  heights: Float32Array;
  /** Se incrementa cuando cambian las alturas. */
  heightVersion = 0;
  private walk: boolean[];
  private build: boolean[];
  /** Región conectada de cada casilla caminable (-1 = no caminable). */
  private regions: Int32Array;
  private regionsDirty = true;

  constructor(public w: number, public h: number, public reg: Registry) {
    this.terrain = new Uint8Array(w * h);
    this.blocked = new Uint8Array(w * h);
    this.occupant = new Int32Array(w * h);
    this.walk = reg.terrains.map(t => t.walkable);
    this.build = reg.terrains.map(t => t.buildable);
    this.regions = new Int32Array(w * h);
    this.heights = new Float32Array((w + 1) * (h + 1));
  }

  /** Altura del vértice (vx, vy). */
  vh(vx: number, vy: number): number {
    vx = vx < 0 ? 0 : vx > this.w ? this.w : vx;
    vy = vy < 0 ? 0 : vy > this.h ? this.h : vy;
    return this.heights[vy * (this.w + 1) + vx];
  }

  /** Altura del terreno en un punto (misma triangulación que el render). */
  heightAt(x: number, y: number): number {
    if (x < 0) x = 0; else if (x > this.w - 0.001) x = this.w - 0.001;
    if (y < 0) y = 0; else if (y > this.h - 0.001) y = this.h - 0.001;
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const W = this.w + 1, H = this.heights;
    const h00 = H[iy * W + ix], h10 = H[iy * W + ix + 1], h01 = H[(iy + 1) * W + ix], h11 = H[(iy + 1) * W + ix + 1];
    return fx >= fy ? h00 + (h10 - h00) * fx + (h11 - h10) * fy : h00 + (h11 - h01) * fx + (h01 - h00) * fy;
  }

  private tileH: Float32Array | null = null;
  private tileHVersion = -1;

  /** Altura media de cada casilla (caché; se recalcula si cambia el relieve). */
  tileHeights(): Float32Array {
    if (!this.tileH || this.tileHVersion !== this.heightVersion) {
      const t = this.tileH ?? new Float32Array(this.w * this.h);
      const W = this.w + 1, H = this.heights;
      for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
        t[y * this.w + x] = (H[y * W + x] + H[y * W + x + 1] + H[(y + 1) * W + x] + H[(y + 1) * W + x + 1]) / 4;
      }
      this.tileH = t;
      this.tileHVersion = this.heightVersion;
    }
    return this.tileH;
  }

  /** Diferencia entre el vértice más alto y el más bajo de un rectángulo de casillas. */
  slopeOf(tx: number, ty: number, size: number): number {
    let lo = Infinity, hi = -Infinity;
    for (let y = ty; y <= ty + size; y++) for (let x = tx; x <= tx + size; x++) {
      const h = this.vh(x, y);
      if (h < lo) lo = h;
      if (h > hi) hi = h;
    }
    return hi - lo;
  }

  /** Altura media de un rectángulo de casillas (base de los edificios). */
  baseHeight(tx: number, ty: number, size: number): number {
    let s = 0, n = 0;
    for (let y = ty; y <= ty + size; y++) for (let x = tx; x <= tx + size; x++) { s += this.vh(x, y); n++; }
    return s / n;
  }

  /** Avisa de que han cambiado los obstáculos (edificio nuevo, árbol talado...). */
  obstaclesChanged() { this.regionsDirty = true; }

  private computeRegions() {
    const { w, h } = this, reg = this.regions;
    reg.fill(-1);
    const stack: number[] = [];
    let next = 0;
    for (let i = 0; i < w * h; i++) {
      if (reg[i] !== -1 || !this.walkable(i % w, (i / w) | 0)) continue;
      const id = next++;
      reg[i] = id;
      stack.push(i);
      while (stack.length) {
        const c = stack.pop()!;
        const cx = c % w, cy = (c / w) | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const n = ny * w + nx;
          if (reg[n] !== -1 || !this.walkable(nx, ny)) continue;
          // Igual que el A*: no se cuela en diagonal entre dos obstáculos
          if (dx && dy && (!this.walkable(cx + dx, cy) || !this.walkable(cx, cy + dy))) continue;
          reg[n] = id;
          stack.push(n);
        }
      }
    }
    this.regionsDirty = false;
  }

  /** Región de la casilla (x, y); -1 si no es caminable. */
  region(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return -1;
    if (this.regionsDirty) this.computeRegions();
    return this.regions[y * this.w + x];
  }

  /** Región de un punto (si cae en un obstáculo, la de una casilla vecina). */
  regionAt(px: number, py: number): number {
    const x = Math.floor(px), y = Math.floor(py);
    const r = this.region(x, y);
    if (r >= 0) return r;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const n = this.region(x + dx, y + dy);
      if (n >= 0) return n;
    }
    return -1;
  }

  /** ¿Toca el rectángulo (x0,y0)-(x1,y1) inclusivo la región indicada? */
  rectTouchesRegion(x0: number, y0: number, x1: number, y1: number, region: number, inside: boolean): boolean {
    if (region < 0) return true;
    for (let y = y0 - 1; y <= y1 + 1; y++) for (let x = x0 - 1; x <= x1 + 1; x++) {
      const isInside = x >= x0 && x <= x1 && y >= y0 && y <= y1;
      if (isInside && !inside) continue;
      if (this.region(x, y) === region) return true;
    }
    return false;
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  /** x, y enteros. */
  walkable(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return false;
    const i = y * this.w + x;
    return this.walk[this.terrain[i]] && this.blocked[i] === 0;
  }

  buildable(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return false;
    const i = y * this.w + x;
    return this.build[this.terrain[i]] && this.blocked[i] === 0 && this.occupant[i] === 0;
  }

  terrainDef(x: number, y: number): TerrainDef {
    return this.reg.terrains[this.terrain[y * this.w + x]];
  }
}
