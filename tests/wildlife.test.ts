import { describe, expect, it } from 'vitest';
import { TICK_DT } from '../src/core/constants';
import { Commands } from '../src/game/commands';
import type { Game } from '../src/game/Game';
import { stateHash } from '../src/game/net/hash';
import { snapshot, upgradeSave } from '../src/game/save';
import { Game as GameClass } from '../src/game/Game';
import { newGame, reg } from './helpers';

function run(g: Game, seconds: number, until?: () => boolean) {
  for (let i = 0; i < seconds / TICK_DT && !(until && until()); i++) g.update(TICK_DT);
}

/** Partida llana y vacía con un centro urbano del jugador 1 (y un edificio lejano del 2 para que no acabe). */
async function emptyGame(): Promise<Game> {
  const g = await newGame('arabia', { seed: 9 });
  for (const e of [...g.list]) g.remove(e);
  g.update(TICK_DT);
  g.map.terrain.fill(g.reg.terrain('grass'));
  g.map.heights.fill(0);
  g.map.heightVersion++; g.map.version++; g.map.obstaclesChanged();
  g.placeBuilding('house', 2, 85, 85, true);
  g.placeBuilding('townCenter', 1, 20, 20, true);
  return g;
}

describe('caza y ganadería', () => {
  it('el generador reparte animales cerca de las bases, de forma determinista', async () => {
    const a = await newGame('arabia', { seed: 5 }), b = await newGame('arabia', { seed: 5 });
    const animals = (g: Game) => g.units.filter(u => g.unitDef(u).wildlife);
    expect(animals(a).filter(u => a.unitDef(u).id === 'deer').length).toBeGreaterThanOrEqual(8);
    expect(animals(a).some(u => a.unitDef(u).id === 'boar')).toBe(true);
    expect(animals(a).map(u => `${u.defId}${u.x},${u.y}`)).toEqual(animals(b).map(u => `${u.defId}${u.x},${u.y}`));
    const tcs = a.buildings.filter(x => a.buildingDef(x).classes.includes('townCenter'));
    for (const u of animals(a)) {
      expect(u.owner).toBe(0);
      expect(a.map.walkable(Math.floor(u.x), Math.floor(u.y))).toBe(true);
      expect(a.map.region(Math.floor(u.x), Math.floor(u.y))).toBe(a.map.region(Math.floor(a.findFreeTile(tcs[0].x, tcs[0].y, 10)!.x), Math.floor(a.findFreeTile(tcs[0].x, tcs[0].y, 10)!.y)));
    }
    // Cada jugador tiene ciervos a un paseo de su base
    for (const tc of tcs) expect(animals(a).some(u => Math.hypot(u.x - tc.x, u.y - tc.y) < 30)).toBe(true);
  });

  it('un aldeano caza un ciervo, que deja un cadáver, y lleva la carne al centro urbano', async () => {
    const g = await emptyGame();
    const deer = g.spawnUnit('deer', 0, 28, 24);
    const v = g.spawnUnit('villager', 1, 24, 24);
    const food = g.players[1].res.food;
    Commands.gather(g, [v], deer);
    run(g, 8, () => deer.dead);
    expect(deer.dead).toBe(true);
    expect(g.nodes.some(n => !n.dead && n.defId === 'deerCarcass')).toBe(true);
    run(g, 60, () => g.players[1].res.food >= food + 20);
    expect(g.players[1].res.food).toBeGreaterThanOrEqual(food + 20);
    // La carne se carga a hombros: más que lo normal de un aldeano
    expect(g.reg.resourceNodes.get('deerCarcass')!.carryMul).toBeGreaterThan(1);
  });

  it('el jabalí se defiende y el ciervo herido huye', async () => {
    const g = await emptyGame();
    const boar = g.spawnUnit('boar', 0, 30, 24);
    const v = g.spawnUnit('villager', 1, 26, 24);
    Commands.gather(g, [v], boar);
    run(g, 10, () => v.dead || boar.dead);
    expect(boar.order?.type === 'retaliate' || boar.dead || v.hp < v.maxHp).toBe(true);
    expect(v.hp).toBeLessThan(v.maxHp);
    const deer = g.spawnUnit('deer', 0, 50, 50);
    const v2 = g.spawnUnit('villager', 1, 49, 50);
    deer.hp = 50; deer.maxHp = 50; // aguanta un par de golpes
    Commands.gather(g, [v2], deer);
    run(g, 6, () => deer.data.home && deer.data.home.x !== 50);
    expect(Math.hypot(deer.data.home.x - 50, deer.data.home.y - 50)).toBeGreaterThan(3);
  });

  it('la caballería de exploración también caza, pero otras tropas no', async () => {
    const g = await emptyGame();
    const deer = g.spawnUnit('deer', 0, 28, 24);
    const scout = g.spawnUnit('scoutCavalry', 1, 25, 24), sword = g.spawnUnit('militia', 1, 25, 26);
    Commands.gather(g, [scout, sword], deer);
    expect(scout.order?.type).toBe('gather');
    expect(sword.order).toBeNull();
  });

  it('el corral cría ovejas y un aldeano las sacrifica por su carne', async () => {
    const g = await emptyGame();
    const p = g.players[1];
    p.age = 1; p.res.food = 500; p.res.wood = 500;
    g.placeBuilding('mill', 1, 25, 25, true);
    const corral = g.placeBuilding('corral', 1, 14, 14, true);
    expect(Commands.train(g, corral, 'sheep')).toBe(true);
    expect(p.res.food).toBe(460);
    run(g, 20, () => g.units.some(u => u.defId === 'sheep'));
    const sheep = g.units.find(u => u.defId === 'sheep' && !u.dead)!;
    expect(sheep).toBeTruthy();
    expect(p.popUsed).toBe(0);
    const v = g.spawnUnit('villager', 1, sheep.x + 1, sheep.y);
    Commands.gather(g, [v], sheep);
    run(g, 5, () => sheep.dead);
    expect(sheep.dead).toBe(true);
    run(g, 240, () => p.res.food >= 559.9);
    expect(p.res.food).toBeGreaterThanOrEqual(559.9); // 460 + 100 - lo que aún lleve
    // El ganado de otro jugador no se puede sacrificar
    const other = g.spawnUnit('sheep', 2, 60, 60);
    Commands.gather(g, [v], other);
    expect(v.order?.targetId).not.toBe(other.id);
  });

  it('una partida con animales se guarda y se carga igual', async () => {
    const g = await newGame('arabia', { seed: 12 });
    run(g, 40);
    const save = JSON.parse(JSON.stringify(snapshot(g)));
    const up = upgradeSave(save);
    if (typeof up === 'string') throw new Error(up);
    const h = new GameClass(reg, up.opts, up);
    expect(stateHash(h)).toBe(stateHash(g));
    run(g, 30); run(h, 30);
    expect(stateHash(h)).toBe(stateHash(g));
  });
});
