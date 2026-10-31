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

const cheb = (a: Pt, b: Pt) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

/** Punto de la curva de Catmull-Rom (centrípeta no hace falta aquí: puntos casi equiespaciados) entre p1 y p2, t en 0..1. */
function catmull(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const t2 = t * t, t3 = t2 * t;
  const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return { x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) };
}

/**
 * Casillas de una poligonal que pasa por los vértices `points` (casillas), en orden, de una sola cadena
 * conectada en 8 direcciones (cada casilla toca a la siguiente, así que una diagonal también cierra el
 * paso: ver la regla de esquinas del A* en `pathfinding.ts`).
 *   · `curve`: en vez de rectas, una curva suave (Catmull-Rom) que pasa por todos los vértices.
 *   · `close`: la cierra uniendo el último vértice con el primero (recinto).
 * Las rectas son de Bresenham. En las curvas se quitan las casillas que sobran (las que no son un vértice
 * y cuyas vecinas ya se tocan entre sí), para que no queden escalones de más. Sin casillas repetidas (si dos
 * tramos pasan por la misma, queda una; el conjunto sigue conectado) y con un máximo.
 */
export function traceTiles(points: ReadonlyArray<Pt>, o: { curve?: boolean; close?: boolean; max?: number } = {}): Pt[] {
  const max = o.max ?? BALANCE.defense.maxLine;
  const pts = points.map(p => ({ x: Math.floor(p.x), y: Math.floor(p.y) })).filter((p, i, a) => !i || p.x !== a[i - 1].x || p.y !== a[i - 1].y);
  const closed = !!o.close && pts.length >= 3;
  if (closed && pts[0].x === pts[pts.length - 1].x && pts[0].y === pts[pts.length - 1].y) pts.pop();
  if (pts.length <= 1) return pts.slice();
  const raw: Pt[] = [pts[0]];
  const push = (t: Pt) => { const l = raw[raw.length - 1]; if (l.x !== t.x || l.y !== t.y) raw.push(t); };
  const n = pts.length, spans = closed ? n : n - 1;
  for (let i = 0; i < spans; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    if (o.curve && n >= 3) {
      const p0 = pts[closed ? (i + n - 1) % n : Math.max(0, i - 1)], p3 = pts[closed ? (i + 2) % n : Math.min(n - 1, i + 2)];
      const steps = Math.max(2, Math.ceil(cheb(a, b) * 2));
      let prev = a;
      for (let k = 1; k <= steps; k++) {
        const c = catmull(p0, a, b, p3, k / steps), t = { x: Math.round(c.x), y: Math.round(c.y) };
        // Una cadena sin saltos aunque la curva se salga de las casillas vecinas
        for (const q of lineTiles(prev.x, prev.y, t.x, t.y, 64).slice(1)) push(q);
        prev = t;
      }
    } else for (const q of lineTiles(a.x, a.y, b.x, b.y, 256).slice(1)) push(q);
  }
  if (closed && raw.length > 1 && raw[raw.length - 1].x === raw[0].x && raw[raw.length - 1].y === raw[0].y) raw.pop();
  let out = raw;
  if (o.curve) {
    const isVertex = (t: Pt) => pts.some(v => v.x === t.x && v.y === t.y);
    out = [raw[0]];
    for (let i = 1; i < raw.length; i++) {
      if (i + 1 < raw.length && !isVertex(raw[i]) && cheb(out[out.length - 1], raw[i + 1]) <= 1) continue;
      out.push(raw[i]);
    }
  }
  // Dos tramos de la poligonal pueden pasar por la misma casilla (cruces, vértices cercanos): una sola vez
  const seen = new Set<number>();
  return out.filter(t => { const k = t.y * 65536 + t.x; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, max);
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
