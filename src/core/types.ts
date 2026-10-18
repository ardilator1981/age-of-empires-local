/**
 * Definiciones de datos del juego.
 *
 * Todo el contenido (recursos, unidades, edificios, tecnologías, civilizaciones,
 * mapas, condiciones de victoria...) se describe con estos tipos y se registra en
 * el `Registry` desde un mod. El motor nunca usa ids "a fuego": lee estas
 * definiciones, por lo que añadir contenido no requiere tocar el motor.
 */
import type { Game } from '../game/Game';
import type { Entity } from '../game/Entity';
import type { Player } from '../game/Player';
import type { MapGenerator } from '../game/MapGenerator';
import type { Registry } from './Registry';

export type ResourceId = string;
export type Cost = Partial<Record<ResourceId, number>>;
export interface Pt { x: number; y: number }

// ---------------------------------------------------------------- recursos

export interface ResourceDef {
  id: ResourceId;
  name: string;
  icon: string;
  color: string;
  /** Cantidad inicial según la opción de partida. */
  start: { low: number; standard: number; high: number };
}

/** Un nodo de recurso en el mapa: árbol, mina de oro, arbusto... */
export interface ResourceNodeDef {
  id: string;
  name: string;
  icon: string;
  resource: ResourceId;
  amount: number;
  /** Recursos por segundo que recoge un aldeano sin mejoras. */
  gatherRate: number;
  sprite: string;
  spriteParams?: Record<string, any>;
  /** Terreno que se pinta debajo al generar el mapa (p. ej. suelo de bosque). */
  groundTerrain?: string;
  /** Color en el minimapa. */
  minimapColor: string;
}

export interface TerrainDef {
  id: string;
  name: string;
  /** Color medio (minimapa y render sin WebGL). */
  color: [number, number, number];
  /** Variación aleatoria de brillo por casilla (0-40). */
  variance: number;
  walkable: boolean;
  buildable: boolean;
  /** Textura procedural ('grass', 'dirt', 'forest', 'sand', 'water', 'shallows', 'snow', 'rock', 'desert'...). */
  pattern?: string;
  /** Se anima como agua (olas, reflejos, espuma). */
  water?: boolean;
}

// ---------------------------------------------------------------- unidades y edificios

export type AttackType = 'melee' | 'pierce';
/** Daño extra contra objetivos que tengan la clase `vs`. */
export interface Bonus { vs: string; amount: number }

export interface CombatStats {
  attack?: number;
  attackType?: AttackType;
  /** Alcance en casillas. < 1 = cuerpo a cuerpo. */
  range?: number;
  /** Segundos entre ataques. */
  reloadTime?: number;
  bonus?: Bonus[];
  /** Estilo del proyectil ('arrow', 'axe', 'javelin'...). */
  projectile?: string;
}

export interface BaseDef extends CombatStats {
  id: string;
  /** Lo rellena el Registry. */
  kind?: 'unit' | 'building';
  name: string;
  description: string;
  icon: string;
  /** Clases para bonificaciones, tecnologías y reglas ('infantry', 'cavalry', 'building'...). */
  classes: string[];
  cost: Cost;
  hp: number;
  armor: { melee: number; pierce: number };
  /** Línea de visión en casillas. */
  los: number;
  /** Edad mínima (índice en registry.ages). */
  age: number;
  requiresTechs?: string[];
  /** Si se indica, solo estas civilizaciones lo tienen. */
  civs?: string[];
  sprite: string;
  spriteParams?: Record<string, any>;
}

export interface UnitDef extends BaseDef {
  trainTime: number;
  /** Casillas por segundo. */
  speed: number;
  pop: number;
  /** Ids de edificios donde se entrena. */
  trainedAt: string[];
  gatherer?: boolean;
  builder?: boolean;
  carryCapacity?: number;
  radius?: number;
}

export interface BuildingDef extends BaseDef {
  category: 'economy' | 'military';
  buildTime: number;
  /** Lado del edificio en casillas. */
  size: number;
  popProvided?: number;
  /** Recursos que se pueden depositar aquí. */
  dropSite?: ResourceId[];
  /** Las unidades pueden caminar por encima (granjas). */
  walkable?: boolean;
  /** El edificio es en sí un recurso (granjas). */
  gatherable?: { resource: ResourceId; amount: number; gatherRate: number };
  /** Hace falta tener construido al menos uno de cada uno de estos edificios. */
  requiresBuildings?: string[];
}

export type AnyDef = UnitDef | BuildingDef;

// ---------------------------------------------------------------- tecnologías y efectos

export type StatKey =
  | 'hp' | 'attack' | 'range' | 'speed' | 'los' | 'reloadTime'
  | 'armorMelee' | 'armorPierce' | 'trainTime' | 'buildTime'
  | 'popProvided' | 'carryCapacity';

/** A qué definiciones afecta un efecto. Sin ids ni clases = a todas las del tipo indicado. */
export interface Target {
  ids?: string[];
  classes?: string[];
  kind?: 'unit' | 'building' | 'tech';
}

export type Effect =
  | { type: 'stat'; target: Target; stat: StatKey; op: 'add' | 'mul' | 'set'; value: number }
  | { type: 'gatherRate'; resource: ResourceId | '*'; op: 'add' | 'mul'; value: number }
  | { type: 'cost'; target: Target; resource: ResourceId | '*'; op: 'add' | 'mul'; value: number }
  | { type: 'grant'; resources: Cost }
  | { type: 'upgrade'; from: string; to: string }
  | { type: 'custom'; apply: (game: Game, player: Player) => void };

export interface TechDef {
  id: string;
  kind?: 'tech';
  name: string;
  description: string;
  icon: string;
  cost: Cost;
  researchTime: number;
  age: number;
  /** Id del edificio donde se investiga. */
  researchedAt: string;
  requiresTechs?: string[];
  /** Hace falta tener `count` edificios distintos de la lista. */
  requiresBuildings?: { ids: string[]; count: number };
  effects: Effect[];
  /** Si se indica, al completarse el jugador pasa a esta edad. */
  setsAge?: number;
  civs?: string[];
  classes?: string[];
}

export interface AgeDef { index: number; id: string; name: string }

export interface CivDef {
  id: string;
  name: string;
  description: string;
  bonuses: Effect[];
  /** Texto de las bonificaciones para mostrar en el menú. */
  bonusText: string[];
}

// ---------------------------------------------------------------- mapas, victoria y partida

export interface MapTypeDef {
  id: string;
  name: string;
  description: string;
  generate(gen: MapGenerator): void;
}

export interface VictoryDef {
  id: string;
  name: string;
  description: string;
  isDefeated(game: Game, player: Player): boolean;
}

export interface BaseResourceSpec {
  node: string;
  count: number;
  minDist: number;
  maxDist: number;
}

/** Cómo empieza cada jugador. */
export interface SetupConfig {
  townCenter: string;
  startingUnits: { unit: string; count: number }[];
  baseResources: BaseResourceSpec[];
}

// ---------------------------------------------------------------- extensiones del motor

/** Una orden de una unidad. `type` elige el OrderHandler registrado. */
export interface Order { type: string; [key: string]: any }

export interface OrderHandler {
  update(game: Game, unit: Entity, order: Order, dt: number): void;
}

export interface System { update(dt: number): void }
export type SystemFactory = (game: Game) => System;

export interface SpriteContext {
  ctx: CanvasRenderingContext2D;
  /** Posición en pantalla del suelo de la entidad (pies de la unidad / centro del edificio). */
  x: number;
  y: number;
  /** Zoom actual. */
  z: number;
  time: number;
  /** Color del propietario. */
  color: string;
  /** null cuando se dibuja una previsualización (fantasma de construcción, retrato...). */
  entity: Entity | null;
  def: any;
  params: Record<string, any>;
  /** Proyecta coordenadas de mundo (casillas) a pantalla. */
  project: (wx: number, wy: number) => Pt;
  /** Huella del edificio en casillas. */
  foot?: { tx: number; ty: number; size: number };
  /** Edad del propietario (los edificios cambian de aspecto con la edad). */
  age: number;
}
export type SpriteFn = (s: SpriteContext) => void;

/** Un mod registra contenido y comportamiento en el Registry. */
export interface GameMod {
  id: string;
  name: string;
  description: string;
  /** Los mods core siempre están activos. */
  core?: boolean;
  defaultEnabled?: boolean;
  register(reg: Registry): void;
}
