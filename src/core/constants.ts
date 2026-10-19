import { BALANCE } from '../config/balance';

/** Simulación a paso fijo: 20 ticks por segundo. */
export const TICK_RATE = 20;
export const TICK_DT = 1 / TICK_RATE;

/** Tamaño de una casilla isométrica en píxeles (zoom 1). */
export const TILE_W = 64;
export const TILE_H = 32;
export const HALF_W = TILE_W / 2;
export const HALF_H = TILE_H / 2;
/** Píxeles (a zoom 1) que sube el terreno por cada nivel de elevación (antes de la escala visual del mapa). */
export const ELEV_PX = 12;
/**
 * Escala visual del relieve en los mapas aleatorios: cuánto se levanta el terreno en
 * pantalla. Solo afecta al dibujo; las reglas (roca, ventaja de altura, visión) usan
 * los niveles de elevación. Los mapas reales calculan la suya según su desnivel real.
 */
export const DEFAULT_VISUAL_RELIEF = 2.5;
/** Mapas reales: fracción de la escala vertical real con la que se dibujan las montañas, y tope. */
export const REAL_RELIEF_FRACTION = 1.2;
export const MAX_VISUAL_RELIEF = 7;

/** Jugador 0 = naturaleza (árboles, minas, arbustos...). */
export const GAIA = 0;

/** Distancias de interacción (en casillas, medidas desde el borde del objetivo). Valores en src/config/balance.ts. */
export const GATHER_RANGE = BALANCE.interaction.gatherRange;
export const BUILD_RANGE = BALANCE.interaction.buildRange;
export const DROP_RANGE = BALANCE.interaction.dropRange;
export const MELEE_RANGE = BALANCE.interaction.meleeRange;

export const PLAYER_COLORS = ['#3b6fe0', '#d63a3a', '#3fae4a', '#e2c13a', '#3ec9c9', '#9b54d6', '#e88a2e', '#8c8c8c'];
export const PLAYER_COLOR_NAMES = ['Azul', 'Rojo', 'Verde', 'Amarillo', 'Cian', 'Morado', 'Naranja', 'Gris'];

/** Densidad de píxeles máxima del render (en móviles con pantallas de 3x se limita a 2x). */
export const MAX_DPR = 2;
export const pixelRatio = () => Math.min(MAX_DPR, window.devicePixelRatio || 1);

/** Pantalla táctil (móvil o tableta). */
export const isTouchDevice = () =>
  typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 0);
