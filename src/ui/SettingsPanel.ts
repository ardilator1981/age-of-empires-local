import type { App } from '../app/App';
import { QUALITY_NAMES, type QualityPref } from '../render/quality';
import { setUIPrefs, uiPrefs, UI_SCALES, type LayoutPref, type StrategyTime, type UIPrefs } from './layout';
import { bindSoundControls, soundControlsHtml } from './soundSettings';

/**
 * Panel de ajustes unificado: sonido, interfaz, controles táctiles, juego y gráficos. Lo usan el
 * menú principal, la pausa de escritorio y el menú de la interfaz móvil. Todo se guarda en el
 * navegador y se recuerda entre partidas.
 */

export const SPEEDS: [number, string][] = [[1, 'Lenta'], [1.5, 'Normal'], [2, 'Rápida'], [3, 'Muy rápida']];

function seg<T extends string | number | boolean>(key: string, cur: T, opts: [T, string][]) {
  return `<div class="m-seg">${opts.map(([v, l]) => `<button class="${v === cur ? 'on' : ''}" data-set="${key}" data-v="${String(v)}">${l}</button>`).join('')}</div>`;
}

export function settingsHtml(app: App): string {
  const p = uiPrefs(), q = app.quality;
  const speed = app.session?.game.opts.speed ?? app.menu.speed;
  const lay: [LayoutPref, string][] = [['auto', 'Automática'], ['mobile', 'Móvil'], ['desktop', 'Escritorio']];
  const quality: [QualityPref, string][] = (['auto', 'low', 'medium', 'high'] as QualityPref[]).map(v => [v, QUALITY_NAMES[v]]);
  const times: [StrategyTime, string][] = [['pause', '⏸ Pausa'], ['slow', '🐢 Cámara lenta'], ['normal', '▶ Normal']];
  return `<div class="settings">
    <h3>Sonido</h3>
    <div class="m-set">${soundControlsHtml(app.audio, true)}</div>
    <h3>Gráficos</h3>
    <div class="m-set">
      <label>Calidad</label>${seg('quality', p.quality, quality)}
      ${p.quality === 'auto' ? `<span></span><small class="set-note">Ahora: ${QUALITY_NAMES[q.level].toLowerCase()} · ${Math.round(q.fps)} FPS. Baja sola si el juego va por debajo de 30 FPS.</small>` : ''}
      <label>Ahorro de batería</label>${seg('battery', p.battery, [[false, 'No'], [true, 'Sí (30 FPS y menos efectos)']])}
      <label>Mostrar FPS</label>${seg('showFps', p.showFps, [[false, 'No'], [true, 'Sí']])}
    </div>
    <h3>Juego</h3>
    <div class="m-set">
      <label>Velocidad</label>${seg('speed', speed, SPEEDS)}
      <label>Pantalla de estrategia</label>${seg('strategyTime', p.strategyTime, times)}
    </div>
    <h3>Interfaz y controles</h3>
    <div class="m-set">
      <label>Interfaz</label>${seg('layout', p.layout, lay)}
      <label>Tamaño de los controles</label>${seg('scale', p.scale, UI_SCALES)}
      <label>Pulsación larga</label>${seg('longPress', p.longPress, [[300, 'Corta'], [400, 'Normal'], [600, 'Larga']])}
      <label>Arrastrar con un dedo</label>${seg('dragMode', p.dragMode, [['select', '⬚ Selección'], ['camera', '✥ Cámara']])}
      <label>Vibración</label>${seg('haptics', p.haptics, [[true, 'Activada'], [false, 'Desactivada']])}
    </div>
  </div>`;
}

/** Engancha el panel. `rerender` vuelve a dibujarlo (para marcar lo elegido). */
export function bindSettings(root: HTMLElement, app: App, rerender: () => void, onSound?: () => void) {
  bindSoundControls(root, app.audio, onSound);
  root.querySelectorAll<HTMLElement>('[data-set]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.set as keyof UIPrefs | 'speed', raw = b.dataset.v!;
    const v: any = raw === 'true' ? true : raw === 'false' ? false : Number.isNaN(Number(raw)) ? raw : Number(raw);
    if (k === 'speed') {
      // En red, la velocidad es de todos: va como orden y cambia a la vez en todos los clientes
      if (app.session?.orders.online) app.session.orders.send({ t: 'speed', v });
      else {
        app.menu.setSpeed(v);
        if (app.session) app.session.game.opts.speed = v;
      }
    } else {
      setUIPrefs({ [k]: v } as Partial<UIPrefs>);
      if (k === 'quality' || k === 'battery') app.quality.set(uiPrefs().quality, uiPrefs().battery);
      if (k === 'dragMode' && app.session) app.session.input.cameraMode = v === 'camera';
      if (k === 'scale' && app.session) requestAnimationFrame(() => app.session?.minimap.resize());
    }
    rerender();
  }));
}
