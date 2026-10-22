import type { GameMod, VictoryDef } from '../../core/types';
import { attackMoveOrder, attackOrder, exploreOrder, buildOrder, gatherOrder, moveOrder } from '../../game/orders';
import { garrisonOrder } from '../../game/garrison';
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
import { wildlifeBuildings, wildlifeNodes, wildlifeSpawns, wildlifeTechs, wildlifeUnits } from './wildlife';
import { britainBuildings, britainTechs, britainUnits } from './civ-britain';
import { chinaBuildings, chinaTechs, chinaUnits } from './civ-china';
import { franceBuildings, franceTechs, franceUnits } from './civ-france';
import { industrialBuildings, industrialTechs, industrialUnits, airRule } from './industrial';
import { industrialCivBuildings, industrialCivTechs, industrialCivUnits } from './civ-industrial';
import { persiaBuildings, persiaTechs, persiaUnits } from './civ-persia';
import { ethiopiaBuildings, ethiopiaTechs, ethiopiaUnits } from './civ-ethiopia';
import { gunpowderAI, gunpowderBuildings, gunpowderTechs, gunpowderUnits } from './gunpowder';
import { powers, powersAI } from './powers';
import { PowerSystem, truceRule, usePower } from '../../game/powers';
import { WildlifeSystem, retaliateOrder } from '../../game/wildlife';

const victories: VictoryDef[] = [
  {
    id: 'conquest', name: 'Conquista', description: 'Destruye todas las unidades y edificios enemigos.',
    isDefeated(game, p) {
      return !game.list.some(e => e.owner === p.id && !e.dead && ((e.kind === 'unit' && !game.reg.unit(e.defId).classes.includes('livestock')) || (e.kind === 'building' && !game.reg.building(e.defId).walkable)));
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
    wildlifeNodes.forEach(n => reg.addResourceNode(n));
    units.forEach(u => reg.addUnit(u));
    wildlifeUnits.forEach(u => reg.addUnit(u));
    buildings.forEach(b => reg.addBuilding(b));
    wildlifeBuildings.forEach(b => reg.addBuilding(b));
    techs.forEach(t => reg.addTech(t));
    wildlifeTechs.forEach(t => reg.addTech(t));
    // Era 4 (Pólvora) y lo único de cada civilización por era
    [...gunpowderUnits, ...chinaUnits, ...franceUnits, ...britainUnits].forEach(u => reg.addUnit(u));
    [...gunpowderBuildings, ...chinaBuildings, ...franceBuildings, ...britainBuildings].forEach(b => reg.addBuilding(b));
    [...gunpowderTechs, ...chinaTechs, ...franceTechs, ...britainTechs].forEach(t => reg.addTech(t));
    reg.addAIPlugin(gunpowderAI);
    // Era 5 (Industrial): árbol común, lo único de cada civilización y Persia y Etiopía (eras 0–5)
    [...industrialUnits, ...industrialCivUnits, ...persiaUnits, ...ethiopiaUnits].forEach(u => reg.addUnit(u));
    [...industrialBuildings, ...industrialCivBuildings, ...persiaBuildings, ...ethiopiaBuildings].forEach(b => reg.addBuilding(b));
    [...industrialTechs, ...industrialCivTechs, ...persiaTechs, ...ethiopiaTechs].forEach(t => reg.addTech(t));
    reg.addCombatRule(airRule);
    powers.forEach(w => reg.addPower(w));
    reg.addAIPlugin(powersAI);
    reg.addNetCommand('power', usePower);
    reg.addCombatRule(truceRule);
    civs.forEach(c => reg.addCiv(c));
    maps.forEach(m => reg.addMapType(m));
    victories.forEach(v => reg.addVictory(v));
    reg.setup = { ...setup, wildlife: wildlifeSpawns };

    registerCoreSprites(reg);

    reg.addOrder('move', moveOrder);
    reg.addOrder('attack', attackOrder);
    reg.addOrder('attackMove', attackMoveOrder);
    reg.addOrder('explore', exploreOrder);
    reg.addOrder('formation', formationOrder);
    reg.addOrder('gather', gatherOrder);
    reg.addOrder('build', buildOrder);
    reg.addOrder('garrison', garrisonOrder);
    reg.addOrder('retaliate', retaliateOrder);

    reg.addSystem('playerStats', g => new PlayerStatsSystem(g), 0);
    reg.addSystem('powers', g => new PowerSystem(g), 3);
    reg.addSystem('ai', g => new AISystem(g), 5);
    reg.addSystem('formations', g => new FormationSystem(g), 9);
    reg.addSystem('wildlife', g => new WildlifeSystem(g), 8);
    reg.addSystem('orders', g => new OrderSystem(g), 10);
    reg.addSystem('movement', g => new MovementSystem(g), 20);
    reg.addSystem('production', g => new ProductionSystem(g), 30);
    reg.addSystem('aura', g => new AuraSystem(g), 35);
    reg.addSystem('combat', g => new CombatSystem(g), 40);
    reg.addSystem('vision', g => new VisionSystem(g), 50);
    reg.addSystem('victory', g => new VictorySystem(g), 60);
  },
};
