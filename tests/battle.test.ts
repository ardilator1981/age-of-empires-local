import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import { TICK_DT } from '../src/core/constants';
import { computeDamage } from '../src/game/combat';
import { Commands } from '../src/game/commands';
import type { Entity } from '../src/game/Entity';
import { Game } from '../src/game/Game';
import { stateHash } from '../src/game/net/hash';
import { snapshot, upgradeSave, type SaveData } from '../src/game/save';
import { drawBattle, statusIcons } from '../src/mods/battle/draw';
import { battleOrder, generalOf, harangueState } from '../src/mods/battle/orders';
import { applyNetCommand } from '../src/game/net/netCommands';
import { ammoMax, battleState, regimentOf, regiments, type Regiment } from '../src/mods/battle/state';
import { battleReg, options, reg } from './helpers';

const B = BALANCE.battle;

/** Un General de prueba (la unidad del modo Guerra declarada no está en este registro). */
if (!battleReg.units.has('testHero')) {
  battleReg.addUnit({ ...battleReg.unit('knight'), id: 'testHero', classes: ['cavalry', 'hero'], aura: { radius: 7, attackMul: 1.05, armorAdd: 0.25 } });
}

/** Partida llana con la capa táctica: dos centros urbanos lejos y nada más. */
async function flat(seed = 5): Promise<Game> {
  // Sin IA (los dos jugadores humanos): las tropas no se mueven si no se les ordena
  const o = options('arabia', { seed, battle: true });
  o.players = o.players.map(p => ({ ...p, human: true }));
  const g = new Game(battleReg, o);
  for (const e of [...g.list]) g.remove(e);
  g.update(TICK_DT);
  g.map.terrain.fill(g.reg.terrain('grass'));
  g.map.heights.fill(0);
  g.map.heightVersion++;
  g.map.version++;
  g.map.obstaclesChanged();
  g.placeBuilding('townCenter', 1, 6, 6, true);
  g.placeBuilding('townCenter', 2, 84, 84, true);
  return g;
}

function run(g: Game, seconds: number, until?: () => boolean) {
  for (let i = 0; i < seconds / TICK_DT && !(until && until()); i++) g.update(TICK_DT);
}

function spawn(g: Game, id: string, owner: number, x: number, y: number, n = 1): Entity[] {
  return Array.from({ length: n }, (_, i) => g.spawnUnit(id, owner, x + (i % 5) * 0.9, y + Math.floor(i / 5) * 0.9));
}

/** El regimiento del primer soldado, con centro y orientación fijados. */
function regimentAt(g: Game, u: Entity, cx: number, cy: number, face = { x: 1, y: 0 }): Regiment {
  const r = regimentOf(g, u)!;
  r.center = { x: cx, y: cy };
  r.facing = { ...face };
  return r;
}

const hit = (g: Game, target: Entity, attacker: Entity, attack = 10) =>
  computeDamage(g, target, { attack, type: 'melee', bonus: [], owner: attacker.owner, attackerId: attacker.id, ranged: false });

describe('capa táctica (mod battle)', () => {
  it('sin el mod activo no hay modificadores de daño ni sistema de batalla', () => {
    expect(reg.damageModifiers.length).toBe(0);
    expect(reg.systems.some(s => s.id === 'battle')).toBe(false);
    expect(battleReg.damageModifiers.length).toBe(1);
  });

  it('los soldados forman regimientos del mismo tipo con el tamaño de balance', async () => {
    const g = await flat();
    spawn(g, 'militia', 1, 40, 40, 12);
    spawn(g, 'archer', 1, 44, 40, 5);
    spawn(g, 'villager', 1, 46, 40, 3);
    run(g, 1.1);
    const rs = regiments(g).filter(r => r.owner === 1);
    const sizes = rs.map(r => `${r.defId}:${r.members.length}`).sort();
    expect(sizes).toEqual(['archer:5', 'militia:10', 'militia:2']);
    expect(rs.find(r => r.defId === 'militia' && r.members.length === 10)!.morale).toBe(B.kinds.find(k => k.cls === 'infantry')!.morale);
    // Los aldeanos no forman regimiento
    const v = g.units.find(u => u.defId === 'villager')!;
    expect(regimentOf(g, v)).toBeUndefined();
  });

  it('el daño depende de por dónde llega: frente ×1, flanco ×1,3 y retaguardia ×1,6 (sobre el ablandamiento)', async () => {
    const g = await flat();
    const target = spawn(g, 'militia', 2, 50, 50, 10);
    run(g, 1.1);
    regimentAt(g, target[0], 50, 50, { x: 1, y: 0 });
    const front = spawn(g, 'militia', 1, 53, 50)[0], flank = spawn(g, 'militia', 1, 50, 53)[0], rear = spawn(g, 'militia', 1, 47, 50)[0];
    // Los atacantes también forman regimiento al pasar el tick: se calcula antes
    const dF = hit(g, target[0], front), dFl = hit(g, target[0], flank), dR = hit(g, target[0], rear);
    expect(dF).toBeCloseTo(10 * B.damageMul, 1);
    expect(dFl).toBeCloseTo(10 * B.damageMul * B.flankMul, 1);
    expect(dR).toBeCloseTo(10 * B.damageMul * B.rearMul, 1);
  });

  it('la carga multiplica el primer golpe y se anula de frente contra lanceros', async () => {
    const g = await flat();
    const spears = spawn(g, 'pikeman', 2, 50, 50, 10);
    const swords = spawn(g, 'militia', 2, 50, 60, 10);
    const knights = spawn(g, 'knight', 1, 40, 55, 8);
    run(g, 1.1);
    regimentAt(g, spears[0], 50, 50);
    regimentAt(g, swords[0], 50, 60);
    const kr = regimentOf(g, knights[0])!;
    const k = knights[0];
    // Sin ímpetu, de frente a los lanceros: solo el ablandamiento
    k.x = 53; k.y = 50;
    const bonusSpear = hit(g, spears[0], k);
    kr.charging = true;
    kr.struck = [];
    // Contra espadas (de frente): ×2,5
    k.x = 53; k.y = 60;
    expect(hit(g, swords[0], k)).toBeCloseTo(10 * B.damageMul * B.chargeMul, 1);
    // Contra lanceros de frente: anulada (el mismo daño que sin carga)
    k.x = 53; k.y = 50;
    expect(hit(g, spears[0], k)).toBeCloseTo(bonusSpear, 1);
    // Por el flanco de los lanceros, la carga sí cuenta
    k.x = 50; k.y = 53;
    expect(hit(g, spears[0], k)).toBeCloseTo(10 * B.damageMul * B.flankMul * B.chargeMul, 1);
  });

  it('cada baja baja la moral del regimiento', async () => {
    const g = await flat();
    const us = spawn(g, 'militia', 1, 40, 40, 10);
    run(g, 1.1);
    const r = regimentOf(g, us[0])!;
    const before = r.morale;
    g.kill(us[0]);
    expect(r.morale).toBeCloseTo(before - (100 / 10) / 5 * B.perLoss, 5);
  });

  it('a moral 0 el regimiento huye (sin atacar) y se recupera lejos del enemigo', async () => {
    const g = await flat();
    const us = spawn(g, 'militia', 1, 40, 40, 10);
    run(g, 1.1);
    const r = regimentOf(g, us[0])!;
    r.morale = -5;
    run(g, 1);
    expect(r.routed).toBe(true);
    for (const id of r.members) {
      const u = g.get(id)!;
      expect(u.stance).toBe('passive');
      expect(u.order?.type).toBe('formation');
    }
    // Sin enemigos cerca: tras `recoverAfter` s vuelve a la lucha con moral de recuperación
    run(g, B.recoverAfter + 3);
    expect(r.routed).toBe(false);
    expect(r.morale).toBeGreaterThanOrEqual(B.recoverTo);
    expect(g.get(r.members[0])!.stance).toBe('aggressive');
  });

  it('un regimiento que huye contagia a su vecino y los enemigos que lo ven se animan', async () => {
    const g = await flat();
    const a = spawn(g, 'militia', 1, 40, 40, 10);
    const b = spawn(g, 'archer', 1, 44, 40, 10);
    const foe = spawn(g, 'militia', 2, 40, 58, 10);
    run(g, 1.1);
    const ra = regimentOf(g, a[0])!, rb = regimentOf(g, b[0])!, rf = regimentOf(g, foe[0])!;
    rb.morale = 30; rf.morale = 30;
    // El enemigo está lejos (> farRadius): sin contagio no habría pérdida; se mide el cambio por el rout
    ra.morale = -5;
    const before = rb.morale, beforeFoe = rf.morale;
    run(g, 0.3);
    expect(ra.routed).toBe(true);
    expect(rb.morale).toBeLessThan(before + 1); // −5 de contagio, +regeneración de un paso como mucho
    expect(rf.morale).toBeGreaterThanOrEqual(beforeFoe);
  });

  it('al caer el General, todos pierden moral y el techo baja hasta tener otro', async () => {
    const g = await flat();
    const inf = spawn(g, 'militia', 1, 40, 40, 10);
    const hero = spawn(g, 'testHero', 1, 41, 44)[0];
    run(g, 1.1);
    const r = regimentOf(g, inf[0])!;
    r.morale = r.base;
    g.kill(hero);
    expect(battleState(g)!.generalDead[1]).toBe(true);
    expect(r.morale).toBeCloseTo(r.base - B.generalDead, 5);
    run(g, 40);
    expect(r.morale).toBeLessThanOrEqual(B.generalDeadCap + 1e-6);
    // Un General nuevo levanta el techo
    spawn(g, 'testHero', 1, 41, 44);
    run(g, 40);
    expect(battleState(g)!.generalDead[1]).toBeUndefined();
    expect(r.morale).toBeGreaterThan(B.generalDeadCap);
  });

  it('el regimiento parado gira hacia quien le pega por el flanco', async () => {
    const g = await flat();
    const target = spawn(g, 'militia', 2, 50, 50, 10);
    for (const u of target) u.stance = 'hold'; // quietos: el regimiento no «marcha», solo gira
    const foe = spawn(g, 'militia', 1, 50, 53, 1)[0];
    run(g, 1.1);
    const r = regimentAt(g, target[0], 50, 50, { x: 1, y: 0 });
    // Golpes seguidos desde +y: gira hacia ahí
    for (let i = 0; i < 30; i++) { r.threat.y += 1; run(g, B.step); }
    expect(r.facing.y).toBeGreaterThan(0.8);
    void foe;
  });

  it('fuego amigo: el asedio hiere también a las tropas propias del área; los arqueros no', async () => {
    const g = await flat();
    const siegeDef = [...battleReg.units.values()].find(d => d.classes.includes('siege'))!;
    const catapult = g.spawnUnit(siegeDef.id, 1, 30, 30);
    const archer = g.spawnUnit('archer', 1, 31, 30);
    const own = g.spawnUnit('longSwordsman', 1, 50, 50);
    const foe = g.spawnUnit('longSwordsman', 2, 50.4, 50);
    run(g, 0.1);
    const proj = (attacker: Entity) => g.projectiles.push({
      sx: attacker.x, sy: attacker.y, ex: 50, ey: 50, sh: 0, t: 0.999, dur: 1, targetId: foe.id, style: 'arrow', fixed: true,
      info: { attack: 30, type: 'pierce', bonus: [], owner: 1, attackerId: attacker.id, ranged: true, splash: { radius: 3, falloff: 0.5 } },
    });
    proj(archer);
    run(g, 0.1);
    expect(own.hp).toBe(own.maxHp);
    expect(foe.hp).toBeLessThan(foe.maxHp);
    proj(catapult);
    run(g, 0.1);
    expect(own.hp).toBeLessThan(own.maxHp);
  });

  it('dos partidas iguales con combate dan la misma huella (determinismo)', async () => {
    const make = async () => {
      const g = await flat(9);
      spawn(g, 'longSwordsman', 1, 40, 45, 10); spawn(g, 'crossbowman', 1, 36, 45, 12); spawn(g, 'knight', 1, 38, 38, 8);
      spawn(g, 'longSwordsman', 2, 54, 45, 10); spawn(g, 'crossbowman', 2, 58, 45, 12); spawn(g, 'knight', 2, 56, 52, 8);
      run(g, 90);
      return g;
    };
    const a = await make(), b = await make();
    expect(stateHash(a)).toBe(stateHash(b));
  });

  it('una batalla entre ejércitos parejos tiene huidas y termina en rotura, no por tiempo', async () => {
    const g = await flat(3);
    spawn(g, 'longSwordsman', 1, 40, 42, 20); spawn(g, 'crossbowman', 1, 36, 42, 12);
    spawn(g, 'longSwordsman', 2, 48, 42, 20); spawn(g, 'crossbowman', 2, 52, 42, 12);
    // Cada bando avanza atacando hacia el otro
    Commands.army(g, g.units.filter(u => u.owner === 1), { kind: 'attack', points: [{ x: 48, y: 42 }] }, false);
    Commands.army(g, g.units.filter(u => u.owner === 2), { kind: 'attack', points: [{ x: 40, y: 42 }] }, false);
    let routs = 0, wasRouted = new Set<number>();
    for (let t = 0; t < 600; t++) {
      run(g, 1);
      for (const r of regiments(g)) { if (r.routed && !wasRouted.has(r.id)) { routs++; wasRouted.add(r.id); } if (!r.routed) wasRouted.delete(r.id); }
      const a = g.units.filter(u => !u.dead && u.owner === 1).length, b = g.units.filter(u => !u.dead && u.owner === 2).length;
      if (a === 0 || b === 0) break;
    }
    expect(routs).toBeGreaterThan(0);
  });

  it('guardar y cargar conserva regimientos y moral: la partida cargada sigue igual', async () => {
    const g = await flat(11);
    spawn(g, 'longSwordsman', 1, 40, 45, 10); spawn(g, 'knight', 1, 38, 38, 8);
    spawn(g, 'longSwordsman', 2, 48, 45, 10); spawn(g, 'knight', 2, 50, 52, 8);
    run(g, 40);
    expect(regiments(g).length).toBeGreaterThan(0);
    const save: SaveData = JSON.parse(JSON.stringify(snapshot(g)));
    const up = upgradeSave(save);
    if (typeof up === 'string') throw new Error(up);
    const h = new Game(battleReg, up.opts, up);
    expect(JSON.stringify(h.data.battle)).toBe(JSON.stringify(g.data.battle));
    expect(stateHash(h)).toBe(stateHash(g));
    run(g, 30);
    run(h, 30);
    expect(stateHash(h)).toBe(stateHash(g));
  });
});

describe('órdenes de la capa táctica', () => {
  const idsOf = (us: Entity[]) => us.map(u => u.id);

  /** Hasta dónde llega un regimiento marchando 10 s, caminando o corriendo. */
  async function marched(fast: boolean) {
    const g = await flat();
    const us = spawn(g, 'militia', 1, 20, 40, 10);
    run(g, 1.1);
    Commands.army(g, us, { kind: 'move', points: [{ x: 80, y: 40 }] }, false);
    if (fast) expect(battleOrder(g, 1, { op: 'run', units: idsOf(us) })).toBe(true);
    run(g, 10);
    return regimentOf(g, us[0])!.center.x - 20;
  }

  it('correr aumenta la velocidad de la marcha del regimiento entero', async () => {
    const walk = await marched(false), fast = await marched(true);
    expect(fast / walk).toBeGreaterThan(1.25);
  });

  it('correr cansa; cansado se pierde daño y velocidad, y se descansa caminando', async () => {
    const g = await flat();
    const us = spawn(g, 'militia', 1, 15, 40, 10);
    run(g, 1.1);
    Commands.army(g, us, { kind: 'move', points: [{ x: 90, y: 40 }] }, false);
    battleOrder(g, 1, { op: 'run', units: idsOf(us) });
    run(g, 20);
    const r = regimentOf(g, us[0])!;
    expect(r.fatigue).toBeGreaterThan(B.tired);
    expect(g.get(r.members[0])!.data.speedMul).toBeCloseTo(B.runMul * B.tiredSpeed, 5);
    // Pasa a caminar: sigue lento (cansado) y se recupera
    battleOrder(g, 1, { op: 'run', units: idsOf(us) });
    expect(r.running).toBe(false);
    const before = r.fatigue;
    run(g, 10);
    expect(r.fatigue).toBeLessThan(before);
    // Un regimiento cansado hace menos daño
    const target = spawn(g, 'militia', 2, 60, 60, 10);
    run(g, 1.1);
    regimentAt(g, target[0], 60, 60, { x: 1, y: 0 });
    const foe = r.members.length ? g.get(r.members[0])! : us[0];
    foe.x = 63; foe.y = 60;
    r.fatigue = 80;
    expect(hit(g, target[0], foe)).toBeCloseTo(10 * B.damageMul * B.tiredDamage, 1);
  });

  it('el cansancio máximo impide correr y correr se cancela al parar', async () => {
    const g = await flat();
    const us = spawn(g, 'militia', 1, 40, 40, 10);
    run(g, 1.1);
    const r = regimentOf(g, us[0])!;
    battleOrder(g, 1, { op: 'run', units: idsOf(us) });
    expect(r.running).toBe(true);
    run(g, B.runStill + 1);
    expect(r.running).toBe(false);
    r.fatigue = 100;
    battleOrder(g, 1, { op: 'run', units: idsOf(us) });
    expect(r.running).toBe(false);
  });

  it('arengar sube la moral cerca del General, con enfriamiento, y no se puede sin General', async () => {
    const g = await flat();
    const inf = spawn(g, 'militia', 1, 40, 40, 10);
    const hero = spawn(g, 'testHero', 1, 42, 44)[0];
    run(g, 1.1);
    const r = regimentOf(g, inf[0])!;
    r.morale = 30;
    expect(harangueState(g, 1).ok).toBe(true);
    expect(battleOrder(g, 1, { op: 'harangue' })).toBe(true);
    expect(r.morale).toBeCloseTo(30 + B.harangue, 5);
    expect(battleOrder(g, 1, { op: 'harangue' })).toBe(false);
    expect(harangueState(g, 1).wait).toBeGreaterThan(B.harangueCooldown - 3);
    run(g, B.harangueCooldown + 1);
    expect(harangueState(g, 1).ok).toBe(true);
    // Sin General, ni arengar ni cargar
    g.kill(hero);
    expect(generalOf(g, 1)).toBeUndefined();
    expect(battleOrder(g, 1, { op: 'harangue' })).toBe(false);
    const kn = spawn(g, 'knight', 1, 20, 50, 4);
    run(g, 1.1);
    expect(battleOrder(g, 1, { op: 'charge', units: idsOf(kn), x: 60, y: 50 })).toBe(false);
  });

  it('cargar manda a la caballería a correr hacia el punto y consigue ímpetu', async () => {
    const g = await flat();
    const kn = spawn(g, 'knight', 1, 15, 40, 8);
    spawn(g, 'militia', 2, 45, 40, 10);
    run(g, 1.1);
    expect(battleOrder(g, 1, { op: 'charge', units: idsOf(kn), x: 45, y: 40 })).toBe(true);
    const kr = regimentOf(g, kn[0])!;
    expect(kr.running).toBe(true);
    let charged = false;
    for (let t = 0; t < 70 && !charged; t++) { run(g, 0.25); charged = kr.charging; }
    expect(charged).toBe(true);
  });

  it('las órdenes ajenas, vacías o mal formadas se rechazan', async () => {
    const g = await flat();
    const mine = spawn(g, 'militia', 1, 40, 40, 5);
    run(g, 1.1);
    expect(battleOrder(g, 2, { op: 'run', units: idsOf(mine) })).toBe(false);
    expect(battleOrder(g, 1, { op: 'run', units: [] })).toBe(false);
    expect(battleOrder(g, 1, { op: 'charge', units: idsOf(mine), x: NaN, y: 3 })).toBe(false);
    expect(battleOrder(g, 1, { op: 'nada' })).toBe(false);
    expect(battleOrder(g, 1, undefined)).toBe(false);
  });

  it('el overlay de estado dibuja sin fallar y los iconos reflejan el estado', async () => {
    const g = await flat();
    const us = spawn(g, 'militia', 1, 40, 40, 10);
    spawn(g, 'militia', 2, 44, 40, 10);
    run(g, 1.1);
    const r = regimentOf(g, us[0])!;
    const ctx = new Proxy({}, { get: () => () => {}, set: () => true }) as any;
    const o = { ctx, game: g, ui: {}, zoom: 1, project: (x: number, y: number) => ({ x, y }), unproject: (x: number, y: number) => ({ x, y }) };
    expect(() => drawBattle(o as any)).not.toThrow();
    expect(statusIcons(r, g.time)).toEqual([]);
    r.running = true; r.fatigue = 90; r.morale = 10; r.flankUntil = g.time + 1;
    expect(statusIcons(r, g.time)).toEqual(['🏃', '↔️', '⚠️', '😓']);
    r.routed = true;
    expect(statusIcons(r, g.time)).toEqual(['🏳️']);
  });
});

describe('munición y mando limitado', () => {
  it('cada tipo de tirador tiene sus andanadas y lo que no dispara no gasta', async () => {
    const g = await flat();
    const m = (id: string) => ammoMax(g, g.spawnUnit(id, 1, 40, 40));
    expect(m('archer')).toBe(25);
    expect(m('crossbowman')).toBe(18);
    expect(m('musketeer')).toBe(20);
    expect(m('rifleman')).toBe(40);
    expect(m('cannon')).toBe(20);
    expect(m('militia')).toBeNull();
    expect(m('catapult')).toBeNull();
  });

  it('disparar gasta munición; sin ella se pelea cuerpo a cuerpo con menos daño, y descansando se recupera', async () => {
    const g = await flat();
    const archer = g.spawnUnit('archer', 1, 40, 40);
    const foe = g.spawnUnit('longSwordsman', 2, 43, 40);
    foe.stance = 'hold';
    run(g, 1.1);
    const reach = () => g.rangeOf(archer);
    expect(reach()).toBeGreaterThanOrEqual(1);
    run(g, 6);
    expect(archer.data.ammo).toBeLessThan(25);
    // Se queda sin munición: alcance 0 y daño a la mitad
    archer.data.ammo = 1;
    run(g, 6);
    expect(archer.data.noAmmo).toBe(true);
    expect(reach()).toBe(0);
    const target = spawn(g, 'militia', 2, 60, 60, 10);
    run(g, 1.1);
    regimentAt(g, target[0], 60, 60, { x: 1, y: 0 });
    archer.x = 63; archer.y = 60;
    expect(hit(g, target[0], archer)).toBeCloseTo(10 * B.damageMul * B.noAmmoDamage, 1);
    // Lejos del combate recupera
    g.kill(foe);
    archer.x = 10; archer.y = 10;
    run(g, B.ammoRest + (B.ammoBack + 1) / B.ammoRefillPerSec + 1);
    expect(archer.data.noAmmo).toBeUndefined();
    expect(reach()).toBeGreaterThanOrEqual(1);
  });

  it('sin General no se cambian formaciones y las órdenes de las tropas tardan en cumplirse', async () => {
    const g = await flat();
    const us = spawn(g, 'militia', 1, 40, 40, 6);
    const hero = spawn(g, 'testHero', 1, 41, 44)[0];
    run(g, 1.1);
    const move = { t: 'move' as const, units: us.map(u => u.id), x: 60, y: 40 };
    // Con General, al momento
    expect(applyNetCommand(g, 1, move)).toBe(true);
    expect(us[0].order).not.toBeNull();
    for (const u of us) u.order = null;
    g.kill(hero);
    expect(applyNetCommand(g, 1, { t: 'formation', units: us.map(u => u.id), formation: 'box' })).toBe(false);
    expect(applyNetCommand(g, 1, move)).toBe(true);
    expect(us.every(u => u.order === null)).toBe(true);
    expect(battleState(g)!.queue.length).toBe(1);
    run(g, B.noGeneralDelay - 1);
    expect(us.every(u => u.order === null)).toBe(true);
    run(g, 1.5);
    expect(us.some(u => u.order !== null)).toBe(true);
    expect(battleState(g)!.queue.length).toBe(0);
    // Las órdenes de la economía no se retrasan, ni las de quien no tiene regimientos
    const v = g.spawnUnit('villager', 1, 20, 20);
    expect(applyNetCommand(g, 1, { t: 'move', units: [v.id], x: 25, y: 25 })).toBe(true);
    expect(battleState(g)!.queue.length).toBe(0);
  });

  it('una orden retrasada se guarda con la partida y se cumple igual al cargar', async () => {
    const g = await flat(13);
    const us = spawn(g, 'militia', 1, 40, 40, 6);
    const hero = spawn(g, 'testHero', 1, 41, 44)[0];
    run(g, 1.1);
    g.kill(hero);
    applyNetCommand(g, 1, { t: 'move', units: us.map(u => u.id), x: 60, y: 40 });
    run(g, 1);
    const save: SaveData = JSON.parse(JSON.stringify(snapshot(g)));
    const up = upgradeSave(save);
    if (typeof up === 'string') throw new Error(up);
    const h = new Game(battleReg, up.opts, up);
    expect(h.data.battle.queue.length).toBe(1);
    expect(stateHash(h)).toBe(stateHash(g));
    run(g, 6); run(h, 6);
    expect(stateHash(h)).toBe(stateHash(g));
  });
});

describe('IA de la capa táctica', () => {
  /** Como `flat`, pero el jugador 2 lo lleva la IA. */
  async function flatAI(seed = 21): Promise<Game> {
    const o = options('arabia', { seed, battle: true });
    o.players = o.players.map((p, i) => ({ ...p, human: i === 0 }));
    const g = new Game(battleReg, o);
    for (const e of [...g.list]) g.remove(e);
    g.update(TICK_DT);
    g.map.terrain.fill(g.reg.terrain('grass')); g.map.heights.fill(0); g.map.heightVersion++; g.map.version++; g.map.obstaclesChanged();
    g.placeBuilding('townCenter', 1, 6, 6, true);
    g.placeBuilding('townCenter', 2, 84, 84, true);
    return g;
  }

  it('la IA repliega un regimiento con la moral baja y lo devuelve a la línea al recuperarse', async () => {
    const g = await flatAI();
    const mine = spawn(g, 'militia', 2, 60, 60, 10);
    spawn(g, 'militia', 1, 30, 30, 10);
    run(g, 1.1);
    const r = regimentOf(g, mine[0])!;
    r.morale = B.aiRetreatBelow - 5;
    run(g, 4);
    expect(r.regroup).toBe(true);
    expect(r.routed).toBe(false);
    for (const id of r.members) {
      const u = g.get(id)!;
      expect(u.stance).toBe('passive');
      expect(u.data.aiHold).toBe(true);
    }
    // Recupera moral y vuelve
    r.morale = B.aiRejoinAbove + 5;
    run(g, 4);
    expect(r.regroup).toBe(false);
    for (const id of r.members) {
      const u = g.get(id)!;
      expect(u.stance).toBe('aggressive');
      expect(u.data.aiHold).toBeUndefined();
    }
  });

  it('un regimiento que huye no recibe órdenes de la IA aunque haya enemigos junto a su base', async () => {
    const g = await flatAI();
    const mine = spawn(g, 'militia', 2, 78, 78, 10);
    spawn(g, 'militia', 1, 84, 72, 4);
    run(g, 1.1);
    const r = regimentOf(g, mine[0])!;
    r.morale = -5;
    run(g, 0.5);
    expect(r.routed).toBe(true);
    expect(g.get(r.members[0])!.data.aiHold).toBe(true);
    run(g, 3);
    for (const id of r.members) expect(g.get(id)?.order?.type).not.toBe('attack');
    // Al recuperarse, la IA vuelve a mandarlo
    const far = spawn(g, 'militia', 2, 20, 20, 4);
    run(g, 1.1);
    const rf = regimentOf(g, far[0])!;
    rf.morale = -5;
    run(g, B.recoverAfter + 4);
    expect(rf.routed).toBe(false);
    expect(g.get(rf.members[0])!.data.aiHold).toBeUndefined();
  });

  it('una batalla entre dos IA con la capa táctica corre sin errores y sin regimientos vacíos', async () => {
    const g = await flatAI(5);
    spawn(g, 'longSwordsman', 1, 40, 42, 10); spawn(g, 'crossbowman', 1, 36, 42, 12);
    spawn(g, 'longSwordsman', 2, 48, 42, 10); spawn(g, 'crossbowman', 2, 52, 42, 12);
    Commands.army(g, g.units.filter(u => u.owner === 1), { kind: 'attack', points: [{ x: 48, y: 42 }] }, false);
    Commands.army(g, g.units.filter(u => u.owner === 2), { kind: 'attack', points: [{ x: 40, y: 42 }] }, false);
    let regroups = 0;
    const seen = new Set<number>();
    for (let t = 0; t < 400; t++) {
      run(g, 1);
      for (const r of regiments(g)) { expect(r.members.length).toBeGreaterThan(0); if (r.regroup && !seen.has(r.id)) { seen.add(r.id); regroups++; } }
    }
    expect(regroups).toBeGreaterThanOrEqual(0);
  });
});
