/** Simulación a paso fijo: 20 ticks por segundo. */
export const TICK_RATE = 20;
export const TICK_DT = 1 / TICK_RATE;

/** Tamaño de una casilla isométrica en píxeles (zoom 1). */
export const TILE_W = 64;
export const TILE_H = 32;
export const HALF_W = TILE_W / 2;
export const HALF_H = TILE_H / 2;

/** Jugador 0 = naturaleza (árboles, minas, arbustos...). */
export const GAIA = 0;

/** Distancias de interacción (en casillas, medidas desde el borde del objetivo). */
export const GATHER_RANGE = 0.6;
export const BUILD_RANGE = 0.6;
export const DROP_RANGE = 0.6;
export const MELEE_RANGE = 0.35;

export const PLAYER_COLORS = ['#3b6fe0', '#d63a3a', '#3fae4a', '#e2c13a', '#3ec9c9', '#9b54d6', '#e88a2e', '#8c8c8c'];
export const PLAYER_COLOR_NAMES = ['Azul', 'Rojo', 'Verde', 'Amarillo', 'Cian', 'Morado', 'Naranja', 'Gris'];
