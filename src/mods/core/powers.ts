import type { AIPlugin, PowerDef } from '../../core/types';
import { BALANCE } from '../../config/balance';
import { hypot } from '../../game/fmath';
import { hasDebt, playerPowers, powerAvail, powerFx, usePower } from '../../game/powers';

/**
 * Poderes activos de las civilizaciones (docs/civilizaciones.md §5), de las eras 0–4. Las cifras
 * están en `BALANCE.powers`. Tierra quemada y la Leva son de la era 5 en el diseño; mientras no
 * exista la Industrial se dan desde la Pólvora (docs/decisiones.md).
 */
const B = BALANCE.powers;

const townCenter = (game: any, pid: number) =>
  game.buildings.find((b: any) => b.owner === pid && !b.dead && b.complete && game.buildingDef(b).classes.includes('townCenter'));

export const powers: PowerDef[] = [
  {
    id: 'hordeTribute', name: 'Tributo a la Horda', icon: '🕊️', civs: ['rus'], minAge: 2, maxAge: 2,
    description: `Pagas el tributo al jan: durante ${B.tribute.duration} s nadie te ataca, pero tus tropas tampoco atacan a nadie.`,
    cost: { gold: B.tribute.cost }, cooldown: B.tribute.cooldown,
    apply(game, p) {
      powerFx(game).push({ t: 'truce', pid: p.id, until: game.time + B.tribute.duration });
      game.notify(`🕊 ${p.name} paga el Tributo a la Horda`, undefined, 'info');
      return null;
    },
  },
  {
    id: 'treasureFleet', name: 'Flota del Tesoro', icon: '⛵', civs: ['china'], minAge: 3,
    description: `Una expedición de Zheng He: pagas ${B.treasureFleet.cost} de oro y a los ${B.treasureFleet.delay} s vuelve con ${B.treasureFleet.returns}.`,
    cost: { gold: B.treasureFleet.cost }, cooldown: B.treasureFleet.cooldown,
    apply(game, p) {
      powerFx(game).push({ t: 'pay', pid: p.id, at: game.time + B.treasureFleet.delay, res: 'gold', amount: B.treasureFleet.returns });
      return null;
    },
  },
  {
    id: 'credit', name: 'Crédito', icon: '🏦', civs: ['britain'], minAge: 4,
    description: `Pides ${B.credit.loan} de oro al Banco de Inglaterra y a los ${B.credit.delay} s devuelves ${B.credit.repay}. Sin saldar la deuda no puedes pedir otro.`,
    cooldown: B.credit.cooldown,
    apply(game, p) {
      if (hasDebt(game, p.id)) return 'Aún debes el crédito anterior';
      p.res.gold = (p.res.gold ?? 0) + B.credit.loan;
      powerFx(game).push({ t: 'pay', pid: p.id, at: game.time + B.credit.delay, res: 'gold', amount: -B.credit.repay, debt: true });
      return null;
    },
  },
  {
    id: 'scorchedEarth', name: 'Tierra quemada', icon: '🔥', civs: ['rus'], minAge: 4, target: 'point',
    description: `Destruyes tus propias granjas y depósitos (menos el centro urbano) en ${B.scorchedEarth.radius} casillas a la redonda: los enemigos dentro avanzan un ${Math.round((1 - B.scorchedEarth.enemySpeed) * 100)}% más despacio durante ${B.scorchedEarth.duration} s.`,
    cooldown: B.scorchedEarth.cooldown,
    apply(game, p, { x, y }) {
      const r = B.scorchedEarth.radius;
      for (const b of [...game.buildings]) {
        if (b.dead || b.owner !== p.id || hypot(b.x - x, b.y - y) > r) continue;
        const def = game.buildingDef(b);
        if (def.classes.includes('townCenter')) continue;
        if (def.classes.includes('farm') || def.dropSite) game.kill(b);
      }
      powerFx(game).push({ t: 'zone', pid: p.id, x, y, r, until: game.time + B.scorchedEarth.duration, slow: B.scorchedEarth.enemySpeed });
      return null;
    },
  },
  {
    id: 'levy', name: 'Leva en masa', icon: '📯', civs: ['france'], minAge: 4,
    description: `La nación en armas: ${B.levy.count} mosqueteros aparecen junto al centro urbano (si hay población libre).`,
    cooldown: B.levy.cooldown,
    apply(game, p) {
      const tc = townCenter(game, p.id);
      if (!tc) return 'Necesitas un centro urbano';
      const free = Math.min(B.levy.count, p.popCap - p.popUsed);
      if (free <= 0) return 'Sin población libre';
      for (let i = 0; i < free; i++) {
        const spot = game.findFreeTile(tc.x, tc.y, 10);
        if (spot) game.spawnUnit(B.levy.unit, p.id, spot.x + 0.5, spot.y + 0.5);
      }
      return null;
    },
  },
  {
    id: 'foreignLegion', name: 'Legión Extranjera', icon: '🎖️', civs: ['france'], minAge: 5,
    description: `Contratas tropas de fuera (1831): ${B.foreignLegion.count} fusileros aparecen junto al centro urbano por ${B.foreignLegion.cost} de oro (si hay población libre).`,
    cost: { gold: B.foreignLegion.cost }, cooldown: B.foreignLegion.cooldown,
    apply(game, p) { return spawnNearTown(game, p, B.foreignLegion.unit, B.foreignLegion.count); },
  },
  {
    id: 'greatPlunder', name: 'Gran Saqueo', icon: '💰', civs: ['persia'], minAge: 2, maxAge: 3,
    description: `El botín de las campañas: recibes ${B.greatPlunder.perKill} de oro por cada baja que hayas causado (máximo ${B.greatPlunder.max}). Hacen falta al menos ${B.greatPlunder.minKills} bajas.`,
    cooldown: B.greatPlunder.cooldown,
    apply(game, p) {
      if (p.stats.kills < B.greatPlunder.minKills) return `Aún no hay botín (hacen falta ${B.greatPlunder.minKills} bajas)`;
      const gold = Math.min(B.greatPlunder.max, p.stats.kills * B.greatPlunder.perKill);
      p.res.gold = (p.res.gold ?? 0) + gold;
      game.notify(`💰 ${p.name} recibe ${gold} de oro del saqueo`, undefined, 'info');
      return null;
    },
  },
  {
    id: 'bazaar', name: 'Bazar', icon: '🏺', civs: ['persia'], minAge: 3,
    description: `El gran bazar: cambias ${B.bazaar.food} de comida por ${B.bazaar.gold} de oro al instante.`,
    cost: { food: B.bazaar.food }, cooldown: B.bazaar.cooldown,
    apply(game, p) { p.res.gold = (p.res.gold ?? 0) + B.bazaar.gold; return null; },
  },
  {
    id: 'resistance', name: 'Resistencia', icon: '🛡️', civs: ['ethiopia'], minAge: 3,
    description: `Las tropas a menos de ${B.resistance.radius} casillas del centro urbano recuperan el ${Math.round(B.resistance.heal * 100)}% de la vida que les falta.`,
    cooldown: B.resistance.cooldown,
    apply(game, p) {
      const tc = townCenter(game, p.id);
      if (!tc) return 'Necesitas un centro urbano';
      for (const u of game.units) {
        if (u.dead || u.owner !== p.id || u.inside || hypot(u.x - tc.x, u.y - tc.y) > B.resistance.radius) continue;
        u.hp = Math.min(u.maxHp, u.hp + (u.maxHp - u.hp) * B.resistance.heal);
      }
      return null;
    },
  },
  {
    id: 'nagarit', name: 'Nagarit', icon: '🥁', civs: ['ethiopia'], minAge: 5,
    description: `El tambor del emperador llama a las armas: ${B.nagarit.count} lanceros aparecen junto al centro urbano (si hay población libre).`,
    cooldown: B.nagarit.cooldown,
    apply(game, p) { return spawnNearTown(game, p, B.nagarit.unit, B.nagarit.count); },
  },
];

/** Hace aparecer `count` unidades junto al centro urbano (las que quepan en la población). */
function spawnNearTown(game: any, p: any, unit: string, count: number): string | null {
  const tc = townCenter(game, p.id);
  if (!tc) return 'Necesitas un centro urbano';
  const def = game.reg.unit(unit);
  const free = Math.min(count, Math.floor((p.popCap - p.popUsed) / def.pop));
  if (free <= 0) return 'Sin población libre';
  for (let i = 0; i < free; i++) {
    const spot = game.findFreeTile(tc.x, tc.y, 10);
    if (spot) game.spawnUnit(unit, p.id, spot.x + 0.5, spot.y + 0.5);
  }
  return null;
}

/**
 * La IA usa sus poderes: los de defensa cuando hay enemigos junto a su base, y los de economía
 * cuando le sobra o le falta el oro. Siempre por `usePower`, igual que un jugador.
 */
export const powersAI: AIPlugin = {
  id: 'powers',
  think(ctx) {
    const { game, player: p } = ctx;
    const list = playerPowers(game, p);
    if (!list.length) return;
    const near = game.units.filter(u => !u.dead && !u.inside && game.isEnemy(p.id, u.owner) && game.unitDef(u).attack
      && hypot(u.x - ctx.home.x, u.y - ctx.home.y) <= B.ai.threatRadius);
    const threatened = near.length >= B.ai.threatCount;
    const gold = p.res.gold ?? 0;
    for (const d of list) {
      if (!powerAvail(game, p, d.id).ok) continue;
      let at = { x: 0, y: 0 };
      switch (d.id) {
        case 'hordeTribute': if (!(threatened && near.length > ctx.army.length)) continue; break;
        case 'treasureFleet': if (gold < B.ai.fleetSurplus) continue; break;
        case 'credit': if (gold > B.ai.creditBelow || ctx.villagers.length < 20 || ctx.army.length < 8) continue; break;
        case 'levy': if (!(threatened || ctx.army.length < 10)) continue; break;
        case 'scorchedEarth':
          if (!threatened || near.length <= ctx.army.length) continue;
          at = { x: near.reduce((s, u) => s + u.x, 0) / near.length, y: near.reduce((s, u) => s + u.y, 0) / near.length };
          // Solo si no arrasa su propia base: el punto tiene que quedar fuera de la zona de sus granjas
          if (hypot(at.x - ctx.home.x, at.y - ctx.home.y) < B.scorchedEarth.radius + 3) continue;
          break;
        case 'foreignLegion': if (gold < B.foreignLegion.cost + 300 || ctx.army.length >= 25) continue; break;
        case 'greatPlunder': if (p.stats.kills * B.greatPlunder.perKill < 300) continue; break;
        case 'bazaar': if ((p.res.food ?? 0) < B.bazaar.food + 500 || gold > 900) continue; break;
        case 'resistance': if (!threatened) continue; break;
        case 'nagarit': if (!(threatened || ctx.army.length < 10)) continue; break;
        default: continue;
      }
      usePower(game, p.id, { id: d.id, ...at });
    }
  },
};
