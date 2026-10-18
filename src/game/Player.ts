import type { AnyDef, CivDef, Cost, Effect, StatKey, Target } from '../core/types';
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
  private cache = new Map<string, number>();

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

  addEffects(effects: Effect[], game: Game) {
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
      }
    }
    this.cache.clear();
    game.refreshHp(this.id);
  }
}
