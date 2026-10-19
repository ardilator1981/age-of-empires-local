import { BALANCE } from '../../config/balance';
import type { GameMod, UnitDef } from '../../core/types';
import { warAI } from './ai';
import { drawWarMinimap, drawWarWorld } from './draw';
import { warPanel } from './panel';
import { GENERAL, initWar, updateWar, warCombatRule } from './war';

const G = BALANCE.war.general;

const general: UnitDef = {
  id: GENERAL, name: 'General', icon: '🎖️',
  description: `Líder del ejército. Las tropas propias a ${G.auraRadius} casillas atacan un ${Math.round((G.auraAttackMul - 1) * 100)} % más y tienen +${G.auraArmorAdd} de armadura (moral). Solo uno a la vez; si cae, hay que esperar para entrenar otro.`,
  classes: ['cavalry', 'hero'], cost: { food: 500, wood: 300 }, trainTime: 90, trainedAt: ['castle'],
  hp: 320, attack: 14, attackType: 'melee', reloadTime: 1.8, armor: { melee: 4, pierce: 4 },
  speed: 1.3, los: 8, pop: 1, age: BALANCE.war.requiredAge, radius: 0.38,
  maxAlive: 1, retrainCooldown: G.retrainCooldown,
  aura: { radius: G.auraRadius, attackMul: G.auraAttackMul, armorAdd: G.auraArmorAdd },
  sprite: 'cavalry', spriteParams: { weapon: 'sword', horse: '#ece6da', barding: true, helmet: true, armor: true, banner: true, plume: true, scale: 1.15 },
};

/**
 * Modo de juego "Guerra declarada": nadie puede atacar hasta que alguien declara la guerra
 * (Edad de los Castillos + asentamiento rival descubierto + General), elige un punto de
 * batalla y pasa la cuenta atrás. Entonces se combate solo dentro del círculo, y la batalla
 * decide la partida. Si el mod no está activo, el juego funciona como siempre.
 */
export const declaredWarMod: GameMod = {
  id: 'declared-war',
  name: 'Guerra declarada',
  description: 'Paz hasta que alguien declara la guerra (Edad de los Castillos, enemigo descubierto y un General). Se elige un punto, hay cuenta atrás para prepararse y la batalla en el círculo decide la partida.',
  defaultEnabled: false,
  register(reg) {
    reg.addUnit(general);
    reg.addCombatRule(warCombatRule);
    reg.addAIPlugin(warAI);
    reg.onGameStart(initWar);
    reg.addSystem('declared-war', game => ({ update: dt => updateWar(game, dt) }), 55);
    reg.addHudPanel(warPanel);
    reg.addWorldOverlay(drawWarWorld);
    reg.addMinimapOverlay(drawWarMinimap);
  },
};
