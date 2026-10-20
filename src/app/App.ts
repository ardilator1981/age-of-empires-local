import { isTouchDevice, TICK_DT } from '../core/constants';
import { buildRegistry } from '../core/Registry';
import { AudioManager } from '../audio/AudioManager';
import { Game, type GameOptions } from '../game/Game';
import { snapshot, upgradeSave, type SaveData } from '../game/save';
import { QualityManager, QUALITY_NAMES } from '../render/quality';
import { uiPrefs } from '../ui/layout';
import { AUTO_SLOT, clearEmergency, deleteSlot, readSlot, warmUp, writeEmergency, writeSlot } from './saves';
import { ALL_MODS } from '../mods';
import { Menu } from '../ui/Menu';
import type { NetGame } from '../net/NetGame';
import { LocalOrders } from './orders';
import { Session } from './Session';

/** Cada cuánto se guarda la partida sola mientras se juega (además de al salir). */
const AUTOSAVE_EVERY_MS = 45_000;

/** Ciclo de vida de la aplicación: menú → partida → menú. */
export class App {
  session: Session | null = null;
  /** Partida en red en curso (o sala), si la hay. */
  net: NetGame | null = null;
  private netOffs: (() => void)[] = [];
  paused = false;
  menuOpen = true;
  /** Todo el sonido: música, efectos y alertas. */
  readonly audio = new AudioManager();
  readonly menu: Menu;
  private acc = 0;
  /** Multiplicador del tiempo (cámara lenta con la pantalla de estrategia abierta). */
  timeScale = 1;
  /** Calidad gráfica (automática o fija) y ahorro de batería. */
  readonly quality = new QualityManager(uiPrefs().quality, uiPrefs().battery, isTouchDevice(), () => this.session?.renderer.resize());
  private fpsEl: HTMLElement | null = null;
  private fpsAcc = 0;

  /** Contador de FPS en pantalla (ajustes). */
  private fpsMeter(dt: number) {
    if (!uiPrefs().showFps) { if (this.fpsEl) this.fpsEl.style.display = 'none'; return; }
    this.fpsEl ??= Object.assign(document.createElement('div'), { id: 'fps' });
    if (!this.fpsEl.isConnected) document.body.appendChild(this.fpsEl);
    this.fpsEl.style.display = '';
    this.fpsAcc += dt;
    if (this.fpsAcc < 0.5) return;
    this.fpsAcc = 0;
    const q = this.quality;
    const mem = (performance as any).memory?.usedJSHeapSize;
    this.fpsEl.textContent = `${Math.round(q.fps)} FPS · ${QUALITY_NAMES[q.level]}${q.pref === 'auto' ? ' (auto)' : ''}${q.battery ? ' · ahorro' : ''}${mem ? ` · ${Math.round(mem / 1048576)} MB` : ''}`;
  }
  private last = 0;
  private lastOptions: GameOptions | null = null;
  private hud = document.getElementById('hud')!;

  constructor() {
    this.menu = new Menu(this);
    this.hud.style.display = 'none';
    this.menu.showMain();
    requestAnimationFrame(this.loop);
    (window as any).app = this;
    // Guardado automático al pasar a segundo plano o cerrar (en el móvil, al cambiar de app).
    // En red se avisa al anfitrión: si tarda en volver, la IA juega por él
    document.addEventListener('visibilitychange', () => {
      const hidden = document.visibilityState === 'hidden';
      this.net?.setAway(hidden);
      if (hidden) this.autosave(true);
    });
    window.addEventListener('pagehide', () => this.autosave(true));
  }

  /** Empieza una partida nueva o, con `restore`, continúa una guardada. */
  async start(opts: GameOptions, restore?: SaveData) {
    this.leaveNet();
    const reg = buildRegistry(ALL_MODS.filter(m => m.core || opts.mods.includes(m.id)));
    // Los mapas reales cargan sus datos (incluidos en el juego: no hace falta red) antes de empezar
    if (!restore) await reg.mapTypes.get(opts.mapType)?.load?.();
    this.begin(new Game(reg, opts, restore));
  }

  /**
   * Partida en red: la sala (`ui/Lobby`) ya ha creado la `NetGame`. Cada vez que esta tiene una
   * partida (al empezar, o al volver a cargarla tras una reconexión o desincronización), se juega.
   */
  playNet(net: NetGame) {
    this.leaveNet();
    this.net = net;
    this.netOffs = [
      net.on('game', ({ game, resync }) => {
        const cam = resync ? this.session?.renderer.cam.center : null;
        this.begin(game, net);
        if (cam) this.session?.renderer.cam.centerOn(cam.x, cam.y);
      }),
      net.on('info', text => this.session?.game.notify(text, this.session.game.humanId, 'info')),
      net.on('hostLost', () => this.menu.showHostLost()),
    ];
  }

  /** Sale de la partida en red (o de la sala) si la hay. */
  leaveNet() {
    this.netOffs.forEach(f => f());
    this.netOffs = [];
    this.net?.leave();
    this.net = null;
  }

  /**
   * Se ha perdido al anfitrión: se sigue en local, contra la IA, que juega por los demás humanos.
   * La partida es la misma; solo deja de ser en red.
   */
  continueOffline() {
    const s = this.session;
    if (!s) return;
    const g = s.game;
    for (const p of g.players) if (p.isHuman && p.id !== g.humanId) p.data.aiControl = true;
    delete g.data.netPause;
    g.events.filter = null;
    g.opts.online = false;
    this.leaveNet();
    s.orders = new LocalOrders(g);
    this.menu.hide();
    this.paused = false;
    this.menuOpen = false;
    g.notify('Sigues en solitario: la IA juega por los demás', g.humanId, 'info');
  }

  private begin(game: Game, net?: NetGame) {
    this.session?.dispose();
    this.session = null;
    this.hud.style.display = '';
    const session = this.session = new Session(this, game, net);
    // El sonido del combate depende de lo que se esté mirando
    this.audio.attach(game, () => {
      const cam = session.renderer.cam, c = cam.center, corner = cam.screenToWorld(0, 0);
      return { x: c.x, y: c.y, r: Math.max(4, Math.hypot(corner.x - c.x, corner.y - c.y)) };
    });
    game.events.on('gameOver', ({ won }) => {
      // Una partida terminada ya no se puede continuar
      if (!net) { void deleteSlot(AUTO_SLOT).catch(() => {}); clearEmergency(); }
      setTimeout(() => { if (this.session?.game === game) this.menu.showGameOver(won); }, 1500);
    });
    // En red, quien cae puede seguir mirando mientras los demás juegan
    game.events.on('playerDefeated', ({ player }) => {
      if (net && player.id === game.humanId) setTimeout(() => { if (this.session?.game === game && !game.over) this.menu.showDefeated(); }, 1500);
    });
    this.lastAutosave = performance.now();
    if (!net) this.lastOptions = game.opts;
    this.paused = false;
    this.audio.setPaused(false);
    this.menuOpen = false;
    this.acc = 0;
    this.menu.hide();
    // Acceso desde la consola del navegador para depurar o probar mods
    (window as any).game = game;
  }

  // ------------------------------------------------------------ partidas guardadas

  private lastAutosave = 0;
  /** Almacenamiento listo (incluida la recuperación del guardado de urgencia). */
  ready: Promise<void> = warmUp();
  private saving = false;

  /** Guarda la partida en curso en una ranura. Devuelve un mensaje de error o null. */
  async saveTo(slot: string, name: string): Promise<string | null> {
    const g = this.session?.game;
    if (!g) return 'No hay ninguna partida en curso';
    if (g.over && slot === AUTO_SLOT) return null;
    if (this.saving) return null;
    this.saving = true;
    try {
      await writeSlot(slot, name, snapshot(g));
      return null;
    } catch (err) {
      console.error(err);
      return `No se pudo guardar: ${(err as Error).message ?? err}`;
    } finally {
      this.saving = false;
    }
  }

  /**
   * Guardado automático. Periódico: comprimido y sin prisa. Al salir (`leaving`): inmediato y sin
   * comprimir, para que dé tiempo antes de que el navegador cierre la página.
   */
  autosave(leaving = false) {
    // Las partidas en red no se guardan solas (no se pueden continuar sin los demás)
    if (!this.session || this.session.game.over || this.net) return;
    this.lastAutosave = performance.now();
    if (leaving) {
      const save = snapshot(this.session.game);
      if (writeEmergency(save)) return;
      void writeSlot(AUTO_SLOT, 'Guardado automático', save).catch(() => {});
      return;
    }
    void this.saveTo(AUTO_SLOT, 'Guardado automático').then(err => { if (!err) clearEmergency(); });
  }

  /** Carga una partida guardada. Devuelve un mensaje de error o null. */
  async load(slot: string): Promise<string | null> {
    let save: SaveData | null;
    try { save = await readSlot(slot); } catch (err) { return `No se pudo leer la partida: ${(err as Error).message}`; }
    if (!save) return 'La ranura está vacía';
    const up = upgradeSave(save);
    if (typeof up === 'string') return up;
    const missing = up.opts.mods.filter(id => !ALL_MODS.some(m => m.id === id));
    if (missing.length) console.warn('[partida] Mods que ya no existen:', missing);
    up.opts.mods = up.opts.mods.filter(id => ALL_MODS.some(m => m.id === id));
    try {
      await this.start(up.opts, up);
    } catch (err) {
      console.error(err);
      return 'La partida no se pudo reconstruir';
    }
    return null;
  }

  restart() {
    if (this.net) return;
    if (this.lastOptions) void this.start({ ...this.lastOptions, seed: Math.floor(Math.random() * 1e9) });
  }

  toMenu() {
    // Salir a propósito: al recargar ya no se vuelve a la sala
    try { sessionStorage.removeItem('aoe-net-room'); } catch { /* sin almacenamiento */ }
    this.leaveNet();
    this.session?.dispose();
    this.session = null;
    this.paused = false;
    this.audio.setPaused(false);
    this.audio.detach();
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
    this.setPaused(!this.paused);
  }

  /** Pausa o reanuda. `showMenu = false`: sin el menú de pausa (la interfaz móvil abre sus propias pantallas). */
  setPaused(paused: boolean, showMenu = true) {
    if (!this.session) return;
    this.paused = paused;
    this.menuOpen = paused;
    // En red el juego no se para por abrir un menú (la pausa para todos es una orden)
    if (!this.net) this.audio.setPaused(paused);
    if (paused && showMenu) this.menu.showPause();
    else this.menu.hide();
  }

  private loop = (now: number) => {
    requestAnimationFrame(this.loop);
    // Ahorro de batería: como mucho 30 fotogramas por segundo (la simulación no cambia)
    const cap = this.quality.fpsCap;
    if (cap && now - this.last < 1000 / cap - 2) return;
    const real = (now - this.last) / 1000 || 0;
    const dt = Math.min(0.1, real);
    this.last = now;
    const s = this.session;
    if (!s) return;
    if (!this.paused && !this.menuOpen) this.quality.frame(real);
    this.fpsMeter(real);
    if (now - this.lastAutosave > AUTOSAVE_EVERY_MS && !this.paused && !this.menuOpen) this.autosave();
    if (this.net && this.net.game === s.game) {
      // En red manda el reloj de la partida en red: avanza si están los turnos de todos
      this.net.frame(dt);
      s.frame(dt, this.net.alpha);
      return;
    }
    if (!this.paused && !this.menuOpen) {
      this.acc += dt * s.game.opts.speed * this.timeScale;
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
