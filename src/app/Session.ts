import type { Game } from '../game/Game';
import { Minimap } from '../render/Minimap';
import { Renderer } from '../render/Renderer';
import { HUD } from '../ui/HUD';
import { Input } from '../ui/Input';
import { onLayoutChange } from '../ui/layout';
import { MobileHUD } from '../ui/MobileHUD';
import { StrategyScreen } from '../ui/StrategyScreen';
import { NetHud } from '../ui/NetHud';
import { NetGame } from '../net/NetGame';
import { UIState } from '../ui/UIState';
import type { App } from './App';
import { LocalOrders, type OrderSink } from './orders';

/** Todo lo que vive mientras dura una partida: juego, render, interfaz y entrada. */
export class Session {
  readonly ui = new UIState();
  readonly renderer: Renderer;
  readonly minimap: Minimap;
  readonly hud: HUD;
  readonly input: Input;
  /** Interfaz móvil: se crea siempre y solo se muestra (y actualiza) cuando la interfaz elegida es la móvil. */
  readonly mobile: MobileHUD;
  /** Pantalla de estrategia (formaciones, posturas y órdenes tácticas). */
  readonly strategy: StrategyScreen;
  /** Adónde van las órdenes del jugador (al momento contra la IA, por la red en línea). */
  orders: OrderSink;
  /** Partida en red: latencia, esperas y pausa para todos. */
  readonly netHud: NetHud | null;
  private onResize: () => void;
  private offLayout: () => void;

  constructor(public app: App, public game: Game, orders?: OrderSink) {
    this.orders = orders ?? new LocalOrders(game);
    this.renderer = new Renderer(document.getElementById('game') as HTMLCanvasElement, document.getElementById('terrain') as HTMLCanvasElement, game, this.ui);
    this.renderer.profile = () => app.quality.profile;
    this.renderer.resize();
    this.minimap = new Minimap(document.getElementById('minimap') as HTMLCanvasElement, game, this.renderer, this.ui);
    this.hud = new HUD(this);
    this.input = new Input(this);
    this.mobile = new MobileHUD(this);
    this.strategy = new StrategyScreen(this);
    this.netHud = this.orders instanceof NetGame ? new NetHud(this, this.orders) : null;
    this.onResize = () => { this.renderer.resize(); this.minimap.resize(); };
    window.addEventListener('resize', this.onResize);
    this.offLayout = onLayoutChange(() => { this.mobile.applyLayout(); this.onResize(); });
  }

  frame(dt: number, alpha: number) {
    this.input.update(dt);
    this.renderer.render(alpha);
    this.minimap.render();
    this.hud.update(dt);
    this.mobile.update(dt);
    this.strategy.update(dt);
    this.netHud?.update();
  }

  dispose() {
    window.removeEventListener('resize', this.onResize);
    this.offLayout();
    this.strategy.dispose();
    this.netHud?.dispose();
    this.mobile.dispose();
    this.input.dispose();
    this.hud.dispose();
  }
}
