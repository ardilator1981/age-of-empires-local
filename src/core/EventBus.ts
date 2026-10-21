import type { Entity } from '../game/Entity';
import type { Player } from '../game/Player';

/** Tipo de orden aceptada (cada una tiene su sonido de confirmación). */
export type OrderKind = 'move' | 'gather' | 'build' | 'attack';
/** Por qué no se ha podido hacer una acción. */
export type RejectReason = 'resources' | 'placement' | 'population' | 'requirement' | 'queue' | 'other';

/** Eventos del juego. Los mods pueden escuchar cualquiera y emitir los suyos propios. */
export interface GameEventMap {
  entityCreated: { entity: Entity };
  entityDied: { entity: Entity; killer?: Entity };
  /** Una unidad entra en el refugio de un edificio / sale de él. */
  garrisoned: { entity: Entity; building: Entity };
  ungarrisoned: { entity: Entity; building: Entity };
  unitTrained: { entity: Entity; building: Entity };
  buildingPlaced: { entity: Entity };
  buildingCompleted: { entity: Entity };
  techResearched: { player: Player; techId: string };
  ageReached: { player: Player; age: number };
  damaged: { target: Entity; attacker?: Entity; amount: number };
  playerDefeated: { player: Player };
  gameOver: { won: boolean };
  notify: { text: string; playerId?: number; tone?: 'info' | 'warn' | 'good'; at?: { x: number; y: number } };
  /** Un jugador ha dado una orden válida (mover, recolectar, construir, atacar). */
  orderIssued: { playerId: number; kind: OrderKind; at: { x: number; y: number } };
  /** Una acción de un jugador no se ha podido hacer (sin recursos, mal sitio, sin población...). */
  actionRejected: { playerId: number; reason: RejectReason; text: string };
  /** Se ha agotado un recurso. `area`: no queda nada igual cerca (mina, bosque o arbustos acabados; granja agotada). */
  resourceDepleted: { entity: Entity; playerId: number; resType: string; area: boolean };
  /** Ataque a algo de un jugador, con límite de frecuencia por tipo (`BALANCE.alerts`). */
  underAttack: { playerId: number; target: Entity; attacker?: Entity; kind: 'unit' | 'building' };
  /** Un aldeano se ha quedado sin trabajo. Preparado para el aviso de aldeanos inactivos: todavía no lo emite nadie. */
  villagerIdle: { entity: Entity };
  /** Un jugador ha lanzado un poder activo de su civilización (`PowerDef`). */
  powerUsed: { playerId: number; powerId: string; at?: { x: number; y: number } };
  [custom: string]: any;
}

type Handler<T> = (payload: T) => void;

export class EventBus {
  private handlers = new Map<string, Handler<any>[]>();
  /**
   * Filtro opcional: si devuelve false, el evento no llega a nadie. Lo usa la partida en red para
   * no repetir la confirmación de las órdenes propias, que ya se dio al dar la orden.
   */
  filter: ((evt: string, payload: any) => boolean) | null = null;

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
    if (this.filter && !this.filter(evt, payload)) return;
    const list = this.handlers.get(evt);
    if (list) for (const fn of [...list]) fn(payload);
  }
}
