import { describe, expect, it } from 'vitest';
import { TICK_DT } from '../src/core/constants';
import { BALANCE } from '../src/config/balance';
import { Game } from '../src/game/Game';
import type { Player } from '../src/game/Player';
import { stateHash } from '../src/game/net/hash';
import { applyNetCommand } from '../src/game/net/netCommands';
import { hasDebt, inTruce, playerPowers, powerAvail, zoneSpeedFactor } from '../src/game/powers';
import { techAvail } from '../src/game/rules';
import { snapshot, upgradeSave, type SaveData } from '../src/game/save';
import { options, reg } from './helpers';

const B = BALANCE.powers;

function duel(a: string, b: string, startAge: number, seed = 4, withAI = false): Game {
  const o = options('arabia', { seed, startAge });
  o.players = [
    { name: 'A', civ: a, color: '#3b6fe0', human: false, difficulty: 'easy' },
    { name: 'B', civ: b, color: '#d63a3a', human: false, difficulty: 'easy' },
  ] as any;
  const g = new Game(reg, o);
  // Sin IA: las pruebas dan las órdenes a mano
  const i = g.systemIds.indexOf('ai');
  if (!withAI && i >= 0) { g.systems.splice(i, 1); g.systemIds.splice(i, 1); }
  return g;
}

const run = (g: Game, seconds: number) => { for (let i = 0; i < seconds / TICK_DT && !g.over; i++) g.update(TICK_DT); };
const power = (g: Game, pid: number, id: string, x = 0, y = 0) => applyNetCommand(g, pid, { t: 'mod', id: 'power', args: { id, x, y } });
const rich = (p: Player) => { p.res = { food: 5000, wood: 5000, gold: 5000, stone: 5000 }; };

function roundTrip(g: Game): Game {
  const save: SaveData = JSON.parse(JSON.stringify(snapshot(g)));
  const up = upgradeSave(save);
  if (typeof up === 'string') throw new Error(up);
  return new Game(reg, up.opts, up);
}

describe('poderes activos', () => {
  it('cada civilización tiene los suyos según la edad', () => {
    const of = (civ: string, age: number) => { const g = duel(civ, 'britain', age); return playerPowers(g, g.players[1]).map(d => d.id); };
    expect(of('rus', 1)).toEqual([]);
    expect(of('rus', 2)).toEqual(['hordeTribute']);
    expect(of('rus', 3)).toEqual([]);
    expect(of('rus', 4)).toEqual(['scorchedEarth']);
    expect(of('china', 2)).toEqual([]);
    expect(of('china', 3)).toEqual(['treasureFleet']);
    expect(of('france', 4)).toEqual(['levy']);
    expect(of('britain', 4)).toEqual(['credit']);
    expect(of('rus', 0)).toEqual([]);
  });

  it('el Tributo cuesta oro, da una tregua mutua y tiene enfriamiento', () => {
    const g = duel('britain', 'rus', 2);
    const p = g.players[2];
    rich(p);
    const gold0 = p.res.gold;
    expect(power(g, 2, 'hordeTribute')).toBe(true);
    expect(p.res.gold).toBe(gold0 - B.tribute.cost);
    expect(inTruce(g, 2)).toBe(true);
    const mine = g.units.find(u => u.owner === 2)!, theirs = g.units.find(u => u.owner === 1)!;
    expect(g.canAttack(theirs, mine)).toBe(false);
    expect(g.canAttack(mine, theirs)).toBe(false);
    expect(power(g, 2, 'hordeTribute')).toBe(false);
    expect(powerAvail(g, p, 'hordeTribute').reason).toMatch(/Disponible en/);
    run(g, B.tribute.duration + 2);
    expect(inTruce(g, 2)).toBe(false);
    expect(g.canAttack(theirs, mine)).toBe(true);
    run(g, B.tribute.cooldown);
    expect(powerAvail(g, p, 'hordeTribute').ok).toBe(true);
  });

  it('no se puede usar sin la civilización, la edad o el oro', () => {
    const g = duel('britain', 'rus', 2);
    rich(g.players[1]);
    expect(power(g, 1, 'hordeTribute')).toBe(false); // británicos
    g.players[2].res.gold = 10;
    expect(power(g, 2, 'hordeTribute')).toBe(false); // sin oro
    expect(power(g, 2, 'nada')).toBe(false);
    expect(power(g, 2, 'scorchedEarth')).toBe(false); // aún no es la era 4
  });

  it('la Flota del Tesoro vuelve con más oro tras el viaje', () => {
    const g = duel('china', 'rus', 3);
    const p = g.players[1];
    rich(p);
    run(g, 1);
    const gold0 = p.res.gold;
    expect(power(g, 1, 'treasureFleet')).toBe(true);
    expect(p.res.gold).toBeCloseTo(gold0 - B.treasureFleet.cost, 5);
    run(g, B.treasureFleet.delay + 2);
    expect(p.res.gold).toBeGreaterThan(gold0 + B.treasureFleet.returns - B.treasureFleet.cost - 1);
  });

  it('el Crédito da oro ya y lo cobra después; sin saldar no se pide otro', () => {
    const g = duel('britain', 'rus', 4);
    const p = g.players[1];
    p.res.gold = 0;
    expect(power(g, 1, 'credit')).toBe(true);
    expect(p.res.gold).toBe(B.credit.loan);
    expect(hasDebt(g, 1)).toBe(true);
    p.res.gold = 100; // no llega para pagar: la deuda queda y se reintenta
    run(g, B.credit.delay + 1);
    expect(p.res.gold).toBe(0);
    expect(hasDebt(g, 1)).toBe(true);
    p.res.gold = 1000;
    run(g, B.credit.retryEvery + 1);
    expect(hasDebt(g, 1)).toBe(false);
    expect(p.res.gold).toBe(1000 - (B.credit.repay - 100));
  });

  it('la Leva crea infantería junto al centro urbano', () => {
    const g = duel('france', 'rus', 4);
    run(g, 1);
    const n0 = g.units.filter(u => u.owner === 1 && u.defId === 'musketeer').length;
    expect(power(g, 1, 'levy')).toBe(true);
    expect(g.units.filter(u => u.owner === 1 && u.defId === 'musketeer').length).toBe(n0 + B.levy.count);
  });

  it('Tierra quemada destruye las granjas propias de la zona y frena a los enemigos', () => {
    const g = duel('rus', 'france', 4);
    const p = g.players[1];
    const tc = g.buildings.find(b => b.owner === 1 && b.defId === 'townCenter')!;
    let farm = null as any;
    for (let r = 4; r < 20 && !farm; r++) for (let dx = -r; dx <= r && !farm; dx++) for (let dy = -r; dy <= r && !farm; dy++) {
      if (g.canPlace('farm', Math.round(tc.x) + dx, Math.round(tc.y) + dy)) farm = g.placeBuilding('farm', 1, Math.round(tc.x) + dx, Math.round(tc.y) + dy, true);
    }
    expect(farm).toBeTruthy();
    expect(power(g, 1, 'scorchedEarth', farm.x, farm.y)).toBe(true);
    expect(farm.dead).toBe(true);
    expect(tc.dead).toBe(false);
    const enemy = g.units.find(u => u.owner === 2)!;
    enemy.x = farm.x; enemy.y = farm.y;
    expect(zoneSpeedFactor(g, enemy)).toBe(B.scorchedEarth.enemySpeed);
    const own = g.units.find(u => u.owner === 1)!;
    own.x = farm.x; own.y = farm.y;
    expect(zoneSpeedFactor(g, own)).toBe(1);
    run(g, B.scorchedEarth.duration + 2);
    expect(zoneSpeedFactor(g, enemy)).toBe(1);
    expect(p.data.powerReady.scorchedEarth).toBeGreaterThan(g.time);
  });

  it('rechaza un punto fuera del mapa', () => {
    const g = duel('rus', 'france', 4);
    expect(power(g, 1, 'scorchedEarth', -5, 10)).toBe(false);
    expect(power(g, 1, 'scorchedEarth', NaN, 10)).toBe(false);
  });

  it('guardar y cargar con enfriamientos y efectos activos da la misma partida', () => {
    const g = duel('rus', 'china', 4, 7, true);
    rich(g.players[1]); rich(g.players[2]);
    run(g, 5);
    const tc = g.buildings.find(b => b.owner === 1 && b.defId === 'townCenter')!;
    expect(power(g, 1, 'scorchedEarth', tc.x + 9, tc.y)).toBe(true);
    run(g, 2);
    const h = roundTrip(g);
    expect(stateHash(h)).toBe(stateHash(g));
    expect(powerAvail(h, h.players[1], 'scorchedEarth').ok).toBe(false);
    run(g, 20); run(h, 20);
    expect(stateHash(h)).toBe(stateHash(g));
  });

  it('dos partidas con los mismos poderes dan la misma huella', () => {
    const play = () => {
      const g = duel('britain', 'rus', 4, 9);
      rich(g.players[1]); rich(g.players[2]);
      run(g, 3);
      power(g, 1, 'credit');
      run(g, 10);
      const tc = g.buildings.find(b => b.owner === 2 && b.defId === 'townCenter')!;
      power(g, 2, 'scorchedEarth', tc.x + 5, tc.y);
      run(g, B.credit.delay + 5);
      return stateHash(g);
    };
    expect(play()).toBe(play());
  });
});

describe('doctrinas excluyentes', () => {
  it('elegir una deja la otra no disponible, también mientras se investiga', () => {
    const g = duel('france', 'rus', 4);
    const p = g.players[1];
    rich(p);
    const prod = g.systems.find(s => 'finishTech' in s) as any;
    const tc = g.buildings.find(b => b.owner === 1 && b.defId === 'townCenter')!;
    expect(techAvail(g, p, 'vaubanDoctrine').ok).toBe(true);
    expect(techAvail(g, p, 'gribeauvalDoctrine').ok).toBe(true);
    // En curso: la otra ya no se puede empezar
    tc.queue.push({ kind: 'tech', id: 'vaubanDoctrine', time: 1, progress: 0, cost: {} } as any);
    const a = techAvail(g, p, 'gribeauvalDoctrine');
    expect(a.visible).toBe(true);
    expect(a.ok).toBe(false);
    expect(a.reason).toMatch(/Incompatible con Doctrina de Vauban/);
    tc.queue.length = 0;
    prod.finishTech(tc, 'vaubanDoctrine');
    expect(p.researched.has('vaubanDoctrine')).toBe(true);
    expect(techAvail(g, p, 'gribeauvalDoctrine').ok).toBe(false);
    expect(techAvail(g, p, 'vaubanDoctrine').visible).toBe(false);
    expect(applyNetCommand(g, 1, { t: 'research', at: tc.id, tech: 'gribeauvalDoctrine' })).toBe(false);
  });

  it('la IA elige una sola doctrina', () => {
    const g = duel('france', 'rus', 4, 3, true);
    run(g, 20 * 60);
    const p = g.players[1];
    expect(['vaubanDoctrine', 'gribeauvalDoctrine'].filter(t => p.researched.has(t)).length).toBeLessThanOrEqual(1);
  });
});
