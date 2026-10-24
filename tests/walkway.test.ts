import { describe, expect, it } from 'vitest';
import { TICK_DT } from '../src/core/constants';
import { computeDamage } from '../src/game/combat';
import { Commands } from '../src/game/commands';
import { Game } from '../src/game/Game';
import { heightOf } from '../src/game/heightRules';
import { stateHash } from '../src/game/net/hash';
import { applyNetCommand } from '../src/game/net/netCommands';
import { snapshot, upgradeSave, type SaveData } from '../src/game/save';
import { canMount, postedOn } from '../src/game/walkway';
import { options, reg } from './helpers';

function run(g: Game, seconds: number, until?: () => boolean) {
  for (let i = 0; i < seconds / TICK_DT && !g.over; i++) {
    g.update(TICK_DT);
    if (until?.()) return;
  }
}

/** Partida de dos jugadores sin IA (las unidades solo hacen lo que se les manda). */
function setup() {
  const g = new Game(reg, options('arabia', { startAge: 3, seed: 7 }));
  g.human.explored.fill(1);
  const ai = g.systemIds.indexOf('ai');
  g.systems.splice(ai, 1); g.systemIds.splice(ai, 1);
  return g;
}

/** Esquina de un cuadrado libre y llano de lado n. */
function freeArea(g: Game, n: number): { x: number; y: number } {
  const m = g.map;
  for (let y = 4; y < m.h - n - 4; y++) for (let x = 4; x < m.w - n - 4; x++) {
    let ok = true;
    for (let j = -1; j <= n && ok; j++) for (let i = -1; i <= n; i++) {
      if (!g.canPlace('house', x + i, y + j) || m.slopeOf(x + i, y + j, 1) > 0.2) { ok = false; break; }
    }
    if (ok) return { x, y };
  }
  throw new Error('sin sitio libre');
}

/** Un tramo recto de muro de `len` casillas en horizontal desde `o`. */
function wallLine(g: Game, owner: number, def: string, o: { x: number; y: number }, len: number) {
  return Array.from({ length: len }, (_, i) => g.placeBuilding(def, owner, o.x + i, o.y, true));
}

/** Arquero del jugador 1 subido a un tramo de muralla de piedra (en el centro de una línea de 5). */
function archerOnWall(g: Game, def = 'stoneWall') {
  const o = freeArea(g, 10);
  const segs = wallLine(g, 1, def, { x: o.x, y: o.y + 4 }, 5);
  const a = g.spawnUnit('archer', 1, o.x + 2.5, o.y + 2.5);
  expect(applyNetCommand(g, 1, { t: 'mountWall', units: [a.id], target: segs[2].id })).toBe(true);
  run(g, 20, () => !!a.onWall);
  return { o, segs, a };
}

describe('arqueros en el paso de ronda', () => {
  it('un arquero sube a la muralla, se queda en el tramo y gana altura', () => {
    const g = setup();
    const { segs, a } = archerOnWall(g);
    expect(a.onWall).toBe(segs[2].id);
    expect(a.x).toBe(segs[2].x);
    expect(a.y).toBe(segs[2].y);
    expect(postedOn(g, segs[2])).toEqual([a]);
    expect(heightOf(g, a)).toBeGreaterThan(g.map.heightAt(segs[2].x, segs[2].y) + 0.5);
    // No se mueve: el sistema de movimiento lo ignora
    run(g, 2);
    expect(a.x).toBe(segs[2].x);
  });

  it('dispara desde arriba, con más alcance, y solo se le puede atacar a distancia', () => {
    const g = setup();
    const { o, segs, a } = archerOnWall(g);
    // Un enemigo a pie al otro lado, a 5 casillas: fuera del alcance de un arquero en el suelo (4), dentro desde la muralla
    const foe = g.spawnUnit('militia', 2, segs[2].x, segs[2].y + 5);
    foe.stance = 'hold';
    const hp0 = foe.hp;
    run(g, 10, () => foe.hp < hp0);
    expect(foe.hp).toBeLessThan(hp0);
    expect(a.onWall).toBe(segs[2].id); // sigue arriba
    // Cuerpo a cuerpo no le alcanza; a distancia, sí (y con menos daño por la armadura del muro)
    expect(g.canAttack(foe, a, true)).toBe(false);
    const foeArcher = g.spawnUnit('archer', 2, o.x + 2.5, o.y + 8.5);
    expect(g.canAttack(foeArcher, a, true)).toBe(true);
    const info = { attack: 10, type: 'pierce' as const, bonus: [], owner: 2, attackerId: foeArcher.id };
    const onTop = computeDamage(g, a, info);
    const ground = g.spawnUnit('archer', 1, o.x + 2.5, o.y + 2.5);
    expect(onTop).toBeLessThan(computeDamage(g, ground, info));
  });

  it('baja al caer el tramo, y también con una orden de moverse', () => {
    const g = setup();
    const { o, segs, a } = archerOnWall(g);
    g.kill(segs[2]);
    expect(a.onWall).toBe(0);
    expect(g.map.walkableFor(Math.floor(a.x), Math.floor(a.y), 1)).toBe(true);
    // Vuelve a subir a otro tramo y baja al mandarle moverse
    Commands.mountWall(g, [a], segs[3]);
    run(g, 20, () => !!a.onWall);
    expect(a.onWall).toBe(segs[3].id);
    Commands.move(g, [a], o.x + 1.5, o.y + 1.5);
    run(g, 1);
    expect(a.onWall).toBe(0);
    // Y con «Bajar» sobre el tramo
    Commands.mountWall(g, [a], segs[3]);
    run(g, 20, () => !!a.onWall);
    expect(applyNetCommand(g, 1, { t: 'dismountWall', ids: [segs[3].id] })).toBe(true);
    expect(a.onWall).toBe(0);
  });

  it('respeta la capacidad: los que no caben van al tramo libre más cercano', () => {
    const g = setup();
    const o = freeArea(g, 10);
    const segs = wallLine(g, 1, 'stoneWall', { x: o.x, y: o.y + 4 }, 5);
    const archers = [0, 1, 2].map(i => g.spawnUnit('archer', 1, o.x + 1.5 + i, o.y + 2.5));
    expect(Commands.mountWall(g, archers, segs[2])).toBe(3);
    run(g, 25, () => archers.every(u => !!u.onWall));
    expect(postedOn(g, segs[2]).length).toBe(2);
    const third = archers.find(u => u.onWall !== segs[2].id)!;
    expect([segs[1].id, segs[3].id]).toContain(third.onWall);
  });

  it('no suben a una empalizada, ni la caballería ni las tropas cuerpo a cuerpo', () => {
    const g = setup();
    const o = freeArea(g, 10);
    const [pal] = wallLine(g, 1, 'palisade', { x: o.x, y: o.y + 4 }, 1);
    const [stone] = wallLine(g, 1, 'stoneWall', { x: o.x + 4, y: o.y + 4 }, 1);
    const archer = g.spawnUnit('archer', 1, o.x + 2.5, o.y + 2.5);
    expect(canMount(g, archer, pal)).toBe(false);
    expect(canMount(g, archer, stone)).toBe(true);
    expect(canMount(g, g.spawnUnit('militia', 1, o.x + 2.5, o.y + 2.5), stone)).toBe(false);
    expect(canMount(g, g.spawnUnit('dragoon', 1, o.x + 2.5, o.y + 2.5), stone)).toBe(false);
    expect(canMount(g, g.spawnUnit('musketeer', 1, o.x + 2.5, o.y + 2.5), stone)).toBe(true);
    // Ni a un muro ajeno
    const [foreign] = wallLine(g, 2, 'stoneWall', { x: o.x + 7, y: o.y + 4 }, 1);
    expect(canMount(g, archer, foreign)).toBe(false);
    expect(applyNetCommand(g, 1, { t: 'mountWall', units: [archer.id], target: pal.id })).toBe(true); // va al tramo de piedra
    run(g, 20, () => !!archer.onWall);
    expect(archer.onWall).toBe(stone.id);
  });

  it('se guarda y se carga igual (y sigue igual al continuar)', () => {
    const g = setup();
    const { segs, a } = archerOnWall(g);
    g.spawnUnit('militia', 2, segs[2].x, segs[2].y + 4.5);
    run(g, 1);
    const save: SaveData = JSON.parse(JSON.stringify(snapshot(g)));
    const up = upgradeSave(save);
    if (typeof up === 'string') throw new Error(up);
    const h = new Game(reg, up.opts, up);
    const ai = h.systemIds.indexOf('ai');
    h.systems.splice(ai, 1); h.systemIds.splice(ai, 1);
    expect(h.get(a.id)!.onWall).toBe(segs[2].id);
    expect(stateHash(h)).toBe(stateHash(g));
    run(g, 8); run(h, 8);
    expect(stateHash(h)).toBe(stateHash(g));
  });
});
