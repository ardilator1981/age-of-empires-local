import type { BuildingDef, TechDef, UnitDef } from '../../core/types';

/**
 * China (id `china`), eras 0–4: Sui-Tang, Song del Norte, Song del Sur y Yuan, Ming y Qing.
 * Valores indicativos (docs/civilizaciones.md §5.2). Un único por era: unidad, edificio y tecnología.
 */
const ALL = ['food', 'wood', 'gold', 'stone', 'iron', 'coal'];
const CHINA = ['china'];

export const chinaUnits: UnitDef[] = [
  {
    id: 'fubing', name: 'Fubing', icon: '🌾', description: 'Unidad única china (Edad Oscura): milicia campesina del sistema tang. Barata.',
    classes: ['infantry', 'spear'], civs: CHINA, cost: { food: 40, gold: 10 }, trainTime: 19, trainedAt: ['barracks'],
    hp: 45, attack: 5, attackType: 'melee', reloadTime: 2, armor: { melee: 0, pierce: 1 },
    bonus: [{ vs: 'cavalry', amount: 6 }], speed: 0.94, los: 4, pop: 1, age: 0,
    sprite: 'humanoid', spriteParams: { weapon: 'spear', hood: '#8a7a3a' },
  },
  {
    id: 'fireLance', name: 'Lancero de fuego', icon: '🔥', description: 'Unidad única china (Feudal): tubo de pólvora en una lanza (huoqiang). Muy corto alcance.',
    classes: ['infantry'], civs: CHINA, cost: { food: 50, gold: 30 }, trainTime: 22, trainedAt: ['barracks'],
    hp: 48, attack: 9, attackType: 'pierce', range: 2, reloadTime: 2.5, armor: { melee: 0, pierce: 1 },
    speed: 0.95, los: 5, pop: 1, age: 1, projectile: 'bullet',
    sprite: 'humanoid', spriteParams: { weapon: 'spear', helmet: true, cape: true },
  },
  {
    id: 'repeatingCrossbowman', name: 'Ballestero de repetición', icon: '🏹', description: 'Unidad única china (Castillos): descarga una lluvia de saetas de poco daño.',
    classes: ['archer'], civs: CHINA, cost: { wood: 35, gold: 45 }, trainTime: 20, trainedAt: ['castle'],
    hp: 36, attack: 3, attackType: 'pierce', range: 5, reloadTime: 0.9, armor: { melee: 0, pierce: 0 },
    speed: 0.96, los: 7, pop: 1, age: 2, projectile: 'arrow',
    sprite: 'humanoid', spriteParams: { weapon: 'bow', hood: '#9a3a2a' },
  },
  {
    id: 'counterweightTrebuchet', name: 'Trabuquete de contrapeso', icon: '🪨', description: 'Unidad única china (Castillos): asedio de gran alcance; llegó con los ingenieros del mundo musulmán.',
    classes: ['siege'], civs: CHINA, cost: { wood: 200, gold: 150 }, trainTime: 45, trainedAt: ['siegeWorkshop'],
    hp: 150, attack: 40, attackType: 'pierce', range: 10, reloadTime: 6, armor: { melee: 1, pierce: 2 },
    bonus: [{ vs: 'building', amount: 35 }], speed: 0.45, los: 5, pop: 2, age: 2, radius: 0.45, projectile: 'rock',
    sprite: 'ram',
  },
  {
    id: 'divineArquebusier', name: 'Arcabucero de las divisiones divinas', icon: '🔫', description: 'Unidad única china (Imperial): el Shenjiying de los Ming. Arcabuz de gran daño.',
    classes: ['infantry', 'firearm'], civs: CHINA, cost: { food: 55, gold: 55 }, trainTime: 22, trainedAt: ['castle'],
    hp: 45, attack: 13, attackType: 'pierce', range: 6, reloadTime: 3, armor: { melee: 0, pierce: 1 },
    speed: 0.94, los: 7, pop: 1, age: 3, projectile: 'bullet',
    sprite: 'humanoid', spriteParams: { weapon: 'musket', helmet: true, cape: true },
  },
  {
    id: 'eightBannersRider', name: 'Jinete de las Ocho Banderas', icon: '🏇', description: 'Unidad única china (Pólvora): caballería pesada manchú-china de los Qing.',
    classes: ['cavalry'], civs: CHINA, cost: { food: 70, gold: 70 }, trainTime: 30, trainedAt: ['castle'],
    hp: 120, attack: 12, attackType: 'melee', reloadTime: 1.8, armor: { melee: 2, pierce: 3 },
    speed: 1.4, los: 5, pop: 1, age: 4, radius: 0.35,
    sprite: 'cavalry', spriteParams: { weapon: 'sword', horse: '#3a2c22', barding: true, helmet: true, armor: true },
  },
];

export const chinaBuildings: BuildingDef[] = [
  {
    id: 'stateGranary', name: 'Granero estatal', icon: '🌾', category: 'economy', civs: CHINA,
    description: 'Edificio único chino (Edad Oscura): graneros «de nivelación». Depósito de alimento que aloja población.',
    classes: ['building'], cost: { wood: 120 }, buildTime: 35, size: 2,
    hp: 1000, armor: { melee: 0, pierce: 7 }, los: 4, age: 0, popProvided: 5, dropSite: ['food'],
    sprite: 'building', spriteParams: { style: 'mill' },
  },
  {
    id: 'mint', name: 'Casa de moneda', icon: '🪙', category: 'economy', civs: CHINA,
    description: 'Edificio único chino (Feudal): imprime el billete jiaozi. Depósito de oro y piedra.',
    classes: ['building'], cost: { wood: 150, stone: 50 }, buildTime: 40, size: 2,
    hp: 1100, armor: { melee: 0, pierce: 7 }, los: 4, age: 1, dropSite: ['gold', 'stone'],
    sprite: 'building', spriteParams: { style: 'shed', pile: 'stone', height: 20 },
  },
  {
    id: 'grandCanal', name: 'Gran Canal', icon: '🛶', category: 'economy', civs: CHINA,
    description: 'Edificio único chino (Castillos): puerto fluvial del canal. Depósito de todos los recursos.',
    classes: ['building'], cost: { wood: 250, stone: 100 }, buildTime: 60, size: 3,
    hp: 1400, armor: { melee: 0, pierce: 8 }, los: 5, age: 2, dropSite: ALL,
    sprite: 'building', spriteParams: { style: 'hall', height: 20, roofHeight: 16, roof: '#3f6f8a' },
  },
  {
    id: 'forbiddenCity', name: 'Ciudad Prohibida', icon: '🏮', category: 'economy', civs: CHINA,
    description: 'Edificio único chino (Imperial): capital de los Ming. Centro urbano fortificado que entrena aldeanos.',
    classes: ['building', 'townCenter'], cost: { wood: 300, stone: 500 }, buildTime: 170, size: 4,
    hp: 4200, armor: { melee: 5, pierce: 9 }, los: 10, age: 3, popProvided: 20, dropSite: ALL, requiresBuildings: ['townCenter'],
    attack: 8, attackType: 'pierce', range: 7, reloadTime: 2, projectile: 'arrow',
    sprite: 'building', spriteParams: { style: 'castle', inset: 0.05, wall: '#b8372c', roof: '#d9a93a' },
  },
  {
    id: 'cantonHong', name: 'Hong de Cantón', icon: '🏮', category: 'economy', civs: CHINA, maxAlive: 1,
    description: 'Edificio único chino (Pólvora): el gremio mercantil autorizado del sistema de Cantón. Solo se puede tener uno.',
    classes: ['building'], cost: { wood: 100, gold: 300 }, buildTime: 70, size: 3,
    hp: 1500, armor: { melee: 0, pierce: 8 }, los: 5, age: 4, dropSite: ['gold'],
    sprite: 'building', spriteParams: { style: 'hall', height: 22, roofHeight: 18, wall: '#e8dcc0', roof: '#b8372c' },
  },
];

export const chinaTechs: TechDef[] = [
  {
    id: 'imperialExams', name: 'Exámenes imperiales', icon: '📜', civs: CHINA,
    description: 'Tecnología única china (Edad Oscura): el keju forma una administración preparada. Las tecnologías cuestan un 10% menos.',
    cost: { food: 150, gold: 50 }, researchTime: 50, age: 0, researchedAt: 'townCenter',
    effects: [{ type: 'cost', target: { kind: 'tech' }, resource: '*', op: 'mul', value: 0.9 }],
  },
  {
    id: 'champaRice', name: 'Arroz de Champa', icon: '🌾', civs: CHINA,
    description: 'Tecnología única china (Feudal): el arroz de maduración rápida (1012). Granjeros +15% más rápidos.',
    cost: { food: 150, wood: 100 }, researchTime: 40, age: 1, researchedAt: 'mill',
    effects: [{ type: 'gatherRate', resource: 'food', op: 'mul', value: 1.15 }],
  },
  {
    id: 'jiaozi', name: 'Billete jiaozi', icon: '💴', civs: CHINA,
    description: 'Tecnología única china (Feudal): el primer papel moneda convierte el excedente de comida en 300 de oro.',
    cost: { food: 400, wood: 100 }, researchTime: 45, age: 1, researchedAt: 'mint',
    effects: [{ type: 'grant', resources: { gold: 300 } }],
  },
  {
    id: 'thunderBomb', name: 'Bomba trueno', icon: '💣', civs: CHINA,
    description: 'Tecnología única china (Castillos): zhentianlei, 1231. Asedio: +3 de ataque.',
    cost: { food: 400, gold: 300 }, researchTime: 55, age: 2, researchedAt: 'castle',
    effects: [{ type: 'stat', target: { classes: ['siege'] }, stat: 'attack', op: 'add', value: 3 }],
  },
  {
    id: 'mandarinDuck', name: 'Pato mandarín', icon: '🦆', civs: CHINA,
    description: 'Tecnología única china (Imperial): la formación de Qi Jiguang mezcla lanza y arcabuz. Lanceros y armas de fuego: +1/+1 de armadura.',
    cost: { food: 500, gold: 400 }, researchTime: 60, age: 3, researchedAt: 'castle',
    effects: [
      { type: 'stat', target: { classes: ['spear', 'firearm'], kind: 'unit' }, stat: 'armorMelee', op: 'add', value: 1 },
      { type: 'stat', target: { classes: ['spear', 'firearm'], kind: 'unit' }, stat: 'armorPierce', op: 'add', value: 1 },
    ],
  },
  {
    id: 'cantonSystem', name: 'Cantón', icon: '🚢', civs: CHINA,
    description: 'Tecnología única china (Pólvora): el comercio exterior pasa por un solo puerto. El oro se recoge un 25% más rápido.',
    cost: { wood: 300, gold: 300 }, researchTime: 60, age: 4, researchedAt: 'cantonHong',
    effects: [{ type: 'gatherRate', resource: 'gold', op: 'mul', value: 1.25 }],
  },
];
