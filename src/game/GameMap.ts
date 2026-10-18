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
