import { BALANCE } from '../config/balance';
import type { AnyDef } from '../core/types';
import type { Entity } from './Entity';
import type { Game } from './Game';

/**
 * Reglas de altura (valores en BALANCE.highGround):
 *  - Unidades a distancia y edificios defensivos más altos que su objetivo ganan alcance y daño.
 *  - Atacar cuesta arriba tiene una pequeña penalización (cualquier tipo de ataque).
 *  - El cuerpo a cuerpo no gana nada por atacar desde arriba (ver docs/decisiones.md).
 */

/** Altura del terreno bajo una entidad (los edificios, la de su base). */
export function heightOf(game: Game, e: Entity): number {
  if (e.kind === 'building') return game.map.baseHeight(e.tx, e.ty, e.size);
  return game.map.heightAt(e.x, e.y);
}

/** Diferencia de altura atacante − objetivo, en "niveles de altura". */
export function levelDiff(game: Game, a: Entity, t: Entity): number {
  return (heightOf(game, a) - heightOf(game, t)) / BALANCE.relief.levelStep;
}

function levelsAbove(diff: number): number {
  const hg = BALANCE.highGround;
  return diff >= hg.minDiff ? diff : 0;
}

/** Casillas de alcance extra de `a` contra `t` (0 si no es de ataque a distancia o no está más alto). */
export function rangeBonus(game: Game, a: Entity, t: Entity, baseRange: number): number {
  if (baseRange < 1) return 0;
  const hg = BALANCE.highGround;
  return Math.min(hg.rangeCap, Math.floor(levelsAbove(levelDiff(game, a, t)) * hg.rangePerLevel));
}

/** Multiplicador de daño por la diferencia de altura (en niveles) y el tipo de ataque. */
export function heightDamageFactor(diff: number, ranged: boolean): number {
  const hg = BALANCE.highGround;
  if (ranged && diff >= hg.minDiff) return 1 + Math.min(hg.damageCap, diff * hg.damagePerLevel);
  if (diff <= -hg.minDiff) return 1 - Math.min(hg.uphillPenaltyCap, -diff * hg.uphillPenaltyPerLevel);
  return 1;
}

/** ¿Es un atacante a distancia (unidad o edificio defensivo)? */
export function isRanged(game: Game, e: Entity, def: AnyDef = game.defOf(e)): boolean {
  return game.players[e.owner].getStat(def, 'range') >= 1;
}

/** Resumen de la ventaja de `a` contra `t`, para la interfaz. */
export function advantage(game: Game, a: Entity, t: Entity): { range: number; damage: number } {
  const def = game.defOf(a);
  const range = game.players[a.owner].getStat(def, 'range');
  const diff = levelDiff(game, a, t);
  return { range: rangeBonus(game, a, t, range), damage: heightDamageFactor(diff, range >= 1) - 1 };
}
