import { BALANCE } from '../../config/balance';
import type { System } from '../../core/types';
import type { Game } from '../../game/Game';
import { kingOf, regicideOn, regicideState } from './rules';

/**
 * Avisos del modo "Matar al rey": caída de un rey y rey propio expuesto (sale de un edificio
 * destruido o está fuera y le atacan). Solo guarda a qué reyes caídos ya se ha avisado.
 */
export class RegicideSystem implements System {
  private told = new Set<number>();
  constructor(private game: Game) {
    // Si el edificio donde está el rey cae, sale: se le avisa al dueño (la IA no lo necesita)
    game.events.on('ungarrisoned', ({ entity, building }) => {
      if (!regicideOn(game) || entity.defId !== 'king' || !building.dead) return;
      const p = game.players[entity.owner];
      if (p.isHuman) game.warn(p, 'kingExposed', '👑 ¡Tu rey ha quedado expuesto! Llévalo a otro refugio', BALANCE.regicide.exposedWarnEvery, { x: entity.x, y: entity.y });
    });
  }
  save() { return this.told.size ? { told: [...this.told] } : undefined; }
  load(s: any) { this.told = new Set(s?.told ?? []); }
  update() {
    const g = this.game;
    const st = regicideState(g);
    if (!st || g.tick % 20 !== 0) return;
    for (const p of g.players.slice(1)) {
      if (this.told.has(p.id) || st.kings[p.id] === undefined || kingOf(g, p.id)) continue;
      this.told.add(p.id);
      g.notify(p.isHuman ? '👑 ¡Tu rey ha caído!' : `👑 ¡El rey de ${p.name} ha caído!`, undefined, p.isHuman ? 'warn' : 'good');
    }
  }
}
