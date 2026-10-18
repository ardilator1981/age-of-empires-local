import type { AttackType, Bonus } from '../core/types';
import type { Entity } from './Entity';
import type { Game } from './Game';
import { edgeDist, setOrder } from './actions';

export interface DamageInfo {
  attack: number;
  type: AttackType;
  bonus: Bonus[];
  owner: number;
  attackerId: number;
  /** Altura del terreno del atacante. */
  fromHeight?: number;
}

export interface Projectile {
  sx: number; sy: number;
  ex: number; ey: number;
  /** Altura inicial en píxeles (zoom 1). */
  sh: number;
  t: number;
  dur: number;
  targetId: number;
  info: DamageInfo;
  style: string;
  done?: boolean;
}

/** Ataca a `t`: cuerpo a cuerpo aplica el daño ya; a distancia lanza un proyectil. */
export function performAttack(game: Game, a: Entity, t: Entity) {
  const p = game.players[a.owner];
  const def = game.defOf(a);
  const info: DamageInfo = {
    attack: p.getStat(def, 'attack'),
    type: def.attackType ?? 'melee',
    bonus: def.bonus ?? [],
    owner: a.owner,
    attackerId: a.id,
    fromHeight: game.map.heightAt(a.x, a.y),
  };
  a.attackAnim = 0.35;
  if (p.getStat(def, 'range') >= 1) {
    const d = Math.hypot(t.x - a.x, t.y - a.y);
    game.projectiles.push({
      sx: a.x, sy: a.y, ex: t.x, ey: t.y,
      sh: a.kind === 'building' ? 40 : 14,
      t: 0, dur: Math.max(0.15, d / 9), targetId: t.id, info, style: def.projectile ?? 'arrow',
    });
  } else {
    dealDamage(game, t, info);
  }
}

export function computeDamage(game: Game, t: Entity, info: DamageInfo): number {
  const tp = game.players[t.owner];
  const tdef = game.defOf(t);
  const armor = tp.getStat(tdef, info.type === 'melee' ? 'armorMelee' : 'armorPierce');
  let dmg = Math.max(0, info.attack - armor);
  for (const b of info.bonus) if (tdef.classes.includes(b.vs)) dmg += b.amount;
  // Ventaja de altura, como en AoE2: +25% desde arriba, -25% desde abajo
  if (info.fromHeight !== undefined) {
    const dh = info.fromHeight - game.map.heightAt(t.x, t.y);
    if (dh > 0.6) dmg *= 1.25;
    else if (dh < -0.6) dmg *= 0.75;
  }
  return Math.max(1, Math.round(dmg * 10) / 10);
}

export function dealDamage(game: Game, t: Entity, info: DamageInfo) {
  if (t.dead || t.kind === 'resource') return;
  const dmg = computeDamage(game, t, info);
  t.hp -= dmg;
  t.lastHitAt = game.time;
  const attacker = game.get(info.attackerId);
  game.events.emit('damaged', { target: t, attacker, amount: dmg });

  const tp = game.players[t.owner];
  if (tp.isHuman && game.isEnemy(info.owner, t.owner)) {
    game.warn(tp, 'attacked', t.kind === 'building' ? '¡Están atacando un edificio!' : '¡Te están atacando!', 20, { x: t.x, y: t.y });
  }
  // Contraataque de unidades militares desocupadas
  if (attacker && t.kind === 'unit' && !t.order) {
    const def = game.unitDef(t);
    if (!def.gatherer && (def.attack ?? 0) > 0) setOrder(t, { type: 'attack', targetId: attacker.id, auto: true });
  }
  if (t.hp <= 0) game.kill(t, attacker);
}

export function updateProjectiles(game: Game, dt: number) {
  for (const pr of game.projectiles) {
    const tgt = game.get(pr.targetId);
    if (tgt) { pr.ex = tgt.x; pr.ey = tgt.y; }
    pr.t += dt / pr.dur;
    if (pr.t >= 1) {
      pr.done = true;
      if (tgt) dealDamage(game, tgt, pr.info);
    }
  }
  game.projectiles = game.projectiles.filter(p => !p.done);
}

/**
 * Enemigo más cercano a `from` dentro de `radius`.
 * Las unidades tienen prioridad sobre los edificios; `buildingsOnly` para asedio.
 */
export function findEnemyNear(game: Game, from: Entity, radius: number, includeBuildings: boolean, buildingsOnly = false): Entity | null {
  let bestU: Entity | null = null, bestUD = radius;
  let bestB: Entity | null = null, bestBD = radius;
  for (const e of game.actors) {
    if (e.dead || !game.isEnemy(from.owner, e.owner)) continue;
    if (e.kind === 'unit') {
      if (buildingsOnly) continue;
      const d = Math.hypot(e.x - from.x, e.y - from.y) - (from.kind === 'building' ? from.size / 2 : 0);
      if (d < bestUD) { bestUD = d; bestU = e; }
    } else if (includeBuildings || buildingsOnly) {
      const d = from.kind === 'unit' ? edgeDist(from, e) : Math.hypot(e.x - from.x, e.y - from.y);
      if (d < bestBD) { bestBD = d; bestB = e; }
    }
  }
  return bestU ?? bestB;
}
