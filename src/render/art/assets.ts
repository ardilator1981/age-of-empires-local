/**
 * Carga de imágenes y JSON de `public/` (arte generado: texturas, hojas de sprites, retratos).
 * Todo se guarda en caché a nivel de módulo, así que una partida nueva no vuelve a descargar nada.
 * En la simulación sin navegador (npm run simulate) no se carga nada y todo sigue procedural.
 */

export const hasDom = typeof document !== 'undefined' && typeof Image !== 'undefined';

/** Ruta de un archivo de `public/` teniendo en cuenta la base de Vite (p. ej. GitHub Pages). */
export function assetUrl(path: string): string {
  if (/^(https?:|data:|blob:|\/)/.test(path)) return path;
  return (import.meta.env?.BASE_URL ?? '/') + path;
}

/** Resuelve `rel` respecto a la carpeta de `base` ('sprites/units/a.json' + 'a.png' → 'sprites/units/a.png'). */
export function relativeTo(base: string, rel: string): string {
  if (/^(https?:|data:|blob:|\/)/.test(rel)) return rel;
  return base.slice(0, base.lastIndexOf('/') + 1) + rel;
}

interface Entry<T> { promise: Promise<T | null>; value: T | null; done: boolean }
const images = new Map<string, Entry<HTMLImageElement>>();
const jsons = new Map<string, Entry<any>>();

/** Avisa cuando termina de cargarse algo (para regenerar retratos, minimapa...). */
let version = 0;
const listeners = new Set<() => void>();
export function artVersion(): number { return version; }
export function onArtLoaded(fn: () => void): () => void { listeners.add(fn); return () => listeners.delete(fn); }
function bump() { version++; for (const fn of listeners) fn(); }

function track<T>(map: Map<string, Entry<T>>, key: string, load: () => Promise<T | null>): Entry<T> {
  let e = map.get(key);
  if (e) return e;
  const entry: Entry<T> = { value: null, done: false, promise: null! };
  entry.promise = load().then(v => { entry.value = v; entry.done = true; if (v) bump(); return v; });
  map.set(key, entry);
  return entry;
}

/** Imagen de `public/` (null si no existe). */
export function loadImage(path: string): Promise<HTMLImageElement | null> {
  return imageEntry(path).promise;
}

/** La imagen si ya está cargada (sin esperar). */
export function peekImage(path: string): HTMLImageElement | null {
  return images.get(path)?.value ?? null;
}

function imageEntry(path: string): Entry<HTMLImageElement> {
  return track(images, path, () => {
    if (!hasDom) return Promise.resolve(null);
    return new Promise(resolve => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(img.naturalWidth ? img : null);
      // El servidor de desarrollo devuelve index.html para archivos que no existen: también acaba aquí
      img.onerror = () => resolve(null);
      img.src = assetUrl(path);
    });
  });
}

/** La primera de las rutas que exista (p. ej. grass.png, grass.jpg, grass.webp). */
export async function loadFirstImage(paths: string[]): Promise<{ path: string; img: HTMLImageElement } | null> {
  for (const p of paths) {
    const img = await loadImage(p);
    if (img) return { path: p, img };
  }
  return null;
}

/** La primera imagen ya cargada de la lista, o undefined si alguna aún no ha terminado. */
export function peekFirstImage(paths: string[]): HTMLImageElement | null | undefined {
  for (const p of paths) {
    const e = images.get(p);
    if (!e || !e.done) return undefined;
    if (e.value) return e.value;
  }
  return null;
}

/** JSON de `public/` (null si no existe o no es JSON válido). */
export function loadJson<T = any>(path: string): Promise<T | null> {
  return track(jsons, path, async () => {
    if (!hasDom || typeof fetch === 'undefined') return null;
    try {
      const res = await fetch(assetUrl(path), { cache: 'no-cache' });
      if (!res.ok) return null;
      const text = await res.text();
      if (/^\s*</.test(text)) return null; // index.html del servidor de desarrollo
      return JSON.parse(text) as T;
    } catch (err) {
      console.warn(`[arte] No se pudo leer ${path}:`, err);
      return null;
    }
  }).promise;
}

/**
 * Modo del arte según la URL, para comparar: `?arte=no` dibuja todo procedural,
 * `?arte=ejemplo` activa las imágenes de prueba de public/sprites/ejemplo/.
 */
export function artMode(): 'no' | 'ejemplo' | null {
  if (typeof location === 'undefined') return null;
  const v = new URLSearchParams(location.search).get('arte');
  return v === 'no' || v === 'ejemplo' ? v : null;
}
