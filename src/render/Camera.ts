import { HALF_H, HALF_W } from '../core/constants';
import type { Pt } from '../core/types';

/**
 * Cámara isométrica con relieve. (x, y) = coordenadas isométricas (píxeles a
 * zoom 1) del centro de la vista. El terreno sube `elev` píxeles por nivel.
 */
export class Camera {
  x = 0;
  y = 0;
  zoom = 1;
  viewW = 800;
  viewH = 600;
  /** Píxeles por nivel de elevación (0 = mapa plano). */
  elev = 0;
  heightAt: (x: number, y: number) => number = () => 0;

  /** Coordenadas de mundo → pantalla. `h` fuerza la altura (si no, la del terreno). */
  worldToScreen(wx: number, wy: number, h?: number): Pt {
    const ix = (wx - wy) * HALF_W;
    const iy = (wx + wy) * HALF_H - (h ?? (this.elev ? this.heightAt(wx, wy) : 0)) * this.elev;
    return { x: (ix - this.x) * this.zoom + this.viewW / 2, y: (iy - this.y) * this.zoom + this.viewH / 2 };
  }

  private flatToWorld(sx: number, sy: number): Pt {
    const ix = (sx - this.viewW / 2) / this.zoom + this.x;
    const iy = (sy - this.viewH / 2) / this.zoom + this.y;
    return { x: (ix / HALF_W + iy / HALF_H) / 2, y: (iy / HALF_H - ix / HALF_W) / 2 };
  }

  /** Pantalla → mundo, teniendo en cuenta el relieve (aproximación iterativa). */
  screenToWorld(sx: number, sy: number): Pt {
    let w = this.flatToWorld(sx, sy);
    if (!this.elev) return w;
    for (let i = 0; i < 6; i++) {
      const h = this.heightAt(w.x, w.y) * this.elev * this.zoom;
      w = this.flatToWorld(sx, sy + h);
    }
    return w;
  }

  centerOn(wx: number, wy: number) {
    this.x = (wx - wy) * HALF_W;
    this.y = (wx + wy) * HALF_H - (this.elev ? this.heightAt(wx, wy) * this.elev : 0);
  }

  get center(): Pt { return this.screenToWorld(this.viewW / 2, this.viewH / 2); }

  clamp(mapW: number, mapH: number) {
    this.x = Math.max(-mapH * HALF_W, Math.min(mapW * HALF_W, this.x));
    this.y = Math.max(0, Math.min((mapW + mapH) * HALF_H, this.y));
  }

  zoomAt(factor: number, sx: number, sy: number) {
    const before = this.flatToWorld(sx, sy);
    this.zoom = Math.max(0.35, Math.min(2.2, this.zoom * factor));
    const after = this.flatToWorld(sx, sy);
    this.x += ((before.x - before.y) - (after.x - after.y)) * HALF_W;
    this.y += ((before.x + before.y) - (after.x + after.y)) * HALF_H;
  }
}
