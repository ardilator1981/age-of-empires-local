/**
 * Simulación sin gráficos (IA contra IA) para probar reglas y mods rápidamente.
 * Uso: npm run simulate -- [minutos] [mapa] [semilla] [dificultad roja] [--guerra] [--prep=min]
 * Con --guerra se juega en modo Guerra declarada (por defecto el modo no está activo).
 */
import { buildRegistry } from '../src/core/Registry';
import { TICK_DT } from '../src/core/constants';
import { Game } from '../src/game/Game';
import { ALL_MODS } from '../src/mods';

const minutes = Number(process.argv[2] ?? 15);
const mapType = process.argv[3] ?? 'arabia';
const seed = Number(process.argv[4] ?? 12345);

const war = process.argv.includes('--guerra');
const prepArg = process.argv.find(a => a.startsWith('--prep='));
const mods = ALL_MODS.filter(m => war || m.id !== 'declared-war');
const reg = buildRegistry(mods);
await reg.mapTypes.get(mapType)?.load?.();
const game = new Game(reg, {
  mapType, mapSize: 96, startingResources: 'standard', startAge: 0, victory: 'conquest', visibility: 'normal',
  popLimit: 125, speed: 1, seed, mods: mods.map(m => m.id),
  warPrepMinutes: prepArg ? Number(prepArg.slice(7)) : undefined,
  players: [
    { name: 'IA Azul', civ: 'franks', color: '#3b6fe0', human: false, difficulty: 'hard' },
    { name: 'IA Roja', civ: 'britons', color: '#d63a3a', human: false, difficulty: (process.argv[5]?.startsWith('--') ? undefined : process.argv[5] as any) ?? 'normal' },
  ],
});
game.events.on('notify', n => { if (n.playerId === undefined) console.log(`[${fmt(game.time)}] ${n.text}`); });

function fmt(t: number) { return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`; }

const t0 = Date.now();
const ticks = minutes * 60 / TICK_DT;
for (let i = 0; i < ticks && !game.over; i++) {
  game.update(TICK_DT);
  if (i % (60 / TICK_DT) === 0) {
    const line = game.players.slice(1).map(p => {
      const units = game.list.filter(e => e.owner === p.id && e.kind === 'unit');
      const vills = units.filter(u => reg.unit(u.defId).gatherer).length;
      const blds = game.list.filter(e => e.owner === p.id && e.kind === 'building').length;
      const r = Object.entries(p.res).map(([k, v]) => `${k[0]}${Math.floor(v)}`).join(' ');
      return `${p.name}: edad ${p.age} ald ${vills} ej ${units.length - vills} edif ${blds} pob ${p.popUsed}/${p.popCap} [${r}] kills ${p.stats.kills}`;
    }).join(' | ');
    console.log(`${fmt(game.time)}  ${line}`);
  }
}
console.log(`\nFin: ${fmt(game.time)} simulados en ${((Date.now() - t0) / 1000).toFixed(1)} s. Entidades: ${game.list.length}. Terminada: ${game.over}`);
