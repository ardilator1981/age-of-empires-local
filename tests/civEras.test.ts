import { describe, expect, it } from 'vitest';
import { TICK_DT } from '../src/core/constants';
import { Commands } from '../src/game/commands';
import { Game } from '../src/game/Game';
import type { Player } from '../src/game/Player';
import { SAVE_VERSION, snapshot, upgradeSave, type SaveData } from '../src/game/save';
import { options, reg } from './helpers';

function rusGame(startAge = 0, seed = 5): Game {
  const o = options('arabia', { seed, startAge });
  o.players = [
    { name: 'R', civ: 'rus', color: '#3b6fe0', human: true, difficulty: 'normal' },
    { name: 'F', civ: 'france', color: '#d63a3a', human: false, difficulty: 'normal' },
  ] as any;
  return new Game(reg, o);
}

/** Sube de edad como lo hace la investigación terminada (la misma ruta que en una partida). */
function finishAge(g: Game, p: Player, techId: string) {
  const prod = g.systems.find(s => 'finishTech' in s) as any;
  const tc = g.buildings.find(b => b.owner === p.id && b.defId === 'townCenter')!;
  prod.finishTech(tc, techId);
}

const huntGold = (p: Player) => p.yieldBonuses('deerCarcass').reduce((s, y) => s + y.ratio, 0);
const towerHp = (g: Game, p: Player) => p.getStat(g.reg.building('watchTower'), 'hp');

describe('civilizaciones por era', () => {
  it('Rusia cambia de identidad y de bonos al subir de edad', () => {
    const g = rusGame();
    const p = g.players[1];
    expect(p.identity).toBe('Eslavos orientales y Rus\' de Kiev');
    expect(huntGold(p)).toBeCloseTo(0.2);
    const hp0 = towerHp(g, p);

    finishAge(g, p, 'feudalAge');
    expect(p.age).toBe(1);
    expect(p.identity).toBe('Rus\' de Kiev cristiana');
    expect(towerHp(g, p)).toBeCloseTo(hp0 * 1.2);

    finishAge(g, p, 'castleAge');
    expect(p.identity).toBe('Principado de Moscú');
    expect(p.gatherMult('gold')).toBeCloseTo(1.1);
    expect(p.getCost(g.reg.unit('lightCavalry')).food).toBe(64);

    finishAge(g, p, 'imperialAge');
    expect(p.identity).toBe('Zarato ruso');
    // «Sustituye»: el tributo de Moscú desaparece, lo demás de las eras anteriores se conserva
    expect(p.gatherMult('gold')).toBeCloseTo(1);
    expect(p.getCost(g.reg.unit('lightCavalry')).food).toBe(64);
    expect(towerHp(g, p)).toBeCloseTo(hp0 * 1.2);
    expect(p.getStat(g.reg.building('watchTower'), 'range')).toBe(g.reg.building('watchTower').range! + 1);
    expect(huntGold(p)).toBeCloseTo(0.3);
  });

  it('las civilizaciones sin bonos por era no cambian, pero sí de nombre', () => {
    const g = rusGame();
    const f = g.players[2];
    expect(f.identity).toBe('Francos');
    const hp = f.getStat(g.reg.unit('knight'), 'hp');
    finishAge(g, f, 'feudalAge');
    expect(f.identity).toBe('Francia capeta');
    expect(f.getStat(g.reg.unit('knight'), 'hp')).toBe(hp);
    expect(g.players[0].identity).toBe('Naturaleza');
  });

  it('empezar en una edad avanzada equivale a haber subido hasta ella', () => {
    const a = rusGame();
    const p = a.players[1];
    for (const t of ['feudalAge', 'castleAge', 'imperialAge']) finishAge(a, p, t);
    const b = rusGame(3);
    const q = b.players[1];
    expect(q.identity).toBe(p.identity);
    expect(JSON.stringify(q.modifiers)).toBe(JSON.stringify(p.modifiers));
  });

  it('rebuildModifiers conserva los modificadores extra (ritmo de la IA)', () => {
    const g = rusGame();
    const ai = g.players[2];
    const before = ai.gatherMult('food');
    ai.rebuildModifiers(g);
    expect(ai.gatherMult('food')).toBe(before);
  });

  it('al cargar una partida se recalculan los bonos de la era', () => {
    const g = rusGame();
    const p = g.players[1];
    for (const t of ['feudalAge', 'castleAge']) finishAge(g, p, t);
    for (let i = 0; i < 40; i++) g.update(TICK_DT);
    const save: SaveData = JSON.parse(JSON.stringify(snapshot(g)));
    const up = upgradeSave(save);
    if (typeof up === 'string') throw new Error(up);
    const h = new Game(reg, up.opts, up);
    const q = h.players[1];
    expect(q.age).toBe(2);
    expect(q.identity).toBe('Principado de Moscú');
    expect(JSON.stringify(q.modifiers)).toBe(JSON.stringify(p.modifiers));
    expect(q.gatherMult('gold')).toBeCloseTo(1.1);
    expect(huntGold(q)).toBeCloseTo(huntGold(p));
    // ...y la IA conserva su ritmo tras cargar
    expect(h.players[2].gatherMult('food')).toBeCloseTo(g.players[2].gatherMult('food'));
  });

  it('las partidas de la versión 1 (sin eras) se descartan', () => {
    const g = rusGame();
    const s = snapshot(g);
    expect(s.v).toBe(SAVE_VERSION);
    expect(upgradeSave({ ...s, v: 1 })).toMatch(/antigua/);
  });

  it('la caza de Rusia da oro además de comida (y la de otras civilizaciones, no)', () => {
    const hunt = (civ: 'rus' | 'france') => {
      const g = rusGame();
      if (civ === 'france') g.players[1].civ = reg.civs.get('france')!, g.players[1].rebuildModifiers(g);
      for (const e of [...g.list]) g.remove(e);
      g.update(TICK_DT);
      g.map.terrain.fill(g.reg.terrain('grass'));
      g.map.heights.fill(0);
      g.map.heightVersion++; g.map.version++; g.map.obstaclesChanged();
      g.placeBuilding('house', 2, 85, 85, true);
      g.placeBuilding('townCenter', 1, 20, 20, true);
      const deer = g.spawnUnit('deer', 0, 28, 24);
      const v = g.spawnUnit('villager', 1, 24, 24);
      const p = g.players[1];
      const [food, gold] = [p.res.food, p.res.gold];
      Commands.gather(g, [v], deer);
      for (let i = 0; i < 90 / TICK_DT && p.res.food < food + 40; i++) g.update(TICK_DT);
      return { food: p.res.food - food, gold: p.res.gold - gold };
    };
    const rus = hunt('rus'), fra = hunt('france');
    expect(fra.gold).toBe(0);
    expect(rus.food).toBeGreaterThanOrEqual(40);
    expect(rus.gold).toBeGreaterThan(0);
  });

  it('el contenido único de Rusia solo lo tiene Rusia', () => {
    const g = rusGame(3);
    for (const id of ['druzhinnik', 'boyarSon', 'strelets', 'cossack']) expect(g.reg.unit(id).civs).toEqual(['rus']);
    for (const id of ['gorodishche', 'monasteryFortress', 'kremlin', 'ostrog']) expect(g.reg.building(id).civs).toEqual(['rus']);
  });
});
