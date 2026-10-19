import { BALANCE } from '../config/balance';
import type { Entity } from './Entity';
import type { Game } from './Game';
import type { GameMap } from './GameMap';
import { heightOf } from './heightRules';

/**
 * Visión con relieve (valores en BALANCE.vision):
 *  - Desde lo alto se ve más lejos: +bonusPerLevel casillas por nivel por encima del
 *    terreno de alrededor (con tope).
 *  - Las crestas tapan lo que hay detrás: se lanzan rayos desde los ojos del observador y
 *    una casilla solo es visible si lo que hay en ella (un objeto de `targetHeight`) asoma
 *    por encima del horizonte más alto encontrado antes en ese rayo.
 *  - La roca no tapa por sí misma: tapa su altura, como cualquier otro terreno.
 */

/** Altura de los ojos de una entidad (en niveles de elevación). */
export function eyeHeight(game: Game, e: Entity): number {
  const v = BALANCE.vision;
  if (e.kind === 'building') {
    const cls = game.buildingDef(e).classes;
    return heightOf(game, e) + (cls.includes('tower') || cls.includes('castle') ? v.eyeTower : v.eyeBuilding);
  }
  return heightOf(game, e) + v.eyeUnit;
}

/** Casillas de visión extra por estar por encima del terreno de alrededor. */
export function heightVisionBonus(map: GameMap, x: number, y: number, ground: number): number {
  const v = BALANCE.vision, th = map.tileHeights();
  let sum = 0, n = 0;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const tx = Math.floor(x + Math.cos(a) * 4), ty = Math.floor(y + Math.sin(a) * 4);
    if (tx < 0 || ty < 0 || tx >= map.w || ty >= map.h) continue;
    sum += th[ty * map.w + tx]; n++;
  }
  if (!n) return 0;
  const above = (ground - sum / n) / BALANCE.relief.levelStep;
  return Math.max(0, Math.min(v.bonusCap, Math.floor(above * v.bonusPerLevel)));
}

/** Radio de visión total de una entidad (incluido el bonus de altura). */
export function sightRadius(game: Game, e: Entity): number {
  const p = game.players[e.owner];
  const base = p.getStat(game.defOf(e), 'los') + (e.kind === 'building' ? e.size / 2 : 0);
  return base + heightVisionBonus(game.map, e.x, e.y, heightOf(game, e));
}

const rayCache = new Map<number, Float32Array>();
/** Direcciones de los rayos para un radio (más rayos cuanto mayor es el radio). */
function rays(radius: number): Float32Array {
  const key = Math.ceil(radius);
  let r = rayCache.get(key);
  if (!r) {
    const n = Math.max(16, Math.ceil(2 * Math.PI * key * 1.6));
    r = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; r[i * 2] = Math.cos(a); r[i * 2 + 1] = Math.sin(a); }
    rayCache.set(key, r);
  }
  return r;
}

/**
 * Marca en `out` (y en `explored`, si se da) las casillas que se ven desde (x, y) con los ojos
 * a altura `eye` y alcance `radius`.
 */
export function castVision(map: GameMap, x: number, y: number, eye: number, radius: number, out: Uint8Array, explored?: Uint8Array) {
  const W = map.w, H = map.h, th = map.tileHeights();
  const target = BALANCE.vision.targetHeight;
  const cx = Math.floor(x), cy = Math.floor(y);
  if (cx >= 0 && cy >= 0 && cx < W && cy < H) { out[cy * W + cx] = 1; if (explored) explored[cy * W + cx] = 1; }
  const dirs = rays(radius);
  const step = 0.5;
  for (let r = 0; r < dirs.length; r += 2) {
    const dx = dirs[r], dy = dirs[r + 1];
    let horizon = -Infinity;
    for (let d = step; d <= radius; d += step) {
      const px = x + dx * d, py = y + dy * d;
      const tx = Math.floor(px), ty = Math.floor(py);
      if (tx < 0 || ty < 0 || tx >= W || ty >= H) break;
      const i = ty * W + tx;
      const ground = th[i];
      if ((ground + target - eye) / d >= horizon) { out[i] = 1; if (explored) explored[i] = 1; }
      const s = (ground - eye) / d;
      if (s > horizon) horizon = s;
    }
  }
}

/** ¿Ve `a` la casilla de `b`? (para pruebas y para la IA) */
export function canSee(game: Game, a: Entity, bx: number, by: number): boolean {
  const m = game.map, tmp = new Uint8Array(m.w * m.h);
  castVision(m, a.x, a.y, eyeHeight(game, a), sightRadius(game, a), tmp);
  return tmp[Math.floor(by) * m.w + Math.floor(bx)] === 1;
}
