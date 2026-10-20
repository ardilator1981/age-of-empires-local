import { Commands, type TacticalOrder } from '../commands';
import type { FormationType } from '../army/formations';
import type { Stance } from '../army/stances';
import type { Entity } from '../Entity';
import type { Game } from '../Game';

/**
 * Órdenes de jugador en datos simples (JSON), para enviarlas por la red o guardarlas en una
 * repetición. Cada una corresponde a una función de `Commands`; las entidades van por id.
 *
 * Al ejecutarla (`applyNetCommand`), la simulación comprueba quién la manda: solo se usan las
 * unidades y edificios de ese jugador que siguen vivos. Si el objetivo ha muerto mientras la orden
 * viajaba, la orden se descarta o, en el clic derecho, se convierte en mover.
 *
 * Prototipo para medir la viabilidad del multijugador (ver docs/multijugador.md): faltan las
 * órdenes propias de los mods (p. ej. declarar la guerra), que necesitarían registrarse en el
 * `Registry` como cualquier otro contenido.
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
  | { t: 'delete'; ids: number[] };

/** Entidades vivas de este jugador entre los ids dados. */
function own(game: Game, pid: number, ids: number[]): Entity[] {
  const out: Entity[] = [];
  for (const id of ids) {
    const e = game.get(id);
    if (e && e.owner === pid) out.push(e);
  }
  return out;
}

/** Ejecuta una orden de red del jugador `pid`. Devuelve si se ha podido ejecutar. */
export function applyNetCommand(game: Game, pid: number, c: NetCommand): boolean {
  if (game.players[pid]?.defeated) return false;
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
    case 'place': return !!Commands.placeBuilding(game, pid, c.building, c.tx, c.ty, own(game, pid, c.builders));
    case 'train': { const [b] = own(game, pid, [c.at]); return !!b && Commands.train(game, b, c.unit); }
    case 'research': { const [b] = own(game, pid, [c.at]); return !!b && Commands.research(game, b, c.tech); }
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
  }
}
