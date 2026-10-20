import { BALANCE } from '../../config/balance';
import type { Pt } from '../../core/types';
import type { Entity } from '../Entity';
import type { Game } from '../Game';
import { hypot } from '../fmath';

/**
 * Formaciones: la forma de un grupo de tropas, como huecos relativos a un centro.
 *
 * Cada hueco es (lat, back) en casillas: `lat` hacia la derecha de la marcha y `back` hacia
 * atrás. Dónde va cada tropa depende de su papel (BALANCE.army.placement): infantería delante,
 * a distancia detrás, caballería en los flancos, asedio al fondo y el líder (unidades con aura,
 * como el General) en el centro de la retaguardia.
 */

export type FormationType = 'line' | 'column' | 'box' | 'wedge' | 'loose';
export type Role = 'front' | 'back' | 'flank' | 'rear' | 'leader';
export interface Offset { lat: number; back: number }

export const FORMATIONS: { id: FormationType; name: string; icon: string; desc: string }[] = [
  { id: 'line', name: 'Línea', icon: '▬', desc: 'Frente ancho: infantería delante, arqueros detrás y caballería en los flancos.' },
  { id: 'column', name: 'Columna', icon: '▮', desc: 'Estrecha y larga: para caminos y pasos de montaña.' },
  { id: 'box', name: 'Caja', icon: '▣', desc: 'Infantería y caballería por fuera; arqueros, asedio y General protegidos dentro.' },
  { id: 'wedge', name: 'Cuña', icon: '▲', desc: 'En punta, para romper la línea enemiga.' },
  { id: 'loose', name: 'Dispersa', icon: '⁘', desc: 'Línea muy separada: menos daño de proyectiles en grupo.' },
];

const ROLE_ORDER: Role[] = ['front', 'flank', 'back', 'leader', 'rear'];

/** Papel de una unidad en la formación. */
export function roleOf(game: Game, u: Entity): Role {
  const d = game.unitDef(u), pl = BALANCE.army.placement;
  if (d.aura) return 'leader';
  if (d.classes.includes('siege')) return pl.siege;
  if (d.classes.includes('cavalry')) return pl.cavalry;
  if (game.players[u.owner].getStat(d, 'range') >= 1) return pl.ranged;
  return pl.infantry;
}

/** n huecos en filas de `width`, centrados a lo ancho, empezando en la fila `row0`. */
function rows(n: number, width: number, row0: number): Offset[] {
  const out: Offset[] = [];
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / width), inRow = Math.min(width, n - r * width), c = i % width;
    out.push({ lat: c - (inRow - 1) / 2, back: row0 + r });
  }
  return out;
}

/**
 * Huecos (en unidades de separación) para cada papel. `width` fuerza el ancho de las filas
 * (para estrecharse a columna en un paso).
 */
export function shape(type: FormationType, counts: Record<Role, number>, width?: number): Record<Role, Offset[]> {
  const n = ROLE_ORDER.reduce((s, r) => s + counts[r], 0);
  const out: Record<Role, Offset[]> = { front: [], back: [], flank: [], rear: [], leader: [] };
  if (!n) return out;

  if (type === 'column' || width !== undefined) {
    // Columna: cabeza de caballería, infantería, líder, arqueros, asedio y cola de caballería
    const w = Math.max(1, width ?? (n > 24 ? 3 : 2));
    let row = 0;
    const take = (role: Role, k: number) => { const r = rows(k, w, row); out[role].push(...r); row += Math.ceil(k / w); };
    const head = Math.ceil(counts.flank / 2);
    take('flank', head);
    take('front', counts.front);
    take('leader', counts.leader);
    take('back', counts.back);
    take('rear', counts.rear);
    take('flank', counts.flank - head);
    return out;
  }

  if (type === 'box') {
    // Perímetro para infantería y caballería; dentro, el resto
    const outer = counts.front + counts.flank, inner = counts.back + counts.leader + counts.rear;
    let L = 3;
    while (4 * (L - 1) < outer || (L - 2) * (L - 2) < inner) L++;
    const h = (L - 1) / 2;
    // Perímetro empezando por el centro del frente y abriéndose hacia los lados y atrás
    const per: Offset[] = [];
    for (let i = 0; i < L; i++) per.push({ lat: i - h, back: 0 });
    for (let j = 1; j < L - 1; j++) { per.push({ lat: -h, back: j }); per.push({ lat: h, back: j }); }
    for (let i = 0; i < L; i++) per.push({ lat: i - h, back: L - 1 });
    per.sort((a, b) => a.back - b.back || Math.abs(a.lat) - Math.abs(b.lat));
    out.front = per.slice(0, counts.front);
    // La caballería, en los lados
    out.flank = per.slice(counts.front, counts.front + counts.flank);
    const inside: Offset[] = [];
    for (let j = 1; j < L - 1; j++) for (let i = 1; i < L - 1; i++) inside.push({ lat: i - h, back: j });
    inside.sort((a, b) => Math.abs(a.lat) + Math.abs(a.back - h) - (Math.abs(b.lat) + Math.abs(b.back - h)));
    // El líder en el centro, los arqueros alrededor y el asedio detrás
    out.leader = inside.splice(0, counts.leader);
    const rest = inside.sort((a, b) => a.back - b.back);
    out.back = rest.slice(0, counts.back);
    out.rear = rest.slice(counts.back, counts.back + counts.rear);
    return out;
  }

  if (type === 'wedge') {
    // Fila k con 2k+1 huecos; se llenan por papeles desde la punta
    const slots: Offset[] = [];
    for (let k = 0; slots.length < n; k++) {
      const row: Offset[] = [];
      for (let i = -k; i <= k; i++) row.push({ lat: i, back: k });
      row.sort((a, b) => Math.abs(a.lat) - Math.abs(b.lat));
      slots.push(...row);
    }
    let i = 0;
    for (const role of ROLE_ORDER) { out[role] = slots.slice(i, i + counts[role]); i += counts[role]; }
    return out;
  }

  // Línea (y dispersa): frente ancho, caballería a los lados de las primeras filas
  const core = counts.front + counts.back;
  const W = Math.max(4, Math.min(16, Math.ceil(Math.sqrt(Math.max(core, 1) * 3))));
  let row = 0;
  out.front = rows(counts.front, W, row); row += Math.ceil(counts.front / W);
  out.back = rows(counts.back, W, row); row += Math.ceil(counts.back / W);
  out.leader = rows(counts.leader, W, row); row += Math.ceil(counts.leader / W);
  out.rear = rows(counts.rear, W, row);
  const half = Math.min(W, Math.max(counts.front, counts.back, 1)) / 2;
  for (let i = 0; i < counts.flank; i++) {
    const side = i % 2 ? -1 : 1, k = Math.floor(i / 2);
    out.flank.push({ lat: side * (half + 0.5 + (k % 2)), back: Math.floor(k / 2) });
  }
  return out;
}

/** Ancho (en huecos) de la fila más ancha de una forma. */
export function shapeWidth(s: Record<Role, Offset[]>): number {
  let lo = 0, hi = 0;
  for (const r of ROLE_ORDER) for (const o of s[r]) { lo = Math.min(lo, o.lat); hi = Math.max(hi, o.lat); }
  return hi - lo + 1;
}

/** Vector unitario lateral (derecha de la marcha). */
export function rightOf(f: Pt): Pt { return { x: -f.y, y: f.x }; }

/** Posición en el mundo de un hueco (en casillas) para un centro y una dirección de marcha. */
export function toWorld(c: Pt, f: Pt, o: Offset): Pt {
  const r = rightOf(f);
  return { x: c.x + r.x * o.lat - f.x * o.back, y: c.y + r.y * o.lat - f.y * o.back };
}

/**
 * Asigna a cada unidad un hueco (en casillas, centrado en el centro de la formación).
 * Dentro de cada papel, las unidades y los huecos se emparejan de izquierda a derecha
 * según dónde están ahora, para que nadie cruce por delante de otro al formar o al girar.
 */
export function assignSlots(game: Game, units: Entity[], type: FormationType, facing: Pt, width?: number): Map<number, Offset> {
  const by: Record<Role, Entity[]> = { front: [], back: [], flank: [], rear: [], leader: [] };
  for (const u of units) by[roleOf(game, u)].push(u);
  const counts = { front: by.front.length, back: by.back.length, flank: by.flank.length, rear: by.rear.length, leader: by.leader.length };
  const sp = BALANCE.army.spacing * (type === 'loose' && width === undefined ? BALANCE.army.looseFactor : 1);
  const s = shape(type, counts, width);
  // Centrar: el punto de destino es el centro de la formación
  let mb = 0, n = 0;
  for (const r of ROLE_ORDER) for (const o of s[r]) { mb += o.back; n++; }
  mb = n ? mb / n : 0;
  const cx = units.reduce((a, u) => a + u.x, 0) / Math.max(1, units.length);
  const cy = units.reduce((a, u) => a + u.y, 0) / Math.max(1, units.length);
  const right = rightOf(facing);
  const proj = (u: Entity) => (u.x - cx) * right.x + (u.y - cy) * right.y;
  const projBack = (u: Entity) => -((u.x - cx) * facing.x + (u.y - cy) * facing.y);
  const out = new Map<number, Offset>();
  for (const role of ROLE_ORDER) {
    const slots = s[role].map(o => ({ lat: o.lat * sp, back: (o.back - mb) * sp }));
    // Por filas de delante a atrás y, dentro de cada fila, de izquierda a derecha
    const us = [...by[role]].sort((a, b) => projBack(a) - projBack(b));
    const rowsOf = new Map<number, Offset[]>();
    for (const sl of slots) { const k = Math.round(sl.back * 100); rowsOf.set(k, [...(rowsOf.get(k) ?? []), sl]); }
    let i = 0;
    for (const k of [...rowsOf.keys()].sort((a, b) => a - b)) {
      const row = rowsOf.get(k)!.sort((a, b) => a.lat - b.lat);
      const take = us.slice(i, i + row.length).sort((a, b) => proj(a) - proj(b));
      take.forEach((u, j) => out.set(u.id, row[j]));
      i += row.length;
    }
  }
  return out;
}

/**
 * Hueco en el mundo, sin caer en roca, agua ni en otra región (se busca la casilla libre
 * más cercana que no esté ya ocupada por otro hueco).
 */
export function safeSlot(game: Game, p: Pt, region: number, used?: Set<number>): Pt {
  const m = game.map;
  const ok = (x: number, y: number) => m.walkable(x, y) && (region < 0 || m.region(x, y) === region) && !used?.has(y * m.w + x);
  let fx = Math.floor(p.x), fy = Math.floor(p.y);
  if (!ok(fx, fy)) {
    let best: Pt | null = null, bd = Infinity;
    for (let r = 1; r <= 4 && !best; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || !ok(fx + dx, fy + dy)) continue;
      const d = hypot(fx + dx + 0.5 - p.x, fy + dy + 0.5 - p.y);
      if (d < bd) { bd = d; best = { x: fx + dx + 0.5, y: fy + dy + 0.5 }; }
    }
    if (!best) return p;
    p = best; fx = Math.floor(p.x); fy = Math.floor(p.y);
  }
  used?.add(fy * m.w + fx);
  return p;
}

/**
 * Ancho libre (en casillas) a lo ancho de la marcha en un punto: casillas transitables seguidas
 * a izquierda y derecha. Sirve para estrecharse en los pasos.
 */
export function freeWidth(game: Game, c: Pt, facing: Pt, max = 12): number {
  const m = game.map, r = rightOf(facing);
  let w = 1;
  for (const side of [1, -1]) {
    for (let k = 1; k <= max; k++) {
      const x = c.x + r.x * k * side, y = c.y + r.y * k * side;
      if (!m.walkable(Math.floor(x), Math.floor(y))) break;
      w++;
    }
  }
  return w;
}
