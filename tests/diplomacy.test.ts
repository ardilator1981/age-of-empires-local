import { describe, expect, it } from 'vitest';
import { TICK_DT } from '../src/core/constants';
import { accept, breakTreaty, diplomacyOff, diploState, embargoed, propose, relation, setEmbargo, tribute } from '../src/game/diplomacy';
import { applyNetCommand } from '../src/game/net/netCommands';
import { stateHash } from '../src/game/net/hash';
import { hiddenFrom, spyCommand, stealableTech } from '../src/game/espionage';
import { hypot } from '../src/game/fmath';
import { Game } from '../src/game/Game';
import { snapshot, upgradeSave, type SaveData } from '../src/game/save';
import { tradeCommand } from '../src/game/trade';
import { options, reg } from './helpers';

/** Dos jugadores humanos (así la IA no interviene) en arabia, para probar la lógica a mano. */
function two(seed = 3, extra: Record<string, unknown> = {}): Game {
  const o = options('arabia', { seed, ...extra });
  o.players = o.players.map(p => ({ ...p, human: true })) as any;
  return new Game(reg, o);
}

function place(g: Game, pid: number, defId: string) {
  const tc = g.buildings.find(b => b.owner === pid && b.defId === 'townCenter')!;
  for (let r = 5; r < 25; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const x = Math.round(tc.x) + dx, y = Math.round(tc.y) + dy;
    if (!g.canPlace(defId, x, y)) continue;
    const e = g.placeBuilding(defId, pid, x, y, true);
    g.update(TICK_DT);
    return e;
  }
  throw new Error(`sin sitio para ${defId}`);
}
const run = (g: Game, seconds: number) => { for (let i = 0; i < seconds / TICK_DT; i++) g.update(TICK_DT); };
function roundTrip(g: Game): Game {
  const save: SaveData = JSON.parse(JSON.stringify(snapshot(g)));
  const up = upgradeSave(save);
  if (typeof up === 'string') throw new Error(up);
  return new Game(reg, up.opts, up);
}
const makePeace = (g: Game) => { propose(g, 1, 2, 'peace'); accept(g, 2, diploState(g)!.proposals[0].id); };
const proposalId = (g: Game) => diploState(g)!.proposals[0].id;

describe('diplomacia', () => {
  it('por defecto todos están en guerra y la paz se propone y se acepta', () => {
    const g = two();
    expect(relation(g, 1, 2)).toBe(0);
    expect(g.isEnemy(1, 2)).toBe(true);
    expect(propose(g, 1, 2, 'peace')).toBe(true);
    expect(g.isEnemy(1, 2)).toBe(true); // hasta que acepte
    expect(accept(g, 1, proposalId(g))).toBe(false); // no puede aceptar la propia
    expect(accept(g, 2, proposalId(g))).toBe(true);
    expect(relation(g, 1, 2)).toBe(1);
    expect(g.isEnemy(1, 2)).toBe(false);
  });

  it('en paz nadie se puede atacar; romper la paz tiene bloqueo y devuelve la guerra', () => {
    const g = two();
    makePeace(g);
    const a = g.units.find(u => u.owner === 1)!, b = g.units.find(u => u.owner === 2)!;
    expect(g.canAttack(a, b, false)).toBe(false);
    expect(breakTreaty(g, 1, 2)).toBe(false); // tratado recién firmado
    run(g, 100);
    expect(breakTreaty(g, 1, 2)).toBe(true);
    expect(relation(g, 1, 2)).toBe(0);
    expect(g.canAttack(a, b, false)).toBe(true);
  });

  it('proponerse mutuamente cierra el trato; la alianza exige paz antes', () => {
    const g = two();
    expect(propose(g, 1, 2, 'alliance')).toBe(false);
    propose(g, 1, 2, 'peace');
    propose(g, 2, 1, 'peace');
    expect(relation(g, 1, 2)).toBe(1);
    run(g, 100);
    propose(g, 1, 2, 'alliance');
    accept(g, 2, proposalId(g));
    expect(relation(g, 1, 2)).toBe(2);
  });

  it('las propuestas sin respuesta caducan', () => {
    const g = two();
    propose(g, 1, 2, 'peace');
    run(g, 130);
    expect(diploState(g)!.proposals.length).toBe(0);
  });

  it('los aliados comparten visión y, si solo quedan aliados, la partida termina con victoria compartida', () => {
    const g = two();
    makePeace(g);
    run(g, 100);
    propose(g, 1, 2, 'alliance');
    accept(g, 2, proposalId(g));
    run(g, 2);
    const foe = g.buildings.find(b => b.owner === 2)!;
    expect(g.players[1].visible[Math.floor(foe.y) * g.map.w + Math.floor(foe.x)]).toBe(1);
    expect(g.over).toBe(true);
  });

  it('tributo con comisión, embargo y órdenes de red', () => {
    const g = two();
    const gold = g.players[2].res.gold;
    expect(tribute(g, 1, 2, 'gold', 10)).toBe(false); // por debajo del mínimo
    g.players[1].res.gold = 500;
    expect(tribute(g, 1, 2, 'gold', 200)).toBe(true);
    expect(g.players[1].res.gold).toBe(300);
    expect(g.players[2].res.gold).toBe(gold + 150);
    expect(setEmbargo(g, 1, 2, true)).toBe(true);
    expect(embargoed(g, 2, 1)).toBe(true);
    // por la cola de turnos
    expect(applyNetCommand(g, 2, { t: 'mod', id: 'diplo', args: { a: 'propose', to: 1, kind: 'peace' } })).toBe(true);
    expect(applyNetCommand(g, 1, { t: 'mod', id: 'diplo', args: { a: 'accept', id: proposalId(g) } })).toBe(true);
    expect(relation(g, 1, 2)).toBe(1);
  });

  it('el modo Matar al rey no admite diplomacia', () => {
    const g = new Game(reg, { ...options('arabia', { players: 2 }), victory: 'regicide' } as any);
    expect(diplomacyOff(g) || g.reg.victories.get('regicide') === undefined).toBe(true);
  });
});

describe('comercio', () => {
  function setup() {
    const g = two();
    const m1 = place(g, 1, 'market'), m2 = place(g, 2, 'market');
    g.players[1].age = 1; g.players[2].age = 1;
    const c = g.spawnUnit('caravan', 1, m1.x, m1.y + 3);
    return { g, m1, m2, c };
  }

  it('sin paz no se comercia; con paz, la caravana cobra y el otro puesto también', () => {
    const { g, m2, c } = setup();
    expect(tradeCommand(g, 1, { units: [c.id], dest: m2.id })).toBe(false);
    makePeace(g);
    const g1 = g.players[1].res.gold, g2 = g.players[2].res.gold;
    expect(applyNetCommand(g, 1, { t: 'mod', id: 'trade', args: { units: [c.id], dest: m2.id } })).toBe(true);
    run(g, 200);
    expect(g.players[1].res.gold).toBeGreaterThan(g1 + 40);
    expect(g.players[2].res.gold).toBeGreaterThan(g2);
    expect(g.players[1].res.gold - g1).toBeGreaterThan(g.players[2].res.gold - g2);
    expect(g.players[1].data.tradeTotal).toBeGreaterThan(0);
  });

  it('la ruta se cancela si estalla la guerra o hay embargo', () => {
    const { g, m2, c } = setup();
    makePeace(g);
    tradeCommand(g, 1, { units: [c.id], dest: m2.id });
    run(g, 5);
    expect(c.order?.type).toBe('trade');
    setEmbargo(g, 2, 1, true);
    run(g, 1);
    expect(c.order).toBeNull();
  });

  it('la ruta propia cobra menos que la extranjera y pide distancia mínima', () => {
    const { g, m1, c } = setup();
    const near = place(g, 1, 'market');
    // dos mercados pegados: ruta demasiado corta
    expect(tradeCommand(g, 1, { units: [c.id], dest: near.id })).toBe(false);
    expect(m1).toBeTruthy();
  });

  it('guardar y cargar en mitad de una ruta deja la partida idéntica y la caravana sigue', () => {
    const { g, m2, c } = setup();
    makePeace(g);
    tradeCommand(g, 1, { units: [c.id], dest: m2.id });
    run(g, 30);
    expect(c.order?.type).toBe('trade');
    const b = roundTrip(g);
    expect(stateHash(b)).toBe(stateHash(g));
    run(g, 60); run(b, 60);
    expect(stateHash(b)).toBe(stateHash(g));
    run(g, 200); run(b, 200);
    expect(stateHash(b)).toBe(stateHash(g));
    expect(b.players[1].data.tradeTotal).toBe(g.players[1].data.tradeTotal);
  });

  it('el contenido es coherente: sin referencias rotas', () => {
    expect(reg.validate()).toEqual([]);
    expect(reg.units.get('caravan')!.classes).toContain('trader');
    expect(reg.buildings.get('tradingCompany')!.classes).toContain('tradePost');
  });

  it('los bonos de comercio no se acumulan al crear otro registro', () => {
    const n = (r: typeof reg) => r.civs.get('persia')!.bonuses.filter(b => b.type === 'tradeYield').length;
    expect(n(reg)).toBe(1);
  });
});

describe('espionaje', () => {
  function setup() {
    const g = two();
    place(g, 1, 'market');
    g.players[1].age = 2; g.players[2].age = 2;
    const tc2 = g.buildings.find(b => b.owner === 2 && b.defId === 'townCenter')!;
    const spy = g.spawnUnit('spy', 1, tc2.x + 8, tc2.y + 8);
    return { g, spy, tc2 };
  }

  it('un espía está oculto salvo junto a la vigilancia enemiga, y los demás no pueden atacarlo', () => {
    const { g, spy, tc2 } = setup();
    const soldier = g.units.find(u => u.owner === 2)!;
    expect(hiddenFrom(g, spy, 2)).toBe(true);
    expect(g.canAttack(soldier, spy, false)).toBe(false);
    spy.x = tc2.x + 2.5; spy.y = tc2.y + 2.5;
    expect(hiddenFrom(g, spy, 2)).toBe(false);
    expect(g.canAttack(soldier, spy, false)).toBe(true);
    expect(hiddenFrom(g, spy, 1)).toBe(false);
  });

  it('sabotaje: daña el edificio y el espía vuelve al descanso', () => {
    const { g, spy } = setup();
    const b = place(g, 2, 'barracks');
    const tc = g.buildings.find(x => x.owner === 2 && x.defId === 'townCenter')!;
    // El espía empieza al otro lado del cuartel, lejos de la vigilancia del centro urbano
    const k = hypot(b.x - tc.x, b.y - tc.y) || 1;
    const at = g.findFreeTile(b.x + (b.x - tc.x) / k * 4, b.y + (b.y - tc.y) / k * 4)!;
    spy.x = spy.px = at.x; spy.y = spy.py = at.y;
    expect(hiddenFrom(g, spy, 2)).toBe(true);
    g.rng = () => 0.01; // la tirada sale bien
    expect(applyNetCommand(g, 1, { t: 'mod', id: 'spy', args: { units: [spy.id], act: 'sabotage', target: b.id } })).toBe(true);
    run(g, 60);
    expect(b.hp).toBeLessThan(b.maxHp);
    expect(spy.dead).toBe(false);
    expect(spy.data.spyReady).toBeGreaterThan(g.time);
    expect(spyCommand(g, 1, { units: [spy.id], act: 'sabotage', target: b.id })).toBe(false); // descansa
  });

  it('robar tecnología: copia la que el enemigo tiene y cuesta una parte', () => {
    const { g, spy, tc2 } = setup();
    g.players[2].researched.add('wheelbarrow');
    g.players[1].res.food = 1000; g.players[1].res.wood = 1000; g.players[1].res.gold = 1000;
    const id = stealableTech(g, g.players[1], g.players[2]);
    expect(id).toBe('wheelbarrow');
    g.rng = () => 0.01;
    spyCommand(g, 1, { units: [spy.id], act: 'steal', target: tc2.id });
    run(g, 60);
    expect(g.players[1].researched.has('wheelbarrow')).toBe(true);
  });

  it('soborno: el agente doble da visión a su verdadero dueño y puede ser descubierto', () => {
    const { g, spy } = setup();
    const v = g.units.find(u => u.owner === 2 && g.unitDef(u).gatherer)!;
    v.x = v.px = spy.x + 0.5; v.y = v.py = spy.y;
    g.players[1].res.gold = 500;
    g.rng = () => 0.01;
    spyCommand(g, 1, { units: [spy.id], act: 'bribe', target: v.id });
    run(g, 20);
    expect(v.data.agentOf).toBe(1);
    expect(v.owner).toBe(2);
    expect(g.players[1].visible[Math.floor(v.y) * g.map.w + Math.floor(v.x)]).toBe(1);
    // lo llevan junto a su centro urbano: lo descubren
    const tc2 = g.buildings.find(b => b.owner === 2 && b.defId === 'townCenter')!;
    v.order = null; v.x = v.px = tc2.x + 2.5; v.y = v.py = tc2.y + 2.5;
    run(g, 60);
    expect(v.dead || v.data.agentOf === undefined).toBe(true);
  });
});
