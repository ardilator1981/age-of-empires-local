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
  // Pack 3 · Edad Oscura (art-src/import/pack3-edad-oscura.json)
  buildingArt('townCenter', 'buildings/townCenter'),
  buildingArt('house', 'buildings/house'),
  buildingArt('mill', 'buildings/mill'),
  buildingArt('lumberCamp', 'buildings/lumberCamp'),
  buildingArt('miningCamp', 'buildings/miningCamp'),
  buildingArt('barracks', 'buildings/barracks'),
  // Pack 2 · Naturaleza y recursos (art-src/import/pack2-naturaleza.json)
  resourceArt('tree', 'resources/tree'),
  resourceArt('pineTree', 'resources/pineTree'),
  resourceArt('snowPine', 'resources/snowPine'),
  resourceArt('goldMine', 'resources/goldMine'),
  resourceArt('stoneMine', 'resources/stoneMine'),
  resourceArt('berries', 'resources/berries'),
  // unitArt('villager', 'units/villager'),        → public/sprites/units/villager.json
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
    // Las hojas de ejemplo van primero: si una definición tiene arte de verdad, gana el de verdad
    bindArt(reg, artMode() === 'ejemplo' ? [...EXAMPLE, ...ART] : ART);
  },
};

