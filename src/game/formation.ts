import type { Pt } from '../core/types';
import { createGroup } from './army/groups';
import type { FormationType } from './army/formations';
import type { Entity } from './Entity';
import type { Game } from './Game';

/**
 * Atajo para mover tropas en formación hasta un punto y dejarlas mirando hacia `facing`.
 * Las formaciones de verdad están en `army/` (formas, grupos, posturas y órdenes tácticas).
 */
export function moveInFormation(game: Game, units: Entity[], center: Pt, facing: Pt, type: FormationType = 'line') {
  createGroup(game, units, { type, mode: 'move', route: [center], finalFacing: facing });
}
