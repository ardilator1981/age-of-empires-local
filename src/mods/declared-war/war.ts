import { BALANCE } from '../../config/balance';
import type { CombatRule, Pt } from '../../core/types';
import type { Entity } from '../../game/Entity';
import type { Game } from '../../game/Game';
import type { Player } from '../../game/Player';
import { cos, hypot, sin } from '../../game/fmath';

/**
 * Reglas del modo "Guerra declarada" (simulación pura: sin DOM).
 *
 * - Hasta que empieza una batalla nadie puede atacar a nadie (regla de combate).
 * - Para declarar la guerra hacen falta a la vez: la Edad de los Castillos, haber descubierto
 *   el asentamiento del rival y tener un General vivo.
 * - Quien declara elige el punto de la batalla; se mantiene el suyo (el rival no puede moverlo).
 * - Tras la cuenta atrás, solo se combate dentro del círculo (ambos dentro). Pierde la batalla
 *   quien pierde a su General o se queda sin tropas en el círculo `abandonSeconds` seguidos.
 *   Al agotarse el tiempo gana quien tenga más ejército dentro (por coste); si hay empate,
 *   tablas y vuelve la paz.
 * - Conquista: quien gana la batalla puede atacar ya en todo el mapa y arrasar el pueblo del
 *   rival; el perdedor solo puede defenderse (sus tropas y torres atacan a las tropas enemigas,
 *   pero no a sus edificios). Cuando al perdedor no le queda ningún edificio, pierde la partida.
 *   Si el ganador se queda sin ejército `conquestFailSeconds` seguidos, o el pueblo aguanta
 *   `conquestMaxMinutes`, la conquista fracasa y vuelve la paz (los dos pueden volver a declarar).
 *
 * Todo pasa por `declareWar` y depende solo del tiempo de juego (ticks), así que en un futuro
 * multijugador por pasos sincronizados bastaría con enviar esa orden como cualquier otra.
 */

export const GENERAL = 'general';
const W = BALANCE.war;

export type WarPhase = 'prep' | 'battle' | 'conquest' | 'over';

export interface War {
  id: number;
  /** Quien declara. */
  a: number;
  /** Contra quien. */
  b: number;
  x: number;
  y: number;
  r: number;
  declaredAt: number;
  battleAt: number;
  endsAt: number;
  phase: WarPhase;
  /** General de cada bando al empezar la batalla (0 = no tenía). */
  generals: Record<number, number>;
  /** Segundos seguidos sin tropas en el círculo, por bando. */
  empty: Record<number, number>;
  result?: { winner: number | null; reason: string; failed?: boolean };
  /** Conquista: segundos seguidos que el ganador lleva sin ejército. */
  conquestEmpty?: number;
  /** Conquista: hasta cuándo tiene el ganador para arrasar el pueblo. */
  conquestUntil?: number;
  /** Avisos de cuenta atrás ya dados (segundos restantes). */
  warned: number[];
}

export interface WarState {
  /** Duración de la preparación (s). */
  prep: number;
  wars: War[];
  /** discovered[p] = rivales cuyo asentamiento ha descubierto p. */
  discovered: Record<number, number[]>;
  /** Avisos ya dados por jugador (condiciones cumplidas...). */
  told: Record<number, string[]>;
  /** Momento en que se cumplieron todas las condiciones (IA: para no esperar eternamente). */
  readySince: Record<number, number>;
  /** Hasta cuándo no se puede volver a declarar (por pareja "a-b"). */
  cooldown: Record<string, number>;
  nextId: number;
}

export function warState(game: Game): WarState | undefined { return game.data.war; }

export function initWar(game: Game) {
  const prepMin = game.opts.warPrepMinutes ?? W.prepMinutes;
  const st: WarState = { prep: prepMin * 60, wars: [], discovered: {}, told: {}, readySince: {}, cooldown: {}, nextId: 1 };
  for (const p of game.players.slice(1)) { st.discovered[p.id] = []; st.told[p.id] = []; }
  game.data.war = st;
}

// ------------------------------------------------------------------ consultas

export function isMilitary(game: Game, e: Entity): boolean {
  if (e.kind !== 'unit' || e.dead) return false;
  const d = game.unitDef(e);
  return !d.gatherer && (d.attack ?? 0) > 0;
}

export function isTownCenter(game: Game, e: Entity): boolean {
  return e.kind === 'building' && game.buildingDef(e).classes.includes('townCenter');
}

/** Guerra en curso (preparación o batalla) en la que participa el jugador. */
export function activeWar(game: Game, pid: number): War | undefined {
  return warState(game)?.wars.find(w => w.phase !== 'over' && (w.a === pid || w.b === pid));
}

export function enemyOf(w: War, pid: number): number { return w.a === pid ? w.b : w.a; }

export function inCircle(w: Pt & { r: number }, e: Entity, margin = 0): boolean {
  const extra = e.kind === 'building' ? e.size / 2 : 0;
  return hypot(e.x - w.x, e.y - w.y) <= w.r + extra + margin;
}

export function generalOf(game: Game, pid: number): Entity | undefined {
  return game.units.find(u => !u.dead && u.owner === pid && u.defId === GENERAL);
}

export interface Conditions {
  age: boolean;
  /** Rivales vivos cuyo asentamiento se ha descubierto. */
  discovered: number[];
  general: boolean;
  /** Guerra en curso (no se puede declarar otra). */
  busy?: War;
  ok: boolean;
}

export function conditions(game: Game, p: Player): Conditions {
  const st = warState(game);
  const age = p.age >= W.requiredAge;
  const discovered = (st?.discovered[p.id] ?? []).filter(id => !game.players[id].defeated);
  const general = !!generalOf(game, p.id);
  const busy = activeWar(game, p.id);
  return { age, discovered, general, busy, ok: age && discovered.length > 0 && general && !busy };
}

/** Rivales contra los que `p` puede declarar ya la guerra. */
export function declarableTargets(game: Game, p: Player): number[] {
  const c = conditions(game, p), st = warState(game)!;
  if (!c.ok) return [];
  return c.discovered.filter(id => !activeWar(game, id) && game.time >= (st.cooldown[pairKey(p.id, id)] ?? 0));
}

function pairKey(a: number, b: number) { return a < b ? `${a}-${b}` : `${b}-${a}`; }

/** Punto caminable junto al centro urbano (o lo que quede) de un jugador. */
function homeOf(game: Game, pid: number): Pt | null {
  const tc = game.buildings.find(b => !b.dead && b.owner === pid && isTownCenter(game, b))
    ?? game.buildings.find(b => !b.dead && b.owner === pid) ?? game.units.find(u => !u.dead && u.owner === pid);
  return tc ? game.findFreeTile(tc.x, tc.y, 12) : null;
}

export interface PointInfo {
  ok: boolean;
  reason?: string;
  minH: number;
  maxH: number;
  /** Fracción del círculo intransitable (roca, agua, bosque cerrado o edificios). */
  blocked: number;
  /** Entradas transitables al círculo (-1 = abierto por todos lados). */
  passes: number;
  /** Muestras del borde (para dibujar las entradas). */
  edge: { x: number; y: number; ok: boolean }[];
  /** Punto más alto transitable dentro del círculo. */
  peak: Pt | null;
}

/**
 * ¿Sirve este punto para la batalla entre a y b? Además devuelve cómo es la zona:
 * alturas, roca, pasos de entrada y la cima (para mostrarlo al elegir).
 */
export function battlePointInfo(game: Game, a: number, b: number, x: number, y: number): PointInfo {
  const m = game.map, r = W.circleRadius, th = m.tileHeights();
  let minH = Infinity, maxH = -Infinity, blocked = 0, total = 0, peak: Pt | null = null, peakH = -Infinity;
  for (let ty = Math.floor(y - r); ty <= Math.ceil(y + r); ty++) for (let tx = Math.floor(x - r); tx <= Math.ceil(x + r); tx++) {
    if (!m.inBounds(tx, ty) || hypot(tx + 0.5 - x, ty + 0.5 - y) > r) continue;
    total++;
    const h = th[ty * m.w + tx];
    minH = Math.min(minH, h); maxH = Math.max(maxH, h);
    if (!m.walkable(tx, ty)) { blocked++; continue; }
    if (h > peakH) { peakH = h; peak = { x: tx + 0.5, y: ty + 0.5 }; }
  }
  const n = Math.ceil(2 * Math.PI * r * 1.5), edge: PointInfo['edge'] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2, ex = x + cos(t) * r, ey = y + sin(t) * r;
    edge.push({ x: ex, y: ey, ok: m.inBounds(Math.floor(ex), Math.floor(ey)) && m.walkable(Math.floor(ex), Math.floor(ey)) });
  }
  let passes = 0;
  if (edge.every(e => e.ok)) passes = -1;
  else for (let i = 0; i < n; i++) if (edge[i].ok && !edge[(i + n - 1) % n].ok) passes++;
  const info: PointInfo = { ok: true, minH: isFinite(minH) ? minH : 0, maxH: isFinite(maxH) ? maxH : 0, blocked: total ? blocked / total : 1, passes, edge, peak };
  const fail = (reason: string) => ({ ...info, ok: false, reason });

  if (x < 2 || y < 2 || x > m.w - 2 || y > m.h - 2) return fail('Fuera del mapa');
  if (!m.walkable(Math.floor(x), Math.floor(y))) return fail('El centro tiene que ser terreno transitable');
  // Un jugador humano solo puede elegir terreno que conozca (la vista previa no debe revelar la niebla)
  const pa = game.players[a];
  if (pa.isHuman && !pa.explored[Math.floor(y) * m.w + Math.floor(x)]) return fail('Zona sin explorar: explórala antes');
  if (info.blocked > 0.6) return fail('Casi todo es intransitable');
  for (const tc of game.buildings) {
    if (tc.dead || !isTownCenter(game, tc)) continue;
    if (hypot(tc.x - x, tc.y - y) < W.minDistFromTownCenter) return fail('Demasiado cerca de un centro urbano');
  }
  const reg = m.region(Math.floor(x), Math.floor(y));
  for (const pid of [a, b]) {
    const h = homeOf(game, pid);
    if (h && m.region(Math.floor(h.x), Math.floor(h.y)) !== reg) return fail(`${game.players[pid].name} no puede llegar hasta ahí`);
  }
  return info;
}

// ------------------------------------------------------------------ declarar

/** Declara la guerra. Devuelve la guerra o el motivo por el que no se puede. */
export function declareWar(game: Game, pid: number, target: number, x: number, y: number): War | string {
  const st = warState(game);
  if (!st) return 'El modo Guerra declarada no está activo';
  const p = game.players[pid];
  const c = conditions(game, p);
  if (c.busy) return 'Ya estás en guerra';
  if (!c.ok) return 'Aún no cumples las condiciones';
  if (!declarableTargets(game, p).includes(target)) return 'No puedes declarar la guerra a ese rival ahora';
  const info = battlePointInfo(game, pid, target, x, y);
  if (!info.ok) return info.reason ?? 'Punto no válido';
  const w: War = {
    id: st.nextId++, a: pid, b: target, x, y, r: W.circleRadius,
    declaredAt: game.time, battleAt: game.time + st.prep, endsAt: game.time + st.prep + W.battleMaxMinutes * 60,
    phase: 'prep', generals: {}, empty: { [pid]: 0, [target]: 0 }, warned: [],
  };
  st.wars.push(w);
  const t = game.players[target], at = { x, y };
  const when = fmt(st.prep);
  game.notify(`⚔️ Has declarado la guerra a ${t.name}. La batalla empieza dentro de ${when}`, pid, 'good', at);
  game.notify(`⚔️ ¡${p.name} te ha declarado la guerra! Batalla en el punto marcado dentro de ${when}`, target, 'warn', at);
  for (const o of game.players.slice(1)) {
    if (o.id !== pid && o.id !== target) game.notify(`⚔️ ${p.name} ha declarado la guerra a ${t.name}`, o.id, 'info', at);
  }
  game.events.emit('warDeclared', { war: w });
  return w;
}

export function fmt(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// ------------------------------------------------------------------ reglas de combate

/**
 * En la batalla solo se ataca dentro del círculo. En la conquista, en todo el mapa, pero el
 * perdedor no puede atacar edificios del ganador (solo defenderse).
 */
export const warCombatRule: CombatRule = (game, a, t, hitting) => {
  const st = warState(game);
  if (!st) return true;
  const w = st.wars.find(x => (x.phase === 'battle' || x.phase === 'conquest') && ((x.a === a.owner && x.b === t.owner) || (x.b === a.owner && x.a === t.owner)));
  if (!w) return false;
  if (w.phase === 'conquest') return a.owner === w.result?.winner || t.kind !== 'building';
  if (!inCircle(w, t)) return false;
  return !hitting || inCircle(w, a, a.kind === 'unit' ? a.radius : 0);
};

/** Edificios que forman el pueblo de un jugador (sin contar granjas). */
export function townLeft(game: Game, pid: number): number {
  let n = 0;
  for (const b of game.buildings) if (!b.dead && b.owner === pid && !game.buildingDef(b).walkable) n++;
  return n;
}

// ------------------------------------------------------------------ sistema

/** Coste total de una unidad (para comparar ejércitos al agotarse el tiempo). */
function unitValue(game: Game, e: Entity): number {
  return Object.values(game.players[e.owner].getCost(game.unitDef(e))).reduce<number>((s, v) => s + (v ?? 0), 0);
}

export function armyInCircle(game: Game, w: War, pid: number): { count: number; value: number } {
  let count = 0, value = 0;
  for (const u of game.units) {
    if (u.dead || u.owner !== pid || !isMilitary(game, u) || !inCircle(w, u)) continue;
    count++;
    value += unitValue(game, u);
  }
  return { count, value };
}

function tell(game: Game, pid: number, key: string, text: string, tone: 'info' | 'warn' | 'good' = 'good') {
  const st = warState(game)!;
  if (st.told[pid].includes(key)) return;
  st.told[pid].push(key);
  game.notify(text, pid, tone);
}

function updateDiscovery(game: Game) {
  const st = warState(game)!, m = game.map;
  for (const p of game.players.slice(1)) {
    if (p.defeated) continue;
    for (const q of game.players.slice(1)) {
      if (q.id === p.id || q.defeated || st.discovered[p.id].includes(q.id)) continue;
      const theirs = game.buildings.filter(b => !b.dead && b.owner === q.id);
      let found = false;
      // Lo explorado en la niebla (jugador humano) o cualquier unidad o edificio propio a la vista
      if (p.isHuman) found = theirs.some(b => p.explored[Math.floor(b.y) * m.w + Math.floor(b.x)] === 1);
      if (!found) {
        for (const e of game.actors) {
          if (e.dead || e.owner !== p.id) continue;
          const los = p.getStat(game.defOf(e), 'los') + 1;
          if (theirs.some(b => hypot(b.x - e.x, b.y - e.y) - b.size / 2 <= los)) { found = true; break; }
        }
      }
      if (found) {
        st.discovered[p.id].push(q.id);
        tell(game, p.id, `found-${q.id}`, `🔍 Has descubierto el asentamiento de ${q.name}`);
      }
    }
  }
}

/** Fin de la batalla: tablas (vuelve la paz) o empieza la conquista del ganador. */
function resolve(game: Game, w: War, winner: number | null, reason: string) {
  const st = warState(game)!;
  w.result = { winner, reason };
  if (winner === null) {
    w.phase = 'over';
    st.cooldown[pairKey(w.a, w.b)] = game.time + W.redeclareCooldown;
    for (const pid of [w.a, w.b]) game.notify(`🤝 Tablas: ${reason}. Vuelve la paz.`, pid, 'info');
    game.events.emit('warEnded', { war: w });
    return;
  }
  w.phase = 'conquest';
  w.conquestUntil = game.time + W.conquestMaxMinutes * 60;
  const loser = game.players[enemyOf(w, winner)], win = game.players[winner];
  const at = game.buildings.find(b => !b.dead && b.owner === loser.id && isTownCenter(game, b));
  game.notify(`🏆 Has ganado la batalla: ${reason}. ¡Arrasa el pueblo de ${loser.name} para ganar la partida!`, win.id, 'good', at ? { x: at.x, y: at.y } : undefined);
  game.notify(`💀 Has perdido la batalla: ${reason}. Defiende tu pueblo: si cae, pierdes la partida`, loser.id, 'warn');
  for (const o of game.players.slice(1)) if (o.id !== win.id && o.id !== loser.id) game.notify(`🏆 ${win.name} gana la batalla contra ${loser.name}`, o.id, 'info');
  game.events.emit('battleWon', { war: w });
}

/** El pueblo del perdedor ha caído (o ha caído por otra vía): pierde la partida. */
function finishConquest(game: Game, w: War) {
  const loser = game.players[enemyOf(w, w.result!.winner!)];
  w.phase = 'over';
  game.notify(`🔥 ${game.players[w.result!.winner!].name} ha arrasado el pueblo de ${loser.name}`, undefined, 'good');
  if (!loser.defeated) {
    loser.defeated = true;
    game.events.emit('playerDefeated', { player: loser });
  }
  game.events.emit('warEnded', { war: w });
}

const COUNTDOWN_MARKS = [600, 300, 60, 10];

export function updateWar(game: Game, dt: number) {
  const st = warState(game);
  if (!st) return;
  if (game.tick % 20 === 0) {
    updateDiscovery(game);
    for (const p of game.players.slice(1)) {
      if (p.defeated) continue;
      const c = conditions(game, p);
      if (c.general) tell(game, p.id, 'general', '🎖️ Tu General está listo');
      if (c.ok) {
        st.readySince[p.id] ??= game.time;
        tell(game, p.id, 'ready', '⚔️ Cumples las condiciones: ya puedes declarar la guerra');
      } else delete st.readySince[p.id];
    }
  }
  for (const w of st.wars) {
    if (w.phase === 'over') continue;
    const pa = game.players[w.a], pb = game.players[w.b];
    if (w.phase === 'conquest') {
      const winner = w.result!.winner!, loser = enemyOf(w, winner);
      if (game.players[loser].defeated || (game.tick % 20 === 0 && townLeft(game, loser) === 0)) { finishConquest(game, w); continue; }
      if (game.tick % 10 === 0) {
        const hasArmy = game.units.some(u => !u.dead && u.owner === winner && isMilitary(game, u));
        w.conquestEmpty = hasArmy ? 0 : (w.conquestEmpty ?? 0) + dt * 10;
        const timeUp = game.time >= (w.conquestUntil ?? Infinity);
        if (w.conquestEmpty >= W.conquestFailSeconds || timeUp || game.players[winner].defeated) {
          w.phase = 'over';
          w.result!.failed = true;
          st.cooldown[pairKey(w.a, w.b)] = game.time + W.redeclareCooldown;
          const why = timeUp ? `el pueblo de ${game.players[loser].name} ha resistido` : `${game.players[winner].name} se ha quedado sin ejército`;
          for (const pid of [w.a, w.b]) game.notify(`🤝 La conquista ha fracasado: ${why}. Vuelve la paz.`, pid, 'info');
          game.events.emit('warEnded', { war: w });
        }
      }
      continue;
    }
    // Si uno de los bandos cae por otra vía, la guerra termina
    if (pa.defeated || pb.defeated) {
      w.result = { winner: pa.defeated ? (pb.defeated ? null : w.b) : w.a, reason: 'el rival ha caído' };
      w.phase = 'over';
      game.events.emit('warEnded', { war: w });
      continue;
    }
    if (w.phase === 'prep') {
      const left = w.battleAt - game.time;
      for (const mark of COUNTDOWN_MARKS) {
        if (left <= mark && left > mark - 1 && !w.warned.includes(mark) && st.prep > mark) {
          w.warned.push(mark);
          for (const pid of [w.a, w.b]) game.notify(`⏳ La batalla empieza en ${mark >= 60 ? `${mark / 60} min` : `${mark} s`}`, pid, mark <= 60 ? 'warn' : 'info', { x: w.x, y: w.y });
        }
      }
      if (left <= 0) {
        w.phase = 'battle';
        w.endsAt = game.time + W.battleMaxMinutes * 60;
        for (const pid of [w.a, w.b]) w.generals[pid] = generalOf(game, pid)?.id ?? 0;
        for (const pid of [w.a, w.b]) game.notify('⚔️ ¡Empieza la batalla! Solo se combate dentro del círculo', pid, 'warn', { x: w.x, y: w.y });
        game.events.emit('battleStarted', { war: w });
      }
      continue;
    }
    // Batalla: condiciones de victoria (cada medio segundo)
    if (game.tick % 10 !== 0) continue;
    const step = dt * 10;
    for (const pid of [w.a, w.b]) {
      const g = w.generals[pid];
      if (g && !game.get(g)) { resolve(game, w, enemyOf(w, pid), `ha caído el General de ${game.players[pid].name}`); break; }
    }
    if (w.phase !== 'battle') continue;
    const armies = { [w.a]: armyInCircle(game, w, w.a), [w.b]: armyInCircle(game, w, w.b) };
    for (const pid of [w.a, w.b]) w.empty[pid] = armies[pid].count ? 0 : w.empty[pid] + step;
    const goneA = w.empty[w.a] >= W.abandonSeconds, goneB = w.empty[w.b] >= W.abandonSeconds;
    if (goneA && goneB) { resolve(game, w, null, 'ningún ejército se ha quedado en el campo'); continue; }
    if (goneA || goneB) {
      const loser = goneA ? w.a : w.b;
      resolve(game, w, enemyOf(w, loser), `${game.players[loser].name} se ha quedado sin tropas en el campo`);
      continue;
    }
    if (game.time >= w.endsAt) {
      const va = armies[w.a].value, vb = armies[w.b].value;
      if (va === vb) resolve(game, w, null, 'se acabó el tiempo con fuerzas iguales');
      else resolve(game, w, va > vb ? w.a : w.b, 'se acabó el tiempo y tiene más ejército en el campo');
    }
  }
}
