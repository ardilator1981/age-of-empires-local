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
  /** La interfaz solo la muestra desde esta edad (hierro y carbón: era Industrial). */
  minAge?: number;
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
  /** Multiplica lo que se carga de golpe de este recurso (la carne se carga a hombros). */
  carryMul?: number;
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
  /**
   * Imagen de textura (ruta dentro de public/). Si no se indica se busca
   * `sprites/terrain/<pattern>.png|jpg|webp`; si no existe se usa la procedural.
   */
  texture?: string;
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
  /** Puede explorar sola el mapa (orden 'explore'), si se tienen estos edificios. */
  autoExplore?: { requiresBuildings?: string[] };
  /** Máximo de unidades de este tipo vivas (o en cola) a la vez por jugador. */
  maxAlive?: number;
  /** Si muere, segundos de espera para poder entrenar otra. */
  retrainCooldown?: number;
  /** Bonificación a las unidades propias cercanas (p. ej. el General). */
  aura?: UnitAura;
  /** No se puede eliminar con la orden «Eliminar» (p. ej. el rey: borrarlo sería rendirse). */
  undeletable?: boolean;
  /** Es un animal (salvaje, de la Naturaleza, o ganado de un jugador). Ver `WildlifeDef`. */
  wildlife?: WildlifeDef;
  /** Aunque no sea `gatherer`, puede cazar y llevar la carne (p. ej. la caballería de exploración). */
  hunting?: boolean;
  /** Vuela: ignora el terreno y las unidades de tierra, y solo la golpean armas a distancia (aviación básica). */
  flying?: boolean;
  /** Espía: invisible y no atacable salvo cerca de vigilancia enemiga (ver `game/espionage.ts`). */
  stealth?: boolean;
}

/** Comportamiento de un animal. Al morir deja un cadáver (nodo de recurso) recolectable. */
export interface WildlifeDef {
  /** Id del nodo de recurso que deja al morir (su cantidad de comida es la del nodo). */
  carcass: string;
  /**
   * 'flee': huye al ser herido; 'fight': contraataca a quien lo hiere (peligroso); 'passive': no
   * reacciona. La IA no caza los que luchan.
   */
  behavior: 'flee' | 'fight' | 'passive';
  /** Radio (casillas) del paseo alrededor de su sitio. */
  roam: number;
  /** Ganado de un jugador: un aldeano lo sacrifica al instante, sin atacarlo. */
  livestock?: boolean;
}

export interface UnitAura {
  radius: number;
  /** Multiplicador del ataque de las unidades dentro del aura. */
  attackMul?: number;
  /** Armadura extra (cuerpo a cuerpo y a distancia) dentro del aura. */
  armorAdd?: number;
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
  /** Máximo de edificios de este tipo (terminados o en obras) por jugador. */
  maxAlive?: number;
  /**
   * Refugio: las unidades propias con alguna de estas clases pueden entrar (órdenes `garrison` y
   * `ungarrison`), hasta `capacity` a la vez. Dentro no se las puede atacar ni se ven; si el
   * edificio cae, salen. Ver `game/garrison.ts`.
   */
  shelter?: { classes: string[]; capacity: number };
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
  /** Al recolectar de estos nodos (ids de `ResourceNodeDef`), el jugador recibe además `ratio` × lo recolectado en `resource`. */
  | { type: 'gatherYield'; nodes: string[]; resource: ResourceId; ratio: number }
  /** Las caravanas del jugador ganan `mul` veces más (multiplicativo; ver `game/trade.ts`). */
  | { type: 'tradeYield'; mul: number }
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
  /**
   * Doctrina excluyente: ids de tecnologías que dejan de estar disponibles al investigar esta
   * (y al revés: basta con que una de las dos lo declare, `rules.ts` mira las dos direcciones).
   */
  excludes?: string[];
  /** Solo para la IA: cuánto le conviene a este jugador (0 = no la quiere; mayor = más). Por defecto 1. */
  aiWeight?: (game: Game, player: Player) => number;
}

/**
 * Poder activo de una civilización (Tributo a la Horda, Tierra quemada...). Lo lanza el jugador con
 * la orden de mod `power` (viaja por la cola de turnos); el enfriamiento y los efectos con duración
 * viven en `player.data` y `game.data`, así que se guardan y entran en la huella de red.
 */
export interface PowerDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** Civilizaciones que lo tienen (todas si se omite). */
  civs?: string[];
  /** Disponible desde esta edad y hasta `maxAge` (inclusive). */
  minAge: number;
  maxAge?: number;
  cost?: Cost;
  /** Segundos hasta poder volver a usarlo. */
  cooldown: number;
  /** Pide un punto del mapa (`args.x`, `args.y`). */
  target?: 'point';
  /** Aplica el efecto. Devuelve un texto de rechazo, o null si se ha hecho (el coste y el enfriamiento los pone el motor). */
  apply(game: Game, player: Player, args: { x: number; y: number }): string | null;
}

export interface AgeDef { index: number; id: string; name: string }

/** La capa de una civilización en una era: su identidad de ese momento y lo que añade. */
export interface CivEraDef {
  /** Identidad vigente desde esta era («Principado de Moscú»). */
  name: string;
  description: string;
  bonuses: Effect[];
  bonusText: string[];
  /** Eras anteriores cuyos bonos deja de tener al llegar a esta («sustituye»). */
  replaces?: number[];
}

export interface CivDef {
  id: string;
  name: string;
  description: string;
  /** Bonos permanentes (el eje de la civilización). */
  bonuses: Effect[];
  /** Texto de las bonificaciones para mostrar en el menú. */
  bonusText: string[];
  /**
   * Capas por era, por índice de edad. Al subir de edad el jugador suma las de las eras ≤ la suya
   * (menos las que una posterior sustituya). Ver `Player.rebuildModifiers`.
   */
  eras?: Record<number, CivEraDef>;
}

// ---------------------------------------------------------------- mapas, victoria y partida

/** Lugar del mundo real del que sale un mapa (para el selector de regiones). */
export interface MapRegionInfo {
  lat: number;
  lon: number;
  /** Lado del recuadro jugable, en km. */
  sizeKm: number;
  category: string;
  country: string;
}

export interface MapTypeDef {
  id: string;
  name: string;
  description: string;
  /** Si el mapa necesita datos (p. ej. una región real), se cargan aquí antes de generarlo. */
  load?(): Promise<void>;
  /** Mapas de lugares reales: dónde están (se listan en el selector de regiones). */
  region?: MapRegionInfo;
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
  /** Animales salvajes que el generador reparte por el mapa (ver `MapGenerator.wildlife`). */
  wildlife?: WildlifeSpec[];
}

/** Manadas de animales salvajes. `base`: por cada jugador, a esa distancia; `map`: repartidas, lejos de las bases. */
export interface WildlifeSpec {
  unit: string;
  where: 'base' | 'map';
  /** Manadas por jugador (`base`) o en todo el mapa (`map`, por cada 48×48 casillas). */
  groups: number;
  /** Animales por manada, mínimo y máximo. */
  perGroup: [number, number];
  minDist: number;
  maxDist: number;
}

// ---------------------------------------------------------------- extensiones del motor

/** Una orden de una unidad. `type` elige el OrderHandler registrado. */
export interface Order { type: string; [key: string]: any }

export interface OrderHandler {
  update(game: Game, unit: Entity, order: Order, dt: number): void;
}

export interface System {
  update(dt: number): void;
  /** Estado interno que hay que guardar con la partida (datos simples). */
  save?(): unknown;
  /** Restaura lo devuelto por `save` al cargar una partida. */
  load?(state: any): void;
}
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
export interface SpriteFn {
  (s: SpriteContext): void;
  /**
   * Opcional: dibuja la animación de muerte `t` segundos después de morir (con
   * `s.entity` = null). Devuelve false si no tiene, y se dibuja el cadáver genérico.
   */
  death?: (s: SpriteContext, t: number, facing: number) => boolean;
}

/**
 * Regla de combate: ¿puede `attacker` atacar a `target`? Todas las registradas deben
 * permitirlo (además de que sean enemigos). `hitting` = va a golpear ya (si es false,
 * solo se pregunta si puede elegirlo como objetivo e ir a por él).
 */
export type CombatRule = (game: Game, attacker: Entity, target: Entity, hitting: boolean) => boolean;

/**
 * Orden propia de un mod (p. ej. declarar la guerra). En una partida en red viaja por la cola de
 * turnos y se ejecuta en el mismo tick en todos los clientes; contra la IA, al momento.
 * `args` son datos simples (JSON). Devuelve si se ha podido hacer.
 */
export type NetCommandHandler = (game: Game, playerId: number, args: any) => boolean;

/** Lo que una extensión de IA puede usar en cada "pensamiento" de un jugador IA. */
export interface AIContext {
  game: Game;
  player: Player;
  home: Pt;
  army: Entity[];
  villagers: Entity[];
  buildings: Entity[];
  /** Construye un edificio cerca de `near` (por defecto, la base). */
  build(defId: string, near?: Pt): boolean;
  /** Entrena una unidad en el primer edificio libre que pueda. */
  train(unitId: string): boolean;
  /** ¿Se puede gastar esto sin tocar la reserva para la siguiente edad? */
  canSpend(cost: Cost): boolean;
  /** Investiga una tecnología en un edificio terminado y libre que pueda; false si no se puede. */
  research(techId: string): boolean;
}

/** Extensión de la IA (la registra un mod). */
export interface AIPlugin {
  id: string;
  /** Ids de contenido que esta extensión construye, entrena o lanza (lo lee el catálogo; el código de `think` también se rastrea). */
  uses?: string[];
  /**
   * Se llama antes de entrenar el ejército. armyHandled: la IA no mueve el ejército por su
   * cuenta este turno; holdTraining: no entrena tropas este turno; reserve: recursos que la IA
   * no debe gastar en otra cosa (se aplica desde el siguiente turno).
   */
  think(ctx: AIContext): { armyHandled?: boolean; holdTraining?: boolean; reserve?: Cost } | void;
}

/** Panel de interfaz de un mod (HTML), que el HUD monta y refresca. */
export interface HudPanelDef {
  id: string;
  create(session: any): { el: HTMLElement; update(): void; dispose?(): void } | null;
}

/** Dibujo sobre el mundo (en el suelo, bajo las unidades) o sobre el minimapa. */
export interface OverlayContext {
  ctx: CanvasRenderingContext2D;
  game: Game;
  ui: any;
  zoom: number;
  /** Mundo (casillas) → pantalla, siguiendo el relieve. */
  project(x: number, y: number): Pt;
  /** Pantalla → mundo. */
  unproject(x: number, y: number): Pt;
}
export type OverlayFn = (o: OverlayContext) => void;

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
