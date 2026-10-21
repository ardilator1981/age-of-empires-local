import type { BuildingDef, TechDef, UnitDef } from '../../core/types';

/**
 * Británicos (id `britain`), eras 0–4: anglosajones, Inglaterra normanda, Plantagenet, Tudor y
 * Gran Bretaña (docs/civilizaciones.md §5.6). El Arquero de tiro largo y los «Arqueros ingleses»
 * (en `units.ts` y `techs.ts`) son lo único de la era 2. Valores indicativos.
 * Quedan para cuando exista el mar: el galeón y el astillero real (era 3), la fragata (era 4) y
 * el bloqueo de la Royal Navy.
 */
const BRITAIN = ['britain'];

export const britainUnits: UnitDef[] = [
  {
    id: 'fyrdman', name: 'Fyrdman', icon: '🛡️', description: 'Unidad única británica (Edad Oscura): milicia de la fyrd anglosajona. Barata y resistente.',
    classes: ['infantry'], civs: BRITAIN, cost: { food: 45, wood: 15 }, trainTime: 20, trainedAt: ['barracks'],
    hp: 48, attack: 5, attackType: 'melee', reloadTime: 2, armor: { melee: 0, pierce: 1 },
    speed: 0.92, los: 4, pop: 1, age: 0,
    sprite: 'humanoid', spriteParams: { weapon: 'spear', shield: true, hood: '#6a5a3a' },
  },
  {
    id: 'normanKnight', name: 'Caballero normando', icon: '🏇', description: 'Unidad única británica (Feudal): la caballería de Hastings.',
    classes: ['cavalry'], civs: BRITAIN, cost: { food: 65, gold: 50 }, trainTime: 30, trainedAt: ['stable'],
    hp: 80, attack: 9, attackType: 'melee', reloadTime: 1.9, armor: { melee: 1, pierce: 2 },
    speed: 1.38, los: 4, pop: 1, age: 1, radius: 0.35,
    sprite: 'cavalry', spriteParams: { weapon: 'sword', horse: '#4a3a2c', barding: true, helmet: true },
  },
  {
    id: 'tudorArquebusier', name: 'Arcabucero Tudor', icon: '🔫', description: 'Unidad única británica (Imperial): infantería con arcabuz de los ejércitos de Isabel I.',
    classes: ['infantry', 'firearm'], civs: BRITAIN, cost: { food: 50, gold: 55 }, trainTime: 22, trainedAt: ['castle'],
    hp: 42, attack: 13, attackType: 'pierce', range: 6, reloadTime: 3, armor: { melee: 0, pierce: 1 },
    speed: 0.95, los: 7, pop: 1, age: 3, projectile: 'bullet',
    sprite: 'humanoid', spriteParams: { weapon: 'musket', helmet: true, hood: '#2e5a2e' },
  },
  {
    id: 'redcoat', name: 'Casaca roja', icon: '🔴', description: 'Unidad única británica (Pólvora): infantería de línea con mosquete Brown Bess. Cadencia alta.',
    classes: ['infantry', 'firearm'], civs: BRITAIN, cost: { food: 55, gold: 45 }, trainTime: 24, trainedAt: ['castle'],
    hp: 58, attack: 15, attackType: 'pierce', range: 6, reloadTime: 2.6, armor: { melee: 0, pierce: 2 },
    speed: 0.94, los: 7, pop: 1, age: 4, projectile: 'bullet',
    sprite: 'humanoid', spriteParams: { weapon: 'musket', hat: 'tricorn', cape: true, hair: '#8a2020' },
  },
];

export const britainBuildings: BuildingDef[] = [
  {
    id: 'burh', name: 'Burh', icon: '🛖', category: 'military', civs: BRITAIN,
    description: 'Edificio único británico (Edad Oscura): ciudad fortificada de Alfredo. Barato; dispara flechas.',
    classes: ['building', 'tower'], cost: { wood: 90 }, buildTime: 35, size: 1,
    hp: 750, armor: { melee: 1, pierce: 6 }, los: 7, age: 0,
    attack: 3, attackType: 'pierce', range: 5, reloadTime: 2, projectile: 'arrow',
    sprite: 'building', spriteParams: { style: 'tower', inset: 0.1 },
  },
  {
    id: 'motteAndBailey', name: 'Castillo de mota', icon: '🏰', category: 'military', civs: BRITAIN,
    description: 'Edificio único británico (Feudal): el castillo normando de madera sobre una mota. Aloja población y dispara.',
    classes: ['building', 'tower'], cost: { wood: 200, stone: 100 }, buildTime: 80, size: 2,
    hp: 1500, armor: { melee: 2, pierce: 8 }, los: 8, age: 1, popProvided: 5,
    attack: 7, attackType: 'pierce', range: 8, reloadTime: 2, projectile: 'arrow',
    sprite: 'building', spriteParams: { style: 'tower', inset: 0.06, height: 36 },
  },
  {
    id: 'concentricCastle', name: 'Castillo concéntrico', icon: '🏯', category: 'military', civs: BRITAIN,
    description: 'Edificio único británico (Castillos): los castillos de Eduardo I en Gales. Fortaleza de dos murallas.',
    classes: ['building', 'castle'], cost: { stone: 750 }, buildTime: 210, size: 4,
    hp: 5600, armor: { melee: 9, pierce: 12 }, los: 11, age: 2, popProvided: 20,
    attack: 12, attackType: 'pierce', range: 8, reloadTime: 2, projectile: 'arrow',
    sprite: 'building', spriteParams: { style: 'castle', inset: 0.03, wall: '#c0b8a4', roof: '#4a5a6a' },
  },
  {
    id: 'bank', name: 'Banco', icon: '🏦', category: 'economy', civs: BRITAIN,
    description: 'Edificio único británico (Pólvora): el Banco de Inglaterra (1694). Depósito de oro; ofrece crédito.',
    classes: ['building'], cost: { wood: 100, stone: 250 }, buildTime: 70, size: 3,
    hp: 1600, armor: { melee: 1, pierce: 9 }, los: 5, age: 4, dropSite: ['gold'],
    sprite: 'building', spriteParams: { style: 'hall', height: 24, roofHeight: 14, wall: '#e6dec8', roof: '#4a5a6a' },
  },
];

export const britainTechs: TechDef[] = [
  {
    id: 'alfredReform', name: 'Reforma de Alfredo', icon: '📜', civs: BRITAIN,
    description: 'Tecnología única británica (Edad Oscura): ejército dividido y red de burhs. Torres: +15% de PV y +1 de ataque.',
    cost: { food: 150, gold: 50 }, researchTime: 40, age: 0, researchedAt: 'townCenter',
    effects: [
      { type: 'stat', target: { classes: ['tower'], kind: 'building' }, stat: 'hp', op: 'mul', value: 1.15 },
      { type: 'stat', target: { classes: ['tower'], kind: 'building' }, stat: 'attack', op: 'add', value: 1 },
    ],
  },
  {
    id: 'domesday', name: 'Domesday', icon: '📖', civs: BRITAIN,
    description: 'Tecnología única británica (Feudal): el censo de 1086 revela cada tierra. El oro se recoge un 10% más rápido.',
    cost: { food: 250, gold: 100 }, researchTime: 45, age: 1, researchedAt: 'townCenter',
    effects: [{ type: 'gatherRate', resource: 'gold', op: 'mul', value: 1.1 }],
  },
  {
    id: 'companyCharter', name: 'Carta de compañía', icon: '📜', civs: BRITAIN,
    description: 'Tecnología única británica (Imperial): la East India Company (1600). 400 de oro de los socios y oro +10% más rápido.',
    cost: { food: 400, gold: 100 }, researchTime: 45, age: 3, researchedAt: 'townCenter',
    effects: [{ type: 'grant', resources: { gold: 400 } }, { type: 'gatherRate', resource: 'gold', op: 'mul', value: 1.1 }],
  },
  {
    id: 'nationalDebt', name: 'Deuda nacional', icon: '💷', civs: BRITAIN,
    description: 'Tecnología única británica (Pólvora): el crédito del Estado fiscal-militar. Recibes 800 de oro ya, pero las unidades cuestan un 8% más de oro (los intereses).',
    cost: { food: 200 }, researchTime: 40, age: 4, researchedAt: 'bank',
    effects: [
      { type: 'grant', resources: { gold: 800 } },
      { type: 'cost', target: { kind: 'unit' }, resource: 'gold', op: 'mul', value: 1.08 },
    ],
  },
];
