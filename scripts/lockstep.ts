/**
 * Prototipo de multijugador por pasos sincronizados: mide determinismo, retardo y esperas con
 * redes simuladas (ver tests/net/simnet.ts y docs/multijugador.md).
 * Uso: npm run lockstep -- [minutos] [semilla] [edad inicial]  (con la edad 4 los humanos con guion y las IA usan los poderes activos)
 *
 * Cada partida: 2 humanos "con guion" que dan órdenes por la red + 2 IA hard, en arabia.
 * Al final, la partida en red completa (NetGame: retardo adaptable y cierre de turnos por el
 * anfitrión) con redes de la misma wifi a lejos con paquetes tardíos, a velocidad ×1,5 y ×3.
 */
import { buildRegistry } from '../src/core/Registry';
import type { GameOptions } from '../src/game/Game';
import { ALL_MODS } from '../src/mods';
import { runMatch, type NetProfile } from '../tests/net/simnet';
import { NET_CASES, runNetGame } from '../tests/net/netbench';

const minutes = Number(process.argv[2] ?? 10);
const seed = Number(process.argv[3] ?? 3);
const startAge = Number(process.argv[4] ?? 0);
const mods = ALL_MODS.filter(m => m.id !== 'declared-war' && m.id !== 'regicide');
const reg = buildRegistry(mods);

function opts(humans: number, ais: number): GameOptions {
  const civs = ['france', 'britain', 'rus', 'france'];
  return {
    mapType: 'arabia', mapSize: 96, startingResources: 'standard', startAge, victory: 'conquest', visibility: 'normal',
    popLimit: 125, speed: 1, seed, mods: mods.map(m => m.id),
    players: Array.from({ length: humans + ais }, (_, i) => ({ name: `J${i + 1}`, civ: civs[i % 4], color: '#fff', human: i < humans, difficulty: 'hard' as const })),
  };
}

const PROFILES: NetProfile[] = [
  { name: 'Red local (misma wifi)', latency: 3, jitter: 4, loss: 0 },
  { name: 'Fibra, misma ciudad', latency: 15, jitter: 10, loss: 0.002 },
  { name: 'Wifi doméstica, otro país', latency: 45, jitter: 30, loss: 0.01 },
  { name: 'Por relé TURN', latency: 80, jitter: 30, loss: 0.01 },
  { name: '4G', latency: 60, jitter: 60, loss: 0.01, freezePerSec: 0.02, freezeMs: 300 },
  { name: '4G mala / 3G', latency: 150, jitter: 150, loss: 0.03, freezePerSec: 0.05, freezeMs: 600 },
];

console.log(`## Determinismo (${minutes} min, huella en cada tick)\n`);
const det = runMatch({ reg, opts: opts(2, 2), humans: 2, minutes, delay: 4, net: PROFILES[4], hashEvery: 1, joinAt: 20 * 60 * Math.min(5, minutes / 2), seed });
console.log(`- 2 clientes por 4G simulado, ${det.commands} órdenes de los humanos: ${det.firstDiff === null ? `huellas iguales en los ${det.ticks} ticks` : `difieren desde el tick ${det.firstDiff}`}.`);
console.log(`- Espectador unido a mitad de partida (partida guardada de ${det.joinSaveKB} KB + turnos pendientes): ${det.joinDiff === null ? `igual en los ${det.joinTicksCompared} ticks comparados` : `difiere desde el tick ${det.joinDiff}`}.`);
const fault = runMatch({ reg, opts: opts(2, 0), humans: 2, minutes: 1, delay: 3, net: PROFILES[1], hashEvery: 20, fault: { client: 1, tick: 500 }, seed });
console.log(`- Fallo provocado en el tick 500 (+0,001 de alimento en un cliente): detectado por los clientes en el tick ${fault.desync?.tick} (huella cada 20 ticks).`);
console.log(`- Tiempo: ${(det.wallMs / 1000).toFixed(1)} s para ${minutes} min de 2 clientes con huella en cada tick.\n`);

console.log(`## Redes (${minutes} min por fila, 2 humanos + 2 IA)\n`);
console.log('| Red | Latencia de ida (+ variación) | Pérdidas | Retardo de entrada | Orden → efecto (media) | Velocidad del juego | Tiempo parado | Parón más largo | Huellas |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const net of PROFILES) {
  for (const delay of net.latency >= 100 ? [4, 6, 10, 14] : [2, 4, 6]) {
    const r = runMatch({ reg, opts: opts(2, 2), humans: 2, minutes, delay, net, hashEvery: 20, seed });
    const ok = r.firstDiff === null && !r.desync ? 'iguales' : `distintas (tick ${r.firstDiff ?? r.desync?.tick})`;
    const freeze = net.freezePerSec ? ` + tirones de ${net.freezeMs} ms` : '';
    console.log(`| ${net.name} | ${net.latency} ms (+0 a ${net.jitter})${freeze} | ${(net.loss * 100).toFixed(1)} % | ${delay} ticks (${delay * 50} ms) | ${r.orderDelayMs} ms | ${r.speedPct} % | ${r.stallPct} % | ${r.longestStallMs} ms | ${ok} |`);
  }
}
const bw = runMatch({ reg, opts: opts(2, 2), humans: 2, minutes: Math.min(minutes, 5), delay: 4, net: PROFILES[0], hashEvery: 20, seed });
console.log(`\nTráfico: ${bw.bytesPerSec} B/s por cliente y destinatario (un turno JSON por tick, casi todos vacíos; ${bw.commands} órdenes).`);

const netSecs = Math.min(60, Math.max(20, minutes * 6));
console.log(`\n## Partida en red completa (NetGame, ${netSecs} s por fila, retardo adaptable)\n`);
console.log('| Red | Latencia de ida (+ variación), picos | Velocidad | Anfitrión | Invitados | Tirones de más de 100 ms | Aviso «Esperando…» | Retardo de las órdenes (anfitrión / invitado) | Órdenes que salieron un turno después | Desincronizaciones |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const net of NET_CASES) {
  for (const speed of [1.5, 3]) {
    const r = await runNetGame(net, { speed, seconds: netSecs, guests: net.badGuest ? 2 : 1 });
    const spikes = net.badGuest ? `un invitado: ${net.badGuest.chance * 100} % de mensajes +${net.badGuest.ms} ms` : net.spikeChance ? `${net.spikeChance * 100} % +${net.spikeMs} ms` : 'sin picos';
    console.log(`| ${net.name} | ${net.latency} ms (+0 a ${net.jitter}), ${spikes} | ×${speed} | ${r.hostPct} % | ${r.guestPct} % | ${r.stallPct} % | ${r.noticePct} % | ${r.hostDelayMs} / ${r.guestDelayMs} ms | ${r.bounced} | ${r.desyncs} |`);
  }
}
