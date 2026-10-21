import { BALANCE } from '../config/balance';
import { MELEE_RANGE } from '../core/constants';
import type { OrderHandler, System, WildlifeDef } from '../core/types';
import { ARRIVED, UNREACHABLE, approach, face, setOrder } from './actions';
import { dealDamage } from './combat';
import type { Entity } from './Entity';
import type { Game } from './Game';
import { cos, hypot, sin } from './fmath';

/**
 * Animales: salvajes (de la Naturaleza, jugador 0) y ganado de un jugador. Son unidades con
 * `wildlife` en su definición. Pasean, huyen o contraatacan según su comportamiento, y al morir
 * dejan un cadáver (nodo de recurso) que los aldeanos recolectan con la orden de recolección.
 */

/** Definición de animal de una entidad, si lo es. */
export function wildlifeOf(game: Game, e: Entity): WildlifeDef | undefined {
  return e.kind === 'unit' ? game.reg.units.get(e.defId)?.wildlife : undefined;
}

/** ¿Es un animal que `pid` puede cazar o sacrificar? (salvaje, o ganado propio) */
export function isHuntable(game: Game, pid: number, t: Entity): boolean {
  return !t.dead && !!wildlifeOf(game, t) && (t.owner === 0 || t.owner === pid);
}

/** ¿Puede esta unidad recolectar de este objetivo? Los cazadores (`hunting`) solo la carne. */
export function canGatherFrom(game: Game, u: Entity, t: Entity): boolean {
  const def = game.unitDef(u);
  if (t.kind === 'unit') return (def.gatherer || !!def.hunting) && isHuntable(game, u.owner, t);
  if (def.gatherer) return true;
  return !!def.hunting && ((t.kind === 'resource' && t.resType === 'food' && !!game.reg.resourceNodes.get(t.defId)?.carryMul));
}

/** Un paso de caza: acercarse al animal y golpearlo (o sacrificarlo, si es ganado). Devuelve false si hay que abandonar. */
export function huntStep(game: Game, u: Entity, o: { [k: string]: any }, t: Entity): boolean {
  const w = wildlifeOf(game, t);
  if (!w || !canGatherFrom(game, u, t) || (t.owner !== 0 && t.owner !== u.owner)) return false;
  // Si cae, el cazador busca su cadáver donde estaba
  o.lastX = t.x; o.lastY = t.y; o.nodeKind = w.carcass;
  const p = game.players[u.owner], def = game.unitDef(u);
  const range = p.getStat(def, 'range');
  const st = approach(game, u, t, range >= 1 ? range : MELEE_RANGE);
  if (st === UNREACHABLE) {
    o.fails = (o.fails ?? 0) + 1;
    return o.fails <= 3;
  }
  if (st !== ARRIVED) return true;
  o.fails = 0;
  face(u, t);
  if (w.livestock) { game.kill(t); return true; }
  u.working = true;
  if (u.cooldown <= 0) {
    u.attackAnim = 0.35;
    dealDamage(game, t, { attack: p.getStat(def, 'attack'), type: def.attackType ?? 'melee', bonus: [], owner: u.owner, attackerId: u.id });
    u.cooldown = p.getStat(def, 'reloadTime');
  }
  return true;
}

/** Orden interna del animal que contraataca: persigue a quien lo hirió y lo golpea. */
export const retaliateOrder: OrderHandler = {
  update(game, u, o) {
    const t = game.get(o.targetId);
    const home = u.data.home;
    if (!t || (home && hypot(t.x - home.x, t.y - home.y) > BALANCE.wildlife.chaseGiveUp + (u.data.roam ?? 0))) { setOrder(u, null); return; }
    const p = game.players[u.owner], def = game.unitDef(u);
    const st = approach(game, u, t, MELEE_RANGE);
    if (st === UNREACHABLE) { setOrder(u, null); return; }
    if (st !== ARRIVED) return;
    face(u, t);
    if (u.cooldown <= 0) {
      u.attackAnim = 0.35;
      dealDamage(game, t, { attack: p.getStat(def, 'attack'), type: def.attackType ?? 'melee', bonus: def.bonus ?? [], owner: u.owner, attackerId: u.id });
      u.cooldown = p.getStat(def, 'reloadTime');
    }
  },
};

/** Casilla libre (caminable y sin nada encima) lo más cerca posible de un punto. */
function freeTileNear(game: Game, x: number, y: number, maxR: number): { x: number; y: number } | null {
  const m = game.map, fx = Math.floor(x), fy = Math.floor(y);
  for (let r = 0; r <= maxR; r++) {
    let best: { x: number; y: number } | null = null, bd = Infinity;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const tx = fx + dx, ty = fy + dy;
      if (!m.walkable(tx, ty) || m.occupant[ty * m.w + tx]) continue;
      const d = hypot(tx + 0.5 - x, ty + 0.5 - y);
      if (d < bd) { bd = d; best = { x: tx, y: ty }; }
    }
    if (best) return best;
  }
  return null;
}

/** Pasea, huye o contraataca, y deja el cadáver al morir. */
export class WildlifeSystem implements System {
  constructor(private game: Game) {
    const ev = game.events;
    ev.on('entityDied', ({ entity }) => this.leaveCarcass(entity));
    ev.on('damaged', ({ target, attacker }) => this.react(target, attacker));
  }

  private leaveCarcass(e: Entity) {
    const g = this.game, w = wildlifeOf(g, e);
    if (!w || !g.reg.resourceNodes.has(w.carcass)) return;
    const t = freeTileNear(g, e.x, e.y, 3);
    if (t) g.spawnNode(w.carcass, t.x, t.y);
  }

  /** Un animal herido huye o se vuelve contra el agresor. */
  private react(t: Entity, attacker?: Entity) {
    const g = this.game, w = wildlifeOf(g, t);
    if (!w || !attacker || attacker.dead || t.dead || w.behavior === 'passive') return;
    t.data.threat = attacker.id;
    if (w.behavior === 'fight') {
      if (t.order?.type !== 'retaliate') setOrder(t, { type: 'retaliate', targetId: attacker.id });
      return;
    }
    // Huye en dirección contraria al agresor
    const dx = t.x - attacker.x, dy = t.y - attacker.y, d = hypot(dx, dy) || 1;
    const fd = BALANCE.wildlife.fleeDistance;
    const spot = g.findFreeTile(t.x + (dx / d) * fd, t.y + (dy / d) * fd, 4);
    if (!spot || g.map.region(Math.floor(spot.x), Math.floor(spot.y)) !== g.map.region(Math.floor(t.x), Math.floor(t.y))) return;
    t.data.home = { x: spot.x, y: spot.y };
    setOrder(t, { type: 'move', x: spot.x, y: spot.y });
  }

  update() {
    const g = this.game, m = g.map, [lo, hi] = BALANCE.wildlife.wanderEvery;
    for (const a of g.units) {
      if (a.dead || a.order || (g.tick + a.id) % 10 !== 0) continue;
      const w = g.reg.units.get(a.defId)?.wildlife;
      if (!w) continue;
      if (!a.data.home) { a.data.home = { x: a.x, y: a.y }; a.data.roam = w.roam; }
      if (g.time < (a.data.wanderAt ?? 0)) continue;
      a.data.wanderAt = g.time + lo + g.rng() * (hi - lo);
      if (w.roam <= 0) continue;
      const h = a.data.home, ang = g.rng() * Math.PI * 2, r = g.rng() * w.roam;
      const x = h.x + cos(ang) * r, y = h.y + sin(ang) * r;
      const tx = Math.floor(x), ty = Math.floor(y);
      if (!m.walkable(tx, ty) || m.region(tx, ty) !== m.region(Math.floor(a.x), Math.floor(a.y))) continue;
      setOrder(a, { type: 'move', x, y });
    }
  }
}
