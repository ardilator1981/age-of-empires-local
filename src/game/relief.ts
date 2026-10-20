import { BALANCE } from '../config/balance';
import type { Pt } from '../core/types';
import type { Entity } from './Entity';
import type { MapGenerator } from './MapGenerator';

/**
 * Reglas de relieve comunes a todos los mapas (aleatorios y reales). Se aplican
 * automáticamente después de generar cada mapa (ver Game):
 *
 *  1. Acantilados: las casillas con pendiente > BALANCE.relief.cliffSlope pasan a ser roca
 *     infranqueable (para todas las unidades, también el asedio) y no edificable.
 *  2. Pasos: con un recorrido por regiones (flood fill) se comprueba que las bases de todos
 *     los jugadores están unidas por pasos de al menos `passMinWidth` casillas de ancho. Si
 *     no, se abre el paso más barato por la silla de montaña (el punto más bajo y suave),
 *     suavizando el relieve del corredor, en vez de rechazar el mapa.
 *  3. Recursos clave: desde cada base debe poder llegarse a madera, oro, piedra y comida.
 */

const ROCK = 'rock';

interface Ctx {
  gen: MapGenerator;
  w: number;
  h: number;
  terrainWalk: boolean[];
  water: boolean[];
}

function ctxOf(gen: MapGenerator): Ctx {
  const reg = gen.game.reg;
  return {
    gen, w: gen.w, h: gen.h,
    terrainWalk: reg.terrains.map(t => t.walkable),
    water: reg.terrains.map(t => !!t.water),
  };
}

function removeNodeAt(gen: MapGenerator, x: number, y: number, keep?: (e: Entity) => boolean) {
  const m = gen.game.map;
  const occ = m.occupant[y * m.w + x];
  if (!occ) return;
  const e = gen.game.entities.get(occ);
  if (e && e.kind === 'resource' && !e.dead && !(keep && keep(e))) gen.game.remove(e);
}

// ------------------------------------------------------------------ 1. acantilados

/** Convierte en roca las pendientes infranqueables. Devuelve cuántas casillas cambiaron. */
export function deriveCliffs(gen: MapGenerator): number {
  const reg = gen.game.reg, m = gen.game.map;
  if (!reg.terrains.some(t => t.id === ROCK)) return 0;
  const c = ctxOf(gen);
  const limit = BALANCE.relief.cliffSlope;
  let n = 0;
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const t = m.terrain[y * m.w + x];
    if (!c.terrainWalk[t] || c.water[t] || gen.isProtected(x, y)) continue;
    if (m.slopeOf(x, y, 1) <= limit) continue;
    // Las bases no se tocan
    const occ = m.occupant[y * m.w + x];
    const e = occ ? gen.game.entities.get(occ) : undefined;
    if (e && e.kind === 'building') continue;
    gen.set(x, y, ROCK);
    removeNodeAt(gen, x, y);
    n++;
  }
  if (n) m.obstaclesChanged();
  return n;
}

// ------------------------------------------------------------------ 2. pasos anchos

/** Casillas por las que cabe un paso del ancho mínimo (el terreno transitable alrededor). */
export function wideMask(gen: MapGenerator): Uint8Array {
  const m = gen.game.map, c = ctxOf(gen);
  const r = Math.max(0, Math.floor((BALANCE.relief.passMinWidth - 1) / 2));
  const base = new Uint8Array(m.w * m.h);
  for (let i = 0; i < base.length; i++) base[i] = c.terrainWalk[m.terrain[i]] ? 1 : 0;
  if (r === 0) return base;
  const out = new Uint8Array(m.w * m.h);
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    let ok = base[y * m.w + x] === 1;
    for (let dy = -r; dy <= r && ok; dy++) for (let dx = -r; dx <= r; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue; // el borde del mapa no estrecha
      if (!base[ny * m.w + nx]) { ok = false; break; }
    }
    out[y * m.w + x] = ok ? 1 : 0;
  }
  return out;
}

/** Componentes conexas (8 vecinos) de una máscara. -1 = fuera de la máscara. */
export function components(mask: Uint8Array, w: number, h: number): Int32Array {
  const comp = new Int32Array(w * h).fill(-1);
  const stack: number[] = [];
  let id = 0;
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i] || comp[i] !== -1) continue;
    comp[i] = id;
    stack.push(i);
    while (stack.length) {
      const c = stack.pop()!, cx = c % w, cy = (c / w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx, ny = cy + dy;
        if ((dx || dy) && nx >= 0 && ny >= 0 && nx < w && ny < h) {
          const n = ny * w + nx;
          if (mask[n] && comp[n] === -1) { comp[n] = id; stack.push(n); }
        }
      }
    }
    id++;
  }
  return comp;
}

/** Componente de la casilla de la máscara más cercana a p (busca hasta 12 casillas). */
function compNear(comp: Int32Array, w: number, h: number, p: Pt): number {
  const px = Math.floor(p.x), py = Math.floor(p.y);
  for (let r = 0; r <= 12; r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const x = px + dx, y = py + dy;
      if (x >= 0 && y >= 0 && x < w && y < h && comp[y * w + x] >= 0) return comp[y * w + x];
    }
  }
  return -1;
}

/**
 * Dijkstra multiorigen: camino de menor coste desde cualquier origen a cualquier destino.
 * Con `fourConn` solo usa pasos ortogonales: un corredor de una casilla con pasos en
 * diagonal no sería transitable, porque las unidades no cortan esquinas.
 */
function cheapestPath(w: number, h: number, isSource: (i: number) => boolean, isTarget: (i: number) => boolean, cost: (i: number) => number, fourConn = false): number[] | null {
  const N = w * h;
  const dist = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1);
  const heapI: number[] = [], heapD: number[] = [];
  const push = (i: number, d: number) => {
    heapI.push(i); heapD.push(d);
    for (let k = heapI.length - 1; k > 0;) {
      const p = (k - 1) >> 1;
      if (heapD[p] <= heapD[k]) break;
      [heapI[p], heapI[k]] = [heapI[k], heapI[p]]; [heapD[p], heapD[k]] = [heapD[k], heapD[p]];
      k = p;
    }
  };
  const pop = () => {
    const i = heapI[0], d = heapD[0];
    const li = heapI.pop()!, ld = heapD.pop()!;
    if (heapI.length) {
      heapI[0] = li; heapD[0] = ld;
      for (let k = 0; ;) {
        const l = 2 * k + 1, r = l + 1;
        let mn = k;
        if (l < heapI.length && heapD[l] < heapD[mn]) mn = l;
        if (r < heapI.length && heapD[r] < heapD[mn]) mn = r;
        if (mn === k) break;
        [heapI[mn], heapI[k]] = [heapI[k], heapI[mn]]; [heapD[mn], heapD[k]] = [heapD[k], heapD[mn]];
        k = mn;
      }
    }
    return [i, d] as const;
  };
  for (let i = 0; i < N; i++) if (isSource(i)) { dist[i] = 0; push(i, 0); }
  while (heapI.length) {
    const [i, d] = pop();
    if (d > dist[i]) continue;
    if (isTarget(i)) {
      const out: number[] = [];
      for (let c = i; c !== -1; c = prev[c]) out.push(c);
      return out.reverse();
    }
    const x = i % w, y = (i / w) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      if (fourConn && dx && dy) continue;
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const j = ny * w + nx;
      const c = cost(j);
      if (!isFinite(c)) continue;
      const nd = d + c * (dx && dy ? 1.41421 : 1);
      if (nd < dist[j]) { dist[j] = nd; prev[j] = i; push(j, nd); }
    }
  }
  return null;
}

/**
 * Abre un corredor transitable a lo largo de `path`: quita la roca y el agua profunda,
 * suaviza el relieve para que ninguna casilla supere la pendiente de acantilado y
 * despeja recursos (salvo los que `keep` indique).
 */
function carve(gen: MapGenerator, path: number[], radius: number, keep?: (e: Entity) => boolean) {
  const g = gen.game, m = g.map, W = m.w, c = ctxOf(gen);
  const pts = path.map(i => ({ x: i % W, y: (i / W) | 0 }));
  // Perfil de alturas suavizado y con pendiente limitada a lo largo del corredor
  const prof = pts.map(p => gen.tileHeight(p.x, p.y));
  for (let it = 0; it < 3; it++) {
    for (let k = 1; k < prof.length - 1; k++) prof[k] = (prof[k - 1] + prof[k] * 2 + prof[k + 1]) / 4;
  }
  const maxStep = BALANCE.relief.cliffSlope * 0.45;
  for (let k = 1; k < prof.length; k++) prof[k] = Math.min(prof[k], prof[k - 1] + maxStep);
  for (let k = prof.length - 2; k >= 0; k--) prof[k] = Math.min(prof[k], prof[k + 1] + maxStep);
  const VW = m.w + 1;
  pts.forEach((p, k) => {
    for (let vy = p.y - radius; vy <= p.y + 1 + radius; vy++) for (let vx = p.x - radius; vx <= p.x + 1 + radius; vx++) {
      if (vx < 0 || vy < 0 || vx > m.w || vy > m.h) continue;
      const d = Math.max(Math.abs(vx - (p.x + 0.5)), Math.abs(vy - (p.y + 0.5)));
      const wgt = d <= radius + 0.5 ? 1 : 0.5;
      const i = vy * VW + vx;
      m.heights[i] = m.heights[i] + (prof[k] - m.heights[i]) * wgt;
    }
  });
  m.heightVersion++;
  for (const p of pts) {
    for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
      const x = p.x + dx, y = p.y + dy;
      if (!m.inBounds(x, y)) continue;
      const t = m.terrain[y * W + x];
      if (c.water[t] && !c.terrainWalk[t]) gen.set(x, y, 'shallows');
      else if (!c.terrainWalk[t]) gen.set(x, y, 'dirt');
      gen.protect[y * W + x] = 1;
      removeNodeAt(gen, x, y, keep);
    }
  }
  m.obstaclesChanged();
}

export interface PlayableReport {
  /** Pasos abiertos para unir bases separadas. */
  passesOpened: number;
  /** Accesos abiertos a recursos clave. */
  resourceLinks: number;
  /** ¿Están todas las bases conectadas al final? */
  connected: boolean;
}

/** Garantiza pasos anchos entre todas las bases y acceso a sus recursos clave. */
export function ensurePlayable(gen: MapGenerator, starts: Pt[]): PlayableReport {
  const g = gen.game, m = g.map, W = m.w, H = m.h, c = ctxOf(gen);
  const report: PlayableReport = { passesOpened: 0, resourceLinks: 0, connected: true };
  const r = Math.max(1, Math.floor((BALANCE.relief.passMinWidth - 1) / 2));

  // --- pasos anchos entre bases (solo cuenta el terreno: roca y agua profunda)
  for (let iter = 0; iter < 12 && starts.length > 1; iter++) {
    const comp = components(wideMask(gen), W, H);
    const sc = starts.map(s => compNear(comp, W, H, s));
    const other = sc.findIndex(v => v !== sc[0]);
    if (other < 0) break;
    const from = sc[0], to = sc[other];
    const path = cheapestPath(W, H, i => comp[i] === from, i => comp[i] === to, i => {
      const t = m.terrain[i], x = i % W, y = (i / W) | 0;
      const sl = m.slopeOf(x, y, 1), hgt = gen.tileHeight(x, y);
      let cost = 1 + sl * 1.5 + hgt * 0.3; // preferir sillas: bajas y suaves
      if (!c.terrainWalk[t]) cost += c.water[t] ? 6 : 10 + sl * 4;
      else if (comp[i] < 0) cost += 1.5;
      return cost;
    });
    if (!path) break;
    carve(gen, path, r);
    report.passesOpened++;
  }

  // --- conexión completa (incluidos bosques cerrados) y recursos clave
  const blockCost = (i: number, keepRes?: string): number => {
    const t = m.terrain[i];
    if (!c.terrainWalk[t]) return c.water[t] ? 8 : 14;
    const occ = m.occupant[i];
    if (!occ) return 1;
    const e = g.entities.get(occ);
    if (!e || e.dead) return 1;
    if (e.kind === 'building') return Infinity;
    if (e.kind === 'resource' && (e.resType === 'gold' || e.resType === 'stone') && e.resType !== keepRes) return Infinity;
    return 4;
  };
  const regionNear = (p: Pt) => {
    const f = g.findFreeTile(p.x, p.y, 12);
    return f ? m.region(Math.floor(f.x), Math.floor(f.y)) : -1;
  };
  for (let iter = 0; iter < 8 && starts.length > 1; iter++) {
    const regs = starts.map(regionNear);
    const other = regs.findIndex(v => v !== regs[0]);
    if (other < 0) break;
    const a = regs[0], b = regs[other];
    const path = cheapestPath(W, H, i => m.region(i % W, (i / W) | 0) === a, i => m.region(i % W, (i / W) | 0) === b, i => blockCost(i), true);
    if (!path) break;
    carve(gen, path, 0, e => e.resType === 'gold' || e.resType === 'stone');
    report.passesOpened++;
  }

  const KEY = ['wood', 'food', 'gold', 'stone'];
  for (const s of starts) {
    for (const res of KEY) {
      const reg0 = regionNear(s);
      const near = g.nodes.filter(n => !n.dead && n.resType === res && Math.hypot(n.x - s.x, n.y - s.y) < 30)
        .sort((p, q) => Math.hypot(p.x - s.x, p.y - s.y) - Math.hypot(q.x - s.x, q.y - s.y));
      if (!near.length) continue;
      const reachable = near.some(n => m.rectTouchesRegion(n.tx, n.ty, n.tx, n.ty, reg0, false));
      if (reachable) continue;
      const target = near[0];
      const path = cheapestPath(W, H, i => m.region(i % W, (i / W) | 0) === reg0,
        i => Math.max(Math.abs((i % W) - target.tx), Math.abs(((i / W) | 0) - target.ty)) === 1,
        i => blockCost(i, res), true);
      if (!path) continue;
      carve(gen, path, 0, e => e === target || ((e.resType === 'gold' || e.resType === 'stone') && e.resType === res));
      report.resourceLinks++;
    }
  }

  // --- unidades que hayan quedado sobre un obstáculo
  for (const u of g.units) {
    if (m.walkable(Math.floor(u.x), Math.floor(u.y))) continue;
    const p = g.findFreeTile(u.x, u.y, 10);
    if (p) { u.x = u.px = p.x; u.y = u.py = p.y; }
  }

  const regs = starts.map(regionNear);
  report.connected = regs.every(v => v === regs[0]);
  return report;
}
