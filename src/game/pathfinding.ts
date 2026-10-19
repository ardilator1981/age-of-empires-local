import { BALANCE } from '../config/balance';
import type { Pt } from '../core/types';
import type { GameMap } from './GameMap';

/** Rectángulo objetivo en casillas (inclusivo). */
export interface GoalRect { x0: number; y0: number; x1: number; y1: number }

let cap = 0;
let gScore = new Float32Array(0);
let parent = new Int32Array(0);
let seen = new Uint32Array(0);
let closed = new Uint32Array(0);
let stamp = 0;

class Heap {
  ids: number[] = [];
  fs: number[] = [];
  get size() { return this.ids.length; }
  clear() { this.ids.length = 0; this.fs.length = 0; }
  push(id: number, f: number) {
    const ids = this.ids, fs = this.fs;
    ids.push(id); fs.push(f);
    let i = ids.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (fs[p] <= fs[i]) break;
      [ids[p], ids[i]] = [ids[i], ids[p]];
      [fs[p], fs[i]] = [fs[i], fs[p]];
      i = p;
    }
  }
  pop(): number {
    const ids = this.ids, fs = this.fs;
    const top = ids[0];
    const lastId = ids.pop()!, lastF = fs.pop()!;
    if (ids.length) {
      ids[0] = lastId; fs[0] = lastF;
      let i = 0;
      const n = ids.length;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < n && fs[l] < fs[m]) m = l;
        if (r < n && fs[r] < fs[m]) m = r;
        if (m === i) break;
        [ids[m], ids[i]] = [ids[i], ids[m]];
        [fs[m], fs[i]] = [fs[i], fs[m]];
        i = m;
      }
    }
    return top;
  }
}
const heap = new Heap();
const DX = [1, -1, 0, 0, 1, 1, -1, -1];
const DY = [0, 0, 1, -1, 1, -1, 1, -1];

/**
 * A* en rejilla con 8 direcciones. Llega a cualquier casilla caminable dentro del
 * rectángulo objetivo ampliado `near` casillas. Si no hay camino, devuelve el
 * camino hasta la casilla alcanzable más cercana (reached = false).
 */
export function findPath(map: GameMap, sx: number, sy: number, goal: GoalRect, near: number, maxNodes = 6000): { path: Pt[]; reached: boolean } {
  const W = map.w, H = map.h, N = W * H;
  if (N > cap) {
    cap = N;
    gScore = new Float32Array(N); parent = new Int32Array(N);
    seen = new Uint32Array(N); closed = new Uint32Array(N);
  }
  const st = ++stamp;
  // El desnivel entre casillas encarece el camino: se prefieren el llano y los pasos
  const th = map.tileHeights(), slopeCost = BALANCE.pathfinding.slopeCost;
  const sxi = Math.min(W - 1, Math.max(0, Math.floor(sx)));
  const syi = Math.min(H - 1, Math.max(0, Math.floor(sy)));
  const start = syi * W + sxi;
  const gx0 = goal.x0 - near, gx1 = goal.x1 + near, gy0 = goal.y0 - near, gy1 = goal.y1 + near;
  const hfn = (x: number, y: number) => {
    const dx = Math.max(gx0 - x, 0, x - gx1), dy = Math.max(gy0 - y, 0, y - gy1);
    return dx > dy ? dx + 0.4142 * dy : dy + 0.4142 * dx;
  };
  heap.clear();
  gScore[start] = 0; seen[start] = st; parent[start] = -1;
  heap.push(start, hfn(sxi, syi));
  let best = start, bestH = hfn(sxi, syi), expanded = 0, found = -1;

  while (heap.size) {
    const cur = heap.pop();
    if (closed[cur] === st) continue;
    closed[cur] = st;
    const cx = cur % W, cy = (cur / W) | 0;
    const hc = hfn(cx, cy);
    if (hc === 0) { found = cur; break; }
    if (hc < bestH) { bestH = hc; best = cur; }
    if (++expanded > maxNodes) break;
    const gc = gScore[cur];
    for (let k = 0; k < 8; k++) {
      const nx = cx + DX[k], ny = cy + DY[k];
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      if (!map.walkable(nx, ny)) continue;
      if (k >= 4 && (!map.walkable(cx + DX[k], cy) || !map.walkable(cx, cy + DY[k]))) continue;
      const n = ny * W + nx;
      if (closed[n] === st) continue;
      const ng = gc + (k >= 4 ? 1.41421 : 1) + slopeCost * Math.abs(th[n] - th[cur]);
      if (seen[n] !== st || ng < gScore[n]) {
        seen[n] = st; gScore[n] = ng; parent[n] = cur;
        heap.push(n, ng + hfn(nx, ny) * 1.001);
      }
    }
  }

  const end = found >= 0 ? found : best;
  if (end === start) return { path: [], reached: found >= 0 };
  const tiles: number[] = [];
  for (let c = end; c !== start && c !== -1; c = parent[c]) tiles.push(c);
  tiles.reverse();
  return { path: tiles.map(t => ({ x: (t % W) + 0.5, y: ((t / W) | 0) + 0.5 })), reached: found >= 0 };
}

/** ¿Puede una unidad de radio r ir en línea recta de A a B? */
export function lineClear(map: GameMap, ax: number, ay: number, bx: number, by: number, r = 0.2): boolean {
  const d = Math.hypot(bx - ax, by - ay);
  const steps = Math.max(1, Math.ceil(d / 0.25));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
    if (!map.walkable(Math.floor(x - r), Math.floor(y - r)) || !map.walkable(Math.floor(x + r), Math.floor(y - r)) ||
        !map.walkable(Math.floor(x - r), Math.floor(y + r)) || !map.walkable(Math.floor(x + r), Math.floor(y + r))) return false;
  }
  return true;
}

/** Elimina puntos intermedios innecesarios para que las unidades no zigzagueen. */
export function smoothPath(map: GameMap, sx: number, sy: number, pts: Pt[]): Pt[] {
  if (pts.length <= 1) return pts;
  const out: Pt[] = [];
  let ax = sx, ay = sy, i = 0;
  while (i < pts.length) {
    let j = Math.min(pts.length - 1, i + 14);
    for (; j > i; j--) if (lineClear(map, ax, ay, pts[j].x, pts[j].y)) break;
    out.push(pts[j]);
    ax = pts[j].x; ay = pts[j].y;
    i = j + 1;
  }
  return out;
}
