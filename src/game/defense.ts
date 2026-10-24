import type { Pt, System } from '../core/types';
import { BALANCE } from '../config/balance';
import { Commands } from './commands';
import { dealDamage } from './combat';
import type { Entity } from './Entity';
import type { Game } from './Game';
import { buildingAvail } from './rules';

/**
 * Defensas lineales: empalizadas, murallas, puertas y zanjas (`BuildingDef.line`, `gate`, `footDamage`).
 * Son edificios de una casilla que se levantan en línea; lo que las hace defensas lo dicen los datos del
 * mod (`mods/core/defenses.ts`) y el motor solo da lo genérico: trazar la línea, bloquear o cerrar
 * el paso (`GameMap.walkableFor`) y herir al pie del muro.
 */

/** Casillas de la recta de (ax, ay) a (bx, by), de Bresenham (conectadas en 8 direcciones). */
export function lineTiles(ax: number, ay: number, bx: number, by: number, max = BALANCE.defense.maxLine): Pt[] {
  const out: Pt[] = [];
  let x = Math.floor(ax), y = Math.floor(ay);
  const x1 = Math.floor(bx), y1 = Math.floor(by);
  const dx = Math.abs(x1 - x), dy = -Math.abs(y1 - y), sx = x < x1 ? 1 : -1, sy = y < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    out.push({ x, y });
    if ((x === x1 && y === y1) || out.length >= max) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
  return out;
}

/**
 * Levanta una línea de segmentos en las casillas dadas. Cada segmento se paga y se coloca por separado
 * (los que no caben o no se pueden pagar se saltan); los constructores empiezan por el primero y
 * siguen con los demás por su cuenta (`afterBuild`). Devuelve cuántos ha colocado.
 */
export function placeSegments(game: Game, pid: number, defId: string, tiles: ReadonlyArray<readonly [number, number]>, builders: Entity[]): number {
  const p = game.players[pid];
  let n = 0;
  for (const [tx, ty] of tiles.slice(0, BALANCE.defense.maxLine)) {
    if (!Number.isInteger(tx) || !Number.isInteger(ty)) continue;
    if (!buildingAvail(game, p, defId).ok || !game.canPlace(defId, tx, ty, pid)) continue;
    if (Commands.placeBuilding(game, pid, defId, tx, ty, n === 0 ? builders : [])) n++;
  }
  return n;
}

/** Como `placeSegments`, pero solo para edificios que se trazan en línea (lo que puede pedir un jugador). */
export function placeLine(game: Game, pid: number, defId: string, tiles: ReadonlyArray<readonly [number, number]>, builders: Entity[]): number {
  return game.reg.buildings.get(defId)?.line ? placeSegments(game, pid, defId, tiles, builders) : 0;
}

/**
 * Daño al pie del muro: cada segundo, los enemigos pegados a un edificio con `footDamage` (aceite
 * hirviendo, abrojos...) reciben ese daño por segundo, sin que la armadura lo reduzca.
 */
export class DefenseSystem implements System {
  constructor(private game: Game) {}
  update() {
    const g = this.game, every = BALANCE.defense.footEveryTicks;
    if (g.tick % every !== 0) return;
    const m = g.map, seconds = every / 20;
    const hit = new Set<number>();
    for (const u of g.units) {
      if (u.dead || u.inside || u.onWall || u.owner === 0 || g.unitDef(u).flying) continue;
      const ux = Math.floor(u.x), uy = Math.floor(u.y);
      hit.clear();
      let dmg = 0, from: Entity | null = null;
      for (let y = uy - 1; y <= uy + 1; y++) for (let x = ux - 1; x <= ux + 1; x++) {
        if (!m.inBounds(x, y)) continue;
        const b = g.entities.get(m.occupant[y * m.w + x]);
        if (!b || b.dead || b.kind !== 'building' || !b.complete || hit.has(b.id) || !g.isEnemy(b.owner, u.owner)) continue;
        hit.add(b.id);
        const d = g.players[b.owner].getStat(g.buildingDef(b), 'footDamage');
        if (d > 0) { dmg += d * seconds; from = from ?? b; }
      }
      if (from && dmg > 0) {
        dealDamage(g, u, { attack: dmg, type: 'melee', bonus: [], owner: from.owner, attackerId: from.id, ignoreArmor: true });
        g.events.emit('footBurn', { target: u, source: from });
      }
    }
  }
}
