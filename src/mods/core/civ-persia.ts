import type { BuildingDef, CivDef, TechDef, UnitDef } from '../../core/types';

/**
 * Persia / Irán (id `persia`), eras 0–5: Persia sasánida, Irán islámico, ilkanes y timúridas,
 * safávidas, afsháridas y qayar (docs/civilizaciones.md §5.4). Entra con la Industrial; su era 6
 * (Irán del siglo XX, petróleo) llegará con la Contemporánea. Valores indicativos.
 */
const PERSIA = ['persia'];

export const persiaCiv: CivDef = {
  id: 'persia', name: 'Persia', description: 'Encrucijada de rutas: caballería rápida, comercio y ciencia. De los sasánidas a los qayar (después, hacia el Irán del petróleo).',
  bonusText: ['Ejército móvil: caballería +5% de velocidad', 'Unidad única: Savaran (Edad Oscura)', 'Edificio único: Qanat'],
  bonuses: [{ type: 'stat', target: { classes: ['cavalry'], kind: 'unit' }, stat: 'speed', op: 'mul', value: 1.05 }],
  eras: {
    0: {
      name: 'Persia sasánida', description: 'Jinetes acorazados y regadío (224–651): el savaran y el qanat.',
      bonuses: [{ type: 'stat', target: { classes: ['cavalry'], kind: 'unit' }, stat: 'armorMelee', op: 'add', value: 1 }],
      bonusText: ['Caballería +1 de armadura cuerpo a cuerpo', 'Unidad única: Savaran', 'Edificio único: Qanat', 'Tecnología única: Regadío'],
    },
    1: {
      name: 'Irán islámico', description: 'Samánidas, ghaznavíes y selyúcidas (875–1194): burocracia persa y ejércitos de ghulams.',
      bonuses: [
        { type: 'cost', target: { classes: ['infantry'], kind: 'unit' }, resource: 'food', op: 'mul', value: 0.9 },
        { type: 'gatherRate', resource: 'gold', op: 'mul', value: 1.05 },
      ],
      bonusText: ['Iqta: infantería -10% de comida', 'Caravasares: oro +5% de recolección', 'Unidad única: Ghulam', 'Edificio único: Caravasar', 'Tecnología única: Iqta'],
    },
    2: {
      name: 'Ilkanato y timúridas', description: 'Ciencia, conquista y mecenazgo (Hulagu 1256, Maragha 1259, Tamerlán 1370–1405).',
      bonuses: [
        { type: 'stat', target: { classes: ['cavalry', 'archer'], kind: 'unit' }, stat: 'range', op: 'add', value: 1 },
        { type: 'cost', target: { kind: 'tech' }, resource: '*', op: 'mul', value: 0.95 },
      ],
      bonusText: ['Arqueros a caballo +1 de alcance', 'Tecnologías -5% de coste', 'Unidades únicas: Arquero a caballo timúrida y Elefante timúrida', 'Edificio único: Observatorio de Maragha', 'Tecnología única: Astronomía', 'Poder: Gran Saqueo'],
    },
    3: {
      name: 'Persia safávida', description: 'Estado persa-chií centralizado con mosquetes (Shah Abbas I, Isfahán 1598).',
      bonuses: [{ type: 'gatherRate', resource: 'gold', op: 'mul', value: 1.05 }],
      bonusText: ['Monopolio de la seda: oro +5% de recolección', 'Unidades únicas: Qizilbash y Tofangchi', 'Edificio único: Maidan', 'Tecnología única: Monopolio de la seda', 'Poder: Bazar'],
    },
    4: {
      name: 'Afsháridas y zand', description: 'Guerra móvil de caballería y camellos (Nader Shah, 1736–47; saqueo de Delhi, 1739).',
      bonuses: [{ type: 'stat', target: { classes: ['cavalry'], kind: 'unit' }, stat: 'speed', op: 'mul', value: 1.08 }],
      bonusText: ['Ejército veloz: caballería +8% de velocidad más', 'Unidad única: Zamburakchi', 'Edificio único: Ordu', 'Tecnología única: Guerra móvil'],
    },
    5: {
      name: 'Persia qayar', description: 'Entre dos imperios (guerras ruso-persas, Dar ul-Funun 1851, Brigada Cosaca 1879, revolución constitucional 1905–11, petróleo de Masjed Soleymán 1908).',
      bonuses: [
        { type: 'cost', target: { kind: 'tech' }, resource: '*', op: 'mul', value: 0.9 },
        { type: 'gatherRate', resource: 'gold', op: 'mul', value: 0.95 },
      ],
      bonusText: ['El Gran Juego: tecnologías -10% de coste (compra de saber a dos imperios)', 'Concesiones: oro -5% de recolección', 'Unidades únicas: Sarbaz y Cosaco persa', 'Edificio único: Dar ul-Funun', 'Tecnología única: Nizam-i Jadid'],
    },
  },
};

export const persiaUnits: UnitDef[] = [
  {
    id: 'savaran', name: 'Savaran', icon: '🏇', description: 'Unidad única persa (Edad Oscura): caballería pesada acorazada de los sasánidas.',
    classes: ['cavalry'], civs: PERSIA, cost: { food: 70, gold: 55 }, trainTime: 30, trainedAt: ['barracks'],
    hp: 90, attack: 8, attackType: 'melee', reloadTime: 1.9, armor: { melee: 2, pierce: 3 },
    speed: 1.4, los: 4, pop: 1, age: 0, radius: 0.35,
    sprite: 'cavalry', spriteParams: { weapon: 'spear', horse: '#e2dccb', barding: true, helmet: true, armor: true },
  },
  {
    id: 'ghulam', name: 'Ghulam', icon: '🗡️', description: 'Unidad única persa (Feudal): soldado esclavo profesional de los ejércitos selyúcidas.',
    classes: ['infantry'], civs: PERSIA, cost: { food: 55, gold: 40 }, trainTime: 22, trainedAt: ['barracks'],
    hp: 65, attack: 8, attackType: 'melee', reloadTime: 2, armor: { melee: 1, pierce: 2 },
    speed: 0.95, los: 4, pop: 1, age: 1,
    sprite: 'humanoid', spriteParams: { weapon: 'sword', helmet: true, shield: true, armor: true },
  },
  {
    id: 'timuridHorseArcher', name: 'Arquero a caballo timúrida', icon: '🏹', description: 'Unidad única persa (Castillos): el jinete arquero de Tamerlán, rápido y de largo alcance.',
    classes: ['cavalry', 'archer'], civs: PERSIA, cost: { wood: 40, gold: 60 }, trainTime: 28, trainedAt: ['stable'],
    hp: 55, attack: 6, attackType: 'pierce', range: 5, reloadTime: 2, armor: { melee: 0, pierce: 1 },
    speed: 1.5, los: 7, pop: 1, age: 2, radius: 0.35, projectile: 'arrow',
    sprite: 'cavalry', spriteParams: { weapon: 'bow', horse: '#8a6a3c', helmet: true },
  },
  {
    id: 'timuridElephant', name: 'Elefante timúrida', icon: '🐘', description: 'Unidad única persa (Castillos): elefante de guerra, lento y casi imparable (Delhi, 1398).',
    classes: ['cavalry'], civs: PERSIA, cost: { food: 110, gold: 90 }, trainTime: 40, trainedAt: ['castle'],
    hp: 230, attack: 14, attackType: 'melee', reloadTime: 2.2, armor: { melee: 2, pierce: 4 },
    bonus: [{ vs: 'building', amount: 6 }], speed: 0.85, los: 4, pop: 3, age: 2, radius: 0.55,
    sprite: 'cavalry', spriteParams: { weapon: 'sword', horse: '#7c7c82', barding: true, scale: 1.4 },
  },
  {
    id: 'qizilbash', name: 'Qizilbash', icon: '🏇', description: 'Unidad única persa (Imperial): caballería tribal del shah safávida.',
    classes: ['cavalry'], civs: PERSIA, cost: { food: 70, gold: 70 }, trainTime: 30, trainedAt: ['castle'],
    hp: 105, attack: 11, attackType: 'melee', reloadTime: 1.8, armor: { melee: 2, pierce: 3 },
    speed: 1.45, los: 5, pop: 1, age: 3, radius: 0.35,
    sprite: 'cavalry', spriteParams: { weapon: 'sword', horse: '#4a2f22', barding: true, helmet: true, armor: true },
  },
  {
    id: 'tofangchi', name: 'Tofangchi', icon: '🔫', description: 'Unidad única persa (Imperial): mosquetero del shah Abbas.',
    classes: ['infantry', 'firearm'], civs: PERSIA, cost: { food: 55, gold: 55 }, trainTime: 22, trainedAt: ['castle'],
    hp: 45, attack: 14, attackType: 'pierce', range: 6, reloadTime: 3, armor: { melee: 0, pierce: 1 },
    speed: 0.94, los: 7, pop: 1, age: 3, projectile: 'bullet',
    sprite: 'humanoid', spriteParams: { weapon: 'musket', hood: '#b04a3a' },
  },
  {
    id: 'zamburakchi', name: 'Zamburakchi', icon: '🐫', description: 'Unidad única persa (Pólvora): jinete de camello con un cañón giratorio (zamburak).',
    classes: ['cavalry', 'firearm'], civs: PERSIA, cost: { food: 70, gold: 70 }, trainTime: 28, trainedAt: ['stable', 'ordu'],
    hp: 80, attack: 12, attackType: 'pierce', range: 5, reloadTime: 2.6, armor: { melee: 1, pierce: 2 },
    speed: 1.5, los: 7, pop: 1, age: 4, radius: 0.35, projectile: 'bullet',
    sprite: 'cavalry', spriteParams: { weapon: 'sword', horse: '#b89a6a', helmet: true },
  },
  {
    id: 'sarbaz', name: 'Sarbaz', icon: '🔫', description: 'Unidad única persa (Industrial): infantería regular de línea de las reformas de Amir Kabir.',
    classes: ['infantry', 'firearm'], civs: PERSIA, cost: { food: 45, iron: 30 }, trainTime: 20, trainedAt: ['factory'],
    hp: 55, attack: 16, attackType: 'pierce', range: 6, reloadTime: 2.8, armor: { melee: 0, pierce: 2 },
    speed: 0.97, los: 7, pop: 1, age: 5, projectile: 'bullet',
    sprite: 'humanoid', spriteParams: { weapon: 'rifle', hat: 'shako', hatColor: '#3a5a4a' },
  },
  {
    id: 'persianCossack', name: 'Cosaco persa', icon: '🐎', description: 'Unidad única persa (Industrial): la Brigada Cosaca (1879), caballería instruida por oficiales rusos.',
    classes: ['cavalry'], civs: PERSIA, cost: { food: 65, gold: 45, iron: 15 }, trainTime: 24, trainedAt: ['stable'],
    hp: 90, attack: 11, attackType: 'melee', reloadTime: 1.7, armor: { melee: 1, pierce: 3 },
    speed: 1.75, los: 8, pop: 1, age: 5, radius: 0.35,
    sprite: 'cavalry', spriteParams: { weapon: 'sword', horse: '#4a3a2c', helmet: true, cape: true },
  },
];

export const persiaBuildings: BuildingDef[] = [
  {
    id: 'qanat', name: 'Qanat', icon: '💧', category: 'economy', civs: PERSIA,
    description: 'Edificio único persa (Edad Oscura): galería subterránea de agua. Depósito de alimento, resistente y barato.',
    classes: ['building'], cost: { wood: 80, stone: 40 }, buildTime: 30, size: 2,
    hp: 1400, armor: { melee: 1, pierce: 8 }, los: 4, age: 0, dropSite: ['food'],
    sprite: 'building', spriteParams: { style: 'mill', wall: '#cdbd98' },
  },
  {
    id: 'caravanserai', name: 'Caravasar', icon: '🏪', category: 'economy', civs: PERSIA,
    description: 'Edificio único persa (Feudal): posada de ruta selyúcida. Depósito de oro, piedra y madera; aloja población.',
    classes: ['building'], cost: { wood: 120, stone: 40 }, buildTime: 45, size: 3,
    hp: 1500, armor: { melee: 0, pierce: 8 }, los: 5, age: 1, popProvided: 5, dropSite: ['gold', 'stone', 'wood'],
    sprite: 'building', spriteParams: { style: 'hall', height: 22, roofHeight: 12, wall: '#d8c79a', roof: '#8a5a3a' },
  },
  {
    id: 'maraghaObservatory', name: 'Observatorio de Maragha', icon: '🔭', category: 'economy', civs: PERSIA,
    description: 'Edificio único persa (Castillos): el observatorio ilkánida de 1259. Gran visión; investiga Astronomía.',
    classes: ['building'], cost: { wood: 100, stone: 200 }, buildTime: 60, size: 2,
    hp: 1100, armor: { melee: 1, pierce: 8 }, los: 14, age: 2,
    sprite: 'building', spriteParams: { style: 'tower', inset: 0.1, wall: '#cfc8b6', roof: '#3f5f8a' },
  },
  {
    id: 'maidan', name: 'Maidan', icon: '🕌', category: 'economy', civs: PERSIA,
    description: 'Edificio único persa (Imperial): la plaza real de Isfahán. Depósito de oro, aloja población; investiga el Monopolio de la seda.',
    classes: ['building'], cost: { wood: 150, stone: 250 }, buildTime: 70, size: 3,
    hp: 2000, armor: { melee: 1, pierce: 9 }, los: 6, age: 3, popProvided: 10, dropSite: ['gold'],
    sprite: 'building', spriteParams: { style: 'hall', height: 26, roofHeight: 18, wall: '#e6dcc0', roof: '#2f6f8a' },
  },
  {
    id: 'ordu', name: 'Ordu', icon: '⛺', category: 'military', civs: PERSIA,
    description: 'Edificio único persa (Pólvora): campamento nómada. Entrena zamburakchis; aloja población.',
    classes: ['building'], cost: { wood: 200, stone: 100 }, buildTime: 60, size: 3,
    hp: 1600, armor: { melee: 0, pierce: 7 }, los: 6, age: 4, popProvided: 10, requiresBuildings: ['stable'],
    sprite: 'building', spriteParams: { style: 'hall', height: 22, roofHeight: 22, stable: true, wall: '#cdbd98', roof: '#8a3a2e' },
  },
  {
    id: 'darulFunun', name: 'Dar ul-Funun', icon: '🎓', category: 'economy', civs: PERSIA,
    description: 'Edificio único persa (Industrial): la escuela politécnica de Amir Kabir (1851). Investiga Nizam-i Jadid.',
    classes: ['building'], cost: { wood: 150, stone: 200, gold: 100 }, buildTime: 70, size: 3,
    hp: 1800, armor: { melee: 1, pierce: 8 }, los: 6, age: 5,
    sprite: 'building', spriteParams: { style: 'hall', height: 26, roofHeight: 18, wall: '#e8dfc6', roof: '#2f6f8a' },
  },
];

export const persiaTechs: TechDef[] = [
  {
    id: 'irrigation', name: 'Regadío', icon: '💧', civs: PERSIA,
    description: 'Tecnología única persa (Edad Oscura): los qanats llevan el agua. Granjeros +10% más rápidos.',
    cost: { food: 150, gold: 50 }, researchTime: 40, age: 0, researchedAt: 'townCenter',
    effects: [{ type: 'gatherRate', resource: 'food', op: 'mul', value: 1.1 }],
  },
  {
    id: 'iqta', name: 'Iqta', icon: '📜', civs: PERSIA,
    description: 'Tecnología única persa (Feudal): tierra a cambio de servicio. Infantería y caballería cuestan un 10% menos de oro.',
    cost: { food: 200, gold: 100 }, researchTime: 45, age: 1, researchedAt: 'townCenter',
    effects: [{ type: 'cost', target: { classes: ['infantry', 'cavalry'], kind: 'unit' }, resource: 'gold', op: 'mul', value: 0.9 }],
  },
  {
    id: 'astronomy', name: 'Astronomía', icon: '🌙', civs: PERSIA,
    description: 'Tecnología única persa (Castillos): las tablas ilkánidas de Maragha. Todas las unidades +1 de visión; tecnologías -5% de coste.',
    cost: { food: 250, gold: 200 }, researchTime: 50, age: 2, researchedAt: 'maraghaObservatory',
    effects: [
      { type: 'stat', target: { kind: 'unit' }, stat: 'los', op: 'add', value: 1 },
      { type: 'cost', target: { kind: 'tech' }, resource: '*', op: 'mul', value: 0.95 },
    ],
  },
  {
    id: 'silkMonopoly', name: 'Monopolio de la seda', icon: '🧵', civs: PERSIA,
    description: 'Tecnología única persa (Imperial): Shah Abbas compra toda la seda del reino. El oro se recoge un 10% más rápido.',
    cost: { food: 300, gold: 250 }, researchTime: 55, age: 3, researchedAt: 'maidan',
    effects: [{ type: 'gatherRate', resource: 'gold', op: 'mul', value: 1.1 }],
  },
  {
    id: 'mobileWarfare', name: 'Guerra móvil', icon: '🐫', civs: PERSIA,
    description: 'Tecnología única persa (Pólvora): la campaña relámpago de Nader Shah. Caballería +10% de velocidad y +10% de PV.',
    cost: { food: 400, gold: 250 }, researchTime: 60, age: 4, researchedAt: 'ordu',
    effects: [
      { type: 'stat', target: { classes: ['cavalry'], kind: 'unit' }, stat: 'speed', op: 'mul', value: 1.1 },
      { type: 'stat', target: { classes: ['cavalry'], kind: 'unit' }, stat: 'hp', op: 'mul', value: 1.1 },
    ],
  },
  {
    id: 'nizamJadid', name: 'Nizam-i Jadid', icon: '🎖️', civs: PERSIA,
    description: 'Tecnología única persa (Industrial): el «nuevo orden» de las reformas. Infantería con arma de fuego: +1/+1 de armadura y se entrena un 15% más rápido.',
    cost: { food: 300, iron: 100, gold: 150 }, researchTime: 60, age: 5, researchedAt: 'darulFunun',
    effects: [
      { type: 'stat', target: { classes: ['infantry', 'firearm'], kind: 'unit' }, stat: 'armorMelee', op: 'add', value: 1 },
      { type: 'stat', target: { classes: ['infantry', 'firearm'], kind: 'unit' }, stat: 'armorPierce', op: 'add', value: 1 },
      { type: 'stat', target: { classes: ['infantry', 'firearm'], kind: 'unit' }, stat: 'trainTime', op: 'mul', value: 0.85 },
    ],
  },
];
