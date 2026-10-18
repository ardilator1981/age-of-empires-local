import type { Pt } from '../core/types';
import type { Game } from './Game';
import type { Player } from './Player';

/**
 * Herramientas para que los tipos de mapa generen terreno, bosques, recursos y
 * bases de jugadores. Un MapTypeDef recibe una instancia y la usa a su gusto.
 */
export class MapGenerator {
  readonly w: number;
  readonly h: number;
  readonly rng: () => number;
  /** 1 = zona protegida (no se ponen bosques ni agua). */
  readonly protect: Uint8Array;
  private noiseSeed: number;

  constructor(public game: Game) {
    this.w = game.map.w;
    this.h = game.map.h;
    this.rng = game.rng;
    this.protect = new Uint8Array(this.w * this.h);
    this.noiseSeed = Math.floor(this.rng() * 100000);
  }

  get players(): Player[] { return this.game.players.slice(1); }

  rand(min: number, max: number) { return min + this.rng() * (max - min); }
  randInt(min: number, max: number) { return Math.floor(this.rand(min, max + 1)); }

  // ------------------------------------------------------------ terreno

  fill(terrainId: string) { this.game.map.terrain.fill(this.game.reg.terrain(terrainId)); this.game.map.version++; }

  set(x: number, y: number, terrainId: string) {
    const m = this.game.map;
    if (!m.inBounds(x, y)) return;
    m.terrain[y * m.w + x] = this.game.reg.terrain(terrainId);
    m.version++;
  }

  terrainAt(x: number, y: number): string { return this.game.map.terrainDef(x, y).id; }

  /** Ruido suave determinista en [0, 1]. */
  noise(x: number, y: number, scale = 6): number {
    const s = this.noiseSeed;
    const hash = (ix: number, iy: number) => {
      let h = (ix * 374761393 + iy * 668265263 + s * 2147483647) | 0;
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    };
    const fx = x / scale, fy = y / scale;
    const ix = Math.floor(fx), iy = Math.floor(fy);
    const tx = fx - ix, ty = fy - iy;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  }

  /** Recorre las casillas de un círculo irregular. */
  blob(cx: number, cy: number, r: number, fn: (x: number, y: number) => void, roughness = 0.45) {
    const R = Math.ceil(r * (1 + roughness));
    for (let y = Math.floor(cy - R); y <= cy + R; y++) {
      for (let x = Math.floor(cx - R); x <= cx + R; x++) {
        if (!this.game.map.inBounds(x, y)) continue;
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        const lim = r * (1 - roughness / 2 + roughness * this.noise(x, y, 3.5));
        if (d <= lim) fn(x, y);
      }
    }
  }

  isProtected(x: number, y: number) { return this.protect[y * this.w + x] === 1; }

  protectCircle(cx: number, cy: number, r: number) {
    for (let y = Math.floor(cy - r); y <= cy + r; y++)
      for (let x = Math.floor(cx - r); x <= cx + r; x++)
        if (this.game.map.inBounds(x, y) && Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r) this.protect[y * this.w + x] = 1;
  }

  /** Protege una franja entre dos puntos (para garantizar caminos). */
  protectLine(a: Pt, b: Pt, width: number) {
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.ceil(d * 2);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const wob = (this.noise(i, 7, 9) - 0.5) * 6;
      const nx = -(b.y - a.y) / (d || 1), ny = (b.x - a.x) / (d || 1);
      this.protectCircle(a.x + (b.x - a.x) * t + nx * wob, a.y + (b.y - a.y) * t + ny * wob, width);
    }
  }

  /** Pone arena en las casillas caminables junto al agua. */
  shores(waterId = 'water', sandId = 'sand') {
    const m = this.game.map, water = this.game.reg.terrain(waterId);
    const toSand: number[] = [];
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (m.terrain[y * m.w + x] === water) continue;
      let near = false;
      for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (m.inBounds(nx, ny) && m.terrain[ny * m.w + nx] === water) { near = true; break; }
      }
      if (near) toSand.push(y * m.w + x);
    }
    const sand = this.game.reg.terrain(sandId);
    for (const i of toSand) m.terrain[i] = sand;
    m.version++;
  }

  // ------------------------------------------------------------ posiciones de inicio

  startPositions(radiusFrac = 0.36): Pt[] {
    const n = this.players.length;
    const off = this.rng() * Math.PI * 2;
    const cx = this.w / 2, cy = this.h / 2, r = Math.min(this.w, this.h) * radiusFrac;
    const out: Pt[] = [];
    for (let i = 0; i < n; i++) {
      const a = off + (i / n) * Math.PI * 2 + (this.rng() - 0.5) * 0.3;
      out.push({ x: Math.round(cx + Math.cos(a) * r), y: Math.round(cy + Math.sin(a) * r) });
    }
    return out;
  }

  // ------------------------------------------------------------ recursos

  canPlaceNode(x: number, y: number, respectProtect: boolean): boolean {
    const m = this.game.map;
    if (!m.inBounds(x, y) || !m.buildable(x, y)) return false;
    if (respectProtect && this.isProtected(x, y)) return false;
    return true;
  }

  placeNode(nodeId: string, x: number, y: number, respectProtect = true): boolean {
    if (!this.canPlaceNode(x, y, respectProtect)) return false;
    const def = this.game.reg.resourceNodes.get(nodeId);
    if (def?.groundTerrain) this.set(x, y, def.groundTerrain);
    this.game.spawnNode(nodeId, x, y);
    return true;
  }

  /** Grupo compacto de `count` nodos que crece desde (cx, cy). */
  cluster(nodeId: string, cx: number, cy: number, count: number, respectProtect = true): number {
    const frontier: Pt[] = [{ x: Math.floor(cx), y: Math.floor(cy) }];
    const seen = new Set<number>([Math.floor(cy) * this.w + Math.floor(cx)]);
    let placed = 0, guard = 0;
    while (frontier.length && placed < count && guard++ < count * 20) {
      const k = Math.floor(this.rng() * Math.min(frontier.length, 4));
      const p = frontier.splice(k, 1)[0];
      if (!this.placeNode(nodeId, p.x, p.y, respectProtect)) continue;
      placed++;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = p.x + dx, ny = p.y + dy, key = ny * this.w + nx;
        if (!seen.has(key) && this.game.map.inBounds(nx, ny)) { seen.add(key); frontier.push({ x: nx, y: ny }); }
      }
    }
    return placed;
  }

  /** Bosque irregular de radio r. */
  forest(cx: number, cy: number, r: number, density = 0.9, nodeId = 'tree') {
    this.blob(cx, cy, r, (x, y) => { if (this.rng() < density) this.placeNode(nodeId, x, y); });
  }

  /** ¿Está libre un cuadrado de lado 2r+1 alrededor de (x, y)? */
  areaFree(x: number, y: number, r: number, respectProtect: boolean): boolean {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (!this.canPlaceNode(x + dx, y + dy, respectProtect)) return false;
    }
    return true;
  }

  /** Busca un punto libre a una distancia entre minD y maxD de (cx, cy). */
  findSpot(cx: number, cy: number, minD: number, maxD: number, freeR = 1, respectProtect = false, tries = 80): Pt | null {
    for (let i = 0; i < tries; i++) {
      const a = this.rng() * Math.PI * 2, d = this.rand(minD, maxD);
      const x = Math.round(cx + Math.cos(a) * d), y = Math.round(cy + Math.sin(a) * d);
      if (this.areaFree(x, y, freeR, respectProtect)) return { x, y };
    }
    return null;
  }

  /** Recursos sueltos por el mapa, lejos de las bases. */
  scatter(nodeId: string, groups: number, perGroup: number, minDistFromStarts: number, starts: Pt[]) {
    for (let g = 0; g < groups; g++) {
      for (let t = 0; t < 40; t++) {
        const x = this.randInt(3, this.w - 4), y = this.randInt(3, this.h - 4);
        if (starts.some(s => Math.hypot(s.x - x, s.y - y) < minDistFromStarts)) continue;
        if (!this.areaFree(x, y, 1, true)) continue;
        this.cluster(nodeId, x, y, perGroup);
        break;
      }
    }
  }

  /** Bosques repartidos por el mapa. */
  forests(count: number, minR: number, maxR: number, starts: Pt[], minDistFromStarts = 13) {
    for (let i = 0; i < count; i++) {
      for (let t = 0; t < 30; t++) {
        const x = this.randInt(0, this.w - 1), y = this.randInt(0, this.h - 1);
        if (starts.some(s => Math.hypot(s.x - x, s.y - y) < minDistFromStarts)) continue;
        this.forest(x, y, this.rand(minR, maxR));
        break;
      }
    }
  }

  // ------------------------------------------------------------ bases

  /** Coloca el centro urbano, las unidades iniciales y los recursos de la base. */
  base(player: Player, at: Pt) {
    const g = this.game, setup = g.reg.setup;
    const tcDef = g.reg.building(setup.townCenter);
    const tx = Math.round(at.x - tcDef.size / 2), ty = Math.round(at.y - tcDef.size / 2);
    for (let y = ty - 1; y < ty + tcDef.size + 1; y++) for (let x = tx - 1; x < tx + tcDef.size + 1; x++) {
      const m = g.map;
      if (m.inBounds(x, y) && m.occupant[y * m.w + x]) g.remove(g.entities.get(m.occupant[y * m.w + x])!);
    }
    this.blob(at.x, at.y, 6, (x, y) => { if (this.terrainAt(x, y) !== 'water') this.set(x, y, 'dirt'); }, 0.6);
    const tc = g.placeBuilding(setup.townCenter, player.id, tx, ty, true);

    for (const su of setup.startingUnits) {
      if (!g.reg.units.has(su.unit)) continue;
      for (let i = 0; i < su.count; i++) {
        const p = g.findFreeTile(tc.x + this.rand(-1, 3), tc.y + tcDef.size / 2 + 1 + this.rand(0, 1.5), 6);
        if (p) g.spawnUnit(su.unit, player.id, p.x + this.rand(-0.2, 0.2), p.y + this.rand(-0.2, 0.2));
      }
    }

    const keepAway = tcDef.size / 2 + 2.5;
    for (const spec of setup.baseResources) {
      if (!g.reg.resourceNodes.has(spec.node)) continue;
      for (let t = 0; t < 60; t++) {
        const spot = this.findSpot(at.x, at.y, Math.max(spec.minDist, keepAway), spec.maxDist, 1, false, 1);
        if (!spot) continue;
        this.cluster(spec.node, spot.x, spot.y, spec.count, false);
        break;
      }
    }
  }
}
