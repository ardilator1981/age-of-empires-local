import { EventBus } from '../core/EventBus';
import type { Registry } from '../core/Registry';
import { MAX_BUILD_SLOPE } from '../core/constants';
import type { AnyDef, BuildingDef, CivDef, Pt, ResourceNodeDef, System, UnitDef } from '../core/types';
import { Entity } from './Entity';
import { GameMap } from './GameMap';
import { MapGenerator } from './MapGenerator';
import { Player } from './Player';
import type { Projectile } from './combat';

export interface PlayerSetup {
  name: string;
  civ: string;
  color: string;
  human: boolean;
  difficulty: 'easy' | 'normal' | 'hard';
}

export interface GameOptions {
  mapType: string;
  mapSize: number;
  players: PlayerSetup[];
  startingResources: 'low' | 'standard' | 'high';
  startAge: number;
  victory: string;
  visibility: 'normal' | 'explored' | 'revealed';
  popLimit: number;
  speed: number;
  seed: number;
  mods: string[];
}

export interface Decal {
  x: number; y: number; kind: 'corpse' | 'rubble'; color: string; time: number; size: number;
  /** Unidad muerta (para su animación de muerte, si el sprite la tiene). */
  defId?: string; owner?: number; facing?: number;
}

const GAIA_CIV: CivDef = { id: 'gaia', name: 'Naturaleza', description: '', bonuses: [], bonusText: [] };

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Estado completo de una partida + bucle de simulación. */
export class Game {
  readonly map: GameMap;
  readonly players: Player[] = [];
  readonly entities = new Map<number, Entity>();
  list: Entity[] = [];
  readonly events = new EventBus();
  systems: System[] = [];
  projectiles: Projectile[] = [];
  decals: Decal[] = [];
  time = 0;
  tick = 0;
  humanId = 1;
  over = false;
  rng: () => number;
  /** Almacén libre para sistemas y mods. */
  data: Record<string, any> = {};
  private nextId = 1;
  private anyDead = false;
  private kindCache: { units: Entity[]; buildings: Entity[]; nodes: Entity[]; actors: Entity[] } | null = null;

  constructor(public reg: Registry, public opts: GameOptions) {
    this.rng = mulberry32(opts.seed);
    this.map = new GameMap(opts.mapSize, opts.mapSize, reg);
    this.players.push(new Player(0, 'Naturaleza', '#aaaaaa', GAIA_CIV, false, 'normal', this.map.w, this.map.h));
    const firstCiv = [...reg.civs.values()][0];
    opts.players.forEach((ps, i) => {
      const civ = reg.civs.get(ps.civ) ?? firstCiv;
      const p = new Player(i + 1, ps.name, ps.color, civ, ps.human, ps.difficulty, this.map.w, this.map.h);
      for (const r of reg.resources.values()) p.res[r.id] = r.start[opts.startingResources];
      p.addEffects(civ.bonuses, this);
      for (const t of reg.techs.values()) {
        if (t.setsAge !== undefined && t.setsAge <= opts.startAge && (!t.civs || t.civs.includes(civ.id))) {
          p.researched.add(t.id);
          p.addEffects(t.effects, this);
        }
      }
      p.age = Math.min(opts.startAge, reg.ages.length - 1);
      this.players.push(p);
    });
    this.humanId = this.players.find(p => p.isHuman)?.id ?? 1;

    const mt = reg.mapTypes.get(opts.mapType) ?? [...reg.mapTypes.values()][0];
    mt.generate(new MapGenerator(this));

    if (opts.visibility !== 'normal') for (const p of this.players) p.explored.fill(1);
    this.systems = reg.systems.map(s => s.factory(this));
    for (const fn of reg.gameStartHooks) fn(this);
  }

  get human(): Player { return this.players[this.humanId]; }

  private kinds() {
    if (!this.kindCache) {
      const units: Entity[] = [], buildings: Entity[] = [], nodes: Entity[] = [];
      for (const e of this.list) (e.kind === 'unit' ? units : e.kind === 'building' ? buildings : nodes).push(e);
      this.kindCache = { units, buildings, nodes, actors: [...units, ...buildings] };
    }
    return this.kindCache;
  }
  /** Listas por tipo (pueden contener entidades muertas de este tick: comprueba e.dead). */
  get units(): Entity[] { return this.kinds().units; }
  get buildings(): Entity[] { return this.kinds().buildings; }
  get nodes(): Entity[] { return this.kinds().nodes; }
  /** Unidades + edificios. */
  get actors(): Entity[] { return this.kinds().actors; }

  update(dt: number) {
    this.tick++;
    this.time += dt;
    for (const e of this.units) { e.px = e.x; e.py = e.y; }
    for (const s of this.systems) s.update(dt);
    if (this.anyDead) {
      this.anyDead = false;
      this.list = this.list.filter(e => {
        if (e.dead) this.entities.delete(e.id);
        return !e.dead;
      });
      this.kindCache = null;
    }
    if (this.tick % 20 === 0) this.decals = this.decals.filter(d => this.time - d.time < 40);
  }

  // ------------------------------------------------------------ consultas

  get(id: number | undefined): Entity | undefined {
    if (!id) return undefined;
    const e = this.entities.get(id);
    return e && !e.dead ? e : undefined;
  }
  unitDef(e: Entity): UnitDef { return this.reg.unit(e.defId); }
  buildingDef(e: Entity): BuildingDef { return this.reg.building(e.defId); }
  nodeDef(e: Entity): ResourceNodeDef | undefined { return this.reg.resourceNodes.get(e.defId); }
  /** Definición de unidad o edificio (no nodos de recurso). */
  defOf(e: Entity): AnyDef { return e.kind === 'unit' ? this.reg.unit(e.defId) : this.reg.building(e.defId); }
  isEnemy(a: number, b: number): boolean { return a !== b && a !== 0 && b !== 0; }

  notify(text: string, playerId?: number, tone: 'info' | 'warn' | 'good' = 'info', at?: Pt) {
    this.events.emit('notify', { text, playerId, tone, at });
  }

  /** Aviso con límite de frecuencia por jugador y tipo. */
  warn(p: Player, key: string, text: string, every = 10, at?: Pt) {
    if (this.time - (p.warnedAt[key] ?? -999) < every) return;
    p.warnedAt[key] = this.time;
    this.notify(text, p.id, 'warn', at);
  }

  // ------------------------------------------------------------ creación

  private add(e: Entity) {
    this.entities.set(e.id, e);
    this.list.push(e);
    this.kindCache = null;
    this.events.emit('entityCreated', { entity: e });
  }

  spawnUnit(defId: string, owner: number, x: number, y: number): Entity {
    const def = this.reg.unit(defId);
    const e = new Entity(this.nextId++, 'unit', defId, owner);
    e.x = e.px = x; e.y = e.py = y;
    e.radius = def.radius ?? 0.22;
    e.maxHp = e.hp = this.players[owner].getStat(def, 'hp');
    e.scanAt = this.time + this.rng();
    this.add(e);
    return e;
  }

  placeBuilding(defId: string, owner: number, tx: number, ty: number, complete: boolean): Entity {
    const def = this.reg.building(defId);
    const e = new Entity(this.nextId++, 'building', defId, owner);
    e.tx = tx; e.ty = ty; e.size = def.size;
    e.x = e.px = tx + def.size / 2; e.y = e.py = ty + def.size / 2;
    e.maxHp = this.players[owner].getStat(def, 'hp');
    e.complete = complete;
    e.progress = complete ? 1 : 0;
    e.hp = complete ? e.maxHp : 1;
    if (def.gatherable) {
      e.resType = def.gatherable.resource;
      e.amount = e.initialAmount = def.gatherable.amount;
      e.gatherRate = def.gatherable.gatherRate;
    }
    this.occupy(e, true);
    this.pushUnitsOut(e);
    this.add(e);
    this.events.emit('buildingPlaced', { entity: e });
    return e;
  }

  spawnNode(nodeId: string, tx: number, ty: number, amount?: number): Entity {
    const def = this.reg.resourceNodes.get(nodeId);
    if (!def) throw new Error(`Recurso desconocido: ${nodeId}`);
    const e = new Entity(this.nextId++, 'resource', nodeId, 0);
    e.tx = tx; e.ty = ty; e.size = 1;
    e.x = e.px = tx + 0.5; e.y = e.py = ty + 0.5;
    e.resType = def.resource;
    e.amount = e.initialAmount = amount ?? def.amount;
    e.gatherRate = def.gatherRate;
    e.hp = e.maxHp = 1;
    this.occupy(e, true);
    this.add(e);
    return e;
  }

  completeBuilding(b: Entity) {
    b.complete = true;
    b.progress = 1;
    this.events.emit('buildingCompleted', { entity: b });
    const p = this.players[b.owner];
    if (p.isHuman) this.notify(`${this.buildingDef(b).name} terminado`, p.id, 'good');
  }

  // ------------------------------------------------------------ destrucción

  private blocksTiles(e: Entity): boolean {
    if (e.kind === 'resource') return true;
    return e.kind === 'building' && !this.reg.building(e.defId).walkable;
  }

  private occupy(e: Entity, on: boolean) {
    const m = this.map, blocks = this.blocksTiles(e);
    if (blocks) m.obstaclesChanged();
    for (let y = e.ty; y < e.ty + e.size; y++) {
      for (let x = e.tx; x < e.tx + e.size; x++) {
        if (!m.inBounds(x, y)) continue;
        const i = y * m.w + x;
        if (on) { m.occupant[i] = e.id; if (blocks) m.blocked[i]++; }
        else {
          if (m.occupant[i] === e.id) m.occupant[i] = 0;
          if (blocks && m.blocked[i] > 0) m.blocked[i]--;
        }
      }
    }
  }

  /** Elimina sin estadísticas ni restos (recursos agotados, etc.). */
  remove(e: Entity) {
    if (e.dead) return;
    e.dead = true;
    this.anyDead = true;
    if (e.kind !== 'unit') this.occupy(e, false);
  }

  kill(e: Entity, killer?: Entity) {
    if (e.dead) return;
    this.remove(e);
    const owner = this.players[e.owner];
    if (killer && e.owner !== 0) {
      const kp = this.players[killer.owner];
      if (e.kind === 'unit') { kp.stats.kills++; owner.stats.losses++; }
      else if (e.kind === 'building') kp.stats.razed++;
    }
    if (e.kind === 'unit') this.decals.push({ x: e.x, y: e.y, kind: 'corpse', color: owner.color, time: this.time, size: 1, defId: e.defId, owner: e.owner, facing: e.facing });
    else if (e.kind === 'building') this.decals.push({ x: e.x, y: e.y, kind: 'rubble', color: '#777', time: this.time, size: e.size });
    this.events.emit('entityDied', { entity: e, killer });
  }

  /** Recurso agotado (árbol talado, granja agotada...). */
  deplete(e: Entity) {
    this.remove(e);
    if (e.kind === 'building' && this.players[e.owner].isHuman) {
      this.notify(`Una ${this.buildingDef(e).name.toLowerCase()} se ha agotado`, e.owner, 'warn', { x: e.x, y: e.y });
    }
  }

  // ------------------------------------------------------------ utilidades del mundo

  canPlace(defId: string, tx: number, ty: number, playerId?: number): boolean {
    const def = this.reg.building(defId);
    const p = playerId !== undefined ? this.players[playerId] : undefined;
    for (let y = ty; y < ty + def.size; y++) {
      for (let x = tx; x < tx + def.size; x++) {
        if (!this.map.buildable(x, y)) return false;
        if (p?.isHuman && !p.explored[y * this.map.w + x]) return false;
      }
    }
    return this.map.slopeOf(tx, ty, def.size) <= MAX_BUILD_SLOPE;
  }

  /** Casilla caminable más cercana (búsqueda en anillos). */
  findFreeTile(cx: number, cy: number, maxR = 12): Pt | null {
    const fx = Math.floor(cx), fy = Math.floor(cy);
    for (let r = 0; r <= maxR; r++) {
      let best: Pt | null = null, bestD = Infinity;
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const x = fx + dx, y = fy + dy;
          if (!this.map.walkable(x, y)) continue;
          const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
          if (d < bestD) { bestD = d; best = { x: x + 0.5, y: y + 0.5 }; }
        }
      }
      if (best) return best;
    }
    return null;
  }

  private pushUnitsOut(b: Entity) {
    if (!this.blocksTiles(b)) return;
    for (const u of this.units) {
      if (u.dead) continue;
      if (u.x >= b.tx && u.x < b.tx + b.size && u.y >= b.ty && u.y < b.ty + b.size) {
        const p = this.findFreeTile(u.x, u.y, 8);
        if (p) { u.x = u.px = p.x; u.y = u.py = p.y; u.path = []; }
      }
    }
  }

  convertUnits(playerId: number, from: string, to: string) {
    const p = this.players[playerId];
    for (const e of this.units) {
      if (e.owner !== playerId || e.defId !== from) continue;
      const ratio = e.hp / e.maxHp;
      e.defId = to;
      e.maxHp = p.getStat(this.reg.unit(to), 'hp');
      e.hp = Math.max(1, ratio * e.maxHp);
    }
  }

  /** Reajusta los PV máximos tras investigar una tecnología. */
  refreshHp(playerId: number) {
    const p = this.players[playerId];
    for (const e of this.list) {
      if (e.owner !== playerId || e.kind === 'resource') continue;
      const max = p.getStat(this.defOf(e), 'hp');
      if (max === e.maxHp) continue;
      if (max > e.maxHp && (e.kind === 'unit' || e.complete)) e.hp += max - e.maxHp;
      e.maxHp = max;
      e.hp = Math.min(e.hp, max);
    }
  }
}
