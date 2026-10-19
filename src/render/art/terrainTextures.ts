import type { TerrainDef } from '../../core/types';
import { artMode, hasDom, loadFirstImage, peekFirstImage } from './assets';

/**
 * Texturas de terreno dibujadas a mano o con IA. Si existe
 * `public/sprites/terrain/<pattern>.png` (o .jpg / .webp) se usa en lugar de la
 * textura procedural de ese terreno. Un TerrainDef puede indicar otra ruta con `texture`.
 */
export const TERRAIN_DIR = 'sprites/terrain/';
const EXTS = ['png', 'jpg', 'jpeg', 'webp'];

/** Resolución de las capas cuando alguna viene de una imagen (las procedurales se escalan). */
export const IMAGE_TEX = 512;

export function terrainTexturePaths(t: TerrainDef): string[] {
  const mode = artMode();
  if (mode === 'no') return [];
  if (t.texture) return [t.texture];
  if (!t.pattern) return [];
  const paths = EXTS.map(e => `${TERRAIN_DIR}${t.pattern}.${e}`);
  // Con ?arte=ejemplo, primero las texturas de prueba
  return mode === 'ejemplo' ? [`sprites/ejemplo/terrain/${t.pattern}.png`, ...paths] : paths;
}

/** Empieza a descargar las texturas (se llama al preparar el registro, antes de la partida). */
export function preloadTerrainTextures(terrains: TerrainDef[]) {
  if (!hasDom) return;
  for (const t of terrains) void loadFirstImage(terrainTexturePaths(t));
}

/** Imagen de un terreno: ya cargada, null si no hay, undefined si aún se está buscando. */
export function peekTerrainImage(t: TerrainDef): HTMLImageElement | null | undefined {
  const paths = terrainTexturePaths(t);
  return paths.length ? peekFirstImage(paths) : null;
}

export async function loadTerrainImage(t: TerrainDef): Promise<HTMLImageElement | null> {
  return (await loadFirstImage(terrainTexturePaths(t)))?.img ?? null;
}

/** Píxeles RGBA de una imagen redimensionada a size x size. */
export function imagePixels(img: CanvasImageSource, size: number): Uint8ClampedArray {
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, size, size);
  const d = ctx.getImageData(0, 0, size, size).data;
  for (let i = 3; i < d.length; i += 4) d[i] = 255;
  return d;
}

/** Escala una textura RGBA cuadrada (las procedurales son de 256 px). */
export function scalePixels(px: Uint8ClampedArray, from: number, size: number): Uint8ClampedArray {
  if (from === size) return px;
  const src = document.createElement('canvas');
  src.width = from; src.height = from;
  src.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(px), from, from), 0, 0);
  return imagePixels(src, size);
}
