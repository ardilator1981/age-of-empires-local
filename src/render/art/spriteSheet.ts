import type { SpriteContext } from '../../core/types';
import type { Entity } from '../../game/Entity';
import { ellipse, poly } from '../draw';
import { loadImage, loadJson, peekImage, relativeTo } from './assets';

/**
 * Hojas de sprites: una imagen (PNG con transparencia) dividida en celdas iguales,
 * descrita por un manifiesto JSON. Ver el README («Arte con imágenes») y
 * public/sprites/ejemplo/ para el formato completo.
 */

export type StateName = 'idle' | 'walk' | 'attack' | 'work' | 'carry' | 'death' | 'construction' | string;
/** Cómo se elige el fotograma: por tiempo, por la variante de la entidad, por progreso de construcción o por recurso restante. */
export type FramePick = 'time' | 'variant' | 'progress' | 'amount';

export interface SheetState {
  /** Imagen propia de este estado (si no, la de la hoja). Ruta relativa al JSON. */
  image?: string;
  mask?: string;
  /** Primera celda (fila y columna, desde 0). */
  row?: number;
  col?: number;
  /** Número de fotogramas (seguidos hacia la derecha; si no caben, siguen en la fila de abajo). */
  frames?: number;
  /** Fotogramas por segundo (por defecto 8). */
  fps?: number;
  /** Duración total en segundos (en vez de fps). El ataque dura por defecto lo que su golpe (0,35 s). */
  duration?: number;
  /** Repetir en bucle (por defecto sí, salvo death y attack). */
  loop?: boolean;
  pick?: FramePick;
  /** Celda y anclaje propios (si la imagen del estado tiene otro tamaño de celda). */
  cell?: { w: number; h: number };
  anchor?: { x: number; y: number };
}

export interface SheetVariant {
  image?: string;
  mask?: string;
  states?: Record<string, SheetState>;
  portrait?: string;
}

export interface SheetManifest {
  /** Imagen de la hoja, relativa al JSON. */
  image: string;
  /** Máscara del color del jugador: PNG del mismo tamaño, opaco donde va el color. */
  mask?: string;
  /** Tamaño de cada celda en píxeles de la imagen. */
  cell: { w: number; h: number };
  /**
   * Punto de la celda que va en el suelo: los pies de la unidad, la base del árbol o
   * el centro del rombo de la base del edificio (por defecto, el rombo toca el borde de abajo).
   */
  anchor?: { x: number; y: number };
  /** Píxeles de la imagen por píxel de pantalla a zoom 1 (se genera a 2x → 2). */
  scale?: number;
  /** Hacia dónde mira el dibujo cuando hay 1 dirección (se refleja para el otro lado). */
  facing?: 'right' | 'left';
  /**
   * 1 = una sola dirección reflejada. 5 = S, SO, O, NO, N (el lado este se refleja).
   * 8 = S, SO, O, NO, N, NE, E, SE. Cada dirección ocupa las filas siguientes del estado.
   */
  directions?: 1 | 5 | 8;
  states: Record<string, SheetState>;
  /** Variantes por edad (0 = Oscura, 1 = Feudal, 2 = Castillos, 3 = Imperial): se usa la mayor ≤ edad. */
  ages?: Record<string, SheetVariant>;
  /** Imagen para el retrato de la interfaz (si no, se recorta el primer fotograma de idle). */
  portrait?: string;
  /** Sombra elíptica bajo unidades y recursos: radio en px a zoom 1, o false. */
  shadow?: number | false;
}

/** Duración del golpe (Entity.attackAnim empieza en este valor, ver game/combat.ts). */
const ATTACK_TIME = 0.35;

interface Resolved {
  img: string; mask?: string;
  cell: { w: number; h: number }; anchor: { x: number; y: number };
  row: number; col: number; frames: number; fps: number; duration?: number; loop: boolean; pick: FramePick;
}

/** Última dirección (0..7, S, SO, O, NO, N, NE, E, SE) de cada unidad. */
const headings = new WeakMap<Entity, number>();

export class Sheet {
  manifest: SheetManifest | null = null;
  ready = false;
  failed = false;
  readonly loading: Promise<boolean>;

  /** `path`: JSON dentro de public/ (p. ej. 'sprites/units/militia.json'). */
  constructor(readonly path: string, readonly kind: 'unit' | 'building' | 'resource') {
    this.loading = this.load();
  }

  private async load(): Promise<boolean> {
    const m = await loadJson<SheetManifest>(this.path);
    if (!m) { this.fail('no existe o no es un JSON válido'); return false; }
    const problem = validate(m);
    if (problem) { this.fail(problem); return false; }
    this.manifest = m;
    const paths = new Set<string>([m.image, ...(m.mask ? [m.mask] : []), ...(m.portrait ? [m.portrait] : [])]);
    const addStates = (st?: Record<string, SheetState>) => { for (const s of Object.values(st ?? {})) { if (s.image) paths.add(s.image); if (s.mask) paths.add(s.mask); } };
    addStates(m.states);
    for (const v of Object.values(m.ages ?? {})) {
      for (const p of [v.image, v.mask, v.portrait]) if (p) paths.add(p);
      addStates(v.states);
    }
    const results = await Promise.all([...paths].map(async p => [p, await loadImage(this.url(p))] as const));
    const missing = results.filter(([, img]) => !img).map(([p]) => p);
    if (missing.length) { this.fail(`faltan imágenes: ${missing.join(', ')}`); return false; }
    this.ready = true;
    return true;
  }

  private fail(why: string) {
    this.failed = true;
    console.warn(`[arte] ${this.path}: ${why}. Se usa el sprite procedural.`);
  }

  /** Ruta dentro de public/ de una imagen del manifiesto. */
  url(rel: string): string { return relativeTo(this.path, rel); }

  get scale(): number { return this.manifest?.scale ?? 2; }

  /** Imagen, máscara y estados de la variante para esta edad. */
  private variant(age: number): { image: string; mask?: string; states: Record<string, SheetState>; portrait?: string } {
    const m = this.manifest!;
    let v: SheetVariant | undefined, best = -1;
    for (const [k, val] of Object.entries(m.ages ?? {})) {
      const a = Number(k);
      if (a <= age && a > best) { best = a; v = val; }
    }
    return {
      image: v?.image ?? m.image,
      mask: v?.mask ?? m.mask,
      states: { ...m.states, ...v?.states },
      portrait: v?.portrait ?? m.portrait,
    };
  }

  /** Primer estado que exista de la lista (siempre acaba en idle o el primero que haya). */
  private resolve(names: StateName[], age: number, size: number): Resolved | null {
    const m = this.manifest!;
    const v = this.variant(age);
    const name = [...names, 'idle'].find(n => v.states[n]) ?? Object.keys(v.states)[0];
    const st = v.states[name];
    if (!st) return null;
    const cell = st.cell ?? m.cell;
    const sc = this.scale;
    const anchor = st.anchor ?? m.anchor ?? (this.kind === 'building'
      ? { x: cell.w / 2, y: cell.h - size * 16 * sc }
      : { x: cell.w / 2, y: cell.h * 0.92 });
    return {
      img: this.url(st.image ?? v.image),
      mask: st.mask ? this.url(st.mask) : st.image ? undefined : v.mask && this.url(v.mask),
      cell, anchor,
      row: st.row ?? 0, col: st.col ?? 0, frames: Math.max(1, st.frames ?? 1),
      fps: st.fps ?? 8, duration: st.duration ?? (name === 'attack' ? ATTACK_TIME : undefined),
      loop: st.loop ?? !(name === 'death' || name === 'attack' || name === 'construction'),
      pick: st.pick ?? (name === 'construction' ? 'progress' : 'time'),
    };
  }

  /** Índice de fotograma para un estado. `t` = segundos desde que empezó (o tiempo de juego). */
  private frameAt(r: Resolved, t: number, e: Entity | null): number {
    const n = r.frames;
    switch (r.pick) {
      case 'variant': return Math.min(n - 1, Math.floor((e?.variant ?? 0) * n));
      case 'progress': return Math.min(n - 1, Math.floor((e ? (e.complete ? 1 : e.progress) : 1) * n));
      case 'amount': {
        const ratio = e ? e.amount / (e.initialAmount || 1) : 1;
        return Math.min(n - 1, Math.max(0, Math.floor((1 - ratio) * n)));
      }
    }
    const k = Math.floor(r.duration ? (t / r.duration) * n : t * r.fps);
    return r.loop ? ((k % n) + n) % n : Math.min(n - 1, Math.max(0, k));
  }

  /** Dirección (fila extra) y reflejo según hacia dónde mira la unidad. */
  private direction(e: Entity | null, facing: number): { dir: number; flip: boolean } {
    const m = this.manifest!;
    const dirs = m.directions ?? 1;
    if (dirs === 1 || !e) {
      const drawnRight = (m.facing ?? 'right') === 'right';
      return { dir: 0, flip: (facing < 0) === drawnRight };
    }
    let h = headings.get(e) ?? (e.facing < 0 ? 1 : 7);
    const dx = e.x - e.px, dy = e.y - e.py;
    if (e.moving && Math.abs(dx) + Math.abs(dy) > 1e-4) {
      const ang = Math.atan2((dx + dy) / 2, dx - dy); // en pantalla, y hacia abajo
      h = (((Math.round((ang - Math.PI / 2) / (Math.PI / 4)) % 8) + 8) % 8);
      headings.set(e, h);
    }
    if (dirs === 5 && h > 4) return { dir: 8 - h, flip: true };
    return { dir: Math.min(h, dirs - 1), flip: false };
  }

  /** Celda (x, y en píxeles) del fotograma `frame` en la dirección `dir`. */
  private cellAt(r: Resolved, frame: number, dir: number): { sx: number; sy: number } | null {
    const img = peekImage(r.img);
    if (!img) return null;
    const cols = Math.max(1, Math.floor(img.naturalWidth / r.cell.w));
    const rowsPerDir = Math.ceil((r.col + r.frames) / cols);
    const i = r.col + frame;
    return { sx: (i % cols) * r.cell.w, sy: (r.row + dir * rowsPerDir + Math.floor(i / cols)) * r.cell.h };
  }

  private blit(ctx: CanvasRenderingContext2D, r: Resolved, frame: number, dir: number, flip: boolean, x: number, y: number, z: number, color: string) {
    const c = this.cellAt(r, frame, dir);
    const src = tinted(r.img, r.mask, color);
    if (!c || !src) return;
    const k = z / this.scale;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(flip ? -k : k, k);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, c.sx, c.sy, r.cell.w, r.cell.h, -r.anchor.x, -r.anchor.y, r.cell.w, r.cell.h);
    ctx.restore();
  }

  private shadow(s: SpriteContext) {
    const m = this.manifest!;
    if (m.shadow === false || this.kind === 'building') return;
    const rad = m.shadow ?? (this.kind === 'unit' ? ((s.def?.radius ?? 0.22) > 0.3 ? 17 : 10) : 0);
    if (!rad) return;
    s.ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ellipse(s.ctx, s.x + 1.5 * s.z, s.y, rad * s.z, rad * 0.38 * s.z);
    s.ctx.fill();
  }

  /** Estado de una unidad viva, con alternativas por si la hoja no lo tiene. */
  private unitStates(e: Entity | null): StateName[] {
    if (!e) return ['idle'];
    const res = e.order?.type === 'build' ? 'build' : e.carry?.type;
    if (e.attackAnim > 0) return ['attack'];
    if (e.moving) {
      if (e.carry && e.carry.amount > 0) return [`carry-${e.carry.type}`, 'carry', 'walk'];
      return ['walk'];
    }
    if (e.working) return res ? [`work-${res}`, 'work'] : ['work'];
    return ['idle'];
  }

  /** Dibuja la entidad (el SpriteFn de las definiciones que usan esta hoja). */
  draw(s: SpriteContext) {
    const e = s.entity;
    if (this.kind === 'building') { this.drawBuilding(s); return; }
    const r = this.resolve(this.kind === 'unit' ? this.unitStates(e) : ['idle'], s.age, 1);
    if (!r) return;
    const t = r.duration && e && e.attackAnim > 0 ? ATTACK_TIME - e.attackAnim : s.time + (e?.id ?? 0) * 0.37;
    const { dir, flip } = this.direction(e, e?.facing ?? 1);
    this.shadow(s);
    this.blit(s.ctx, r, this.frameAt(r, t, e), dir, flip, s.x, s.y, s.z, s.color);
  }

  /** Animación de muerte: false si la hoja no tiene estado death. */
  death(s: SpriteContext, t: number, facing: number): boolean {
    if (!this.variant(s.age).states.death) return false;
    const r = this.resolve(['death'], s.age, 1);
    if (!r) return false;
    const { dir, flip } = this.direction(null, facing);
    this.blit(s.ctx, r, this.frameAt(r, t, null), dir, flip, s.x, s.y, s.z, s.color);
    return true;
  }

  private drawBuilding(s: SpriteContext) {
    const { ctx, z, entity: e, foot, project: pr } = s;
    const size = foot?.size ?? s.def?.size ?? 1;
    const complete = !e || e.complete;
    const progress = e ? (e.complete ? 1 : e.progress) : 1;
    if (!complete && foot) {
      // Cimientos
      const { tx, ty } = foot;
      ctx.fillStyle = 'rgba(120,96,62,0.9)';
      poly(ctx, [pr(tx, ty), pr(tx + size, ty), pr(tx + size, ty + size), pr(tx, ty + size)]); ctx.fill();
    }
    const v = this.variant(s.age);
    const building = !complete && v.states.construction;
    const names = building ? ['construction'] : e && e.queue.length && complete ? ['work', 'idle'] : ['idle'];
    const r = this.resolve(names, s.age, size);
    if (!r) return;
    const frame = this.frameAt(r, s.time + (e?.id ?? 0) * 0.37, e);
    if (complete || building) {
      this.blit(ctx, r, frame, 0, false, s.x, s.y, z, s.color);
      return;
    }
    // Sin imagen de obra: aparece de abajo arriba, como el sprite procedural
    const k = z / this.scale;
    const top = s.y - r.anchor.y * k, bottom = s.y + (r.cell.h - r.anchor.y) * k;
    const cut = bottom - (bottom - top) * (0.12 + 0.88 * progress);
    ctx.save();
    ctx.beginPath(); ctx.rect(s.x - r.cell.w * k, cut, r.cell.w * 2 * k, bottom - cut + 2); ctx.clip();
    this.blit(ctx, r, frame, 0, false, s.x, s.y, z, s.color);
    ctx.restore();
  }

  /** Altura (px a zoom 1) del dibujo por encima de su punto de apoyo. */
  heightAbove(age: number, size: number): number {
    const r = this.resolve(['idle'], age, size);
    return r ? r.anchor.y / this.scale : 0;
  }

  /**
   * Retrato para la interfaz: la imagen `portrait` si la hay, o el primer fotograma
   * de idle recortado a su contenido. Dibuja en un cuadrado de `S` px.
   */
  drawPortrait(ctx: CanvasRenderingContext2D, S: number, color: string, age: number, size: number) {
    const v = this.variant(age);
    if (v.portrait) {
      const img = peekImage(this.url(v.portrait));
      if (img) {
        const k = Math.max(S / img.naturalWidth, S / img.naturalHeight);
        ctx.drawImage(img, (S - img.naturalWidth * k) / 2, (S - img.naturalHeight * k) / 2, img.naturalWidth * k, img.naturalHeight * k);
        return;
      }
    }
    const r = this.resolve(['idle'], age, size);
    if (!r) return;
    const c = this.cellAt(r, 0, 0);
    const src = tinted(r.img, r.mask, color);
    if (!c || !src) return;
    const b = opaqueBounds(src, r.img, c.sx, c.sy, r.cell.w, r.cell.h);
    const box = S * 0.86;
    const k = Math.min(box / b.w, box / b.h);
    const w = b.w * k, h = b.h * k;
    const flip = this.kind === 'unit' && (this.manifest!.facing ?? 'right') === 'left';
    ctx.save();
    ctx.imageSmoothingQuality = 'high';
    ctx.translate(S / 2, 0);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(src, c.sx + b.x, c.sy + b.y, b.w, b.h, -w / 2, S * 0.95 - h, w, h);
    ctx.restore();
  }
}

function validate(m: SheetManifest): string | null {
  if (typeof m.image !== 'string') return 'falta "image"';
  if (!m.cell || !(m.cell.w > 0) || !(m.cell.h > 0)) return 'falta "cell": { "w": ..., "h": ... }';
  if (!m.states || !Object.keys(m.states).length) return 'falta "states" (al menos "idle")';
  if (m.directions && ![1, 5, 8].includes(m.directions)) return '"directions" debe ser 1, 5 u 8';
  return null;
}

// ------------------------------------------------------------ color del jugador

const tintCache = new Map<string, HTMLCanvasElement>();

/**
 * La imagen con las zonas de la máscara teñidas del color del jugador. El tinte
 * conserva las luces y sombras del dibujo: se pasa a gris y se multiplica por el color,
 * así que conviene pintar esas zonas en un tono claro y neutro (blanco o gris claro).
 */
function tinted(imgPath: string, maskPath: string | undefined, color: string): CanvasImageSource | null {
  const img = peekImage(imgPath);
  if (!img) return null;
  const mask = maskPath ? peekImage(maskPath) : null;
  if (!mask) return img;
  const key = `${imgPath}|${maskPath}|${color}`;
  let c = tintCache.get(key);
  if (c) return c;
  const W = img.naturalWidth, H = img.naturalHeight;
  const tmp = document.createElement('canvas');
  tmp.width = W; tmp.height = H;
  const t = tmp.getContext('2d')!;
  t.fillStyle = '#808080'; t.fillRect(0, 0, W, H);
  t.globalCompositeOperation = 'luminosity'; t.drawImage(img, 0, 0);
  t.globalCompositeOperation = 'multiply'; t.fillStyle = color; t.fillRect(0, 0, W, H);
  t.globalCompositeOperation = 'destination-in'; t.drawImage(mask, 0, 0, W, H);
  c = document.createElement('canvas');
  c.width = W; c.height = H;
  const o = c.getContext('2d')!;
  o.drawImage(img, 0, 0);
  o.drawImage(tmp, 0, 0);
  tintCache.set(key, c);
  return c;
}

const boundsCache = new Map<string, { x: number; y: number; w: number; h: number }>();

/** Rectángulo con contenido (alfa > 0) de una celda, para encuadrar los retratos. */
function opaqueBounds(src: CanvasImageSource, key: string, sx: number, sy: number, w: number, h: number) {
  const k = `${key}|${sx}|${sy}`;
  const hit = boundsCache.get(k);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(src, sx, sy, w, h, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (d[(y * w + x) * 4 + 3] > 16) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  const b = x1 < 0 ? { x: 0, y: 0, w, h } : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  boundsCache.set(k, b);
  return b;
}
