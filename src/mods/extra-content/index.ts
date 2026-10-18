import type { GameMod, SpriteFn } from '../../core/types';
import { ellipse, shade } from '../../render/draw';

/**
 * MOD DE EJEMPLO: añade contenido nuevo sin tocar el motor.
 *  - Una unidad nueva (Elefante de guerra) con su propio sprite.
 *  - Una tecnología que la mejora.
 *  - Un tipo de mapa nuevo (Oasis).
 */

const elephant: SpriteFn = s => {
  const { ctx, x, y, z, color, entity: e, time } = s;
  const facing = e?.facing ?? 1;
  const g = e?.moving ? Math.sin(time * 7 + (e?.id ?? 0)) : 0;
  const swing = e && e.attackAnim > 0 ? Math.sin(((0.35 - e.attackAnim) / 0.35) * Math.PI) : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(z * facing, z);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ellipse(ctx, 0, 0, 17, 5); ctx.fill();
  const skin = '#8e8a86';
  ctx.strokeStyle = shade(skin, -0.25); ctx.lineWidth = 4.5; ctx.lineCap = 'round';
  ctx.beginPath();
  for (const [lx, d] of [[-9, g], [-4, -g], [6, -g], [10, g]] as const) { ctx.moveTo(lx, -10); ctx.lineTo(lx + d * 2, -1); }
  ctx.stroke();
  ctx.fillStyle = skin;
  ellipse(ctx, 0, -15, 15, 9); ctx.fill();
  ellipse(ctx, 14, -18, 6, 6); ctx.fill();
  // trompa y colmillos
  ctx.strokeStyle = skin; ctx.lineWidth = 3.5;
  ctx.beginPath(); ctx.moveTo(18, -16); ctx.quadraticCurveTo(23 + swing * 3, -8, 20 + swing * 4, -2); ctx.stroke();
  ctx.strokeStyle = '#f1ead8'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(17, -13); ctx.lineTo(22, -10); ctx.stroke();
  ctx.fillStyle = shade(skin, -0.15);
  ellipse(ctx, 10, -19, 3.5, 5); ctx.fill();
  // manta y torre
  ctx.fillStyle = color;
  ctx.fillRect(-9, -21, 16, 8);
  ctx.fillStyle = '#7a5530';
  ctx.fillRect(-7, -30, 12, 9);
  ctx.fillStyle = shade(color, 0.3);
  ctx.fillRect(-7, -31, 12, 2);
  ctx.restore();
};

export const extraContentMod: GameMod = {
  id: 'extra-content',
  name: 'Contenido extra',
  description: 'Ejemplo de mod: Elefante de guerra (establo, Edad de los Castillos), tecnología "Colmillos de hierro" y el mapa "Oasis".',
  defaultEnabled: true,
  register(reg) {
    reg.addSprite('elephant', elephant);

    reg.addUnit({
      id: 'warElephant', name: 'Elefante de guerra', icon: '🐘',
      description: 'Lento pero devastador. Mucha vida.',
      classes: ['cavalry', 'elephant'], cost: { food: 170, gold: 85 }, trainTime: 32, trainedAt: ['stable'],
      hp: 450, attack: 16, attackType: 'melee', reloadTime: 2, armor: { melee: 1, pierce: 2 },
      bonus: [{ vs: 'building', amount: 7 }], speed: 0.6, los: 4, pop: 2, age: 2, radius: 0.5,
      sprite: 'elephant',
    });

    reg.addTech({
      id: 'ironTusks', name: 'Colmillos de hierro', icon: '🦣',
      description: 'Elefantes de guerra: +4 ataque y +10% velocidad.',
      cost: { food: 300, gold: 200 }, researchTime: 40, age: 2, researchedAt: 'stable',
      effects: [
        { type: 'stat', target: { classes: ['elephant'] }, stat: 'attack', op: 'add', value: 4 },
        { type: 'stat', target: { classes: ['elephant'] }, stat: 'speed', op: 'mul', value: 1.1 },
      ],
    });

    reg.addMapType({
      id: 'oasis',
      name: 'Oasis',
      description: 'Desierto con un oasis central lleno de árboles y oro.',
      generate(gen) {
        gen.fill('desert');
        const starts = gen.startPositions(0.36);
        starts.forEach(s => gen.protectCircle(s.x, s.y, 11));
        const cx = gen.w / 2, cy = gen.h / 2, r = Math.min(gen.w, gen.h) * 0.12;
        gen.blob(cx, cy, r + 6, (x, y) => gen.set(x, y, 'grass'));
        gen.blob(cx, cy, r, (x, y) => gen.set(x, y, 'water'), 0.3);
        gen.shores();
        gen.players.forEach((p, i) => gen.base(p, starts[i]));
        // Anillo de palmeras alrededor del agua
        for (let a = 0; a < Math.PI * 2; a += 0.04) {
          const d = r + 2 + gen.rand(0, 3);
          gen.placeNode('tree', Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d));
        }
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + 0.4;
          gen.cluster('goldMine', cx + Math.cos(a) * (r + 7), cy + Math.sin(a) * (r + 7), 6);
        }
        gen.scatter('stoneMine', 2 * starts.length, 4, 18, starts);
        gen.forests(4, 2, 3.5, starts, 16);
      },
    });
  },
};
