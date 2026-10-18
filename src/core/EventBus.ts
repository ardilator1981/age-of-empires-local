import type { Entity } from '../game/Entity';
import type { Player } from '../game/Player';

/** Eventos del juego. Los mods pueden escuchar cualquiera y emitir los suyos propios. */
export interface GameEventMap {
  entityCreated: { entity: Entity };
  entityDied: { entity: Entity; killer?: Entity };
  unitTrained: { entity: Entity; building: Entity };
  buildingPlaced: { entity: Entity };
  buildingCompleted: { entity: Entity };
  techResearched: { player: Player; techId: string };
  ageReached: { player: Player; age: number };
  damaged: { target: Entity; attacker?: Entity; amount: number };
  playerDefeated: { player: Player };
  gameOver: { won: boolean };
  notify: { text: string; playerId?: number; tone?: 'info' | 'warn' | 'good'; at?: { x: number; y: number } };
  [custom: string]: any;
}

type Handler<T> = (payload: T) => void;

export class EventBus {
  private handlers = new Map<string, Handler<any>[]>();

  /** Suscribe y devuelve una función para cancelar la suscripción. */
  on<K extends keyof GameEventMap & string>(evt: K, fn: Handler<GameEventMap[K]>): () => void {
    const list = this.handlers.get(evt) ?? [];
    list.push(fn);
    this.handlers.set(evt, list);
    return () => {
      const l = this.handlers.get(evt);
      const i = l ? l.indexOf(fn) : -1;
      if (l && i >= 0) l.splice(i, 1);
    };
  }

  emit<K extends keyof GameEventMap & string>(evt: K, payload: GameEventMap[K]): void {
    const list = this.handlers.get(evt);
    if (list) for (const fn of [...list]) fn(payload);
  }
}
