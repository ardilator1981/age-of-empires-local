import type { GameMod } from '../../core/types';
import { type ArtEntry, bindArt, buildingArt, resourceArt, unitArt } from '../../render/art/artRegistry';
import { artMode } from '../../render/art/assets';
import { preloadTerrainTextures } from '../../render/art/terrainTextures';

/**
 * Arte con imágenes (generadas con IA o dibujadas a mano) en lugar de los sprites procedurales.
 *
 * Añade aquí una línea por cada hoja que tengas lista en public/sprites/. Lo que no
 * esté en la lista, o cuyo PNG/JSON falte, se sigue dibujando por código.
 * Las texturas de terreno no hace falta declararlas: basta con dejar
 * public/sprites/terrain/<patrón>.png (ver README, «Arte con imágenes»).
 */
export const ART: ArtEntry[] = [
  // unitArt('villager', 'units/villager'),        → public/sprites/units/villager.json
  // unitArt('militia', 'units/militia'),
  // buildingArt('house', 'buildings/house'),      → public/sprites/buildings/house.json
  // resourceArt('tree', 'resources/oak'),         → public/sprites/resources/oak.json
];

/** Hojas de prueba (public/sprites/ejemplo/). Se activan abriendo el juego con ?arte=ejemplo. */
const EXAMPLE: ArtEntry[] = [
  unitArt('militia', 'ejemplo/militia'),
  unitArt('manAtArms', 'ejemplo/militia'),
  buildingArt('house', 'ejemplo/house'),
  resourceArt('berries', 'ejemplo/bush'),
];

export const artMod: GameMod = {
  id: 'art',
  name: 'Arte con imágenes',
  description: 'Usa las imágenes de public/sprites/ cuando existen.',
  core: true,
  register(reg) {
    preloadTerrainTextures(reg.terrains);
    bindArt(reg, artMode() === 'ejemplo' ? [...ART, ...EXAMPLE] : ART);
  },
};

