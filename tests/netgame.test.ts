import { describe, expect, it } from 'vitest';
import { buildRegistry } from '../src/core/Registry';
import { ALL_MODS } from '../src/mods';
import { NetGame } from '../src/net/NetGame';
import type { LobbySettings } from '../src/net/protocol';
import { MemoryHub } from './net/memory';
import { ScriptedPlayer } from './net/simnet';

const SETTINGS: LobbySettings = {
  mapType: 'arabia', mapSize: 64, startingResources: 'standard', startAge: 0, victory: 'conquest', visibility: 'normal',
  popLimit: 75, speed: 1, mods: ALL_MODS.filter(m => !m.core && m.defaultEnabled && m.id !== 'declared-war').map(m => m.id),
};
const registry = (mods: string[]) => buildRegistry(ALL_MODS.filter(m => m.core || mods.includes(m.id)));
const tick = () => new Promise(r => setTimeout(r, 0));

/** Un cliente de prueba: su NetGame, un "humano" con guion y las huellas que va calculando. */
interface Client { name: string; net: NetGame; bot?: ScriptedPlayer; hashes: Map<number, number>; paused?: boolean }

function client(hub: MemoryHub, id: string, role: 'host' | 'guest', clientId = id): Client {
  const hashes = new Map<number, number>();
  const net = new NetGame({
    transport: hub.join(id), role, clientId, name: id.toUpperCase(), build: 'test', registry,
    settings: role === 'host' ? SETTINGS : undefined, me: { civ: 'france', color: 0 }, now: () => hub.now,
    onHash: (t, h) => hashes.set(t, h),
  });
  return { name: id, net, hashes };
}

/** Avanza `seconds` de tiempo real: entrega mensajes, da fotogramas y deja que los "humanos" den órdenes. */
async function play(hub: MemoryHub, clients: Client[], seconds: number) {
  for (let i = 0; i < seconds * 20; i++) {
    hub.advance(50);
    for (const c of clients) {
      if (c.paused || c.net.ended) continue;
      c.net.frame(0.05);
      const g = c.net.game;
      if (g && c.bot && c.net.pid) for (const cmd of c.bot.think(g)) c.net.send(cmd);
    }
    if (i % 10 === 0) await tick();
  }
  await tick();
}

/** Ticks en los que todos han calculado huella, y si coinciden. */
function compare(a: Client, b: Client, after = 0) {
  let same = 0, diff: number | null = null;
  for (const [t, h] of a.hashes) {
    if (t <= after || !b.hashes.has(t)) continue;
    if (b.hashes.get(t) === h) same++; else { diff ??= t; }
  }
  return { same, diff };
}

async function room(n = 2) {
  const hub = new MemoryHub();
  const host = client(hub, 'h', 'host');
  const guests = Array.from({ length: n - 1 }, (_, i) => client(hub, `g${i + 1}`, 'guest'));
  await play(hub, [host, ...guests], 0.5);
  return { hub, host, guests, all: [host, ...guests] };
}

async function started(n = 2, ai = 1) {
  const r = await room(n);
  for (let i = 0; i < ai; i++) r.host.net.addAI();
  await r.host.net.start();
  for (let i = 0; i < 20 && r.all.some(c => !c.net.game); i++) await play(r.hub, r.all, 0.1);
  r.all.forEach(c => { c.bot = new ScriptedPlayer(c.net.pid, 100 + c.net.pid); });
  return r;
}

describe('partida en red (NetGame, transporte en memoria)', () => {
  it('sala: los invitados entran, eligen civilización y color, y el anfitrión añade la IA', async () => {
    const { hub, host, guests, all } = await room(3);
    expect(host.net.lobby!.slots.length).toBe(3);
    guests[0].net.pick({ civ: 'britain', color: 4, name: 'Ana' });
    guests[1].net.pick({ color: 4 });
    host.net.addAI();
    host.net.setSettings({ mapSize: 80 });
    await play(hub, all, 0.3);
    const l = guests[1].net.lobby!;
    expect(l.slots.map(s => s.kind)).toEqual(['human', 'human', 'human', 'ai']);
    expect(l.slots[1]).toMatchObject({ name: 'Ana', civ: 'britain', color: 4 });
    // El color 4 ya es de Ana: el otro invitado no lo consigue
    expect(l.slots[2].color).not.toBe(4);
    expect(new Set(l.slots.map(s => s.color)).size).toBe(4);
    expect(l.settings.mapSize).toBe(80);
  });

  it('todos empiezan con la partida del anfitrión y siguen iguales con órdenes de todos', async () => {
    const { hub, host, guests, all } = await started(3, 1);
    const [g1, g2] = guests;
    expect(all.map(c => c.net.pid)).toEqual([1, 2, 3]);
    expect(g1.net.game!.humanId).toBe(2);
    await play(hub, all, 60);
    expect(host.net.game!.tick).toBeGreaterThan(1000);
    const a = compare(host, g1), b = compare(host, g2);
    expect(a.diff).toBeNull();
    expect(b.diff).toBeNull();
    expect(a.same).toBeGreaterThan(40);
    expect(host.net.peer!.executed).toBeGreaterThan(20);
  }, 60_000);

  it('el retardo se adapta a la latencia, sin desincronizar', async () => {
    const { hub, host, guests, all } = await started(2, 0);
    hub.latency = 300;
    await play(hub, all, 15);
    expect(host.net.peer!.delay).toBeGreaterThan(5);
    expect(guests[0].net.peer!.delay).toBe(host.net.peer!.delay);
    const high = host.net.peer!.delay;
    hub.latency = 10;
    await play(hub, all, 30);
    expect(host.net.peer!.delay).toBeLessThan(high - 4);
    expect(compare(host, guests[0]).diff).toBeNull();
  }, 60_000);

  it('pausa para todos y velocidad, como órdenes', async () => {
    const { hub, host, guests, all } = await started(2, 0);
    await play(hub, all, 2);
    guests[0].net.send({ t: 'pause', on: true });
    await play(hub, all, 1);
    const t = host.net.game!.time;
    await play(hub, all, 3);
    expect(host.net.game!.time).toBe(t);
    expect(guests[0].net.game!.time).toBe(t);
    host.net.send({ t: 'pause', on: false });
    host.net.send({ t: 'speed', v: 2 });
    await play(hub, all, 2);
    expect(host.net.game!.time).toBeGreaterThan(t);
    expect(guests[0].net.game!.opts.speed).toBe(2);
    expect(compare(host, guests[0]).diff).toBeNull();
  }, 60_000);

  it('se corta un invitado: la IA juega por él, y al volver recibe la partida y sigue igual', async () => {
    const { hub, host, guests, all } = await started(3, 0);
    const [g1, g2] = guests;
    await play(hub, all, 10);
    // Se corta g2 sin avisar
    hub.leave('g2');
    g2.paused = true;
    await play(hub, [host, g1], 8);
    expect(host.net.game!.players[3].data.aiControl).toBe(true);
    expect(g1.net.game!.players[3].data.aiControl).toBe(true);
    const tickBack = host.net.game!.tick;
    // Vuelve con otra conexión y el mismo cliente
    const back = client(hub, 'g2b', 'guest', 'g2');
    back.bot = new ScriptedPlayer(3, 103);
    await play(hub, [host, g1, back], 15);
    expect(back.net.game).not.toBeNull();
    expect(back.net.pid).toBe(3);
    expect(host.net.game!.players[3].data.aiControl).toBeUndefined();
    expect(compare(host, back, tickBack).same).toBeGreaterThan(5);
    expect(compare(host, back).diff).toBeNull();
    expect(compare(host, g1).diff).toBeNull();
    expect(host.net.game!.tick - back.net.game!.tick).toBeLessThan(15);
  }, 60_000);

  it('segundo plano: la IA juega por él y al volver se pone al día solo', async () => {
    const { hub, host, guests, all } = await started(2, 0);
    const [g1] = guests;
    await play(hub, all, 5);
    g1.net.setAway(true);
    g1.paused = true;
    await play(hub, all, 7);
    expect(host.net.game!.players[2].data.aiControl).toBe(true);
    g1.paused = false;
    g1.net.setAway(false);
    await play(hub, all, 10);
    expect(host.net.game!.players[2].data.aiControl).toBeUndefined();
    expect(host.net.game!.tick - g1.net.game!.tick).toBeLessThan(15);
    const t = host.net.game!.tick;
    await play(hub, all, 5);
    expect(compare(host, g1, t).same).toBeGreaterThan(3);
    expect(compare(host, g1, t).diff).toBeNull();
  }, 60_000);

  it('el anfitrión sale de la app: los demás esperan sin darlo por perdido y siguen cuando vuelve', async () => {
    const { hub, host, guests, all } = await started(2, 0);
    const [g1] = guests;
    let lost = 0;
    g1.net.on('hostLost', () => lost++);
    await play(hub, all, 3);
    host.net.setAway(true);
    host.paused = true;
    await play(hub, all, 20);
    expect(g1.net.hostAway).toBe(true);
    expect(lost).toBe(0);
    expect(g1.net.waitingMs).toBeGreaterThan(10_000);
    host.paused = false;
    host.net.setAway(false);
    const t = host.net.game!.tick;
    await play(hub, all, 5);
    expect(g1.net.hostAway).toBe(false);
    expect(g1.net.game!.tick).toBeGreaterThan(t + 50);
    expect(compare(host, g1).diff).toBeNull();
  }, 60_000);

  it('una desincronización se detecta y se arregla cargando la partida del anfitrión', async () => {
    const { hub, host, guests, all } = await started(2, 0);
    const [g1] = guests;
    await play(hub, all, 3);
    g1.net.game!.players[2].res.food += 1;
    const t = g1.net.game!.tick;
    await play(hub, all, 15);
    expect(g1.net.desyncs).toBe(1);
    expect(compare(host, g1, t + 100).same).toBeGreaterThan(2);
    expect(compare(host, g1, t + 100).diff).toBeNull();
  }, 60_000);

  it('versiones distintas no entran; si el anfitrión desaparece, el invitado lo sabe', async () => {
    const hub = new MemoryHub();
    const host = client(hub, 'h', 'host');
    const bad = new NetGame({ transport: hub.join('x'), role: 'guest', clientId: 'x', name: 'X', build: 'otra', registry, now: () => hub.now });
    const refused: string[] = [];
    bad.on('refused', r => refused.push(r));
    await play(hub, [host], 0.3);
    expect(refused[0]).toMatch(/versiones/);
    const g = client(hub, 'g', 'guest');
    let lost = 0;
    g.net.on('hostLost', () => lost++);
    await play(hub, [host, g], 0.5);
    hub.leave('h');
    await play(hub, [g], 12);
    expect(lost).toBe(1);
  }, 60_000);
});
