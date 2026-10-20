/**
 * Elección de la interfaz (escritorio o móvil) y preferencias de interfaz que se guardan en el navegador.
 * Las dos interfaces comparten motor, reglas y comandos: aquí solo se decide cuál se muestra.
 */

export type LayoutPref = 'auto' | 'desktop' | 'mobile';
/** Qué pasa con el tiempo mientras está abierta la pantalla de estrategia (contra la IA). */
export type StrategyTime = 'pause' | 'slow' | 'normal';

export interface UIPrefs {
  /** Interfaz: automática (según entrada y pantalla) o forzada. */
  layout: LayoutPref;
  /** Escala de la interfaz móvil (1 = normal). */
  scale: number;
  /** Vibración ligera al confirmar acciones. */
  haptics: boolean;
  /** Ya se ha visto (y cerrado) la pista de gestos. */
  hintSeen: boolean;
  /** Pantalla de estrategia: pausa, cámara lenta o nada. */
  strategyTime: StrategyTime;
}

const KEY = 'aoe-ui-v1';
/** Escalas de interfaz disponibles. La mínima mantiene los botones por encima de 44 px. */
export const UI_SCALES: [number, string][] = [[0.92, 'Pequeña'], [1, 'Normal'], [1.15, 'Grande'], [1.3, 'Muy grande']];

const DEFAULTS: UIPrefs = { layout: 'auto', scale: 1, haptics: true, hintSeen: false, strategyTime: 'pause' };

let prefs: UIPrefs = load();
/** Interfaz forzada por la URL (?ui=movil / ?ui=escritorio): solo para esa visita, no se guarda. */
let urlLayout: LayoutPref | null = null;
try {
  const q = new URLSearchParams(location.search).get('ui');
  if (q === 'movil' || q === 'mobile') urlLayout = 'mobile';
  else if (q === 'escritorio' || q === 'desktop') urlLayout = 'desktop';
} catch { /* fuera del navegador */ }
const listeners = new Set<() => void>();

function load(): UIPrefs {
  let p = { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) p = { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { /* sin almacenamiento */ }
  return p;
}

export function uiPrefs(): Readonly<UIPrefs> { return prefs; }

export function setUIPrefs(patch: Partial<UIPrefs>) {
  prefs = { ...prefs, ...patch };
  if (patch.layout) urlLayout = null;
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* ignorar */ }
  applyLayout();
}

/** Avisa cuando cambia la interfaz elegida (por ajustes, giro o cambio de tamaño). */
export function onLayoutChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Interfaz móvil automática: la entrada principal es táctil (puntero grueso, sin ratón que pase por encima)
 * y la pantalla es de móvil o tableta. Un portátil con pantalla táctil y ratón sigue con la de escritorio.
 */
function autoMobile(): boolean {
  const mm = (q: string) => window.matchMedia?.(q).matches ?? false;
  const coarse = mm('(pointer: coarse)') || (navigator.maxTouchPoints > 0 && !mm('(hover: hover)'));
  const short = Math.min(window.innerWidth, window.innerHeight);
  return coarse && short <= 1100;
}

export function isMobileLayout(): boolean {
  return document.documentElement.classList.contains('ui-movil');
}

/** Aplica la clase de la interfaz en <html> y la escala; avisa si ha cambiado. */
export function applyLayout() {
  const root = document.documentElement;
  const pref = urlLayout ?? prefs.layout;
  const mobile = pref === 'mobile' || (pref === 'auto' && autoMobile());
  root.style.setProperty('--mui', String(prefs.scale));
  const was = root.classList.contains('ui-movil');
  root.classList.toggle('ui-movil', mobile);
  if (was !== mobile) listeners.forEach(f => f());
}

export function initLayout() {
  applyLayout();
  window.addEventListener('resize', applyLayout);
  window.matchMedia?.('(pointer: coarse)').addEventListener?.('change', applyLayout);
}

/** Vibración ligera de confirmación (si el dispositivo la tiene y está activada). */
export function haptic(ms = 10) {
  if (prefs.haptics) navigator.vibrate?.(ms);
}
