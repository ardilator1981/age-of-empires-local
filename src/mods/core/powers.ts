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
];

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
        default: continue;
      }
      usePower(game, p.id, { id: d.id, ...at });
    }
  },
};
