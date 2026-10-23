import { BALANCE } from '../../config/balance';
import type { AIPlugin, BuildingDef, Pt, TechDef } from '../../core/types';
import type { Entity } from '../../game/Entity';
import { placeSegments } from '../../game/defense';
import { hypot } from '../../game/fmath';

/**
 * Defensas lineales por era (docs/civilizaciones.md «Defensas»). Son edificios de una casilla que se
 * levantan en línea; el motor solo sabe de `line`, `gate`, `replaces` y `footDamage` (ver `game/defense.ts`).
 *
 *   Oscura     Empalizada · Puerta de empalizada
 *   Feudal     Zanja · Puente
 *   Castillos  Muralla de piedra · Puerta de piedra · Torre de muralla
 *   Imperial   Muralla fortificada · Puerta fortificada
 *
 * Clases: `wall` (empalizada, murallas y puertas: reciben los bonos de PV y el aceite hirviendo),
 * `barrier` (todo lo que solo estorba el paso: no cuenta para la victoria por conquista),
 * `gate` (deja pasar a propios y aliados). Valores indicativos.
 */

const WOOD = '#8a6a3e', STONE = '#a9a398', FORT = '#8c8a86';

export const defenseBuildings: BuildingDef[] = [
  {
    id: 'palisade', name: 'Empalizada', icon: '🪵', category: 'military', line: true,
    description: 'Tramo de estacas de madera: barato y débil, cierra el paso a las tropas a pie. Arrastra para trazar una línea. Los arqueros pueden disparar por encima.',
    classes: ['building', 'wall', 'barrier'], cost: { wood: 4 }, buildTime: 5, size: 1,
    hp: 280, armor: { melee: 2, pierce: 5 }, los: 1, age: 0,
    sprite: 'wall', spriteParams: { link: 'wall', color: WOOD, height: 17, thick: 0.12, stakes: true },
  },
  {
    id: 'palisadeGate', name: 'Puerta de empalizada', icon: '🚪', category: 'military', gate: true, walkable: true,
    description: 'Hueco en la empalizada: deja pasar a tus unidades y a las de tus aliados y está cerrado a las enemigas.',
    classes: ['building', 'wall', 'barrier', 'gate'], cost: { wood: 30 }, buildTime: 12, size: 1,
    hp: 350, armor: { melee: 1, pierce: 4 }, los: 2, age: 0,
    sprite: 'wall', spriteParams: { link: 'wall', color: WOOD, height: 20, gate: true },
  },
  {
    id: 'ditch', name: 'Zanja', icon: '⛏️', category: 'military', line: true,
    description: 'Foso excavado: ninguna unidad de tierra lo cruza (los arqueros y el asedio sí disparan sobre él). Se rellena eliminándolo, y se cruza con un puente. Arrastra para trazar una línea.',
    classes: ['building', 'barrier', 'ditch'], cost: { wood: 2 }, buildTime: 6, size: 1,
    hp: 150, armor: { melee: 0, pierce: 50 }, los: 1, age: 1,
    sprite: 'ditch', spriteParams: { link: 'ditch' },
  },
  {
    id: 'bridge', name: 'Puente', icon: '🌉', category: 'military', gate: true, walkable: true, replaces: ['ditch'],
    description: 'Se construye sobre un tramo de zanja propio: deja pasar a tus unidades y a las de tus aliados y está cerrado a las enemigas.',
    classes: ['building', 'barrier', 'gate'], cost: { wood: 20 }, buildTime: 10, size: 1,
    hp: 300, armor: { melee: 1, pierce: 4 }, los: 2, age: 1,
    sprite: 'ditch', spriteParams: { link: 'ditch', bridge: true },
  },
  {
    id: 'stoneWall', name: 'Muralla de piedra', icon: '🧱', category: 'military', line: true,
    description: 'Tramo de muralla: mucha vida y armadura, casi inmune a las flechas y a las tropas a pie. Solo el asedio la abre. Arrastra para trazar una línea.',
    classes: ['building', 'wall', 'barrier'], cost: { stone: 6 }, buildTime: 12, size: 1,
    hp: 1800, armor: { melee: 8, pierce: 10 }, los: 2, age: 2,
    sprite: 'wall', spriteParams: { link: 'wall', color: STONE, height: 24, thick: 0.22, crenels: true },
  },
  {
    id: 'stoneGate', name: 'Puerta de piedra', icon: '🚪', category: 'military', gate: true, walkable: true,
    description: 'Puerta de la muralla: deja pasar a tus unidades y a las de tus aliados y está cerrada a las enemigas. El punto débil de un muro.',
    classes: ['building', 'wall', 'barrier', 'gate'], cost: { stone: 30, wood: 20 }, buildTime: 30, size: 1,
    hp: 1400, armor: { melee: 6, pierce: 8 }, los: 3, age: 2,
    sprite: 'wall', spriteParams: { link: 'wall', color: STONE, height: 28, gate: true },
  },
  {
    id: 'wallTower', name: 'Torre de muralla', icon: '🗼', category: 'military',
    description: 'Torre que se levanta en la línea de la muralla: dispara flechas desde lo alto y cubre los tramos vecinos.',
    classes: ['building', 'tower', 'fortification'], cost: { stone: 100, wood: 20 }, buildTime: 60, size: 1,
    hp: 1100, armor: { melee: 4, pierce: 9 }, los: 10, age: 2,
    attack: 6, attackType: 'pierce', range: 8, reloadTime: 2, projectile: 'arrow',
    sprite: 'building', spriteParams: { style: 'tower', inset: 0.08 },
  },
  {
    id: 'fortifiedWall', name: 'Muralla fortificada', icon: '🏰', category: 'military', line: true,
    description: 'Muralla de sillería con matacán: aún más vida y armadura. Solo el asedio pesado (trabuquetes, artillería) la derriba. Arrastra para trazar una línea.',
    classes: ['building', 'wall', 'barrier'], cost: { stone: 10 }, buildTime: 16, size: 1,
    hp: 3000, armor: { melee: 12, pierce: 14 }, los: 2, age: 3,
    sprite: 'wall', spriteParams: { link: 'wall', color: FORT, height: 28, thick: 0.25, crenels: true },
  },
  {
    id: 'fortifiedGate', name: 'Puerta fortificada', icon: '🚪', category: 'military', gate: true, walkable: true,
    description: 'Puerta reforzada con rastrillo: deja pasar a tus unidades y a las de tus aliados y está cerrada a las enemigas.',
    classes: ['building', 'wall', 'barrier', 'gate'], cost: { stone: 50, wood: 30 }, buildTime: 40, size: 1,
    hp: 2400, armor: { melee: 9, pierce: 10 }, los: 3, age: 3,
    sprite: 'wall', spriteParams: { link: 'wall', color: FORT, height: 32, gate: true },
  },
];

const WALLS = { classes: ['wall', 'tower'], kind: 'building' as const };

export const defenseTechs: TechDef[] = [
  {
    id: 'defenseArchitecture', name: 'Arquitectura de defensa', icon: '📐', description: 'Empalizadas, murallas, puertas y torres: +25% de PV.',
    cost: { wood: 150, stone: 100 }, researchTime: 40, age: 1, researchedAt: 'townCenter', aiManaged: true,
    effects: [{ type: 'stat', target: WALLS, stat: 'hp', op: 'mul', value: 1.25 }],
  },
  {
    id: 'buttresses', name: 'Contrafuertes', icon: '🏛️', description: 'Empalizadas, murallas, puertas y torres: +25% de PV y +1/+1 de armadura.',
    cost: { food: 200, stone: 200 }, researchTime: 55, age: 2, researchedAt: 'blacksmith', aiManaged: true, requiresTechs: ['defenseArchitecture'],
    effects: [
      { type: 'stat', target: WALLS, stat: 'hp', op: 'mul', value: 1.25 },
      { type: 'stat', target: WALLS, stat: 'armorMelee', op: 'add', value: 1 },
      { type: 'stat', target: WALLS, stat: 'armorPierce', op: 'add', value: 1 },
    ],
  },
  {
    id: 'boilingOil', name: 'Aceite hirviendo', icon: '🛢️', description: 'Murallas, puertas y torres hieren a los enemigos que están a su pie (8 de daño por segundo, sin que la armadura ayude).',
    cost: { wood: 200, gold: 120 }, researchTime: 45, age: 2, researchedAt: 'blacksmith', aiManaged: true, requiresTechs: ['defenseArchitecture'],
    effects: [{ type: 'stat', target: WALLS, stat: 'footDamage', op: 'add', value: 8 }],
  },
  {
    id: 'wallCrews', name: 'Cuadrillas de albañiles', icon: '🔨', description: 'Los aldeanos levantan y reparan empalizadas, murallas, puertas y zanjas un 40% más rápido.',
    cost: { food: 120, wood: 80 }, researchTime: 30, age: 1, researchedAt: 'townCenter', aiManaged: true,
    effects: [{ type: 'stat', target: { classes: ['barrier'], kind: 'building' }, stat: 'buildTime', op: 'mul', value: 0.6 }],
  },
];

// ------------------------------------------------ IA

/** Muro y puerta que levanta la IA según su edad (el más avanzado que tiene). */
const WALL_TIERS: [string, string][] = [['fortifiedWall', 'fortifiedGate'], ['stoneWall', 'stoneGate'], ['palisade', 'palisadeGate']];
const DIFFICULTIES = ['easy', 'normal', 'hard'];

/** Casillas del anillo cuadrado de radio `r` alrededor de `c`, en orden de vuelta, y los cuatro centros de lado (norte, este, sur, oeste) con su dirección a lo largo del lado. */
export function ringTiles(c: Pt, r: number): { tiles: Pt[]; sides: { x: number; y: number; dx: number; dy: number }[] } {
  const cx = Math.floor(c.x), cy = Math.floor(c.y), tiles: Pt[] = [];
  for (let i = -r; i <= r; i++) tiles.push({ x: cx + i, y: cy - r });
  for (let i = -r + 1; i <= r; i++) tiles.push({ x: cx + r, y: cy + i });
  for (let i = r - 1; i >= -r; i--) tiles.push({ x: cx + i, y: cy + r });
  for (let i = r - 1; i > -r; i--) tiles.push({ x: cx - r, y: cy + i });
  return { tiles, sides: [{ x: cx, y: cy - r, dx: 1, dy: 0 }, { x: cx + r, y: cy, dx: 0, dy: 1 }, { x: cx, y: cy + r, dx: 1, dy: 0 }, { x: cx - r, y: cy, dx: 0, dy: 1 }] };
}

/**
 * IA de las defensas: rodea su centro urbano con una empalizada (o muralla, según la edad) con puertas
 * en los cuatro lados, repone los tramos caídos y mejora los muros con las tecnologías. Solo gasta lo
 * que sobra (no frena la economía ni la subida de edad) y salta las casillas ocupadas: un muro
 * lleno de huecos no encierra a nadie. Según la dificultad: en fácil no construye.
 */
export const defenseAI: AIPlugin = {
  id: 'defense',
  uses: ['palisade', 'palisadeGate', 'stoneWall', 'stoneGate', 'fortifiedWall', 'fortifiedGate', 'defenseArchitecture', 'buttresses', 'boilingOil', 'wallCrews'],
  think(ctx) {
    const { game: g, player: p } = ctx;
    const radius = BALANCE.defense.aiRingRadius[Math.max(0, DIFFICULTIES.indexOf(p.difficulty))] ?? 0;
    if (radius <= 0 || g.time < BALANCE.defense.aiStartAt || ctx.villagers.length < 12 || p.age < 1) return;
    // Solo hay muros si hay de quién protegerse: algún enemigo con un ejército de cierto tamaño
    let threat = 0;
    for (const u of g.units) if (!u.dead && g.isEnemy(p.id, u.owner) && !g.unitDef(u).gatherer && (g.unitDef(u).attack ?? 0) > 0 && ++threat >= BALANCE.defense.aiThreatArmy) break;
    if (threat < BALANCE.defense.aiThreatArmy) return;
    // La economía y los edificios militares primero: los muros son para lo que sobra
    if (ctx.buildings.filter(b => b.complete && g.reg.building(b.defId).category === 'military' && !g.reg.building(b.defId).classes.includes('barrier')).length < 3) return;
    // Una vez cada pocos segundos
    if (g.time < (p.data.defenseNext ?? 0)) return;
    p.data.defenseNext = g.time + BALANCE.defense.aiEvery;
    const spare = (cost: Record<string, number | undefined>, extra = 0) =>
      ctx.canSpend(cost) && Object.entries(cost).every(([r, v]) => (p.res[r] ?? 0) >= (v ?? 0) + (BALANCE.defense.aiKeep[r] ?? 100) + extra);

    // El tipo de muro más avanzado que se puede levantar
    const tier = WALL_TIERS.find(([w]) => g.reg.building(w).age <= p.age);
    if (!tier) return;
    const [wall, gate] = tier;
    const wallDef = g.reg.building(wall);
    const { tiles, sides } = ringTiles(ctx.home, radius);
    const m = g.map, key = (x: number, y: number) => y * m.w + x;
    const entityAt = (x: number, y: number) => (m.inBounds(x, y) ? g.entities.get(m.occupant[key(x, y)]) : undefined);
    const isBarrier = (e: Entity | undefined) => !!e && !e.dead && e.kind === 'building' && g.reg.building(e.defId).classes.includes('barrier');
    // Puertas: en cada lado, la más cercana a su centro que exista o se pueda colocar. Sin puertas no hay muro: no se encierra
    const gateAt = new Set<number>(), gateNew: [number, number][] = [];
    const take = BALANCE.defense.aiGates;
    for (const side of sides.slice(0, take)) {
      for (const k of [0, 1, -1, 2, -2, 3, -3]) {
        const x = side.x + side.dx * k, y = side.y + side.dy * k;
        const e = entityAt(x, y);
        if (e && isBarrier(e) && g.reg.building(e.defId).gate) { gateAt.add(key(x, y)); break; }
        if (!e && g.canPlace(gate, x, y)) { gateAt.add(key(x, y)); gateNew.push([x, y]); break; }
      }
    }
    let built = 0;
    const wallNew: [number, number][] = [];
    for (const t of tiles) {
      if (!m.inBounds(t.x, t.y)) continue;
      const e = entityAt(t.x, t.y);
      if (e && !e.dead) { if (isBarrier(e)) built++; continue; }
      if (!gateAt.has(key(t.x, t.y)) && g.canPlace(wall, t.x, t.y)) wallNew.push([t.x, t.y]);
    }
    // Lo primero son las puertas (sin ellas no se levanta ni un tramo); se paga con lo que sobra
    if (gateNew.length + wallNew.length > 0 && spare(p.getCost(gateNew.length ? g.reg.building(gate) : wallDef))) {
      const free = ctx.villagers.filter(v => v.order?.type !== 'build');
      const pool = (free.length ? free : ctx.villagers).slice().sort((a, b) => hypot(a.x - ctx.home.x, a.y - ctx.home.y) - hypot(b.x - ctx.home.x, b.y - ctx.home.y));
      const builders = pool.slice(0, 2);
      let left = BALANCE.defense.aiSegmentsPerThink;
      // Primero las puertas; los tramos de muro solo cuando todas las puertas están puestas
      if (gateNew.length) left -= placeSegments(g, p.id, gate, gateNew.slice(0, left), builders);
      else if (gateAt.size === Math.min(take, sides.length) || gateAt.size > 0) {
        if (wallNew.length && left > 0) placeSegments(g, p.id, wall, wallNew.slice(0, left), builders);
      }
    }
    // Mejoras de los muros, cuando ya hay un buen trecho levantado
    if (built >= 12) {
      for (const t of ['wallCrews', 'defenseArchitecture', 'boilingOil', 'buttresses']) {
        if (p.researched.has(t)) continue;
        if (spare(p.getCost(g.reg.tech(t)), 150) && ctx.research(t)) return;
      }
    }
  },
};
