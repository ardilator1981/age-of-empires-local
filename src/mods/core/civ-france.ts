import type { BuildingDef, TechDef, UnitDef } from '../../core/types';

/**
 * Francia (id `france`), eras 0–4: francos, Francia capeta, Francia medieval tardía, Renacimiento
 * y Antiguo Régimen (docs/civilizaciones.md §5.3). El Lanzador de hachas de siempre (en
 * `units.ts`) es el guerrero franco de la Edad Oscura. Valores indicativos.
 */
const FRANCE = ['france'];

export const franceUnits: UnitDef[] = [
  {
    id: 'crusaderKnight', name: 'Caballero cruzado', icon: '🏇', description: 'Unidad única francesa (Feudal): caballería pesada capeta de las cruzadas.',
    classes: ['cavalry'], civs: FRANCE, cost: { food: 60, gold: 60 }, trainTime: 30, trainedAt: ['stable'],
    hp: 85, attack: 9, attackType: 'melee', reloadTime: 1.9, armor: { melee: 1, pierce: 2 },
    speed: 1.35, los: 4, pop: 1, age: 1, radius: 0.35,
    sprite: 'cavalry', spriteParams: { weapon: 'sword', horse: '#e2dccb', barding: true, helmet: true },
  },
  {
    id: 'gendarme', name: 'Gendarme', icon: '🏇', description: 'Unidad única francesa (Castillos): hombre de armas de las compañías de ordenanza de Carlos VII.',
    classes: ['cavalry'], civs: FRANCE, cost: { food: 70, gold: 80 }, trainTime: 32, trainedAt: ['castle'],
    hp: 125, attack: 12, attackType: 'melee', reloadTime: 1.8, armor: { melee: 3, pierce: 3 },
    speed: 1.3, los: 4, pop: 1, age: 2, radius: 0.35,
    sprite: 'cavalry', spriteParams: { weapon: 'sword', horse: '#3d3a46', barding: true, helmet: true, armor: true, scale: 1.05 },
  },
  {
    id: 'ordinanceArquebusier', name: 'Arcabucero de la ordenanza', icon: '🔫', description: 'Unidad única francesa (Imperial): infantería con arcabuz de las guerras de Italia y de religión.',
    classes: ['infantry', 'firearm'], civs: FRANCE, cost: { food: 55, gold: 55 }, trainTime: 22, trainedAt: ['castle'],
    hp: 45, attack: 13, attackType: 'pierce', range: 6, reloadTime: 3, armor: { melee: 0, pierce: 1 },
    speed: 0.94, los: 7, pop: 1, age: 3, projectile: 'bullet',
    sprite: 'humanoid', spriteParams: { weapon: 'musket', helmet: true, cape: true },
  },
  {
    id: 'bayonetFusilier', name: 'Fusilero con bayoneta', icon: '🔫', description: 'Unidad única francesa (Pólvora): infantería de línea del Antiguo Régimen, de buen tiro y buena defensa.',
    classes: ['infantry', 'firearm'], civs: FRANCE, cost: { food: 55, gold: 45 }, trainTime: 24, trainedAt: ['castle'],
    hp: 60, attack: 16, attackType: 'pierce', range: 6, reloadTime: 3, armor: { melee: 1, pierce: 2 },
    speed: 0.94, los: 7, pop: 1, age: 4, projectile: 'bullet',
    sprite: 'humanoid', spriteParams: { weapon: 'musket', hat: 'tricorn', cape: true },
  },
  {
    id: 'gribeauvalCannon', name: 'Cañón Gribeauval', icon: '💣', description: 'Unidad única francesa (Pólvora): artillería estandarizada de 1765, más precisa y ligera que el cañón común.',
    classes: ['siege', 'artillery', 'antiUnit'], civs: FRANCE, cost: { wood: 160, gold: 110 }, trainTime: 36, trainedAt: ['gunpowderWorks'],
    hp: 95, attack: 36, attackType: 'pierce', range: 10, reloadTime: 4.5, armor: { melee: 1, pierce: 4 },
    bonus: [{ vs: 'building', amount: 28 }], speed: 0.65, los: 5, pop: 2, age: 4, radius: 0.4, projectile: 'cannonball', splash: { radius: 1, falloff: 0.5, scatter: 0.6 },
    sprite: 'cannon', spriteParams: { barrel: '#6a5a2a' },
  },
];

export const franceBuildings: BuildingDef[] = [
  {
    id: 'royalVilla', name: 'Villa real', icon: '🏡', category: 'economy', civs: FRANCE,
    description: 'Edificio único francés (Edad Oscura): el palacio rural carolingio. Depósito de alimento que aloja población.',
    classes: ['building'], cost: { wood: 150 }, buildTime: 40, size: 2,
    hp: 1000, armor: { melee: 0, pierce: 7 }, los: 4, age: 0, popProvided: 10, dropSite: ['food'],
    sprite: 'building', spriteParams: { style: 'mill' },
  },
  {
    id: 'gothicCathedral', name: 'Catedral gótica', icon: '⛪', category: 'economy', civs: FRANCE,
    description: 'Edificio único francés (Feudal): refugio para 15 aldeanos e infantería.',
    classes: ['building'], cost: { wood: 200, stone: 150 }, buildTime: 80, size: 3,
    hp: 2200, armor: { melee: 2, pierce: 9 }, los: 6, age: 1,
    shelter: { classes: ['villager', 'infantry'], capacity: 15 },
    sprite: 'building', spriteParams: { style: 'castle', inset: 0.1, wall: '#d6cfbc', roof: '#4a5a72' },
  },
  {
    id: 'bastide', name: 'Bastida', icon: '🏘️', category: 'economy', civs: FRANCE,
    description: 'Edificio único francés (Castillos): ciudad fortificada nueva. Centro urbano que entrena aldeanos y dispara.',
    classes: ['building', 'townCenter'], cost: { wood: 150, stone: 250 }, buildTime: 120, size: 4,
    hp: 3000, armor: { melee: 4, pierce: 7 }, los: 8, age: 2, popProvided: 10, dropSite: ['food', 'wood', 'gold', 'stone', 'iron', 'coal'], requiresBuildings: ['townCenter'],
    attack: 6, attackType: 'pierce', range: 6, reloadTime: 2, projectile: 'arrow',
    sprite: 'building', spriteParams: { style: 'tc', wall: '#d8cba8', roof: '#8a4a2e' },
  },
  {
    id: 'chateau', name: 'Château', icon: '🏰', category: 'military', civs: FRANCE,
    description: 'Edificio único francés (Imperial): casa-fortaleza renacentista. Aloja población y dispara.',
    classes: ['building', 'tower'], cost: { wood: 300, stone: 300 }, buildTime: 110, size: 3,
    hp: 2600, armor: { melee: 3, pierce: 9 }, los: 8, age: 3, popProvided: 15,
    attack: 7, attackType: 'pierce', range: 7, reloadTime: 2, projectile: 'arrow',
    sprite: 'building', spriteParams: { style: 'castle', inset: 0.08, wall: '#e4dcc4', roof: '#3a5a8a' },
  },
  {
    id: 'vaubanFortress', name: 'Fortaleza de Vauban', icon: '⭐', category: 'military', civs: FRANCE,
    description: 'Edificio único francés (Pólvora): fortaleza abaluartada de Vauban. Más resistente y barata que la común.',
    classes: ['building', 'castle', 'fortress'], cost: { stone: 800 }, buildTime: 200, size: 4,
    hp: 7000, armor: { melee: 11, pierce: 14 }, los: 12, age: 4, popProvided: 20, requiresBuildings: ['castle'],
    attack: 15, attackType: 'pierce', range: 9, reloadTime: 2, projectile: 'bullet',
    sprite: 'building', spriteParams: { style: 'castle', inset: 0.03, wall: '#b4aea0', roof: '#3a5a8a' },
  },
  {
    id: 'royalManufacture', name: 'Manufactura real', icon: '🏭', category: 'economy', civs: FRANCE,
    description: 'Edificio único francés (Pólvora): las manufacturas de Colbert. Depósito de oro.',
    classes: ['building'], cost: { wood: 100, gold: 200 }, buildTime: 60, size: 3,
    hp: 1400, armor: { melee: 0, pierce: 8 }, los: 5, age: 4, dropSite: ['gold'],
    sprite: 'building', spriteParams: { style: 'hall', height: 22, roofHeight: 16, wall: '#e8e0cc', roof: '#3a5a8a' },
  },
];

export const franceTechs: TechDef[] = [
  {
    id: 'capitularies', name: 'Capitulares', icon: '📜', civs: FRANCE,
    description: 'Tecnología única francesa (Edad Oscura): las ordenanzas carolingias y los missi dominici. Granjeros +10% más rápidos.',
    cost: { food: 150, gold: 50 }, researchTime: 40, age: 0, researchedAt: 'townCenter',
    effects: [{ type: 'gatherRate', resource: 'food', op: 'mul', value: 1.1 }],
  },
  {
    id: 'townCharter', name: 'Carta urbana', icon: '📜', civs: FRANCE,
    description: 'Tecnología única francesa (Feudal): las ciudades libres crecen. Los aldeanos se entrenan un 15% más rápido.',
    cost: { food: 200, gold: 100 }, researchTime: 40, age: 1, researchedAt: 'townCenter',
    effects: [{ type: 'stat', target: { ids: ['villager'] }, stat: 'trainTime', op: 'mul', value: 0.85 }],
  },
  {
    id: 'taille', name: 'Taille', icon: '🪙', civs: FRANCE,
    description: 'Tecnología única francesa (Castillos): el primer impuesto permanente del rey. El oro se recoge un 10% más rápido.',
    cost: { food: 300, gold: 100 }, researchTime: 50, age: 2, researchedAt: 'townCenter',
    effects: [{ type: 'gatherRate', resource: 'gold', op: 'mul', value: 1.1 }],
  },
  {
    id: 'hireMercenaries', name: 'Contratar mercenarios', icon: '🛡️', civs: FRANCE,
    description: 'Tecnología única francesa (Imperial): lansquenetes y suizos a sueldo. Seis piqueros aparecen junto al centro urbano.',
    cost: { gold: 600 }, researchTime: 30, age: 3, researchedAt: 'townCenter',
    effects: [{
      type: 'custom',
      apply(game, player) {
        const tc = game.buildings.find(b => b.owner === player.id && !b.dead && game.buildingDef(b).classes.includes('townCenter') && b.complete);
        if (!tc) return;
        for (let i = 0; i < 6; i++) {
          const spot = game.findFreeTile(tc.x, tc.y, 10);
          if (spot) game.spawnUnit('pikeman', player.id, spot.x + 0.5, spot.y + 0.5);
        }
      },
    }],
  },
  {
    id: 'colbertism', name: 'Colbertismo', icon: '⚖️', civs: FRANCE,
    description: 'Tecnología única francesa (Pólvora): manufacturas, aranceles y comercio. El oro se recoge un 15% más rápido.',
    cost: { wood: 300, gold: 200 }, researchTime: 60, age: 4, researchedAt: 'royalManufacture',
    effects: [{ type: 'gatherRate', resource: 'gold', op: 'mul', value: 1.15 }],
  },
  // Doctrinas excluyentes de la era (docs/civilizaciones.md §7): se elige una de las dos
  {
    id: 'vaubanDoctrine', name: 'Doctrina de Vauban', icon: '⭐', civs: FRANCE, excludes: ['gribeauvalDoctrine'],
    description: 'Doctrina (excluye la de Gribeauval): la guerra de sitios y las plazas fuertes. Torres, castillos y fortalezas: +25% de PV y +1 de alcance.',
    cost: { food: 350, stone: 250 }, researchTime: 60, age: 4, researchedAt: 'townCenter',
    aiWeight: (_g, p) => 1 + 0.25 * (p.count('tower') + p.count('castle') + p.count('fortress') + p.count('vaubanFortress')),
    effects: [
      { type: 'stat', target: { classes: ['tower', 'castle', 'fortress'], kind: 'building' }, stat: 'hp', op: 'mul', value: 1.25 },
      { type: 'stat', target: { classes: ['tower', 'castle', 'fortress'], kind: 'building' }, stat: 'range', op: 'add', value: 1 },
    ],
  },
  {
    id: 'gribeauvalDoctrine', name: 'Doctrina de Gribeauval', icon: '💣', civs: FRANCE, excludes: ['vaubanDoctrine'],
    description: 'Doctrina (excluye la de Vauban): la artillería de campaña estandarizada. Artillería: +3 de ataque y -20% de coste.',
    cost: { food: 350, gold: 250 }, researchTime: 60, age: 4, researchedAt: 'townCenter',
    aiWeight: (_g, p) => 1 + 0.3 * (p.count('gunpowderWorks') + p.count('cannon') + p.count('gribeauvalCannon')),
    effects: [
      { type: 'stat', target: { classes: ['artillery'], kind: 'unit' }, stat: 'attack', op: 'add', value: 3 },
      { type: 'cost', target: { classes: ['artillery'], kind: 'unit' }, resource: '*', op: 'mul', value: 0.8 },
    ],
  },
];
