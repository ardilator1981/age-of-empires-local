import { buildRegistry } from '../src/core/Registry';
import { Game, type GameOptions } from '../src/game/Game';
import { ALL_MODS } from '../src/mods';

/** Modos de juego que cambian las reglas: solo se activan en las pruebas que los piden. */
const MODES = ['declared-war', 'regicide'];
const BASE_MODS = ALL_MODS.filter(m => !MODES.includes(m.id));
export const reg = buildRegistry(BASE_MODS);
/** Registro con el modo Guerra declarada. */
export const warReg = buildRegistry(ALL_MODS);
/** Registro con el modo Matar al rey (sin Guerra declarada, que impide atacar). */
const REGICIDE_MODS = ALL_MODS.filter(m => m.id !== 'declared-war');
export const regicideReg = buildRegistry(REGICIDE_MODS);

export function options(mapType: string, opts: Partial<GameOptions> & { players?: number; war?: boolean; regicide?: boolean } = {}): GameOptions {
  const n = opts.players ?? 2;
  return {
    mapType, mapSize: 96, startingResources: 'standard', startAge: 0, victory: 'conquest', visibility: 'normal',
    popLimit: 125, speed: 1, seed: 1, mods: (opts.war ? ALL_MODS : opts.regicide ? REGICIDE_MODS : BASE_MODS).map(m => m.id),
    ...(opts.regicide ? { victory: 'regicide' } : {}),
    ...opts,
    players: Array.from({ length: n }, (_, i) => ({ name: `P${i + 1}`, civ: 'franks', color: '#fff', human: i === 0, difficulty: 'normal' as const })),
  } as GameOptions;
}

/** Crea una partida (carga antes los datos del mapa si el tipo de mapa los necesita). */
export async function newGame(mapType: string, opts: Partial<GameOptions> & { players?: number; war?: boolean; regicide?: boolean } = {}): Promise<Game> {
  const r = opts.war ? warReg : opts.regicide ? regicideReg : reg;
  const mt = r.mapTypes.get(mapType) as { load?: () => Promise<void> } | undefined;
  if (mt?.load) await mt.load();
  return new Game(r, options(mapType, opts));
}
