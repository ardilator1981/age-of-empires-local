import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TICK_DT } from '../src/core/constants';
import { Game, mulberry32, type GameOptions } from '../src/game/Game';
import { cos, hypot, sin } from '../src/game/fmath';
import { stateHash } from '../src/game/net/hash';
import { options, reg } from './helpers';
import { runMatch, type NetProfile } from './net/simnet';

/** Partida con `humans` jugadores en red y `ais` de la IA. */
function netOptions(humans: number, ais: number, seed = 3): GameOptions {
  const o = options('arabia', { seed, players: humans + ais });
  o.players = o.players.map((p, i) => ({ ...p, civ: ['france', 'britain', 'rus', 'france'][i % 4], human: i < humans, difficulty: 'hard' }));
  return o;
}

const WIFI: NetProfile = { name: 'wifi', latency: 40, jitter: 30, loss: 0.01 };

describe('matemáticas deterministas', () => {
  it('sin, cos e hypot dan casi lo mismo que Math', () => {
    const r = mulberry32(5);
    for (let i = 0; i < 20000; i++) {
      const a = (r() - 0.5) * 2000, x = (r() - 0.5) * 300, y = (r() - 0.5) * 300;
      expect(Math.abs(sin(a) - Math.sin(a))).toBeLessThan(1e-12);
      expect(Math.abs(cos(a) - Math.cos(a))).toBeLessThan(1e-12);
      expect(Math.abs(hypot(x, y) - Math.hypot(x, y))).toBeLessThanOrEqual(Math.hypot(x, y) * 1e-15);
    }
    expect(sin(0)).toBe(0);
    expect(cos(0)).toBe(1);
    expect(cos(Math.PI)).toBe(-1);
  });
});

describe('determinismo', () => {
  it('la simulación no usa funciones que cambian entre navegadores ni el reloj', () => {
    // Generación del mapa: se ejecuta una vez y las partidas en red parten de la del anfitrión
    const allowed = new Set(['fmath.ts', 'MapGenerator.ts', 'relief.ts']);
    const bad = /Math\.(random|hypot|sin|cos|tan|atan2?|exp|expm1|log|log2|log10|log1p|pow|cbrt|sinh|cosh|tanh|asin|acos)\b|Date\.now|performance\.now|new Date/;
    const found: string[] = [];
    const walk = (dir: string) => {
      for (const f of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, f.name);
        if (f.isDirectory()) walk(p);
        else if (f.name.endsWith('.ts') && !allowed.has(f.name)) {
          readFileSync(p, 'utf8').split('\n').forEach((l, i) => {
            // save.ts: la fecha de guardado es un dato para el menú, no de la simulación
            if (bad.test(l) && !l.includes('savedAt: Date.now()')) found.push(`${p}:${i + 1}: ${l.trim()}`);
          });
        }
      }
    };
    walk('src/game');
    expect(found, 'Usa hypot/sin/cos de src/game/fmath.ts y game.rng()').toEqual([]);
  });

  it('dos partidas con la misma semilla tienen el mismo estado', () => {
    const a = new Game(reg, netOptions(0, 3)), b = new Game(reg, netOptions(0, 3));
    expect(a.list.map(e => e.variant)).toEqual(b.list.map(e => e.variant));
    for (let i = 0; i < 3 * 60 / TICK_DT; i++) {
      a.update(TICK_DT); b.update(TICK_DT);
      if (i % 10 === 0) expect(stateHash(b)).toBe(stateHash(a));
    }
  }, 60_000);

  it('el final de la partida no depende del jugador que mira (humanId)', () => {
    const o = netOptions(2, 1);
    const a = new Game(reg, o), b = new Game(reg, o);
    a.humanId = 1; b.humanId = 2;
    const results: Record<string, boolean>[] = [{}, {}];
    a.events.on('gameOver', e => { results[0].won = e.won; });
    b.events.on('gameOver', e => { results[1].won = e.won; });
    const wipe = (g: Game, pid: number) => { for (const e of g.actors) if (e.owner === pid) g.kill(e); };
    // Cae el jugador 2: la partida sigue para el 1 y la IA
    wipe(a, 2); wipe(b, 2);
    for (let i = 0; i < 40; i++) { a.update(TICK_DT); b.update(TICK_DT); }
    expect(a.players[2].defeated && b.players[2].defeated).toBe(true);
    expect(a.over).toBe(false);
    expect(b.over).toBe(false);
    // Cae la IA: gana el 1 en las dos copias, en el mismo tick
    wipe(a, 3); wipe(b, 3);
    for (let i = 0; i < 40; i++) { a.update(TICK_DT); b.update(TICK_DT); }
    expect(a.over && b.over).toBe(true);
    expect(stateHash(b)).toBe(stateHash(a));
    expect(results).toEqual([{ won: true }, { won: false }]);
  });
});

describe('pasos sincronizados (prototipo)', () => {
  it('dos clientes con red con retardo siguen iguales y la IA va dentro de la simulación', () => {
    const r = runMatch({ reg, opts: netOptions(2, 1), humans: 2, minutes: 5, delay: 4, net: WIFI, hashEvery: 10 });
    expect(r.commands).toBeGreaterThan(50);
    expect(r.firstDiff).toBeNull();
    expect(r.desync).toBeNull();
  }, 60_000);

  it('los poderes activos (humanos con guion e IA) no desincronizan a los clientes', () => {
    const o = netOptions(2, 2, 5);
    o.startAge = 4;
    const r = runMatch({ reg, opts: o, humans: 2, minutes: 5, delay: 4, net: WIFI, hashEvery: 5, joinAt: 120 * 20 });
    expect(r.powersUsed).toBeGreaterThanOrEqual(3);
    expect(r.firstDiff).toBeNull();
    expect(r.desync).toBeNull();
    expect(r.joinDiff).toBeNull();
  }, 120_000);

  it('comercio, diplomacia y espionaje (humanos con guion e IA) no desincronizan a los clientes', () => {
    const o = netOptions(2, 2, 5);
    o.startAge = 3;
    const r = runMatch({ reg, opts: o, humans: 2, minutes: 12, delay: 4, net: WIFI, hashEvery: 5, joinAt: 240 * 20 });
    expect(r.trade.gold).toBeGreaterThan(0);
    expect(r.trade.treaties).toBeGreaterThanOrEqual(2);
    expect(r.firstDiff).toBeNull();
    expect(r.desync).toBeNull();
    expect(r.joinDiff).toBeNull();
  }, 240_000);

  it('detecta una desincronización en el tick en que ocurre', () => {
    const r = runMatch({ reg, opts: netOptions(2, 0), humans: 2, minutes: 1, delay: 3, net: WIFI, fault: { client: 1, tick: 400 } });
    expect(r.firstDiff).toBe(401);
    expect(r.desync?.tick).toBe(401);
  }, 60_000);

  it('un espectador se une a mitad de partida con la partida guardada y los turnos pendientes', () => {
    const r = runMatch({ reg, opts: netOptions(2, 1), humans: 2, minutes: 3, delay: 4, net: WIFI, joinAt: 60 * 20, hashEvery: 5 });
    expect(r.joinTicksCompared).toBeGreaterThan(100);
    expect(r.joinDiff).toBeNull();
    expect(r.firstDiff).toBeNull();
  }, 60_000);
});
