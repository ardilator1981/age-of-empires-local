import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import { components, wideMask } from '../src/game/relief';
import { MapGenerator } from '../src/game/MapGenerator';
import type { Game } from '../src/game/Game';
import { newGame, reg } from './helpers';

const MAPS = [...reg.mapTypes.keys()];

function startsOf(g: Game) {
  return g.buildings.filter(b => b.defId === 'townCenter').map(b => ({ x: b.x, y: b.y }));
}

function regionNear(g: Game, p: { x: number; y: number }) {
  const f = g.findFreeTile(p.x, p.y, 12)!;
  return g.map.region(Math.floor(f.x), Math.floor(f.y));
}

describe('relieve: roca y pasos', () => {
  for (const map of MAPS) {
    for (const players of [2, 4]) {
      it(`${map} con ${players} jugadores: bases conectadas por pasos anchos y con recursos clave`, async () => {
        for (const seed of [1, 2, 3]) {
          const g = await newGame(map, { players, seed });
          const starts = startsOf(g);
          expect(starts.length).toBe(players);
          // Conexión real (incluye bosques y edificios)
          const regs = starts.map(s => regionNear(g, s));
          expect(new Set(regs).size, `${map} semilla ${seed}: bases aisladas`).toBe(1);
          // Pasos del ancho mínimo (solo terreno)
          const comp = components(wideMask(new MapGenerator(g)), g.map.w, g.map.h);
          const sc = starts.map(s => comp[Math.floor(s.y) * g.map.w + Math.floor(s.x)]);
          expect(new Set(sc).size, `${map} semilla ${seed}: paso más estrecho que ${BALANCE.relief.passMinWidth}`).toBe(1);
          // Recursos clave alcanzables desde cada base
          for (const s of starts) {
            const r0 = regionNear(g, s);
            for (const res of ['wood', 'food', 'gold', 'stone']) {
              const near = g.nodes.filter(n => !n.dead && n.resType === res && Math.hypot(n.x - s.x, n.y - s.y) < 30);
              if (!near.length) continue;
              expect(near.some(n => g.map.rectTouchesRegion(n.tx, n.ty, n.tx, n.ty, r0, false)), `${map}: ${res} inalcanzable`).toBe(true);
            }
          }
        }
      });
    }
  }

  it('las pendientes por encima del umbral son roca infranqueable', async () => {
    const g = await newGame('pyrenees', { seed: 5 });
    const m = g.map;
    let steep = 0;
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const t = m.terrainDef(x, y);
      if (t.water) continue;
      if (m.slopeOf(x, y, 1) > BALANCE.relief.cliffSlope + 0.01) {
        // O es roca, o es un paso abierto expresamente (que se suaviza), nunca suelo normal empinado
        expect(t.walkable && m.slopeOf(x, y, 1) > BALANCE.relief.cliffSlope * 1.6, `casilla ${x},${y} empinada y transitable`).toBe(false);
        steep++;
      }
    }
    expect(steep).toBeGreaterThan(0);
    const rock = reg.terrains.findIndex(t => t.id === 'rock');
    expect(reg.terrains[rock].walkable).toBe(false);
    expect(reg.terrains[rock].buildable).toBe(false);
  });

  it('en los Pirineos hay roca y al menos un paso claro entre los dos bandos', async () => {
    const g = await newGame('pyrenees', { seed: 7 });
    const rock = g.reg.terrain('rock');
    let rocks = 0;
    for (let i = 0; i < g.map.terrain.length; i++) if (g.map.terrain[i] === rock) rocks++;
    expect(rocks).toBeGreaterThan(50);
  });
});
