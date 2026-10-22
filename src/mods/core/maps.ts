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
  gen.scatter('ironMine', Math.round(2 * scale), 6, 22, starts);
  gen.scatter('coalMine', Math.round(2 * scale), 6, 22, starts);
  gen.scatter('berries', Math.round(1 * scale), 5, 18, starts);
}

/**
 * Pirineos: una cordillera nevada cruza el mapa y separa dos valles. Solo se
 * pasa por los puertos de montaña; los ríos bajan de las cumbres y se vadean.
 */
function pyrenees(gen: MapGenerator) {
  const w = gen.w, S2 = Math.SQRT2;
  // Coordenadas a lo largo de la cordillera (a) y perpendiculares (r); r < 0 = valle norte
  const toWorld = (a: number, r: number): Pt => {
    const u = w + r * S2, v = a * S2;
    return { x: (u + v) / 2, y: (u - v) / 2 };
  };
  const coords = (x: number, y: number) => ({ a: (x - y) / S2, r: (x + y - w) / S2 });
  const halfLen = (w / S2) * 0.85;
  const hw = w * 0.11;
  const wobble = (a: number) => (gen.noise(a, 3, 14) - 0.5) * w * 0.12;

  // Valles a ambos lados (jugadores alternos norte / sur)
  const n = gen.players.length;
  const north = Math.ceil(n / 2), south = n - north;
  const starts: Pt[] = [];
  const place = (count: number, side: number, idx: number) => {
    const a = count === 1 ? (gen.rand(-0.15, 0.15)) * halfLen : (-0.55 + (1.1 * idx) / (count - 1)) * halfLen;
    return toWorld(a, side * w * 0.27);
  };
  for (let i = 0, ni = 0, si = 0; i < n; i++) {
    starts.push(i % 2 === 0 ? place(north, -1, ni++) : place(south, 1, si++));
  }

  // Puertos de montaña
  const passCount = Math.max(2, Math.ceil(n / 2) + 1);
  const passes: number[] = [];
  for (let i = 0; i < passCount; i++) passes.push((-0.7 + (1.4 * (i + 0.5)) / passCount + gen.rand(-0.06, 0.06)) * halfLen);
  const passW = 4.5;

  // Relieve: cordillera + estribaciones + colinas suaves en los valles
  gen.fill('grass');
  gen.addHeight((vx, vy) => {
    const { a, r } = coords(vx, vy);
    const d = Math.abs(r - wobble(a));
    const core = Math.exp(-((d / hw) ** 2));
    const peaks = 0.45 + 0.95 * gen.noise(a, 11, 5);
    let h = 7.2 * core * peaks + 1.8 * core * (gen.noise(vx, vy, 2.5) - 0.3);
    for (const pa of passes) h *= 1 - 0.82 * Math.exp(-(((a - pa) / passW) ** 2));
    h += 2.2 * Math.exp(-((d / (hw * 2.2)) ** 2)) * gen.noise(vx, vy, 5);
    return h;
  });
  gen.hills(Math.round(10 * (w * w) / (96 * 96)), 4, 8, 0.8, 2, starts, 13);
  // Los puertos son transitables
  for (const pa of passes) {
    const a0 = toWorld(pa, -hw * 2.2), a1 = toWorld(pa, hw * 2.2);
    gen.protectLine(a0, a1, 2.2);
  }

  // Terreno según altura y pendiente
  for (let y = 0; y < gen.h; y++) for (let x = 0; x < w; x++) {
    const th = gen.tileHeight(x, y), sl = gen.tileSlope(x, y);
    const prot = gen.isProtected(x, y);
    const crag = gen.noise(x + 77, y, 3) > 0.68;
    if (!prot && (th > 7.6 || sl > 2.8 || (th > 6 && crag))) gen.set(x, y, 'rock');
    else if (th > 4.4) gen.set(x, y, 'snow');
    else if (th < 1.6 && gen.noise(x, y, 6) > 0.72) gen.set(x, y, 'dirt');
  }

  // Ríos que bajan de las cumbres, con vados
  starts.forEach(s => gen.protectCircle(s.x, s.y, 13));
  for (const side of [-1, 1]) {
    const sideStarts = starts.filter(s => Math.sign(coords(s.x, s.y).r) === side).map(s => coords(s.x, s.y).a);
    const options = [-halfLen * 0.95, ...sideStarts, halfLen * 0.95].sort((p, q) => p - q);
    let bestA = 0, gap = -1;
    for (let i = 0; i < options.length - 1; i++) if (options[i + 1] - options[i] > gap) { gap = options[i + 1] - options[i]; bestA = (options[i] + options[i + 1]) / 2; }
    let a = bestA;
    const rStart = side * hw * 1.1, rEnd = side * w * 0.75;
    const steps = Math.ceil(Math.abs(rEnd - rStart) * 2);
    for (let i = 0; i <= steps; i++) {
      const r = rStart + ((rEnd - rStart) * i) / steps;
      a += (gen.noise(i, side * 50, 9) - 0.5) * 1.4;
      const c = toWorld(a, r);
      const ford = i % Math.round(steps / 3) < 3 && i > 4;
      gen.blob(c.x, c.y, 1.3, (x, y) => {
        if (gen.terrainAt(x, y) === 'rock') return;
        gen.set(x, y, ford ? 'shallows' : 'water');
      }, 0.2);
    }
  }
  gen.shores();
  gen.levelWater();

  gen.players.forEach((p, i) => gen.base(p, starts[i]));

  // Bosques: pinos en las laderas, pinos nevados arriba, frondosos en el valle
  for (let y = 0; y < gen.h; y++) for (let x = 0; x < w; x++) {
    if (gen.isProtected(x, y)) continue;
    const th = gen.tileHeight(x, y), t = gen.terrainAt(x, y);
    if (t === 'rock' || t === 'water' || t === 'shallows' || t === 'sand') continue;
    const f = gen.noise(x + 300, y, 6);
    if (th > 4.2 && th < 6 && f > 0.55) gen.placeNode('snowPine', x, y);
    else if (th > 1.8 && th <= 4.2 && f > 0.42) gen.placeNode('pineTree', x, y);
    else if (th <= 2 && f > 0.7) gen.placeNode(gen.rng() < 0.5 ? 'tree' : 'pineTree', x, y);
  }
  // Más piedra y oro al pie de las montañas
  const scale = (w * w) / (96 * 96);
  for (let i = 0; i < Math.round(6 * scale); i++) {
    for (let k = 0; k < 40; k++) {
      const x = gen.randInt(3, w - 4), y = gen.randInt(3, gen.h - 4);
      const th = gen.tileHeight(x, y);
      if (th < 1.5 || th > 4.5 || starts.some(s => Math.hypot(s.x - x, s.y - y) < 18) || !gen.areaFree(x, y, 1, true)) continue;
      gen.cluster(i % 3 === 0 ? 'goldMine' : 'stoneMine', x, y, 5);
      break;
    }
  }
  gen.scatter('berries', Math.round(2 * scale), 5, 18, starts);
  gen.scatter('ironMine', Math.round(2 * scale), 5, 20, starts);
  gen.scatter('coalMine', Math.round(2 * scale), 5, 20, starts);
}

export const maps: MapTypeDef[] = [
  {
    id: 'arabia', name: 'Arabia', description: 'Terreno abierto con bosques dispersos. Ideal para partidas agresivas.',
    generate(gen) {
      gen.fill('grass');
      const starts = gen.startPositions(0.36);
      starts.forEach(s => gen.protectCircle(s.x, s.y, 11));
      const sc = (gen.w * gen.h) / (96 * 96);
      gen.hills(Math.round(12 * sc), 4, 9, 1.2, 3.2, starts, 12);
      gen.smoothHeights(1);
      // Mesetas con cantiles de roca y una rampa: puntos altos que disputar
      gen.mesas(Math.max(2, Math.round(3 * sc)), 3.5, 6, 3, 4.5, starts, 18);
      dirtPatches(gen, Math.round(gen.w * gen.h / 350), starts);
      // Algún estanque
      for (let i = 0; i < 2; i++) {
        const x = gen.randInt(10, gen.w - 10), y = gen.randInt(10, gen.h - 10);
        if (starts.some(s => Math.hypot(s.x - x, s.y - y) < 18)) continue;
        gen.blob(x, y, gen.rand(2.5, 4), (tx, ty) => { if (!gen.isProtected(tx, ty)) gen.set(tx, ty, 'water'); });
      }
      gen.shores();
      gen.levelWater();
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
      gen.hills(Math.round(8 * (gen.w * gen.h) / (96 * 96)), 5, 10, 1, 2.5, starts, 14);
      gen.smoothHeights(1);
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
    id: 'pyrenees', name: 'Pirineos', description: 'Una cordillera nevada divide el mapa en dos valles que solo se comunican por los puertos de montaña. Ríos con vados, pinares y mucha piedra.',
    generate: pyrenees,
  },
  {
    id: 'lakes', name: 'Lagos', description: 'Un gran lago central rodeado de tierra fértil.',
    generate(gen) {
      gen.fill('grass');
      const starts = gen.startPositions(0.38);
      starts.forEach(s => gen.protectCircle(s.x, s.y, 12));
      const cx = gen.w / 2, cy = gen.h / 2;
      gen.hills(Math.round(9 * (gen.w * gen.h) / (96 * 96)), 4, 8, 1, 2.6, [...starts, { x: cx, y: cy }], 16);
      gen.smoothHeights(1);
      gen.mesas(2, 3.5, 5, 3, 4, [...starts, { x: cx, y: cy }], 20);
      gen.blob(cx, cy, Math.min(gen.w, gen.h) * 0.17, (x, y) => { if (!gen.isProtected(x, y)) gen.set(x, y, 'water'); }, 0.5);
      for (let i = 0; i < 3; i++) {
        const x = gen.randInt(8, gen.w - 8), y = gen.randInt(8, gen.h - 8);
        if (starts.some(s => Math.hypot(s.x - x, s.y - y) < 16)) continue;
        gen.blob(x, y, gen.rand(3, 5), (tx, ty) => { if (!gen.isProtected(tx, ty)) gen.set(tx, ty, 'water'); });
      }
      gen.shores();
      gen.levelWater();
      dirtPatches(gen, Math.round(gen.w * gen.h / 600), starts);
      placeBases(gen, starts);
      const scale = (gen.w * gen.h) / (96 * 96);
      gen.forests(Math.round(14 * scale), 2.5, 5.5, starts, 14);
      extraResources(gen, starts, scale * starts.length / 2);
    },
  },
];
