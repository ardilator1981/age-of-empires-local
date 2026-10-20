/**
 * Matemáticas deterministas para la simulación.
 *
 * Las operaciones básicas (+ − × ÷) y `Math.sqrt` dan el mismo resultado, bit a bit, en todos los
 * navegadores y CPU: el estándar IEEE 754 las obliga a redondear siempre igual. `Math.hypot`,
 * `Math.sin`, `Math.cos`, `Math.atan2` o `Math.exp` no: cada motor (V8 en Chrome y Android,
 * JavaScriptCore en Safari e iOS, SpiderMonkey en Firefox) usa su propia aproximación y a veces
 * difieren en el último bit. Medido con `npm run engines`, `Math.hypot` cambia en un tercio de
 * los casos entre V8 y JavaScriptCore. Para que dos copias de una partida en red sigan iguales,
 * el código que se ejecuta en cada tick usa estas funciones (ver docs/multijugador.md).
 */

/** Distancia euclídea: como `Math.hypot(dx, dy)`, pero igual en todos los motores (y más rápida). */
export function hypot(dx: number, dy: number): number {
  return Math.sqrt(dx * dx + dy * dy);
}

// Coeficientes de los núcleos de seno y coseno de fdlibm (los que usan muchas libm)
const S1 = -1.66666666666666324348e-1, S2 = 8.33333333332248946124e-3, S3 = -1.98412698298579493134e-4;
const S4 = 2.75573137070700676789e-6, S5 = -2.50507602534068634195e-8, S6 = 1.58969099521155010221e-10;
const C1 = 4.16666666666666019037e-2, C2 = -1.38888888888741095749e-3, C3 = 2.48015872894767294178e-5;
const C4 = -2.75573143513906633035e-7, C5 = 2.08757232129817482790e-9, C6 = -1.13596475577881948265e-11;
// π/2 partido en dos para restar sin perder precisión (reducción de Cody y Waite)
const PIO2_HI = 1.57079632673412561417, PIO2_LO = 6.07710050650619224932e-11;
const INV_PIO2 = 6.36619772367581382433e-1;

function kSin(x: number): number {
  const z = x * x;
  return x + x * z * (S1 + z * (S2 + z * (S3 + z * (S4 + z * (S5 + z * S6)))));
}
function kCos(x: number): number {
  const z = x * x;
  return 1 - 0.5 * z + z * z * (C1 + z * (C2 + z * (C3 + z * (C4 + z * (C5 + z * C6)))));
}

/** Cuadrante (0..3) y resto en [−π/4, π/4]. Precisa para los ángulos del juego (|x| < 10⁵). */
function reduce(x: number): [number, number] {
  const n = Math.round(x * INV_PIO2);
  return [n & 3, x - n * PIO2_HI - n * PIO2_LO];
}

/** Seno determinista (error de un par de unidades en el último bit respecto a `Math.sin`). */
export function sin(x: number): number {
  const [q, r] = reduce(x);
  return q === 0 ? kSin(r) : q === 1 ? kCos(r) : q === 2 ? -kSin(r) : -kCos(r);
}

/** Coseno determinista. */
export function cos(x: number): number {
  const [q, r] = reduce(x);
  return q === 0 ? kCos(r) : q === 1 ? -kSin(r) : q === 2 ? -kCos(r) : kSin(r);
}
