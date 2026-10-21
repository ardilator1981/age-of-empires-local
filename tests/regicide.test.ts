import { describe, expect, it } from 'vitest';
import { TICK_DT } from '../src/core/constants';
import { Commands } from '../src/game/commands';
import { canShelter, garrisonOf } from '../src/game/garrison';
import { Game } from '../src/game/Game';
import { stateHash } from '../src/game/net/hash';
import { applyNetCommand } from '../src/game/net/netCommands';
import { decodeState, snapshot, upgradeSave, type SaveData } from '../src/game/save';
import { kingOf, regicideState } from '../src/mods/regicide/rules';
import { newGame, options, reg, regicideReg } from './helpers';

function run(g: Game, seconds: number, until?: () => boolean) {
  for (let i = 0; i < seconds / TICK_DT && !(until && until()); i++) g.update(TICK_DT);
}

const tcOf = (g: Game, pid: number) => g.buildings.find(b => b.owner === pid && !b.dead && b.defId === 'townCenter')!;

function roundTrip(g: Game): Game {
  const save: SaveData = JSON.parse(JSON.stringify(snapshot(g)));
  const up = upgradeSave(save);
  if (typeof up === 'string') throw new Error(up);
  return new Game(regicideReg, up.opts, up);
}

describe('Matar al rey', () => {
  it('cada jugador empieza con su rey, junto a su centro urbano', async () => {
    const g = await newGame('arabia', { seed: 3, regicide: true });
    for (const pid of [1, 2]) {
      const k = kingOf(g, pid)!;
      expect(k).toBeTruthy();
      expect(k.defId).toBe('king');
      expect(k.owner).toBe(pid);
      expect(Math.hypot(k.x - tcOf(g, pid).x, k.y - tcOf(g, pid).y)).toBeLessThan(8);
    }
  });

  it('con el modo desactivado nada cambia', async () => {
    // El juego base no conoce al rey ni la victoria
    expect(reg.units.has('king')).toBe(false);
    expect(reg.victories.has('regicide')).toBe(false);
    // Con el mod cargado pero otra victoria elegida, la partida es idéntica a la del juego base
    const base = new Game(reg, options('arabia', { seed: 7 }));
    const withMod = new Game(regicideReg, options('arabia', { seed: 7, victory: 'conquest', regicide: true }));
    expect(withMod.opts.victory).toBe('conquest');
    expect(regicideState(withMod)).toBeUndefined();
    expect(withMod.units.some(u => u.defId === 'king')).toBe(false);
    // (stateHash no sirve: incluye los ids de los sistemas, y el del mod está en uno y no en el otro)
    const print = (g: Game) => JSON.stringify([g.rngState, g.nextEntityId, g.list.map(e => e), g.players.map(p => [p.res, p.stats, p.defeated]), g.data]);
    for (let i = 0; i < 600; i++) {
      base.update(TICK_DT); withMod.update(TICK_DT);
      if (i % 100 === 0) expect(print(withMod)).toBe(print(base));
    }
    expect(print(withMod)).toBe(print(base));
  });

  it('matar al rey es perder: la partida acaba con el último rey vivo', async () => {
    const g = await newGame('arabia', { seed: 3, regicide: true });
    run(g, 2);
    expect(g.players[2].defeated).toBe(false);
    g.kill(kingOf(g, 2)!, g.units.find(u => u.owner === 1));
    run(g, 2);
    expect(g.players[2].defeated).toBe(true);
    expect(g.players[1].defeated).toBe(false);
    expect(g.over).toBe(true);
  });

  it('el rey se refugia en el centro urbano: no se le puede atacar ni se ve', async () => {
    const g = await newGame('arabia', { seed: 3, regicide: true });
    const k = kingOf(g, 1)!, tc = tcOf(g, 1);
    expect(canShelter(g, k, tc)).toBe(true);
    // Un aldeano no cabe: el refugio solo admite las clases que dice la definición
    const vill = g.units.find(u => u.owner === 1 && g.unitDef(u).gatherer)!;
    expect(canShelter(g, vill, tc)).toBe(false);
    expect(applyNetCommand(g, 1, { t: 'garrison', units: [k.id], target: tc.id })).toBe(true);
    run(g, 20, () => !!k.inside);
    expect(k.inside).toBe(tc.id);
    expect(garrisonOf(g, tc)).toEqual([k]);
    // El enemigo no puede elegirlo como objetivo ni herirlo
    const foe = g.units.find(u => u.owner === 2 && (g.unitDef(u).attack ?? 0) > 0) ?? g.spawnUnit('militia', 2, k.x + 1, k.y + 1);
    expect(g.canAttack(foe, k, false)).toBe(false);
    const hp = k.hp;
    g.projectiles.push({ sx: 0, sy: 0, ex: k.x, ey: k.y, sh: 0, t: 0.99, dur: 1, targetId: k.id, style: 'arrow', info: { attack: 50, type: 'pierce', bonus: [], owner: 2, attackerId: foe.id } });
    run(g, 1);
    expect(k.hp).toBe(hp);
    // Ya no cabe nadie más (capacidad 1)
    const other = g.spawnUnit('king', 1, tc.x + 3, tc.y);
    expect(canShelter(g, other, tc)).toBe(false);
    // Sacarlo lo deja fuera, junto al edificio
    expect(applyNetCommand(g, 1, { t: 'ungarrison', at: [tc.id] })).toBe(true);
    expect(k.inside).toBe(0);
    expect(g.map.walkable(Math.floor(k.x), Math.floor(k.y))).toBe(true);
  });

  it('si el edificio cae, el rey sale y queda expuesto, pero no muere', async () => {
    const g = await newGame('arabia', { seed: 3, regicide: true });
    const k = kingOf(g, 1)!, tc = tcOf(g, 1);
    Commands.garrison(g, [k], tc);
    run(g, 20, () => !!k.inside);
    expect(k.inside).toBe(tc.id);
    g.kill(tc, g.units.find(u => u.owner === 2));
    expect(k.inside).toBe(0);
    expect(k.dead).toBe(false);
    expect(k.hp).toBe(k.maxHp);
    run(g, 2);
    expect(g.players[1].defeated).toBe(false);
    // Fuera, ya se le puede atacar
    const foe = g.spawnUnit('militia', 2, k.x + 1, k.y);
    expect(g.canAttack(foe, k, false)).toBe(true);
  });

  it('una orden nueva saca al rey del refugio, y el rey no se puede eliminar', async () => {
    const g = await newGame('arabia', { seed: 3, regicide: true });
    const k = kingOf(g, 1)!, tc = tcOf(g, 1);
    Commands.garrison(g, [k], tc);
    run(g, 20, () => !!k.inside);
    Commands.move(g, [k], k.x + 6, k.y + 6);
    run(g, 0.2);
    expect(k.inside).toBe(0);
    Commands.delete(g, k);
    expect(k.dead).toBe(false);
  });

  it('el rey refugiado se guarda y se carga igual', async () => {
    const o = options('arabia', { seed: 11, regicide: true });
    const a = new Game(regicideReg, o);
    const k = kingOf(a, 1)!, tc = tcOf(a, 1);
    Commands.garrison(a, [k], tc);
    run(a, 30);
    expect(k.inside).toBe(tc.id);
    const b = roundTrip(a);
    expect(kingOf(b, 1)!.inside).toBe(tc.id);
    expect(stateHash(b)).toBe(stateHash(a));
    run(a, 60); run(b, 60);
    expect(stateHash(b)).toBe(stateHash(a));
    // Decodifica sin pérdidas el estado del modo
    expect(decodeState(JSON.parse(JSON.stringify(snapshot(a)))).data.regicide.kings[1]).toBe(k.id);
  });

  it('la IA esconde a su rey y juega sin atascarse', async () => {
    const o = options('arabia', { seed: 2, regicide: true });
    o.players = [
      { name: 'A', civ: 'franks', color: '#3b6fe0', human: false, difficulty: 'hard' },
      { name: 'B', civ: 'britons', color: '#d63a3a', human: false, difficulty: 'normal' },
    ] as any;
    const g = new Game(regicideReg, o);
    run(g, 20 * 60, () => g.over);
    // Cada rey sigue a salvo en un refugio, o ha caído y su dueño ha perdido
    for (const p of g.players.slice(1)) {
      const k = kingOf(g, p.id);
      if (k) expect(k.inside || p.defeated).toBeTruthy();
      else expect(p.defeated).toBe(true);
    }
    expect(g.players[1].stats.kills + g.players[2].stats.kills).toBeGreaterThan(0);
  }, 60000);
});
