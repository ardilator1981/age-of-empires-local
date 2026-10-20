/**
 * Mediciones de rendimiento de la simulación (sin gráficos).
 * Uso: npm run bench
 *
 *  - pathfinding: tiempo medio de A* entre puntos aleatorios alcanzables
 *  - simulación: ms por tick con 4 IAs (muchas unidades) en un mapa de montaña
 *  - visión: ms por recálculo de la niebla del jugador humano
 */
import { buildRegistry } from '../src/core/Registry';
import { TICK_DT } from '../src/core/constants';
import { Game, type GameOptions } from '../src/game/Game';
import { findPath } from '../src/game/pathfinding';
import { ALL_MODS } from '../src/mods';
import { Commands } from '../src/game/commands';

const MODS = ALL_MODS.filter(m => m.id !== 'declared-war');
const reg = buildRegistry(MODS);

function options(mapType: string, mapSize: number, players: number, humanFirst = false): GameOptions {
  return {
    mapType, mapSize, startingResources: 'standard', startAge: 0, victory: 'conquest', visibility: 'normal',
    popLimit: 200, speed: 1, seed: 4242, mods: MODS.map(m => m.id),
    players: Array.from({ length: players }, (_, i) => ({
      name: `P${i + 1}`, civ: ['franks', 'britons', 'goths', 'mongols'][i % 4], color: '#fff', human: humanFirst && i === 0, difficulty: 'hard' as const,
    })),
  };
}

async function makeGame(o: GameOptions): Promise<Game> {
  const mt = reg.mapTypes.get(o.mapType) as any;
  if (mt?.load) await mt.load();
  return new Game(reg, o);
}

function pathBench(g: Game, n: number) {
  const m = g.map;
  let rnd = 12345;
  const r = () => { rnd = (rnd * 16807) % 2147483647; return rnd / 2147483647; };
  const pts: { x: number; y: number }[] = [];
  while (pts.length < n * 2) {
    const x = Math.floor(r() * m.w), y = Math.floor(r() * m.h);
    if (m.walkable(x, y)) pts.push({ x: x + 0.5, y: y + 0.5 });
  }
  let reached = 0, len = 0;
  const t0 = performance.now();
  for (let i = 0; i < n; i++) {
    const a = pts[2 * i], b = pts[2 * i + 1];
    if (m.region(Math.floor(a.x), Math.floor(a.y)) !== m.region(Math.floor(b.x), Math.floor(b.y))) continue;
    const res = findPath(m, a.x, a.y, { x0: Math.floor(b.x), y0: Math.floor(b.y), x1: Math.floor(b.x), y1: Math.floor(b.y) }, 0, 20000);
    if (res.reached) { reached++; len += res.path.length; }
  }
  const ms = performance.now() - t0;
  return { queries: n, reached, msPerQuery: +(ms / n).toFixed(3), avgLen: Math.round(len / Math.max(1, reached)) };
}

async function main() {
  const out: Record<string, unknown> = {};
  for (const [map, size] of [['pyrenees', 144], ['val-daran', 144]] as const) {
    if (!reg.mapTypes.has(map)) continue;
    const g = await makeGame(options(map, size, 2));
    out[`path ${map} ${size}`] = pathBench(g, 400);
  }
  {
    const g = await makeGame(options('pyrenees', 120, 4, true));
    const minutes = 25;
    let worst = 0;
    const t0 = performance.now();
    for (let i = 0; i < (minutes * 60) / TICK_DT; i++) {
      const t = performance.now();
      g.update(TICK_DT);
      worst = Math.max(worst, performance.now() - t);
    }
    const ms = performance.now() - t0;
    const vision = g.systems.find(s => typeof (s as any).recompute === 'function') as any;
    let vt = 0;
    if (vision?.recompute) { const t = performance.now(); for (let i = 0; i < 20; i++) vision.recompute(); vt = (performance.now() - t) / 20; }
    out['sim pyrenees 120, 4 IA, 25 min'] = {
      msPerTick: +(ms / ((minutes * 60) / TICK_DT)).toFixed(3), worstTickMs: +worst.toFixed(1),
      units: g.units.filter(u => !u.dead).length, entities: g.list.length, visionMs: +vt.toFixed(2),
    };
  }
  // Estrés: 300 unidades cruzan la cordillera hacia la base contraria
  for (const [map, size] of [['pyrenees', 120], ['gran-san-bernardo', 144], ['montserrat', 144]] as const) {
    if (!reg.mapTypes.has(map)) continue;
    const g = await makeGame(options(map, size, 2));
    const tcs = g.buildings.filter(b => b.defId === 'townCenter');
    const army: any[] = [];
    for (let side = 0; side < 2; side++) {
      const tc = tcs[side], foe = tcs[1 - side];
      for (let i = 0; i < 150; i++) {
        const p = g.findFreeTile(tc.x + ((i % 15) - 7) * 0.7, tc.y + 5 + Math.floor(i / 15) * 0.7, 14);
        if (!p) continue;
        const u = g.spawnUnit(i % 3 ? 'militia' : 'archer', tc.owner, p.x, p.y);
        u.order = { type: 'move', x: foe.x + 6, y: foe.y + 6 };
        army.push(u);
      }
    }
    for (const sys of g.systems) if ((sys as any).ais) (sys as any).ais = [];
    const minutes = 4;
    let worst = 0;
    const t0 = performance.now();
    const lastMove = new Map<number, number>(), lastPos = new Map<number, string>();
    let stuck = 0;
    for (let i = 0; i < (minutes * 60) / TICK_DT; i++) {
      const t = performance.now();
      g.update(TICK_DT);
      worst = Math.max(worst, performance.now() - t);
      if (i % 20 === 0) for (const u of army) {
        if (u.dead) continue;
        const k = u.x.toFixed(1) + ',' + u.y.toFixed(1);
        if (lastPos.get(u.id) !== k) { lastPos.set(u.id, k); lastMove.set(u.id, g.time); }
      }
    }
    for (const u of army) if (!u.dead && (u.order?.type === 'move' || u.order?.type === 'attackMove') && g.time - (lastMove.get(u.id) ?? 0) > 20) stuck++;
    // Visión de un jugador con 150 unidades repartidas por el mapa
    g.players[1].isHuman = true;
    const vision = g.systems.find(s => typeof (s as any).recompute === 'function') as any;
    const tv = performance.now();
    for (let i = 0; i < 20; i++) vision.recompute();
    const visionMs = +((performance.now() - tv) / 20).toFixed(2);
    const arrived = army.filter(u => !u.dead && !u.order).length;
    const onRock = army.filter(u => !u.dead && !g.map.walkable(Math.floor(u.x), Math.floor(u.y))).length;
    out[`estrés 300 unidades cruzando ${map} (4 min)`] = {
      msPerTick: +((performance.now() - t0) / ((minutes * 60) / TICK_DT)).toFixed(3), worstTickMs: +worst.toFixed(1),
      vivas: army.filter(u => !u.dead).length, llegadas: arrived, atascadas: stuck, enRoca: onRock, visionMs,
    };
  }
  // Formaciones: dos ejércitos de 150 avanzan atacando, en formación, por la cordillera
  {
    const g = await makeGame(options('pyrenees', 120, 2));
    for (const sys of g.systems) if ((sys as any).ais) (sys as any).ais = [];
    const tcs = g.buildings.filter(b => b.defId === 'townCenter');
    const armies: any[][] = [[], []];
    for (let side = 0; side < 2; side++) {
      const tc = tcs[side];
      for (let i = 0; i < 150; i++) {
        const p = g.findFreeTile(tc.x + ((i % 15) - 7) * 0.7, tc.y + 5 + Math.floor(i / 15) * 0.7, 14);
        if (p) armies[side].push(g.spawnUnit(['militia', 'archer', 'scoutCavalry'][i % 3], tc.owner, p.x, p.y));
      }
    }
    Commands.army(g, armies[0], { kind: 'attack', points: [{ x: tcs[1].x + 6, y: tcs[1].y + 6 }] });
    Commands.army(g, armies[1], { kind: 'attack', points: [{ x: tcs[0].x + 6, y: tcs[0].y + 6 }] });
    let worst = 0;
    const t0 = performance.now(), ticks = (4 * 60) / TICK_DT;
    for (let i = 0; i < ticks; i++) {
      const t = performance.now();
      g.update(TICK_DT);
      worst = Math.max(worst, performance.now() - t);
    }
    const all = [...armies[0], ...armies[1]];
    out['formaciones: 2 × 150 avanzando atacando por los Pirineos (4 min)'] = {
      msPerTick: +((performance.now() - t0) / ticks).toFixed(3), worstTickMs: +worst.toFixed(1),
      vivas: all.filter(u => !u.dead).length, enRoca: all.filter(u => !u.dead && !g.map.walkable(Math.floor(u.x), Math.floor(u.y))).length,
    };
  }
  console.log(JSON.stringify(out, null, 2));
}

main();
