import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import type { Game } from '../src/game/Game';
import { findPath } from '../src/game/pathfinding';
import { heightDamageFactor, rangeBonus } from '../src/game/heightRules';
import { castVision, sightRadius } from '../src/game/vision';
import { newGame } from './helpers';

/** Partida sobre un terreno llano y vacío (sin recursos ni edificios) para medir reglas. */
async function flatGame(): Promise<Game> {
  const g = await newGame('arabia', { seed: 9 });
  for (const e of [...g.list]) g.remove(e);
  g.update(0.05);
  g.map.terrain.fill(g.reg.terrain('grass'));
  g.map.heights.fill(0);
  g.map.heightVersion++;
  g.map.version++;
  g.map.obstaclesChanged();
  return g;
}

/** Sube un rectángulo de vértices a altura h. */
function raise(g: Game, x0: number, y0: number, x1: number, y1: number, h: number) {
  const W = g.map.w + 1;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g.map.heights[y * W + x] = h;
  g.map.heightVersion++;
}

describe('reglas de altura', () => {
  it('daño: +15 % por nivel a distancia con tope, penalización cuesta arriba', () => {
    const hg = BALANCE.highGround;
    expect(heightDamageFactor(0, true)).toBe(1);
    expect(heightDamageFactor(2, true)).toBeCloseTo(1 + 2 * hg.damagePerLevel);
    expect(heightDamageFactor(10, true)).toBeCloseTo(1 + hg.damageCap);
    expect(heightDamageFactor(2, false)).toBe(1); // el cuerpo a cuerpo no gana desde arriba
    expect(heightDamageFactor(-2, false)).toBeCloseTo(1 - 2 * hg.uphillPenaltyPerLevel);
    expect(heightDamageFactor(-20, true)).toBeCloseTo(1 - hg.uphillPenaltyCap);
  });

  it('alcance: un arquero en una colina alcanza más lejos (con tope)', async () => {
    const g = await flatGame();
    const archer = g.spawnUnit('archer', 1, 20.5, 20.5);
    const foe = g.spawnUnit('militia', 2, 26.5, 20.5);
    expect(rangeBonus(g, archer, foe, 4)).toBe(0);
    raise(g, 17, 17, 24, 24, 2);
    expect(rangeBonus(g, archer, foe, 4)).toBe(Math.min(BALANCE.highGround.rangeCap, 2 * BALANCE.highGround.rangePerLevel));
    raise(g, 17, 17, 24, 24, 9);
    expect(rangeBonus(g, archer, foe, 4)).toBe(BALANCE.highGround.rangeCap);
    // y nada para el cuerpo a cuerpo
    expect(rangeBonus(g, archer, foe, 0)).toBe(0);
  });

  it('un arquero en alto hace más daño real en combate', async () => {
    const g = await flatGame();
    const shoot = (h: number) => {
      raise(g, 9, 9, 13, 13, h);
      const a = g.spawnUnit('archer', 1, 11.5, 11.5);
      const t = g.spawnUnit('manAtArms', 2, 14.5, 11.5);
      const hp0 = t.hp;
      a.order = { type: 'attack', targetId: t.id };
      for (let i = 0; i < 20 * 6; i++) g.update(0.05);
      const done = hp0 - t.hp;
      g.remove(a); g.remove(t); g.update(0.05);
      return done;
    };
    const flat = shoot(0), high = shoot(3);
    expect(high).toBeGreaterThan(flat * 1.2);
  });
});

describe('visión con relieve', () => {
  it('una cresta tapa lo que hay detrás; sin cresta se ve', async () => {
    const g = await flatGame();
    const m = g.map, out = new Uint8Array(m.w * m.h);
    castVision(m, 30.5, 30.5, 0.6, 8, out);
    expect(out[30 * m.w + 36]).toBe(1);
    raise(g, 33, 20, 33, 40, 6); // muro de 6 niveles entre medias
    out.fill(0);
    castVision(m, 30.5, 30.5, 0.6, 8, out);
    expect(out[30 * m.w + 37]).toBe(0);
    expect(out[30 * m.w + 27]).toBe(1); // hacia el otro lado se sigue viendo
  });

  it('desde lo alto el radio de visión es mayor', async () => {
    const g = await flatGame();
    const u = g.spawnUnit('scoutCavalry', 1, 40.5, 40.5);
    const base = sightRadius(g, u);
    for (let y = 30; y <= 51; y++) for (let x = 30; x <= 51; x++) {
      const d = Math.hypot(x - 40.5, y - 40.5);
      g.map.heights[y * (g.map.w + 1) + x] = Math.max(0, 5 - d * 0.5);
    }
    g.map.heightVersion++;
    expect(sightRadius(g, u)).toBeGreaterThan(base);
    expect(sightRadius(g, u) - base).toBeLessThanOrEqual(BALANCE.vision.bonusCap);
  });
});

describe('movimiento y caminos con pendiente', () => {
  it('el camino rodea una colina si el rodeo es razonable', async () => {
    const g = await flatGame();
    // Loma de 3 niveles, larga en x y estrecha en y: rodearla cuesta unas 4 casillas más
    for (let y = 27; y <= 34; y++) for (let x = 25; x <= 35; x++) g.map.heights[y * (g.map.w + 1) + x] = 3.0;
    g.map.heightVersion++;
    const r = findPath(g.map, 20.5, 30.5, { x0: 40, y0: 30, x1: 40, y1: 30 }, 0, 20000);
    expect(r.reached).toBe(true);
    const maxH = Math.max(...r.path.map(p => g.map.heightAt(p.x, p.y)));
    expect(maxH).toBeLessThan(3.0);
  });

  it('subir una cuesta es más lento que ir por llano', async () => {
    const g = await flatGame();
    const travel = (slope: boolean) => {
      if (slope) { for (let y = 0; y <= g.map.h; y++) for (let x = 0; x <= g.map.w; x++) g.map.heights[y * (g.map.w + 1) + x] = Math.max(0, (x - 10) * 0.5); g.map.heightVersion++; }
      const u = g.spawnUnit('militia', 1, 10.5, 50.5);
      u.order = { type: 'move', x: 20.5, y: 50.5 };
      let t = 0;
      while (u.order && t < 60) { g.update(0.05); t += 0.05; }
      g.remove(u); g.update(0.05);
      return t;
    };
    const flat = travel(false), up = travel(true);
    expect(up).toBeGreaterThan(flat * 1.05);
  });

  it('la roca es infranqueable incluso para el asedio', async () => {
    const g = await flatGame();
    const rock = g.reg.terrain('rock');
    for (let y = 0; y < g.map.h; y++) g.map.terrain[y * g.map.w + 30] = rock;
    g.map.version++; g.map.obstaclesChanged();
    const ram = g.spawnUnit('batteringRam', 1, 25.5, 40.5);
    ram.order = { type: 'move', x: 35.5, y: 40.5 };
    for (let i = 0; i < 20 * 40; i++) g.update(0.05);
    expect(ram.x).toBeLessThan(30);
  });
});
