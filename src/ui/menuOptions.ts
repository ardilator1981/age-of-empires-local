/** Opciones de partida que comparten el menú y la sala de las partidas en red. */

export type Diff = 'easy' | 'normal' | 'hard';

export const SIZES: [number, string][] = [[64, 'Diminuto (64×64)'], [80, 'Pequeño (80×80)'], [96, 'Mediano (96×96)'], [120, 'Grande (120×120)'], [144, 'Enorme (144×144)']];
export const SPEEDS: [number, string][] = [[1, 'Lenta'], [1.5, 'Normal'], [2, 'Rápida'], [3, 'Muy rápida']];
export const DIFFS: [Diff, string][] = [['easy', 'Fácil'], ['normal', 'Normal'], ['hard', 'Difícil']];
export const RESOURCES: ['low' | 'standard' | 'high', string][] = [['low', 'Bajos'], ['standard', 'Estándar'], ['high', 'Altos']];
export const VISIBILITY: ['normal' | 'explored' | 'revealed', string][] = [['normal', 'Normal'], ['explored', 'Explorado'], ['revealed', 'Todo visible']];
export const POP_LIMITS = [50, 75, 125, 200];

export function esc(s: string) {
  return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

export function opt<T extends string | number>(value: T, label: string, cur: T) {
  return `<option value="${value}"${value === cur ? ' selected' : ''}>${esc(label)}</option>`;
}
