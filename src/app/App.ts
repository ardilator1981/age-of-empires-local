import { TICK_DT } from '../core/constants';
import { buildRegistry } from '../core/Registry';
import { Music } from '../audio/Music';
import { Game, type GameOptions } from '../game/Game';
import { ALL_MODS } from '../mods';
import { Menu } from '../ui/Menu';
import { Session } from './Session';

/** Ciclo de vida de la aplicación: menú → partida → menú. */
export class App {
  session: Session | null = null;
  paused = false;
  menuOpen = true;
  readonly music = new Music();
  readonly menu: Menu;
  private acc = 0;
  private last = 0;
  private lastOptions: GameOptions | null = null;
  private hud = document.getElementById('hud')!;

  constructor() {
    this.menu = new Menu(this);
    this.hud.style.display = 'none';
    this.menu.showMain();
    requestAnimationFrame(this.loop);
    (window as any).app = this;
  }

  async start(opts: GameOptions) {
    const reg = buildRegistry(ALL_MODS.filter(m => m.core || opts.mods.includes(m.id)));
    // Los mapas reales cargan sus datos (incluidos en el juego: no hace falta red) antes de empezar
    await reg.mapTypes.get(opts.mapType)?.load?.();
    this.session?.dispose();
    this.session = null;
    const game = new Game(reg, opts);
    this.hud.style.display = '';
    this.session = new Session(this, game);
    this.music.attach(game);
    game.events.on('gameOver', ({ won }) => setTimeout(() => { if (this.session?.game === game) this.menu.showGameOver(won); }, 1500));
    this.lastOptions = opts;
    this.paused = false;
    this.music.setPaused(false);
    this.menuOpen = false;
    this.acc = 0;
    this.menu.hide();
    // Acceso desde la consola del navegador para depurar o probar mods
    (window as any).game = game;
  }

  restart() {
    if (this.lastOptions) void this.start({ ...this.lastOptions, seed: Math.floor(Math.random() * 1e9) });
  }

  toMenu() {
    this.session?.dispose();
    this.session = null;
    this.paused = false;
    this.music.setPaused(false);
    this.music.detach();
    this.menuOpen = true;
    this.hud.style.display = 'none';
    const c = document.getElementById('game') as HTMLCanvasElement;
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
    (document.getElementById('terrain') as HTMLCanvasElement).style.display = 'none';
    this.menu.showMain();
  }

  togglePause() {
    if (!this.session) return;
    if (this.menuOpen && !this.paused) return;
    this.paused = !this.paused;
    this.menuOpen = this.paused;
    this.music.setPaused(this.paused);
    if (this.paused) this.menu.showPause();
    else this.menu.hide();
  }

  private loop = (now: number) => {
    requestAnimationFrame(this.loop);
    const dt = Math.min(0.1, (now - this.last) / 1000 || 0);
    this.last = now;
    const s = this.session;
    if (!s) return;
    if (!this.paused && !this.menuOpen) {
      this.acc += dt * s.game.opts.speed;
      let steps = 0;
      while (this.acc >= TICK_DT && steps < 10) {
        s.game.update(TICK_DT);
        this.acc -= TICK_DT;
        steps++;
      }
      if (steps >= 10) this.acc = 0;
    }
    s.frame(dt, Math.min(1, this.acc / TICK_DT));
  };
}
