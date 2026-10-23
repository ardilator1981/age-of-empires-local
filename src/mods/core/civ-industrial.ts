import type { BuildingDef, CivEraDef, TechDef, UnitDef } from '../../core/types';

/**
 * Lo único de la era 5 (Industrial) de las civilizaciones que ya venían de antes: Rusia, China,
 * Francia y Gran Bretaña (docs/civilizaciones.md §5). Valores indicativos. Persia y Etiopía, que
 * entran con esta era, tienen sus archivos aparte.
 */
const ALL = ['food', 'wood', 'gold', 'stone', 'iron', 'coal'];

export const industrialCivUnits: UnitDef[] = [
  // ---- Rusia (rus)
  {
    id: 'guardRifleman', name: 'Fusilero de la guardia', icon: '🔫', description: 'Unidad única rusa (Industrial): infantería de línea de la Guardia imperial, de tiro firme.',
    classes: ['infantry', 'firearm'], civs: ['rus'], cost: { food: 60, iron: 45 }, trainTime: 22, trainedAt: ['factory'],
    hp: 72, attack: 19, attackType: 'pierce', range: 7, reloadTime: 2.6, armor: { melee: 1, pierce: 3 },
    speed: 0.95, los: 8, pop: 1, age: 5, projectile: 'bullet',
    sprite: 'humanoid', spriteParams: { weapon: 'rifle', hat: 'shako', hatColor: '#2f5a3f', cape: true },
  },
  {
    id: 'donCossack', name: 'Cosaco del Don', icon: '🐎', description: 'Unidad única rusa (Industrial): caballería cosaca regular, rápida y capaz de cazar.',
    classes: ['cavalry'], civs: ['rus'], cost: { food: 65, gold: 40, iron: 20 }, trainTime: 24, trainedAt: ['stable'],
    hp: 95, attack: 12, attackType: 'melee', reloadTime: 1.7, armor: { melee: 1, pierce: 3 },
    speed: 1.65, los: 8, pop: 1, age: 5, radius: 0.35, hunting: true, carryCapacity: 10,
    sprite: 'cavalry', spriteParams: { weapon: 'sword', horse: '#5a4230', helmet: true, cape: true },
  },
  // ---- China (china)
  {
    id: 'regionalRifleman', name: 'Fusilero de ejército regional', icon: '🔫', description: 'Unidad única china (Industrial): los ejércitos de Xiang y Huai. Barato y numeroso.',
    classes: ['infantry', 'firearm'], civs: ['china'], cost: { food: 40, iron: 25 }, trainTime: 18, trainedAt: ['factory', 'jiangnanArsenal'],
    hp: 55, attack: 16, attackType: 'pierce', range: 7, reloadTime: 2.7, armor: { melee: 0, pierce: 2 },
    speed: 0.97, los: 7, pop: 1, age: 5, projectile: 'bullet',
    sprite: 'humanoid', spriteParams: { weapon: 'rifle', hood: '#3a5a8a' },
  },
  // ---- Francia (france)
  {
    id: 'oldGuard', name: 'Guardia Vieja', icon: '🔫', description: 'Unidad única francesa (Industrial): la élite de la Grande Armée. Cara, resistente y certera.',
    classes: ['infantry', 'firearm'], civs: ['france'], cost: { food: 70, iron: 50, gold: 40 }, trainTime: 26, trainedAt: ['factory'],
    hp: 95, attack: 21, attackType: 'pierce', range: 7, reloadTime: 2.6, armor: { melee: 2, pierce: 3 },
    speed: 0.93, los: 8, pop: 1, age: 5, projectile: 'bullet',
    sprite: 'humanoid', spriteParams: { weapon: 'rifle', hat: 'mitre', hatColor: '#1c1c22', cape: true },
  },
  {
    id: 'grandeBatterie', name: 'Gran Batería', icon: '💣', description: 'Unidad única francesa (Industrial): la artillería de campaña napoleónica, concentrada y barata.',
    classes: ['siege', 'artillery', 'antiUnit'], civs: ['france'], cost: { wood: 90, iron: 70, coal: 30, gold: 30 }, trainTime: 36, trainedAt: ['factory'],
    hp: 105, attack: 42, attackType: 'pierce', range: 11, reloadTime: 4.6, armor: { melee: 1, pierce: 5 },
    bonus: [{ vs: 'building', amount: 30 }], speed: 0.58, los: 5, pop: 2, age: 5, radius: 0.4, projectile: 'cannonball', splash: { radius: 1, falloff: 0.5, scatter: 0.6 },
    sprite: 'cannon', spriteParams: { barrel: '#6a5a3a', big: true },
  },
  // ---- Gran Bretaña (britain)
  {
    id: 'enfieldRifleman', name: 'Fusilero Enfield', icon: '🔫', description: 'Unidad única británica (Industrial): fusil de percusión estriado, el de más alcance de su era.',
    classes: ['infantry', 'firearm'], civs: ['britain'], cost: { food: 55, iron: 40, gold: 15 }, trainTime: 22, trainedAt: ['factory'],
    hp: 62, attack: 19, attackType: 'pierce', range: 8, reloadTime: 2.8, armor: { melee: 0, pierce: 2 },
    speed: 0.95, los: 8, pop: 1, age: 5, projectile: 'bullet',
    sprite: 'humanoid', spriteParams: { weapon: 'rifle', hat: 'shako', hatColor: '#7a1f1f' },
  },
  {
    id: 'sharpshooter', name: 'Tirador', icon: '🎯', description: 'Unidad única británica (Industrial): francotirador de fusil; poco aguante, muchísimo daño y alcance.',
    classes: ['infantry', 'firearm'], civs: ['britain'], cost: { food: 60, iron: 55 }, trainTime: 26, trainedAt: ['factory'],
    hp: 45, attack: 27, attackType: 'pierce', range: 9, reloadTime: 4, armor: { melee: 0, pierce: 1 },
    speed: 0.95, los: 9, pop: 1, age: 5, projectile: 'bullet',
    sprite: 'humanoid', spriteParams: { weapon: 'rifle', hood: '#2f4a2e' },
  },
];

export const industrialCivBuildings: BuildingDef[] = [
  // ---- Rusia (rus): Maravilla
  {
    id: 'transSiberian', name: 'Transiberiano', icon: '🚂', category: 'economy', civs: ['rus'],
    description: 'Maravilla rusa (Industrial): el ferrocarril más largo del mundo. Acepta todos los recursos y aloja población. Solo uno.',
    classes: ['building'], cost: { wood: 500, stone: 500, gold: 400, iron: 300 }, buildTime: 240, size: 4,
    hp: 4500, armor: { melee: 3, pierce: 10 }, los: 8, age: 5, popProvided: 15, dropSite: ALL, maxAlive: 1, requiresBuildings: ['railwayStation'],
    sprite: 'building', spriteParams: { style: 'hall', height: 30, roofHeight: 20, wall: '#d8d0bc', roof: '#2f6f5a' },
  },
  // ---- China (china)
  {
    id: 'jiangnanArsenal', name: 'Arsenal de Jiangnan', icon: '🏭', category: 'military', civs: ['china'],
    description: 'Edificio único chino (Industrial): el arsenal del Autofortalecimiento (1865). Fabrica fusileros regionales y cañones, y mejora las armas.',
    classes: ['building'], cost: { wood: 200, stone: 150 }, buildTime: 60, size: 3,
    hp: 2000, armor: { melee: 1, pierce: 9 }, los: 6, age: 5, requiresBuildings: ['gunpowderWorks'],
    sprite: 'building', spriteParams: { style: 'smithy', wall: '#b9b2a2', roof: '#3a5a8a' },
  },
  // ---- Francia (france)
  {
    id: 'polytechnique', name: 'École Polytechnique', icon: '📐', category: 'economy', civs: ['france'],
    description: 'Edificio único francés (Industrial): la escuela de ingenieros y oficiales (1794). Investiga el sistema de cuerpos.',
    classes: ['building'], cost: { wood: 150, stone: 250, gold: 100 }, buildTime: 70, size: 3,
    hp: 1800, armor: { melee: 1, pierce: 8 }, los: 6, age: 5,
    sprite: 'building', spriteParams: { style: 'hall', height: 28, roofHeight: 18, wall: '#e8e0cc', roof: '#3a5a8a' },
  },
  // ---- Gran Bretaña (britain): Maravilla
  {
    id: 'transcontinental', name: 'Ferrocarril transcontinental', icon: '🚂', category: 'economy', civs: ['britain'],
    description: 'Maravilla británica (Industrial): el tren que une dos costas (1869). Acepta todos los recursos; los aldeanos van más rápido. Solo uno.',
    classes: ['building'], cost: { wood: 500, stone: 400, gold: 400, iron: 300 }, buildTime: 240, size: 4,
    hp: 4200, armor: { melee: 3, pierce: 10 }, los: 8, age: 5, popProvided: 10, dropSite: ALL, maxAlive: 1, requiresBuildings: ['railwayStation'],
    sprite: 'building', spriteParams: { style: 'hall', height: 28, roofHeight: 18, wall: '#c9b99a', roof: '#7a1f1f' },
  },
];

export const industrialCivTechs: TechDef[] = [
  // ---- China
  {
    id: 'selfStrengthening', name: 'Autofortalecimiento', icon: '🏭', civs: ['china'],
    description: 'Tecnología única china (Industrial): arsenales y astilleros modernos. Armas de fuego +1 de ataque; fusileros y cañones se entrenan un 15% más rápido.',
    cost: { iron: 150, gold: 150 }, researchTime: 60, age: 5, researchedAt: 'jiangnanArsenal',
    effects: [
      { type: 'stat', target: { classes: ['firearm'], kind: 'unit' }, stat: 'attack', op: 'add', value: 1 },
      { type: 'stat', target: { ids: ['rifleman', 'regionalRifleman', 'fieldGun'] }, stat: 'trainTime', op: 'mul', value: 0.85 },
    ],
  },
  // ---- Francia
  {
    id: 'corpsSystem', name: 'Sistema de cuerpos', icon: '🎖️', civs: ['france'],
    description: 'Tecnología única francesa (Industrial): la Grande Armée en cuerpos autónomos. Infantería con arma de fuego: +1 de ataque y +10% de PV.',
    cost: { food: 300, iron: 100, gold: 200 }, researchTime: 60, age: 5, researchedAt: 'polytechnique',
    effects: [
      { type: 'stat', target: { classes: ['infantry', 'firearm'], kind: 'unit' }, stat: 'attack', op: 'add', value: 1 },
      { type: 'stat', target: { classes: ['infantry', 'firearm'], kind: 'unit' }, stat: 'hp', op: 'mul', value: 1.1 },
    ],
  },
  // ---- Gran Bretaña
  {
    id: 'interchangeableParts', name: 'Intercambiabilidad de piezas', icon: '🔩', civs: ['britain'],
    description: 'Tecnología única británica (Industrial): fusiles hechos en serie. Hierro y carbón +10% de recolección; armas de fuego recargan un 5% más rápido.',
    cost: { iron: 150, coal: 100, gold: 100 }, researchTime: 55, age: 5, researchedAt: 'factory',
    effects: [
      { type: 'gatherRate', resource: 'iron', op: 'mul', value: 1.1 },
      { type: 'gatherRate', resource: 'coal', op: 'mul', value: 1.1 },
      { type: 'stat', target: { classes: ['firearm'], kind: 'unit' }, stat: 'reloadTime', op: 'mul', value: 0.95 },
    ],
  },
];

/** La capa de la era 5 de Rusia, China, Francia y Gran Bretaña (`civs.ts` la suma a sus capas anteriores). */
export const industrialLayers: Record<string, CivEraDef> = {
  rus: {
    name: 'Imperio ruso industrializándose',
    description: 'Países enormes, ferrocarriles largos (1812; emancipación de los siervos, 1861; Transiberiano, 1891–1916). La tierra quemada de Barclay y Kutúzov sigue siendo su poder.',
    bonuses: [
      { type: 'cost', target: { ids: ['railwayStation'] }, resource: '*', op: 'mul', value: 0.7 },
      { type: 'cost', target: { classes: ['infantry', 'firearm'], kind: 'unit' }, resource: 'food', op: 'mul', value: 0.9 },
    ],
    bonusText: ['Ferrocarriles largos: estación de ferrocarril -30% de coste', 'Levas masivas: infantería con arma de fuego -10% de comida', 'Unidades únicas: Fusilero de la guardia y Cosaco del Don', 'Maravilla: Transiberiano (solo uno)', 'Poder: Tierra quemada'],
  },
  china: {
    name: 'Qing tardío y primera república',
    description: 'Autofortalecimiento bajo presión (1839–1912): ejércitos regionales de Xiang y Huai, arsenales de Jiangnan (1865). Los tratados desiguales de las guerras del opio recortan los ingresos.',
    bonuses: [
      { type: 'cost', target: { classes: ['infantry', 'firearm'], kind: 'unit' }, resource: 'food', op: 'mul', value: 0.85 },
      { type: 'gatherRate', resource: 'gold', op: 'mul', value: 0.95 },
    ],
    bonusText: ['Ejércitos regionales: infantería con arma de fuego -15% de comida', 'Tratados desiguales: oro -5% de recolección', 'Unidad única: Fusilero de ejército regional', 'Edificio único: Arsenal de Jiangnan', 'Tecnología única: Autofortalecimiento'],
  },
  france: {
    name: 'Revolución, Napoleón y la República',
    description: 'La nación en armas (levée en masse, 1793; Grande Armée y sistema de cuerpos; École Polytechnique, 1794; Legión Extranjera, 1831).',
    bonuses: [
      { type: 'stat', target: { classes: ['infantry', 'firearm'], kind: 'unit' }, stat: 'trainTime', op: 'mul', value: 0.85 },
      { type: 'cost', target: { classes: ['artillery'], kind: 'unit' }, resource: '*', op: 'mul', value: 0.9 },
    ],
    bonusText: ['La nación en armas: infantería con arma de fuego se entrena un 15% más rápido', 'Artillería -10% de coste', 'Unidades únicas: Guardia Vieja y Gran Batería', 'Edificio único: École Polytechnique', 'Tecnología única: Sistema de cuerpos', 'Poderes: Leva en masa y Legión Extranjera'],
  },
  britain: {
    name: 'Reino Unido y Estados Unidos emergente',
    description: 'El taller del mundo (carbón, hierro, ferrocarril; Pax Britannica) y la guerra de Secesión (1861–65), la primera guerra industrial.',
    bonuses: [
      { type: 'gatherRate', resource: 'iron', op: 'mul', value: 1.15 },
      { type: 'gatherRate', resource: 'coal', op: 'mul', value: 1.15 },
      { type: 'cost', target: { ids: ['railwayStation'] }, resource: '*', op: 'mul', value: 0.75 },
    ],
    bonusText: ['Carbón y hierro: +15% de recolección', 'Ferrocarril: estación -25% de coste', 'Unidades únicas: Fusilero Enfield y Tirador', 'Maravilla: Ferrocarril transcontinental (solo uno)', 'Tecnología única: Intercambiabilidad de piezas', 'Poder: Crédito'],
  },
};
