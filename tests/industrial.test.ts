import { describe, expect, it } from 'vitest';
import { TICK_DT } from '../src/core/constants';
import { Game } from '../src/game/Game';
import { snapshot, upgradeSave, type SaveData } from '../src/game/save';
import { stateHash } from '../src/game/net/hash';
import { options, reg } from './helpers';

const ALL_CIVS = ['rus', 'china', 'france', 'britain', 'persia', 'ethiopia'];

/** El jugador de la IA (1) contra un humano quieto (2), ya en la era 4. */
function peaceful(civ: string, startAge: number, seed: number): Game {
  const o = options('arabia', { seed, startAge });
  o.players = [
    { name: 'A', civ, color: '#3b6fe0', human: false, difficulty: 'hard' },
    { name: 'B', civ: 'france', color: '#d63a3a', human: true, difficulty: 'easy' },
  ] as any;
  return new Game(reg, o);
}
const runOn = (g: Game, seconds: number) => { for (let i = 0; i < seconds / TICK_DT; i++) g.update(TICK_DT); };

function roundTrip(g: Game): Game {
  const save: SaveData = JSON.parse(JSON.stringify(snapshot(g)));
  const up = upgradeSave(save);
  if (typeof up === 'string') throw new Error(up);
  return new Game(reg, up.opts, up);
}

describe('era 5 · Industrial', () => {
  it('el contenido no tiene referencias rotas y la Industrial es la última edad', () => {
    expect(reg.validate()).toEqual([]);
    expect(reg.ages.at(-1)!.id).toBe('industrial');
  });

  it('hay minas de hierro y carbón en el mapa', () => {
    const g = new Game(reg, options('arabia', { seed: 3 }));
    const n = (id: string) => g.nodes.filter(x => !x.dead && x.defId === id).length;
    expect(n('ironMine')).toBeGreaterThan(0);
    expect(n('coalMine')).toBeGreaterThan(0);
  });

  it('el avión vuela: no choca con el terreno y solo lo alcanzan armas a distancia', () => {
    const rule = reg.combatRules[0];
    const g = peaceful('rus', 5, 6);
    const spawn = (defId: string) => g.spawnUnit(defId, 1, 20, 20);
    const plane = spawn('biplane'), rifle = spawn('rifleman'), cannon = spawn('fieldGun'), pike = spawn('spearman');
    expect(rule(g, rifle, plane)).toBe(true);
    expect(rule(g, cannon, plane)).toBe(false);
    expect(rule(g, pike, plane)).toBe(false);
    expect(rule(g, plane, rifle)).toBe(true);
  });

  it('cada civilización: la IA llega a la Industrial y construye fábrica, ferrocarril y laboratorio', () => {
    for (const civ of ALL_CIVS) {
      const g = peaceful(civ, 4, 6);
      runOn(g, 60 * 60);
      const p = g.players[1];
      expect(p.age, `${civ}: edad`).toBe(5);
      expect(p.count('factory'), `${civ}: fábrica`).toBeGreaterThan(0);
      expect(p.count('railwayStation'), `${civ}: estación`).toBeGreaterThan(0);
      expect(p.count('laboratory'), `${civ}: laboratorio`).toBeGreaterThan(0);
      expect([...p.researched].some(t => reg.techs.get(t)!.age >= 5), `${civ}: tecnologías`).toBe(true);
    }
  }, 240000);

  it('guardar y cargar en la era 5 deja la partida exactamente igual', () => {
    const g = peaceful('china', 5, 6);
    runOn(g, 8 * 60);
    const h = roundTrip(g);
    expect(stateHash(h)).toBe(stateHash(g));
    runOn(g, 90); runOn(h, 90);
    expect(stateHash(h)).toBe(stateHash(g));
  }, 120000);
});
