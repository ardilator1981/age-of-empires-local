/**
 * ¿Da la simulación lo mismo en motores de JavaScript distintos? (multijugador por pasos
 * sincronizados: Chrome/Android usan V8, Safari/iOS usan JavaScriptCore, Firefox SpiderMonkey).
 *
 * Este archivo se empaqueta y se ejecuta en cada motor; `scripts/engines-compare.mjs` compara
 * las salidas. Imprime:
 *   math <función> <índice> <bits>   resultados de las funciones de Math con entradas fijas
 *   map 0 <huella>                   huella del mapa generado (relieve, terreno y entidades iniciales)
 *   tick <n> <huella>                huella del estado cada segundo de juego
 * Modos: `math`; `sim <min> <semilla> <mapa>` (genera el mapa en cada motor); `snap <semilla> <mapa>`
 * (imprime la partida recién creada como JSON) y `sim <min> <semilla> <mapa> <archivo>` (parte de
 * esa partida guardada: todos los motores empiezan del mismo estado, como al unirse a una partida).
 * Un sexto argumento (`sim <min> <semilla> <mapa> - <edad>`) empieza en esa edad: con la 4, las IA
 * usan los poderes activos de sus civilizaciones.
 *
 * No usa nada de Node: en el `jsc` de macOS no hay `console` ni `process`.
 */
import { buildRegistry } from '../src/core/Registry';
import { TICK_DT } from '../src/core/constants';
import { Game, mulberry32 } from '../src/game/Game';
import { Hasher, stateHash } from '../src/game/net/hash';
import { snapshot, type SaveData } from '../src/game/save';
import { ALL_MODS } from '../src/mods';

const g = globalThis as any;
const out: (s: string) => void = g.print ?? ((s: string) => g.console.log(s));
const args: string[] = g.process?.argv?.slice(2) ?? g.arguments ?? g.scriptArgs ?? [];
const mode = args[0] ?? 'sim';
const minutes = Number(args[1] ?? 10);
const seed = Number(args[mode === 'snap' ? 1 : 2] ?? 7);
const mapType = args[mode === 'snap' ? 2 : 3] ?? 'arabia';
const readText = (path: string): string => g.read ? g.read(path) : g.process.getBuiltinModule('fs').readFileSync(path, 'utf8');

const f64 = new Float64Array(1), u32 = new Uint32Array(f64.buffer);
const bits = (n: number) => { f64[0] = n; return u32[1].toString(16).padStart(8, '0') + u32[0].toString(16).padStart(8, '0'); };

if (mode === 'math') {
  const r = mulberry32(99);
  const N = 20000;
  const tests: [string, () => number][] = [
    ['sin', () => Math.sin(r() * Math.PI * 4 - Math.PI * 2)],
    ['cos', () => Math.cos(r() * Math.PI * 4 - Math.PI * 2)],
    ['atan2', () => Math.atan2(r() * 200 - 100, r() * 200 - 100)],
    ['atan', () => Math.atan(r() * 20 - 10)],
    ['exp', () => Math.exp(-r() * 12)],
    ['log10', () => Math.log10(1 + r() * 1e6)],
    ['pow', () => Math.pow(r() * 10, r() * 3)],
    ['hypot', () => Math.hypot(r() * 200 - 100, r() * 200 - 100)],
    ['sqrt', () => Math.sqrt(r() * 20000)],
  ];
  for (const [name, fn] of tests) for (let i = 0; i < N; i++) out(`math ${name} ${i} ${bits(fn())}`);
} else {
  // Partida de 4 IA en un mapa aleatorio
  const mods = ALL_MODS.filter(m => m.id !== 'declared-war' && m.id !== 'regicide');
  const reg = buildRegistry(mods);
  const civs = ['france', 'britain', 'rus', 'france'];
  const save: SaveData | undefined = mode === 'sim' && args[4] && args[4] !== '-' ? JSON.parse(readText(args[4])) : undefined;
  // Los mapas reales cargan sus datos antes (al partir de una partida guardada no hace falta)
  if (!save) await reg.mapTypes.get(mapType)?.load?.();
  const game = save ? new Game(reg, save.opts, save) : new Game(reg, {
    mapType, mapSize: 96, startingResources: 'standard', startAge: save ? 0 : Number(args[5] ?? 0), victory: 'conquest', visibility: 'normal',
    popLimit: 125, speed: 1, seed, mods: mods.map(m => m.id),
    players: civs.map((civ, i) => ({ name: `IA ${i + 1}`, civ, color: '#fff', human: false, difficulty: 'hard' as const })),
  });
  if (mode === 'snap') out(JSON.stringify(snapshot(game)));
  else {
    const mh = new Hasher();
    mh.value(game.map.heights); mh.value(game.map.terrain); mh.value(game.list.filter(e => !e.dead).map(e => [e.defId, e.x, e.y]));
    out(`map 0 ${(mh.h >>> 0).toString(16)}`);
    const ticks = minutes * 60 / TICK_DT;
    for (let i = 1; i <= ticks && !game.over; i++) {
      game.update(TICK_DT);
      if (game.tick % 20 === 0) out(`tick ${game.tick} ${stateHash(game).toString(16)}`);
    }
    out(`end ${game.tick} ${game.list.length}`);
  }
}
