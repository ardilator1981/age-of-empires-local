import type { Game } from '../game/Game';
import type {
  AgeDef, BuildingDef, CivDef, GameMod, MapTypeDef, OrderHandler, ResourceDef, ResourceNodeDef,
  SetupConfig, SpriteFn, SystemFactory, TechDef, TerrainDef, UnitDef, VictoryDef,
} from './types';

/**
 * El Registry contiene TODO el contenido y comportamiento enchufable del juego.
 * Cada partida construye uno nuevo a partir de los mods activos (ver buildRegistry).
 */
export class Registry {
  resources = new Map<string, ResourceDef>();
  resourceNodes = new Map<string, ResourceNodeDef>();
  terrains: TerrainDef[] = [];
  private terrainIndex = new Map<string, number>();
  units = new Map<string, UnitDef>();
  buildings = new Map<string, BuildingDef>();
  techs = new Map<string, TechDef>();
  ages: AgeDef[] = [];
  civs = new Map<string, CivDef>();
  mapTypes = new Map<string, MapTypeDef>();
  victories = new Map<string, VictoryDef>();
  sprites = new Map<string, SpriteFn>();
  orders = new Map<string, OrderHandler>();
  systems: { id: string; priority: number; factory: SystemFactory }[] = [];
  gameStartHooks: ((game: Game) => void)[] = [];
  setup: SetupConfig = { townCenter: 'townCenter', startingUnits: [], baseResources: [] };
  private _upgradeTargets: Set<string> | null = null;

  addResource(d: ResourceDef) { this.resources.set(d.id, d); }
  addResourceNode(d: ResourceNodeDef) { this.resourceNodes.set(d.id, d); }
  addTerrain(d: TerrainDef) {
    const i = this.terrainIndex.get(d.id);
    if (i !== undefined) this.terrains[i] = d;
    else { this.terrainIndex.set(d.id, this.terrains.length); this.terrains.push(d); }
  }
  addUnit(d: UnitDef) { d.kind = 'unit'; this.units.set(d.id, d); this._upgradeTargets = null; }
  addBuilding(d: BuildingDef) { d.kind = 'building'; this.buildings.set(d.id, d); }
  addTech(d: TechDef) { d.kind = 'tech'; this.techs.set(d.id, d); this._upgradeTargets = null; }
  addAge(d: AgeDef) {
    this.ages = this.ages.filter(a => a.index !== d.index);
    this.ages.push(d);
    this.ages.sort((a, b) => a.index - b.index);
  }
  addCiv(d: CivDef) { this.civs.set(d.id, d); }
  addMapType(d: MapTypeDef) { this.mapTypes.set(d.id, d); }
  addVictory(d: VictoryDef) { this.victories.set(d.id, d); }
  addSprite(id: string, fn: SpriteFn) { this.sprites.set(id, fn); }
  addOrder(type: string, handler: OrderHandler) { this.orders.set(type, handler); }
  /** Los sistemas se ejecutan cada tick en orden de prioridad ascendente. */
  addSystem(id: string, factory: SystemFactory, priority = 100) {
    this.systems = this.systems.filter(s => s.id !== id);
    this.systems.push({ id, priority, factory });
  }
  removeSystem(id: string) { this.systems = this.systems.filter(s => s.id !== id); }
  onGameStart(fn: (game: Game) => void) { this.gameStartHooks.push(fn); }

  /** Modifica una definición ya registrada (útil para mods de balance). */
  patchUnit(id: string, fn: (d: UnitDef) => void) { fn(this.unit(id)); }
  patchBuilding(id: string, fn: (d: BuildingDef) => void) { fn(this.building(id)); }
  patchTech(id: string, fn: (d: TechDef) => void) { fn(this.tech(id)); }
  patchCiv(id: string, fn: (d: CivDef) => void) {
    const c = this.civs.get(id);
    if (!c) throw new Error(`Civilización desconocida: ${id}`);
    fn(c);
  }

  terrain(id: string): number {
    const i = this.terrainIndex.get(id);
    if (i === undefined) throw new Error(`Terreno desconocido: ${id}`);
    return i;
  }
  unit(id: string): UnitDef {
    const d = this.units.get(id);
    if (!d) throw new Error(`Unidad desconocida: ${id}`);
    return d;
  }
  building(id: string): BuildingDef {
    const d = this.buildings.get(id);
    if (!d) throw new Error(`Edificio desconocido: ${id}`);
    return d;
  }
  tech(id: string): TechDef {
    const d = this.techs.get(id);
    if (!d) throw new Error(`Tecnología desconocida: ${id}`);
    return d;
  }
  ageName(index: number): string {
    return this.ages.find(a => a.index === index)?.name ?? `Edad ${index}`;
  }

  /** Unidades que solo se obtienen mejorando otra (no aparecen como botón propio). */
  get upgradeTargets(): Set<string> {
    if (!this._upgradeTargets) {
      const s = new Set<string>();
      for (const t of this.techs.values()) for (const e of t.effects) if (e.type === 'upgrade') s.add(e.to);
      this._upgradeTargets = s;
    }
    return this._upgradeTargets;
  }

  /** Detecta referencias rotas entre definiciones (útil al crear mods). */
  validate(): string[] {
    const p: string[] = [];
    for (const u of this.units.values()) {
      for (const b of u.trainedAt) if (!this.buildings.has(b)) p.push(`Unidad ${u.id}: edificio "${b}" no existe`);
      if (!this.sprites.has(u.sprite)) p.push(`Unidad ${u.id}: sprite "${u.sprite}" no existe`);
      for (const t of u.requiresTechs ?? []) if (!this.techs.has(t)) p.push(`Unidad ${u.id}: tecnología "${t}" no existe`);
    }
    for (const b of this.buildings.values()) {
      if (!this.sprites.has(b.sprite)) p.push(`Edificio ${b.id}: sprite "${b.sprite}" no existe`);
      for (const r of b.requiresBuildings ?? []) if (!this.buildings.has(r)) p.push(`Edificio ${b.id}: requiere "${r}" que no existe`);
    }
    for (const t of this.techs.values()) {
      if (!this.buildings.has(t.researchedAt)) p.push(`Tecnología ${t.id}: edificio "${t.researchedAt}" no existe`);
      for (const r of t.requiresTechs ?? []) if (!this.techs.has(r)) p.push(`Tecnología ${t.id}: requiere "${r}" que no existe`);
      for (const e of t.effects) if (e.type === 'upgrade' && (!this.units.has(e.from) || !this.units.has(e.to))) p.push(`Tecnología ${t.id}: mejora ${e.from}→${e.to} inválida`);
    }
    for (const n of this.resourceNodes.values()) if (!this.sprites.has(n.sprite)) p.push(`Recurso ${n.id}: sprite "${n.sprite}" no existe`);
    return p;
  }
}

export function buildRegistry(mods: GameMod[]): Registry {
  const reg = new Registry();
  for (const m of mods) {
    try { m.register(reg); }
    catch (err) { console.error(`[mods] Error registrando el mod "${m.id}":`, err); }
  }
  reg.systems.sort((a, b) => a.priority - b.priority);
  const problems = reg.validate();
  if (problems.length) console.warn('[mods] Problemas de contenido:\n' + problems.join('\n'));
  return reg;
}
