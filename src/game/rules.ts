import type { RejectReason } from '../core/EventBus';
import type { Cost, UnitDef } from '../core/types';
import type { Game } from './Game';
import type { Player } from './Player';

/** Disponibilidad de una acción: si se muestra el botón, si se puede usar y por qué no. */
export interface Avail { visible: boolean; ok: boolean; reason?: string; code?: RejectReason }

const HIDDEN: Avail = { visible: false, ok: false };
const OK: Avail = { visible: true, ok: true };

export function civAllowed(def: { civs?: string[] }, p: Player): boolean {
  return !def.civs || def.civs.includes(p.civ.id);
}

/**
 * ¿Le faltan eras a la civilización? Las civilizaciones se incorporan con las eras que ya existen
 * y completan las siguientes a medida que se hacen: si la última capa que tiene es anterior a la
 * última edad del juego, está «incompleta» (docs/civilizaciones.md §10).
 */
export function civIncomplete(reg: { ages: { index: number }[] }, civ: { eras?: Record<number, unknown> }): boolean {
  const last = Math.max(...reg.ages.map(a => a.index));
  const mine = Object.keys(civ.eras ?? {}).map(Number);
  return mine.length > 0 && Math.max(...mine) < last;
}

export function costText(game: Game, cost: Cost): string {
  return Object.entries(cost)
    .filter(([, v]) => (v ?? 0) > 0)
    .map(([r, v]) => `${game.reg.resources.get(r)?.icon ?? r} ${v}`)
    .join('  ');
}

export function missingText(game: Game, p: Player, cost: Cost): string {
  const parts: string[] = [];
  for (const [r, v] of Object.entries(cost)) {
    const lack = (v ?? 0) - Math.floor(p.res[r] ?? 0);
    if (lack > 0) parts.push(`${lack} de ${(game.reg.resources.get(r)?.name ?? r).toLowerCase()}`);
  }
  return parts.length ? `Falta ${parts.join(', ')}` : '';
}

function ageCheck(game: Game, p: Player, age: number): Avail | null {
  return age > p.age ? { visible: true, ok: false, reason: `Requiere ${game.reg.ageName(age)}`, code: 'requirement' } : null;
}

function techsCheck(game: Game, p: Player, techs: string[] | undefined): Avail | null {
  for (const t of techs ?? []) {
    if (!p.researched.has(t)) return { visible: true, ok: false, reason: `Requiere ${game.reg.techs.get(t)?.name ?? t}`, code: 'requirement' };
  }
  return null;
}

function affordCheck(game: Game, p: Player, cost: Cost): Avail | null {
  return p.canAfford(cost) ? null : { visible: true, ok: false, reason: missingText(game, p, cost), code: 'resources' };
}

export function unitAvail(game: Game, p: Player, unitId: string): Avail {
  const def = game.reg.units.get(unitId);
  if (!def || !civAllowed(def, p)) return HIDDEN;
  return ageCheck(game, p, def.age) ?? techsCheck(game, p, def.requiresTechs) ?? limitCheck(game, p, def) ?? affordCheck(game, p, p.getCost(def)) ?? OK;
}

/** Unidades de este tipo en cola de entrenamiento. */
export function queuedUnits(game: Game, p: Player, unitId: string): number {
  let n = 0;
  for (const b of game.buildings) {
    if (b.dead || b.owner !== p.id) continue;
    for (const q of b.queue) if (q.kind === 'unit' && q.id === unitId) n++;
  }
  return n;
}

/** Límite de unidades vivas (`maxAlive`) y espera tras su muerte (`retrainCooldown`). */
function limitCheck(game: Game, p: Player, def: UnitDef): Avail | null {
  if (def.maxAlive !== undefined && p.count(def.id) + queuedUnits(game, p, def.id) >= def.maxAlive) {
    return { visible: true, ok: false, reason: def.maxAlive === 1 ? `Solo puedes tener un ${def.name}` : `Máximo ${def.maxAlive}`, code: 'requirement' };
  }
  const died = p.lastDeath[def.id];
  if (def.retrainCooldown && died !== undefined && game.time - died < def.retrainCooldown) {
    const s = Math.ceil(def.retrainCooldown - (game.time - died));
    return { visible: true, ok: false, reason: `Disponible en ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`, code: 'requirement' };
  }
  return null;
}

export function buildingAvail(game: Game, p: Player, id: string): Avail {
  const def = game.reg.buildings.get(id);
  if (!def || !civAllowed(def, p)) return HIDDEN;
  const a = ageCheck(game, p, def.age) ?? techsCheck(game, p, def.requiresTechs);
  if (a) return a;
  for (const b of def.requiresBuildings ?? []) {
    if (p.count(b) === 0) return { visible: true, ok: false, reason: `Requiere ${game.reg.buildings.get(b)?.name ?? b}`, code: 'requirement' };
  }
  if (def.maxAlive !== undefined && p.countAll(def.id) >= def.maxAlive) {
    return { visible: true, ok: false, reason: def.maxAlive === 1 ? `Solo puedes tener un ${def.name}` : `Máximo ${def.maxAlive}`, code: 'requirement' };
  }
  return affordCheck(game, p, p.getCost(def)) ?? OK;
}

/** ¿Pueden estas unidades explorar solas? (`autoExplore` en la definición) */
export function exploreAvail(game: Game, p: Player, unitId: string): Avail {
  const ae = game.reg.units.get(unitId)?.autoExplore;
  if (!ae) return HIDDEN;
  for (const b of ae.requiresBuildings ?? []) {
    if (p.count(b) === 0) return { visible: true, ok: false, reason: `Requiere ${game.reg.buildings.get(b)?.name ?? b}`, code: 'requirement' };
  }
  return OK;
}

export function techInProgress(game: Game, p: Player, techId: string): boolean {
  for (const e of game.buildings) {
    if (e.owner !== p.id || e.dead) continue;
    if (e.queue.some(q => q.kind === 'tech' && q.id === techId)) return true;
  }
  return false;
}

export function techAvail(game: Game, p: Player, id: string): Avail {
  const def = game.reg.techs.get(id);
  if (!def || !civAllowed(def, p) || p.researched.has(id) || techInProgress(game, p, id)) return HIDDEN;
  if (def.setsAge !== undefined && def.setsAge !== p.age + 1) return HIDDEN;
  for (const t of def.requiresTechs ?? []) if (!p.researched.has(t)) return HIDDEN;
  const a = ageCheck(game, p, def.age);
  if (a) return a;
  if (def.requiresBuildings) {
    const { ids, count } = def.requiresBuildings;
    const have = ids.filter(b => p.count(b) > 0).length;
    if (have < count) {
      const names = ids.map(b => game.reg.buildings.get(b)?.name ?? b).join(', ');
      return { visible: true, ok: false, reason: `Requiere ${count} edificio${count > 1 ? 's' : ''} de: ${names}`, code: 'requirement' };
    }
  }
  return affordCheck(game, p, p.getCost(def)) ?? OK;
}

/** Unidades que muestra un edificio (ya resueltas con las mejoras del jugador). */
export function trainablesAt(game: Game, p: Player, buildingDefId: string): string[] {
  const targets = game.reg.upgradeTargets;
  const out: string[] = [];
  for (const u of game.reg.units.values()) {
    if (!u.trainedAt.includes(buildingDefId) || targets.has(u.id) || !civAllowed(u, p)) continue;
    const id = p.resolveUnit(u.id);
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

export function researchablesAt(game: Game, p: Player, buildingDefId: string): string[] {
  const out: string[] = [];
  for (const t of game.reg.techs.values()) {
    if (t.researchedAt === buildingDefId && techAvail(game, p, t.id).visible) out.push(t.id);
  }
  return out;
}

export function buildablesFor(game: Game, p: Player, category: 'economy' | 'military'): string[] {
  const out: string[] = [];
  for (const b of game.reg.buildings.values()) {
    if (b.category === category && civAllowed(b, p)) out.push(b.id);
  }
  return out;
}
