import type { AIPlugin, TechDef, UnitDef } from '../../core/types';
import { techAvail, trainablesAt } from '../../game/rules';

/**
 * Evolución del asedio y la artillería por era. Cada paso es una mejora (`upgrade`) de la unidad
 * anterior, que se entrena en el mismo edificio con el nombre y las estadísticas de la última:
 *
 *   Castillos     Ariete · Catapulta · Escorpión
 *   Imperial      Ariete cubierto · Trabuquete (de la catapulta) · Escorpión pesado
 *   Pólvora       Bombarda (del trabuquete) · Cañón (fábrica de pólvora, `gunpowder.ts`)
 *   Industrial    Obús (de la bombarda) · Cañón de campaña (del cañón, `industrial.ts`)
 *   Contemporánea (fase 6, aún sin eras) blindados y tanques: ver docs/civilizaciones.md §11
 *
 * Valores indicativos. `antiUnit`: también dispara por su cuenta a las tropas (ver `buildingsOnly`).
 * `splash`: daño de área de los proyectiles (ver `CombatStats`).
 */

const WORKSHOP = ['siegeWorkshop'];

export const siegeUnits: UnitDef[] = [
  {
    id: 'catapult', name: 'Catapulta', icon: '☄️', description: 'Lanza piedras que dañan en área: eficaz contra edificios y masas de tropas. Lenta y poco precisa; sin defensa cuerpo a cuerpo.',
    classes: ['siege', 'antiUnit'], cost: { wood: 135, gold: 75 }, trainTime: 40, trainedAt: WORKSHOP,
    hp: 50, attack: 30, attackType: 'pierce', range: 7, reloadTime: 6, armor: { melee: 0, pierce: 0 },
    bonus: [{ vs: 'building', amount: 22 }], speed: 0.5, los: 5, pop: 2, age: 2, radius: 0.45, projectile: 'rock',
    splash: { radius: 1.4, falloff: 0.5, scatter: 1.3 },
    sprite: 'catapult',
  },
  {
    id: 'scorpion', name: 'Escorpión', icon: '🏹', description: 'Ballesta gigante de tiro tenso y largo: castiga a las tropas agrupadas y al asedio. Frágil y casi inútil contra edificios.',
    classes: ['siege', 'antiUnit'], cost: { wood: 75, gold: 75 }, trainTime: 30, trainedAt: WORKSHOP,
    hp: 45, attack: 14, attackType: 'pierce', range: 8, reloadTime: 3.2, armor: { melee: 0, pierce: 1 },
    bonus: [{ vs: 'siege', amount: 10 }, { vs: 'infantry', amount: 4 }], speed: 0.6, los: 7, pop: 1, age: 2, radius: 0.4, projectile: 'bolt',
    splash: { radius: 0.9, falloff: 0.3 },
    sprite: 'scorpion',
  },
  {
    id: 'cappedRam', name: 'Ariete cubierto', icon: '🪵', description: 'Ariete con techo reforzado: más vida y más daño contra edificios.',
    classes: ['siege'], cost: { wood: 170, gold: 90 }, trainTime: 36, trainedAt: WORKSHOP,
    hp: 235, attack: 3, attackType: 'melee', reloadTime: 5, armor: { melee: 0, pierce: 190 },
    bonus: [{ vs: 'building', amount: 150 }], speed: 0.5, los: 3, pop: 1, age: 3, radius: 0.4,
    sprite: 'ram', spriteParams: { roof: '#7a5a3a' },
  },
  {
    id: 'trebuchet', name: 'Trabuquete', icon: '🏗️', description: 'Contrapeso gigante: alcance enorme y daño devastador a los edificios. Muy lento.',
    classes: ['siege'], cost: { wood: 200, gold: 150 }, trainTime: 45, trainedAt: WORKSHOP,
    hp: 110, attack: 45, attackType: 'pierce', range: 11, reloadTime: 8, armor: { melee: 1, pierce: 2 },
    bonus: [{ vs: 'building', amount: 60 }], speed: 0.42, los: 5, pop: 3, age: 3, radius: 0.5, projectile: 'rock',
    splash: { radius: 1.1, falloff: 0.6, scatter: 1.4 },
    sprite: 'trebuchet',
  },
  {
    id: 'heavyScorpion', name: 'Escorpión pesado', icon: '🏹', description: 'Ballesta gigante reforzada: más alcance, más daño y más vida.',
    classes: ['siege', 'antiUnit'], cost: { wood: 90, gold: 90 }, trainTime: 30, trainedAt: WORKSHOP,
    hp: 60, attack: 20, attackType: 'pierce', range: 9, reloadTime: 3, armor: { melee: 0, pierce: 2 },
    bonus: [{ vs: 'siege', amount: 14 }, { vs: 'infantry', amount: 6 }], speed: 0.6, los: 8, pop: 1, age: 3, radius: 0.4, projectile: 'bolt',
    splash: { radius: 1, falloff: 0.3 },
    sprite: 'scorpion', spriteParams: { heavy: true },
  },
  {
    id: 'bombard', name: 'Bombarda', icon: '💣', description: 'Cañón de asedio de tubo corto y bala de piedra: arrasa muros y edificios desde lejos. Poco útil contra tropas.',
    classes: ['siege'], cost: { wood: 220, gold: 180 }, trainTime: 48, trainedAt: WORKSHOP,
    hp: 130, attack: 70, attackType: 'pierce', range: 12, reloadTime: 9, armor: { melee: 1, pierce: 3 },
    bonus: [{ vs: 'building', amount: 90 }], speed: 0.4, los: 5, pop: 3, age: 4, radius: 0.5, projectile: 'cannonball',
    splash: { radius: 1.2, falloff: 0.6, scatter: 1 },
    sprite: 'cannon', spriteParams: { big: true, barrel: '#2f3236' },
  },
  {
    id: 'howitzer', name: 'Obús', icon: '💥', description: 'Artillería de trayectoria alta: proyectiles explosivos de gran alcance, devastadores contra edificios y masas.',
    classes: ['siege', 'artillery', 'antiUnit'], cost: { wood: 150, iron: 100, coal: 50 }, trainTime: 50, trainedAt: WORKSHOP,
    hp: 120, attack: 60, attackType: 'pierce', range: 13, reloadTime: 6, armor: { melee: 1, pierce: 5 },
    bonus: [{ vs: 'building', amount: 50 }], speed: 0.45, los: 6, pop: 3, age: 5, radius: 0.5, projectile: 'cannonball',
    splash: { radius: 1.8, falloff: 0.5, scatter: 0.9 },
    sprite: 'cannon', spriteParams: { howitzer: true, big: true, barrel: '#3f444b' },
  },
];

export const siegeTechs: TechDef[] = [
  {
    id: 'up_cappedRam', name: 'Ariete cubierto', icon: '🪵', description: 'Mejora el ariete: más vida y más daño contra edificios.',
    cost: { wood: 300, gold: 200 }, researchTime: 50, age: 3, researchedAt: 'siegeWorkshop',
    effects: [{ type: 'upgrade', from: 'batteringRam', to: 'cappedRam' }],
  },
  {
    id: 'up_trebuchet', name: 'Trabuquete', icon: '🏗️', description: 'Mejora la catapulta a trabuquete: alcance enorme y daño devastador a los edificios.',
    cost: { wood: 400, gold: 300 }, researchTime: 60, age: 3, researchedAt: 'siegeWorkshop',
    effects: [{ type: 'upgrade', from: 'catapult', to: 'trebuchet' }],
  },
  {
    id: 'up_heavyScorpion', name: 'Escorpión pesado', icon: '🏹', description: 'Mejora el escorpión: más alcance, daño y vida.',
    cost: { wood: 250, gold: 200 }, researchTime: 45, age: 3, researchedAt: 'siegeWorkshop',
    effects: [{ type: 'upgrade', from: 'scorpion', to: 'heavyScorpion' }],
  },
  {
    id: 'up_bombard', name: 'Bombarda', icon: '💣', description: 'Con la pólvora, el trabuquete da paso a la bombarda: un cañón de asedio de gran alcance.',
    cost: { food: 300, gold: 450 }, researchTime: 70, age: 4, researchedAt: 'siegeWorkshop', requiresTechs: ['up_trebuchet'],
    effects: [{ type: 'upgrade', from: 'trebuchet', to: 'bombard' }],
  },
  {
    id: 'up_howitzer', name: 'Obús', icon: '💥', description: 'La fábrica mejora la bombarda a obús: trayectoria alta, proyectiles explosivos y más alcance.',
    cost: { iron: 250, coal: 150, gold: 250 }, researchTime: 70, age: 5, researchedAt: 'factory', requiresTechs: ['up_bombard'],
    effects: [{ type: 'upgrade', from: 'bombard', to: 'howitzer' }],
  },
];

/** Mejoras de la artillería de campaña (el cañón de `gunpowder.ts` pasa a cañón de campaña en la fábrica). */
export const fieldArtilleryTechs: TechDef[] = [
  {
    id: 'up_fieldGun', name: 'Cañón de campaña', icon: '💣', description: 'Mejora el cañón a cañón de campaña: artillería rayada de retrocarga, más alcance y daño.',
    cost: { iron: 200, coal: 100, gold: 150 }, researchTime: 60, age: 5, researchedAt: 'factory',
    effects: [{ type: 'upgrade', from: 'cannon', to: 'fieldGun' }],
  },
];

/** Cuánto pesa cada unidad de asedio en el ejército de la IA (más = quiere más). */
const WEIGHT: Record<string, number> = { batteringRam: 1, cappedRam: 1, catapult: 1.5, trebuchet: 1, scorpion: 1, heavyScorpion: 1, bombard: 1, howitzer: 1.5, cannon: 1.5, fieldGun: 1.5 };
/** Edificios donde se fabrica asedio. */
const SITES = ['siegeWorkshop', 'gunpowderWorks', 'factory'];

/**
 * IA del asedio: con un ejército de tamaño razonable, mantiene una fracción de asedio variada
 * (arietes, catapultas, escorpiones, artillería...), y mejora las líneas que ya usa.
 */
export const siegeAI: AIPlugin = {
  id: 'siege',
  think(ctx) {
    const { game: g, player: p, army } = ctx;
    if (p.age < 2) return;
    // Lo primero de cada era nueva es su edificio clave (fábrica de pólvora, fábrica): el asedio espera
    if ((p.age === 4 && p.count('gunpowderWorks') === 0) || (p.age >= 5 && p.count('factory') === 0)) return;
    const isSiege = (id: string) => g.reg.unit(id).classes.includes('siege');
    const siege = army.filter(e => isSiege(e.defId));
    const troops = army.length - siege.length;
    if (troops < 6) return;

    // Mejoras de las líneas que tiene (o que le interesan): la más barata que pueda pagar
    if (siege.length > 0) {
      const lines = new Set(siege.map(e => e.defId));
      for (const t of [...siegeTechs, ...fieldArtilleryTechs]) {
        const up = t.effects.find(e => e.type === 'upgrade');
        if (up?.type !== 'upgrade' || !lines.has(up.from) || !techAvail(g, p, t.id).ok) continue;
        if (spare(ctx, p.getCost(t), 250) && ctx.research(t.id)) return;
      }
    }

    // Asedio: una pieza por cada tres tropas, con un máximo creciente con la edad
    const want = Math.min(4 + p.age * 2, Math.floor(troops / 3));
    if (siege.length + queuedSiege(ctx) >= want) return;
    const options: string[] = [];
    for (const site of SITES) {
      if (!ctx.buildings.some(b => b.complete && b.defId === site && b.queue.length < 3)) continue;
      for (const id of trainablesAt(g, p, site)) {
        const d = g.reg.unit(id);
        if (isSiege(id) && (d.attack ?? 0) > 0 && !options.includes(id)) options.push(id);
      }
    }
    // La que menos tiene en proporción a su peso (si empatan, la de más edad); ninguna pasa de la mitad del asedio
    const have = (id: string) => siege.filter(e => e.defId === id).length + ctx.buildings.reduce((n, b) => n + b.queue.filter(q => q.kind === 'unit' && q.id === id).length, 0);
    const cap = Math.max(2, Math.ceil(want / 2));
    options.splice(0, options.length, ...options.filter(id => have(id) < cap));
    options.sort((a, b) => have(a) / (WEIGHT[a] ?? 1) - have(b) / (WEIGHT[b] ?? 1) || g.reg.unit(b).age - g.reg.unit(a).age);
    for (const id of options) if (spare(ctx, p.getCost(g.reg.unit(id)), 100) && ctx.train(id)) return;
  },
};

/** ¿Se puede pagar y que sobre `margin` de cada recurso? El asedio no le quita a la economía ni a la edad lo que necesitan. */
function spare(ctx: Parameters<AIPlugin['think']>[0], cost: Record<string, number | undefined>, margin: number): boolean {
  return ctx.canSpend(cost) && Object.entries(cost).every(([r, v]) => (ctx.player.res[r] ?? 0) >= (v ?? 0) + margin);
}

function queuedSiege(ctx: Parameters<AIPlugin['think']>[0]): number {
  const { game: g } = ctx;
  let n = 0;
  for (const b of ctx.buildings) for (const q of b.queue) if (q.kind === 'unit' && g.reg.unit(q.id).classes.includes('siege')) n++;
  return n;
}
