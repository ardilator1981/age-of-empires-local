import type { AnyDef, CivDef, CivEraDef, Cost, Effect, StatKey, Target } from '../core/types';
import type { Game } from './Game';

interface Matchable { id: string; kind?: string; classes?: string[] }

export function matchesTarget(def: Matchable, t: Target): boolean {
  if (t.kind && def.kind !== t.kind) return false;
  if (!t.ids && !t.classes) return true;
  if (t.ids?.includes(def.id)) return true;
  if (t.classes && def.classes && t.classes.some(c => def.classes!.includes(c))) return true;
  return false;
}

function baseStat(def: AnyDef, stat: StatKey): number {
  const d = def as any;
  switch (stat) {
    case 'hp': return def.hp;
    case 'attack': return def.attack ?? 0;
    case 'range': return def.range ?? 0;
    case 'speed': return d.speed ?? 0;
    case 'los': return def.los;
    case 'reloadTime': return def.reloadTime ?? 2;
    case 'armorMelee': return def.armor.melee;
    case 'armorPierce': return def.armor.pierce;
    case 'trainTime': return d.trainTime ?? 0;
    case 'buildTime': return d.buildTime ?? 0;
    case 'popProvided': return d.popProvided ?? 0;
    case 'carryCapacity': return d.carryCapacity ?? 0;
  }
}

/** Los efectos que son modificadores (se recalculan); el resto (`grant`, `upgrade`, `custom`) se aplica una vez. */
export function isModifier(e: Effect): boolean {
  return e.type === 'stat' || e.type === 'gatherRate' || e.type === 'cost' || e.type === 'gatherYield' || e.type === 'tradeYield';
}

function applyOp(v: number, op: 'add' | 'mul' | 'set', val: number): number {
  return op === 'add' ? v + val : op === 'mul' ? v * val : val;
}

/**
 * Estado de un jugador. Las estadísticas de unidades/edificios se calculan como
 * "valor base de la definición + modificadores" (civilización, tecnologías, mods).
 */
export class Player {
  res: Record<string, number> = {};
  age = 0;
  modifiers: Effect[] = [];
  researched = new Set<string>();
  /** Mejoras de unidad: militia → manAtArms... */
  upgrades = new Map<string, string>();
  popUsed = 0;
  popCap = 0;
  /** Unidades vivas y edificios terminados, por id de definición. */
  counts = new Map<string, number>();
  /** Edificios en construcción, por id de definición. */
  pending = new Map<string, number>();
  defeated = false;
  explored: Uint8Array;
  visible: Uint8Array;
  stats = { kills: 0, losses: 0, razed: 0, gathered: 0, trained: 0 };
  /** Marca de tiempo del último aviso de cada tipo (para no repetirlos). */
  warnedAt: Record<string, number> = {};
  /** Cuándo murió por última vez una unidad de cada tipo (para `retrainCooldown`). */
  lastDeath: Record<string, number> = {};
  /** Almacén libre para sistemas y mods. */
  data: Record<string, any> = {};
  /** Modificadores que no vienen de la civilización ni de las tecnologías (p. ej. el ritmo de la IA): sobreviven a `rebuildModifiers`. */
  private extraMods: Effect[] = [];
  private cache = new Map<string, number>();
  private yieldCache = new Map<string, { resource: string; ratio: number }[]>();

  constructor(
    public id: number,
    public name: string,
    public color: string,
    public civ: CivDef,
    public isHuman: boolean,
    public difficulty: string,
    mapW: number,
    mapH: number,
  ) {
    this.explored = new Uint8Array(mapW * mapH);
    this.visible = new Uint8Array(mapW * mapH);
  }

  /** Eras de la civilización que cuentan a esta edad: las ≤ edad, salvo las que una posterior sustituye. */
  activeEras(age = this.age): number[] {
    const eras = this.civ.eras;
    if (!eras) return [];
    const upTo = Object.keys(eras).map(Number).filter(i => i <= age).sort((a, b) => a - b);
    const replaced = new Set<number>();
    for (const i of upTo) for (const r of eras[i].replaces ?? []) replaced.add(r);
    return upTo.filter(i => !replaced.has(i));
  }

  /** La capa de identidad vigente: la de la era más alta ≤ la edad que tenga nombre. */
  get eraDef(): CivEraDef | undefined {
    const eras = this.civ.eras;
    if (!eras) return undefined;
    let best = -1;
    for (const k of Object.keys(eras)) { const i = Number(k); if (i <= this.age && i > best) best = i; }
    return best >= 0 ? eras[best] : undefined;
  }

  /** Nombre con el que se muestra la civilización ahora («Zarato ruso»; sin eras, el de la civilización). */
  get identity(): string { return this.eraDef?.name ?? this.civ.name; }

  count(defId: string): number { return this.counts.get(defId) ?? 0; }
  countAll(defId: string): number { return this.count(defId) + (this.pending.get(defId) ?? 0); }

  getStat(def: AnyDef, stat: StatKey): number {
    const key = def.id + ':' + stat;
    const hit = this.cache.get(key);
    if (hit !== undefined) return hit;
    let v = baseStat(def, stat);
    for (const m of this.modifiers) {
      if (m.type === 'stat' && m.stat === stat && matchesTarget(def, m.target)) v = applyOp(v, m.op, m.value);
    }
    this.cache.set(key, v);
    return v;
  }

  getCost(def: { id: string; kind?: string; classes?: string[]; cost: Cost }): Cost {
    const out: Cost = {};
    for (const [r, amt] of Object.entries(def.cost)) {
      let v = amt ?? 0;
      for (const m of this.modifiers) {
        if (m.type === 'cost' && (m.resource === '*' || m.resource === r) && matchesTarget(def, m.target)) {
          v = applyOp(v, m.op, m.value);
        }
      }
      out[r] = Math.max(0, Math.round(v));
    }
    return out;
  }

  gatherMult(res: string): number {
    let v = 1;
    for (const m of this.modifiers) {
      if (m.type === 'gatherRate' && (m.resource === '*' || m.resource === res)) {
        v = m.op === 'add' ? v + m.value : v * m.value;
      }
    }
    return v;
  }

  /** Multiplicador de las ganancias del comercio (efecto `tradeYield`). */
  tradeMult(): number {
    let v = 1;
    for (const m of this.modifiers) if (m.type === 'tradeYield') v *= m.mul;
    return v;
  }

  canAfford(cost: Cost): boolean {
    for (const [r, amt] of Object.entries(cost)) if ((this.res[r] ?? 0) < (amt ?? 0)) return false;
    return true;
  }
  pay(cost: Cost) { for (const [r, amt] of Object.entries(cost)) this.res[r] = (this.res[r] ?? 0) - (amt ?? 0); }
  refund(cost: Cost, frac = 1) {
    for (const [r, amt] of Object.entries(cost)) this.res[r] = (this.res[r] ?? 0) + Math.floor((amt ?? 0) * frac);
  }

  /** Sigue la cadena de mejoras: militia → manAtArms → longSwordsman. */
  resolveUnit(id: string): string {
    let cur = id;
    for (let i = 0; i < 10; i++) {
      const next = this.upgrades.get(cur);
      if (!next) break;
      cur = next;
    }
    return cur;
  }

  /** Rendimiento extra al recolectar de un nodo (ver el efecto `gatherYield`). */
  yieldBonuses(nodeId: string): { resource: string; ratio: number }[] {
    let out = this.yieldCache.get(nodeId);
    if (!out) {
      out = [];
      for (const m of this.modifiers) if (m.type === 'gatherYield' && m.nodes.includes(nodeId)) out.push({ resource: m.resource, ratio: m.ratio });
      this.yieldCache.set(nodeId, out);
    }
    return out;
  }

  /**
   * Recalcula los modificadores desde cero: civilización + capas de las eras activas + tecnologías
   * investigadas + los extra. Se llama al cambiar de edad y al cargar una partida (los
   * modificadores no se guardan). Los efectos de una sola vez (`grant`, `upgrade`, `custom`) no
   * se repiten: se aplican al conseguirlos (`addEffects`) y su resultado sí se guarda.
   */
  rebuildModifiers(game: Game) {
    const mods: Effect[] = [...this.extraMods];
    const take = (effects: Effect[]) => { for (const e of effects) if (isModifier(e)) mods.push(e); };
    take(this.civ.bonuses);
    for (const i of this.activeEras()) take(this.civ.eras![i].bonuses);
    for (const id of this.researched) { const t = game.reg.techs.get(id); if (t) take(t.effects); }
    this.modifiers = mods;
    this.cache.clear();
    this.yieldCache.clear();
    game.refreshHp(this.id);
  }

  /** Al entrar en una era: los efectos de una sola vez de su capa (los modificadores los recalcula `rebuildModifiers`). */
  applyEraOneOffs(era: number, game: Game) {
    const def = this.civ.eras?.[era];
    if (def) this.addEffects(def.bonuses.filter(e => !isModifier(e)), game);
  }

  addEffects(effects: Effect[], game: Game, extra = false) {
    for (const e of effects) {
      switch (e.type) {
        case 'grant':
          for (const [r, a] of Object.entries(e.resources)) this.res[r] = (this.res[r] ?? 0) + (a ?? 0);
          break;
        case 'upgrade':
          this.upgrades.set(e.from, e.to);
          game.convertUnits(this.id, e.from, e.to);
          break;
        case 'custom':
          e.apply(game, this);
          break;
        default:
          this.modifiers.push(e);
          if (extra) this.extraMods.push(e);
      }
    }
    this.cache.clear();
    this.yieldCache.clear();
    game.refreshHp(this.id);
    // Los modificadores siempre en el mismo orden (extra, civilización, eras, tecnologías): los
    // productos de decimales cambian en el último bit según el orden, y una partida cargada
    // (que los reconstruye así) tiene que seguir exactamente igual que la original.
    if (extra) this.rebuildModifiers(game);
  }
}
