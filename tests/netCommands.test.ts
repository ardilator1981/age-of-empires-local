import { describe, expect, it } from 'vitest';
import { TICK_DT } from '../src/core/constants';
import { Game } from '../src/game/Game';
import { stateHash } from '../src/game/net/hash';
import { LockstepPeer, type Turn } from '../src/game/net/lockstep';
import { applyNetCommand } from '../src/game/net/netCommands';
import { snapshot, type SaveData } from '../src/game/save';
import { newGame, options, reg } from './helpers';

const run = (g: Game, ticks: number) => { for (let i = 0; i < ticks; i++) g.update(TICK_DT); };

describe('órdenes de la partida', () => {
  it('pausa: los ticks siguen pero el tiempo de juego no', async () => {
    const g = await newGame('arabia', { seed: 2 });
    run(g, 20);
    const t = g.time, unit = g.units.find(u => u.owner === 1)!;
    expect(applyNetCommand(g, 1, { t: 'move', units: [unit.id], x: unit.x + 6, y: unit.y })).toBe(true);
    const x = unit.x;
    expect(applyNetCommand(g, 2, { t: 'pause', on: true })).toBe(true);
    expect(applyNetCommand(g, 1, { t: 'pause', on: true })).toBe(false);
    run(g, 40);
    expect(g.time).toBe(t);
    expect(unit.x).toBe(x);
    expect(g.tick).toBe(60);
    applyNetCommand(g, 1, { t: 'pause', on: false });
    run(g, 40);
    expect(g.time).toBeGreaterThan(t);
    expect(unit.x).not.toBe(x);
  });

  it('velocidad: cambia para todos, dentro de los límites', async () => {
    const g = await newGame('arabia', { seed: 2 });
    expect(applyNetCommand(g, 1, { t: 'speed', v: 2 })).toBe(true);
    expect(g.opts.speed).toBe(2);
    applyNetCommand(g, 1, { t: 'speed', v: 99 });
    expect(g.opts.speed).toBe(4);
  });

  it('solo se usan las unidades del que da la orden', async () => {
    const g = await newGame('arabia', { seed: 2 });
    const theirs = g.units.find(u => u.owner === 2)!;
    expect(applyNetCommand(g, 1, { t: 'move', units: [theirs.id], x: 10, y: 10 })).toBe(false);
    expect(theirs.order).toBeNull();
  });

  it('la IA toma el mando de un humano, también tras guardar y cargar', async () => {
    const o = options('arabia', { seed: 5, players: 2 });
    o.players[1].human = true;
    const g = new Game(reg, o);
    const p = g.players[2];
    run(g, 200);
    const idle = () => g.units.filter(u => u.owner === 2 && g.unitDef(u).gatherer && !u.order).length;
    expect(idle()).toBeGreaterThan(0);
    applyNetCommand(g, 1, { t: 'ai', pid: 2, on: true });
    run(g, 20 * 30);
    expect(idle()).toBe(0);
    expect(g.units.filter(u => u.owner === 2).length).toBeGreaterThan(3);
    // Guardar y cargar con la IA al mando: sigue exactamente igual
    const save: SaveData = JSON.parse(JSON.stringify(snapshot(g)));
    const h = new Game(reg, save.opts, save);
    expect(stateHash(h)).toBe(stateHash(g));
    run(g, 400); run(h, 400);
    expect(stateHash(h)).toBe(stateHash(g));
    // Devuelve el mando
    applyNetCommand(g, 1, { t: 'ai', pid: 2, on: false });
    expect(p.data.aiControl).toBeUndefined();
  });

  it('órdenes de mods (declarar la guerra) con reg.addNetCommand', async () => {
    const g = await newGame('arabia', { seed: 2, war: true });
    expect(g.reg.netCommands.has('declare-war')).toBe(true);
    const texts: string[] = [];
    g.events.on('notify', n => texts.push(n.text));
    expect(applyNetCommand(g, 1, { t: 'mod', id: 'declare-war', args: { target: 2, x: 40, y: 40 } })).toBe(false);
    expect(texts.at(-1)).toMatch(/condiciones|guerra/i);
    expect(applyNetCommand(g, 1, { t: 'mod', id: 'no-existe', args: {} })).toBe(false);
  });
});

describe('pasos sincronizados: retardo variable y jugadores que se van', () => {
  /** Dos clientes que se pasan los turnos al momento. */
  function pair() {
    const o = options('arabia', { seed: 9, players: 3 });
    o.players = o.players.map((p, i) => ({ ...p, human: i < 2 }));
    const a = new Game(reg, o), b = new Game(reg, o);
    const pa = new LockstepPeer(a, 1, [1, 2], { delay: 3 }), pb = new LockstepPeer(b, 2, [1, 2], { delay: 3 });
    const deliver = (from: LockstepPeer, to: LockstepPeer, ts: Turn[]) => { for (const t of ts) to.receive(JSON.parse(JSON.stringify(t))); };
    return { a, b, pa, pb, deliver };
  }

  it('subir y bajar el retardo no desincroniza ni para la partida', () => {
    const { a, b, pa, pb, deliver } = pair();
    const unit = a.units.find(u => u.owner === 1)!;
    for (let i = 0; i < 600; i++) {
      if (i === 100) { pa.setDelay(8); pb.setDelay(5); }
      if (i === 300) { pa.setDelay(2); pb.setDelay(2); }
      expect(pa.ready() && pb.ready()).toBe(true);
      pa.step(); pb.step();
      if (i % 50 === 0) pa.issue({ t: 'move', units: [unit.id], x: 20 + (i % 7), y: 30 });
      deliver(pa, pb, pa.endTurn());
      deliver(pb, pa, pb.endTurn());
    }
    expect(stateHash(b)).toBe(stateHash(a));
    expect(pa.executed).toBeGreaterThan(5);
  });

  it('un jugador se va (drop), la IA juega por él y vuelve (add) con la partida guardada', () => {
    const { a, b, pa, pb, deliver } = pair();
    for (let i = 0; i < 200; i++) { pa.step(); pb.step(); deliver(pa, pb, pa.endTurn()); deliver(pb, pa, pb.endTurn()); }
    // B deja de mandar turnos: A se queda esperando
    for (let i = 0; i < 3; i++) if (pa.ready()) { pa.step(); pa.endTurn(); }
    expect(pa.ready()).toBe(false);
    expect(pa.waitingFor()).toEqual([2]);
    // El anfitrión (A) lo da por ido después de su último turno y la IA toma el mando
    pa.drop(2, pa.lastTurnOf(2));
    expect(pa.ready()).toBe(true);
    pa.issue({ t: 'ai', pid: 2, on: true });
    for (let i = 0; i < 300; i++) { pa.step(); pa.endTurn(); }
    expect(a.players[2].data.aiControl).toBe(true);
    // B vuelve: carga la partida de A y los turnos pendientes, y juega desde el tick R
    const save: SaveData = JSON.parse(JSON.stringify(snapshot(a)));
    const b2 = new Game(reg, save.opts, save);
    b2.humanId = 2;
    const R = a.tick + pa.delay + 1;
    pa.add(2, R);
    const pb2 = new LockstepPeer(b2, 2, pa.membership(), { delay: 3, prefill: false });
    for (const t of pa.pendingTurns()) pb2.receive(t);
    pa.issue({ t: 'ai', pid: 2, on: false });
    for (let i = 0; i < 400; i++) {
      expect(pa.ready()).toBe(true);
      pa.step(); deliver(pa, pb2, pa.endTurn());
      while (pb2.ready() && b2.tick < a.tick) pb2.step();
      deliver(pb2, pa, pb2.endTurn());
    }
    expect(b2.tick).toBe(a.tick);
    expect(stateHash(b2)).toBe(stateHash(a));
    expect(a.players[2].data.aiControl).toBeUndefined();
    void b; void pb;
  });
});
