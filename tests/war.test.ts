import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import { TICK_DT } from '../src/core/constants';
import type { Entity } from '../src/game/Entity';
import type { Game } from '../src/game/Game';
import { computeDamage } from '../src/game/combat';
import { unitAvail } from '../src/game/rules';
import { chooseBattlePoint } from '../src/mods/declared-war/ai';
import { activeWar, battlePointInfo, conditions, declareWar, GENERAL, warState } from '../src/mods/declared-war/war';
import { newGame, reg } from './helpers';

/** Partida llana en modo Guerra declarada: dos centros urbanos lejos y nada más. */
async function warGame(prepMinutes = 1): Promise<Game> {
  const g = await newGame('arabia', { seed: 5, war: true, warPrepMinutes: prepMinutes });
  for (const e of [...g.list]) g.remove(e);
  g.update(TICK_DT);
  g.map.terrain.fill(g.reg.terrain('grass'));
  g.map.heights.fill(0);
  g.map.heightVersion++;
  g.map.version++;
  g.map.obstaclesChanged();
  g.placeBuilding('townCenter', 1, 6, 6, true);
  g.placeBuilding('townCenter', 2, 84, 84, true);
  // El jugador humano conoce el centro del mapa (donde se elige la batalla), no la base rival
  const p = g.players[1];
  for (let y = 30; y < 60; y++) for (let x = 30; x < 60; x++) p.explored[y * g.map.w + x] = 1;
  return g;
}

function run(g: Game, seconds: number, until?: () => boolean) {
  for (let i = 0; i < seconds / TICK_DT && !(until && until()); i++) g.update(TICK_DT);
}

/** Cumple las condiciones para el jugador `pid`: Edad de los Castillos, General y rival descubierto. */
function ready(g: Game, pid: number, near: { x: number; y: number }): Entity {
  g.players[pid].age = BALANCE.war.requiredAge;
  const gen = g.spawnUnit(GENERAL, pid, near.x, near.y);
  run(g, 1.2);
  return gen;
}

describe('modo Guerra declarada', () => {
  it('sin el modo activo no existe el General y se puede atacar como siempre', async () => {
    expect(reg.units.has(GENERAL)).toBe(false);
    const g = await newGame('arabia', { seed: 5 });
    const a = g.spawnUnit('archer', 1, 40, 40), b = g.spawnUnit('militia', 2, 42, 40);
    expect(g.canAttack(a, b)).toBe(true);
  });

  it('en paz nadie puede atacar (ni las unidades ni los edificios)', async () => {
    const g = await warGame();
    const a = g.spawnUnit('archer', 1, 84, 80), b = g.spawnUnit('militia', 2, 85, 80);
    expect(g.canAttack(a, b)).toBe(false);
    run(g, 10);
    expect(a.hp).toBe(a.maxHp);
    expect(b.hp).toBe(b.maxHp);
  });

  it('condiciones: Edad de los Castillos, asentamiento descubierto y General', async () => {
    const g = await warGame();
    const p = g.human;
    let c = conditions(g, p);
    expect([c.age, c.discovered.length, c.general, c.ok]).toEqual([false, 0, false, false]);
    p.age = BALANCE.war.requiredAge;
    g.spawnUnit(GENERAL, 1, 20, 20);
    run(g, 1.2);
    c = conditions(g, p);
    expect([c.age, c.general, c.ok]).toEqual([true, true, false]);
    g.spawnUnit('scoutCavalry', 1, 81, 81); // a la vista del centro urbano rival
    run(g, 1.2);
    c = conditions(g, p);
    expect(c.discovered).toEqual([2]);
    expect(c.ok).toBe(true);
  });

  it('solo un General vivo y espera para entrenar otro si muere', async () => {
    const g = await warGame();
    const p = g.human;
    p.age = BALANCE.war.requiredAge;
    p.res.food = p.res.wood = p.res.gold = 5000;
    expect(unitAvail(g, p, GENERAL).ok).toBe(true);
    const gen = g.spawnUnit(GENERAL, 1, 20, 20);
    run(g, 0.2);
    expect(unitAvail(g, p, GENERAL).ok).toBe(false);
    g.kill(gen);
    run(g, 0.2);
    const a = unitAvail(g, p, GENERAL);
    expect(a.ok).toBe(false);
    expect(a.reason).toMatch(/Disponible en/);
    run(g, BALANCE.war.general.retrainCooldown + 1);
    expect(unitAvail(g, p, GENERAL).ok).toBe(true);
  });

  it('el aura del General sube el ataque y la armadura de sus tropas cercanas', async () => {
    const g = await warGame();
    const a = g.spawnUnit('militia', 1, 40, 40), t = g.spawnUnit('militia', 2, 41, 40);
    const info = { attack: 10, type: 'melee' as const, bonus: [], owner: 1, attackerId: a.id };
    const before = computeDamage(g, t, info);
    g.spawnUnit(GENERAL, 2, 43, 40);
    run(g, 0.6);
    expect(computeDamage(g, t, info)).toBeCloseTo(before - BALANCE.war.general.auraArmorAdd);
  });

  it('el punto de batalla no puede estar junto a un centro urbano y muestra la zona', async () => {
    const g = await warGame();
    expect(battlePointInfo(g, 1, 2, 10, 10).ok).toBe(false);
    expect(battlePointInfo(g, 1, 2, 70, 30).reason).toMatch(/sin explorar/);
    const info = battlePointInfo(g, 1, 2, 45, 45);
    expect(info.ok).toBe(true);
    expect(info.passes).toBe(-1); // llano: abierto por todos lados
    expect(chooseBattlePoint(g, 1, 2)).not.toBeNull();
  });

  it('declaración, cuenta atrás, batalla en el círculo, conquista del pueblo y victoria', async () => {
    const g = await warGame(1);
    const gen1 = ready(g, 1, { x: 40, y: 40 });
    const gen2 = ready(g, 2, { x: 50, y: 50 });
    g.spawnUnit('scoutCavalry', 1, 81, 81);
    run(g, 1.2);
    expect(declareWar(g, 1, 2, 10, 10)).toMatch(/centro urbano/);
    const w = declareWar(g, 1, 2, 45, 45);
    expect(typeof w).toBe('object');
    expect(activeWar(g, 2)?.phase).toBe('prep');
    // Durante la preparación no se puede atacar ni dentro del círculo
    expect(g.canAttack(gen1, gen2)).toBe(false);
    run(g, 61);
    expect(activeWar(g, 1)?.phase).toBe('battle');
    // Dentro del círculo, sí; fuera, no
    expect(g.canAttack(gen1, gen2)).toBe(true);
    const outA = g.spawnUnit('militia', 1, 70, 20), outB = g.spawnUnit('militia', 2, 71, 20);
    expect(g.canAttack(outA, outB, false)).toBe(false);
    // Cae el General rival: el jugador 1 gana la batalla, pero la partida sigue (conquista)
    let won: boolean | null = null;
    g.events.on('gameOver', ({ won: v }) => { won = v; });
    g.kill(gen2, gen1);
    run(g, 2);
    const war = warState(g)!.wars[0];
    expect(war.result?.winner).toBe(1);
    expect(war.phase).toBe('conquest');
    expect(g.players[2].defeated).toBe(false);
    expect(won).toBeNull();
    // El ganador ya puede atacar en todo el mapa, también el pueblo; el perdedor solo defenderse
    const tc1 = g.buildings.find(b => b.owner === 1 && !b.dead)!, tc2 = g.buildings.find(b => b.owner === 2 && !b.dead)!;
    expect(g.canAttack(outA, tc2)).toBe(true);
    expect(g.canAttack(outA, outB)).toBe(true);
    expect(g.canAttack(outB, outA)).toBe(true);
    expect(g.canAttack(outB, tc1)).toBe(false);
    // Mientras le quede un edificio sigue en pie; cuando cae el último, pierde la partida
    g.kill(tc2, outA);
    run(g, 2);
    const rest = g.buildings.filter(b => !b.dead && b.owner === 2);
    if (rest.length) {
      expect(g.players[2].defeated).toBe(false);
      // Sin aldeanos, la IA no puede levantar otro edificio mientras tanto
      for (const e of g.list.filter(e => !e.dead && e.owner === 2 && (e.kind === 'building' || g.unitDef(e).gatherer))) g.kill(e, outA);
      run(g, 2);
    }
    expect(g.players[2].defeated).toBe(true);
    expect(war.phase).toBe('over');
    expect(won).toBe(true);
  });

  it('pierde quien se queda sin tropas en el círculo', async () => {
    const g = await warGame(1);
    const gen1 = ready(g, 1, { x: 44, y: 44 });
    ready(g, 2, { x: 46, y: 46 });
    g.spawnUnit('scoutCavalry', 1, 81, 81);
    run(g, 1.2);
    declareWar(g, 1, 2, 45, 45);
    run(g, 61);
    // El General 1 se va del círculo y deja el campo vacío
    gen1.x = gen1.px = 20; gen1.y = gen1.py = 60;
    gen1.order = { type: 'move', x: 20, y: 60 };
    run(g, BALANCE.war.abandonSeconds + 2);
    expect(warState(g)!.wars[0].result?.winner).toBe(2);
    expect(warState(g)!.wars[0].phase).toBe('conquest');
    expect(g.players[1].defeated).toBe(false);
  });

  it('al acabarse el tiempo con fuerzas iguales hay tablas y vuelve la paz', async () => {
    const g = await warGame(1);
    const gen1 = ready(g, 1, { x: 40, y: 45 });
    const gen2 = ready(g, 2, { x: 50, y: 45 });
    g.spawnUnit('scoutCavalry', 1, 81, 81);
    run(g, 1.2);
    declareWar(g, 1, 2, 45, 45);
    run(g, 61);
    const w = activeWar(g, 1)!;
    // Que no se ataquen: los dos Generales quietos con una orden de movimiento hacia sí mismos
    gen1.order = { type: 'move', x: gen1.x, y: gen1.y };
    gen2.order = { type: 'move', x: gen2.x, y: gen2.y };
    w.endsAt = g.time + 0.5;
    for (const u of [gen1, gen2]) u.hp = u.maxHp;
    run(g, 1.5);
    expect(w.phase).toBe('over');
    expect(w.result?.winner).toBeNull();
    expect(g.players[1].defeated || g.players[2].defeated).toBe(false);
    expect(g.canAttack(gen1, gen2)).toBe(false);
  });
});
