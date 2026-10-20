import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import { TICK_DT } from '../src/core/constants';
import { assignSlots, roleOf, safeSlot, shape, toWorld } from '../src/game/army/formations';
import { groupOf, groups } from '../src/game/army/groups';
import { Commands } from '../src/game/commands';
import type { Entity } from '../src/game/Entity';
import type { Game } from '../src/game/Game';
import { newGame } from './helpers';

/** Mapa llano y vacío, sin IA. */
async function flat(): Promise<Game> {
  const g = await newGame('arabia', { seed: 9 });
  for (const e of [...g.list]) g.remove(e);
  g.update(TICK_DT);
  g.map.terrain.fill(g.reg.terrain('grass'));
  g.map.heights.fill(0);
  g.map.heightVersion++;
  g.map.version++;
  g.map.obstaclesChanged();
  for (const s of g.systems as any[]) if (s.ais) s.ais = [];
  return g;
}

function run(g: Game, seconds: number, until?: () => boolean) {
  for (let i = 0; i < seconds / TICK_DT && !(until && until()); i++) g.update(TICK_DT);
}

function rock(g: Game, x0: number, y0: number, x1: number, y1: number) {
  const r = g.reg.terrain('rock');
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g.map.terrain[y * g.map.w + x] = r;
  g.map.version++;
  g.map.obstaclesChanged();
}

function army(g: Game, owner: number, x: number, y: number, ids: string[]): Entity[] {
  return ids.map((id, i) => g.spawnUnit(id, owner, x + (i % 5) * 0.8, y + Math.floor(i / 5) * 0.8));
}

const MIX = ['militia', 'militia', 'militia', 'militia', 'archer', 'archer', 'archer', 'scoutCavalry', 'scoutCavalry', 'batteringRam'];

describe('formaciones', () => {
  it('línea: infantería delante, arqueros detrás, caballería en los flancos y asedio al fondo', async () => {
    const g = await flat();
    const units = army(g, 1, 20, 20, MIX);
    const facing = { x: 1, y: 0 };
    const slots = assignSlots(g, units, 'line', facing);
    const byRole = (r: string) => units.filter(u => roleOf(g, u) === r).map(u => slots.get(u.id)!);
    const front = byRole('front'), back = byRole('back'), flank = byRole('flank'), rear = byRole('rear');
    const maxBack = (l: { back: number }[]) => Math.max(...l.map(o => o.back));
    const minBack = (l: { back: number }[]) => Math.min(...l.map(o => o.back));
    expect(maxBack(front)).toBeLessThan(minBack(back));
    expect(maxBack(back)).toBeLessThan(minBack(rear));
    const infWidth = Math.max(...front.map(o => Math.abs(o.lat)));
    for (const o of flank) expect(Math.abs(o.lat)).toBeGreaterThan(infWidth);
    // En el mundo, mirando al este, la infantería queda más al este que los arqueros
    const c = { x: 40, y: 40 };
    const fx = Math.min(...front.map(o => toWorld(c, facing, o).x)), bx = Math.max(...back.map(o => toWorld(c, facing, o).x));
    expect(fx).toBeGreaterThan(bx);
  });

  it('columna estrecha, caja con los arqueros dentro y cuña con una sola unidad en la punta', () => {
    const counts = { front: 6, back: 4, flank: 2, rear: 1, leader: 1 };
    const col = shape('column', counts);
    const lats = Object.values(col).flat().map(o => o.lat);
    expect(Math.max(...lats) - Math.min(...lats)).toBeLessThanOrEqual(1);
    const box = shape('box', counts);
    // Los arqueros, por dentro del frente de infantería (ni en el borde ni delante)
    const edge = Math.max(...box.front.map(o => Math.abs(o.lat)));
    for (const o of box.back) expect(Math.abs(o.lat) < edge && o.back > 0).toBe(true);
    const wedge = shape('wedge', counts);
    expect(Object.values(wedge).flat().filter(o => o.back === 0).length).toBe(1);
  });

  it('al girar, los huecos se asignan de izquierda a derecha sin cruzarse', async () => {
    const g = await flat();
    const units = Array.from({ length: 4 }, (_, i) => g.spawnUnit('militia', 1, 20 + i, 20));
    // Mirando al norte (y negativa), la derecha es +x: el más a la izquierda (x menor) va al hueco más a la izquierda
    const slots = assignSlots(g, units, 'line', { x: 0, y: -1 });
    const lats = units.map(u => slots.get(u.id)!.lat);
    const inc = lats.every((v, i) => i === 0 || v > lats[i - 1]), dec = lats.every((v, i) => i === 0 || v < lats[i - 1]);
    expect(inc || dec).toBe(true);
  });

  it('ningún hueco cae en roca', async () => {
    const g = await flat();
    rock(g, 30, 30, 34, 34);
    const p = safeSlot(g, { x: 32.5, y: 32.5 }, g.map.region(20, 20));
    expect(g.map.walkable(Math.floor(p.x), Math.floor(p.y))).toBe(true);
    const units = army(g, 1, 20, 32, MIX);
    Commands.army(g, units, { kind: 'move', points: [{ x: 32, y: 32 }] });
    run(g, 30, () => !groups(g).length);
    for (const u of units) expect(g.map.walkable(Math.floor(u.x), Math.floor(u.y))).toBe(true);
  });

  it('el grupo va al paso del más lento y llegan juntos', async () => {
    const g = await flat();
    const fast = g.spawnUnit('scoutCavalry', 1, 10, 10), slow = g.spawnUnit('militia', 1, 10.8, 10), mid = g.spawnUnit('archer', 1, 10, 10.8);
    const grp = Commands.army(g, [fast, slow, mid], { kind: 'move', points: [{ x: 40, y: 10 }] })!;
    expect(grp.speed).toBeCloseTo(Math.min(...[fast, slow, mid].map(u => g.players[1].getStat(g.unitDef(u), 'speed'))));
    let tFast = 0;
    run(g, 6);
    tFast = fast.x;
    // A los 6 s la caballería no se ha ido por delante del grupo
    expect(Math.abs(tFast - slow.x)).toBeLessThan(3);
    run(g, 60, () => !groups(g).length);
    expect(groups(g).length).toBe(0);
    for (const u of [fast, slow, mid]) expect(Math.hypot(u.x - 40, u.y - 10)).toBeLessThan(3);
  });

  it('se estrecha a columna para cruzar un paso de montaña y recupera la línea al salir', async () => {
    const g = await flat();
    // Muralla de roca de norte a sur con un paso de 2 casillas
    rock(g, 40, 0, 42, 44);
    rock(g, 40, 47, 42, g.map.h - 1);
    const units = army(g, 1, 26, 42, ['militia', 'militia', 'militia', 'militia', 'militia', 'militia', 'archer', 'archer', 'archer', 'archer']);
    Commands.setFormation(g, units, 'line');
    const grp = Commands.army(g, units, { kind: 'move', points: [{ x: 60, y: 45.5 }] })!;
    let narrowed = false;
    run(g, 90, () => { if (grp.narrow !== undefined && grp.narrow <= 3) narrowed = true; return !groups(g).length; });
    expect(narrowed).toBe(true);
    expect(grp.type).toBe('line');
    for (const u of units) expect(u.x).toBeGreaterThan(50);
  });
});

describe('posturas', () => {
  it('mantener posición: no se mueve y solo ataca a lo que alcanza', async () => {
    const g = await flat();
    const a = g.spawnUnit('archer', 1, 30, 30);
    Commands.setStance(g, [a], 'hold');
    const far = g.spawnUnit('militia', 2, 30, 36.5); // a la vista, fuera de alcance (4)
    run(g, 5);
    expect(Math.hypot(a.x - 30, a.y - 30)).toBeLessThan(0.3);
    expect(far.hp).toBe(far.maxHp);
    far.x = far.px = 30; far.y = far.py = 33;
    far.order = { type: 'move', x: 30, y: 33 };
    run(g, 4);
    expect(far.hp).toBeLessThan(far.maxHp);
    expect(Math.hypot(a.x - 30, a.y - 30)).toBeLessThan(0.6);
  });

  it('sin ataque: ni ataca ni se defiende', async () => {
    const g = await flat();
    const a = g.spawnUnit('militia', 1, 30, 30);
    Commands.setStance(g, [a], 'passive');
    const e = g.spawnUnit('militia', 2, 31, 30);
    Commands.attack(g, [e], a);
    run(g, 4);
    expect(e.hp).toBe(e.maxHp);
    expect(a.hp).toBeLessThan(a.maxHp);
  });

  it('defensiva persigue poco y vuelve a su sitio; agresiva persigue', async () => {
    for (const stance of ['defensive', 'aggressive'] as const) {
      const g = await flat();
      const a = g.spawnUnit('militia', 1, 30, 30);
      Commands.setStance(g, [a], stance);
      const e = g.spawnUnit('scoutCavalry', 2, 32, 30);
      run(g, 1);
      // El enemigo huye lejos hacia el este
      e.order = { type: 'move', x: 80, y: 30 };
      e.stance = 'passive';
      run(g, 14);
      const d = Math.hypot(a.x - 30, a.y - 30);
      if (stance === 'defensive') expect(d).toBeLessThan(1.5);
      else expect(d).toBeGreaterThan(BALANCE.army.defensiveLeash);
    }
  });
});

describe('órdenes tácticas', () => {
  it('avanzar atacando: se detiene a luchar, acaba con el enemigo y sigue hasta el destino', async () => {
    const g = await flat();
    const units = army(g, 1, 10, 30, ['militia', 'militia', 'militia', 'archer', 'archer']);
    const foe = g.spawnUnit('militia', 2, 30, 31);
    foe.stance = 'passive';
    Commands.army(g, units, { kind: 'attack', points: [{ x: 50, y: 30 }] });
    run(g, 120, () => !groups(g).length);
    expect(foe.dead).toBe(true);
    for (const u of units) expect(u.x).toBeGreaterThan(45);
  });

  it('retirada: no lucha aunque le ataquen y llega al punto', async () => {
    const g = await flat();
    const units = army(g, 1, 30, 30, ['militia', 'militia', 'archer']);
    const foe = g.spawnUnit('militia', 2, 31, 31);
    foe.stance = 'passive';
    Commands.army(g, units, { kind: 'retreat', points: [{ x: 10, y: 30 }] });
    run(g, 60, () => !groups(g).length);
    expect(foe.hp).toBe(foe.maxHp);
    for (const u of units) expect(u.x).toBeLessThan(14);
  });

  it('patrulla: va y viene entre los puntos', async () => {
    const g = await flat();
    const units = army(g, 1, 20, 20, ['militia', 'militia', 'archer']);
    const grp = Commands.army(g, units, { kind: 'patrol', points: [{ x: 35, y: 20 }, { x: 20, y: 20 }] })!;
    let laps = 0, last = grp.ri, maxX = 0, minX = 99;
    run(g, 90, () => { if (grp.ri !== last) { laps++; last = grp.ri; } maxX = Math.max(maxX, units[0].x); minX = Math.min(minX, units[0].x); return false; });
    expect(laps).toBeGreaterThanOrEqual(3);
    expect(maxX).toBeGreaterThan(32);
    expect(minX).toBeLessThan(23);
    expect(groupOf(g, units[0])).toBe(grp);
  });

  it('escoltar: sigue a la unidad protegida y la defiende', async () => {
    const g = await flat();
    const vip = g.spawnUnit('scoutCavalry', 1, 20, 20);
    const guards = army(g, 1, 16, 20, ['militia', 'militia', 'archer']);
    Commands.army(g, guards, { kind: 'escort', targetId: vip.id });
    vip.order = { type: 'move', x: 50, y: 20 };
    vip.stance = 'passive';
    run(g, 40);
    const avg = guards.reduce((s, u) => s + Math.hypot(u.x - vip.x, u.y - vip.y), 0) / guards.length;
    expect(avg).toBeLessThan(6);
    const foe = g.spawnUnit('militia', 2, vip.x + 2, vip.y);
    foe.stance = 'passive';
    run(g, 25);
    expect(foe.dead).toBe(true);
  });

  it('mantener zona: defiende lo que entra en el círculo e ignora lo de fuera', async () => {
    const g = await flat();
    const units = army(g, 1, 20, 20, ['militia', 'militia', 'archer', 'archer']);
    Commands.army(g, units, { kind: 'zone', points: [{ x: 40, y: 40 }], zoneRadius: 6 });
    run(g, 30);
    const outside = g.spawnUnit('militia', 2, 40, 52);
    outside.stance = 'passive';
    run(g, 8);
    expect(outside.hp).toBe(outside.maxHp);
    const inside = g.spawnUnit('militia', 2, 44, 40);
    inside.stance = 'passive';
    run(g, 20);
    expect(inside.dead).toBe(true);
    // Siguen guardando la zona
    for (const u of units) expect(Math.hypot(u.x - 40, u.y - 40)).toBeLessThan(9);
  });
});
