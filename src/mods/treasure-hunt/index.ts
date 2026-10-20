import type { GameMod, SpriteFn } from '../../core/types';
import type { Game } from '../../game/Game';
import { ellipse } from '../../render/draw';
import { hypot } from '../../game/fmath';

/**
 * MOD DE EJEMPLO: añade REGLAS nuevas con un sistema propio.
 * Cada cierto tiempo aparece un cofre del tesoro en un lugar aleatorio del
 * mapa; los aldeanos pueden recogerlo como si fuera oro.
 */

const chest: SpriteFn = s => {
  const { ctx, x, y, z, time } = s;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(z, z);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ellipse(ctx, 0, 0, 10, 4); ctx.fill();
  ctx.fillStyle = '#7a4a1e'; ctx.fillRect(-8, -10, 16, 9);
  ctx.fillStyle = '#5a3412'; ctx.fillRect(-8, -14, 16, 4);
  ctx.fillStyle = '#e6c13a'; ctx.fillRect(-1.5, -11, 3, 4);
  const glow = (Math.sin(time * 4) + 1) / 2;
  ctx.fillStyle = `rgba(255,230,120,${0.25 + glow * 0.35})`;
  ellipse(ctx, 0, -14, 7, 3); ctx.fill();
  ctx.restore();
};

function spawnTreasure(game: Game): boolean {
  for (let i = 0; i < 60; i++) {
    const x = Math.floor(game.rng() * game.map.w), y = Math.floor(game.rng() * game.map.h);
    if (!game.map.buildable(x, y)) continue;
    // Lejos de los centros urbanos
    const near = game.buildings.some(e => hypot(e.x - x, e.y - y) < 14);
    if (near) continue;
    game.spawnNode('treasure', x, y);
    return true;
  }
  return false;
}

export const treasureHuntMod: GameMod = {
  id: 'treasure-hunt',
  name: 'Caza del tesoro',
  description: 'Ejemplo de mod de reglas: aparecen cofres de oro por el mapa cada 90 segundos.',
  defaultEnabled: false,
  register(reg) {
    reg.addSprite('chest', chest);
    reg.addResourceNode({
      id: 'treasure', name: 'Cofre del tesoro', icon: '💰', resource: 'gold',
      amount: 150, gatherRate: 1.5, sprite: 'chest', minimapColor: '#ffea70',
    });

    reg.onGameStart(game => {
      for (let i = 0; i < 3; i++) spawnTreasure(game);
    });

    reg.addSystem('treasure-hunt', game => {
      let next = 90;
      return {
        save: () => ({ next }),
        load: (s: any) => { next = s?.next ?? next; },
        update() {
          if (game.time < next) return;
          next = game.time + 90;
          if (spawnTreasure(game)) game.notify('💰 ¡Ha aparecido un cofre del tesoro en algún lugar del mapa!', undefined, 'good');
        },
      };
    }, 70);
  },
};
