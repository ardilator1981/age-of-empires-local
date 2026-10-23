/**
 * Simulación sin gráficos (IA contra IA) para probar reglas y mods rápidamente.
 * Uso: npm run simulate -- [minutos] [mapa] [semilla] [dificultad roja] [--guerra] [--prep=min] [--jugadores=N] [--edad=N] [--civs=a,b,...]
 * Con --guerra se juega en modo Guerra declarada, y con --rey en Matar al rey (por defecto ningún modo está activo).
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
const king = process.argv.includes('--rey');
const startAge = Number(process.argv.find(a => a.startsWith('--edad='))?.slice(7) ?? 0);
// --civs=rus,france: civilizaciones de la IA Azul y la Roja (por defecto france y britain)
const civsArg = process.argv.find(a => a.startsWith('--civs='))?.slice(7).split(',') ?? ['france', 'britain'];
// --jugadores=4: más IAs (los demás ciclan por --civs)
const nPlayers = Number(process.argv.find(a => a.startsWith('--jugadores='))?.slice(12) ?? 2);
const mods = ALL_MODS.filter(m => (war || m.id !== 'declared-war') && (king || m.id !== 'regicide'));
const reg = buildRegistry(mods);
await reg.mapTypes.get(mapType)?.load?.();
const game = new Game(reg, {
  mapType, mapSize: 96, startingResources: 'standard', startAge, victory: king ? 'regicide' : 'conquest', visibility: 'normal',
  popLimit: 125, speed: 1, seed, mods: mods.map(m => m.id),
  warPrepMinutes: prepArg ? Number(prepArg.slice(7)) : undefined,
  players: Array.from({ length: nPlayers }, (_, i) => ({
    name: i === 0 ? 'IA Azul' : i === 1 ? 'IA Roja' : `IA ${i + 1}`, civ: civsArg[i % civsArg.length] ?? 'britain', color: ['#3b6fe0', '#d63a3a', '#3fae4a', '#d9b53a'][i % 4], human: false,
    difficulty: i === 1 ? (process.argv[5]?.startsWith('--') ? undefined : process.argv[5] as any) ?? 'normal' : 'hard',
  })),
});
const kingLine = (p: number) => { const k = game.units.find(u => !u.dead && u.owner === p && u.defId === 'king'); return k ? (k.inside ? 'rey dentro' : `rey fuera (${Math.round(k.hp)} PV)`) : 'sin rey'; };
game.events.on('notify', n => { if (n.playerId === undefined) console.log(`[${fmt(game.time)}] ${n.text}`); });

const REL = ['guerra', 'paz', 'alianza'];
const spyLog: Record<string, number> = {};
game.events.on('diplomacyChanged', e => console.log(`[${fmt(game.time)}] Diplomacia: ${game.players[e.a].name} y ${game.players[e.b].name} → ${REL[e.rel]}`));
game.events.on('spyAction', e => { spyLog[e.act] = (spyLog[e.act] ?? 0) + 1; });
game.events.on('spyCaught', () => { spyLog.caught = (spyLog.caught ?? 0) + 1; });
game.events.on('techResearched', e => { if (e.techId === 'caravanserai') spyLog.caravanserai = (spyLog.caravanserai ?? 0) + 1; });

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
      return `${p.name}: edad ${p.age} ald ${vills} ej ${units.length - vills} edif ${blds} pob ${p.popUsed}/${p.popCap} [${r}] kills ${p.stats.kills}${king ? ` · ${kingLine(p.id)}` : ''}`;
    }).join(' | ');
    console.log(`${fmt(game.time)}  ${line}`);
  }
}
console.log(`\nFin: ${fmt(game.time)} simulados en ${((Date.now() - t0) / 1000).toFixed(1)} s. Entidades: ${game.list.length}. Terminada: ${game.over}`);
// Resumen por jugador: identidad, edad y qué hay (edificios y unidades por tipo), para ver si la IA usa el contenido de cada era
for (const p of game.players.slice(1)) {
  const tally = (kind: 'unit' | 'building') => {
    const n = new Map<string, number>();
    for (const e of game.list) if (e.owner === p.id && !e.dead && e.kind === kind && (kind === 'building' ? e.complete : true)) n.set(e.defId, (n.get(e.defId) ?? 0) + 1);
    return [...n].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}×${v}`).join(' ');
  };
  console.log(`\n${p.name} (${p.identity}, ${reg.ageName(p.age)})${p.defeated ? ' [derrotada]' : ''}\n  edificios: ${tally('building')}\n  unidades: ${tally('unit')}\n  tecnologías: ${[...p.researched].join(' ')}`);
}

console.log(`\nComercio y espionaje: ${game.players.slice(1).map(p => `${p.name}: ${Math.floor(p.data.tradeTotal ?? 0)} de oro por comercio, ${p.count('caravan')} caravanas`).join(' | ')}`);
console.log(`Espías: ${JSON.stringify(spyLog)} · relaciones finales: ${game.players.slice(1).map(p => game.players.slice(1).filter(q => q.id > p.id).map(q => `${p.name}-${q.name}: ${REL[game.data.diplo ? game.data.diplo.rel[p.id * game.data.diplo.n + q.id] : 0]}`).join('')).join('')}`);
