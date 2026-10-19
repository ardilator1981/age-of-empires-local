import { describe, expect, it } from 'vitest';
import { TICK_DT } from '../src/core/constants';
import { Commands } from '../src/game/commands';
import type { Game } from '../src/game/Game';
import { exploreAvail } from '../src/game/rules';
import { newGame } from './helpers';

/** Partida llana y vacía: sin recursos, edificios ni unidades. */
async function emptyGame(): Promise<Game> {
  const g = await newGame('arabia', { seed: 9 });
  for (const e of [...g.list]) g.remove(e);
  g.update(TICK_DT);
  g.map.terrain.fill(g.reg.terrain('grass'));
  g.map.heights.fill(0);
  g.map.heightVersion++;
  g.map.version++;
  g.map.obstaclesChanged();
  return g;
}

function run(g: Game, seconds: number, until?: () => boolean) {
  for (let i = 0; i < seconds / TICK_DT && !(until && until()); i++) g.update(TICK_DT);
}

describe('órdenes', () => {
  it('al destruir un edificio, las unidades siguen con el siguiente del pueblo', async () => {
    const g = await emptyGame();
    // El jugador 2 conserva un edificio lejos para que la partida no termine
    g.placeBuilding('house', 2, 80, 80, true);
    const a = g.placeBuilding('house', 2, 40, 40, true);
    const b = g.placeBuilding('house', 2, 44, 40, true);
    a.hp = 5;
    const army = [0, 1, 2].map(i => g.spawnUnit('militia', 1, 38 + i * 0.6, 38));
    Commands.attack(g, army, a);
    run(g, 20, () => a.dead);
    expect(a.dead).toBe(true);
    run(g, 2);
    for (const u of army) expect(u.order?.targetId).toBe(b.id);
    b.hp = 5;
    run(g, 30, () => b.dead);
    expect(b.dead).toBe(true);
  });

  it('la exploración automática necesita un establo y descubre el mapa', async () => {
    const g = await emptyGame();
    const p = g.players[1];
    g.placeBuilding('townCenter', 1, 10, 10, true);
    g.placeBuilding('townCenter', 2, 80, 80, true);
    const scout = g.spawnUnit('scoutCavalry', 1, 15, 15);
    expect(exploreAvail(g, p, 'scoutCavalry').ok).toBe(false);
    Commands.explore(g, [scout]);
    expect(scout.order).toBeFalsy();

    g.placeBuilding('stable', 1, 16, 8, true);
    g.update(TICK_DT);
    expect(exploreAvail(g, p, 'scoutCavalry').ok).toBe(true);
    expect(exploreAvail(g, p, 'militia').visible).toBe(false);
    const before = p.explored.reduce((s, v) => s + v, 0);
    Commands.explore(g, [scout]);
    expect(scout.order?.type).toBe('explore');
    // A 1,55 casillas/s y 6 de visión, en 2 min se pueden barrer ~2.200 casillas (24 % del mapa)
    run(g, 120);
    const mid = p.explored.reduce((s, v) => s + v, 0);
    expect(mid / p.explored.length).toBeGreaterThan(0.2);
    run(g, 480, () => !scout.order || scout.dead);
    const after = p.explored.reduce((s, v) => s + v, 0);
    console.log('explorado', before, mid, after, p.explored.length, 'tiempo', Math.round(g.time), 'vivo', !scout.dead, scout.order?.type);
    expect(after / p.explored.length).toBeGreaterThan(0.85);
  });
});
