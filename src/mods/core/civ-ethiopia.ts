import type { BuildingDef, CivDef, TechDef, UnitDef } from '../../core/types';

/**
 * Etiopía (id `ethiopia`), eras 0–5: Axum, Zagüe, la dinastía salomónica, las guerras de Adal, los
 * príncipes de Gondar y Tewodros–Menelik (docs/civilizaciones.md §5.5). Entra con la Industrial;
 * su era 6 (Haile Selassie, resistencia) llegará con la Contemporánea. Valores indicativos.
 *
 * Pendientes de motor: la ventaja de altura propia de los zagüe (`heightRules` es común a todos) y
 * el Katama que se pliega y se mueve (edificios móviles): el katama es de momento un centro urbano.
 */
const ETHIOPIA = ['ethiopia'];
const ALL = ['food', 'wood', 'gold', 'stone', 'iron', 'coal'];

export const ethiopiaCiv: CivDef = {
  id: 'ethiopia', name: 'Etiopía', description: 'Reino de las montañas: infantería resistente, defensa en altura y tecnología comprada. De Axum a Menelik II (después, hacia la Etiopía del siglo XX).',
  bonusText: ['Infantería +10% de PV', 'Unidad única: Guerrero axumita (Edad Oscura)', 'Edificio único: Estela'],
  bonuses: [{ type: 'stat', target: { classes: ['infantry'], kind: 'unit' }, stat: 'hp', op: 'mul', value: 1.1 }],
  eras: {
    0: {
      name: 'Reino de Axum', description: 'Puerto del mar Rojo y estelas (s. I–X): Ezana se cristianiza en los años 330 y Axum acuña su moneda.',
      bonuses: [{ type: 'gatherRate', resource: 'gold', op: 'mul', value: 1.05 }],
      bonusText: ['Moneda propia y comercio del mar Rojo: oro +5% de recolección', 'Unidad única: Guerrero axumita', 'Edificio único: Estela', 'Tecnología única: Moneda de Axum'],
    },
    1: {
      name: 'Dinastía Zagüe', description: 'Iglesias en la roca (c. 1137–1270): Lalibela y sus templos excavados.',
      bonuses: [{ type: 'stat', target: { classes: ['infantry'], kind: 'unit' }, stat: 'armorPierce', op: 'add', value: 1 }],
      bonusText: ['Infantería +1 de armadura a distancia', 'Unidad única: Guardia de Lalibela', 'Edificio único: Iglesia rupestre (refugio)', 'Tecnología única: Prestes Juan'],
    },
    2: {
      name: 'Dinastía salomónica', description: 'Reino cristiano rodeado (1270; Amda Seyon I, Zara Yaqob): la corte itinerante cobra tributo en grano y ganado.',
      bonuses: [
        { type: 'gatherRate', resource: 'food', op: 'mul', value: 1.05 },
        { type: 'cost', target: { classes: ['infantry'], kind: 'unit' }, resource: 'food', op: 'mul', value: 0.9 },
      ],
      bonusText: ['Tributo de la corte: alimento +5% de recolección', 'Infantería -10% de comida', 'Unidad única: Soldado real', 'Edificio único: Katama', 'Tecnología única: Corte itinerante'],
    },
    3: {
      name: 'Guerras de Adal y Gondar', description: 'Recuperar el reino con fusil prestado (Ahmad Gragn, 1529–43; los mosqueteros portugueses de Cristóvão da Gama, 1541; Gondar, 1636).',
      bonuses: [{ type: 'cost', target: { classes: ['firearm'], kind: 'unit' }, resource: 'gold', op: 'mul', value: 0.9 }],
      bonusText: ['Alianza con Portugal: armas de fuego -10% de oro', 'Unidad única: Mosquetero etíope-portugués', 'Edificio único: Castillo de Gondar', 'Tecnología única: Alianza portuguesa', 'Poder: Resistencia'],
    },
    4: {
      name: 'Era de los príncipes', description: 'Señores regionales y caballería de las tierras bajas (Zemene Mesafint, 1769–1855).',
      bonuses: [{ type: 'stat', target: { classes: ['infantry', 'cavalry'], kind: 'unit' }, stat: 'trainTime', op: 'mul', value: 0.85 }],
      bonusText: ['Ejércitos de los ras: infantería y caballería se entrenan un 15% más rápido', 'Unidad única: Jinete oromo', 'Edificio único: Palacio del ras', 'Tecnología única: Cría de caballos'],
    },
    5: {
      name: 'Tewodros II y Menelik II', description: 'Modernizar sin ser conquistado (Magdala 1868, Addis Abeba 1886, Adwa 1896, ferrocarril de Yibuti desde 1894).',
      bonuses: [
        { type: 'cost', target: { kind: 'tech' }, resource: '*', op: 'mul', value: 0.9 },
        { type: 'cost', target: { classes: ['firearm'], kind: 'unit' }, resource: 'iron', op: 'mul', value: 0.85 },
      ],
      bonusText: ['Compra de saber: tecnologías -10% de coste', 'Fusiles importados: armas de fuego -15% de hierro', 'Unidades únicas: Fusilero shewano y Artillería de montaña', 'Edificio único: Ferrocarril de Yibuti', 'Tecnología única: Importación de armas', 'Poder: Nagarit'],
    },
  },
};

export const ethiopiaUnits: UnitDef[] = [
  {
    id: 'axumiteWarrior', name: 'Guerrero axumita', icon: '🔱', description: 'Unidad única etíope (Edad Oscura): lancero del reino de Axum.',
    classes: ['infantry', 'spear'], civs: ETHIOPIA, cost: { food: 50, gold: 20 }, trainTime: 21, trainedAt: ['barracks'],
    hp: 55, attack: 5, attackType: 'melee', reloadTime: 2.2, armor: { melee: 1, pierce: 1 },
    bonus: [{ vs: 'cavalry', amount: 10 }], speed: 1.0, los: 4, pop: 1, age: 0,
    sprite: 'humanoid', spriteParams: { weapon: 'spear', shield: true },
  },
  {
    id: 'lalibelaGuard', name: 'Guardia de Lalibela', icon: '🗡️', description: 'Unidad única etíope (Feudal): guardia de los reyes zagüe, firme en terreno alto.',
    classes: ['infantry'], civs: ETHIOPIA, cost: { food: 55, gold: 25 }, trainTime: 22, trainedAt: ['barracks'],
    hp: 65, attack: 7, attackType: 'melee', reloadTime: 2, armor: { melee: 2, pierce: 2 },
    bonus: [{ vs: 'cavalry', amount: 6 }], speed: 0.95, los: 4, pop: 1, age: 1,
    sprite: 'humanoid', spriteParams: { weapon: 'sword', helmet: true, shield: true },
  },
  {
    id: 'royalChewa', name: 'Soldado real', icon: '⚔️', description: 'Unidad única etíope (Castillos): soldado de la corte salomónica (chewa).',
    classes: ['infantry'], civs: ETHIOPIA, cost: { food: 60, gold: 50 }, trainTime: 24, trainedAt: ['castle'],
    hp: 85, attack: 10, attackType: 'melee', reloadTime: 1.9, armor: { melee: 2, pierce: 3 },
    speed: 0.95, los: 4, pop: 1, age: 2,
    sprite: 'humanoid', spriteParams: { weapon: 'sword', helmet: true, shield: true, armor: true, cape: true },
  },
  {
    id: 'ethiopianMusketeer', name: 'Mosquetero etíope-portugués', icon: '🔫', description: 'Unidad única etíope (Imperial): infantería con mosquete instruida por los portugueses de Da Gama.',
    classes: ['infantry', 'firearm'], civs: ETHIOPIA, cost: { food: 55, gold: 60 }, trainTime: 22, trainedAt: ['castle'],
    hp: 55, attack: 15, attackType: 'pierce', range: 6, reloadTime: 3, armor: { melee: 1, pierce: 1 },
    speed: 0.94, los: 7, pop: 1, age: 3, projectile: 'bullet',
    sprite: 'humanoid', spriteParams: { weapon: 'musket', hat: 'tricorn' },
  },
  {
    id: 'oromoRider', name: 'Jinete oromo', icon: '🐎', description: 'Unidad única etíope (Pólvora): caballería de las tierras bajas, rápida y ligera.',
    classes: ['cavalry'], civs: ETHIOPIA, cost: { food: 55, gold: 40 }, trainTime: 24, trainedAt: ['stable'],
    hp: 75, attack: 9, attackType: 'melee', reloadTime: 1.7, armor: { melee: 1, pierce: 2 },
    bonus: [{ vs: 'archer', amount: 3 }], speed: 1.65, los: 7, pop: 1, age: 4, radius: 0.35, hunting: true, carryCapacity: 10,
    sprite: 'cavalry', spriteParams: { weapon: 'spear', horse: '#5a4230', helmet: true },
  },
  {
    id: 'shewanRifleman', name: 'Fusilero shewano', icon: '🔫', description: 'Unidad única etíope (Industrial): el ejército de Menelik, con fusiles Remington, Gras y Berthier. Adwa, 1896.',
    classes: ['infantry', 'firearm'], civs: ETHIOPIA, cost: { food: 50, iron: 35 }, trainTime: 20, trainedAt: ['factory'],
    hp: 68, attack: 17, attackType: 'pierce', range: 7, reloadTime: 2.6, armor: { melee: 1, pierce: 2 },
    speed: 1.0, los: 8, pop: 1, age: 5, projectile: 'bullet',
    sprite: 'humanoid', spriteParams: { weapon: 'rifle', hood: '#6a5a2a', cape: true },
  },
  {
    id: 'mountainGun', name: 'Artillería de montaña', icon: '💣', description: 'Unidad única etíope (Industrial): cañón ligero de montaña, barato y más rápido que el de campaña.',
    classes: ['siege', 'artillery'], civs: ETHIOPIA, cost: { wood: 80, iron: 60, coal: 20 }, trainTime: 32, trainedAt: ['factory'],
    hp: 75, attack: 30, attackType: 'pierce', range: 10, reloadTime: 4.4, armor: { melee: 1, pierce: 3 },
    bonus: [{ vs: 'building', amount: 22 }], speed: 0.8, los: 5, pop: 2, age: 5, radius: 0.35, projectile: 'cannonball',
    sprite: 'cannon', spriteParams: { howitzer: true, barrel: '#6a5a3a' },
  },
];

export const ethiopiaBuildings: BuildingDef[] = [
  {
    id: 'stele', name: 'Estela', icon: '🗿', category: 'economy', civs: ETHIOPIA,
    description: 'Edificio único etíope (Edad Oscura): monumento de Axum. Muy resistente, gran visión y aloja población.',
    classes: ['building'], cost: { stone: 120 }, buildTime: 35, size: 2,
    hp: 1600, armor: { melee: 3, pierce: 10 }, los: 8, age: 0, popProvided: 8,
    sprite: 'building', spriteParams: { style: 'tower', inset: 0.2, wall: '#a8a294', roof: '#8a8478' },
  },
  {
    id: 'rockChurch', name: 'Iglesia rupestre', icon: '⛪', category: 'military', civs: ETHIOPIA,
    description: 'Edificio único etíope (Feudal): iglesia excavada en la roca, casi indestructible. Refugio para 12 aldeanos o infantes.',
    classes: ['building'], cost: { wood: 50, stone: 200 }, buildTime: 70, size: 3,
    hp: 3600, armor: { melee: 8, pierce: 12 }, los: 6, age: 1, popProvided: 5,
    shelter: { classes: ['villager', 'infantry'], capacity: 12 },
    sprite: 'building', spriteParams: { style: 'castle', inset: 0.12, wall: '#b9ab94', roof: '#8a7a64' },
  },
  {
    id: 'katama', name: 'Katama', icon: '🏕️', category: 'economy', civs: ETHIOPIA,
    description: 'Edificio único etíope (Castillos): el campamento real de la corte itinerante. Centro urbano que entrena aldeanos y dispara. (Aún no se pliega.)',
    classes: ['building', 'townCenter'], cost: { wood: 150, stone: 200 }, buildTime: 110, size: 4,
    hp: 2800, armor: { melee: 3, pierce: 7 }, los: 8, age: 2, popProvided: 10, dropSite: ALL, requiresBuildings: ['townCenter'],
    attack: 6, attackType: 'pierce', range: 6, reloadTime: 2, projectile: 'arrow',
    sprite: 'building', spriteParams: { style: 'tc', wall: '#cdbd98', roof: '#6a3a2a' },
  },
  {
    id: 'gondarCastle', name: 'Castillo de Gondar', icon: '🏰', category: 'military', civs: ETHIOPIA,
    description: 'Edificio único etíope (Imperial): el Fasil Ghebbi de Fasilides (1636). Aloja población y dispara.',
    classes: ['building', 'tower'], cost: { wood: 250, stone: 350 }, buildTime: 120, size: 3,
    hp: 3200, armor: { melee: 4, pierce: 10 }, los: 9, age: 3, popProvided: 15,
    attack: 8, attackType: 'pierce', range: 8, reloadTime: 2, projectile: 'arrow',
    sprite: 'building', spriteParams: { style: 'castle', inset: 0.06, wall: '#bfae8e', roof: '#5a4a3a' },
  },
  {
    id: 'rasPalace', name: 'Palacio del ras', icon: '🏛️', category: 'economy', civs: ETHIOPIA,
    description: 'Edificio único etíope (Pólvora): la corte de un señor regional. Depósito de alimento y oro; aloja población.',
    classes: ['building'], cost: { wood: 150, stone: 150 }, buildTime: 60, size: 3,
    hp: 1800, armor: { melee: 1, pierce: 8 }, los: 6, age: 4, popProvided: 15, dropSite: ['food', 'gold'],
    sprite: 'building', spriteParams: { style: 'hall', height: 24, roofHeight: 16, wall: '#d6c8a4', roof: '#6a3a2a' },
  },
  {
    id: 'djiboutiRailway', name: 'Ferrocarril de Yibuti', icon: '🚂', category: 'economy', civs: ETHIOPIA,
    description: 'Edificio único etíope (Industrial): la línea de Yibuti a Addis Abeba (desde 1894). Depósito de todos los recursos, barato. Solo uno.',
    classes: ['building'], cost: { wood: 150, stone: 80, gold: 50 }, buildTime: 50, size: 3,
    hp: 1700, armor: { melee: 0, pierce: 8 }, los: 6, age: 5, popProvided: 5, dropSite: ALL, maxAlive: 1,
    sprite: 'building', spriteParams: { style: 'hall', height: 22, roofHeight: 12, wall: '#c9b99a', roof: '#6a5a2a' },
  },
];

export const ethiopiaTechs: TechDef[] = [
  {
    id: 'axumCoinage', name: 'Moneda de Axum', icon: '🪙', civs: ETHIOPIA,
    description: 'Tecnología única etíope (Edad Oscura): Axum acuña oro, plata y bronce. El oro se recoge un 10% más rápido.',
    cost: { food: 100, gold: 50 }, researchTime: 35, age: 0, researchedAt: 'townCenter',
    effects: [{ type: 'gatherRate', resource: 'gold', op: 'mul', value: 1.1 }],
  },
  {
    id: 'prestorJohn', name: 'Prestes Juan', icon: '✝️', civs: ETHIOPIA,
    description: 'Tecnología única etíope (Feudal): la leyenda europea del rey cristiano de África. Todos los edificios +10% de PV.',
    cost: { food: 200, gold: 100 }, researchTime: 45, age: 1, researchedAt: 'townCenter',
    effects: [{ type: 'stat', target: { kind: 'building' }, stat: 'hp', op: 'mul', value: 1.1 }],
  },
  {
    id: 'itinerantCourt', name: 'Corte itinerante', icon: '🏕️', civs: ETHIOPIA,
    description: 'Tecnología única etíope (Castillos): la corte recorre el reino. Aldeanos +10% de velocidad; se entrenan un 10% más rápido.',
    cost: { food: 250, gold: 100 }, researchTime: 45, age: 2, researchedAt: 'townCenter',
    effects: [
      { type: 'stat', target: { ids: ['villager'] }, stat: 'speed', op: 'mul', value: 1.1 },
      { type: 'stat', target: { ids: ['villager'] }, stat: 'trainTime', op: 'mul', value: 0.9 },
    ],
  },
  {
    id: 'portugueseAlliance', name: 'Alianza portuguesa', icon: '🤝', civs: ETHIOPIA,
    description: 'Tecnología única etíope (Imperial): los 400 mosqueteros de Da Gama. Armas de fuego +1 de ataque y +1 de alcance.',
    cost: { food: 400, gold: 350 }, researchTime: 55, age: 3, researchedAt: 'gondarCastle',
    effects: [
      { type: 'stat', target: { classes: ['firearm'], kind: 'unit' }, stat: 'attack', op: 'add', value: 1 },
      { type: 'stat', target: { classes: ['firearm'], kind: 'unit' }, stat: 'range', op: 'add', value: 1 },
    ],
  },
  {
    id: 'horseBreeding', name: 'Cría de caballos', icon: '🐴', civs: ETHIOPIA,
    description: 'Tecnología única etíope (Pólvora): los caballos de las tierras bajas. Caballería +10% de PV y +5% de velocidad.',
    cost: { food: 300, gold: 150 }, researchTime: 50, age: 4, researchedAt: 'rasPalace',
    effects: [
      { type: 'stat', target: { classes: ['cavalry'], kind: 'unit' }, stat: 'hp', op: 'mul', value: 1.1 },
      { type: 'stat', target: { classes: ['cavalry'], kind: 'unit' }, stat: 'speed', op: 'mul', value: 1.05 },
    ],
  },
  {
    id: 'armsImport', name: 'Importación de armas', icon: '📦', civs: ETHIOPIA,
    description: 'Tecnología única etíope (Industrial): Menelik compra fusiles y cañones a media Europa. Armas de fuego y artillería -15% de coste.',
    cost: { food: 300, gold: 250 }, researchTime: 55, age: 5, researchedAt: 'djiboutiRailway',
    effects: [{ type: 'cost', target: { classes: ['firearm', 'artillery'], kind: 'unit' }, resource: '*', op: 'mul', value: 0.85 }],
  },
];
