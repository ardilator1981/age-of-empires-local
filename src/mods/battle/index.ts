import { BALANCE } from '../../config/balance';
import type { GameMod } from '../../core/types';
import { battleAI } from './ai';
import { drawBattle } from './draw';
import { battleCommandFilter, battleOrder } from './orders';
import { battleActive } from './state';
import { battleDamage, BattleSystem } from './system';

/** Clases de las unidades cuyo daño de área también alcanza a las propias (artillería y asedio, §3.7). */
const FRIENDLY_FIRE_CLASSES = ['siege'];

/**
 * Capa táctica «tipo Shogun» (docs/batalla-tactica.md, fase 1): regimientos automáticos, moral con
 * huida y recuperación, daño por flanco y retaguardia, carga con ímpetu anulada por lanzas, General
 * caído como golpe de moral y fuego amigo de la artillería. Se activa marcando el mod; sin él, el
 * combate es el de siempre. Las cifras están en `BALANCE.battle` (calibradas en la fase 0).
 *
 * Pendiente de las fases siguientes: cansancio y munición, órdenes de correr/cargar/arengar en la
 * interfaz, iconos de estado, mando limitado sin General, y el mapa de batalla aparte.
 */
export const battleMod: GameMod = {
  id: 'battle',
  name: 'Batalla táctica',
  description: 'Regimientos con moral: las tropas huyen y se recuperan, el flanco y la retaguardia hacen más daño, la caballería carga y la artillería puede herir a las propias. El combate es más lento.',
  defaultEnabled: false,
  register(reg) {
    reg.addDamageModifier(battleDamage);
    reg.addFriendlyFire((game, attacker) => game.unitDef(attacker).classes.some(c => FRIENDLY_FIRE_CLASSES.includes(c)) && battleActive(game, attacker));
    // Correr, cargar y arengar son órdenes de jugador (en red, por la cola de turnos); los iconos de estado se dibujan sobre el mapa
    reg.addNetCommand('battle', battleOrder);
    reg.addCommandFilter(battleCommandFilter);
    reg.addAIPlugin(battleAI);
    reg.addTopOverlay(drawBattle);
    // 45: después del combate (40) y la defensa (41)
    reg.addSystem('battle', game => new BattleSystem(game), 45);
    // El General de Guerra declarada, con el aura propia de la batalla (la del juego decide la batalla sola)
    if (reg.units.has('general')) {
      // Una copia: la definición es un objeto del módulo del otro mod y la comparten todos los registros
      const g = reg.unit('general');
      reg.addUnit({ ...g, aura: { ...g.aura!, attackMul: BALANCE.battle.auraAttackMul, armorAdd: BALANCE.battle.auraArmorAdd } });
    }
  },
};
