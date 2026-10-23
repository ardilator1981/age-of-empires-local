import { describe, expect, it } from 'vitest';
import { TICK_DT } from '../src/core/constants';
import { canReach } from '../src/game/actions';
import { computeDamage } from '../src/game/combat';
import { Commands } from '../src/game/commands';
import { lineTiles } from '../src/game/defense';
import { Game } from '../src/game/Game';
import { stateHash } from '../src/game/net/hash';
import { applyNetCommand } from '../src/game/net/netCommands';
import { findPath } from '../src/game/pathfinding';
import { snapshot, upgradeSave, type SaveData } from '../src/game/save';
import { options, reg } from './helpers';

function run(g: Game, seconds: number) {
  for (let i = 0; i < seconds / TICK_DT && !g.over; i++) g.update(TICK_DT);
}

/** Partida de dos jugadores con recursos de sobra y sin IA. */
function setup(age = 3, withAI = false) {
  const o = options('arabia', { startAge: age, seed: 7 });
  const g = new Game(reg, o);
  g.human.explored.fill(1);
  // Sin IA: las unidades de las pruebas solo hacen lo que se les manda
  const ai = g.systemIds.indexOf('ai');
  if (!withAI) { g.systems.splice(ai, 1); g.systemIds.splice(ai, 1); }
  for (const p of g.players.slice(1)) for (const r of ['food', 'wood', 'gold', 'stone']) p.res[r] = 9000;
  return g;
}

/** Esquina de un cuadrado libre de lado n (llano, sin nada encima). */
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

/** Anillo de muro de lado n (n×n incluyendo el muro) con las puertas pedidas [dx, dy] relativas al origen. */
function ring(g: Game, owner: number, wall: string, o: { x: number; y: number }, n: number, gates: [number, number][] = [], gate = 'stoneGate') {
  const out: number[] = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    if (i !== 0 && j !== 0 && i !== n - 1 && j !== n - 1) continue;
    const isGate = gates.some(([gx, gy]) => gx === i && gy === j);
    out.push(g.placeBuilding(isGate ? gate : wall, owner, o.x + i, o.y + j, true).id);
  }
  return out;
}

/** Región de un punto (con el dueño que ve las puertas). */
const R = (g: Game, x: number, y: number, owner?: number) => g.map.region(Math.floor(x), Math.floor(y), owner);

const unitAt = (g: Game, owner: number, x: number, y: number) => g.spawnUnit('militia', owner, x, y);

describe('bloqueo de paso de muros y empalizadas', () => {
  it('una muralla cerrada separa el interior del resto del mapa', () => {
    const g = setup();
    const o = freeArea(g, 9);
    const before = R(g, o.x + 4, o.y + 4);
    const outside = R(g, o.x - 1, o.y - 1);
    expect(before).toBe(outside);
    ring(g, 1, 'stoneWall', o, 9);
    expect(R(g, o.x + 4, o.y + 4)).not.toBe(R(g, o.x - 1, o.y - 1));
    // El A* tampoco entra: se queda fuera, junto al muro
    const r = findPath(g.map, o.x - 1.5, o.y - 1.5, { x0: o.x + 4, y0: o.y + 4, x1: o.x + 4, y1: o.y + 4 }, 0);
    expect(r.reached).toBe(false);
  });

  it('el resto del mapa no se rompe: solo se aísla el recinto', () => {
    const g = setup();
    const regionsOf = (pts: { x: number; y: number }[]) => new Set(pts.map(p => R(g, p.x, p.y)));
    const bases = g.buildings.filter(b => b.owner > 0).map(b => ({ x: Math.floor(b.x), y: Math.floor(b.y) }));
    const free = bases.map(b => g.findFreeTile(b.x, b.y)!).map(p => ({ x: Math.floor(p.x), y: Math.floor(p.y) }));
    const same = regionsOf(free).size === 1;
    const o = freeArea(g, 9);
    ring(g, 1, 'palisade', o, 9);
    // Las bases (fuera del recinto) siguen conectadas entre sí si lo estaban
    expect(regionsOf(free).size === 1).toBe(same);
  });

  it('una unidad enemiga no atraviesa la empalizada al moverse', () => {
    const g = setup();
    const o = freeArea(g, 9);
    ring(g, 1, 'palisade', o, 9);
    const enemy = unitAt(g, 2, o.x - 2.5, o.y + 4.5);
    Commands.move(g, [enemy], o.x + 4.5, o.y + 4.5);
    run(g, 30);
    expect(enemy.x < o.x).toBe(true);
  });

  it('el muro tiene que caer para entrar: rotas las casillas, se abre el paso', () => {
    const g = setup();
    const o = freeArea(g, 9);
    const ids = ring(g, 1, 'palisade', o, 9);
    expect(R(g, o.x + 4, o.y + 4)).not.toBe(R(g, o.x - 1, o.y - 1));
    g.kill(g.get(ids[2])!);
    expect(R(g, o.x + 4, o.y + 4)).toBe(R(g, o.x - 1, o.y - 1));
  });
});

describe('puertas', () => {
  it('dejan pasar a las unidades propias y cierran a las enemigas', () => {
    const g = setup();
    const o = freeArea(g, 9);
    ring(g, 1, 'stoneWall', o, 9, [[4, 8]]);
    const inside = { x: o.x + 4.5, y: o.y + 4.5 }, out = { x: o.x + 4.5, y: o.y + 10.5 };
    const mine = unitAt(g, 1, out.x, out.y), foe = unitAt(g, 2, out.x + 1, out.y);
    expect(canReach(g, mine, g.placeBuilding('house', 1, o.x + 2, o.y + 2, true))).toBe(true);
    expect(canReach(g, foe, g.buildings.find(b => b.defId === 'house')!)).toBe(false);
    expect(R(g, o.x + 4, o.y + 4, 1)).toBe(R(g, out.x, out.y, 1));
    expect(R(g, o.x + 4, o.y + 4, 2)).not.toBe(R(g, out.x, out.y, 2));
    Commands.move(g, [mine], inside.x, inside.y);
    Commands.move(g, [foe], inside.x + 1, inside.y);
    run(g, 40);
    expect(Math.abs(mine.x - inside.x) < 1.5 && Math.abs(mine.y - inside.y) < 1.5).toBe(true);
    expect(foe.x > o.x + 8.9 || foe.y > o.y + 8.9 || foe.x < o.x || foe.y < o.y).toBe(true); // se queda fuera del recinto
  });

  it('los aliados también pasan (las relaciones cambian el paso)', () => {
    const g = setup();
    const o = freeArea(g, 9);
    ring(g, 1, 'stoneWall', o, 9, [[4, 8]]);
    const out = { x: o.x + 4.5, y: o.y + 10.5 };
    expect(R(g, o.x + 4, o.y + 4, 2)).not.toBe(R(g, out.x, out.y, 2));
    g.data.diplo = { n: g.players.length, rel: new Uint8Array(g.players.length ** 2).fill(0), since: new Float64Array(g.players.length ** 2), proposals: [] };
    g.data.diplo.rel[1 * g.players.length + 2] = g.data.diplo.rel[2 * g.players.length + 1] = 2;
    g.map.obstaclesChanged();
    expect(R(g, o.x + 4, o.y + 4, 2)).toBe(R(g, out.x, out.y, 2));
  });

  it('la puerta se puede atacar por fuera', () => {
    const g = setup();
    const o = freeArea(g, 9);
    ring(g, 1, 'stoneWall', o, 9, [[4, 8]]);
    const gate = g.buildings.find(b => b.defId === 'stoneGate')!;
    const foe = unitAt(g, 2, o.x + 4.5, o.y + 10.5);
    Commands.attack(g, [foe], gate);
    run(g, 20);
    expect(gate.hp < gate.maxHp).toBe(true);
  });
});

describe('zanja y puente', () => {
  it('la zanja corta el paso y el puente lo reabre solo a los propios', () => {
    const g = setup(1);
    const o = freeArea(g, 9);
    for (let i = 0; i < 9; i++) for (const j of [0, 8]) { g.placeBuilding('ditch', 1, o.x + i, o.y + j, true); g.placeBuilding('ditch', 1, o.x + j, o.y + i, true); }
    expect(R(g, o.x + 4, o.y + 4)).not.toBe(R(g, o.x - 1, o.y - 1));
    // El puente se construye sobre un tramo de zanja propio
    expect(g.canPlace('bridge', o.x + 4, o.y + 8, 1)).toBe(true);
    expect(g.canPlace('bridge', o.x + 4, o.y + 8, 2)).toBe(false);
    expect(g.canPlace('bridge', o.x + 4, o.y + 4, 1)).toBe(true); // casilla libre: también se puede
    const bridge = Commands.placeBuilding(g, 1, 'bridge', o.x + 4, o.y + 8, [])!;
    expect(bridge).toBeTruthy();
    expect(g.buildings.filter(b => !b.dead && b.defId === 'ditch' && b.tx === o.x + 4 && b.ty === o.y + 8).length).toBe(0);
    expect(R(g, o.x + 4, o.y + 4, 1)).toBe(R(g, o.x + 4, o.y + 10, 1));
    expect(R(g, o.x + 4, o.y + 4, 2)).not.toBe(R(g, o.x + 4, o.y + 10, 2));
  });

  it('eliminar un tramo de zanja la rellena', () => {
    const g = setup(1);
    const o = freeArea(g, 5);
    const d = g.placeBuilding('ditch', 1, o.x + 1, o.y + 1, true);
    expect(g.map.walkable(o.x + 1, o.y + 1)).toBe(false);
    Commands.delete(g, d);
    expect(g.map.walkable(o.x + 1, o.y + 1)).toBe(true);
  });
});

describe('líneas de segmentos', () => {
  it('lineTiles traza una recta conectada y respeta el máximo', () => {
    const t = lineTiles(2.5, 2.5, 9.5, 5.5);
    expect(t[0]).toEqual({ x: 2, y: 2 });
    expect(t[t.length - 1]).toEqual({ x: 9, y: 5 });
    for (let i = 1; i < t.length; i++) expect(Math.max(Math.abs(t[i].x - t[i - 1].x), Math.abs(t[i].y - t[i - 1].y))).toBe(1);
    expect(lineTiles(0, 0, 200, 0, 10).length).toBe(10);
  });

  it('la orden placeLine coloca y cobra cada segmento, y los aldeanos los levantan', () => {
    const g = setup(0);
    const o = freeArea(g, 12);
    const vills = g.units.filter(u => u.owner === 1 && g.unitDef(u).builder).slice(0, 4);
    for (const v of vills) { v.x = o.x + 1; v.y = o.y - 1; }
    const wood = g.players[1].res.wood;
    const tiles: [number, number][] = Array.from({ length: 10 }, (_, i) => [o.x + i, o.y + 3]);
    expect(applyNetCommand(g, 1, { t: 'placeLine', building: 'palisade', tiles, builders: vills.map(v => v.id) })).toBe(true);
    const segs = g.buildings.filter(b => b.defId === 'palisade');
    expect(segs.length).toBe(10);
    expect(Math.round(wood - g.players[1].res.wood)).toBe(40);
    run(g, 60);
    expect(segs.every(s => s.complete)).toBe(true);
  });

  it('sin recursos, solo coloca los que puede pagar', () => {
    const g = setup(0);
    const o = freeArea(g, 12);
    g.players[1].res.wood = 10;
    const tiles: [number, number][] = Array.from({ length: 10 }, (_, i) => [o.x + i, o.y + 3]);
    applyNetCommand(g, 1, { t: 'placeLine', building: 'palisade', tiles, builders: [] });
    expect(g.buildings.filter(b => b.defId === 'palisade').length).toBe(2);
  });

  it('no deja trazar líneas con edificios que no son de línea', () => {
    const g = setup(0);
    const o = freeArea(g, 12);
    expect(applyNetCommand(g, 1, { t: 'placeLine', building: 'house', tiles: [[o.x, o.y], [o.x + 3, o.y]], builders: [] })).toBe(false);
  });
});

describe('asedio, aceite hirviendo y tecnologías', () => {
  it('el asedio daña el muro mucho más que la infantería', () => {
    const g = setup();
    const o = freeArea(g, 5);
    const w = g.placeBuilding('stoneWall', 1, o.x + 1, o.y + 1, true);
    const dmg = (id: string) => {
      const u = g.spawnUnit(id, 2, o.x - 3, o.y);
      const def = g.unitDef(u);
      return computeDamage(g, w, { attack: def.attack ?? 0, type: def.attackType ?? 'melee', bonus: def.bonus ?? [], owner: 2, attackerId: u.id });
    };
    const inf = dmg('militia'), ram = dmg('batteringRam'), cat = dmg('catapult');
    expect(inf).toBeLessThanOrEqual(1);
    expect(ram).toBeGreaterThan(50);
    expect(cat).toBeGreaterThan(20);
    expect(computeDamage(g, w, { attack: 6, type: 'pierce', bonus: [], owner: 2, attackerId: 0 })).toBeLessThanOrEqual(1); // flechas
  });

  it('la empalizada es mucho más débil que la muralla fortificada', () => {
    const g = setup();
    const hp = (id: string) => g.players[1].getStat(reg.building(id), 'hp');
    expect(hp('palisade')).toBeLessThan(hp('stoneWall'));
    expect(hp('stoneWall')).toBeLessThan(hp('fortifiedWall'));
  });

  it('Arquitectura de defensa sube los PV de muros y torres', () => {
    const g = setup();
    const p = g.players[1];
    const before = p.getStat(reg.building('stoneWall'), 'hp');
    p.researched.add('defenseArchitecture');
    p.addEffects(reg.tech('defenseArchitecture').effects, g);
    p.rebuildModifiers(g);
    expect(p.getStat(reg.building('stoneWall'), 'hp')).toBeCloseTo(before * 1.25, 3);
    expect(p.getStat(reg.building('watchTower'), 'hp')).toBeCloseTo(700 * 1.25, 3); // también las torres
  });

  it('el aceite hirviendo hiere al que está al pie del muro, sin importar la armadura', () => {
    const g = setup();
    const o = freeArea(g, 5);
    const p = g.players[1];
    g.placeBuilding('stoneWall', 1, o.x + 1, o.y + 1, true);
    const foe = g.spawnUnit('militia', 2, o.x + 1.5, o.y + 0.4);
    run(g, 3);
    expect(foe.hp).toBe(foe.maxHp); // sin la tecnología, nada
    p.researched.add('boilingOil');
    p.addEffects(reg.tech('boilingOil').effects, g);
    p.rebuildModifiers(g);
    run(g, 2);
    expect(foe.hp).toBeLessThan(foe.maxHp - 8);
    // Y no a los amigos ni a los lejanos
    const friend = g.spawnUnit('militia', 1, o.x + 1.5, o.y + 0.4);
    run(g, 2);
    expect(friend.hp).toBe(friend.maxHp);
  });

  it('la tecnología de albañiles acelera la reparación de los muros', () => {
    const g = setup();
    const p = g.players[1];
    const bt = () => p.getStat(reg.building('stoneWall'), 'buildTime');
    const before = bt();
    p.researched.add('wallCrews');
    p.addEffects(reg.tech('wallCrews').effects, g);
    p.rebuildModifiers(g);
    expect(bt()).toBeCloseTo(before * 0.6, 3);
  });

  it('los muros no cuentan para la victoria por conquista', () => {
    const g = setup();
    for (const e of g.list.filter(e => e.owner === 2 && !e.dead)) g.remove(e);
    const o = freeArea(g, 5);
    g.placeBuilding('stoneWall', 2, o.x, o.y, true);
    g.placeBuilding('ditch', 2, o.x + 2, o.y, true);
    expect(g.reg.victories.get('conquest')!.isDefeated(g, g.players[2])).toBe(true);
  });
});

describe('arqueros tras el muro', () => {
  it('disparan por encima aunque no puedan llegar al blanco', () => {
    const g = setup();
    const o = freeArea(g, 9);
    ring(g, 1, 'stoneWall', o, 9);
    const archer = g.spawnUnit('archer', 1, o.x + 1.5, o.y + 4.5);
    const foe = g.spawnUnit('militia', 2, o.x - 0.5, o.y + 4.5);
    Commands.attackMove(g, [archer], o.x + 1.5, o.y + 4.5);
    run(g, 20);
    expect(foe.hp < foe.maxHp || foe.dead).toBe(true);
  });
});

describe('guardado de partidas con defensas', () => {
  it('muros, puertas y zanjas se guardan y las regiones salen igual', () => {
    const g = setup(3, true);
    const o = freeArea(g, 9);
    ring(g, 1, 'stoneWall', o, 9, [[4, 8]]);
    g.placeBuilding('ditch', 1, o.x - 3, o.y, true);
    run(g, 1);
    const save: SaveData = JSON.parse(JSON.stringify(snapshot(g)));
    const up = upgradeSave(save);
    if (typeof up === 'string') throw new Error(up);
    const h = new Game(reg, up.opts, up);
    expect(stateHash(h)).toBe(stateHash(g));
    expect(h.map.gateCount).toBe(g.map.gateCount);
    expect([...h.map.gate]).toEqual([...g.map.gate]);
    for (const [px, py, who] of [[o.x + 4, o.y + 4, 1], [o.x + 4, o.y + 4, 2], [o.x - 1, o.y - 1, 2]]) {
      expect(R(h, px, py, who) >= 0).toBe(R(g, px, py, who) >= 0);
    }
    expect(R(h, o.x + 4, o.y + 4, 2)).not.toBe(R(h, o.x + 4, o.y + 10, 2));
  });
});
