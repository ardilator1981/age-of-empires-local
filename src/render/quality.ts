import { MAX_DPR } from '../core/constants';

/**
 * Calidad gráfica. Cada nivel decide cuánto se dibuja; lo que cuesta de verdad en un móvil es
 * la cantidad de píxeles (densidad de píxeles de los dos lienzos), los filtros del Canvas 2D y
 * el número de sprites.
 *
 * - Automática: empieza en media (alta en ordenador) y baja un nivel si los FPS se quedan por
 *   debajo de 30 durante 2 s; sube uno si pasan de 55 durante 10 s (como mucho una vez cada 20 s,
 *   para no oscilar).
 * - Ahorro de batería: limita a 30 FPS y como mucho calidad baja de efectos.
 */

export type QualityLevel = 'low' | 'medium' | 'high';
export type QualityPref = 'auto' | QualityLevel;

export interface QualityProfile {
  /** Densidad de píxeles máxima de los lienzos. */
  maxDpr: number;
  /** Fracción de la decoración del suelo (matas, flores, piedras) que se dibuja. */
  decorations: number;
  /** Restos de combate en el suelo (cadáveres y escombros), como mucho estos. */
  decals: number;
  /** Sombras proyectadas de los edificios. */
  shadows: boolean;
  /** Filtro de oscurecido en la niebla (caro en móviles); si no, transparencia. */
  fogFilter: boolean;
  /** Unidades dibujadas con todo detalle; el resto, como una figura sencilla. */
  fullUnits: number;
  /** Proyectiles dibujados como mucho. */
  projectiles: number;
}

export const QUALITY: Record<QualityLevel, QualityProfile> = {
  low: { maxDpr: 1, decorations: 0, decals: 20, shadows: false, fogFilter: false, fullUnits: 120, projectiles: 40 },
  medium: { maxDpr: 1.5, decorations: 0.5, decals: 60, shadows: true, fogFilter: false, fullUnits: 260, projectiles: 120 },
  high: { maxDpr: MAX_DPR, decorations: 1, decals: 400, shadows: true, fogFilter: true, fullUnits: 10_000, projectiles: 1000 },
};

const ORDER: QualityLevel[] = ['low', 'medium', 'high'];

export const QUALITY_NAMES: Record<QualityPref, string> = { auto: 'Automática', low: 'Baja', medium: 'Media', high: 'Alta' };

/** Elige y ajusta la calidad mientras se juega. */
export class QualityManager {
  level: QualityLevel;
  /** FPS medidos (media móvil). */
  fps = 60;
  private slowFor = 0;
  private fastFor = 0;
  private lastChange = -1e9;
  private now = 0;

  constructor(public pref: QualityPref, public battery: boolean, private mobile: boolean, private onChange: () => void) {
    this.level = pref === 'auto' ? (mobile ? 'medium' : 'high') : pref;
    this.clampBattery();
  }

  get profile(): QualityProfile {
    const p = QUALITY[this.level];
    // Ahorro de batería: menos píxeles y menos efectos
    return this.battery ? { ...p, maxDpr: Math.min(p.maxDpr, 1.25), decorations: Math.min(p.decorations, 0.3), shadows: false, fogFilter: false } : p;
  }

  /** FPS objetivo (0 = sin límite). */
  get fpsCap(): number { return this.battery ? 30 : 0; }

  set(pref: QualityPref, battery: boolean) {
    const before = this.level + this.battery;
    this.pref = pref;
    this.battery = battery;
    if (pref !== 'auto') this.level = pref;
    this.clampBattery();
    this.slowFor = this.fastFor = 0;
    if (before !== this.level + this.battery) this.onChange();
  }

  private clampBattery() {
    if (this.battery && this.pref === 'auto' && this.level === 'high') this.level = 'medium';
  }

  /** Se llama en cada fotograma dibujado con el tiempo desde el anterior (s). */
  frame(dt: number) {
    if (dt <= 0 || dt > 1) return;
    this.now += dt;
    this.fps = this.fps * 0.95 + (1 / dt) * 0.05;
    if (this.pref !== 'auto') return;
    // Con el límite de 30 FPS del ahorro de batería, "lento" es por debajo de 25
    const slow = this.battery ? 25 : 30, fast = this.battery ? 1e9 : 55;
    this.slowFor = this.fps < slow ? this.slowFor + dt : 0;
    this.fastFor = this.fps > fast ? this.fastFor + dt : 0;
    const i = ORDER.indexOf(this.level);
    if (this.slowFor > 2 && i > 0) this.step(ORDER[i - 1]);
    else if (this.fastFor > 10 && i < ORDER.length - 1 && this.now - this.lastChange > 20 && !(this.battery && i >= 1)) this.step(ORDER[i + 1]);
  }

  private step(l: QualityLevel) {
    this.level = l;
    this.lastChange = this.now;
    this.slowFor = this.fastFor = 0;
    this.fps = l === 'low' ? 30 : 45; // nueva medida desde un punto neutro
    this.onChange();
  }
}
