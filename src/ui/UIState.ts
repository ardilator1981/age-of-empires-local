import type { Entity } from '../game/Entity';
import type { Game } from '../game/Game';

export interface Marker { x: number; y: number; t: number; color: string }

/** Estado de la interfaz compartido entre entrada, HUD y render. */
export class UIState {
  selection: number[] = [];
  placing: { defId: string; tx: number; ty: number; valid: boolean } | null = null;
  targeting: 'attackMove' | 'rally' | null = null;
  /** Elegir un punto del mapa para un mod (p. ej. el punto de batalla). El clic o toque llama a onPick. */
  pickPoint: { owner: string; onPick(p: { x: number; y: number }): void } | null = null;
  dragBox: { x0: number; y0: number; x1: number; y1: number } | null = null;
  mouse = { x: 0, y: 0, inside: false };
  page: 'main' | 'economy' | 'military' = 'main';
  groups: number[][] = Array.from({ length: 10 }, () => []);
  markers: Marker[] = [];
  pings: { x: number; y: number; t: number }[] = [];
  selectionVersion = 0;

  selected(game: Game): Entity[] {
    const out: Entity[] = [];
    for (const id of this.selection) {
      const e = game.get(id);
      if (e && !e.inside) out.push(e);
    }
    return out;
  }

  setSelection(ids: number[]) {
    this.selection = ids;
    this.page = 'main';
    this.placing = null;
    this.targeting = null;
    this.selectionVersion++;
  }
}
