import type { Game } from '../game/Game';
import { applyNetCommand, type NetCommand } from '../game/net/netCommands';

/**
 * Adónde van las órdenes que da el jugador en la interfaz. Toda la interfaz (escritorio, móvil,
 * pantalla de estrategia, paneles de los mods) las da como `NetCommand` y no llama a `Commands`
 * directamente: así la misma interfaz sirve contra la IA y en red.
 */
export interface OrderSink {
  /** Partida en red: las órdenes se ejecutan unos ticks después, en todos los clientes a la vez. */
  readonly online: boolean;
  /**
   * Da una orden del jugador local. Contra la IA se ejecuta al momento y devuelve si se ha podido
   * hacer; en red se envía y devuelve null (el resultado se sabrá al ejecutarse).
   */
  send(cmd: NetCommand): boolean | null;
}

/** Contra la IA: la orden se ejecuta en el acto. */
export class LocalOrders implements OrderSink {
  readonly online = false;
  constructor(private game: Game) {}
  send(cmd: NetCommand): boolean { return applyNetCommand(this.game, this.game.humanId, cmd); }
}
