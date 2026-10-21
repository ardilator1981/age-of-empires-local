import type { UnitDef } from '../../core/types';

/** Unidades. Valores aproximados a Age of Empires II. */
export const units: UnitDef[] = [
  {
    id: 'villager', name: 'Aldeano', icon: '🧑‍🌾',
    description: 'Recolecta recursos y construye edificios.',
    classes: ['villager'], cost: { food: 50 }, trainTime: 25, trainedAt: ['townCenter', 'kremlin', 'bastide', 'forbiddenCity'],
    hp: 25, attack: 3, attackType: 'melee', reloadTime: 2, armor: { melee: 0, pierce: 0 },
    speed: 0.8, los: 4, pop: 1, age: 0, gatherer: true, builder: true, carryCapacity: 10,
    sprite: 'humanoid', spriteParams: { weapon: 'axe', villager: true },
  },
  // ---- Cuartel
  {
    id: 'militia', name: 'Milicia', icon: '🗡️', description: 'Infantería básica.',
    classes: ['infantry'], cost: { food: 60, gold: 20 }, trainTime: 21, trainedAt: ['barracks'],
    hp: 40, attack: 4, attackType: 'melee', reloadTime: 2, armor: { melee: 0, pierce: 1 },
    speed: 0.9, los: 4, pop: 1, age: 0, sprite: 'humanoid', spriteParams: { weapon: 'sword' },
  },
  {
    id: 'manAtArms', name: 'Hombre de armas', icon: '⚔️', description: 'Infantería mejorada.',
    classes: ['infantry'], cost: { food: 60, gold: 20 }, trainTime: 21, trainedAt: ['barracks'],
    hp: 45, attack: 6, attackType: 'melee', reloadTime: 2, armor: { melee: 0, pierce: 1 },
    speed: 0.9, los: 4, pop: 1, age: 1, sprite: 'humanoid', spriteParams: { weapon: 'sword', helmet: true, shield: true },
  },
  {
    id: 'longSwordsman', name: 'Espadachín de mandoble', icon: '🤺', description: 'Infantería pesada.',
    classes: ['infantry'], cost: { food: 60, gold: 20 }, trainTime: 21, trainedAt: ['barracks'],
    hp: 60, attack: 9, attackType: 'melee', reloadTime: 2, armor: { melee: 1, pierce: 1 },
    speed: 0.9, los: 4, pop: 1, age: 2, sprite: 'humanoid', spriteParams: { weapon: 'sword', helmet: true, shield: true, armor: true, cape: true },
  },
  {
    id: 'spearman', name: 'Lancero', icon: '🔱', description: 'Barato y eficaz contra la caballería.',
    classes: ['infantry', 'spear'], cost: { food: 35, wood: 25 }, trainTime: 22, trainedAt: ['barracks'],
    hp: 45, attack: 3, attackType: 'melee', reloadTime: 3, armor: { melee: 0, pierce: 0 },
    bonus: [{ vs: 'cavalry', amount: 15 }], speed: 1.0, los: 4, pop: 1, age: 1,
    sprite: 'humanoid', spriteParams: { weapon: 'spear' },
  },
  {
    id: 'pikeman', name: 'Piquero', icon: '🔱', description: 'Lancero mejorado.',
    classes: ['infantry', 'spear'], cost: { food: 35, wood: 25 }, trainTime: 22, trainedAt: ['barracks'],
    hp: 55, attack: 4, attackType: 'melee', reloadTime: 3, armor: { melee: 0, pierce: 0 },
    bonus: [{ vs: 'cavalry', amount: 22 }], speed: 1.0, los: 4, pop: 1, age: 2,
    sprite: 'humanoid', spriteParams: { weapon: 'spear', helmet: true },
  },
  // ---- Galería de tiro con arco
  {
    id: 'archer', name: 'Arquero', icon: '🏹', description: 'Ataque a distancia.',
    classes: ['archer'], cost: { wood: 25, gold: 45 }, trainTime: 35, trainedAt: ['archeryRange'],
    hp: 30, attack: 4, attackType: 'pierce', range: 4, reloadTime: 2, armor: { melee: 0, pierce: 0 },
    bonus: [{ vs: 'spear', amount: 3 }], speed: 0.96, los: 6, pop: 1, age: 1, projectile: 'arrow',
    sprite: 'humanoid', spriteParams: { weapon: 'bow', hood: '#4f6b2e' },
  },
  {
    id: 'crossbowman', name: 'Ballestero', icon: '🎯', description: 'Arquero mejorado.',
    classes: ['archer'], cost: { wood: 25, gold: 45 }, trainTime: 27, trainedAt: ['archeryRange'],
    hp: 35, attack: 5, attackType: 'pierce', range: 5, reloadTime: 2, armor: { melee: 0, pierce: 0 },
    bonus: [{ vs: 'spear', amount: 3 }], speed: 0.96, los: 7, pop: 1, age: 2, projectile: 'arrow',
    sprite: 'humanoid', spriteParams: { weapon: 'bow', helmet: true },
  },
  {
    id: 'skirmisher', name: 'Hostigador', icon: '🪃', description: 'Barato; eficaz contra arqueros.',
    classes: ['archer', 'skirmisher'], cost: { food: 25, wood: 35 }, trainTime: 22, trainedAt: ['archeryRange'],
    hp: 30, attack: 2, attackType: 'pierce', range: 4, reloadTime: 3, armor: { melee: 0, pierce: 3 },
    bonus: [{ vs: 'archer', amount: 3 }], speed: 0.96, los: 6, pop: 1, age: 1, projectile: 'javelin',
    sprite: 'humanoid', spriteParams: { weapon: 'javelin', shield: true },
  },
  // ---- Establo
  {
    id: 'scoutCavalry', name: 'Caballería de exploración', icon: '🐎', description: 'Rápida, ideal para explorar.',
    classes: ['cavalry'], cost: { food: 80 }, trainTime: 30, trainedAt: ['stable'],
    hp: 45, attack: 3, attackType: 'melee', reloadTime: 2, armor: { melee: 0, pierce: 2 },
    speed: 1.55, los: 6, pop: 1, age: 1, radius: 0.35,
    autoExplore: { requiresBuildings: ['stable'] }, hunting: true, carryCapacity: 10,
    sprite: 'cavalry', spriteParams: { weapon: 'sword', horse: '#9a6a3c' },
  },
  {
    id: 'lightCavalry', name: 'Caballería ligera', icon: '🐎', description: 'Exploración mejorada.',
    classes: ['cavalry'], cost: { food: 80 }, trainTime: 30, trainedAt: ['stable'],
    hp: 60, attack: 7, attackType: 'melee', reloadTime: 2, armor: { melee: 0, pierce: 2 },
    speed: 1.5, los: 8, pop: 1, age: 2, radius: 0.35,
    autoExplore: { requiresBuildings: ['stable'] },
    sprite: 'cavalry', spriteParams: { weapon: 'sword', horse: '#9a6a3c', helmet: true },
  },
  {
    id: 'knight', name: 'Caballero', icon: '🏇', description: 'Caballería pesada y resistente.',
    classes: ['cavalry'], cost: { food: 60, gold: 75 }, trainTime: 30, trainedAt: ['stable'],
    hp: 100, attack: 10, attackType: 'melee', reloadTime: 1.8, armor: { melee: 2, pierce: 2 },
    speed: 1.35, los: 4, pop: 1, age: 2, radius: 0.35,
    sprite: 'cavalry', spriteParams: { weapon: 'sword', horse: '#5d4030', barding: true, helmet: true, armor: true },
  },
  {
    id: 'cavalier', name: 'Paladín', icon: '🏇', description: 'Caballero mejorado.',
    classes: ['cavalry'], cost: { food: 60, gold: 75 }, trainTime: 30, trainedAt: ['stable'],
    hp: 120, attack: 12, attackType: 'melee', reloadTime: 1.8, armor: { melee: 2, pierce: 2 },
    speed: 1.35, los: 5, pop: 1, age: 3, radius: 0.35,
    sprite: 'cavalry', spriteParams: { weapon: 'sword', horse: '#3d2c22', barding: true, helmet: true, armor: true, scale: 1.08 },
  },
  // ---- Taller de asedio
  {
    id: 'batteringRam', name: 'Ariete', icon: '🪵', description: 'Destruye edificios. Casi inmune a las flechas.',
    classes: ['siege'], cost: { wood: 160, gold: 75 }, trainTime: 36, trainedAt: ['siegeWorkshop'],
    hp: 175, attack: 2, attackType: 'melee', reloadTime: 5, armor: { melee: 0, pierce: 180 },
    bonus: [{ vs: 'building', amount: 125 }], speed: 0.5, los: 3, pop: 1, age: 2, radius: 0.4,
    sprite: 'ram',
  },
  // ---- Unidades únicas (castillo; las de cada era de cada civilización, en civ-*.ts y gunpowder.ts)
  {
    id: 'longbowman', name: 'Arquero de tiro largo', icon: '🏹', description: 'Unidad única británica: enorme alcance.',
    classes: ['archer'], civs: ['britain'], cost: { wood: 35, gold: 40 }, trainTime: 18, trainedAt: ['castle'],
    hp: 35, attack: 6, attackType: 'pierce', range: 5, reloadTime: 2, armor: { melee: 0, pierce: 1 },
    speed: 0.96, los: 7, pop: 1, age: 2, projectile: 'arrow',
    sprite: 'humanoid', spriteParams: { weapon: 'bow', hood: '#2e5a2e', cape: true },
  },
  {
    id: 'throwingAxeman', name: 'Guerrero franco', icon: '🪓', description: 'Unidad única francesa (Edad Oscura): hachas arrojadizas (francisca) a distancia.',
    classes: ['infantry'], civs: ['france'], cost: { food: 55, gold: 25 }, trainTime: 19, trainedAt: ['barracks'],
    hp: 50, attack: 6, attackType: 'melee', range: 3, reloadTime: 2, armor: { melee: 0, pierce: 0 },
    speed: 1.0, los: 5, pop: 1, age: 0, projectile: 'axe',
    sprite: 'humanoid', spriteParams: { weapon: 'throwingAxe', helmet: true, shield: true },
  },
  // ---- Rusia (rus): una unidad única por era
  {
    id: 'druzhinnik', name: 'Druzhinnik', icon: '🪓', description: 'Unidad única rusa (Edad Oscura): guardia armada del príncipe, con hacha y escudo.',
    classes: ['infantry'], civs: ['rus'], cost: { food: 55, gold: 25 }, trainTime: 22, trainedAt: ['barracks'],
    hp: 50, attack: 6, attackType: 'melee', reloadTime: 2, armor: { melee: 1, pierce: 2 },
    speed: 0.92, los: 4, pop: 1, age: 0,
    sprite: 'humanoid', spriteParams: { weapon: 'axe', helmet: true, shield: true },
  },
  {
    id: 'boyarSon', name: 'Hijo de boyardo', icon: '🏇', description: 'Unidad única rusa (Castillos): caballería pesada de servicio señorial.',
    classes: ['cavalry'], civs: ['rus'], cost: { food: 70, gold: 70 }, trainTime: 32, trainedAt: ['castle'],
    hp: 110, attack: 11, attackType: 'melee', reloadTime: 1.9, armor: { melee: 2, pierce: 3 },
    speed: 1.3, los: 4, pop: 1, age: 2, radius: 0.35,
    sprite: 'cavalry', spriteParams: { weapon: 'sword', horse: '#4a3a2c', barding: true, helmet: true, armor: true },
  },
  {
    id: 'strelets', name: 'Strelets', icon: '🔫', description: 'Unidad única rusa (Imperial): arcabucero permanente, creado en 1550. Poca cadencia, mucho daño.',
    classes: ['infantry'], civs: ['rus'], cost: { food: 55, gold: 60 }, trainTime: 20, trainedAt: ['castle'],
    hp: 40, attack: 14, attackType: 'pierce', range: 6, reloadTime: 3.2, armor: { melee: 0, pierce: 1 },
    speed: 0.95, los: 7, pop: 1, age: 3, projectile: 'arrow',
    sprite: 'humanoid', spriteParams: { weapon: 'bow', hood: '#7a1f1f', cape: true },
  },
  {
    id: 'cossack', name: 'Cosaco', icon: '🐎', description: 'Unidad única rusa (Imperial): jinete fronterizo, rápido y capaz de cazar.',
    classes: ['cavalry'], civs: ['rus'], cost: { food: 60, wood: 35 }, trainTime: 24, trainedAt: ['castle'],
    hp: 75, attack: 8, attackType: 'melee', reloadTime: 1.8, armor: { melee: 1, pierce: 2 },
    speed: 1.55, los: 7, pop: 1, age: 3, radius: 0.35, hunting: true, carryCapacity: 10,
    sprite: 'cavalry', spriteParams: { weapon: 'sword', horse: '#6a4a30', helmet: true },
  },
];
