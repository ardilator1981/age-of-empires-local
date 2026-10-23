import type { AIPlugin, BuildingDef, Cost, TechDef, UnitDef } from '../../core/types';
import type { Game } from '../../game/Game';
import type { Player } from '../../game/Player';
import { buildingAvail, excludedBy, techAvail } from '../../game/rules';

/**
 * Era 4 · Pólvora (c. 1650–1800): ejércitos permanentes, fortalezas abaluartadas, mosquete con
 * bayoneta y mercantilismo. Árbol común a todas las civilizaciones (§2b de docs/civilizaciones.md);
 * lo único de cada una está en su archivo (`civ-*.ts`) y la capa de Rusia, al final de este.
 *
 * Quedan fuera hasta que el motor tenga mar: astillero oceánico, Navegación oceánica, fragata y
 * almirantazgo. El hierro de la «mina profunda» es una mejora del campamento minero.
 */

const FIREARM = ['firearm'];

export const gunpowderBuildings: BuildingDef[] = [
  {
    id: 'gunpowderWorks', name: 'Fábrica de pólvora', icon: '💥', category: 'military',
    description: 'Fabrica mosqueteros y cañones, y mejora la pólvora.',
    classes: ['building'], cost: { wood: 100, stone: 150, gold: 50 }, buildTime: 60, size: 3,
    hp: 1800, armor: { melee: 0, pierce: 8 }, los: 5, age: 4, requiresBuildings: ['blacksmith'],
    sprite: 'building', spriteParams: { style: 'smithy', wall: '#b9b2a2', roof: '#3d4650' },
  },
  {
    id: 'fortress', name: 'Fortaleza', icon: '🏯', category: 'military',
    description: 'Fortaleza abaluartada: muy resistente y con gran alcance. Aloja población.',
    classes: ['building', 'castle', 'fortress'], cost: { stone: 900 }, buildTime: 220, size: 4,
    hp: 6200, armor: { melee: 10, pierce: 13 }, los: 12, age: 4, popProvided: 20, requiresBuildings: ['castle'],
    attack: 14, attackType: 'pierce', range: 9, reloadTime: 2, projectile: 'bullet',
    sprite: 'building', spriteParams: { style: 'castle', inset: 0.04, wall: '#a8a294', roof: '#4a5560' },
  },
  {
    id: 'printingHouse', name: 'Imprenta', icon: '📰', category: 'economy',
    description: 'Difunde el saber: investiga la imprenta y abarata las tecnologías.',
    classes: ['building'], cost: { wood: 100, gold: 150 }, buildTime: 50, size: 3,
    hp: 1200, armor: { melee: 0, pierce: 7 }, los: 5, age: 4,
    sprite: 'building', spriteParams: { style: 'hall', height: 24, roofHeight: 18, wall: '#d6ccb2', roof: '#6a4a3a' },
  },
  {
    id: 'observatory', name: 'Observatorio', icon: '🔭', category: 'economy',
    description: 'Gran visión. Investiga cartografía y balística.',
    classes: ['building'], cost: { wood: 50, stone: 200 }, buildTime: 55, size: 2,
    hp: 900, armor: { melee: 1, pierce: 8 }, los: 14, age: 4,
    sprite: 'building', spriteParams: { style: 'tower', inset: 0.1, wall: '#cfc8b6', roof: '#3f5f8a' },
  },
  {
    id: 'tradingCompany', name: 'Compañía comercial', icon: '🏦', category: 'economy',
    description: 'Factoría de la compañía: depósito de oro y piedra, y comercio con el exterior.',
    classes: ['building'], cost: { wood: 100, stone: 150, gold: 50 }, buildTime: 60, size: 3,
    hp: 1400, armor: { melee: 0, pierce: 8 }, los: 5, age: 4, dropSite: ['gold', 'stone'],
    sprite: 'building', spriteParams: { style: 'hall', height: 22, roofHeight: 16, wall: '#e0d6bc', roof: '#8a3a2e' },
  },
  // ---- Rusia (rus)
  {
    id: 'engineerAcademy', name: 'Academia de ingenieros', icon: '📐', category: 'military', civs: ['rus'],
    description: 'Edificio único ruso (Pólvora): escuela de artillería de Pedro I. Fabrica el obús Unicornio.',
    classes: ['building'], cost: { wood: 100, stone: 200 }, buildTime: 70, size: 3,
    hp: 1800, armor: { melee: 1, pierce: 8 }, los: 6, age: 4, requiresBuildings: ['gunpowderWorks'],
    sprite: 'building', spriteParams: { style: 'hall', height: 26, roofHeight: 18, wall: '#e8e0cc', roof: '#2f6f5a' },
  },
];

export const gunpowderUnits: UnitDef[] = [
  {
    id: 'musketeer', name: 'Mosquetero', icon: '🔫', description: 'Infantería de línea con mosquete y bayoneta. Daño alto, recarga lenta.',
    classes: ['infantry', 'firearm'], cost: { food: 50, gold: 40 }, trainTime: 24, trainedAt: ['gunpowderWorks'],
    hp: 55, attack: 16, attackType: 'pierce', range: 6, reloadTime: 3, armor: { melee: 0, pierce: 1 },
    speed: 0.92, los: 7, pop: 1, age: 4, projectile: 'bullet',
    sprite: 'humanoid', spriteParams: { weapon: 'musket', hat: 'tricorn' },
  },
  {
    id: 'cannon', name: 'Cañón', icon: '💣', description: 'Artillería de campaña: destruye edificios y tropas a gran distancia.',
    classes: ['siege', 'artillery'], cost: { wood: 180, gold: 120 }, trainTime: 40, trainedAt: ['gunpowderWorks'],
    hp: 90, attack: 32, attackType: 'pierce', range: 9, reloadTime: 5, armor: { melee: 1, pierce: 4 },
    bonus: [{ vs: 'building', amount: 28 }], speed: 0.55, los: 5, pop: 2, age: 4, radius: 0.4, projectile: 'cannonball',
    sprite: 'cannon',
  },
  {
    id: 'dragoon', name: 'Dragón', icon: '🏇', description: 'Caballería montada con carabina: dispara a corta distancia y carga.',
    classes: ['cavalry', 'firearm'], cost: { food: 70, gold: 50 }, trainTime: 28, trainedAt: ['stable'],
    hp: 75, attack: 9, attackType: 'pierce', range: 4, reloadTime: 2, armor: { melee: 1, pierce: 2 },
    speed: 1.45, los: 6, pop: 1, age: 4, radius: 0.35, projectile: 'bullet',
    sprite: 'cavalry', spriteParams: { weapon: 'sword', horse: '#4a3a2c', helmet: true },
  },
  // ---- Rusia (rus)
  {
    id: 'grenadier', name: 'Granadero', icon: '💥', description: 'Unidad única rusa (Pólvora): infantería de élite de línea, de tiro potente.',
    classes: ['infantry', 'firearm'], civs: ['rus'], cost: { food: 55, gold: 50 }, trainTime: 24, trainedAt: ['castle'],
    hp: 65, attack: 18, attackType: 'pierce', range: 5, reloadTime: 3, armor: { melee: 1, pierce: 2 },
    speed: 0.95, los: 7, pop: 1, age: 4, projectile: 'bullet',
    sprite: 'humanoid', spriteParams: { weapon: 'musket', hat: 'mitre', cape: true },
  },
  {
    id: 'unicorn', name: 'Unicornio', icon: '💣', description: 'Unidad única rusa (Pólvora): obús ligero de Shuválov (años 1750). Eficaz contra edificios y tropas.',
    classes: ['siege', 'artillery'], civs: ['rus'], cost: { wood: 160, gold: 140 }, trainTime: 40, trainedAt: ['engineerAcademy'],
    hp: 80, attack: 26, attackType: 'pierce', range: 10, reloadTime: 4, armor: { melee: 1, pierce: 3 },
    bonus: [{ vs: 'building', amount: 22 }, { vs: 'infantry', amount: 8 }], speed: 0.6, los: 5, pop: 2, age: 4, radius: 0.4, projectile: 'cannonball',
    sprite: 'cannon', spriteParams: { howitzer: true, barrel: '#5a4a3a' },
  },
];

const tune = (classes: string[], stat: 'attack' | 'range' | 'armorMelee' | 'armorPierce' | 'los', value: number) =>
  ({ type: 'stat', target: { classes }, stat, op: 'add', value }) as const;

export const gunpowderTechs: TechDef[] = [
  {
    id: 'gunpowderAge', name: 'Edad de la Pólvora', icon: '💥', description: 'Avanza a la Edad de la Pólvora.',
    cost: { food: 1400, gold: 1000 }, researchTime: 210, age: 3, researchedAt: 'townCenter', setsAge: 4, effects: [],
    requiresBuildings: { ids: ['castle', 'siegeWorkshop', 'blacksmith'], count: 2 },
  },
  {
    id: 'printing', name: 'Imprenta', icon: '📰', description: 'Las tecnologías cuestan un 15% menos.',
    cost: { food: 300, gold: 200 }, researchTime: 50, age: 4, researchedAt: 'printingHouse',
    effects: [{ type: 'cost', target: { kind: 'tech' }, resource: '*', op: 'mul', value: 0.85 }],
  },
  {
    id: 'cartography', name: 'Cartografía', icon: '🗺️', description: 'Todas las unidades: +1 de visión.',
    cost: { food: 200, gold: 150 }, researchTime: 40, age: 4, researchedAt: 'observatory',
    effects: [{ type: 'stat', target: { kind: 'unit' }, stat: 'los', op: 'add', value: 1 }],
  },
  {
    id: 'ballistics', name: 'Balística', icon: '📐', description: 'Armas de fuego: +1 de ataque; artillería: +1 de alcance.',
    cost: { food: 300, gold: 300 }, researchTime: 55, age: 4, researchedAt: 'observatory',
    effects: [tune(FIREARM, 'attack', 1), tune(['artillery'], 'range', 1)],
  },
  {
    id: 'advancedMetallurgy', name: 'Metalurgia avanzada', icon: '🔥', description: 'Infantería, caballería y armas de fuego: +1 de ataque.',
    cost: { food: 400, gold: 250 }, researchTime: 70, age: 4, researchedAt: 'blacksmith', requiresTechs: ['ironCasting'],
    effects: [tune(['infantry', 'cavalry', 'firearm'], 'attack', 1)],
  },
  {
    id: 'bayonet', name: 'Bayoneta', icon: '🗡️', description: 'Infantería con arma de fuego: +2 de armadura cuerpo a cuerpo.',
    cost: { food: 250, gold: 150 }, researchTime: 45, age: 4, researchedAt: 'blacksmith',
    effects: [{ type: 'stat', target: { classes: ['firearm'], kind: 'unit' }, stat: 'armorMelee', op: 'add', value: 2 }],
  },
  {
    id: 'refinedPowder', name: 'Pólvora refinada', icon: '⚗️', description: 'Artillería: +4 de ataque. Armas de fuego: recarga un 10% más rápida.',
    cost: { food: 350, gold: 250 }, researchTime: 55, age: 4, researchedAt: 'gunpowderWorks',
    effects: [tune(['artillery'], 'attack', 4), { type: 'stat', target: { classes: ['firearm'], kind: 'unit' }, stat: 'reloadTime', op: 'mul', value: 0.9 }],
  },
  {
    id: 'bastionTheory', name: 'Fortificación abaluartada', icon: '📏', description: 'Torres, castillos, fortalezas y centros urbanos: +15% de PV y +1/+1 de armadura.',
    cost: { food: 300, stone: 400 }, researchTime: 60, age: 4, researchedAt: 'fortress',
    effects: [
      { type: 'stat', target: { classes: ['tower', 'castle', 'townCenter'], kind: 'building' }, stat: 'hp', op: 'mul', value: 1.15 },
      { type: 'stat', target: { classes: ['tower', 'castle', 'townCenter'], kind: 'building' }, stat: 'armorMelee', op: 'add', value: 1 },
      { type: 'stat', target: { classes: ['tower', 'castle', 'townCenter'], kind: 'building' }, stat: 'armorPierce', op: 'add', value: 1 },
    ],
  },
  {
    id: 'deepMining', name: 'Mina profunda', icon: '⛏️', description: 'Mineros de oro y piedra: +15% más rápidos (pozos y hierro).',
    cost: { food: 300, wood: 200 }, researchTime: 50, age: 4, researchedAt: 'miningCamp', requiresTechs: ['goldMining', 'stoneMining'],
    effects: [{ type: 'gatherRate', resource: 'gold', op: 'mul', value: 1.15 }, { type: 'gatherRate', resource: 'stone', op: 'mul', value: 1.15 }],
  },
  {
    id: 'mercantilism', name: 'Mercantilismo', icon: '⚖️', description: 'Compañías con privilegio: el oro se recoge un 15% más rápido.',
    cost: { wood: 300, gold: 100 }, researchTime: 60, age: 4, researchedAt: 'tradingCompany',
    effects: [{ type: 'gatherRate', resource: 'gold', op: 'mul', value: 1.15 }],
  },
];

/**
 * IA: construye lo de la era de la pólvora (y lo único de cada civilización) cuando le sobran
 * recursos. Las unidades las entrena la IA general, que ya prefiere las de la edad más alta.
 */
const WANTS: { id: string; minAge: number; spare: number; after?: string; tech?: string }[] = [
  { id: 'gunpowderWorks', minAge: 4, spare: 0 },
  { id: 'printingHouse', minAge: 4, spare: 60 },
  { id: 'tradingCompany', minAge: 4, spare: 60 },
  { id: 'observatory', minAge: 4, spare: 60 },
  { id: 'engineerAcademy', minAge: 4, spare: 200 },
  { id: 'royalManufacture', minAge: 4, spare: 250 },
  { id: 'bank', minAge: 4, spare: 250 },
  { id: 'cantonHong', minAge: 4, spare: 250 },
  { id: 'vaubanFortress', minAge: 4, spare: 500 },
  { id: 'fortress', minAge: 4, spare: 100 },
  // Era 5 (Industrial): la fábrica abre la era; el resto llega con ella
  { id: 'factory', minAge: 5, spare: 0 },
  { id: 'railwayStation', minAge: 5, spare: 40, after: 'factory' },
  { id: 'laboratory', minAge: 5, spare: 40, after: 'factory' },
  { id: 'airfield', minAge: 5, spare: 250, after: 'laboratory', tech: 'aviation' },
  { id: 'jiangnanArsenal', minAge: 5, spare: 200, after: 'factory' },
  { id: 'polytechnique', minAge: 5, spare: 250, after: 'factory' },
  { id: 'darulFunun', minAge: 5, spare: 250, after: 'factory' },
  { id: 'djiboutiRailway', minAge: 5, spare: 200, after: 'factory' },
  { id: 'transSiberian', minAge: 5, spare: 400, after: 'railwayStation' },
  { id: 'transcontinental', minAge: 5, spare: 400, after: 'railwayStation' },
  // Únicos de las eras anteriores de Persia y Etiopía: los construye al llegar a la Pólvora
  { id: 'maraghaObservatory', minAge: 2, spare: 250 },
  { id: 'maidan', minAge: 3, spare: 250 },
  { id: 'ordu', minAge: 4, spare: 250 },
  { id: 'gondarCastle', minAge: 3, spare: 300 },
  { id: 'rasPalace', minAge: 4, spare: 250 },
];

export const gunpowderAI: AIPlugin = {
  id: 'gunpowder',
  uses: WANTS.map(w => w.id),
  think(ctx) {
    const { game, player: p } = ctx;
    if (p.age < 4) return;
    // Primero la economía y el ejército básico (herrería); la fábrica de pólvora es lo primero de la era
    // y el resto de edificios llegan con ella y con aldeanos de sobra
    const base = ctx.villagers.length >= 20 && p.count('blacksmith') > 0;
    if (!base) return;
    const works = p.count('gunpowderWorks') > 0;
    let saveFor: Cost | null = null;
    for (const w of WANTS) {
      const def = game.reg.buildings.get(w.id);
      if (!def || p.age < w.minAge || p.countAll(w.id) > 0 || (p.pending.get(w.id) ?? 0) > 0) continue;
      if (w.id !== 'gunpowderWorks' && (!works || ctx.villagers.length < 24)) continue;
      if (w.after && p.count(w.after) === 0) continue;
      if (w.tech && !p.researched.has(w.tech)) continue;
      const av = buildingAvail(game, p, w.id);
      if (!av.visible) continue;
      const cost = p.getCost(def);
      if (!av.ok) {
        // Cumple los requisitos y solo le faltan recursos: aparta el coste del primero que quiera
        if (av.code === 'resources' && !saveFor) saveFor = cost;
        continue;
      }
      if (!Object.entries(cost).every(([r, v]) => (p.res[r] ?? 0) >= (v ?? 0) + w.spare)) continue;
      if (ctx.canSpend(cost) && ctx.build(w.id)) break;
    }
    if (saveFor) return { reserve: saveFor };
    // Tecnologías de la era y únicas de la civilización: la más barata que pueda pagar; si hay
    // ejército y no llega, aparta sus recursos para la siguiente
    const wanted = [...game.reg.techs.values()]
      .filter(t => t.setsAge === undefined && (t.age >= 4 || t.civs) && techAvail(game, p, t.id).visible)
      .filter((t, _i, all) => !excludedBy(game, p, t.id) && doctrineWins(game, p, t, all))
      .sort((a, b) => totalCost(p.getCost(a)) - totalCost(p.getCost(b)));
    for (const t of wanted) if (ctx.research(t.id)) return;
    const next = wanted.find(t => techAvail(game, p, t.id).ok === false && p.count(t.researchedAt) > 0 && !ctx.canSpend(p.getCost(t)));
    if (next && ctx.army.length >= 8) return { reserve: p.getCost(next) };
  },
};

/** Entre dos doctrinas que se excluyen, la IA elige la que más le conviene (`aiWeight`); si empatan, la de id menor. */
function doctrineWins(game: Game, p: Player, t: TechDef, all: TechDef[]): boolean {
  const w = (x: TechDef) => x.aiWeight?.(game, p) ?? 1;
  if (w(t) <= 0) return false;
  return !all.some(r => r.id !== t.id && (t.excludes?.includes(r.id) || r.excludes?.includes(t.id)) && (w(r) > w(t) || (w(r) === w(t) && r.id < t.id)));
}

const totalCost = (c: Record<string, number | undefined>) => Object.values(c).reduce<number>((s, v) => s + (v ?? 0), 0);
