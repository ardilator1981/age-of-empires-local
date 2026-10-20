import type { SaveData, SaveMeta } from '../game/save';

/**
 * Ranuras de partidas guardadas en IndexedDB (cabe mucho más que en localStorage y no bloquea).
 * Cada partida se guarda comprimida con gzip (CompressionStream) si el navegador lo permite;
 * si no, como texto. La ranura 'auto' es el guardado automático; '1'…'5', las manuales.
 */

export const AUTO_SLOT = 'auto';
export const MANUAL_SLOTS = ['1', '2', '3', '4', '5'];

export interface SlotInfo {
  id: string;
  name: string;
  savedAt: number;
  version: number;
  meta: SaveMeta;
  /** Tamaño guardado, en bytes. */
  size: number;
}

interface SlotRecord extends SlotInfo {
  gz: boolean;
  payload: Blob | string;
}

const DB = 'aoe-local-saves';
const STORE = 'slots';

/** Conexión abierta de antemano (se reutiliza para todo). */
let handle: IDBDatabase | null = null;

const EMERGENCY_KEY = 'aoe-local-autosave';

/**
 * Al arrancar: abre la base de datos y, si al cerrar la última vez se guardó la partida de
 * urgencia en localStorage, la pasa a la ranura automática.
 */
export async function warmUp(): Promise<void> {
  try {
    handle = await openDb();
    handle.onclose = () => { handle = null; };
  } catch { return; }
  let raw: string | null = null;
  try { raw = localStorage.getItem(EMERGENCY_KEY); } catch { /* sin almacenamiento */ }
  if (!raw) return;
  try {
    const save: SaveData = JSON.parse(raw);
    const cur = (await listSlots()).find(s => s.id === AUTO_SLOT);
    if (!cur || cur.savedAt < save.savedAt) await writeSlot(AUTO_SLOT, 'Guardado automático', save);
    localStorage.removeItem(EMERGENCY_KEY);
  } catch (err) { console.warn('[partidas] No se pudo recuperar el guardado de urgencia', err); }
}

/**
 * Guardado de urgencia al cerrar la página o pasar a segundo plano: localStorage es síncrono,
 * así que la escritura termina antes de que el navegador cierre (IndexedDB no da tiempo).
 * Devuelve false si no cabe.
 */
export function writeEmergency(save: SaveData): boolean {
  try { localStorage.setItem(EMERGENCY_KEY, JSON.stringify(save)); return true; } catch { return false; }
}

/** Ya no hace falta el de urgencia (la partida se ha cargado, guardado o terminado). */
export function clearEmergency() { try { localStorage.removeItem(EMERGENCY_KEY); } catch { /* nada */ } }

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('Este navegador no permite guardar partidas')); return; }
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE, { keyPath: 'id' }); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('No se pudo abrir el almacenamiento'));
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return (handle ? Promise.resolve(handle) : openDb()).then(db => new Promise<T>((resolve, reject) => {
    const own = db !== handle;
    const t = db.transaction(STORE, mode);
    const r = fn(t.objectStore(STORE));
    t.oncomplete = () => { if (own) db.close(); resolve(r.result); };
    t.onerror = t.onabort = () => { if (own) db.close(); reject(t.error ?? new Error('Error de almacenamiento')); };
  }));
}

const canGzip = () => typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

async function pack(json: string): Promise<{ gz: boolean; payload: Blob | string; size: number }> {
  if (!canGzip()) return { gz: false, payload: json, size: json.length };
  const blob = await new Response(new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'))).blob();
  return { gz: true, payload: blob, size: blob.size };
}

async function unpack(r: SlotRecord): Promise<string> {
  if (!r.gz) return r.payload as string;
  return new Response((r.payload as Blob).stream().pipeThrough(new DecompressionStream('gzip'))).text();
}

/** Guarda una partida en una ranura (la sobrescribe). */
export async function writeSlot(id: string, name: string, save: SaveData): Promise<SlotInfo> {
  const { gz, payload, size } = await pack(JSON.stringify(save));
  const rec: SlotRecord = { id, name, savedAt: save.savedAt, version: save.v, meta: save.meta, size, gz, payload };
  await tx('readwrite', s => s.put(rec));
  const { payload: _p, gz: _g, ...info } = rec;
  return info;
}

/** Lee la partida de una ranura (o null si está vacía). */
export async function readSlot(id: string): Promise<SaveData | null> {
  const r = await tx<SlotRecord | undefined>('readonly', s => s.get(id));
  if (!r) return null;
  return JSON.parse(await unpack(r));
}

/** Ranuras ocupadas, la más reciente primero (sin cargar las partidas). */
export async function listSlots(): Promise<SlotInfo[]> {
  try {
    const all = await tx<SlotRecord[]>('readonly', s => s.getAll());
    return all.map(({ payload: _p, gz: _g, ...info }) => info).sort((a, b) => b.savedAt - a.savedAt);
  } catch { return []; }
}

export async function deleteSlot(id: string): Promise<void> {
  await tx('readwrite', s => s.delete(id));
}

/** "hace 5 min", "ayer"... */
export function ago(ts: number): string {
  const s = Math.max(0, (Date.now() - ts) / 1000);
  if (s < 60) return 'hace un momento';
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  const d = Math.floor(s / 86400);
  return d === 1 ? 'ayer' : `hace ${d} días`;
}

export function gameClock(t: number): string {
  const m = Math.floor(t / 60);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
}
