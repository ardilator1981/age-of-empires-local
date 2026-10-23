import { describe, expect, it } from 'vitest';
import { TICK_DT } from '../src/core/constants';
import { Game } from '../src/game/Game';
import { diploState } from '../src/game/diplomacy';
import { snapshot, upgradeSave, type SaveData } from '../src/game/save';
import { stateHash } from '../src/game/net/hash';
import { options, reg } from './helpers';

/** Cuatro IA en la era 3: negocian, comercian y espían entre ellas. */
function fourAIs(seed: number): Game {
  const o = options('arabia', { seed, players: 4, startAge: 3 });
  const civs = ['persia', 'china', 'france', 'britain'];
  o.players = o.players.map((p, i) => ({ ...p, civ: civs[i], human: false, difficulty: 'hard' })) as any;
  return new Game(reg, o);
}

describe('la IA con comercio, diplomacia y espionaje', () => {
  it('pide y acepta la paz, comercia con sus socios, espía y no deja de pelear', () => {
    const g = fourAIs(2);
    const seen = { changes: 0, peace: 0, war: 0, profit: 0, spy: 0 };
    g.events.on('diplomacyChanged', e => { seen.changes++; if (e.rel > e.old) seen.peace++; else seen.war++; });
    g.events.on('tradeProfit', e => { seen.profit += e.amount; });
    g.events.on('spyAction', () => { seen.spy++; });
    for (let i = 0; i < 45 * 60 / TICK_DT; i++) g.update(TICK_DT);
    expect(seen.peace).toBeGreaterThanOrEqual(2);
    expect(seen.profit).toBeGreaterThan(200);
    expect(seen.spy).toBeGreaterThan(0);
    expect(g.players.slice(1).reduce((n, p) => n + p.stats.kills, 0)).toBeGreaterThan(0);
    // Y la partida se guarda y se carga idéntica en mitad de todo eso
    const save: SaveData = JSON.parse(JSON.stringify(snapshot(g)));
    const up = upgradeSave(save);
    if (typeof up === 'string') throw new Error(up);
    const b = new Game(reg, up.opts, up);
    expect(stateHash(b)).toBe(stateHash(g));
    for (let i = 0; i < 120 / TICK_DT; i++) { g.update(TICK_DT); b.update(TICK_DT); }
    expect(stateHash(b)).toBe(stateHash(g));
    expect(diploState(b)!.rel).toEqual(diploState(g)!.rel);
  }, 120_000);
});
