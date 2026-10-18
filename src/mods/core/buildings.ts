import type { BuildingDef } from '../../core/types';

const ALL = ['food', 'wood', 'gold', 'stone'];

export const buildings: BuildingDef[] = [
  // ------------------------------------------------ economía
  {
    id: 'townCenter', name: 'Centro urbano', icon: '🏰', category: 'economy',
    description: 'Entrena aldeanos, investiga avances de edad y acepta todos los recursos. Dispara flechas.',
    classes: ['building', 'townCenter'], cost: { wood: 275, stone: 100 }, buildTime: 150, size: 4,
    hp: 2400, armor: { melee: 3, pierce: 5 }, los: 8, age: 2, popProvided: 5, dropSite: ALL,
    attack: 5, attackType: 'pierce', range: 6, reloadTime: 2, projectile: 'arrow',
    sprite: 'building', spriteParams: { style: 'tc' },
  },
  {
    id: 'house', name: 'Casa', icon: '🏠', category: 'economy', description: 'Aumenta la población máxima en 5.',
    classes: ['building', 'house'], cost: { wood: 25 }, buildTime: 25, size: 2,
    hp: 550, armor: { melee: 0, pierce: 7 }, los: 2, age: 0, popProvided: 5,
    sprite: 'building', spriteParams: { style: 'house' },
  },
  {
    id: 'mill', name: 'Molino', icon: '🌾', category: 'economy', description: 'Depósito de alimento. Permite granjas.',
    classes: ['building'], cost: { wood: 100 }, buildTime: 35, size: 2,
    hp: 1000, armor: { melee: 0, pierce: 7 }, los: 4, age: 0, dropSite: ['food'],
    sprite: 'building', spriteParams: { style: 'mill' },
  },
  {
    id: 'lumberCamp', name: 'Campamento maderero', icon: '🪓', category: 'economy', description: 'Depósito de madera.',
    classes: ['building'], cost: { wood: 100 }, buildTime: 35, size: 2,
    hp: 1000, armor: { melee: 0, pierce: 7 }, los: 4, age: 0, dropSite: ['wood'],
    sprite: 'building', spriteParams: { style: 'shed', pile: 'wood' },
  },
  {
    id: 'miningCamp', name: 'Campamento minero', icon: '⛏️', category: 'economy', description: 'Depósito de oro y piedra.',
    classes: ['building'], cost: { wood: 100 }, buildTime: 35, size: 2,
    hp: 1000, armor: { melee: 0, pierce: 7 }, los: 4, age: 0, dropSite: ['gold', 'stone'],
    sprite: 'building', spriteParams: { style: 'shed', pile: 'stone' },
  },
  {
    id: 'farm', name: 'Granja', icon: '🌱', category: 'economy', description: 'Fuente de alimento renovable. Requiere molino.',
    classes: ['building', 'farm'], cost: { wood: 60 }, buildTime: 15, size: 2, walkable: true,
    gatherable: { resource: 'food', amount: 175, gatherRate: 0.33 },
    hp: 480, armor: { melee: 0, pierce: 0 }, los: 1, age: 0, requiresBuildings: ['mill'],
    sprite: 'farm',
  },
  // ------------------------------------------------ militares
  {
    id: 'barracks', name: 'Cuartel', icon: '🛖', category: 'military', description: 'Entrena infantería.',
    classes: ['building'], cost: { wood: 175 }, buildTime: 50, size: 3,
    hp: 1200, armor: { melee: 0, pierce: 7 }, los: 5, age: 0,
    sprite: 'building', spriteParams: { style: 'hall', height: 26, roofHeight: 22, weapons: true },
  },
  {
    id: 'archeryRange', name: 'Galería de tiro con arco', icon: '🎯', category: 'military', description: 'Entrena arqueros.',
    classes: ['building'], cost: { wood: 175 }, buildTime: 50, size: 3,
    hp: 1200, armor: { melee: 0, pierce: 7 }, los: 5, age: 1, requiresBuildings: ['barracks'],
    sprite: 'building', spriteParams: { style: 'hall', height: 24, roofHeight: 20, target: true },
  },
  {
    id: 'stable', name: 'Establo', icon: '🐴', category: 'military', description: 'Entrena caballería.',
    classes: ['building'], cost: { wood: 175 }, buildTime: 50, size: 3,
    hp: 1200, armor: { melee: 0, pierce: 7 }, los: 5, age: 1, requiresBuildings: ['barracks'],
    sprite: 'building', spriteParams: { style: 'hall', height: 22, roofHeight: 22, stable: true },
  },
  {
    id: 'blacksmith', name: 'Herrería', icon: '⚒️', category: 'military', description: 'Mejora el ataque y la armadura.',
    classes: ['building'], cost: { wood: 150 }, buildTime: 40, size: 3,
    hp: 1200, armor: { melee: 0, pierce: 7 }, los: 5, age: 1,
    sprite: 'building', spriteParams: { style: 'smithy' },
  },
  {
    id: 'watchTower', name: 'Torre de vigilancia', icon: '🗼', category: 'military', description: 'Defensa que dispara flechas.',
    classes: ['building', 'tower'], cost: { wood: 25, stone: 125 }, buildTime: 80, size: 1,
    hp: 700, armor: { melee: 1, pierce: 7 }, los: 9, age: 1,
    attack: 5, attackType: 'pierce', range: 8, reloadTime: 2, projectile: 'arrow',
    sprite: 'building', spriteParams: { style: 'tower', inset: 0.1 },
  },
  {
    id: 'siegeWorkshop', name: 'Taller de asedio', icon: '🛠️', category: 'military', description: 'Construye armas de asedio.',
    classes: ['building'], cost: { wood: 200 }, buildTime: 40, size: 3,
    hp: 1500, armor: { melee: 0, pierce: 7 }, los: 5, age: 2, requiresBuildings: ['blacksmith'],
    sprite: 'building', spriteParams: { style: 'shed', pile: 'wood', height: 22 },
  },
  {
    id: 'castle', name: 'Castillo', icon: '🏯', category: 'military', description: 'Fortaleza. Entrena la unidad única de tu civilización.',
    classes: ['building', 'castle'], cost: { stone: 650 }, buildTime: 200, size: 4,
    hp: 4800, armor: { melee: 8, pierce: 11 }, los: 11, age: 2, popProvided: 20,
    attack: 11, attackType: 'pierce', range: 8, reloadTime: 2, projectile: 'arrow',
    sprite: 'building', spriteParams: { style: 'castle', inset: 0.05 },
  },
];
