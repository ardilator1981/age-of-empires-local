import type { AgeDef, ResourceDef, ResourceNodeDef, SetupConfig, TerrainDef } from '../../core/types';

export const resources: ResourceDef[] = [
  { id: 'food', name: 'Alimento', icon: '🍖', color: '#e05c4f', start: { low: 100, standard: 200, high: 1000 } },
  { id: 'wood', name: 'Madera', icon: '🪵', color: '#a8743d', start: { low: 100, standard: 200, high: 1000 } },
  { id: 'gold', name: 'Oro', icon: '🪙', color: '#f1c40f', start: { low: 0, standard: 100, high: 1000 } },
  { id: 'stone', name: 'Piedra', icon: '🪨', color: '#a0a0a0', start: { low: 0, standard: 200, high: 1000 } },
];

export const terrains: TerrainDef[] = [
  { id: 'grass', name: 'Hierba', color: [104, 146, 58], variance: 14, walkable: true, buildable: true },
  { id: 'dirt', name: 'Tierra', color: [150, 124, 78], variance: 12, walkable: true, buildable: true },
  { id: 'forest', name: 'Suelo de bosque', color: [66, 98, 42], variance: 12, walkable: true, buildable: true },
  { id: 'sand', name: 'Arena', color: [206, 186, 128], variance: 8, walkable: true, buildable: true },
  { id: 'water', name: 'Agua', color: [46, 98, 158], variance: 8, walkable: false, buildable: false },
  { id: 'desert', name: 'Desierto', color: [214, 180, 112], variance: 10, walkable: true, buildable: true },
];

export const resourceNodes: ResourceNodeDef[] = [
  { id: 'tree', name: 'Árbol', icon: '🌳', resource: 'wood', amount: 100, gatherRate: 0.39, sprite: 'tree', groundTerrain: 'forest', minimapColor: '#1f4d1f' },
  { id: 'goldMine', name: 'Mina de oro', icon: '🪙', resource: 'gold', amount: 800, gatherRate: 0.38, sprite: 'rocks', spriteParams: { color: '#e6c13a' }, minimapColor: '#f5d442' },
  { id: 'stoneMine', name: 'Cantera de piedra', icon: '🪨', resource: 'stone', amount: 350, gatherRate: 0.36, sprite: 'rocks', spriteParams: { color: '#a9a9a9' }, minimapColor: '#c8c8c8' },
  { id: 'berries', name: 'Arbusto de bayas', icon: '🫐', resource: 'food', amount: 125, gatherRate: 0.31, sprite: 'bush', minimapColor: '#d24a6a' },
];

export const ages: AgeDef[] = [
  { index: 0, id: 'dark', name: 'Edad Oscura' },
  { index: 1, id: 'feudal', name: 'Edad Feudal' },
  { index: 2, id: 'castle', name: 'Edad de los Castillos' },
  { index: 3, id: 'imperial', name: 'Edad Imperial' },
];

export const setup: SetupConfig = {
  townCenter: 'townCenter',
  startingUnits: [
    { unit: 'villager', count: 3 },
    { unit: 'scoutCavalry', count: 1 },
  ],
  baseResources: [
    { node: 'berries', count: 6, minDist: 5, maxDist: 7 },
    { node: 'goldMine', count: 7, minDist: 7, maxDist: 10 },
    { node: 'goldMine', count: 4, minDist: 12, maxDist: 16 },
    { node: 'stoneMine', count: 5, minDist: 8, maxDist: 12 },
    { node: 'tree', count: 30, minDist: 9, maxDist: 12 },
    { node: 'tree', count: 14, minDist: 13, maxDist: 17 },
  ],
};
