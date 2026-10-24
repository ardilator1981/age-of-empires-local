import { BALANCE } from '../../config/balance';
import type { Cost, Pt, System } from '../../core/types';
import { isAccessible, nearestDrop, nearestNode, isFarmTaken, setOrder } from '../actions';
import { Commands } from '../commands';
import { moveInFormation } from '../formation';
import type { Entity } from '../Entity';
import type { Game } from '../Game';
import type { Player } from '../Player';
import { buildingAvail, researchablesAt, techAvail, trainablesAt, unitAvail } from '../rules';
import { cos, hypot, sin } from '../fmath';
import { wildlifeOf } from '../wildlife';

interface Difficulty {
  gather: number;
  maxVillagers: number;
  firstAttack: number;
  wave: number;
  waveGrow: number;
  villagersForAge: number[];
  think: number;
}

export const AI_DIFFICULTY: Record<string, Difficulty> = BALANCE.ai.difficulty;
const RATIOS = BALANCE.ai.ratios;
const STOCKPILE_ENOUGH = BALANCE.ai.stockpileEnough;

/**
 * IA de un jugador. Lee las definiciones del Registry (no conoce unidades
 * concretas salvo por clases), así que usa también el contenido de los mods.
 */
export class AIController {
  private nextThink = 0;
  private waveSize: number;
  private rebalanceAt = 60;
  private cfg: Difficulty;
  private home: Pt = { x: 0, y: 0 };
  private nodes: Entity[] = [];
  /** Recursos que las extensiones de los mods piden no gastar (del turno anterior). */
  private pluginReserve: Cost = {};

  constructor(private game: Game, private p: Player) {
    this.cfg = AI_DIFFICULTY[p.difficulty] ?? AI_DIFFICULTY.normal;
    if (this.cfg.gather !== 1) p.addEffects([{ type: 'gatherRate', resource: '*', op: 'mul', value: this.cfg.gather }], game, true);
    this.waveSize = this.cfg.wave;
    this.nextThink = game.rng() * this.cfg.think;
  }

  update() {
    const g = this.game;
    if (g.time < this.nextThink || this.p.defeated) return;
    this.nextThink = g.time + this.cfg.think;
    this.think();
  }

  get playerId() { return this.p.id; }

  /** Lo que hay que guardar con la partida (el resto se recalcula en cada turno). */
  saveState() {
    return {
      pid: this.p.id, nextThink: this.nextThink, waveSize: this.waveSize, rebalanceAt: this.rebalanceAt,
      home: this.home, pluginReserve: this.pluginReserve, postAt: this.postAt, post: this.post,
    };
  }

  loadState(s: any) {
    this.nextThink = s.nextThink; this.waveSize = s.waveSize; this.rebalanceAt = s.rebalanceAt;
    this.home = s.home; this.pluginReserve = s.pluginReserve ?? {}; this.postAt = s.postAt; this.post = s.post;
  }

  private isTC(e: Entity) { return e.kind === 'building' && this.game.buildingDef(e).classes.includes('townCenter'); }

  private think() {
    const g = this.game, p = this.p;
    const mine = g.actors.filter(e => e.owner === p.id && !e.dead);
    const vills = mine.filter(e => e.kind === 'unit' && g.unitDef(e).gatherer);
    const army = mine.filter(e => e.kind === 'unit' && !g.unitDef(e).gatherer && (g.unitDef(e).attack ?? 0) > 0);
    const blds = mine.filter(e => e.kind === 'building');
    const tcs = blds.filter(b => this.isTC(b) && b.complete);
    const tc = tcs[0];
    if (tc) this.home = { x: tc.x, y: tc.y };
    else if (vills[0]) this.home = { x: vills[0].x, y: vills[0].y };
    else if (!army.length) return;
    this.nodes = g.nodes.filter(e => !e.dead);

    // ¿Toca avanzar de edad?
    const ageTech = [...g.reg.techs.values()].find(t => t.setsAge === p.age + 1 && techAvail(g, p, t.id).visible);
    const agingUp = blds.some(b => b.queue.some(q => q.kind === 'tech' && g.reg.tech(q.id).setsAge !== undefined));
    const wantAge = !!ageTech && !agingUp && vills.length >= (this.cfg.villagersForAge[p.age] ?? 99);
    const reserve: Cost = { ...this.pluginReserve };
    if (wantAge && ageTech) for (const [r, v] of Object.entries(p.getCost(ageTech))) reserve[r] = (reserve[r] ?? 0) + (v ?? 0);
    const canSpend = (cost: Cost) => Object.entries(cost).every(([r, v]) => (p.res[r] ?? 0) - (reserve[r] ?? 0) >= (v ?? 0));

    // 1. Aldeanos
    const queuedVills = tcs.reduce((n, b) => n + b.queue.filter(q => q.kind === 'unit' && g.reg.unit(q.id).gatherer).length, 0);
    for (const b of tcs) {
      // Sin población libre no se encola (un aldeano esperando bloquearía la cola, también la edad)
      if (vills.length + queuedVills >= this.cfg.maxVillagers || b.queue.length >= 2 || p.popUsed >= p.popCap) continue;
      const vid = trainablesAt(g, p, b.defId).find(id => g.reg.unit(id).gatherer);
      if (vid && canSpend(p.getCost(g.reg.unit(vid)))) Commands.train(g, b, vid);
    }

    // 2. Casas
    const house = [...g.reg.buildings.values()].find(b => (b.popProvided ?? 0) > 0 && b.category === 'economy' && !b.classes.includes('townCenter') && !b.civs);
    if (house && p.popCap < g.opts.popLimit && p.popCap - p.popUsed <= (p.age >= 2 ? 6 : 3) && (p.pending.get(house.id) ?? 0) === 0) {
      this.build(house.id, this.home, 1, vills);
    }

    // 3. Edificios de depósito y militares
    this.ensureDropSites(vills);
    this.ensureFoodBuilding(vills);
    this.tendLivestock(blds, vills);
    this.resumeFoundations(blds, vills);
    if (vills.length >= 10) this.buildOne(['barracks'], vills);
    if (p.age >= 1 && vills.length >= 16) this.buildOne(['blacksmith', 'archeryRange', 'stable'], vills, canSpend);
    if (p.age >= 1 && (p.res.stone ?? 0) >= 200 && p.countAll('watchTower') < 2) this.buildOne(['watchTower'], vills, canSpend);
    if (p.age >= 2) {
      this.buildOne(['siegeWorkshop'], vills, canSpend);
      if ((p.res.stone ?? 0) >= 650) this.buildOne(['castle'], vills, canSpend);
      if (vills.length > 25 && p.countAll('barracks') < 2) this.buildOne(['barracks'], vills, canSpend, true);
    }

    // 4. Edad
    if (wantAge && ageTech && tc && techAvail(g, p, ageTech.id).ok) Commands.research(g, tc, ageTech.id);

    // 5. Tecnologías (cualquiera disponible, incluidas las de mods)
    if (g.rng() < 0.5) {
      for (const b of blds) {
        if (!b.complete || b.queue.length) continue;
        const opts = researchablesAt(g, p, b.defId).filter(t => g.reg.tech(t).setsAge === undefined && !g.reg.tech(t).aiManaged && techAvail(g, p, t).ok && canSpend(p.getCost(g.reg.tech(t))));
        if (!opts.length) continue;
        if (!this.isTC(b) && army.length < 5 && g.buildingDef(b).category === 'military' && g.rng() < 0.7) continue;
        Commands.research(g, b, opts[Math.floor(g.rng() * opts.length)]);
        break;
      }
    }

    // 6. Extensiones de los mods: pueden pedir edificios y unidades, frenar el entrenamiento
    //    del ejército para ahorrar (holdTraining) o encargarse del ejército (armyHandled)
    let armyHandled = false, holdTraining = false;
    const nextReserve: Cost = {};
    for (const plugin of g.reg.aiPlugins) {
      const r = plugin.think({
        game: g, player: p, home: this.home, army, villagers: vills, buildings: blds, canSpend,
        build: (defId, near) => this.build(defId, near ?? this.home, 1, vills),
        research: techId => {
          if (!techAvail(g, p, techId).ok) return false;
          const b = blds.find(x => x.complete && !x.queue.length && g.reg.tech(techId).researchedAt === x.defId);
          return !!b && !!Commands.research(g, b, techId);
        },
        train: unitId => {
          if (!unitAvail(g, p, unitId).ok) return false;
          const b = blds.find(x => x.complete && x.queue.length < 5 && trainablesAt(g, p, x.defId).includes(unitId));
          return !!b && !!Commands.train(g, b, unitId);
        },
      });
      if (r?.armyHandled) armyHandled = true;
      if (r?.holdTraining) holdTraining = true;
      for (const [k, v] of Object.entries(r?.reserve ?? {})) nextReserve[k] = (nextReserve[k] ?? 0) + (v ?? 0);
    }
    this.pluginReserve = nextReserve;

    // 7. Ejército
    if (vills.length >= 8 && !holdTraining) {
      for (const b of blds) {
        if (!b.complete || b.queue.length >= 2) continue;
        const units = trainablesAt(g, p, b.defId).filter(id => {
          const d = g.reg.unit(id);
          return !d.gatherer && (d.attack ?? 0) > 0 && !d.classes.includes('siege') && unitAvail(g, p, id).ok && canSpend(p.getCost(d));
        });
        if (!units.length) continue;
        // Prefiere unidades de edades más avanzadas (el asedio lo lleva el plugin `siege`)
        units.sort((a, c) => g.reg.unit(c).age - g.reg.unit(a).age);
        const pick = g.rng() < 0.6 ? units[0] : units[Math.floor(g.rng() * units.length)];
        Commands.train(g, b, pick);
      }
    }

    // 8. Recolección
    this.assignVillagers(vills);

    // 9. Defensa y ataque
    if (!armyHandled) this.controlArmy(army, blds);
  }

  // ------------------------------------------------------------ construcción

  private buildOne(ids: string[], vills: Entity[], canSpend: (c: Cost) => boolean = () => true, allowMore = false) {
    const g = this.game, p = this.p;
    for (const id of ids) {
      if (!g.reg.buildings.has(id)) continue;
      if (!allowMore && p.countAll(id) > 0) continue;
      if ((p.pending.get(id) ?? 0) > 0) continue;
      if (!canSpend(p.getCost(g.reg.building(id)))) continue;
      if (this.build(id, this.home, 1, vills)) return;
    }
  }

  private build(defId: string, near: Pt, n: number, vills: Entity[], minR = 4, maxR = 18): boolean {
    const g = this.game, p = this.p;
    if (!buildingAvail(g, p, defId).ok || !vills.length) return false;
    const spot = this.findSpot(defId, near, minR, maxR);
    if (!spot) return false;
    const center = { x: spot.x + g.reg.building(defId).size / 2, y: spot.y + g.reg.building(defId).size / 2 };
    const free = vills.filter(v => v.order?.type !== 'build');
    const pool = free.length ? free : vills;
    const builders = [...pool].sort((a, b) => hypot(a.x - center.x, a.y - center.y) - hypot(b.x - center.x, b.y - center.y)).slice(0, n);
    return !!Commands.placeBuilding(g, p.id, defId, spot.x, spot.y, builders);
  }

  private findSpot(defId: string, near: Pt, minR: number, maxR: number): Pt | null {
    const g = this.game, m = g.map;
    const def = g.reg.building(defId);
    const s = def.size;
    const isDrop = !!def.dropSite && !def.classes.includes('townCenter');
    const isFarm = !!def.gatherable;
    const cx = Math.round(near.x - s / 2), cy = Math.round(near.y - s / 2);
    const start = Math.floor(g.rng() * 8);
    const free = g.findFreeTile(this.home.x, this.home.y, 8);
    const homeRegion = free ? m.region(Math.floor(free.x), Math.floor(free.y)) : -1;
    // Torres y castillos: el sitio válido más alto (la altura les da alcance y daño)
    const defensive = (def.attack ?? 0) > 0;
    let best: Pt | null = null, bestScore = -Infinity;
    for (let r = minR; r <= maxR; r++) {
      const ring: Pt[] = [];
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) === r) ring.push({ x: cx + dx, y: cy + dy });
      }
      for (let i = 0; i < ring.length; i++) {
        const t = ring[(i + start * r) % ring.length];
        if (!g.canPlace(defId, t.x, t.y)) continue;
        // Tiene que ser alcanzable desde la base
        if (!m.rectTouchesRegion(t.x, t.y, t.x + s - 1, t.y + s - 1, homeRegion, false)) continue;
        if (isFarm) return t;
        // Deja un pasillo libre alrededor
        let ok = true;
        for (let y = t.y - 1; y <= t.y + s && ok; y++) for (let x = t.x - 1; x <= t.x + s; x++) {
          if (x >= t.x && x < t.x + s && y >= t.y && y < t.y + s) continue;
          if (!m.inBounds(x, y)) { ok = false; break; }
          const occ = m.occupant[y * m.w + x];
          if (!occ) continue;
          const e = g.entities.get(occ);
          if (!e) continue;
          if (e.kind === 'building' || (!isDrop && g.nodeDef(e)?.resource !== 'wood')) { ok = false; break; }
        }
        if (!ok) continue;
        if (!defensive) return t;
        const score = m.baseHeight(t.x, t.y, s) - r * 0.08;
        if (score > bestScore) { bestScore = score; best = t; }
      }
    }
    return best;
  }

  private postAt = -999;
  private post: Pt | null = null;

  /** Punto alto cerca de la base, de cara al enemigo más cercano, para esperar defendiendo. */
  private defensePost(): Pt | null {
    const g = this.game, m = g.map, h = this.home;
    if (g.time - this.postAt < 60 && this.post) return this.post;
    this.postAt = g.time;
    let foe: Pt | null = null, fd = Infinity;
    for (const b of g.buildings) {
      if (b.dead || !g.isEnemy(this.p.id, b.owner)) continue;
      const d = hypot(b.x - h.x, b.y - h.y);
      if (d < fd) { fd = d; foe = b; }
    }
    if (!foe) return (this.post = null);
    const dirX = (foe.x - h.x) / fd, dirY = (foe.y - h.y) / fd;
    const reg = m.regionAt(h.x + dirX * 4, h.y + dirY * 4);
    const th = m.tileHeights();
    let best: Pt | null = null, bs = -Infinity;
    for (let r = 6; r <= 14; r++) for (let a = -0.9; a <= 0.9; a += 0.15) {
      const ca = cos(a), sa = sin(a);
      const x = Math.floor(h.x + (dirX * ca - dirY * sa) * r), y = Math.floor(h.y + (dirX * sa + dirY * ca) * r);
      if (!m.walkable(x, y) || (reg >= 0 && m.region(x, y) !== reg)) continue;
      const score = th[y * m.w + x] - r * 0.05;
      if (score > bs) { bs = score; best = { x: x + 0.5, y: y + 0.5 }; }
    }
    return (this.post = best);
  }

  private dropBuildingFor(res: string): string | null {
    for (const b of this.game.reg.buildings.values()) {
      if (b.dropSite?.includes(res) && !b.classes.includes('townCenter') && b.category === 'economy' && !b.civs) return b.id;
    }
    return null;
  }

  private ensureDropSites(vills: Entity[]) {
    const g = this.game, p = this.p;
    const byRes = new Map<string, Entity[]>();
    for (const v of vills) {
      if (v.order?.type !== 'gather') continue;
      const t = g.get(v.order.targetId);
      if (!t || t.kind !== 'resource') continue;
      const l = byRes.get(t.resType!) ?? [];
      l.push(t);
      byRes.set(t.resType!, l);
    }
    for (const [res, targets] of byRes) {
      if (targets.length < (res === 'wood' ? 3 : 2)) continue;
      const dropId = this.dropBuildingFor(res);
      if (!dropId || (p.pending.get(dropId) ?? 0) > 0) continue;
      const node = targets[0];
      const drop = nearestDrop(g, p, res, node.x, node.y);
      const d = drop ? hypot(drop.x - node.x, drop.y - node.y) - drop.size / 2 : Infinity;
      if (d > 6) this.build(dropId, node, 1, vills, 1, 6);
    }
  }

  /** El edificio que habilita las granjas (molino), cerca de las bayas o de casa. */
  private ensureFoodBuilding(vills: Entity[]) {
    const g = this.game, p = this.p;
    const farm = [...g.reg.buildings.values()].find(b => b.gatherable?.resource === 'food');
    for (const req of farm?.requiresBuildings ?? []) {
      if (p.countAll(req) > 0 || vills.length < 7) continue;
      const berries = nearestNode(g, this.home.x, this.home.y, 16, e => e.kind === 'resource' && e.resType === 'food');
      this.build(req, berries ?? this.home, 1, vills, berries ? 1 : 4, berries ? 6 : 14);
    }
  }

  /** Ganadería: un corral cuando hay aldeanos de sobra, y unas pocas ovejas que sacrificar. */
  private tendLivestock(blds: Entity[], vills: Entity[]) {
    const g = this.game, p = this.p;
    const pen = [...g.reg.buildings.values()].find(b => [...g.reg.units.values()].some(u => u.wildlife?.livestock && u.trainedAt.includes(b.id)));
    if (!pen || p.age < pen.age || vills.length < 14) return;
    if (p.countAll(pen.id) === 0) {
      if ((p.res.wood ?? 0) >= 200) this.buildOne([pen.id], vills);
      return;
    }
    const sheep = [...g.reg.units.values()].find(u => u.wildlife?.livestock && u.trainedAt.includes(pen.id));
    if (!sheep) return;
    const have = g.units.filter(u => !u.dead && u.owner === p.id && u.defId === sheep.id).length;
    for (const b of blds) {
      if (b.defId !== pen.id || !b.complete || b.queue.length) continue;
      if (have >= BALANCE.wildlife.aiSheepPerCorral * p.countAll(pen.id)) break;
      if (Object.entries(p.getCost(sheep)).every(([r, v]) => (p.res[r] ?? 0) >= (v ?? 0) + 100)) Commands.train(g, b, sheep.id);
    }
  }

  /** Cimientos sin nadie construyéndolos: envía al aldeano libre más cercano. */
  private resumeFoundations(blds: Entity[], vills: Entity[]) {
    const g = this.game;
    for (const b of blds) {
      if (b.complete) continue;
      if (vills.some(v => v.order?.type === 'build' && v.order.targetId === b.id)) continue;
      const free = vills.filter(v => v.order?.type !== 'build');
      const v = free.sort((x, y) => hypot(x.x - b.x, x.y - b.y) - hypot(y.x - b.x, y.y - b.y))[0];
      if (v) Commands.build(g, [v], b);
    }
  }

  // ------------------------------------------------------------ economía

  private resourceOf(v: Entity): string | null {
    if (v.order?.type !== 'gather') return null;
    const t = this.game.get(v.order.targetId);
    return t?.resType ?? v.order.resType ?? v.carry?.type ?? null;
  }

  private assignVillagers(vills: Entity[]) {
    const g = this.game, p = this.p;
    // Lo que ya sobra en el almacén deja de pedir aldeanos (si no, la IA acumula oro y se queda sin comida ni madera)
    const ratio = { ...RATIOS[Math.min(p.age, RATIOS.length - 1)] };
    for (const r of Object.keys(ratio)) if ((p.res[r] ?? 0) > STOCKPILE_ENOUGH) ratio[r] *= 0.15;
    const sum = Object.values(ratio).reduce((a, b) => a + b, 0) || 1;
    for (const r of Object.keys(ratio)) ratio[r] /= sum;
    const counts: Record<string, number> = {};
    for (const r of Object.keys(ratio)) counts[r] = 0;
    for (const v of vills) { const r = this.resourceOf(v); if (r) counts[r] = (counts[r] ?? 0) + 1; }
    const total = vills.length;
    const deficit = (r: string) => (ratio[r] ?? 0) * total - (counts[r] ?? 0);

    for (const v of vills) {
      if (v.order) continue;
      const order = Object.keys(ratio).sort((a, b) => deficit(b) - deficit(a));
      for (const r of order) {
        if ((ratio[r] ?? 0) <= 0) continue;
        if (this.sendToResource(v, r, vills)) { counts[r] = (counts[r] ?? 0) + 1; break; }
      }
    }

    // Reequilibrio ocasional
    if (g.time >= this.rebalanceAt) {
      this.rebalanceAt = g.time + 25;
      const keys = Object.keys(ratio);
      const under = keys.sort((a, b) => deficit(b) - deficit(a))[0];
      const over = keys.sort((a, b) => deficit(a) - deficit(b))[0];
      // Si sobra mucho de algo, se reasignan varios a la vez
      const moves = Math.max(1, Math.min(4, Math.floor(-deficit(over) / 3)));
      for (let k = 0; k < moves && under !== over && deficit(under) > 1.5 && deficit(over) < -1.5; k++) {
        const v = vills.find(x => this.resourceOf(x) === over && (!x.carry || x.carry.amount < 1));
        if (!v) break;
        // Si no se puede (p. ej. granjas sin madera), al siguiente recurso que falte
        const to = keys.filter(r => r !== over && deficit(r) > 0.5).sort((a, b) => deficit(b) - deficit(a))
          .find(r => this.sendToResource(v, r, vills));
        if (!to) break;
        counts[over]--; counts[to] = (counts[to] ?? 0) + 1;
      }
    }
  }

  private sendToResource(v: Entity, res: string, vills: Entity[]): boolean {
    const g = this.game, p = this.p, h = this.home;
    let best: Entity | null = null, bestD = res === 'food' ? 22 : 40;
    for (const n of this.nodes) {
      if (n.dead || n.resType !== res || n.amount <= 0) continue;
      const dh = hypot(n.x - h.x, n.y - h.y);
      if (dh > bestD + 10) continue;
      const d = dh * 0.6 + hypot(n.x - v.x, n.y - v.y) * 0.4;
      if (d < bestD && isAccessible(g, n, v)) { bestD = d; best = n; }
    }
    if (res === 'food') {
      // Caza (los animales que no se defienden) y ganado propio, igual que los arbustos
      for (const a of g.units) {
        if (a.dead) continue;
        const w = wildlifeOf(g, a);
        if (!w || w.behavior === 'fight' || (a.owner !== 0 && a.owner !== p.id)) continue;
        const dh = hypot(a.x - h.x, a.y - h.y);
        if (dh > BALANCE.wildlife.aiHuntRange) continue;
        const d = dh * 0.6 + hypot(a.x - v.x, a.y - v.y) * 0.4;
        if (d < bestD && isAccessible(g, a, v)) { bestD = d; best = a; }
      }
    }
    if (!best && res !== 'food') {
      // Se agotó lo cercano (mapas de montaña o desierto): lo más cercano alcanzable, esté donde esté.
      // ensureDropSites levantará allí un campamento en cuanto vayan varios aldeanos.
      let far = Infinity;
      for (const n of this.nodes) {
        if (n.dead || n.resType !== res || n.amount <= 0) continue;
        const d = hypot(n.x - h.x, n.y - h.y);
        if (d < far && isAccessible(g, n, v)) { far = d; best = n; }
      }
    }
    if (best) { setOrder(v, { type: 'gather', targetId: best.id, phase: 'gather' }); return true; }
    if (res !== 'food') return false;
    // Sin bayas: granjas
    const farm = nearestNode(g, h.x, h.y, 25, e => e.kind === 'building' && e.owner === p.id && e.complete && !isFarmTaken(g, e));
    if (farm) { setOrder(v, { type: 'gather', targetId: farm.id, phase: 'gather' }); return true; }
    const farmDef = [...g.reg.buildings.values()].find(b => b.gatherable?.resource === 'food');
    if (!farmDef) return false;
    const mill = g.buildings.find(e => e.owner === p.id && !e.dead && g.buildingDef(e).dropSite?.includes('food') && !this.isTC(e));
    const near = g.rng() < 0.6 || !mill ? h : { x: mill.x, y: mill.y };
    return this.build(farmDef.id, near, 1, [v], 2, 10);
  }

  // ------------------------------------------------------------ ejército

  private controlArmy(army: Entity[], blds: Entity[]) {
    const g = this.game, p = this.p;
    if (!army.length) return;
    // Amenazas cerca de la base
    const threats: Entity[] = [];
    for (const e of g.units) {
      if (e.dead || !g.isEnemy(p.id, e.owner)) continue;
      for (const b of blds) {
        if (hypot(e.x - b.x, e.y - b.y) < 12) { if (g.canAttack(army[0], e, false)) threats.push(e); break; }
      }
    }
    if (threats.length) {
      for (const a of army) {
        if (a.order?.type === 'attack' && !a.order.auto) continue;
        // Los de las murallas disparan desde arriba solos; los que van subiendo, también se quedan
        if (a.onWall || a.order?.type === 'mountWall') continue;
        if (hypot(a.x - this.home.x, a.y - this.home.y) > 35) continue;
        let best = threats[0], bd = Infinity;
        for (const t of threats) { const d = hypot(t.x - a.x, t.y - a.y); if (d < bd) { bd = d; best = t; } }
        setOrder(a, { type: 'attack', targetId: best.id });
      }
      return;
    }

    const idle = army.filter(a => !a.order && !a.onWall);
    // Las tropas que ya están en territorio enemigo siguen atacando
    const deep = idle.filter(a => hypot(a.x - this.home.x, a.y - this.home.y) > 25);
    if (deep.length) {
      const t = this.enemyTarget(deep[0]);
      if (t) Commands.attackMove(g, deep, t.x, t.y);
    }
    const atHome = idle.filter(a => !deep.includes(a));
    if (g.time >= this.cfg.firstAttack && atHome.length >= this.waveSize) {
      const t = this.enemyTarget(atHome[0]);
      if (t) {
        // Al ataque en grupo: postura agresiva y en línea (en cuña si es sobre todo caballería)
        const cav = atHome.filter(a => g.unitDef(a).classes.includes('cavalry')).length;
        Commands.setStance(g, atHome, 'aggressive');
        Commands.setFormation(g, atHome, cav > atHome.length / 2 ? 'wedge' : 'line');
        Commands.attackMove(g, atHome, t.x, t.y);
        this.waveSize += this.cfg.waveGrow;
      }
    } else {
      // Mientras se reúne la oleada, el ejército espera en línea, en un punto alto de cara al
      // enemigo, en postura defensiva (defiende sin alejarse)
      const post = this.defensePost();
      if (post) {
        const away = atHome.filter(a => hypot(a.x - post.x, a.y - post.y) > 4);
        const lax = atHome.filter(a => a.stance !== 'defensive');
        if (lax.length) Commands.setStance(g, lax, 'defensive');
        if (away.length) {
          Commands.setFormation(g, away, 'line');
          const facing = { x: post.x - this.home.x, y: post.y - this.home.y };
          if (away.length >= 2) moveInFormation(g, away, post, facing, 'line');
          else Commands.move(g, away, post.x, post.y);
        }
      }
    }
  }

  private enemyTarget(from: Entity): Entity | null {
    const g = this.game;
    let best: Entity | null = null, bd = Infinity;
    for (const e of g.buildings) {
      if (e.dead || !g.canAttack(from, e, false)) continue;
      const d = hypot(e.x - from.x, e.y - from.y) * (this.isTC(e) ? 0.7 : 1);
      if (d < bd) { bd = d; best = e; }
    }
    if (best) return best;
    for (const e of g.units) {
      if (e.dead || !g.canAttack(from, e, false)) continue;
      const d = hypot(e.x - from.x, e.y - from.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }
}

/** ¿Juega la IA por este jugador? Los de la IA y los humanos que se han ido de una partida en red. */
const aiPlays = (p: Player) => !p.isHuman || !!p.data.aiControl;

export class AISystem implements System {
  private ais: AIController[];
  constructor(private game: Game) {
    this.ais = game.players.slice(1).filter(aiPlays).map(p => new AIController(game, p));
  }
  update() {
    // Partida en red: la IA toma (o devuelve) el mando de un humano con la orden `ai`
    const g = this.game;
    if (g.tick % 20 === 0) {
      for (const p of g.players) {
        if (!p.isHuman) continue;
        const has = this.ais.some(ai => ai.playerId === p.id);
        if (aiPlays(p) && !has) this.ais.push(new AIController(g, p));
        else if (!aiPlays(p) && has) this.ais = this.ais.filter(ai => ai.playerId !== p.id);
      }
    }
    for (const ai of this.ais) ai.update();
  }
  save() { return this.ais.map(ai => ai.saveState()); }
  load(states: any[]) {
    for (const s of states ?? []) this.ais.find(ai => ai.playerId === s.pid)?.loadState(s);
  }
}
