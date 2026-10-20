import type { GameMod, VictoryDef } from '../../core/types';
import { attackMoveOrder, attackOrder, exploreOrder, buildOrder, gatherOrder, moveOrder } from '../../game/orders';
import { AISystem } from '../../game/systems/AISystem';
import { FormationSystem, formationOrder } from '../../game/army/groups';
import {
  AuraSystem, CombatSystem, MovementSystem, OrderSystem, PlayerStatsSystem, ProductionSystem, VictorySystem, VisionSystem,
} from '../../game/systems/core';
import { registerCoreSprites } from '../../render/sprites';
import { buildings } from './buildings';
import { civs } from './civs';
import { maps } from './maps';
import { techs } from './techs';
import { units } from './units';
import { ages, resourceNodes, resources, setup, terrains } from './world';

const victories: VictoryDef[] = [
  {
    id: 'conquest', name: 'Conquista', description: 'Destruye todas las unidades y edificios enemigos.',
    isDefeated(game, p) {
      return !game.list.some(e => e.owner === p.id && !e.dead && (e.kind === 'unit' || (e.kind === 'building' && !game.reg.building(e.defId).walkable)));
    },
  },
  {
    id: 'suddenDeath', name: 'Muerte súbita', description: 'Pierdes si te quedas sin centros urbanos.',
    isDefeated(game, p) {
      return !game.list.some(e => e.owner === p.id && !e.dead && e.kind === 'building' && game.reg.building(e.defId).classes.includes('townCenter'));
    },
  },
];

/** Contenido y sistemas base del juego. Siempre activo. */
export const coreMod: GameMod = {
  id: 'core',
  name: 'Juego base',
  description: 'Contenido base inspirado en Age of Empires II.',
  core: true,
  register(reg) {
    resources.forEach(r => reg.addResource(r));
    terrains.forEach(t => reg.addTerrain(t));
    resourceNodes.forEach(n => reg.addResourceNode(n));
    ages.forEach(a => reg.addAge(a));
    units.forEach(u => reg.addUnit(u));
    buildings.forEach(b => reg.addBuilding(b));
    techs.forEach(t => reg.addTech(t));
    civs.forEach(c => reg.addCiv(c));
    maps.forEach(m => reg.addMapType(m));
    victories.forEach(v => reg.addVictory(v));
    reg.setup = setup;

    registerCoreSprites(reg);

    reg.addOrder('move', moveOrder);
    reg.addOrder('attack', attackOrder);
    reg.addOrder('attackMove', attackMoveOrder);
    reg.addOrder('explore', exploreOrder);
    reg.addOrder('formation', formationOrder);
    reg.addOrder('gather', gatherOrder);
    reg.addOrder('build', buildOrder);

    reg.addSystem('playerStats', g => new PlayerStatsSystem(g), 0);
    reg.addSystem('ai', g => new AISystem(g), 5);
    reg.addSystem('formations', g => new FormationSystem(g), 9);
    reg.addSystem('orders', g => new OrderSystem(g), 10);
    reg.addSystem('movement', g => new MovementSystem(g), 20);
    reg.addSystem('production', g => new ProductionSystem(g), 30);
    reg.addSystem('aura', g => new AuraSystem(g), 35);
    reg.addSystem('combat', g => new CombatSystem(g), 40);
    reg.addSystem('vision', g => new VisionSystem(g), 50);
    reg.addSystem('victory', g => new VictorySystem(g), 60);
  },
};
