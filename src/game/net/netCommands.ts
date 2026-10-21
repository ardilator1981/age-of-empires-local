import type { OrderKind } from '../../core/EventBus';
import type { Pt } from '../../core/types';
import { Commands, smartKind, type TacticalOrder } from '../commands';
import type { FormationType } from '../army/formations';
import type { Stance } from '../army/stances';
import type { Entity } from '../Entity';
import type { Game } from '../Game';
import { buildingAvail, techAvail, unitAvail } from '../rules';

/**
 * Órdenes de jugador en datos simples (JSON), para enviarlas por la red o guardarlas en una
 * repetición. Cada una corresponde a una función de `Commands`; las entidades van por id.
 * La interfaz siempre da las órdenes así: contra la IA se ejecutan al momento y en red viajan por
 * la cola de turnos (ver `app/orders.ts`).
 *
 * Al ejecutarla (`applyNetCommand`), la simulación comprueba quién la manda: solo se usan las
 * unidades y edificios de ese jugador que siguen vivos. Si el objetivo ha muerto mientras la orden
 * viajaba, la orden se descarta o, en el clic derecho, se convierte en mover.
 *
 * Además de las de `Commands` están las de la partida (pausa, velocidad, la IA juega por un
 * jugador) y las de los mods (`reg.addNetCommand`).
 */
export type NetCommand =
  | { t: 'smart'; units: number[]; x: number; y: number; target?: number }
  | { t: 'move' | 'attackMove'; units: number[]; x: number; y: number }
  | { t: 'attack' | 'gather' | 'build'; units: number[]; target: number }
  | { t: 'explore' | 'stop'; units: number[] }
  | { t: 'army'; units: number[]; order: TacticalOrder }
  | { t: 'formation'; units: number[]; formation: FormationType }
  | { t: 'stance'; units: number[]; stance: Stance }
  | { t: 'place'; building: string; tx: number; ty: number; builders: number[] }
  | { t: 'train'; at: number; unit: string }
  | { t: 'research'; at: number; tech: string }
  | { t: 'cancel'; at: number; index: number }
  | { t: 'rally'; at: number[]; x: number; y: number; target?: number }
  | { t: 'delete'; ids: number[] }
  /** Refugiarse en un edificio (`shelter`) / sacar a los refugiados de unos edificios. */
  | { t: 'garrison'; units: number[]; target: number }
  | { t: 'ungarrison'; at: number[] }
  /** Pausa (o la quita) para todos. */
  | { t: 'pause'; on: boolean }
  /** Velocidad de la partida para todos. */
  | { t: 'speed'; v: number }
  /** La IA juega por un jugador humano (se ha desconectado) o le devuelve el mando. */
  | { t: 'ai'; pid: number; on: boolean }
  /** Orden de un mod (`reg.addNetCommand`). */
  | { t: 'mod'; id: string; args: any };

/** Velocidades de juego posibles. */
export const NET_SPEED_RANGE: [number, number] = [0.5, 4];

/** Entidades vivas de este jugador entre los ids dados. */
function own(game: Game, pid: number, ids: number[]): Entity[] {
  const out: Entity[] = [];
  for (const id of ids) {
    const e = game.get(id);
    if (e && e.owner === pid) out.push(e);
  }
  return out;
}

/** Ids de unas entidades (para crear órdenes desde la interfaz). */
export const ids = (es: Entity[]): number[] => es.map(e => e.id);

/** Ejecuta una orden de red del jugador `pid`. Devuelve si se ha podido ejecutar. */
export function applyNetCommand(game: Game, pid: number, c: NetCommand): boolean {
  const p = game.players[pid];
  if (!p) return false;
  // Lo de la partida vale aunque el jugador haya caído (puede quitar la pausa, por ejemplo)
  switch (c.t) {
    case 'pause': {
      if (!!game.data.netPause === c.on) return false;
      if (c.on) game.data.netPause = { by: pid }; else delete game.data.netPause;
      game.notify(c.on ? `⏸ ${p.name} ha pausado la partida` : `▶ ${p.name} ha reanudado la partida`, undefined, 'info');
      return true;
    }
    case 'speed': {
      const v = Math.min(NET_SPEED_RANGE[1], Math.max(NET_SPEED_RANGE[0], Number(c.v) || 1));
      if (v === game.opts.speed) return false;
      game.opts.speed = v;
      game.notify(`⏩ ${p.name} ha cambiado la velocidad a ×${v}`, undefined, 'info');
      return true;
    }
    case 'ai': {
      const t = game.players[c.pid];
      if (!t || !t.isHuman || !!t.data.aiControl === c.on) return false;
      if (c.on) t.data.aiControl = true; else delete t.data.aiControl;
      game.notify(c.on ? `🤖 La IA juega ahora por ${t.name}` : `🎮 ${t.name} vuelve a tomar el mando`, undefined, 'info');
      return true;
    }
  }
  if (p.defeated) return false;
  switch (c.t) {
    case 'smart': {
      const units = own(game, pid, c.units);
      return !!units.length && Commands.smart(game, pid, units, c.x, c.y, game.get(c.target) ?? null) !== null;
    }
    case 'move': case 'attackMove': {
      const units = own(game, pid, c.units);
      if (!units.length) return false;
      Commands[c.t](game, units, c.x, c.y);
      return true;
    }
    case 'attack': case 'gather': case 'build': {
      const units = own(game, pid, c.units), target = game.get(c.target);
      if (!units.length || !target) return false;
      Commands[c.t](game, units, target);
      return true;
    }
    case 'explore': case 'stop': {
      const units = own(game, pid, c.units);
      if (!units.length) return false;
      Commands[c.t](game, units);
      return true;
    }
    case 'army': return !!Commands.army(game, own(game, pid, c.units), c.order);
    case 'formation': Commands.setFormation(game, own(game, pid, c.units), c.formation); return true;
    case 'stance': Commands.setStance(game, own(game, pid, c.units), c.stance); return true;
    case 'place': {
      const ok = !!Commands.placeBuilding(game, pid, c.building, c.tx, c.ty, own(game, pid, c.builders));
      if (!ok) {
        const a = buildingAvail(game, p, c.building);
        if (a.ok) game.reject(pid, 'placement', 'No se puede construir ahí');
        else game.rejectAvail(pid, a);
      }
      return ok;
    }
    case 'train': {
      const [b] = own(game, pid, [c.at]);
      if (!b) return false;
      const ok = Commands.train(game, b, c.unit);
      if (!ok) {
        const a = unitAvail(game, p, p.resolveUnit(c.unit));
        if (a.ok) game.reject(pid, 'queue', 'Cola llena'); else game.rejectAvail(pid, a);
      }
      return ok;
    }
    case 'research': {
      const [b] = own(game, pid, [c.at]);
      if (!b) return false;
      const ok = Commands.research(game, b, c.tech);
      if (!ok) game.rejectAvail(pid, techAvail(game, p, c.tech));
      return ok;
    }
    case 'cancel': { const [b] = own(game, pid, [c.at]); if (b) Commands.cancel(game, b, c.index); return !!b; }
    case 'rally': {
      const blds = own(game, pid, c.at).filter(b => b.kind === 'building');
      for (const b of blds) Commands.setRally(game, b, c.x, c.y, game.get(c.target) ?? null);
      return !!blds.length;
    }
    case 'delete': {
      const es = own(game, pid, c.ids);
      for (const e of es) Commands.delete(game, e);
      return !!es.length;
    }
    case 'garrison': {
      const units = own(game, pid, c.units), target = game.get(c.target);
      if (!units.length || !target || target.owner !== pid) return false;
      Commands.garrison(game, units, target);
      return true;
    }
    case 'ungarrison': {
      const blds = own(game, pid, c.at).filter(b => b.kind === 'building');
      Commands.ungarrison(game, blds);
      return !!blds.length;
    }
    case 'mod': {
      const fn = game.reg.netCommands.get(c.id);
      return !!fn && fn(game, pid, c.args);
    }
  }
  return false;
}

/**
 * Qué confirmación (sonido y marca) tendrá esta orden, sin ejecutarla. En red se da al momento,
 * aunque la orden se ejecute unos ticks después. null = no lleva confirmación.
 */
export function predictOrder(game: Game, pid: number, c: NetCommand): { kind: OrderKind; at: Pt } | null {
  switch (c.t) {
    case 'smart': {
      const target = game.get(c.target) ?? null;
      const kind = smartKind(game, pid, own(game, pid, c.units), target);
      return kind ? { kind, at: target ?? { x: c.x, y: c.y } } : null;
    }
    case 'attackMove': return { kind: 'attack', at: { x: c.x, y: c.y } };
    case 'army': {
      const at = c.order.points?.[0] ?? game.get(c.order.targetId);
      return at ? { kind: c.order.kind === 'attack' || c.order.kind === 'patrol' ? 'attack' : 'move', at: { x: at.x, y: at.y } } : null;
    }
    case 'place': {
      const size = game.reg.buildings.get(c.building)?.size ?? 1;
      return { kind: 'build', at: { x: c.tx + size / 2, y: c.ty + size / 2 } };
    }
    case 'rally': return { kind: 'move', at: { x: c.x, y: c.y } };
  }
  return null;
}
