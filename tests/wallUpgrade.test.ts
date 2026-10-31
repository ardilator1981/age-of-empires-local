import { describe, expect, it } from 'vitest';
import { TICK_DT } from '../src/core/constants';
import { Commands } from '../src/game/commands';
import { Game } from '../src/game/Game';
import { stateHash } from '../src/game/net/hash';
import { applyNetCommand } from '../src/game/net/netCommands';
import { snapshot, upgradeSave, type SaveData } from '../src/game/save';
import { canUpgrade, connectedSegments } from '../src/game/wallUpgrade';
import { options, reg } from './helpers';

function run(g: Game, seconds: number) {
  for (let i = 0; i < seconds / TICK_DT && !g.over; i++) g.update(TICK_DT);
}

function setup(age: number) {
  const g = new Game(reg, options('arabia', { startAge: age, seed: 7 }));
  g.human.explored.fill(1);
  const ai = g.systemIds.indexOf('ai');
  g.systems.splice(ai, 1); g.systemIds.splice(ai, 1);
  for (const p of g.players.slice(1)) for (const r of ['food', 'wood', 'gold', 'stone']) p.res[r] = 9000;
  return g;
}

function freeArea(g: Game, n: number) {
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

function row(g: Game, wall: string, o: { x: number; y: number }, n: number, gateAt = -1) {
  return Array.from({ length: n }, (_, i) => g.placeBuilding(i === gateAt ? 'palisadeGate' : wall, 1, o.x + i, o.y, true));
}

describe('mejora en el sitio de empalizadas y murallas', () => {
  it('los datos son coherentes: misma huella, puerta con puerta', () => {
    for (const b of reg.buildings.values()) {
      if (!b.upgrade) continue;
      const to = reg.building(b.upgrade.to);
      expect([to.size, !!to.gate, !!to.walkable]).toEqual([b.size, !!b.gate, !!b.walkable]);
      expect(to.age).toBeGreaterThan(b.age);
    }
  });

  it('no se puede mejorar antes de la edad del destino', () => {
    const g = setup(1);
    const o = freeArea(g, 6);
    const [s] = row(g, 'palisade', o, 3);
    expect(canUpgrade(g, s)).toBe(false);
    expect(applyNetCommand(g, 1, { t: 'upgradeWall', ids: [s.id] })).toBe(false);
    expect(s.defId).toBe('palisade');
  });

  it('paga, el tramo sigue protegiendo durante la obra y luego conserva sitio, id y salud proporcional', () => {
    const g = setup(2);
    const o = freeArea(g, 12);
    const segs = row(g, 'palisade', o, 6, 3);
    for (const s of segs) s.hp = s.maxHp / 2;
    const vills = g.units.filter(u => u.owner === 1 && g.unitDef(u).builder).slice(0, 4);
    for (const v of vills) { v.x = o.x + 2; v.y = o.y - 1; }
    const stone = g.players[1].res.stone;
    expect(applyNetCommand(g, 1, { t: 'upgradeWall', ids: [segs[0].id], connected: true, builders: vills.map(v => v.id) })).toBe(true);
    expect(Math.round(stone - g.players[1].res.stone)).toBe(5 * 4 + 20);
    // Aún no ha terminado: sigue siendo una empalizada que cierra el paso
    expect(segs[0].defId).toBe('palisade');
    expect(g.map.blocked[o.y * g.map.w + o.x]).toBeGreaterThan(0);
    // En el instante de cambiar, la salud sigue siendo la proporción de antes (los aldeanos no reparan durante la obra)
    for (let i = 0; i < 200 / TICK_DT && segs[0].defId === 'palisade'; i++) g.update(TICK_DT);
    expect(segs[0].defId).toBe('stoneWall');
    expect(segs[0].hp / segs[0].maxHp).toBeGreaterThan(0.45);
    expect(segs[0].hp / segs[0].maxHp).toBeLessThan(0.55);
    run(g, 200);
    const ids = segs.map(s => s.id);
    expect(segs.map(s => s.defId)).toEqual(['stoneWall', 'stoneWall', 'stoneWall', 'stoneGate', 'stoneWall', 'stoneWall']);
    expect(segs.map(s => s.id)).toEqual(ids);
    for (const s of segs) expect(s.data.upg).toBeUndefined();
    expect(g.entities.get(g.map.occupant[o.y * g.map.w + o.x + 3])!.defId).toBe('stoneGate');
  });

  it('la puerta sigue dejando pasar a los suyos y cerrando a los enemigos tras mejorarla', () => {
    const g = setup(2);
    const o = freeArea(g, 12);
    const [gate] = [g.placeBuilding('palisadeGate', 1, o.x, o.y, true)];
    expect(applyNetCommand(g, 1, { t: 'upgradeWall', ids: [gate.id], builders: [] })).toBe(true);
    run(g, 120);
    expect(gate.defId).toBe('stoneGate');
    expect(g.map.walkableFor(o.x, o.y, 1)).toBe(true);
    expect(g.map.walkableFor(o.x, o.y, 2)).toBe(false);
  });

  it('las unidades del paso de ronda no bajan al mejorar de piedra a fortificada', () => {
    const g = setup(3);
    const o = freeArea(g, 12);
    const [s] = row(g, 'stoneWall', o, 2);
    const a = g.spawnUnit('archer', 1, o.x + 0.5, o.y + 1.5);
    Commands.mountWall(g, [a], s);
    run(g, 15);
    expect(a.onWall).toBe(s.id);
    applyNetCommand(g, 1, { t: 'upgradeWall', ids: [s.id], builders: [] });
    run(g, 120);
    expect(s.defId).toBe('fortifiedWall');
    expect(a.onWall).toBe(s.id);
  });

  it('con recursos justos mejora solo los que puede pagar; el abaratamiento de la tecnología cuenta', () => {
    const g = setup(2);
    const o = freeArea(g, 12);
    const segs = row(g, 'palisade', o, 6);
    g.players[1].res.stone = 9;
    expect(applyNetCommand(g, 1, { t: 'upgradeWall', ids: segs.map(s => s.id) })).toBe(true);
    expect(segs.filter(s => s.data.upg).length).toBe(2);
    expect(applyNetCommand(g, 1, { t: 'upgradeWall', ids: [segs[5].id] })).toBe(false);
    g.players[1].researched.add('masonryCraft');
    g.players[1].rebuildModifiers(g);
    g.players[1].res.stone = 100;
    const before = g.players[1].res.stone;
    applyNetCommand(g, 1, { t: 'upgradeWall', ids: [segs[5].id] });
    expect(before - g.players[1].res.stone).toBe(2); // 4 de piedra × 0,6 redondeado
  });

  it('connectedSegments sigue la línea también en diagonal y no cruza a otro dueño', () => {
    const g = setup(2);
    const o = freeArea(g, 12);
    const a = [0, 1, 2, 3].map(i => g.placeBuilding('palisade', 1, o.x + i, o.y + i, true));
    const foe = g.placeBuilding('palisade', 2, o.x + 4, o.y + 4, true);
    expect(connectedSegments(g, a[0]).map(e => e.id).sort()).toEqual(a.map(e => e.id).sort());
    expect(connectedSegments(g, a[0])).not.toContain(foe);
  });

  it('el guardado y la red conservan la mejora a medias y dan la misma huella', () => {
    const g = setup(2);
    const o = freeArea(g, 12);
    const segs = row(g, 'palisade', o, 4);
    for (const v of g.units.filter(u => u.owner === 1 && g.unitDef(u).builder)) { v.x = o.x + 1; v.y = o.y + 1; }
    applyNetCommand(g, 1, { t: 'upgradeWall', ids: [segs[0].id], connected: true });
    run(g, 3);
    expect(segs.some(s => s.data.upg && s.data.upg.p > 0)).toBe(true);
    const save: SaveData = JSON.parse(JSON.stringify(snapshot(g)));
    const up = upgradeSave(save);
    if (typeof up === 'string') throw new Error(up);
    const h = new Game(reg, up.opts, up);
    const ai = h.systemIds.indexOf('ai');
    if (ai >= 0) { h.systems.splice(ai, 1); h.systemIds.splice(ai, 1); }
    expect(stateHash(h)).toBe(stateHash(g));
    run(g, 100); run(h, 100);
    expect(stateHash(h)).toBe(stateHash(g));
    expect(h.get(segs[0].id)!.defId).toBe('stoneWall');
  });
});
