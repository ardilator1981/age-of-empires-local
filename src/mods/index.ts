import type { GameMod } from '../core/types';
import { artMod } from './art';
import { coreMod } from './core';
import { declaredWarMod } from './declared-war';
import { extraContentMod } from './extra-content';
import { realMapsMod } from './real-maps';
import { regicideMod } from './regicide';
import { treasureHuntMod } from './treasure-hunt';

/**
 * Lista de mods disponibles. Para añadir uno nuevo:
 *   1. Crea una carpeta en src/mods/mi-mod/ con un index.ts que exporte un GameMod.
 *   2. Impórtalo aquí y añádelo a la lista.
 * Aparecerá en el menú principal para activarlo o desactivarlo.
 * El orden importa: un mod puede modificar contenido de los anteriores.
 * El mod de arte va el último para poder poner imágenes a todo lo anterior.
 */
export const ALL_MODS: GameMod[] = [
  coreMod,
  extraContentMod,
  treasureHuntMod,
  realMapsMod,
  declaredWarMod,
  regicideMod,
  artMod,
];
