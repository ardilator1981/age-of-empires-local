import type { Effect, TechDef } from '../../core/types';

const VILL = { ids: ['villager'] };
const statAll = (classes: string[], stat: 'attack' | 'range' | 'armorMelee' | 'armorPierce', value: number): Effect =>
  ({ type: 'stat', target: { classes }, stat, op: 'add', value });

export const techs: TechDef[] = [
  // ------------------------------------------------ edades
  {
    id: 'feudalAge', name: 'Edad Feudal', icon: '🏰', description: 'Avanza a la Edad Feudal.',
    cost: { food: 500 }, researchTime: 130, age: 0, researchedAt: 'townCenter', setsAge: 1, effects: [],
    requiresBuildings: { ids: ['barracks', 'mill', 'lumberCamp', 'miningCamp'], count: 2 },
  },
  {
    id: 'castleAge', name: 'Edad de los Castillos', icon: '🏯', description: 'Avanza a la Edad de los Castillos.',
    cost: { food: 800, gold: 200 }, researchTime: 160, age: 1, researchedAt: 'townCenter', setsAge: 2, effects: [],
    requiresBuildings: { ids: ['blacksmith', 'archeryRange', 'stable'], count: 2 },
  },
  {
    id: 'imperialAge', name: 'Edad Imperial', icon: '👑', description: 'Avanza a la Edad Imperial.',
    cost: { food: 1000, gold: 800 }, researchTime: 190, age: 2, researchedAt: 'townCenter', setsAge: 3, effects: [],
    requiresBuildings: { ids: ['castle', 'siegeWorkshop'], count: 1 },
  },
  // ------------------------------------------------ centro urbano
  {
    id: 'loom', name: 'Telar', icon: '🧵', description: 'Aldeanos: +15 PV, +1/+2 armadura.',
    cost: { gold: 50 }, researchTime: 25, age: 0, researchedAt: 'townCenter',
    effects: [
      { type: 'stat', target: VILL, stat: 'hp', op: 'add', value: 15 },
      { type: 'stat', target: VILL, stat: 'armorMelee', op: 'add', value: 1 },
      { type: 'stat', target: VILL, stat: 'armorPierce', op: 'add', value: 2 },
    ],
  },
  {
    id: 'wheelbarrow', name: 'Carretilla', icon: '🛒', description: 'Aldeanos: +10% velocidad, +3 de carga.',
    cost: { food: 175, wood: 50 }, researchTime: 75, age: 1, researchedAt: 'townCenter',
    effects: [
      { type: 'stat', target: VILL, stat: 'speed', op: 'mul', value: 1.1 },
      { type: 'stat', target: VILL, stat: 'carryCapacity', op: 'add', value: 3 },
    ],
  },
  {
    id: 'handCart', name: 'Carro de mano', icon: '🛞', description: 'Aldeanos: +10% velocidad, +7 de carga.',
    cost: { food: 300, wood: 200 }, researchTime: 55, age: 2, researchedAt: 'townCenter', requiresTechs: ['wheelbarrow'],
    effects: [
      { type: 'stat', target: VILL, stat: 'speed', op: 'mul', value: 1.1 },
      { type: 'stat', target: VILL, stat: 'carryCapacity', op: 'add', value: 7 },
    ],
  },
  // ------------------------------------------------ economía
  {
    id: 'doubleBitAxe', name: 'Hacha de doble filo', icon: '🪓', description: 'Leñadores +20% más rápidos.',
    cost: { food: 100, wood: 50 }, researchTime: 25, age: 1, researchedAt: 'lumberCamp',
    effects: [{ type: 'gatherRate', resource: 'wood', op: 'mul', value: 1.2 }],
  },
  {
    id: 'bowSaw', name: 'Sierra de arco', icon: '🪚', description: 'Leñadores +20% más rápidos.',
    cost: { food: 150, wood: 100 }, researchTime: 50, age: 2, researchedAt: 'lumberCamp', requiresTechs: ['doubleBitAxe'],
    effects: [{ type: 'gatherRate', resource: 'wood', op: 'mul', value: 1.2 }],
  },
  {
    id: 'horseCollar', name: 'Collera', icon: '🐂', description: 'Granjeros +10% más rápidos.',
    cost: { food: 75, wood: 75 }, researchTime: 20, age: 1, researchedAt: 'mill',
    effects: [{ type: 'gatherRate', resource: 'food', op: 'mul', value: 1.1 }],
  },
  {
    id: 'heavyPlow', name: 'Arado pesado', icon: '🚜', description: 'Granjeros +10% más rápidos.',
    cost: { food: 125, wood: 125 }, researchTime: 40, age: 2, researchedAt: 'mill', requiresTechs: ['horseCollar'],
    effects: [{ type: 'gatherRate', resource: 'food', op: 'mul', value: 1.1 }],
  },
  {
    id: 'goldMining', name: 'Minería de oro', icon: '🪙', description: 'Mineros de oro +15% más rápidos.',
    cost: { food: 100, wood: 75 }, researchTime: 30, age: 1, researchedAt: 'miningCamp',
    effects: [{ type: 'gatherRate', resource: 'gold', op: 'mul', value: 1.15 }],
  },
  {
    id: 'stoneMining', name: 'Cantería', icon: '🪨', description: 'Canteros +15% más rápidos.',
    cost: { food: 100, wood: 75 }, researchTime: 30, age: 1, researchedAt: 'miningCamp',
    effects: [{ type: 'gatherRate', resource: 'stone', op: 'mul', value: 1.15 }],
  },
  // ------------------------------------------------ herrería
  {
    id: 'forging', name: 'Forja', icon: '🔨', description: 'Infantería y caballería: +1 ataque.',
    cost: { food: 150 }, researchTime: 50, age: 1, researchedAt: 'blacksmith',
    effects: [statAll(['infantry', 'cavalry'], 'attack', 1)],
  },
  {
    id: 'ironCasting', name: 'Fundición de hierro', icon: '🔥', description: 'Infantería y caballería: +1 ataque.',
    cost: { food: 220, gold: 120 }, researchTime: 75, age: 2, researchedAt: 'blacksmith', requiresTechs: ['forging'],
    effects: [statAll(['infantry', 'cavalry'], 'attack', 1)],
  },
  {
    id: 'fletching', name: 'Emplumado', icon: '🪶', description: 'Arqueros, torres y centros urbanos: +1 ataque y +1 alcance.',
    cost: { food: 100, gold: 50 }, researchTime: 30, age: 1, researchedAt: 'blacksmith',
    effects: [
      statAll(['archer', 'tower', 'townCenter', 'castle'], 'attack', 1),
      statAll(['archer', 'tower', 'townCenter', 'castle'], 'range', 1),
    ],
  },
  {
    id: 'bodkinArrow', name: 'Flecha punzante', icon: '➶', description: 'Arqueros, torres y centros urbanos: +1 ataque y +1 alcance.',
    cost: { food: 200, gold: 100 }, researchTime: 35, age: 2, researchedAt: 'blacksmith', requiresTechs: ['fletching'],
    effects: [
      statAll(['archer', 'tower', 'townCenter', 'castle'], 'attack', 1),
      statAll(['archer', 'tower', 'townCenter', 'castle'], 'range', 1),
    ],
  },
  {
    id: 'scaleMail', name: 'Cota de escamas', icon: '🦺', description: 'Infantería: +1/+1 armadura.',
    cost: { food: 100 }, researchTime: 40, age: 1, researchedAt: 'blacksmith',
    effects: [statAll(['infantry'], 'armorMelee', 1), statAll(['infantry'], 'armorPierce', 1)],
  },
  {
    id: 'scaleBarding', name: 'Barda de escamas', icon: '🐎', description: 'Caballería: +1/+1 armadura.',
    cost: { food: 150 }, researchTime: 45, age: 1, researchedAt: 'blacksmith',
    effects: [statAll(['cavalry'], 'armorMelee', 1), statAll(['cavalry'], 'armorPierce', 1)],
  },
  {
    id: 'paddedArcherArmor', name: 'Armadura acolchada', icon: '🧥', description: 'Arqueros: +1/+1 armadura.',
    cost: { food: 100 }, researchTime: 40, age: 1, researchedAt: 'blacksmith',
    effects: [statAll(['archer'], 'armorMelee', 1), statAll(['archer'], 'armorPierce', 1)],
  },
  // ------------------------------------------------ mejoras de unidades
  {
    id: 'up_manAtArms', name: 'Hombre de armas', icon: '⚔️', description: 'Mejora la milicia a hombre de armas.',
    cost: { food: 100, gold: 40 }, researchTime: 40, age: 1, researchedAt: 'barracks',
    effects: [{ type: 'upgrade', from: 'militia', to: 'manAtArms' }],
  },
  {
    id: 'up_longSwordsman', name: 'Espadachín de mandoble', icon: '🤺', description: 'Mejora a espadachín de mandoble.',
    cost: { food: 200, gold: 65 }, researchTime: 45, age: 2, researchedAt: 'barracks', requiresTechs: ['up_manAtArms'],
    effects: [{ type: 'upgrade', from: 'manAtArms', to: 'longSwordsman' }],
  },
  {
    id: 'up_pikeman', name: 'Piquero', icon: '🔱', description: 'Mejora el lancero a piquero.',
    cost: { food: 215, gold: 90 }, researchTime: 45, age: 2, researchedAt: 'barracks',
    effects: [{ type: 'upgrade', from: 'spearman', to: 'pikeman' }],
  },
  {
    id: 'up_crossbowman', name: 'Ballestero', icon: '🎯', description: 'Mejora el arquero a ballestero.',
    cost: { food: 125, gold: 75 }, researchTime: 35, age: 2, researchedAt: 'archeryRange',
    effects: [{ type: 'upgrade', from: 'archer', to: 'crossbowman' }],
  },
  {
    id: 'up_lightCavalry', name: 'Caballería ligera', icon: '🐎', description: 'Mejora la caballería de exploración.',
    cost: { food: 150, gold: 50 }, researchTime: 45, age: 2, researchedAt: 'stable',
    effects: [{ type: 'upgrade', from: 'scoutCavalry', to: 'lightCavalry' }],
  },
  {
    id: 'up_cavalier', name: 'Paladín', icon: '🏇', description: 'Mejora el caballero a paladín.',
    cost: { food: 300, gold: 300 }, researchTime: 100, age: 3, researchedAt: 'stable',
    effects: [{ type: 'upgrade', from: 'knight', to: 'cavalier' }],
  },
  // ------------------------------------------------ tecnologías únicas (castillo)
  {
    id: 'yeomen', name: 'Arqueros ingleses', icon: '🏹', civs: ['britons'], description: 'Arqueros +1 alcance; torres +2 ataque.',
    cost: { food: 750, wood: 450 }, researchTime: 60, age: 2, researchedAt: 'castle',
    effects: [statAll(['archer'], 'range', 1), statAll(['tower'], 'attack', 2)],
  },
  {
    id: 'beardedAxe', name: 'Hacha barbada', icon: '🪓', civs: ['franks'], description: 'Lanzadores de hachas +1 alcance.',
    cost: { food: 400, gold: 400 }, researchTime: 60, age: 2, researchedAt: 'castle',
    effects: [{ type: 'stat', target: { ids: ['throwingAxeman'] }, stat: 'range', op: 'add', value: 1 }],
  },
  {
    id: 'perfusion', name: 'Perfusión', icon: '⏩', civs: ['goths'], description: 'La infantería se entrena el doble de rápido.',
    cost: { wood: 400, gold: 600 }, researchTime: 40, age: 2, researchedAt: 'castle',
    effects: [{ type: 'stat', target: { classes: ['infantry'], kind: 'unit' }, stat: 'trainTime', op: 'mul', value: 0.5 }],
  },
  {
    id: 'drill', name: 'Instrucción', icon: '🥁', civs: ['mongols'], description: 'Armas de asedio +50% velocidad.',
    cost: { food: 500, gold: 450 }, researchTime: 60, age: 2, researchedAt: 'castle',
    effects: [{ type: 'stat', target: { classes: ['siege'] }, stat: 'speed', op: 'mul', value: 1.5 }],
  },
];
