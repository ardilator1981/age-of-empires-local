import { BALANCE } from '../../config/balance';
import type { OrderHandler, Pt, System } from '../../core/types';
import { edgeDist, face, moveTo, pathBudget, setOrder } from '../actions';
import type { Entity } from '../Entity';
import type { Game } from '../Game';
import { attackStep } from '../orders';
import { findPath, lineClear, smoothPath } from '../pathfinding';
import { assignSlots, freeWidth, safeSlot, toWorld, type FormationType, type Offset } from './formations';
import { reachOf, stanceOf, stanceTarget } from './stances';

/**
 * Grupos en formación. Un grupo tiene un centro "virtual" (el líder) que recorre el camino a la
 * velocidad de la unidad más lenta; cada unidad va a su hueco alrededor del centro.
 *
 * - Si los huecos caen en roca o agua, se usa la casilla libre más cercana.
 * - En un paso estrecho la formación se estrecha a columna y al salir recupera su forma.
 * - Al girar mucho, los huecos se reasignan de izquierda a derecha para que nadie se cruce.
 * - Si la tropa se queda atrás, el centro espera.
 *
 * Modos (órdenes tácticas):
 *   move     moverse en formación (sin pararse a luchar)
 *   attack   avanzar atacando: se detiene al encontrar enemigos y lucha según la postura
 *   patrol   ir y venir por una ruta atacando lo que encuentre
 *   retreat  retirada ordenada: no lucha y va al paso del más lento
 *   escort   escoltar a una unidad y defenderla
 *   zone     ir a un punto y defender la zona alrededor
 */

export type GroupMode = 'move' | 'attack' | 'patrol' | 'retreat' | 'escort' | 'zone';

export interface Group {
  id: number;
  owner: number;
  members: number[];
  type: FormationType;
  mode: GroupMode;
  route: Pt[];
  ri: number;
  pos: Pt;
  facing: Pt;
  path: Pt[];
  speed: number;
  /** Ancho forzado (columna en un paso estrecho). */
  narrow?: number;
  offsets: Map<number, Offset>;
  world: Map<number, Pt>;
  finalFacing?: Pt;
  /** Ancho de la formación completa (casillas): si el paso es más estrecho, se hace columna. */
  fullWidth: number;
  /** Dirección con la que se asignaron los huecos (para reasignar al girar). */
  assignedFacing: Pt;
  lastFight: number;
  arrivedAt?: number;
  escortId?: number;
  zone?: { x: number; y: number; r: number };
  nextCheck: number;
}

interface GroupStore { list: Map<number, Group>; next: number }

function store(game: Game): GroupStore {
  return (game.data.groups ??= { list: new Map(), next: 1 });
}

export function groupOf(game: Game, u: Entity): Group | undefined {
  return u.order?.type === 'formation' ? store(game).list.get(u.order.group) : undefined;
}

export function groups(game: Game): Group[] { return [...store(game).list.values()]; }

function speedOf(game: Game, u: Entity) { return game.players[u.owner].getStat(game.unitDef(u), 'speed'); }

function norm(v: Pt): Pt { const d = Math.hypot(v.x, v.y) || 1; return { x: v.x / d, y: v.y / d }; }

export interface GroupOptions {
  type: FormationType;
  mode: GroupMode;
  route: Pt[];
  escortId?: number;
  zoneRadius?: number;
  /** Hacia dónde mirar al llegar (por defecto, la dirección de la marcha). */
  finalFacing?: Pt;
}

/** Crea un grupo en formación con estas unidades (dejan cualquier orden o grupo anterior). */
export function createGroup(game: Game, units: Entity[], opts: GroupOptions): Group | null {
  units = units.filter(u => u.kind === 'unit' && !u.dead);
  if (!units.length || !opts.route.length) return null;
  const st = store(game);
  const cx = units.reduce((s, u) => s + u.x, 0) / units.length, cy = units.reduce((s, u) => s + u.y, 0) / units.length;
  const start = game.findFreeTile(cx, cy, 6) ?? { x: units[0].x, y: units[0].y };
  const first = opts.route[0];
  const facing = norm({ x: first.x - start.x, y: first.y - start.y });
  const grp: Group = {
    id: st.next++, owner: units[0].owner, members: units.map(u => u.id), type: opts.type, mode: opts.mode,
    route: opts.route.map(p => ({ x: p.x, y: p.y })), ri: 0, pos: start, facing, path: [],
    speed: Math.min(...units.map(u => speedOf(game, u))), offsets: new Map(), world: new Map(),
    assignedFacing: facing, lastFight: -99, nextCheck: 0, escortId: opts.escortId, fullWidth: 1,
    finalFacing: opts.finalFacing ? norm(opts.finalFacing) : undefined,
  };
  if (opts.mode === 'zone') grp.zone = { x: first.x, y: first.y, r: opts.zoneRadius ?? BALANCE.army.zoneRadius };
  grp.offsets = assignSlots(game, units, grp.type, facing);
  grp.fullWidth = widthOf(grp.offsets);
  st.list.set(grp.id, grp);
  for (const u of units) {
    setOrder(u, { type: 'formation', group: grp.id, target: 0, scanAt: 0 });
    delete u.data.speedCap;
  }
  placeSlots(game, grp, units);
  return grp;
}

/** Cambia la formación de un grupo existente. */
export function reshape(game: Game, grp: Group, type: FormationType) {
  grp.type = type;
  const units = grp.members.map(id => game.get(id)).filter((u): u is Entity => !!u);
  grp.fullWidth = widthOf(assignSlots(game, units, type, grp.facing));
  grp.offsets = assignSlots(game, units, type, grp.facing, grp.narrow);
  grp.assignedFacing = grp.facing;
}

/** Ancho lateral (casillas) que ocupan unos huecos. */
function widthOf(offsets: Map<number, Offset>): number {
  let lo = 0, hi = 0;
  for (const o of offsets.values()) { lo = Math.min(lo, o.lat); hi = Math.max(hi, o.lat); }
  return hi - lo + BALANCE.army.spacing;
}

function placeSlots(game: Game, grp: Group, units: Entity[]) {
  const used = new Set<number>();
  const reg = game.map.regionAt(grp.pos.x, grp.pos.y);
  grp.world.clear();
  for (const u of units) {
    const o = grp.offsets.get(u.id);
    if (!o) continue;
    grp.world.set(u.id, safeSlot(game, toWorld(grp.pos, grp.facing, o), reg, used));
  }
}

function dissolve(game: Game, grp: Group) {
  for (const id of grp.members) {
    const u = game.get(id);
    if (!u || u.order?.type !== 'formation' || u.order.group !== grp.id) continue;
    const slot = grp.world.get(id);
    setOrder(u, null);
    delete u.data.speedCap;
    if (slot) u.data.anchor = { x: slot.x, y: slot.y };
  }
  store(game).list.delete(grp.id);
}

/** Avanza el centro por su camino. Devuelve true si ha llegado al punto de ruta actual. */
function advance(game: Game, grp: Group, units: Entity[], dt: number): boolean {
  const wp = grp.route[grp.ri];
  if (!grp.path.length) {
    if (Math.hypot(wp.x - grp.pos.x, wp.y - grp.pos.y) < 0.35) return true;
    if (!pathBudget(game)) return false;
    const m = game.map, gx = Math.floor(wp.x), gy = Math.floor(wp.y), walk = m.walkable(gx, gy);
    const r = findPath(m, grp.pos.x, grp.pos.y, { x0: gx, y0: gy, x1: gx, y1: gy }, walk ? 0 : 1);
    const raw = r.path;
    if (walk && r.reached) { if (raw.length) raw[raw.length - 1] = { x: wp.x, y: wp.y }; else raw.push({ x: wp.x, y: wp.y }); }
    grp.path = smoothPath(m, grp.pos.x, grp.pos.y, raw);
    if (!grp.path.length) { grp.route[grp.ri] = { ...grp.pos }; return true; } // inalcanzable: se queda donde está
  }
  // Si la tropa va muy atrasada, el centro espera (va despacio)
  let lag = 0;
  for (const u of units) { const s = grp.world.get(u.id); if (s) lag += Math.hypot(u.x - s.x, u.y - s.y); }
  lag /= Math.max(1, units.length);
  let step = grp.speed * dt * (lag > BALANCE.army.regroupDistance ? BALANCE.army.regroupSpeed : 1);
  while (step > 0 && grp.path.length) {
    const t = grp.path[0], dx = t.x - grp.pos.x, dy = t.y - grp.pos.y, d = Math.hypot(dx, dy);
    if (d > 0.05) {
      // Giro suave hacia el siguiente tramo
      const want = { x: dx / d, y: dy / d };
      grp.facing = norm({ x: grp.facing.x * 0.8 + want.x * 0.2, y: grp.facing.y * 0.8 + want.y * 0.2 });
    }
    if (d <= step) { grp.pos = { x: t.x, y: t.y }; grp.path.shift(); step -= d; }
    else { grp.pos = { x: grp.pos.x + (dx / d) * step, y: grp.pos.y + (dy / d) * step }; step = 0; }
  }
  return !grp.path.length && Math.hypot(wp.x - grp.pos.x, wp.y - grp.pos.y) < 0.35;
}

/** Sistema: mueve los centros de las formaciones, estrecha en los pasos y reasigna al girar. */
export class FormationSystem implements System {
  constructor(private game: Game) {}
  update(dt: number) {
    const g = this.game;
    const st = g.data.groups as GroupStore | undefined;
    if (!st || !st.list.size) return;
    for (const grp of [...st.list.values()]) {
      const units = grp.members.map(id => g.get(id)).filter((u): u is Entity => !!u && u.order?.type === 'formation' && u.order.group === grp.id);
      if (!units.length) { st.list.delete(grp.id); continue; }
      let changed = units.length !== grp.members.length;
      if (changed) grp.members = units.map(u => u.id);
      grp.speed = Math.min(...units.map(u => speedOf(g, u)));
      if (units.some(u => u.order!.target)) grp.lastFight = g.time;
      const fighting = g.time - grp.lastFight < BALANCE.army.resumeAfter;

      // Escolta: el destino es detrás de la unidad protegida
      if (grp.mode === 'escort') {
        const t = g.get(grp.escortId);
        if (!t) { dissolve(g, grp); continue; }
        const back = norm({ x: grp.pos.x - t.x, y: grp.pos.y - t.y });
        const wp = { x: t.x + back.x * BALANCE.army.escortDistance, y: t.y + back.y * BALANCE.army.escortDistance };
        if (Math.hypot(wp.x - grp.route[0].x, wp.y - grp.route[0].y) > 1.5) { grp.route[0] = wp; grp.path = []; }
      }

      const halted = fighting && (grp.mode === 'attack' || grp.mode === 'patrol');
      if (grp.arrivedAt === undefined && !halted) {
        if (advance(g, grp, units, dt)) {
          if (grp.mode === 'patrol') { grp.ri = (grp.ri + 1) % grp.route.length; grp.path = []; }
          else if (grp.mode !== 'escort') {
            grp.arrivedAt = g.time;
            if (grp.finalFacing) { grp.facing = grp.finalFacing; changed = true; }
          }
        }
      }

      // Pasos estrechos: columna mientras no quepa la formación (y vuelta a la forma original al salir)
      if (g.time >= grp.nextCheck) {
        grp.nextCheck = g.time + 0.4;
        const ahead = { x: grp.pos.x + grp.facing.x * 1.5, y: grp.pos.y + grp.facing.y * 1.5 };
        const free = Math.min(freeWidth(g, grp.pos, grp.facing), freeWidth(g, ahead, grp.facing));
        const narrow = free < grp.fullWidth && grp.arrivedAt === undefined ? Math.max(1, Math.floor(free / BALANCE.army.spacing)) : undefined;
        if (narrow !== grp.narrow) { grp.narrow = narrow; changed = true; }
        // Giro grande: reasignar huecos para que nadie se cruce
        const dot = grp.facing.x * grp.assignedFacing.x + grp.facing.y * grp.assignedFacing.y;
        if (dot < Math.cos(Math.PI / 4)) changed = true;
      }
      if (changed) {
        if (units.length !== grp.offsets.size) grp.fullWidth = widthOf(assignSlots(g, units, grp.type, grp.facing));
        grp.offsets = assignSlots(g, units, grp.type, grp.facing, grp.narrow);
        grp.assignedFacing = grp.facing;
      }
      placeSlots(g, grp, units);

      // Llegada: cuando todos están en su sitio (o pasado un rato), se deshace el grupo
      if (grp.arrivedAt !== undefined && grp.mode !== 'zone') {
        let lag = 0;
        for (const u of units) { const s = grp.world.get(u.id); if (s) lag = Math.max(lag, Math.hypot(u.x - s.x, u.y - s.y)); }
        if (lag < 0.7 || g.time - grp.arrivedAt > 8) dissolve(g, grp);
      }
    }
  }
}

/** ¿Puede esta unidad pelear en este modo y contra este enemigo? */
function acceptFor(game: Game, grp: Group): ((e: Entity) => boolean) | null {
  if (grp.mode === 'retreat' || grp.mode === 'move') return null;
  if (grp.mode === 'zone' && grp.zone) {
    const z = grp.zone;
    return e => Math.hypot(e.x - z.x, e.y - z.y) <= z.r;
  }
  if (grp.mode === 'escort') {
    const t = game.get(grp.escortId);
    if (!t) return null;
    return e => Math.hypot(e.x - t.x, e.y - t.y) <= BALANCE.army.escortRadius;
  }
  return () => true;
}

/** Orden de cada unidad del grupo: ir a su hueco y, según el modo y su postura, luchar. */
export const formationOrder: OrderHandler = {
  update(game, u, o) {
    const grp = store(game).list.get(o.group);
    if (!grp) { setOrder(u, null); return; }
    const slot = grp.world.get(u.id) ?? grp.pos;

    // Combate según el modo del grupo y la postura de la unidad
    const accept = acceptFor(game, grp);
    if (accept) {
      let t = o.target ? game.get(o.target) : undefined;
      const st = stanceOf(u);
      if (t) {
        const leashOk = st === 'aggressive' || grp.mode === 'zone' && grp.zone ? true
          : Math.hypot(u.x - slot.x, u.y - slot.y) <= BALANCE.army.defensiveLeash;
        const zoneOk = !grp.zone || Math.hypot(t.x - grp.zone.x, t.y - grp.zone.y) <= grp.zone.r + 2;
        if (!leashOk || !zoneOk || !game.canAttack(u, t, false) || (st === 'hold' && edgeDist(u, t) > reachOf(game, u, t) + 0.05)) t = undefined;
      }
      if (!t && game.time >= (o.scanAt ?? 0)) {
        o.scanAt = game.time + 0.4;
        t = stanceTarget(game, u, slot, accept, grp.mode === 'attack' || grp.mode === 'patrol') ?? undefined;
        // En una zona o escoltando, todos acuden a lo que entra en el área protegida
        // (aunque esté más lejos de lo que ven o de su correa)
        const area = grp.zone ?? (grp.mode === 'escort' && game.get(grp.escortId)
          ? { x: game.get(grp.escortId)!.x, y: game.get(grp.escortId)!.y, r: BALANCE.army.escortRadius } : undefined);
        if (!t && area && st !== 'passive' && st !== 'hold') {
          const z = area;
          let best: Entity | undefined, bd = Infinity;
          for (const e of game.units) {
            if (e.dead || !game.canAttack(u, e, false) || Math.hypot(e.x - z.x, e.y - z.y) > z.r) continue;
            const d = Math.hypot(e.x - u.x, e.y - u.y);
            if (d < bd) { bd = d; best = e; }
          }
          t = best;
        }
      }
      if (t) {
        o.target = t.id;
        delete u.data.speedCap;
        const sub = { hold: st === 'hold', fails: o.fails } as any;
        if (attackStep(game, u, sub, t)) { o.fails = sub.fails; return; }
        o.fails = 0;
      }
      o.target = 0;
    } else o.target = 0;

    // A su hueco
    const d = Math.hypot(u.x - slot.x, u.y - slot.y);
    u.data.speedCap = d > 1.5 ? undefined : grp.speed;
    if (d < 0.2) {
      u.path = [];
      face(u, { x: u.x + grp.facing.x, y: u.y + grp.facing.y });
      return;
    }
    const goal = u.path[u.path.length - 1];
    const goalMoved = !goal || Math.hypot(goal.x - slot.x, goal.y - slot.y) > 0.3;
    if (!goalMoved && game.time < (o.repathAt ?? 0)) return;
    if (d < 5 && lineClear(game.map, u.x, u.y, slot.x, slot.y)) { u.path = [{ x: slot.x, y: slot.y }]; return; }
    if (game.time < (o.repathAt ?? 0) || !pathBudget(game)) return;
    o.repathAt = game.time + 1;
    moveTo(game, u, slot.x, slot.y);
  },
};
