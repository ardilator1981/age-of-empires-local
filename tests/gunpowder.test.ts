import { describe, expect, it } from 'vitest';
import { TICK_DT } from '../src/core/constants';
import { Game } from '../src/game/Game';
import type { Player } from '../src/game/Player';
import { stateHash } from '../src/game/net/hash';
import { buildingAvail, techAvail, unitAvail } from '../src/game/rules';
import { snapshot, upgradeSave, type SaveData } from '../src/game/save';
import { options, reg } from './helpers';

const CIVS = ['rus', 'china', 'france', 'britain'];
const ALL_CIVS = [...CIVS, 'persia', 'ethiopia'];
const IDENTITY: Record<string, string> = { rus: 'Imperio ruso', china: 'Qing', france: 'Antiguo Régimen', britain: 'Gran Bretaña' };

function duel(a: string, b: string, startAge = 0, extra: Record<string, unknown> = {}, seed = 4): Game {
  const o = options('arabia', { seed, startAge, ...extra });
  o.players = [
    { name: 'A', civ: a, color: '#3b6fe0', human: false, difficulty: 'hard' },
    { name: 'B', civ: b, color: '#d63a3a', human: false, difficulty: 'easy' },
  ] as any;
  return new Game(reg, o);
}

/** Partida con un rival humano que no hace nada: la IA juega sin que la maten. */
function peaceful(civ: string, startAge: number, seed: number): Game {
  const o = options('arabia', { seed, startAge });
  o.players = [
    { name: 'A', civ, color: '#3b6fe0', human: false, difficulty: 'hard' },
    { name: 'B', civ: 'france', color: '#d63a3a', human: true, difficulty: 'easy' },
  ] as any;
  return new Game(reg, o);
}

function finishTech(g: Game, p: Player, techId: string) {
  const prod = g.systems.find(s => 'finishTech' in s) as any;
  const b = g.buildings.find(x => x.owner === p.id && g.reg.tech(techId).researchedAt === x.defId) ?? g.buildings.find(x => x.owner === p.id && x.defId === 'townCenter')!;
  prod.finishTech(b, techId);
}

/** Coloca un edificio terminado en un sitio libre junto al centro urbano del jugador. */
function place(g: Game, pid: number, defId: string) {
  const tc = g.buildings.find(b => b.owner === pid && b.defId === 'townCenter')!;
  const size = g.reg.building(defId).size;
  for (let r = 5; r < 25; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const x = Math.round(tc.x) + dx, y = Math.round(tc.y) + dy;
    if (!g.canPlace(defId, x, y)) continue;
    const e = g.placeBuilding(defId, pid, x, y, true);
    g.update(TICK_DT); // el jugador cuenta sus edificios en el siguiente tick
    return e;
  }
  throw new Error(`no hay sitio para ${defId} (${size}x${size})`);
}

const run = (g: Game, seconds: number) => { for (let i = 0; i < seconds / TICK_DT && !g.over; i++) g.update(TICK_DT); };
/** Sigue jugando aunque la partida haya terminado (el rival quieto cae y el juego marca la victoria). */
const runOn = (g: Game, seconds: number) => { for (let i = 0; i < seconds / TICK_DT; i++) g.update(TICK_DT); };

function roundTrip(g: Game): Game {
  const save: SaveData = JSON.parse(JSON.stringify(snapshot(g)));
  const up = upgradeSave(save);
  if (typeof up === 'string') throw new Error(up);
  return new Game(reg, up.opts, up);
}

describe('era 4 · Pólvora', () => {
  it('el contenido no tiene referencias rotas', () => {
    expect(reg.validate()).toEqual([]);
  });

  it('la Pólvora es la edad 4, entre la Imperial y la Industrial', () => {
    expect(reg.ages.map(a => a.id).slice(0, 6)).toEqual(['dark', 'feudal', 'castle', 'imperial', 'gunpowder', 'industrial']);
  });

  it('cada civilización tiene una capa por cada edad, de la 0 a la 5', () => {
    for (const id of ALL_CIVS) expect(Object.keys(reg.civs.get(id)!.eras ?? {}).map(Number)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('todo lo único de una civilización se puede conseguir con ella: su edificio de entrenamiento o investigación también está a su alcance', () => {
    const ok = (civ: string, id: string) => { const b = reg.buildings.get(id)!; return !b.civs || b.civs.includes(civ); };
    for (const civ of ALL_CIVS) {
      for (const u of reg.units.values()) {
        if (!u.civs?.includes(civ)) continue;
        expect(u.trainedAt.some(b => ok(civ, b)), `${u.id} en ${u.trainedAt}`).toBe(true);
        expect(u.age).toBeLessThanOrEqual(5);
      }
      for (const t of reg.techs.values()) if (t.civs?.includes(civ)) expect(ok(civ, t.researchedAt), `${t.id} en ${t.researchedAt}`).toBe(true);
    }
  });

  it('cada civilización tiene al menos una unidad, un edificio y una tecnología únicos en cada era que lo pide el diseño', () => {
    const has = (civ: string, age: number) => ({
      u: [...reg.units.values()].some(u => u.civs?.includes(civ) && u.age === age),
      b: [...reg.buildings.values()].some(b => b.civs?.includes(civ) && b.age === age),
    });
    for (const civ of ['china', 'france', 'rus']) expect(has(civ, 4).u).toBe(true);
    // Era 4: unidad única de las cuatro y edificio único de las cuatro
    for (const civ of CIVS) { expect(has(civ, 4).u).toBe(true); expect(has(civ, 4).b).toBe(true); }
    // Eras 0–3 de China, Francia y Gran Bretaña
    for (const civ of ['china', 'france', 'britain']) for (const age of [0, 1, 2, 3]) {
      const h = has(civ, age);
      const tech = [...reg.techs.values()].some(t => t.civs?.includes(civ) && t.age === age);
      expect(h.u || h.b || tech, `${civ} era ${age}`).toBe(true);
    }
  });

  it('subir a Pólvora exige dos de castillo, taller de asedio y herrería, y da la identidad de la era', () => {
    for (const civ of CIVS) {
      const g = duel(civ, 'france', 3);
      const p = g.players[1];
      expect(techAvail(g, p, 'gunpowderAge').ok).toBe(false);
      for (const id of ['castle', 'blacksmith']) place(g, 1, id);
      p.res.food = 5000; p.res.gold = 5000;
      expect(techAvail(g, p, 'gunpowderAge').ok).toBe(true);
      finishTech(g, p, 'gunpowderAge');
      expect(p.age).toBe(4);
      expect(p.identity).toBe(IDENTITY[civ]);
    }
  });

  it('el árbol común: fábrica de pólvora, mosquetero, cañón y dragón desde la edad 4', () => {
    const g = duel('china', 'france', 4);
    const p = g.players[1];
    p.res.wood = 5000; p.res.stone = 5000; p.res.food = 5000; p.res.gold = 5000;
    place(g, 1, 'blacksmith');
    expect(buildingAvail(g, p, 'gunpowderWorks').ok).toBe(true);
    place(g, 1, 'gunpowderWorks');
    expect(unitAvail(g, p, 'musketeer').ok).toBe(true);
    expect(unitAvail(g, p, 'cannon').ok).toBe(true);
    expect(g.reg.unit('musketeer').classes).toContain('firearm');
    const young = duel('china', 'france', 3).players[1];
    expect(unitAvail(duel('china', 'france', 3), young, 'musketeer').ok).toBe(false);
  });

  it('bonos de la era 4 de cada civilización', () => {
    const rus = duel('rus', 'china', 4).players[1];
    const g = duel('rus', 'china', 4);
    const musk = g.reg.unit('musketeer');
    expect(g.players[1].getCost(musk).food).toBe(38);          // 50 × 0,75 (quintas)
    expect(g.players[1].getStat(musk, 'hp')).toBeCloseTo(49.5); // 55 × 0,9
    expect(duel('france', 'rus', 4).players[1].getCost(musk).food).toBe(50);
    expect(g.players[1].getCost(g.reg.unit('cannon')).wood).toBe(144); // artillería -20%
    expect(rus.identity).toBe('Imperio ruso');
    const f = duel('france', 'rus', 4).players[1];
    const g2 = duel('france', 'rus', 4);
    expect(g2.players[1].getStat(g2.reg.building('fortress'), 'hp')).toBeCloseTo(6200 * 1.2);
    expect(g2.players[2].getStat(g2.reg.building('fortress'), 'hp')).toBe(6200);
    expect(f.civ.id).toBe('france');
    const g3 = duel('china', 'britain', 4);
    expect(g3.players[1].getStat(g3.reg.unit('knight'), 'hp')).toBeCloseTo(100 * 1.1);
    expect(g3.players[2].getCost(g3.reg.unit('militia')).food).toBe(48); // milicia colonial -20%
  });

  it('el Hong de Cantón solo puede haber uno', () => {
    const g = duel('china', 'france', 4);
    const p = g.players[1];
    p.res.wood = 5000; p.res.gold = 5000;
    expect(buildingAvail(g, p, 'cantonHong').ok).toBe(true);
    place(g, 1, 'cantonHong');
    const a = buildingAvail(g, p, 'cantonHong');
    expect(a.ok).toBe(false);
    expect(a.reason).toMatch(/Solo puedes tener un/);
  });

  it('Deuda nacional: 800 de oro ahora y las unidades cuestan más oro', () => {
    const g = duel('britain', 'rus', 4);
    const p = g.players[1];
    const before = p.getCost(g.reg.unit('musketeer')).gold;
    const gold = p.res.gold;
    finishTech(g, p, 'nationalDebt');
    expect(p.res.gold - gold).toBe(800);
    expect(p.getCost(g.reg.unit('musketeer')).gold).toBe(Math.round(before * 1.08));
    // La subida no se duplica al recalcular los modificadores
    p.rebuildModifiers(g);
    expect(p.getCost(g.reg.unit('musketeer')).gold).toBe(Math.round(before * 1.08));
  });

  it('Contratar mercenarios añade seis piqueros una sola vez', () => {
    const g = duel('france', 'rus', 3);
    const p = g.players[1];
    const n = () => g.units.filter(u => !u.dead && u.owner === 1 && u.defId === 'pikeman').length;
    expect(n()).toBe(0);
    finishTech(g, p, 'hireMercenaries');
    expect(n()).toBe(6);
    p.rebuildModifiers(g);
    expect(n()).toBe(6);
  });

  it('Imprenta abarata las tecnologías', () => {
    const g = duel('britain', 'rus', 4);
    const p = g.players[1];
    const c = p.getCost(g.reg.tech('ballistics')).gold;
    finishTech(g, p, 'printing');
    expect(p.getCost(g.reg.tech('ballistics')).gold).toBe(Math.round(c * 0.85));
  });

  it('la IA de cada civilización sube sola a Pólvora y construye lo de la era', () => {
    for (const civ of CIVS) {
      const g = peaceful(civ, 3, 6);
      runOn(g, 50 * 60);
      const p = g.players[1];
      expect(p.age, `${civ}: edad`).toBeGreaterThanOrEqual(4);
      expect(p.count('gunpowderWorks'), `${civ}: fábrica de pólvora`).toBeGreaterThan(0);
      expect(p.stats.trained, `${civ}: entrena`).toBeGreaterThan(30);
    }
  }, 120000);

  it('la IA investiga las tecnologías de la era y las únicas, y entrena sus unidades', () => {
    // Francia (semilla 6) llega pronto a Pólvora: comprueba tecnologías propias y unidades de la era
    const g = peaceful('france', 3, 6);
    runOn(g, 50 * 60);
    const p = g.players[1];
    expect(p.age).toBeGreaterThanOrEqual(4);
    const unique = [...p.researched].filter(t => reg.techs.get(t)!.civs?.includes('france'));
    expect(unique.length).toBeGreaterThan(0);
    const era4 = g.list.filter(e => e.kind === 'unit' && e.owner === 1 && !e.dead && reg.units.get(e.defId)!.age >= 4);
    expect(era4.length).toBeGreaterThan(0);
  }, 60000);

  it('guardar y cargar en la era 4 deja la partida idéntica (también los bonos de era y lo investigado)', () => {
    for (const civ of CIVS) {
      const a = duel(civ, 'france', 4, { startingResources: 'high' }, 9);
      run(a, 6 * 60);
      const b = roundTrip(a);
      expect(stateHash(b)).toBe(stateHash(a));
      expect(b.players[1].identity).toBe(IDENTITY[civ]);
      // Mismos bonos (el orden de los modificadores no importa: el «extra» de la IA va primero al recalcular)
      const sorted = (p: Player) => p.modifiers.map(m => JSON.stringify(m)).sort();
      expect(sorted(b.players[1])).toEqual(sorted(a.players[1]));
      run(a, 60); run(b, 60);
      expect(stateHash(b)).toBe(stateHash(a));
    }
  }, 60000);
});

describe('civilizaciones incompletas', () => {
  it('ninguna lo es mientras el juego acabe en la era 5, y sí cuando haya una era más', async () => {
    const { civIncomplete } = await import('../src/game/rules');
    for (const civ of reg.civs.values()) expect(civIncomplete(reg, civ)).toBe(false);
    expect(civIncomplete({ ages: [...reg.ages, { index: 6 }] }, reg.civs.get('china')!)).toBe(true);
  });
});
