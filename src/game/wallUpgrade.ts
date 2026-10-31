import { BALANCE } from '../config/balance';
import type { Cost } from '../core/types';
import { Commands } from './commands';
import type { Entity } from './Entity';
import type { Game } from './Game';
import { hypot } from './fmath';
import { upgradeAvail } from './rules';
import { leaveWall, postedOn, walkwayOf } from './walkway';

/**
 * Mejora en el sitio de las defensas (`BuildingDef.upgrade`): una empalizada se convierte en muralla de
 * piedra al llegar a Castillos, la de piedra en fortificada en la Edad Imperial, y las puertas igual.
 *
 * Modelo: pagar el coste por segmento marca el tramo (`data.upg = { to, p }`) y manda a unos aldeanos a
 * trabajar en él (orden `build`). **Mientras dura la obra el tramo sigue en pie con sus estadísticas
 * viejas** (sin estado vulnerable: un recinto no se abre por mejorarlo). Al llegar el progreso a 1 el
 * edificio cambia de `defId` en la misma casilla: conserva id, posición, salud proporcional y las unidades
 * del paso de ronda (bajan solo las que ya no quepan). No hay reembolso si el tramo cae durante la obra.
 */

/** Marca de mejora en curso de un tramo (undefined si no se está mejorando). */
export const upgrading = (e: Entity): { to: string; p: number } | undefined => e.data.upg;

/** Coste de mejorar un tramo de ese tipo para el jugador (con las tecnologías que lo abaratan). */
export function upgradeCost(game: Game, pid: number, defId: string): Cost {
  const up = game.reg.building(defId).upgrade;
  return up ? game.players[pid].getCost({ id: `${defId}:upgrade`, classes: ['wallUpgrade'], cost: up.cost }) : {};
}

/** Segundos de obra de la mejora de un tramo (la del edificio destino, con sus bonos de obra, por un factor). */
export function upgradeTime(game: Game, pid: number, defId: string): number {
  const up = game.reg.building(defId).upgrade;
  return up ? Math.max(1, game.players[pid].getStat(game.reg.building(up.to), 'buildTime') * BALANCE.defense.upgradeTimeFactor) : 1;
}

/** ¿Se puede mejorar este tramo ahora (edad, requisitos, terminado y sin otra mejora en curso)? No mira el dinero. */
export function canUpgrade(game: Game, e: Entity): boolean {
  if (e.dead || e.kind !== 'building' || !e.complete || e.data.upg) return false;
  return !!game.reg.buildings.get(e.defId)?.upgrade && upgradeAvail(game, game.players[e.owner], e.defId).ok;
}

/** Los tramos del mismo muro: los que se tocan (8 vecinos) con `seed`, sean del tipo que sean. Orden estable. */
export function connectedSegments(game: Game, seed: Entity): Entity[] {
  const m = game.map, key = (x: number, y: number) => y * m.w + x;
  const isWall = (e: Entity | undefined): e is Entity => !!e && !e.dead && e.kind === 'building' && e.owner === seed.owner && game.reg.building(e.defId).classes.includes('wall');
  if (!isWall(seed)) return [];
  const seen = new Set<number>([seed.id]), out = [seed];
  for (let i = 0; i < out.length; i++) {
    const c = out[i];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = c.tx + dx, y = c.ty + dy;
      if (!m.inBounds(x, y)) continue;
      const n = game.entities.get(m.occupant[key(x, y)]);
      if (isWall(n) && !seen.has(n.id)) { seen.add(n.id); out.push(n); }
    }
  }
  return out;
}

/** Aldeanos que se ocuparán de la obra si el jugador no da ninguno: los más cercanos que no estén ya construyendo. */
function autoBuilders(game: Game, pid: number, near: Entity): Entity[] {
  const vills = game.units.filter(u => !u.dead && u.owner === pid && !u.inside && game.unitDef(u).builder);
  const free = vills.filter(v => v.order?.type !== 'build');
  return (free.length ? free : vills).sort((a, b) => hypot(a.x - near.x, a.y - near.y) - hypot(b.x - near.x, b.y - near.y) || a.id - b.id).slice(0, BALANCE.defense.upgradeBuilders);
}

/**
 * Mejora los tramos dados (o, con `connected`, todos los que se tocan con ellos). Paga cada uno y se
 * detiene al faltar recursos. Devuelve cuántos ha empezado a mejorar.
 */
export function startUpgrade(game: Game, pid: number, segs: Entity[], connected: boolean, builders: Entity[]): number {
  const p = game.players[pid];
  let list = segs.filter(e => e.kind === 'building' && e.owner === pid);
  if (connected) {
    const seen = new Set<number>(), all: Entity[] = [];
    for (const s of list) for (const c of connectedSegments(game, s)) if (!seen.has(c.id)) { seen.add(c.id); all.push(c); }
    list = all;
  }
  list = list.filter(e => canUpgrade(game, e)).sort((a, b) => a.id - b.id).slice(0, BALANCE.defense.maxUpgrade);
  let n = 0;
  for (const e of list) {
    const cost = upgradeCost(game, pid, e.defId);
    if (!p.canAfford(cost)) { if (!n) game.reject(pid, 'resources', 'No tienes recursos para mejorar'); break; }
    p.pay(cost);
    e.data.upg = { to: game.reg.building(e.defId).upgrade!.to, p: 0 };
    n++;
  }
  if (!n) return 0;
  const marked = list.filter(e => e.data.upg);
  const crew = builders.length ? builders : autoBuilders(game, pid, marked[0]);
  // Cada obrero va al tramo en obra más cercano; al acabar, `afterBuild` sigue con los vecinos
  for (const u of crew) {
    let best: Entity | null = null, bd = Infinity;
    for (const e of marked) { const d = hypot(e.x - u.x, e.y - u.y); if (d < bd) { bd = d; best = e; } }
    if (best) Commands.build(game, [u], best);
  }
  return n;
}

/** Avanza la mejora de un tramo `dt` segundos de trabajo de un aldeano; al terminar cambia el edificio. */
export function workUpgrade(game: Game, e: Entity, dt: number) {
  const up = upgrading(e);
  if (!up) return;
  up.p = Math.min(1, up.p + dt / upgradeTime(game, e.owner, e.defId));
  if (up.p >= 1) finishUpgrade(game, e);
}

/** Cambia el tramo por su versión mejorada en el mismo sitio. */
export function finishUpgrade(game: Game, e: Entity) {
  const up = upgrading(e);
  if (!up) return;
  delete e.data.upg;
  const to = game.reg.building(up.to), p = game.players[e.owner];
  const ratio = e.maxHp > 0 ? e.hp / e.maxHp : 1;
  e.defId = to.id;
  e.maxHp = p.getStat(to, 'hp');
  e.hp = Math.max(1, e.maxHp * ratio);
  // Si el paso de ronda nuevo es menor (o no existe), bajan los que sobren
  const room = walkwayOf(game, e)?.capacity ?? 0;
  postedOn(game, e).slice(room).forEach(u => leaveWall(game, u));
  game.events.emit('buildingCompleted', { entity: e });
}
