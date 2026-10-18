import type { MapTypeDef, Pt } from '../../core/types';
import type { MapGenerator } from '../../game/MapGenerator';

function dirtPatches(gen: MapGenerator, n: number, starts: Pt[]) {
  for (let i = 0; i < n; i++) {
    const x = gen.randInt(0, gen.w), y = gen.randInt(0, gen.h);
    if (starts.some(s => Math.hypot(s.x - x, s.y - y) < 10)) continue;
    gen.blob(x, y, gen.rand(2, 5), (tx, ty) => gen.set(tx, ty, 'dirt'));
  }
}

function placeBases(gen: MapGenerator, starts: Pt[]) {
  gen.players.forEach((p, i) => gen.base(p, starts[i]));
}

function extraResources(gen: MapGenerator, starts: Pt[], scale: number) {
  gen.scatter('goldMine', Math.round(3 * scale), 5, 20, starts);
  gen.scatter('stoneMine', Math.round(2 * scale), 4, 20, starts);
  gen.scatter('berries', Math.round(1 * scale), 5, 18, starts);
}

export const maps: MapTypeDef[] = [
  {
    id: 'arabia', name: 'Arabia', description: 'Terreno abierto con bosques dispersos. Ideal para partidas agresivas.',
    generate(gen) {
      gen.fill('grass');
      const starts = gen.startPositions(0.36);
      starts.forEach(s => gen.protectCircle(s.x, s.y, 11));
      dirtPatches(gen, Math.round(gen.w * gen.h / 350), starts);
      // Algún estanque
      for (let i = 0; i < 2; i++) {
        const x = gen.randInt(10, gen.w - 10), y = gen.randInt(10, gen.h - 10);
        if (starts.some(s => Math.hypot(s.x - x, s.y - y) < 18)) continue;
        gen.blob(x, y, gen.rand(2.5, 4), (tx, ty) => { if (!gen.isProtected(tx, ty)) gen.set(tx, ty, 'water'); });
      }
      gen.shores();
      placeBases(gen, starts);
      const scale = (gen.w * gen.h) / (96 * 96);
      gen.forests(Math.round(12 * scale), 2.5, 5, starts, 14);
      gen.scatter('tree', Math.round(40 * scale), 1, 12, starts);
      extraResources(gen, starts, scale * starts.length / 2);
    },
  },
  {
    id: 'blackForest', name: 'Selva Negra', description: 'Bosque denso con caminos estrechos. Partidas largas y económicas.',
    generate(gen) {
      gen.fill('grass');
      const starts = gen.startPositions(0.33);
      const center = { x: gen.w / 2, y: gen.h / 2 };
      starts.forEach(s => { gen.protectCircle(s.x, s.y, 15); gen.protectLine(s, center, 2.5); });
      gen.protectCircle(center.x, center.y, 8);
      for (let i = 0; i < 6; i++) gen.protectCircle(gen.randInt(8, gen.w - 8), gen.randInt(8, gen.h - 8), gen.rand(4, 7));
      dirtPatches(gen, Math.round(gen.w * gen.h / 500), starts);
      placeBases(gen, starts);
      for (let y = 0; y < gen.h; y++) for (let x = 0; x < gen.w; x++) {
        if (!gen.isProtected(x, y) && gen.noise(x, y, 5) > 0.25) gen.placeNode('tree', x, y);
      }
      const scale = (gen.w * gen.h) / (96 * 96);
      extraResources(gen, starts, scale * starts.length / 2);
    },
  },
  {
    id: 'lakes', name: 'Lagos', description: 'Un gran lago central rodeado de tierra fértil.',
    generate(gen) {
      gen.fill('grass');
      const starts = gen.startPositions(0.38);
      starts.forEach(s => gen.protectCircle(s.x, s.y, 12));
      const cx = gen.w / 2, cy = gen.h / 2;
      gen.blob(cx, cy, Math.min(gen.w, gen.h) * 0.17, (x, y) => { if (!gen.isProtected(x, y)) gen.set(x, y, 'water'); }, 0.5);
      for (let i = 0; i < 3; i++) {
        const x = gen.randInt(8, gen.w - 8), y = gen.randInt(8, gen.h - 8);
        if (starts.some(s => Math.hypot(s.x - x, s.y - y) < 16)) continue;
        gen.blob(x, y, gen.rand(3, 5), (tx, ty) => { if (!gen.isProtected(tx, ty)) gen.set(tx, ty, 'water'); });
      }
      gen.shores();
      dirtPatches(gen, Math.round(gen.w * gen.h / 600), starts);
      placeBases(gen, starts);
      const scale = (gen.w * gen.h) / (96 * 96);
      gen.forests(Math.round(14 * scale), 2.5, 5.5, starts, 14);
      extraResources(gen, starts, scale * starts.length / 2);
    },
  },
];
