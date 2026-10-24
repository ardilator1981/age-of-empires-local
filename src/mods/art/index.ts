import type { GameMod } from '../../core/types';
import { type ArtEntry, bindArt, buildingArt, resourceArt, unitArt } from '../../render/art/artRegistry';
import { artMode, assetUrl, hasDom, loadImage, loadJson } from '../../render/art/assets';
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
  // Pack 4 · Edificios militares y torres por época (art-src/import/pack4-militares.json)
  buildingArt('archeryRange', 'buildings/archeryRange'),
  buildingArt('stable', 'buildings/stable'),
  buildingArt('blacksmith', 'buildings/blacksmith'),
  buildingArt('siegeWorkshop', 'buildings/siegeWorkshop'),
  buildingArt('castle', 'buildings/castle'),
  buildingArt('watchTower', 'buildings/watchTower'),
  // Pack 2 · Naturaleza y recursos (art-src/import/pack2-naturaleza.json)
  resourceArt('tree', 'resources/tree'),
  resourceArt('pineTree', 'resources/pineTree'),
  resourceArt('snowPine', 'resources/snowPine'),
  resourceArt('goldMine', 'resources/goldMine'),
  resourceArt('stoneMine', 'resources/stoneMine'),
  resourceArt('berries', 'resources/berries'),
  // Pack 6 · Unidades (art-src/import/pack6-unidades.json). De momento solo quietas, salvo el
  // aldeano que también anda; los demás estados usan la imagen quieta.
  unitArt('villager', 'units/villager'),
  unitArt('militia', 'units/militia'),
  unitArt('manAtArms', 'units/manAtArms'),
  unitArt('longSwordsman', 'units/longSwordsman'),
  unitArt('spearman', 'units/spearman'),
  unitArt('pikeman', 'units/pikeman'),
  unitArt('archer', 'units/archer'),
  unitArt('crossbowman', 'units/crossbowman'),
  unitArt('skirmisher', 'units/skirmisher'),
  unitArt('scoutCavalry', 'units/scoutCavalry'),
  unitArt('lightCavalry', 'units/scoutCavalry'),
  unitArt('knight', 'units/knight'),
  unitArt('cavalier', 'units/cavalier'),
  unitArt('batteringRam', 'units/batteringRam'),
  unitArt('longbowman', 'units/longbowman'),
  unitArt('throwingAxeman', 'units/throwingAxeman'),
  unitArt('musketeer', 'units/musketeer'),
  unitArt('grenadier', 'units/grenadier'),
  unitArt('dragoon', 'units/dragoon'),
  unitArt('cannon', 'units/cannon'),
  unitArt('druzhinnik', 'units/druzhinnik'),
  unitArt('boyarSon', 'units/boyarSon'),
  unitArt('strelets', 'units/strelets'),
  unitArt('cossack', 'units/cossack'),
  unitArt('fubing', 'units/fubing'),
  unitArt('fireLance', 'units/fireLance'),
  unitArt('repeatingCrossbowman', 'units/repeatingCrossbowman'),
  unitArt('eightBannersRider', 'units/eightBannersRider'),
  unitArt('gendarme', 'units/gendarme'),
  unitArt('ordinanceArquebusier', 'units/ordinanceArquebusier'),
  unitArt('bayonetFusilier', 'units/bayonetFusilier'),
  unitArt('gribeauvalCannon', 'units/gribeauvalCannon'),
  unitArt('fyrdman', 'units/fyrdman'),
  unitArt('normanKnight', 'units/normanKnight'),
  unitArt('tudorArquebusier', 'units/tudorArquebusier'),
  unitArt('redcoat', 'units/redcoat'),
  unitArt('rifleman', 'units/rifleman'),
  unitArt('crusaderKnight', 'units/crusaderKnight'),
  unitArt('unicorn', 'units/unicorn'),
  unitArt('counterweightTrebuchet', 'units/counterweightTrebuchet'),
  unitArt('divineArquebusier', 'units/divineArquebusier'),
  // Pack 2g · Animales (art-src/import/pack2-animales.json)
  unitArt('deer', 'units/deer'),
  unitArt('boar', 'units/boar'),
  unitArt('sheep', 'units/sheep'),
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
    // Iconos de recursos con imagen (public/sprites/ui/icon-<recurso>.png); mientras no carguen, quedan los SVG
    if (hasDom && artMode() !== 'no') {
      for (const r of reg.resources.values()) {
        const orig = r.icon;
        void loadImage(`sprites/ui/icon-${r.id}.png`).then(img => {
          if (img && r.icon === orig) r.icon = `<img class="ri" src="${assetUrl(`sprites/ui/icon-${r.id}.png`)}" alt="" width="22" height="22" style="vertical-align:-5px">`;
        });
      }
    }
    // Iconos de tecnologías con imagen (public/sprites/ui/tech/<id>.png): solo los de la lista index.json
    if (hasDom && artMode() !== 'no') {
      void loadJson<string[]>('sprites/ui/tech/index.json').then(ids => {
        for (const id of ids ?? []) {
          const t = reg.techs.get(id);
          if (t) t.icon = `<img class="ti" src="${assetUrl(`sprites/ui/tech/${id}.png`)}" alt="" draggable="false">`;
        }
      });
    }
    // Las hojas de ejemplo van primero: si una definición tiene arte de verdad, gana el de verdad
    bindArt(reg, artMode() === 'ejemplo' ? [...EXAMPLE, ...ART] : ART);
  },
};

