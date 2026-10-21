import type { BuildingDef, ResourceNodeDef, TechDef, UnitDef, WildlifeSpec } from '../../core/types';

/**
 * Caza y ganadería. Los animales salvajes son unidades de la Naturaleza que dejan un cadáver con
 * comida; el ganado (ovejas) se cría en el corral, a partir de la Edad Feudal.
 */

export const wildlifeUnits: UnitDef[] = [
  {
    id: 'deer', name: 'Ciervo', icon: '🦌', description: 'Presa veloz: huye al ser herida. Deja 100 de comida.',
    classes: ['animal'], cost: {}, trainTime: 0, trainedAt: [], hp: 3, attack: 0, armor: { melee: 0, pierce: 0 },
    speed: 1.5, los: 3, pop: 0, age: 0, radius: 0.28,
    wildlife: { carcass: 'deerCarcass', behavior: 'flee', roam: 4 },
    sprite: 'animal', spriteParams: { species: 'deer' },
  },
  {
    id: 'boar', name: 'Jabalí', icon: '🐗', description: 'Peligroso: se defiende de quien lo ataca. Deja 340 de comida.',
    classes: ['animal'], cost: {}, trainTime: 0, trainedAt: [], hp: 25, attack: 5, attackType: 'melee', reloadTime: 2, armor: { melee: 0, pierce: 0 },
    speed: 1.3, los: 3, pop: 0, age: 0, radius: 0.3,
    wildlife: { carcass: 'boarCarcass', behavior: 'fight', roam: 3 },
    sprite: 'animal', spriteParams: { species: 'boar' },
  },
  {
    id: 'sheep', name: 'Oveja', icon: '🐑', description: 'Ganado del corral: un aldeano la sacrifica para obtener 100 de comida. No ocupa población.',
    classes: ['livestock'], cost: { food: 40 }, trainTime: 14, trainedAt: ['corral'], hp: 8, armor: { melee: 0, pierce: 0 },
    speed: 0.7, los: 3, pop: 0, age: 1, radius: 0.24, maxAlive: 12,
    wildlife: { carcass: 'sheepCarcass', behavior: 'passive', roam: 3, livestock: true },
    sprite: 'animal', spriteParams: { species: 'sheep' },
  },
];

export const wildlifeNodes: ResourceNodeDef[] = [
  { id: 'deerCarcass', name: 'Ciervo abatido', icon: '🍖', resource: 'food', amount: 100, gatherRate: 0.9, carryMul: 2, sprite: 'carcass', spriteParams: { species: 'deer' }, minimapColor: '#b0643c' },
  { id: 'boarCarcass', name: 'Jabalí abatido', icon: '🍖', resource: 'food', amount: 340, gatherRate: 0.9, carryMul: 2, sprite: 'carcass', spriteParams: { species: 'boar' }, minimapColor: '#8a4a30' },
  { id: 'sheepCarcass', name: 'Oveja sacrificada', icon: '🍖', resource: 'food', amount: 100, gatherRate: 0.9, carryMul: 2, sprite: 'carcass', spriteParams: { species: 'sheep' }, minimapColor: '#e0d8c8' },
];

export const wildlifeBuildings: BuildingDef[] = [
  {
    id: 'corral', name: 'Corral', icon: '🐑', category: 'economy',
    description: 'Cría ovejas: cada una da 100 de comida al sacrificarla. Requiere molino.',
    classes: ['building'], cost: { wood: 100 }, buildTime: 30, size: 3,
    hp: 700, armor: { melee: 0, pierce: 5 }, los: 4, age: 1, requiresBuildings: ['mill'],
    sprite: 'building', spriteParams: { style: 'corral' },
  },
];

export const wildlifeTechs: TechDef[] = [
  {
    id: 'selectiveBreeding', name: 'Cría selectiva', icon: '🐏', description: 'Las ovejas cuestan un 40% menos de comida.',
    cost: { food: 150, wood: 100 }, researchTime: 40, age: 2, researchedAt: 'corral',
    effects: [{ type: 'cost', target: { ids: ['sheep'] }, resource: 'food', op: 'mul', value: 0.6 }],
  },
];

/** Manadas: ciervos y algún jabalí junto a cada base, y más repartidos por el mapa. */
export const wildlifeSpawns: WildlifeSpec[] = [
  { unit: 'deer', where: 'base', groups: 2, perGroup: [3, 4], minDist: 14, maxDist: 22 },
  { unit: 'boar', where: 'base', groups: 1, perGroup: [1, 2], minDist: 18, maxDist: 26 },
  { unit: 'deer', where: 'map', groups: 2, perGroup: [2, 4], minDist: 24, maxDist: 0 },
  { unit: 'boar', where: 'map', groups: 1, perGroup: [1, 2], minDist: 24, maxDist: 0 },
];
