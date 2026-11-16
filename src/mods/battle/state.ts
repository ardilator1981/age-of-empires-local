import { BALANCE } from '../../config/balance';
import type { Pt } from '../../core/types';
import type { Entity } from '../../game/Entity';
import type { Game } from '../../game/Game';
import { hypot } from '../../game/fmath';

/**
 * Estado de la capa táctica (docs/batalla-tactica.md §3.1–3.4). Todo son datos simples en
 * `game.data.battle`, así que se guarda con la partida y entra en la huella de la red.
 */

/** Un regimiento: soldados del mismo tipo que comparten moral, orientación y carga. */
export interface Regiment {
  id: number;
  owner: number;
  /** Tipo de unidad de sus miembros. */
  defId: string;
  /** Clase que le da tamaño y moral base (`BALANCE.battle.kinds`). */
  cls: string;
  members: number[];
  /** Efectivos de partida: las bajas se miden contra este número. */
  initial: number;
  size: number;
  morale: number;
  base: number;
  routed: boolean;
  /** Postura que tenían antes de huir. */
  prevStance: string;
  lance: boolean;
  cavalry: boolean;
  hero: boolean;
  /** Centro y orientación (vector unitario). */
  center: Pt;
  facing: Pt;
  /** Velocidad del centro (casillas por segundo). */
  vx: number;
  vy: number;
  /** De dónde llegan los golpes recientes (con olvido): el regimiento parado gira hacia ahí. */
  threat: Pt;
  lastPos: Pt | null;
  lastEnemyNear: number;
  flankUntil: number;
  rearUntil: number;
  /** Carga: ímpetu acumulado, en carga, hasta cuándo (−1 = hasta el primer golpe), jinetes que ya golpearon y regimientos ya golpeados en moral. */
  chargeT: number;
  charging: boolean;
  chargeUntil: number;
  struck: number[];
  chargeHit: number[];
  /** Último tick en que el fuego propio le bajó la moral (una vez por tick). */
  ffTick: number;
  /** Replegado por orden de la IA para recuperar moral, y la postura que tenía. */
  regroup?: boolean;
  regroupStance?: string;
  /** Cansancio 0–100, si corre, y segundos seguidos sin moverse. */
  fatigue: number;
  running: boolean;
  stillFor: number;
}

export interface BattleState {
  regs: Record<number, Regiment>;
  next: number;
  /** Jugadores cuyo General ha caído (techo de moral hasta que tengan otro). */
  generalDead: Record<number, boolean>;
  /** Tiempo acumulado desde la última actualización de moral. */
  acc: number;
  /** Cuándo arengó por última vez cada jugador. */
  harangued: Record<number, number>;
  /** Órdenes retrasadas por el mando limitado (sin General), en orden de llegada. */
  queue: { at: number; pid: number; c: any }[];
}

export function battleState(game: Game): BattleState | undefined { return game.data.battle; }

export function regimentOf(game: Game, e: Entity): Regiment | undefined {
  const id = e.data.reg;
  return id === undefined ? undefined : battleState(game)?.regs[id];
}

/** Regimientos en orden de id (determinista). */
export function regiments(game: Game): Regiment[] {
  const st = battleState(game);
  return st ? Object.values(st.regs) : [];
}

/** Clase de regimiento de un tipo de unidad, o null si no forma regimientos (asedio, aldeanos, rey...). */
export function kindOf(game: Game, u: Entity): { cls: string; size: number; morale: number } | null {
  const d = game.unitDef(u);
  if (d.gatherer || !(d.attack ?? 0) || d.classes.includes('siege') || d.classes.includes('king')) return null;
  for (const k of BALANCE.battle.kinds) if (d.classes.includes(k.cls)) return k;
  return null;
}

/** Municiones de una unidad a distancia, o null si no gasta (cuerpo a cuerpo, aviación, asedio que no es artillería). */
export function ammoMax(game: Game, u: Entity): number | null {
  const d = game.unitDef(u), c = d.classes;
  if (game.players[u.owner].getStat(d, 'range') < 1 || c.includes('air') || (c.includes('siege') && !c.includes('artillery'))) return null;
  const byId = BALANCE.battle.ammoById[d.id];
  if (byId !== undefined) return byId;
  for (const k of BALANCE.battle.ammo) if (c.includes(k.cls)) return k.ammo;
  return BALANCE.battle.ammoDefault;
}

/** Fracción de munición que le queda a un regimiento (null si no dispara). */
export function ammoFraction(game: Game, r: Regiment): { frac: number; dry: boolean } | null {
  let sum = 0, n = 0, dry = 0;
  for (const u of aliveMembers(game, r)) {
    const max = ammoMax(game, u);
    if (max === null) continue;
    n++;
    sum += (u.data.ammo ?? max) / max;
    if (u.data.noAmmo) dry++;
  }
  return n ? { frac: sum / n, dry: dry * 2 >= n } : null;
}

export type Zone = 'front' | 'flank' | 'rear';

/**
 * Por dónde le llega un golpe a un regimiento: ángulo entre su orientación y la dirección del
 * atacante, medida desde el centro del regimiento. Con productos escalares, sin trigonometría
 * (frente ±60° = coseno ≥ 0,5; retaguardia pasados 120°).
 */
export function hitZone(tr: Regiment, attacker: Pt): Zone {
  const dx = attacker.x - tr.center.x, dy = attacker.y - tr.center.y, d = hypot(dx, dy) || 1;
  const c = (dx * tr.facing.x + dy * tr.facing.y) / d;
  return c >= 0.5 ? 'front' : c < -0.5 ? 'rear' : 'flank';
}

export function aliveMembers(game: Game, r: Regiment): Entity[] {
  const out: Entity[] = [];
  for (const id of r.members) { const u = game.get(id); if (u) out.push(u); }
  return out;
}

/** Moral máxima: con el General caído, el techo de la batalla. */
export function moraleCap(st: BattleState, r: Regiment): number {
  return st.generalDead[r.owner] ? Math.min(r.base, BALANCE.battle.generalDeadCap) : r.base;
}
