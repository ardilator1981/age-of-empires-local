import type { GameMod, UnitDef } from '../../core/types';
import { regicideAI } from './ai';
import { kingSprite } from './sprite';
import { RegicideSystem } from './system';
import { drawKingMinimap, drawKingWorld, kingPanel } from './ui';
import { initRegicide, kingFallen, KING, REGICIDE } from './rules';

/** Edificios donde puede refugiarse el rey. Para otros edificios de estado, basta darles `shelter` en su definición. */
const SHELTERS = ['townCenter', 'castle'];

const king: UnitDef = {
  id: KING, name: 'Rey', icon: '👑',
  description: 'Tu soberano. Si cae, pierdes la partida. No ataca: protégelo, o escóndelo en el centro urbano o en un castillo (si el edificio cae, el rey sale y queda expuesto).',
  classes: ['king', 'hero'], cost: {}, trainTime: 1, trainedAt: [],
  hp: 350, armor: { melee: 3, pierce: 6 },
  speed: 1.1, los: 7, pop: 0, age: 0, radius: 0.3,
  maxAlive: 1, undeletable: true,
  sprite: 'king', spriteParams: { cape: true, armor: true, hair: '#d8d4cc', scale: 1.1 },
};

/**
 * Modo de juego "Matar al rey": cada jugador tiene un rey y pierde quien pierde el suyo.
 * Se activa marcando el mod y eligiendo la victoria «Matar al rey» al crear la partida; con
 * cualquier otra victoria no cambia nada.
 */
export const regicideMod: GameMod = {
  id: 'regicide',
  name: 'Matar al rey',
  description: 'Añade la victoria «Matar al rey»: cada jugador tiene un rey sin ataque que puede esconderse en el centro urbano y los castillos. Pierde quien pierde a su rey. Elígela en «Victoria».',
  defaultEnabled: false,
  register(reg) {
    reg.addSprite('king', kingSprite);
    reg.addUnit(king);
    for (const id of SHELTERS) if (reg.buildings.has(id)) reg.patchBuilding(id, d => { d.shelter = { classes: ['king'], capacity: 1 }; });
    reg.addVictory({
      id: REGICIDE, name: 'Matar al rey',
      description: 'Cada jugador tiene un rey. Pierde quien pierde su rey; gana el último con rey vivo. El rey se refugia en el centro urbano y los castillos.',
      isDefeated: kingFallen,
    });
    reg.onGameStart(initRegicide);
    reg.addSystem('regicide', game => new RegicideSystem(game), 59);
    reg.addAIPlugin(regicideAI);
    reg.addHudPanel(kingPanel);
    reg.addWorldOverlay(drawKingWorld);
    reg.addMinimapOverlay(drawKingMinimap);
  },
};
