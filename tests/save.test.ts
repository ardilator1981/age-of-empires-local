import { describe, expect, it } from 'vitest';
import { TICK_DT } from '../src/core/constants';
import { Commands } from '../src/game/commands';
import { Game } from '../src/game/Game';
import { stateHash } from '../src/game/net/hash';
import { SAVE_VERSION, snapshot, upgradeSave, type SaveData } from '../src/game/save';
import { newGame, options, reg, warReg } from './helpers';

function run(g: Game, seconds: number) {
  for (let i = 0; i < seconds / TICK_DT && !g.over; i++) g.update(TICK_DT);
}

/** Huella de todo lo que importa del estado (para comparar dos partidas). */
function fingerprint(g: Game): string {
  const ents = g.list.filter(e => !e.dead).map(e => `${e.id}:${e.defId}:${e.owner}:${e.x.toFixed(4)},${e.y.toFixed(4)}:${e.hp.toFixed(2)}:${e.order?.type ?? '-'}:${e.amount.toFixed(2)}`).join('|');
  const ps = g.players.map(p => `${p.id}:${JSON.stringify(p.res)}:${p.age}:${[...p.researched].sort().join(',')}:${p.popUsed}/${p.popCap}:${p.defeated}`).join('|');
  return `${g.tick}|${g.time.toFixed(3)}|${g.rngState}|${ps}|${ents}`;
}

/** Guarda, pasa por JSON (como en el almacenamiento) y restaura. */
function roundTrip(g: Game, r = reg): Game {
  const save: SaveData = JSON.parse(JSON.stringify(snapshot(g)));
  const up = upgradeSave(save);
  if (typeof up === 'string') throw new Error(up);
  return new Game(r, up.opts, up);
}

describe('guardar y cargar partida', () => {
  it('la partida cargada sigue exactamente igual que la original', async () => {
    const o = options('arabia', { seed: 31 });
    o.players = [
      { name: 'A', civ: 'france', color: '#3b6fe0', human: false, difficulty: 'hard' },
      { name: 'B', civ: 'britain', color: '#d63a3a', human: false, difficulty: 'normal' },
    ] as any;
    const a = new Game(reg, o);
    run(a, 13 * 60);
    // Un grupo en formación a mitad de camino también se guarda
    const army = a.units.filter(u => !u.dead && u.owner === 1 && !a.unitDef(u).gatherer && (a.unitDef(u).attack ?? 0) > 0);
    if (army.length >= 2) Commands.army(a, army, { kind: 'patrol', points: [{ x: 30, y: 30 }, { x: 60, y: 60 }] });
    run(a, 5);
    const b = roundTrip(a);
    expect(fingerprint(b)).toBe(fingerprint(a));
    // Huella de todo el estado (niebla, órdenes, sistemas, game.data...), no solo lo principal
    expect(stateHash(b)).toBe(stateHash(a));
    run(a, 4 * 60);
    run(b, 4 * 60);
    expect(fingerprint(b)).toBe(fingerprint(a));
    expect(stateHash(b)).toBe(stateHash(a));
  });

  it('niebla, relieve y Guerra declarada se conservan', async () => {
    const g = await newGame('val-daran', { seed: 4, war: true, warPrepMinutes: 5 });
    run(g, 60);
    const h = roundTrip(g, warReg);
    expect([...h.map.heights]).toEqual([...g.map.heights]);
    expect([...h.map.terrain]).toEqual([...g.map.terrain]);
    expect(h.map.visualRelief).toBe(g.map.visualRelief);
    expect([...h.human.explored]).toEqual([...g.human.explored]);
    expect(JSON.stringify(h.data.war)).toBe(JSON.stringify(g.data.war));
    // Las casillas ocupadas y las regiones se recalculan igual
    expect([...h.map.blocked]).toEqual([...g.map.blocked]);
    expect(stateHash(h)).toBe(stateHash(g));
    run(g, 30); run(h, 30);
    expect(fingerprint(h)).toBe(fingerprint(g));
    expect(stateHash(h)).toBe(stateHash(g));
  });

  it('versiones: rechaza partidas dañadas o de una versión más nueva', async () => {
    const g = await newGame('arabia', { seed: 2 });
    const s = snapshot(g);
    expect(s.v).toBe(SAVE_VERSION);
    expect(upgradeSave({ ...s, v: SAVE_VERSION + 1 })).toMatch(/más nueva/);
    expect(upgradeSave({ v: 1 } as any)).toMatch(/dañado/);
    const size = JSON.stringify(s).length;
    console.log(`tamaño de una partida recién empezada (96×96): ${(size / 1024).toFixed(0)} KB sin comprimir`);
    expect(size).toBeLessThan(3_000_000);
  });
});
