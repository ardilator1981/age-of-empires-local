import type { BuildingDef, CombatRule, TechDef, UnitDef } from '../../core/types';

/**
 * Era 5 · Industrial (c. 1800–1914): fusil, artillería de campaña, ferrocarril, carbón y hierro, y
 * la primera aviación. Árbol común a todas las civilizaciones (§2b de docs/civilizaciones.md); lo
 * único de cada una está en `civ-*.ts`. Valores indicativos.
 *
 * El mar sigue aplazado (docs/decisiones.md): no hay acorazados ni astilleros. El hierro y el
 * carbón son recursos nuevos (`world.ts`), que se guardan en un campamento minero, en la estación
 * de ferrocarril o en el centro urbano. La refinería (petróleo) es de la era 6.
 */

const ALL = ['food', 'wood', 'gold', 'stone', 'iron', 'coal'];
const FIREARM = ['firearm'];

export const industrialBuildings: BuildingDef[] = [
  {
    id: 'factory', name: 'Fábrica', icon: '🏭', category: 'military',
    description: 'Fabrica fusileros y ametralladoras, mejora el cañón a cañón de campaña y el asedio a obús, y mejora el armamento.',
    classes: ['building'], cost: { wood: 200, stone: 200 }, buildTime: 70, size: 3,
    hp: 2200, armor: { melee: 1, pierce: 9 }, los: 5, age: 5, requiresBuildings: ['gunpowderWorks'],
    sprite: 'building', spriteParams: { style: 'smithy', wall: '#8a5a48', roof: '#3a3f48' },
  },
  {
    id: 'railwayStation', name: 'Estación de ferrocarril', icon: '🚉', category: 'economy',
    description: 'Depósito de todos los recursos. Investiga el ferrocarril.',
    classes: ['building'], cost: { wood: 150, stone: 100, gold: 50 }, buildTime: 55, size: 3,
    hp: 1800, armor: { melee: 0, pierce: 8 }, los: 6, age: 5, popProvided: 5, dropSite: ALL,
    sprite: 'building', spriteParams: { style: 'hall', height: 24, roofHeight: 14, wall: '#c9b99a', roof: '#4a5560' },
  },
  {
    id: 'laboratory', name: 'Laboratorio', icon: '🧪', category: 'economy',
    description: 'Investiga la máquina de vapor, la electricidad, el motor de combustión y la aviación.',
    classes: ['building'], cost: { wood: 150, stone: 150, gold: 100 }, buildTime: 60, size: 3,
    hp: 1400, armor: { melee: 0, pierce: 8 }, los: 6, age: 5,
    sprite: 'building', spriteParams: { style: 'hall', height: 26, roofHeight: 20, wall: '#dcd5c0', roof: '#2f6f8a' },
  },
  {
    id: 'airfield', name: 'Aeródromo', icon: '🛩️', category: 'military',
    description: 'Fabrica aviones. Hace falta investigar la aviación.',
    classes: ['building'], cost: { wood: 200, stone: 100, gold: 100 }, buildTime: 60, size: 3,
    hp: 1600, armor: { melee: 0, pierce: 7 }, los: 6, age: 5, requiresBuildings: ['laboratory'],
    sprite: 'building', spriteParams: { style: 'shed', pile: 'wood', height: 24, wall: '#c8c0a8', roof: '#8a8f98' },
  },
];

export const industrialUnits: UnitDef[] = [
  {
    id: 'rifleman', name: 'Fusilero', icon: '🔫', description: 'Infantería con fusil estriado: más alcance y puntería que el mosquetero.',
    classes: ['infantry', 'firearm'], cost: { food: 55, iron: 40 }, trainTime: 22, trainedAt: ['factory'],
    hp: 60, attack: 18, attackType: 'pierce', range: 7, reloadTime: 2.6, armor: { melee: 0, pierce: 2 },
    speed: 0.95, los: 8, pop: 1, age: 5, projectile: 'bullet',
    sprite: 'humanoid', spriteParams: { weapon: 'rifle', hat: 'shako' },
  },
  {
    id: 'fieldGun', name: 'Cañón de campaña', icon: '💣', description: 'Artillería rayada de retrocarga: destruye edificios y tropas a gran distancia.',
    classes: ['siege', 'artillery', 'antiUnit'], cost: { wood: 100, iron: 80, coal: 40 }, trainTime: 38, trainedAt: ['factory'],
    hp: 100, attack: 40, attackType: 'pierce', range: 11, reloadTime: 5, armor: { melee: 1, pierce: 5 },
    bonus: [{ vs: 'building', amount: 30 }], speed: 0.55, los: 5, pop: 2, age: 5, radius: 0.4, projectile: 'cannonball', splash: { radius: 1, falloff: 0.5, scatter: 0.6 },
    sprite: 'cannon', spriteParams: { barrel: '#3f444b' },
  },
  {
    id: 'gatlingGun', name: 'Ametralladora', icon: '🔫', description: 'Tubos giratorios: una ráfaga continua, letal contra la infantería. Pide producción en cadena.',
    classes: ['firearm', 'machinegun'], cost: { iron: 70, coal: 40, gold: 50 }, trainTime: 36, trainedAt: ['factory'],
    hp: 70, attack: 8, attackType: 'pierce', range: 6, reloadTime: 0.7, armor: { melee: 1, pierce: 3 },
    bonus: [{ vs: 'infantry', amount: 3 }], speed: 0.7, los: 6, pop: 2, age: 5, radius: 0.4, projectile: 'bullet',
    requiresTechs: ['assemblyLine'], sprite: 'gatling',
  },
  {
    id: 'biplane', name: 'Biplano', icon: '🛩️', description: 'Aviación básica: vuela sobre el terreno y las tropas de tierra. Solo lo alcanzan las armas a distancia.',
    classes: ['air'], cost: { iron: 60, coal: 40, gold: 40 }, trainTime: 34, trainedAt: ['airfield'],
    hp: 55, attack: 7, attackType: 'pierce', range: 3, reloadTime: 1.2, armor: { melee: 0, pierce: 1 },
    speed: 2.6, los: 10, pop: 2, age: 5, radius: 0.3, projectile: 'bullet', flying: true,
    requiresTechs: ['aviation'], sprite: 'biplane',
  },
];

const stat = (classes: string[], s: 'attack' | 'range' | 'armorMelee' | 'armorPierce', value: number) =>
  ({ type: 'stat', target: { classes, kind: 'unit' }, stat: s, op: 'add', value }) as const;

export const industrialTechs: TechDef[] = [
  {
    id: 'industrialAge', name: 'Edad Industrial', icon: '🏭', description: 'Avanza a la Edad Industrial: hierro, carbón, fábricas, ferrocarril y aviación.',
    cost: { food: 1500, gold: 1200 }, researchTime: 240, age: 4, researchedAt: 'townCenter', setsAge: 5, effects: [],
    requiresBuildings: { ids: ['gunpowderWorks', 'printingHouse', 'tradingCompany', 'observatory', 'fortress'], count: 2 },
  },
  {
    id: 'steamEngine', name: 'Máquina de vapor', icon: '♨️', description: 'Bombas y vagonetas de vapor: hierro y carbón se extraen un 20% más rápido.',
    cost: { food: 300, gold: 250 }, researchTime: 55, age: 5, researchedAt: 'laboratory',
    effects: [{ type: 'gatherRate', resource: 'iron', op: 'mul', value: 1.2 }, { type: 'gatherRate', resource: 'coal', op: 'mul', value: 1.2 }],
  },
  {
    id: 'electricity', name: 'Electricidad y telégrafo', icon: '⚡', description: 'Comunicaciones instantáneas: todas las unidades +1 de visión y se entrenan un 7% más rápido.',
    cost: { food: 350, gold: 300 }, researchTime: 60, age: 5, researchedAt: 'laboratory',
    effects: [
      { type: 'stat', target: { kind: 'unit' }, stat: 'los', op: 'add', value: 1 },
      { type: 'stat', target: { kind: 'unit' }, stat: 'trainTime', op: 'mul', value: 0.93 },
    ],
  },
  {
    id: 'combustionEngine', name: 'Motor de combustión', icon: '⚙️', description: 'La caballería y los cañones se mueven un 10% más rápido. Imprescindible para volar.',
    cost: { iron: 150, coal: 150, gold: 100 }, researchTime: 60, age: 5, researchedAt: 'laboratory', requiresTechs: ['steamEngine'],
    effects: [{ type: 'stat', target: { classes: ['cavalry', 'artillery'], kind: 'unit' }, stat: 'speed', op: 'mul', value: 1.1 }],
  },
  {
    id: 'aviation', name: 'Aviación', icon: '🛩️', description: 'Permite fabricar biplanos en el aeródromo.',
    cost: { iron: 250, coal: 200, gold: 200 }, researchTime: 70, age: 5, researchedAt: 'laboratory', requiresTechs: ['combustionEngine'],
    effects: [],
  },
  {
    id: 'rifling', name: 'Estriado', icon: '🎯', description: 'Armas de fuego: +2 de ataque y +1 de alcance.',
    cost: { iron: 200, gold: 150 }, researchTime: 55, age: 5, researchedAt: 'factory',
    effects: [stat(FIREARM, 'attack', 2), stat(FIREARM, 'range', 1)],
  },
  {
    id: 'assemblyLine', name: 'Producción en cadena', icon: '🔩', description: 'Las unidades de la fábrica cuestan un 15% menos. Desbloquea la ametralladora.',
    cost: { iron: 250, coal: 100, gold: 150 }, researchTime: 60, age: 5, researchedAt: 'factory',
    effects: [{ type: 'cost', target: { ids: ['rifleman', 'fieldGun', 'gatlingGun'] }, resource: '*', op: 'mul', value: 0.85 }],
  },
  {
    id: 'bessemerSteel', name: 'Acero Bessemer', icon: '🛡️', description: 'Armas de fuego y artillería: +1/+1 de armadura.',
    cost: { iron: 250, coal: 150 }, researchTime: 60, age: 5, researchedAt: 'factory', requiresTechs: ['steamEngine'],
    effects: [stat(['firearm', 'artillery'], 'armorMelee', 1), stat(['firearm', 'artillery'], 'armorPierce', 1)],
  },
  {
    id: 'railway', name: 'Ferrocarril', icon: '🚂', description: 'Los aldeanos cargan 5 más y van un 15% más rápido.',
    cost: { wood: 250, gold: 150, iron: 100 }, researchTime: 55, age: 5, researchedAt: 'railwayStation',
    effects: [
      { type: 'stat', target: { ids: ['villager'] }, stat: 'carryCapacity', op: 'add', value: 5 },
      { type: 'stat', target: { ids: ['villager'] }, stat: 'speed', op: 'mul', value: 1.15 },
    ],
  },
];

/** Los aviones solo los alcanzan armas a distancia que no sean artillería ni asedio. */
export const airRule: CombatRule = (game, attacker, target) => {
  if (target.kind !== 'unit' || !game.unitDef(target).flying) return true;
  const def = game.defOf(attacker);
  return (def.range ?? 0) >= 1 && !def.classes.includes('siege') && !def.classes.includes('artillery');
};
