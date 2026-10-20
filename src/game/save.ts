import { Entity } from './Entity';
import type { Game, GameOptions } from './Game';

/**
 * Guardar y cargar partidas.
 *
 * `snapshot(game)` saca una copia en datos simples de todo el estado: mapa y relieve, entidades
 * (con sus órdenes y colas), jugadores (recursos, edad, tecnologías, niebla, estadísticas),
 * proyectiles, restos, relojes, el estado del generador aleatorio, `game.data` (grupos en
 * formación, Guerra declarada...) y lo que cada sistema guarde (IA, auras, mods).
 *
 * `new Game(reg, save.opts, save)` reconstruye la partida a partir de ella: no genera el mapa,
 * vuelve a aplicar a cada jugador su civilización y sus tecnologías (los modificadores se
 * recalculan, no se guardan) y restaura el resto tal cual. La simulación sigue igual que si no
 * se hubiera guardado (hay un test que lo comprueba).
 *
 * El formato lleva versión (`SAVE_VERSION`). Al cargar una partida de una versión anterior se
 * aplican las migraciones de `MIGRATIONS`; una de una versión posterior no se carga.
 */

export const SAVE_VERSION = 1;

/** Migraciones: `MIGRATIONS[v]` convierte una partida de la versión v en la v+1. */
const MIGRATIONS: Record<number, (s: SaveData) => SaveData> = {};

export interface SaveMeta {
  mapType: string;
  mapName: string;
  time: number;
  player: string;
  civ: string;
  age: string;
  players: number;
}

export interface SaveData {
  v: number;
  savedAt: number;
  opts: GameOptions;
  meta: SaveMeta;
  state: any;
}

// ------------------------------------------------------------------ codificación de datos

function toB64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
function fromB64(b64: string): Uint8Array {
  const s = atob(b64), out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

const TYPED: Record<string, any> = { u8: Uint8Array, i32: Int32Array, f32: Float32Array, f64: Float64Array, u16: Uint16Array, i16: Int16Array };
function typedTag(v: ArrayBufferView): string | null {
  if (v instanceof Uint8Array) return 'u8';
  if (v instanceof Int32Array) return 'i32';
  if (v instanceof Float32Array) return 'f32';
  if (v instanceof Float64Array) return 'f64';
  if (v instanceof Uint16Array) return 'u16';
  if (v instanceof Int16Array) return 'i16';
  return null;
}

/** A datos JSON: Map, Set y arrays tipados pasan a objetos marcados con `$`. */
export function encode(v: any): any {
  if (v === null || typeof v !== 'object') return typeof v === 'number' && !Number.isFinite(v) ? { $: 'num', v: String(v) } : v;
  if (ArrayBuffer.isView(v)) {
    const tag = typedTag(v);
    if (tag) return { $: tag, b: toB64(new Uint8Array(v.buffer, v.byteOffset, v.byteLength)) };
  }
  if (v instanceof Map) return { $: 'map', e: [...v.entries()].map(([k, x]) => [encode(k), encode(x)]) };
  if (v instanceof Set) return { $: 'set', e: [...v].map(encode) };
  if (Array.isArray(v)) return v.map(encode);
  const out: any = {};
  for (const k of Object.keys(v)) {
    const x = v[k];
    if (typeof x === 'function' || x === undefined) continue;
    out[k] = encode(x);
  }
  return out;
}

export function decode(v: any): any {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(decode);
  switch (v.$) {
    case 'map': return new Map(v.e.map(([k, x]: any) => [decode(k), decode(x)]));
    case 'set': return new Set(v.e.map(decode));
    case 'num': return Number(v.v);
    default:
      if (v.$ && TYPED[v.$]) {
        const bytes = fromB64(v.b);
        return new TYPED[v.$](bytes.buffer, bytes.byteOffset, bytes.byteLength / TYPED[v.$].BYTES_PER_ELEMENT);
      }
  }
  const out: any = {};
  for (const k of Object.keys(v)) out[k] = decode(v[k]);
  return out;
}

// ------------------------------------------------------------------ instantánea

// `visible` no se guarda: la niebla de este instante se recalcula al cargar
const PLAYER_FIELDS = ['res', 'age', 'researched', 'upgrades', 'popUsed', 'popCap', 'counts', 'pending', 'defeated', 'explored', 'stats', 'warnedAt', 'lastDeath', 'data'] as const;

const KEEP = new Set(['id', 'kind', 'defId', 'owner']);
let defaults: Record<string, any> | null = null;

/** Solo los campos de una entidad que no tienen el valor por defecto (las partidas ocupan mucho menos). */
function compactEntity(e: Entity): Record<string, any> {
  defaults ??= { ...new Entity(0, 'unit', '', 0) };
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(e)) {
    if (KEEP.has(k)) { out[k] = v; continue; }
    if (k === 'px' && v === e.x) continue;
    if (k === 'py' && v === e.y) continue;
    const d = defaults[k];
    if (v === d) continue;
    if (Array.isArray(v) && !v.length && Array.isArray(d)) continue;
    if (v && typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length && d && typeof d === 'object') continue;
    out[k] = v;
  }
  return out;
}

export function snapshot(game: Game): SaveData {
  const h = game.human, m = game.map;
  const state = {
    time: game.time, tick: game.tick, humanId: game.humanId, over: game.over, rng: game.rngState, nextId: game.nextEntityId,
    map: { terrain: m.terrain, heights: m.heights, visualRelief: m.visualRelief },
    players: game.players.map(p => {
      const o: any = { id: p.id };
      for (const k of PLAYER_FIELDS) o[k] = (p as any)[k];
      return o;
    }),
    entities: game.list.filter(e => !e.dead).map(compactEntity),
    projectiles: game.projectiles,
    decals: game.decals,
    data: game.data,
    systems: Object.fromEntries(game.systems.map((s, i) => [game.systemIds[i], s.save?.()]).filter(([, v]) => v !== undefined)),
  };
  const mt = game.reg.mapTypes.get(game.opts.mapType);
  return {
    v: SAVE_VERSION, savedAt: Date.now(), opts: { ...game.opts },
    meta: {
      mapType: game.opts.mapType, mapName: (mt?.name ?? game.opts.mapType).replace(' (real)', ''), time: game.time,
      player: h.name, civ: h.civ.name, age: game.reg.ageName(h.age), players: game.players.length - 1,
    },
    state: encode(state),
  };
}

/** Comprueba la versión y aplica migraciones. Devuelve un mensaje de error si no se puede cargar. */
export function upgradeSave(save: SaveData): SaveData | string {
  if (!save || typeof save.v !== 'number' || !save.state || !save.opts) return 'El archivo de la partida está dañado';
  if (save.v > SAVE_VERSION) return 'La partida es de una versión más nueva del juego';
  let s = save;
  while (s.v < SAVE_VERSION) {
    const mig = MIGRATIONS[s.v];
    if (!mig) return `No se puede convertir una partida de la versión ${s.v}`;
    s = mig(s);
  }
  return s;
}

/** Estado decodificado de una partida guardada (para `restoreWorld` y `restoreSystems`). */
export function decodeState(save: SaveData): any { return decode(save.state); }

/** Restaura el mundo (lo llama el constructor de Game antes de crear los sistemas). */
export function restoreWorld(game: Game, st: any) {
  const m = game.map, reg = game.reg;
  m.terrain.set(st.map.terrain);
  m.heights.set(st.map.heights);
  m.visualRelief = st.map.visualRelief;
  m.heightVersion++;
  m.version++;
  m.obstaclesChanged();

  // Jugadores: civilización y tecnologías otra vez (recalcula los modificadores), luego sus datos
  for (const sp of st.players) {
    const p = game.players[sp.id];
    if (!p) continue;
    for (const id of sp.researched as Set<string>) {
      if (p.researched.has(id) || !reg.techs.has(id)) continue;
      const effects = reg.tech(id).effects.filter(e => e.type !== 'grant' && e.type !== 'custom');
      p.addEffects(effects, game);
      p.researched.add(id);
    }
    for (const k of PLAYER_FIELDS) (p as any)[k] = sp[k];
  }

  // Entidades (las de contenido que ya no existe, p. ej. de un mod quitado, se descartan)
  for (const se of st.entities) {
    const known = se.kind === 'unit' ? reg.units.has(se.defId) : se.kind === 'building' ? reg.buildings.has(se.defId) : reg.resourceNodes.has(se.defId);
    if (!known) continue;
    const e = new Entity(se.id, se.kind, se.defId, se.owner);
    Object.assign(e, se);
    if (se.px === undefined) e.px = e.x;
    if (se.py === undefined) e.py = e.y;
    game.adoptEntity(e);
  }
  game.nextEntityId = st.nextId;
  game.projectiles = st.projectiles ?? [];
  game.decals = st.decals ?? [];
  game.data = st.data ?? {};
  game.time = st.time; game.tick = st.tick; game.humanId = st.humanId; game.over = st.over;
  game.rngState = st.rng;
  for (const p of game.players) (p as any).cache?.clear?.();
}

/** Restaura el estado interno de los sistemas (después de crearlos). */
export function restoreSystems(game: Game, st: any) {
  game.systems.forEach((s, i) => {
    const saved = st.systems?.[game.systemIds[i]];
    if (saved !== undefined) s.load?.(saved);
  });
}
