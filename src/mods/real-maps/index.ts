import { BALANCE } from '../../config/balance';
import { DEFAULT_VISUAL_RELIEF, ELEV_PX, MAX_VISUAL_RELIEF, REAL_RELIEF_FRACTION } from '../../core/constants';
import type { GameMod, MapRegionInfo, MapTypeDef, Pt } from '../../core/types';
import type { MapGenerator } from '../../game/MapGenerator';
import REGION_LIST from './regions.json';

/**
 * MAPAS REALES: cada JSON de ./data (generado con `npm run real-map`) se registra como un mapa.
 * El relieve, el agua, los bosques y los pueblos salen de datos geográficos reales; el mod los
 * adapta al tamaño de mapa elegido y garantiza que los jugadores puedan alcanzarse.
 */

export interface RealMapData {
  format: number;
  id: string;
  name: string;
  description: string;
  attribution: string[];
  source: { center: [number, number]; dem: string; osm: boolean; sideMeters: number; rotation: number };
  /** Lado del mapa en casillas (los datos se reescalan al tamaño de la partida). */
  size: number;
  metersPerTile: number;
  /** Nivel de juego → metros: min + nivel * metersPerLevel. */
  elevation: { min: number; max: number; metersPerLevel: number };
  snowLine: number;
  pineLine: number;
  /** Si falta, se usa BALANCE.relief.realRockSlopeDeg. */
  rockSlopeDeg?: number;
  /** temperate (por defecto) o arid (desierto con vegetación junto al agua). */
  biome?: string;
  preferredStarts?: string[];
  /** Una fila de caracteres por fila de casillas (ver `legend`). */
  terrain: string[];
  /** Alturas de los vértices ((size+1)², en niveles). */
  heights: number[];
  rivers: { name: string; kind: 'river' | 'stream' | 'canal'; points: [number, number][] }[];
  settlements: { name: string; kind: string; x: number; y: number; population?: number }[];
}

/** Metadatos de las regiones (src/mods/real-maps/regions.json): se listan sin cargar los datos. */
export interface RegionMeta {
  id: string; name: string; country: string; category: string;
  lat: number; lon: number; sizeKm: number; biome?: string; snowLine?: number; starts?: string[];
  description: string;
}
export const REGIONS: RegionMeta[] = REGION_LIST as RegionMeta[];

/** Los datos de cada región van en su propio fichero y se cargan al elegirla (no pesan en el arranque). */
const loaders = import.meta.glob<RealMapData>('./data/*.json', { import: 'default' });
const cache = new Map<string, RealMapData>();
const idOf = (path: string) => path.replace(/^.*\/(.*)\.json$/, '$1');
async function loadData(id: string): Promise<RealMapData> {
  const hit = cache.get(id);
  if (hit) return hit;
  const loader = Object.entries(loaders).find(([path]) => idOf(path) === id)?.[1];
  if (!loader) throw new Error(`No hay datos para el mapa real "${id}" (ejecuta npm run regions)`);
  const d = await loader();
  cache.set(id, d);
  return d;
}
/** Ids de las regiones que tienen datos generados. */
export const AVAILABLE = new Set(Object.keys(loaders).map(idOf));

/** Vecinos en 8 direcciones con su coste. */
const DIRS: [number, number, number][] = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];

function generateReal(gen: MapGenerator, d: RealMapData) {
  const g = gen.game, m = g.map, W = gen.w, H = gen.h;
  const s = d.size / W; // casillas de datos por casilla de juego
  const mpt = d.metersPerTile * s, mpl = d.elevation.metersPerLevel;
  const N = d.size;

  // ---------------- relieve (bilineal desde la rejilla de datos)
  const dh = (u: number, v: number) => d.heights[Math.min(N, Math.max(0, v)) * (N + 1) + Math.min(N, Math.max(0, u))];
  for (let vy = 0; vy <= H; vy++) for (let vx = 0; vx <= W; vx++) {
    const u = vx * s, v = vy * s, u0 = Math.floor(u), v0 = Math.floor(v), fu = u - u0, fv = v - v0;
    m.heights[vy * (W + 1) + vx] = (dh(u0, v0) * (1 - fu) + dh(u0 + 1, v0) * fu) * (1 - fv) + (dh(u0, v0 + 1) * (1 - fu) + dh(u0 + 1, v0 + 1) * fu) * fv;
  }
  m.heightVersion++;

  const cls = (x: number, y: number) => {
    const u = Math.min(N - 1, Math.floor((x + 0.5) * s)), v = Math.min(N - 1, Math.floor((y + 0.5) * s));
    return d.terrain[v]?.[u] ?? '.';
  };
  const elevAt = (x: number, y: number) => d.elevation.min + gen.tileHeight(x, y) * mpl;
  const slopeDeg = (x: number, y: number) => {
    const h00 = m.vh(x, y), h10 = m.vh(x + 1, y), h01 = m.vh(x, y + 1), h11 = m.vh(x + 1, y + 1);
    const gx = (h10 + h11 - h00 - h01) / 2, gy = (h01 + h11 - h00 - h10) / 2;
    return Math.atan((Math.hypot(gx, gy) * mpl) / mpt) * 180 / Math.PI;
  };
  const idx = (x: number, y: number) => y * W + x;
  const rockSlope = d.rockSlopeDeg ?? BALANCE.relief.realRockSlopeDeg;
  // Escala visual: una fracción de la escala vertical real (los datos comprimen el desnivel en ~10 niveles)
  const trueMpl = (mpt * ELEV_PX) / Math.hypot(32, 16);
  m.visualRelief = Math.max(DEFAULT_VISUAL_RELIEF, Math.min(MAX_VISUAL_RELIEF, (REAL_RELIEF_FRACTION * mpl) / trueMpl));
  const arid = d.biome === 'arid';

  // ---------------- agua: lagos de OSM y ríos trazados (1 = agua, 2 = vado / arroyo)
  const water = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (cls(x, y) === 'w') water[idx(x, y)] = 1;
  // Mar: casillas a cota ~0 conectadas con el borde del mapa (el relieve no distingue el mar de la costa)
  if (d.elevation.min <= 0.5) {
    const sea = (x: number, y: number) => elevAt(x, y) <= 0.5;
    const stack: number[] = [];
    for (let i = 0; i < W; i++) for (const [x, y] of [[i, 0], [i, H - 1], [0, i], [W - 1, i]]) {
      if (y < H && sea(x, y) && water[idx(x, y)] !== 1) { water[idx(x, y)] = 1; stack.push(idx(x, y)); }
    }
    while (stack.length) {
      const c = stack.pop()!, cx = c % W, cy = (c / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (!m.inBounds(nx, ny) || water[idx(nx, ny)] === 1 || !sea(nx, ny)) continue;
        water[idx(nx, ny)] = 1;
        stack.push(idx(nx, ny));
      }
    }
  }
  const stroke = (pts: Pt[], r: number, val: number) => {
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], b = pts[i + 1], len = Math.hypot(b.x - a.x, b.y - a.y), steps = Math.max(1, Math.ceil(len * 3));
      for (let k = 0; k <= steps; k++) {
        const cx = a.x + (b.x - a.x) * k / steps, cy = a.y + (b.y - a.y) * k / steps;
        for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
          if (!m.inBounds(x, y) || Math.hypot(x + 0.5 - cx, y + 0.5 - cy) > r) continue;
          const i = idx(x, y);
          if (water[i] !== 1) water[i] = val === 1 ? 1 : Math.max(water[i], val);
        }
      }
    }
  };
  const lineLen = (pts: Pt[]) => pts.reduce((sum, p, i) => i ? sum + Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) : 0, 0);
  const rivers = d.rivers.map(r => ({ ...r, pts: r.points.map(([x, y]) => ({ x: x / s, y: y / s })) }));
  // Longitud total por nombre: los arroyos con nombre y recorrido largo se dibujan como vados
  const byName = new Map<string, number>();
  for (const r of rivers) if (r.name) byName.set(r.name, (byName.get(r.name) ?? 0) + lineLen(r.pts));
  const riverR = Math.max(0.75, Math.min(1.3, 50 / mpt));
  for (const r of rivers) {
    if (r.kind === 'river') stroke(r.pts, riverR, 1);
    else if (r.name && (byName.get(r.name) ?? 0) > W * 0.35) stroke(r.pts, 0.5, 2);
  }

  // ---------------- posiciones de inicio en los asentamientos reales
  const n = gen.players.length;
  const rank: Record<string, number> = { city: 0, town: 1, village: 2, hamlet: 3 };
  const prefs = d.preferredStarts ?? [];
  const towns = d.settlements
    .map(t => ({ ...t, x: t.x / s, y: t.y / s }))
    .filter(t => t.x > 8 && t.y > 8 && t.x < W - 8 && t.y < H - 8)
    .map(t => ({ ...t, score: (prefs.includes(t.name) ? -100 + prefs.indexOf(t.name) : 0) + (rank[t.kind] ?? 4) * 10 - Math.log10(1 + (t.population ?? 0)) }))
    .sort((a, b) => a.score - b.score);
  /** Mejor sitio para una base cerca de p: sin agua ni pendientes fuertes alrededor. */
  const siteCost = (x: number, y: number) => {
    let c = 0;
    for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) {
      const tx = x + dx, ty = y + dy;
      if (!m.inBounds(tx, ty)) { c += 50; continue; }
      const r = Math.hypot(dx, dy);
      if (r > 6.5) continue;
      if (water[idx(tx, ty)]) c += r < 4.5 ? 60 : 8;
      if (cls(tx, ty) === 'r' || slopeDeg(tx, ty) > rockSlope) c += 15;
      c += gen.tileSlope(tx, ty) * 2;
    }
    return c;
  };
  const adjust = (p: Pt): Pt => {
    let best = { x: Math.round(p.x), y: Math.round(p.y) }, bestC = Infinity;
    for (let dy = -10; dy <= 10; dy++) for (let dx = -10; dx <= 10; dx++) {
      const x = Math.round(p.x) + dx, y = Math.round(p.y) + dy;
      if (x < 8 || y < 8 || x > W - 9 || y > H - 9 || Math.hypot(dx, dy) > 10) continue;
      const c = siteCost(x, y) + Math.hypot(dx, dy) * 3;
      if (c < bestC) { bestC = c; best = { x, y }; }
    }
    return best;
  };
  const minD = Math.min(W, H) * (n <= 2 ? 0.38 : n <= 4 ? 0.26 : 0.18);
  const chosen: { p: Pt; name: string }[] = [];
  for (const t of towns) {
    if (chosen.length >= n) break;
    if (chosen.every(c => Math.hypot(c.p.x - t.x, c.p.y - t.y) >= minD)) chosen.push({ p: { x: t.x, y: t.y }, name: t.name });
  }
  // Si no hay bastantes pueblos separados, el punto más lejano de los elegidos
  while (chosen.length < n) {
    let best: Pt = { x: W / 2, y: H / 2 }, bestD = -1;
    for (let k = 0; k < 400; k++) {
      const x = gen.randInt(10, W - 11), y = gen.randInt(10, H - 11);
      if (water[idx(x, y)] || slopeDeg(x, y) > rockSlope * 0.6) continue;
      const dist = chosen.length ? Math.min(...chosen.map(c => Math.hypot(c.p.x - x, c.p.y - y))) : Math.hypot(x - W / 2, y - H / 2) * -1 + W;
      if (dist > bestD) { bestD = dist; best = { x, y }; }
    }
    chosen.push({ p: best, name: '' });
  }
  // El orden de los jugadores se baraja para que el humano no empiece siempre en el mismo sitio
  for (let i = chosen.length - 1; i > 0; i--) { const j = gen.randInt(0, i); [chosen[i], chosen[j]] = [chosen[j], chosen[i]]; }
  const starts = chosen.map(c => adjust(c.p));
  g.data.realMap = { id: d.id, starts: chosen.map((c, i) => ({ player: gen.players[i].id, settlement: c.name, at: starts[i] })) };

  // ---------------- caminos: ruta de menor coste (por los valles) entre las bases
  const tileCost = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const sl = slopeDeg(x, y), c = cls(x, y);
    tileCost[idx(x, y)] = 1 + (sl / 10) ** 2 + (water[idx(x, y)] === 1 ? 12 : water[idx(x, y)] ? 2 : 0) + (c === 'r' ? 10 : 0) + (sl > rockSlope ? 20 : 0);
  }
  const route = (a: Pt, b: Pt): Pt[] => {
    const dist = new Float64Array(W * H).fill(Infinity), prev = new Int32Array(W * H).fill(-1);
    const heap: [number, number][] = [];
    const push = (c: number, i: number) => {
      heap.push([c, i]);
      for (let k = heap.length - 1; k > 0;) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; }
    };
    const pop = () => {
      const top = heap[0], last = heap.pop()!;
      if (heap.length) {
        heap[0] = last;
        for (let k = 0; ;) {
          const l = 2 * k + 1, r = l + 1;
          let mn = k;
          if (l < heap.length && heap[l][0] < heap[mn][0]) mn = l;
          if (r < heap.length && heap[r][0] < heap[mn][0]) mn = r;
          if (mn === k) break;
          [heap[mn], heap[k]] = [heap[k], heap[mn]]; k = mn;
        }
      }
      return top;
    };
    const s0 = idx(a.x, a.y), goal = idx(b.x, b.y);
    dist[s0] = 0; push(0, s0);
    while (heap.length) {
      const [c, i] = pop();
      if (i === goal) break;
      if (c > dist[i]) continue;
      const x = i % W, y = (i / W) | 0;
      for (const [dx, dy, k] of DIRS) {
        const nx = x + dx, ny = y + dy;
        if (!m.inBounds(nx, ny)) continue;
        const j = idx(nx, ny), nc = c + k * (tileCost[i] + tileCost[j]) / 2;
        if (nc < dist[j]) { dist[j] = nc; prev[j] = i; push(nc, j); }
      }
    }
    const out: Pt[] = [];
    for (let i = goal; i >= 0; i = prev[i]) out.push({ x: i % W + 0.5, y: ((i / W) | 0) + 0.5 });
    return out.reverse();
  };
  // Árbol de expansión: cada base se une a la más cercana de las ya conectadas
  const roads: Pt[][] = [];
  const linked = [0];
  while (linked.length < starts.length) {
    let bi = -1, bj = -1, bd = Infinity;
    for (const i of linked) for (let j = 0; j < starts.length; j++) {
      if (linked.includes(j)) continue;
      const dd = Math.hypot(starts[i].x - starts[j].x, starts[i].y - starts[j].y);
      if (dd < bd) { bd = dd; bi = i; bj = j; }
    }
    roads.push(route(starts[bi], starts[bj]));
    linked.push(bj);
  }
  starts.forEach(p => gen.protectCircle(p.x, p.y, 12));
  for (const r of roads) for (let i = 0; i < r.length; i += 1) gen.protectCircle(r[i].x, r[i].y, 1.6);

  // ---------------- terreno
  gen.fill(arid ? 'desert' : 'grass');
  // En el desierto solo es fértil la franja junto al agua (y los cultivos de OpenStreetMap)
  const nearWater = new Uint8Array(W * H);
  if (arid) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!water[idx(x, y)]) continue;
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) if (m.inBounds(x + dx, y + dy) && Math.hypot(dx, dy) <= 4.5) nearWater[idx(x + dx, y + dy)] = 1;
    }
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = cls(x, y), e = elevAt(x, y), sl = slopeDeg(x, y), prot = gen.isProtected(x, y);
    const high = e > d.snowLine + (gen.noise(x, y, 4) - 0.5) * 120;
    if (!prot && (c === 'r' || sl > rockSlope)) gen.set(x, y, 'rock');
    else if (high || c === 'g') gen.set(x, y, 'snow');
    else if (c === 'd' || (c === 'r' && prot) || (c === 'u' && gen.noise(x + 90, y, 2.5) > 0.35)) gen.set(x, y, 'dirt');
    else if (c === 'a') { if (gen.noise(x, y, 3) > 0.55) gen.set(x, y, 'dirt'); }
    else if (c === '.' && gen.noise(x + 40, y, 6) > 0.72) gen.set(x, y, arid ? 'sand' : 'dirt');
    if (arid && (nearWater[idx(x, y)] || c === 'a' || c === 'm') && gen.terrainAt(x, y) === 'desert') gen.set(x, y, 'grass');
    const wv = water[idx(x, y)];
    if (wv) gen.set(x, y, wv === 1 && !prot ? 'water' : 'shallows');
  }
  // Vados repartidos por los ríos (además de los de los caminos)
  for (const r of rivers) {
    if (r.kind !== 'river') continue;
    let acc = 0;
    for (let i = 1; i < r.pts.length; i++) {
      acc += Math.hypot(r.pts[i].x - r.pts[i - 1].x, r.pts[i].y - r.pts[i - 1].y);
      if (acc < 22) continue;
      acc = 0;
      gen.blob(r.pts[i].x, r.pts[i].y, 1.8, (x, y) => { if (gen.terrainAt(x, y) === 'water' && cls(x, y) !== 'w') gen.set(x, y, 'shallows'); }, 0.2);
    }
  }
  gen.shores();
  gen.levelWater();

  gen.players.forEach((p, i) => gen.base(p, starts[i]));

  // ---------------- bosques donde los hay de verdad
  const treeLine = d.snowLine + 100;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (gen.isProtected(x, y)) continue;
    const t = gen.terrainAt(x, y);
    if (t === 'rock' || t === 'water' || t === 'shallows' || t === 'sand') continue;
    const c = cls(x, y), e = elevAt(x, y), f = gen.noise(x + 300, y, 5), r = gen.rng();
    let node: string | null = null;
    if (arid) {
      // Palmerales y huertas junto al agua; el desierto, pelado
      if ((nearWater[idx(x, y)] || c === 'f' || c === 'x') && f > 0.62 && r < 0.6) gen.placeNode('tree', x, y);
      continue;
    }
    if (c === 'f' || c === 'x' || c === 'p') {
      if (f < 0.12 || e > treeLine) continue; // claros
      if (e > d.snowLine - 150) node = 'snowPine';
      else if (c === 'p') node = r < 0.92 ? 'pineTree' : 'tree';
      else if (c === 'x') node = r < 0.5 ? 'pineTree' : 'tree';
      else node = e > d.pineLine ? (r < 0.8 ? 'pineTree' : 'tree') : (r < 0.12 ? 'pineTree' : 'tree');
    } else if (c === 'h') {
      if (f > 0.75 && r < 0.5) node = e > d.pineLine ? 'pineTree' : 'tree';
    } else if (!d.source.osm) {
      // Sin datos de OpenStreetMap: bosques según la altura
      if (e < treeLine && f > 0.58) node = e > d.snowLine - 150 ? 'snowPine' : e > d.pineLine ? 'pineTree' : 'tree';
    } else if ((c === '.' || c === 'm' || c === 'a') && f > 0.9 && r < 0.5) node = 'tree'; // árboles sueltos
    if (node) gen.placeNode(node, x, y);
  }

  // ---------------- los pueblos sin jugador quedan como recursos
  const scale = (W * H) / (96 * 96);
  const used = new Set(chosen.map(c => c.name));
  const kinds = ['stoneMine', 'goldMine', 'berries'];
  let k = 0;
  for (const t of towns) {
    if (used.has(t.name) || starts.some(p => Math.hypot(p.x - t.x, p.y - t.y) < 16)) continue;
    const spot = gen.findSpot(t.x, t.y, 0, 5, 1, true, 60);
    if (!spot) continue;
    gen.blob(spot.x, spot.y, 2.5, (x, y) => { if (m.buildable(x, y) && !gen.isProtected(x, y)) gen.set(x, y, 'dirt'); }, 0.5);
    gen.cluster(kinds[k++ % kinds.length], spot.x, spot.y, 5);
  }
  // Oro y piedra al pie de las montañas, como en los Pirineos
  for (let i = 0; i < Math.round(5 * scale); i++) {
    for (let tries = 0; tries < 60; tries++) {
      const x = gen.randInt(3, W - 4), y = gen.randInt(3, H - 4);
      if (starts.some(p => Math.hypot(p.x - x, p.y - y) < 18) || !gen.areaFree(x, y, 1, true)) continue;
      if (tries < 40 && gen.tileSlope(x, y) < 0.2) continue; // mejor en laderas
      gen.cluster(i % 3 === 0 ? 'goldMine' : 'stoneMine', x, y, 5);
      break;
    }
  }
  gen.scatter('berries', Math.round(2 * scale), 5, 18, starts);
  // La conexión entre bases (pasos de ancho mínimo) la garantiza el motor después (relief.ensurePlayable)
}

function mapType(meta: RegionMeta): MapTypeDef {
  const region: MapRegionInfo = { lat: meta.lat, lon: meta.lon, sizeKm: meta.sizeKm, category: meta.category, country: meta.country };
  return {
    id: meta.id,
    name: `${meta.name} (real)`,
    description: `${meta.description} ${meta.country} · ${meta.sizeKm}×${meta.sizeKm} km.`,
    region,
    async load() { await loadData(meta.id); },
    generate(gen) {
      const d = cache.get(meta.id);
      if (!d) throw new Error(`El mapa real "${meta.id}" no está cargado (llama a load() antes)`);
      generateReal(gen, d);
    },
  };
}

/** Atribuciones de los datos de una región (para la pantalla de créditos). */
export async function regionAttribution(id: string): Promise<string[]> {
  return (await loadData(id)).attribution;
}

export const realMapsMod: GameMod = {
  id: 'real-maps',
  name: 'Mapas reales',
  description: `Mapas de lugares reales con su relieve, ríos, bosques y pueblos (Copernicus / ICGC y OpenStreetMap): ${REGIONS.filter(r => AVAILABLE.has(r.id)).map(r => r.name).join(', ') || 'ninguno todavía'}.`,
  defaultEnabled: true,
  register(reg) {
    for (const meta of REGIONS) if (AVAILABLE.has(meta.id)) reg.addMapType(mapType(meta));
    // Mapas generados a mano con npm run real-map que no están en la lista
    for (const id of AVAILABLE) {
      if (REGIONS.some(r => r.id === id)) continue;
      reg.addMapType(mapType({ id, name: id, country: '', category: 'Otras', lat: 0, lon: 0, sizeKm: 8, description: 'Mapa real generado con npm run real-map.' }));
    }
  },
};
