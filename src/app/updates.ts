import type { App } from './App';

/**
 * Versiones nuevas de la web publicada (PWA).
 *
 * El service worker guarda el juego en el dispositivo para jugar sin conexión. Al publicar una versión nueva, el
 * móvil seguía abriendo la copia vieja: la nueva se instalaba en segundo plano y no se veía hasta abrir el juego
 * de cero otra vez (y una app instalada casi nunca se abre de cero). Por eso:
 * - se busca versión nueva al abrir, al volver a la app y cada 30 minutos;
 * - la página compara su propio script con el del `index.html` que sirve el service worker: si no coinciden, es vieja;
 * - si pasa nada más abrir, todavía en el menú, se recarga sola (una vez);
 * - si no, aparece un aviso con «Actualizar» (guarda la partida antes de recargar). Nunca se recarga a mitad de partida.
 */
const CHECK_EVERY_MS = 30 * 60 * 1000;
/** Margen tras abrir el juego en el que una versión nueva se aplica sola (si no hay partida). */
const AUTO_RELOAD_MS = 15_000;
const RELOADED_KEY = 'aoe-update-reloaded';

/** Script principal de una página (`assets/index-<hash>.js`), que cambia con cada versión publicada. */
const entryOf = (html: string) => /assets\/index-[\w-]+\.js/.exec(html)?.[0] ?? null;

export function watchForUpdates(app: App) {
  const sw = typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined;
  const mine = entryOf(document.documentElement.innerHTML);
  // En desarrollo (sin script con hash) o sin service worker no hay nada que comprobar
  if (!sw || !mine) return;
  const t0 = performance.now();
  let shown = false;

  const compare = async () => {
    if (shown || !sw.controller) return;
    let served: string | null = null;
    try { served = entryOf(await (await fetch('index.html', { cache: 'no-store' })).text()); } catch { return; }
    if (!served || served === mine) return;
    shown = true;
    let recent = false;
    try { recent = Date.now() - Number(sessionStorage.getItem(RELOADED_KEY) ?? 0) < 60_000; } catch { /* sin almacenamiento */ }
    if (performance.now() - t0 < AUTO_RELOAD_MS && !app.session && !app.net && !recent) {
      try { sessionStorage.setItem(RELOADED_KEY, String(Date.now())); } catch { /* ignorar */ }
      location.reload();
      return;
    }
    showBanner(app);
  };

  const check = () => { sw.getRegistration().then(r => r?.update()).then(compare).catch(() => { /* sin conexión */ }); };
  sw.addEventListener('controllerchange', () => void compare());
  void sw.ready.then(compare);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  window.setInterval(check, CHECK_EVERY_MS);
}

function showBanner(app: App) {
  if (document.getElementById('update-banner')) return;
  const d = document.createElement('div');
  d.id = 'update-banner';
  const net = !!app.net;
  d.innerHTML = `<span>Hay una versión nueva del juego${net ? ' (al actualizar saldrás de la partida en red)' : ''}</span>
    <button data-u="ok">Actualizar</button><button data-u="no" aria-label="Más tarde">✖</button>`;
  d.addEventListener('click', e => {
    const a = (e.target as HTMLElement).closest('[data-u]')?.getAttribute('data-u');
    if (a === 'ok') {
      // La partida se guarda (Continuar la recupera) antes de recargar
      app.autosave(true);
      location.reload();
    } else if (a === 'no') d.remove();
  });
  document.body.appendChild(d);
}
