import type { Pt } from '../../core/types';
import type { Entity } from '../../game/Entity';
import type { Game } from '../../game/Game';
import type { Player } from '../../game/Player';
import { garrisonOf } from '../../game/garrison';

/**
 * Reglas del modo "Matar al rey" (simulación pura: sin DOM).
 *
 * Cada jugador empieza con un rey (unidad `king`, resistente y sin ataque). Quien pierde a su rey
 * pierde la partida; gana el último con rey vivo. El rey puede refugiarse en los edificios con
 * `shelter` (centro urbano y castillos; otros edificios de estado se añaden con esa propiedad):
 * dentro no se le puede atacar, y si el edificio cae, sale y queda expuesto (no muere por ello).
 *
 * El modo se elige con la condición de victoria «Matar al rey»: si no está elegida, nada cambia.
 * El motor no tiene equipos ni alianzas, así que gana el último jugador con rey vivo.
 */

export const KING = 'king';
export const REGICIDE = 'regicide';

/** Estado del modo (va en `game.data.regicide`, así que se guarda con la partida). */
export interface RegicideState {
  /** Id de la entidad del rey de cada jugador. */
  kings: Record<number, number>;
}

export function regicideState(game: Game): RegicideState | undefined { return game.data.regicide; }

export function regicideOn(game: Game): boolean { return game.opts.victory === REGICIDE && !!regicideState(game); }

/** Rey vivo del jugador (undefined si ha caído o el modo no está activo). */
export function kingOf(game: Game, pid: number): Entity | undefined {
  const id = regicideState(game)?.kings[pid];
  return id === undefined ? undefined : game.get(id);
}

/** Edificio en cuyo refugio está el rey (si está dentro). */
export function shelterOfKing(game: Game, king: Entity): Entity | undefined {
  return king.inside ? game.get(king.inside) : undefined;
}

/** Un jugador pierde cuando su rey ha muerto (si empezó con uno). */
export function kingFallen(game: Game, p: Player): boolean {
  const id = regicideState(game)?.kings[p.id];
  return id !== undefined && !game.get(id);
}

/** Dónde empieza el rey de un jugador: junto a su edificio inicial (o su primera unidad). */
function startSpot(game: Game, pid: number): Pt | null {
  const tc = game.buildings.find(b => b.owner === pid && !b.dead && b.defId === game.reg.setup.townCenter)
    ?? game.buildings.find(b => b.owner === pid && !b.dead);
  if (tc) return game.findFreeTile(tc.x + tc.size / 2 + 1, tc.y, 10);
  const u = game.units.find(x => x.owner === pid && !x.dead);
  return u ? game.findFreeTile(u.x, u.y, 10) : null;
}

/** Al empezar la partida: un rey por jugador (solo con la victoria «Matar al rey» elegida). */
export function initRegicide(game: Game) {
  if (game.opts.victory !== REGICIDE) return;
  const st: RegicideState = { kings: {} };
  for (const p of game.players.slice(1)) {
    const at = startSpot(game, p.id);
    if (!at) continue;
    st.kings[p.id] = game.spawnUnit(KING, p.id, at.x, at.y).id;
  }
  game.data.regicide = st;
}

/** Cuántos reyes rivales siguen vivos. */
export function rivalKings(game: Game, pid: number): Entity[] {
  const out: Entity[] = [];
  for (const p of game.players.slice(1)) {
    if (p.id === pid || p.defeated) continue;
    const k = kingOf(game, p.id);
    if (k) out.push(k);
  }
  return out;
}

export { garrisonOf };
