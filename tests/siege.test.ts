import { describe, expect, it } from 'vitest';
import { TICK_DT } from '../src/core/constants';
import { Commands } from '../src/game/commands';
import { unitAvail, trainablesAt } from '../src/game/rules';
import { Game } from '../src/game/Game';
import { options, reg } from './helpers';

/** Partida de dos jugadores con el primero en la civilización y la edad pedidas, con recursos de sobra. */
async function setup(civ = 'france', age = 4) {
  const o = options('arabia', { startAge: age });
  o.players = [
    { name: 'A', civ, color: '#3b6fe0', human: true, difficulty: 'normal' },
    { name: 'B', civ: 'france', color: '#d63a3a', human: false, difficulty: 'normal' },
  ] as any;
  const g = new Game(reg, o);
  for (const r of ['food', 'wood', 'gold', 'stone', 'iron', 'coal']) g.players[1].res[r] = 5000;
  return g;
}

describe('elefantes de guerra por civilización', () => {
  it('solo Persia y Etiopía los tienen (unidad y tecnología)', async () => {
    for (const civ of ['rus', 'china', 'france', 'britain', 'persia', 'ethiopia']) {
      const g = await setup(civ, 3);
      const has = civ === 'persia' || civ === 'ethiopia';
      expect(unitAvail(g, g.players[1], 'warElephant').visible, civ).toBe(has);
      expect(trainablesAt(g, g.players[1], 'stable').includes('warElephant'), civ).toBe(has);
    }
  });
});

describe('catapulta y escorpión', () => {
  it('se entrenan en el taller de asedio desde Castillos', async () => {
    const g = await setup('france', 2);
    const p = g.players[1];
    const ws = g.placeBuilding('siegeWorkshop', 1, 30, 30, true);
    for (const id of ['catapult', 'scorpion', 'batteringRam']) expect(trainablesAt(g, p, 'siegeWorkshop')).toContain(id);
    expect(Commands.train(g, ws, 'catapult')).toBe(true);
    expect(Commands.train(g, ws, 'scorpion')).toBe(true);
    for (let i = 0; i < 20 * 80; i++) g.update(TICK_DT);
    expect(g.units.filter(u => u.owner === 1 && u.defId === 'catapult').length).toBe(1);
    expect(g.units.filter(u => u.owner === 1 && u.defId === 'scorpion').length).toBe(1);
  });

  it('la catapulta daña en área y no sigue a un blanco que se mueve; el escorpión dispara a tropas', async () => {
    const g = await setup('france', 2);
    const cat = g.spawnUnit('catapult', 1, 20.5, 20.5);
    const near = [g.spawnUnit('militia', 2, 26.5, 20.5), g.spawnUnit('militia', 2, 27.1, 20.5), g.spawnUnit('militia', 2, 26.5, 21.1)];
    const far = g.spawnUnit('militia', 2, 31, 20.5);
    for (const u of [...near, far]) u.stance = 'passive';
    Commands.attack(g, [cat], near[0]);
    for (let i = 0; i < 20 * 14; i++) g.update(TICK_DT);
    const hurt = near.filter(u => u.dead || u.hp < g.unitDef(u).hp).length;
    expect(hurt).toBeGreaterThanOrEqual(2);
    expect(far.hp).toBe(g.unitDef(far).hp);

    // El escorpión (antiUnit) elige tropas por su cuenta; el ariete, no
    const sc = g.spawnUnit('scorpion', 1, 60.5, 60.5), ram = g.spawnUnit('batteringRam', 1, 70.5, 60.5);
    const foe1 = g.spawnUnit('militia', 2, 64.5, 60.5), foe2 = g.spawnUnit('militia', 2, 74.5, 60.5);
    foe1.stance = 'passive'; foe2.stance = 'passive';
    for (let i = 0; i < 20 * 6; i++) g.update(TICK_DT);
    expect(foe1.dead || foe1.hp < g.unitDef(foe1).hp).toBe(true);
    expect(foe2.hp).toBe(g.unitDef(foe2).hp);
    expect(sc.dead).toBe(false);
  });
});

describe('evolución del asedio por era', () => {
  it('cada mejora cambia la unidad que se entrena y convierte las que ya hay', async () => {
    const g = await setup('france', 5);
    const p = g.players[1];
    const old = g.spawnUnit('catapult', 1, 20.5, 20.5);
    const apply = (tech: string) => p.addEffects(g.reg.tech(tech).effects, g);
    apply('up_trebuchet');
    expect(old.defId).toBe('trebuchet');
    expect(p.resolveUnit('catapult')).toBe('trebuchet');
    apply('up_bombard');
    expect(old.defId).toBe('bombard');
    apply('up_howitzer');
    expect(old.defId).toBe('howitzer');
    expect(trainablesAt(g, p, 'siegeWorkshop')).toContain('howitzer');
    expect(trainablesAt(g, p, 'siegeWorkshop')).not.toContain('catapult');
    apply('up_fieldGun');
    expect(trainablesAt(g, p, 'gunpowderWorks')).toContain('fieldGun');
  });
});

describe('la IA y el asedio', () => {
  it('construye el taller y entrena asedio variado, y mejora sus líneas', async () => {
    const o = options('arabia', { startAge: 3, seed: 3 });
    o.players = [
      { name: 'A', civ: 'france', color: '#3b6fe0', human: false, difficulty: 'normal' },
      { name: 'B', civ: 'china', color: '#d63a3a', human: false, difficulty: 'normal' },
    ] as any;
    const g = new Game(reg, o);
    const trained = new Set<string>();
    g.events.on('unitTrained', ({ entity }: any) => { if (g.unitDef(entity).classes.includes('siege')) trained.add(entity.defId); });
    for (let i = 0; i < 20 * 60 * 25; i++) {
      // Recursos de sobra para ver las decisiones de la IA sin que la economía las tape
      if (i % (20 * 20) === 0) for (const p of g.players.slice(1)) for (const r of ['food', 'wood', 'gold', 'stone']) p.res[r] = Math.max(p.res[r] ?? 0, 1500);
      g.update(TICK_DT);
    }
    expect(g.players.slice(1).some(p => p.count('siegeWorkshop') > 0)).toBe(true);
    // Más de un tipo de asedio (no solo arietes) y alguna mejora investigada
    expect(trained.size).toBeGreaterThanOrEqual(2);
    expect([...trained].some(id => id !== 'batteringRam' && id !== 'cappedRam')).toBe(true);
    expect(g.players.slice(1).some(p => [...p.researched].some(t => t.startsWith('up_') && ['up_trebuchet', 'up_heavyScorpion', 'up_cappedRam'].includes(t)))).toBe(true);
  }, 120_000);
});
