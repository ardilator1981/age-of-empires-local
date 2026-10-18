import { HALF_H, HALF_W } from '../core/constants';
import type { Pt } from '../core/types';

/** Cámara isométrica. (x, y) = coordenadas isométricas (píxeles a zoom 1) del centro de la vista. */
export class Camera {
  x = 0;
  y = 0;
  zoom = 1;
  viewW = 800;
  viewH = 600;

  worldToScreen(wx: number, wy: number): Pt {
    const ix = (wx - wy) * HALF_W, iy = (wx + wy) * HALF_H;
    return { x: (ix - this.x) * this.zoom + this.viewW / 2, y: (iy - this.y) * this.zoom + this.viewH / 2 };
  }

  screenToWorld(sx: number, sy: number): Pt {
    const ix = (sx - this.viewW / 2) / this.zoom + this.x;
    const iy = (sy - this.viewH / 2) / this.zoom + this.y;
    return { x: (ix / HALF_W + iy / HALF_H) / 2, y: (iy / HALF_H - ix / HALF_W) / 2 };
  }

  centerOn(wx: number, wy: number) {
    this.x = (wx - wy) * HALF_W;
    this.y = (wx + wy) * HALF_H;
  }

  get center(): Pt { return this.screenToWorld(this.viewW / 2, this.viewH / 2); }

  clamp(mapW: number, mapH: number) {
    this.x = Math.max(-mapH * HALF_W, Math.min(mapW * HALF_W, this.x));
    this.y = Math.max(0, Math.min((mapW + mapH) * HALF_H, this.y));
  }

  zoomAt(factor: number, sx: number, sy: number) {
    const before = this.screenToWorld(sx, sy);
    this.zoom = Math.max(0.35, Math.min(2.2, this.zoom * factor));
    const after = this.screenToWorld(sx, sy);
    const ix = ((before.x - before.y) - (after.x - after.y)) * HALF_W;
    const iy = ((before.x + before.y) - (after.x + after.y)) * HALF_H;
    this.x += ix;
    this.y += iy;
  }
}
