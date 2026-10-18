import type { Game } from '../game/Game';
import { Minimap } from '../render/Minimap';
import { Renderer } from '../render/Renderer';
import { HUD } from '../ui/HUD';
import { Input } from '../ui/Input';
import { UIState } from '../ui/UIState';
import type { App } from './App';

/** Todo lo que vive mientras dura una partida: juego, render, interfaz y entrada. */
export class Session {
  readonly ui = new UIState();
  readonly renderer: Renderer;
  readonly minimap: Minimap;
  readonly hud: HUD;
  readonly input: Input;
  private onResize: () => void;

  constructor(public app: App, public game: Game) {
    this.renderer = new Renderer(document.getElementById('game') as HTMLCanvasElement, document.getElementById('terrain') as HTMLCanvasElement, game, this.ui);
    this.minimap = new Minimap(document.getElementById('minimap') as HTMLCanvasElement, game, this.renderer, this.ui);
    this.hud = new HUD(this);
    this.input = new Input(this);
    this.onResize = () => { this.renderer.resize(); this.minimap.resize(); };
    window.addEventListener('resize', this.onResize);
  }

  frame(dt: number, alpha: number) {
    this.input.update(dt);
    this.renderer.render(alpha);
    this.minimap.render();
    this.hud.update(dt);
  }

  dispose() {
    window.removeEventListener('resize', this.onResize);
    this.input.dispose();
    this.hud.dispose();
  }
}
