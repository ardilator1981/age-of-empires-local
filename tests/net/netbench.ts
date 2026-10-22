/**
 * Medición de la partida en red completa (NetGame: sala, retardo adaptable, cierre de turnos por el
 * anfitrión) con una red simulada (`MemoryHub`): latencia, variación y picos. La usan
 * `npm run lockstep` y los tests. Fotogramas a 60 por segundo; dos o más humanos con guion.
 */
import { BALANCE } from '../../src/config/balance';
import { buildRegistry } from '../../src/core/Registry';
import { ALL_MODS } from '../../src/mods';
import { NetGame } from '../../src/net/NetGame';
import { MemoryHub } from './memory';
import { ScriptedPlayer } from './simnet';

export interface NetCase {
  name: string;
  /** Latencia de ida (ms), variación máxima añadida y picos (probabilidad por mensaje y ms). */
  latency: number;
  jitter: number;
  spikeChance: number;
  spikeMs: number;
  /** Picos extra solo para el último invitado (un jugador con mala red). */
  badGuest?: { chance: number; ms: number };
}

export interface NetResult {
  /** Velocidad real de anfitrión e invitados (100 = tiempo real). */
  hostPct: number;
  guestPct: number;
  /** Fotogramas con un tirón de más de 100 ms esperando turnos, y con el aviso "Esperando a..." a la vista. */
  stallPct: number;
  noticePct: number;
  /** Retardo medio de las órdenes (ms reales) del anfitrión y del invitado que más tiene. */
  hostDelayMs: number;
  guestDelayMs: number;
  /** Órdenes de invitados que llegaron tarde y salieron en el turno siguiente. */
  bounced: number;
  desyncs: number;
}

const registry = (mods: string[]) => buildRegistry(ALL_MODS.filter(m => m.core || mods.includes(m.id)));
const tick = () => new Promise(r => setTimeout(r, 0));

export async function runNetGame(net: NetCase, o: { speed: number; seconds: number; guests?: number }): Promise<NetResult> {
  const hub = new MemoryHub();
  const mods = ALL_MODS.filter(m => !m.core && m.defaultEnabled && m.id !== 'declared-war' && m.id !== 'regicide').map(m => m.id);
  const settings: any = { mapType: 'arabia', mapSize: 96, startingResources: 'standard', startAge: 0, victory: 'conquest', visibility: 'normal', popLimit: 125, speed: o.speed, mods };
  const mk = (id: string, role: 'host' | 'guest') => new NetGame({ transport: hub.join(id), role, clientId: id, name: id, build: 't', registry, settings, now: () => hub.now });
  const host = mk('h', 'host');
  const guests = Array.from({ length: o.guests ?? 1 }, (_, i) => mk(`g${i + 1}`, 'guest'));
  const all = [host, ...guests];
  const frame = () => { hub.advance(1000 / 60); for (const n of all) n.frame(1 / 60); };
  for (let i = 0; i < 30; i++) frame();
  await host.start();
  for (let i = 0; i < 100 && guests.some(g => !g.game); i++) { frame(); await tick(); }
  hub.latency = net.latency; hub.jitter = net.jitter; hub.spikeChance = net.spikeChance; hub.spikeMs = net.spikeMs;
  if (net.badGuest) hub.nodeSpikes = { [`g${guests.length}`]: net.badGuest };
  const bots = all.map(n => new ScriptedPlayer(n.pid, 50 + n.pid));
  const play = async (secs: number, measure?: (n: NetGame) => void) => {
    for (let i = 0; i < secs * 60; i++) {
      frame();
      all.forEach((n, k) => { measure?.(n); for (const c of bots[k].think(n.game!)) n.send(c); });
      if (i % 60 === 0) await tick();
    }
  };
  await play(15);
  const t0 = all.map(n => n.game!.tick);
  let frames = 0, stalls = 0, notices = 0, hostDelay = 0, guestDelay = 0, delayN = 0;
  await play(o.seconds, n => {
    frames++;
    if (n.waitingMs > 100) stalls++;
    if (n.waitingMs > BALANCE.net.waitNotice) notices++;
    if (n === host) {
      const ms = (p: NetGame) => p.peer!.delay * 50 / (p.game!.opts.speed || 1);
      hostDelay += ms(host); guestDelay += Math.max(...guests.map(ms)); delayN++;
    }
  });
  const pct = (n: NetGame, i: number) => +(100 * (n.game!.tick - t0[i]) / 20 / o.seconds / o.speed).toFixed(1);
  const r: NetResult = {
    hostPct: pct(host, 0), guestPct: Math.min(...guests.map((g, i) => pct(g, i + 1))),
    stallPct: +(100 * stalls / frames).toFixed(1), noticePct: +(100 * notices / frames).toFixed(1),
    hostDelayMs: Math.round(hostDelay / Math.max(1, delayN)),
    guestDelayMs: Math.round(guestDelay / Math.max(1, delayN)),
    bounced: guests.reduce((s, g) => s + ((g as any).bounced ?? 0), 0),
    desyncs: guests.reduce((s, g) => s + g.desyncs, 0),
  };
  for (const n of all) n.leave();
  return r;
}

/** Redes de la medición (`npm run lockstep`): de la misma wifi a lejos con paquetes tardíos. */
export const NET_CASES: NetCase[] = [
  { name: 'Misma wifi', latency: 3, jitter: 4, spikeChance: 0, spikeMs: 0 },
  { name: 'Fibra, misma ciudad', latency: 15, jitter: 10, spikeChance: 0.002, spikeMs: 100 },
  { name: 'Otro país', latency: 45, jitter: 30, spikeChance: 0.01, spikeMs: 200 },
  { name: 'Lejos: 100-300 ms y tardíos', latency: 100, jitter: 200, spikeChance: 0.02, spikeMs: 300 },
  { name: '4G', latency: 60, jitter: 60, spikeChance: 0.02, spikeMs: 400 },
  { name: '2 invitados, uno con muy mala red', latency: 30, jitter: 20, spikeChance: 0, spikeMs: 0, badGuest: { chance: 0.1, ms: 600 } },
];
