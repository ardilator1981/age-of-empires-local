import type { Pt } from '../../core/types';
import { artMode, hasDom, loadFirstImage, peekFirstImage } from './assets';

/**
 * Texturas de las defensas lineales (empalizada, muros, zanja, puente), dibujadas con IA o a mano.
 * Si existe `public/sprites/defense/<nombre>.png` (o .jpg / .webp) se pinta sobre las caras de la
 * geometría de `defenseSprites.ts`, que sigue marcando las uniones entre tramos. Sin imagen, queda el
 * color liso de siempre. Nombres: palisade, wood, stone, fortified, ditch, bridge.
 */
const EXTS = ['png', 'jpg', 'jpeg', 'webp'];
const paths = (name: string) => EXTS.map(e => `sprites/defense/${name}.${e}`);

const started = new Set<string>();
const patterns = new WeakMap<CanvasRenderingContext2D, Map<string, CanvasPattern | null>>();

/** La textura ya cargada, o null si no hay (o aún se está buscando; se vuelve a pedir en cada dibujo). */
export function defenseTexture(name: string): HTMLImageElement | null {
  if (!hasDom || artMode() === 'no') return null;
  const p = paths(name);
  if (!started.has(name)) { started.add(name); void loadFirstImage(p); }
  return peekFirstImage(p) ?? null;
}

/**
 * Pinta la textura sobre un polígono. `o` es el punto de la imagen (0, 0) en pantalla, `u` el vector
 * de pantalla de todo el ancho de la imagen y `v` el de todo su alto.
 */
export function paintTextured(ctx: CanvasRenderingContext2D, img: HTMLImageElement, poly: Pt[], o: Pt, u: Pt, v: Pt) {
  let byName = patterns.get(ctx);
  if (!byName) { byName = new Map(); patterns.set(ctx, byName); }
  const key = img.src;
  let pat = byName.get(key);
  if (pat === undefined) { pat = ctx.createPattern(img, 'repeat'); byName.set(key, pat); }
  if (!pat) return;
  pat.setTransform(new DOMMatrix([u.x / img.width, u.y / img.width, v.x / img.height, v.y / img.height, o.x, o.y]));
  ctx.save();
  ctx.beginPath();
  poly.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = pat;
  ctx.fill();
  ctx.restore();
}
