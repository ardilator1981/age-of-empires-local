/**
 * Banco de pruebas del multijugador por pasos sincronizados (prototipo, ver docs/multijugador.md).
 *
 * - `ScriptedPlayer`: un "humano" de mentira que mira su copia de la partida y da órdenes como lo
 *   haría la interfaz (solo `NetCommand`, nunca toca el estado). Usa su propio generador aleatorio,
 *   no el de la partida.
 * - `runMatch`: varios clientes, cada uno con su copia de la partida, que se intercambian los turnos
 *   por una red simulada (latencia, variación, pérdidas con reenvío y tirones del dispositivo).
 *   Guarda la huella de cada cliente en cada tick y dice el primer tick en que difieren.
 */
import { TICK_DT } from '../../src/core/constants';
import type { Registry } from '../../src/core/Registry';
import type { Entity } from '../../src/game/Entity';
import { Game, mulberry32, type GameOptions } from '../../src/game/Game';
import { LockstepPeer, type Desync, type Turn } from '../../src/game/net/lockstep';
import type { NetCommand } from '../../src/game/net/netCommands';
import { playerPowers, powerAvail } from '../../src/game/powers';
import { buildingAvail, unitAvail } from '../../src/game/rules';
import { embargoed, isAllied, proposalsFor, relation } from '../../src/game/diplomacy';
import { spyWait } from '../../src/game/espionage';
import { snapshot, type SaveData } from '../../src/game/save';

const TICK_MS = TICK_DT * 1000;

// ------------------------------------------------------------------ jugador con guion

export class ScriptedPlayer {
  private rnd: () => number;
  private nextAttack = 300;

  constructor(readonly pid: number, seed: number) { this.rnd = mulberry32(seed); }

  /** Órdenes de este tick (piensa una vez por segundo). */
  think(g: Game): NetCommand[] {
    const p = g.players[this.pid];
    if (p.defeated || (g.tick + this.pid * 7) % 20 !== 0) return [];
    const cmds: NetCommand[] = [];
    const mine = g.actors.filter(e => !e.dead && e.owner === this.pid);
    const units = mine.filter(e => e.kind === 'unit');
    const blds = mine.filter(e => e.kind === 'building');
    const vills = units.filter(u => g.unitDef(u).gatherer);
    const army = units.filter(u => !g.unitDef(u).gatherer && (g.unitDef(u).attack ?? 0) > 0);
    const tc = blds.find(b => b.complete && g.buildingDef(b).classes.includes('townCenter'));
    const has = (id: string) => blds.some(b => b.defId === id);
    const building = (id: string) => blds.some(b => b.defId === id && !b.complete);

    if (tc && vills.length < 28 && tc.queue.length < 2 && unitAvail(g, p, 'villager').ok) cmds.push({ t: 'train', at: tc.id, unit: 'villager' });

    // Aldeanos parados: a recolectar (repartidos entre alimento, madera y oro)
    const idle = vills.filter(v => !v.order);
    const byNode = new Map<number, number[]>();
    for (const v of idle) {
      const res = ['food', 'wood', 'wood', 'gold'][(v.id + Math.floor(g.time / 120)) % 4];
      const node = this.nearestNode(g, v, res) ?? this.nearestNode(g, v, 'wood');
      if (node) byNode.set(node.id, [...(byNode.get(node.id) ?? []), v.id]);
    }
    for (const [id, us] of byNode) { const n = g.get(id)!; cmds.push({ t: 'smart', units: us, x: n.x, y: n.y, target: id }); }

    // Edificios: casas cuando falta población, campamento maderero y cuartel
    if (tc && vills.length) {
      const want = p.popCap - p.popUsed <= 3 && p.popCap < g.opts.popLimit && !building('house') ? 'house'
        : vills.length >= 8 && !has('lumberCamp') ? 'lumberCamp'
        : vills.length >= 8 && p.age >= 1 && !has('market') && !building('market') ? 'market'
        : vills.length >= 11 && !has('barracks') ? 'barracks' : null;
      if (want && buildingAvail(g, p, want).ok) {
        const spot = this.findSpot(g, want, want === 'lumberCamp' ? this.nearestNode(g, tc, 'wood') ?? tc : tc);
        const builder = vills[Math.floor(this.rnd() * vills.length)];
        if (spot) cmds.push({ t: 'place', building: want, tx: spot.x, ty: spot.y, builders: [builder.id] });
      }
    }

    // Tropas del cuartel
    for (const b of blds) {
      if (b.defId !== 'barracks' || !b.complete || b.queue.length >= 2) continue;
      const opts = [...g.reg.units.values()].filter(u => u.trainedAt?.includes('barracks') && unitAvail(g, p, u.id).ok);
      if (opts.length && p.res.food > 120) cmds.push({ t: 'train', at: b.id, unit: opts[Math.floor(this.rnd() * opts.length)].id });
    }

    this.tradeAndDiplomacy(g, cmds, blds, units);

    // Poderes activos de su civilización (si ya los tiene): de vez en cuando, uno de los disponibles
    for (const d of playerPowers(g, p)) {
      if (this.rnd() < 0.3 && powerAvail(g, p, d.id).ok) {
        const at = army[0] ?? tc;
        cmds.push({ t: 'mod', id: 'power', args: { id: d.id, x: at ? at.x + (this.rnd() - 0.5) * 10 : 10, y: at ? at.y + (this.rnd() - 0.5) * 10 : 10 } });
      }
    }

    // Cada cierto tiempo, al ataque (en formación o en desorden), y alguna orden suelta de "humano"
    if (g.time > this.nextAttack && army.length >= 4) {
      this.nextAttack = g.time + 60 + this.rnd() * 60;
      const foe = this.enemyTarget(g, army[0]);
      if (foe) {
        const ids = army.map(u => u.id);
        cmds.push(this.rnd() < 0.5
          ? { t: 'army', units: ids, order: { kind: 'attack', points: [{ x: foe.x, y: foe.y }] } }
          : { t: 'attackMove', units: ids, x: foe.x, y: foe.y });
      }
    } else if (army.length && this.rnd() < 0.05) {
      const ids = army.map(u => u.id);
      const r = this.rnd();
      if (r < 0.3) cmds.push({ t: 'stance', units: ids, stance: (['aggressive', 'defensive', 'hold'] as const)[Math.floor(this.rnd() * 3)] });
      else if (r < 0.6) cmds.push({ t: 'formation', units: ids, formation: (['line', 'box', 'wedge'] as const)[Math.floor(this.rnd() * 3)] });
      else if (tc) cmds.push({ t: 'move', units: ids, x: tc.x + (this.rnd() - 0.5) * 12, y: tc.y + (this.rnd() - 0.5) * 12 });
    }
    return cmds;
  }

  /** Comercio, diplomacia y espionaje: lo que un humano haría con el mercado y el panel de diplomacia. */
  private tradeAndDiplomacy(g: Game, cmds: NetCommand[], blds: Entity[], units: Entity[]) {
    const p = g.players[this.pid], others = g.players.slice(1).filter(q => q.id !== this.pid && !q.defeated);
    const market = blds.find(b => b.defId === 'market' && b.complete);
    if (market) {
      const mine = units.filter(u => u.defId === 'caravan');
      if (mine.length + market.queue.length < 3 && p.res.gold >= 50 && p.res.wood >= 100 && unitAvail(g, p, 'caravan').ok) cmds.push({ t: 'train', at: market.id, unit: 'caravan' });
      const posts = g.buildings.filter(b => !b.dead && b.complete && g.buildingDef(b).classes.includes('tradePost'));
      for (const c of mine) {
        if (c.order) continue;
        const dests = posts.filter(b => b.owner !== this.pid && relation(g, this.pid, b.owner) > 0 && !embargoed(g, this.pid, b.owner));
        const far = posts.filter(b => b.owner === this.pid && Math.hypot(b.x - c.x, b.y - c.y) > 16);
        const pool = dests.length ? dests : far;
        // Sin con quién comerciar: pide la paz al dueño de otro mercado (y ya hay ruta cuando acepte)
        const foreign = posts.find(b => b.owner !== this.pid && relation(g, this.pid, b.owner) === 0);
        if (!dests.length && foreign && this.rnd() < 0.2) cmds.push({ t: 'mod', id: 'diplo', args: { a: 'propose', to: foreign.owner, kind: 'peace' } });
        if (pool.length) cmds.push({ t: 'mod', id: 'trade', args: { units: [c.id], dest: pool[Math.floor(this.rnd() * pool.length)].id } });
      }
      if (p.age >= 2 && !units.some(u => u.defId === 'spy') && !market.queue.some(q => q.id === 'spy') && p.res.gold >= 150) cmds.push({ t: 'train', at: market.id, unit: 'spy' });
      for (const sp of units.filter(u => u.defId === 'spy' && !u.order && spyWait(g, u) === 0)) {
        const foe = g.buildings.filter(b => !b.dead && b.owner !== this.pid && b.owner !== 0 && b.complete && !g.buildingDef(b).walkable && !isAllied(g, this.pid, b.owner));
        if (!foe.length) continue;
        const t = foe[Math.floor(this.rnd() * foe.length)];
        cmds.push({ t: 'mod', id: 'spy', args: { units: [sp.id], act: (['intel', 'steal', 'sabotage'] as const)[Math.floor(this.rnd() * 3)], target: t.id } });
      }
    }
    for (const pr of proposalsFor(g, this.pid)) cmds.push({ t: 'mod', id: 'diplo', args: { a: pr.kind === 'peace' || this.rnd() < 0.7 ? 'accept' : 'decline', id: pr.id } });
    if (others.length && this.rnd() < 0.04) {
      const q = others[Math.floor(this.rnd() * others.length)], rel = relation(g, this.pid, q.id), r = this.rnd();
      if (rel === 0) cmds.push({ t: 'mod', id: 'diplo', args: { a: 'propose', to: q.id, kind: 'peace' } });
      else if (r < 0.3) cmds.push({ t: 'mod', id: 'diplo', args: { a: 'propose', to: q.id, kind: 'alliance' } });
      else if (r < 0.5) cmds.push({ t: 'mod', id: 'diplo', args: { a: 'break', to: q.id } });
      else if (r < 0.8) cmds.push({ t: 'mod', id: 'diplo', args: { a: 'tribute', to: q.id, res: 'gold', amount: 100 } });
      else cmds.push({ t: 'mod', id: 'diplo', args: { a: 'embargo', to: q.id, on: this.rnd() < 0.5 } });
    }
  }

  private nearestNode(g: Game, from: { x: number; y: number }, res: string): Entity | null {
    let best: Entity | null = null, bd = 40;
    for (const n of g.nodes) {
      if (n.dead || n.resType !== res || n.amount <= 0) continue;
      const d = Math.abs(n.x - from.x) + Math.abs(n.y - from.y);
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  }

  private findSpot(g: Game, defId: string, near: { x: number; y: number }): { x: number; y: number } | null {
    const start = Math.floor(this.rnd() * 8);
    for (let r = 3; r < 14; r++) {
      for (let k = 0; k < 16; k++) {
        const a = ((k + start) / 16) * Math.PI * 2;
        const tx = Math.floor(near.x + Math.cos(a) * r), ty = Math.floor(near.y + Math.sin(a) * r);
        if (g.canPlace(defId, tx, ty, this.pid)) return { x: tx, y: ty };
      }
    }
    return null;
  }

  private enemyTarget(g: Game, from: Entity): Entity | null {
    let best: Entity | null = null, bd = Infinity;
    for (const e of g.buildings) {
      if (e.dead || !g.isEnemy(this.pid, e.owner)) continue;
      const d = Math.abs(e.x - from.x) + Math.abs(e.y - from.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }
}

// ------------------------------------------------------------------ red simulada

export interface NetProfile {
  name: string;
  /** Latencia de ida, en ms. */
  latency: number;
  /** Variación máxima añadida a cada mensaje, en ms. */
  jitter: number;
  /** Probabilidad de que un mensaje se pierda y haya que reenviarlo (canal fiable y ordenado). */
  loss: number;
  /** Tirones del dispositivo: probabilidad por segundo de quedarse congelado `freezeMs`. */
  freezePerSec?: number;
  freezeMs?: number;
}

export interface MatchOptions {
  reg: Registry;
  opts: GameOptions;
  /** Cuántos de los jugadores de `opts.players` son humanos en red (los primeros). */
  humans: number;
  minutes: number;
  /** Retardo de entrada en ticks. */
  delay: number;
  net: NetProfile;
  /** Cada cuántos ticks se calcula la huella (1 = en todos, para encontrar el primer tick distinto). */
  hashEvery?: number;
  /** Fallo provocado: en ese tick, el cliente cambia un poco su copia (para probar la detección). */
  fault?: { client: number; tick: number };
  /** Un espectador se une en este tick con la partida guardada del primer cliente y los turnos que faltan. */
  joinAt?: number;
  seed?: number;
}

export interface MatchResult {
  ticks: number;
  /** Primer tick en que las huellas de los clientes difieren (null = siempre iguales). */
  firstDiff: number | null;
  /** Desincronización detectada por los propios clientes al intercambiar huellas. */
  desync: Desync | null;
  /** El espectador que se unió tarde: primer tick distinto respecto al cliente 0 (null = igual). */
  joinDiff?: number | null;
  joinTicksCompared?: number;
  joinSaveKB?: number;
  /** Velocidad del juego respecto al tiempo real (100 = nunca se para). */
  speedPct: number;
  /** Porcentaje del tiempo con algún cliente parado esperando turnos. */
  stallPct: number;
  /** Parón más largo de un cliente esperando turnos (ms). */
  longestStallMs: number;
  /** Retardo medio entre dar una orden y ejecutarla (ms). */
  orderDelayMs: number;
  commands: number;
  /** Poderes activos lanzados durante la partida (los vistos por el primer cliente: humanos e IA). */
  powersUsed: number;
  /** Comercio, diplomacia y espionaje que ha habido en la partida (cliente 0). */
  trade: { gold: number; treaties: number; spyActions: number };
  /** Bytes enviados por cliente y segundo (turnos en JSON). */
  bytesPerSec: number;
  wallMs: number;
}

interface Msg { at: number; to: number; turn: Turn; json: string }

export function runMatch(o: MatchOptions): MatchResult {
  const t0 = Date.now();
  const rnd = mulberry32(o.seed ?? 1);
  const n = o.humans;
  const humanIds = Array.from({ length: n }, (_, i) => i + 1);
  const hashEvery = o.hashEvery ?? 1;
  const hashes: Map<number, number>[] = humanIds.map(() => new Map());
  const clients = humanIds.map((pid, i) => {
    const game = new Game(o.reg, o.opts);
    game.humanId = pid; // cada cliente ve la partida como su jugador
    const peer = new LockstepPeer(game, pid, humanIds, { delay: o.delay, hashEvery, onHash: (t, h) => hashes[i].set(t, h) });
    // issuedAt: instante (ms) en que se dieron las órdenes que se ejecutan en cada tick
    // clock: tiempo de juego que lleva este cliente (se para mientras espera turnos o está congelado)
    return { game, peer, bot: new ScriptedPlayer(pid, 1000 + pid), frozenUntil: 0, issuedAt: new Map<number, number>(), clock: 0, streak: 0 };
  });
  let powersUsed = 0;
  clients[0].game.events.on('powerUsed', () => { powersUsed++; });
  const trade = { gold: 0, treaties: 0, spyActions: 0 };
  clients[0].game.events.on('tradeProfit', e => { trade.gold += e.amount; });
  clients[0].game.events.on('diplomacyChanged', () => { trade.treaties++; });
  clients[0].game.events.on('spyAction', () => { trade.spyActions++; });
  const targetTicks = Math.round(o.minutes * 60 / TICK_DT);
  const queue: Msg[] = [];
  const linkLast = new Map<string, number>();
  const log: Turn[] = [];
  let bytes = 0, commands = 0, stalled = 0, longest = 0, delaySum = 0, delayN = 0, now = 0;
  let joiner: { game: Game; peer: LockstepPeer; hashes: Map<number, number>; saveKB: number } | null = null;

  const send = (from: number, turn: Turn, now: number) => {
    const json = JSON.stringify(turn);
    bytes += json.length;
    log.push(turn);
    for (let j = 0; j < n; j++) {
      if (j === from) continue;
      const key = `${from}>${j}`;
      let at = now + o.net.latency + rnd() * o.net.jitter;
      // Pérdida en un canal fiable: se reenvía tras ~1 ida y vuelta
      while (rnd() < o.net.loss) at += 2 * o.net.latency + 20;
      at = Math.max(at, linkLast.get(key) ?? 0); // canal ordenado: nadie adelanta al anterior
      linkLast.set(key, at);
      queue.push({ at, to: j, turn, json });
    }
  };

  const STEP = 5;
  for (; clients.some(c => c.game.tick < targetTicks); now += STEP) {
    // Entrega lo que ha llegado (los turnos viajan como JSON, igual que por la red)
    for (let k = 0; k < queue.length;) {
      if (queue[k].at <= now) { clients[queue[k].to].peer.receive(JSON.parse(queue[k].json)); queue.splice(k, 1); } else k++;
    }
    let anyStalled = false;
    clients.forEach((c, i) => {
      if (o.net.freezePerSec && now >= c.frozenUntil && rnd() < o.net.freezePerSec * STEP / 1000) c.frozenUntil = now + (o.net.freezeMs ?? 300);
      if (now < c.frozenUntil || c.game.tick >= targetTicks) return;
      c.clock += STEP;
      const due = Math.min(targetTicks, Math.floor(c.clock / TICK_MS));
      while (c.game.tick < due && c.peer.ready()) {
        c.peer.step();
        const at = c.issuedAt.get(c.game.tick);
        if (at !== undefined) { delaySum += now - at; delayN++; c.issuedAt.delete(c.game.tick); }
        if (o.fault && o.fault.client === i && c.game.tick === o.fault.tick) c.game.players[c.peer.me].res.food += 0.001;
        for (const cmd of c.bot.think(c.game)) { c.peer.issue(cmd); commands++; }
        for (const turn of c.peer.endTurn()) {
          if (turn.cmds.length) c.issuedAt.set(turn.tick, now);
          send(i, turn, now);
        }
      }
      // Le faltan turnos: el juego se queda parado ("Esperando a...") y sigue desde ahí
      if (c.game.tick < due) {
        anyStalled = true;
        c.clock = (c.game.tick + 1) * TICK_MS - 1;
        c.streak += STEP;
        longest = Math.max(longest, c.streak);
      } else c.streak = 0;
    });
    if (anyStalled) stalled += STEP;

    // Espectador que se une a mitad de partida: partida guardada del cliente 0 + turnos pendientes
    if (o.joinAt && !joiner && clients[0].game.tick >= o.joinAt) {
      const save: SaveData = JSON.parse(JSON.stringify(snapshot(clients[0].game)));
      const game = new Game(o.reg, save.opts, save);
      const jh = new Map<number, number>();
      const peer = new LockstepPeer(game, 0, humanIds, { delay: o.delay, hashEvery, onHash: (t, h) => jh.set(t, h), prefill: false });
      joiner = { game, peer, hashes: jh, saveKB: JSON.stringify(save).length / 1024 };
    }
    if (joiner) {
      for (const t of log.splice(0)) joiner.peer.receive(t);
      while (joiner.peer.ready() && joiner.game.tick < clients[0].game.tick) joiner.peer.step();
    } else if (!o.joinAt) log.length = 0;
  }

  // Primer tick con huellas distintas entre clientes
  let firstDiff: number | null = null;
  for (const [t, h] of hashes[0]) {
    if (hashes.some(m => m.has(t) && m.get(t) !== h)) { firstDiff = t; break; }
  }
  let joinDiff: number | null = null, joinTicksCompared = 0;
  if (joiner) {
    for (const [t, h] of joiner.hashes) {
      if (!hashes[0].has(t)) continue;
      joinTicksCompared++;
      if (hashes[0].get(t) !== h) { joinDiff = t; break; }
    }
  }
  const seconds = targetTicks * TICK_DT;
  return {
    ticks: targetTicks, firstDiff,
    desync: clients.map(c => c.peer.desync).find(d => d) ?? null,
    ...(joiner ? { joinDiff, joinTicksCompared, joinSaveKB: Math.round(joiner.saveKB) } : {}),
    speedPct: Math.round(1000 * seconds * 1000 / now) / 10,
    stallPct: Math.round(1000 * stalled / now) / 10,
    longestStallMs: longest,
    orderDelayMs: Math.round(delaySum / Math.max(1, delayN)),
    commands, powersUsed, trade, bytesPerSec: Math.round(bytes / n / seconds), wallMs: Date.now() - t0,
  };
}
