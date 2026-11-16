/**
 * PROTOTIPO DESCARTABLE (fase 0 de docs/batalla-tactica.md): reglas tácticas «a lo bruto»
 * encima del motor, sin tocar src/. Dos ejércitos parejos en Arabia, regimientos sobre los
 * grupos en formación, moral, flancos, retaguardia, carga, contagio y General caído.
 *
 * Uso:  npm run battle-proto -- [--seeds=20] [--variants=a,b,c,d,e,f,g,h] [--minutes=25] [--jobs=8] [--verbose]
 *       [--set=morale.perLoss=3 ...]  (cambia cifras de PROTO sin editar el script)
 *       (cada variante corre en un proceso hijo; --jobs=1 las corre en serie)
 *
 * Variantes: a espejo · b Azul carga de frente con la caballería · c Azul flanquea y Rojo carga de frente ·
 *            d Azul sin General · e Rojo con el doble de lanceros · f Azul carga de frente contra el doble
 *            de lanceros · g Azul flanquea y Rojo guarda la caballería en reserva ·
 *            h cae el General azul a los 3 min.
 *
 * ---------------------------------------------------------------------------------------------
 * CALIBRACIÓN: QUÉ HA FUNCIONADO Y QUÉ NO (20 semillas por variante; detalle en el documento,
 * sección «Resultados de la fase 0»). Las cifras finales son las de `PROTO`.
 *
 *  1. Las cifras del documento sobre el daño del motor tal cual NO dan batallas largas: con el daño
 *     del motor un regimiento de 10 muere en ~30 s de contacto, la moral no llega a actuar y todo
 *     acaba en 1–5 min. La capa táctica tiene que ABLANDAR el combate: aquí, daño ×0,16 (en el
 *     motor, equivale a unos ×6 de vida). Con ×0,12 o menos muchas batallas se atascan hasta el tope
 *     de tiempo. El bono de clase (lanza contra caballería) se atenúa menos (×0,6), si no los
 *     lanceros no hacen nada contra los caballeros.
 *  2. Sin ese ablandamiento, subir la moral por bajas o el contagio no alarga nada: solo hace que el
 *     ejército se rompa antes. El tiempo lo da la RECUPERACIÓN: la zona de huida tiene que estar lejos
 *     (30 casillas desde el frente; con 5 se «abandona el campo» antes de recuperarse y todo acaba en
 *     4–6 min), la recuperación es rápida (6 s sin enemigos, a 45 de moral) y la rotura del ejército
 *     exige el 85 % huido durante 30 s (con el 70 % y 15 s acababa en cuanto huía el primer tercio).
 *  3. Contagio y «ver huir al enemigo» a 5 (no a 10): a 10 una huida arrastra a toda la línea.
 *  4. Flanco y retaguardia: el ángulo se mide desde el CENTRO del regimiento golpeado, no desde la
 *     unidad (en la melé las unidades se mezclan y todo parecía flanco). El regimiento parado gira
 *     hacia donde le pegan (60°/s); sin eso la línea nunca se deja flanquear y con giro instantáneo
 *     nunca lo es. Los disparos hacen el daño extra, pero la sangría de moral por flanco es solo del
 *     cuerpo a cuerpo (una flecha por la espalda no desmoraliza como una carga).
 *  5. Inferioridad numérica: solo cuentan los enemigos cuerpo a cuerpo y a 0,5/s. Contando a los
 *     arqueros y a 1,5/s, la caballería que flanquea huía entera (8 de 8 vivos) nada más llegar.
 *  6. Carga: ×2,5 tras 2 s con ímpetu; contra lanceros de frente se anula y cada jinete recibe 50 de
 *     daño (con 12 la carga de frente salía rentable). La carga de frente contra el doble de lanceros
 *     pierde el 70 %; flanquear contra una línea que carga de frente gana el 85 %.
 *  7. General: el aura del juego (×1,2 ataque, +1 armadura) decide ella sola (sin General se pierde el
 *     90–100 %). Con aura ×1,05 / +0,25 y +0,1 de moral por segundo, el bando sin General gana el 35 %,
 *     y perderlo a los 3 min (−30 de moral, techo de 50, órdenes con 4 s de retraso) deja al 35 %.
 *  8. IA mínima: infantería y arqueros en postura defensiva (cohesión; en agresiva la línea se
 *     deshace persiguiendo); la caballería que flanquea espera a que la infantería propia trabe y va
 *     a por la retaguardia de los arqueros (un error de signo la mandaba a su frente); una reserva
 *     de caballería neutraliza el flanqueo (variante g, ~50 %).
 *  9. El lado del campo alterna por semilla: sin eso, el relieve de Arabia daba ventaja a un bando.
 * ---------------------------------------------------------------------------------------------
 */
import { spawn } from 'node:child_process';
import { buildRegistry } from '../src/core/Registry';
import { TICK_DT } from '../src/core/constants';
import type { Pt } from '../src/core/types';
import { Game } from '../src/game/Game';
import type { Entity } from '../src/game/Entity';
import { createGroup, groups, type Group, type GroupMode } from '../src/game/army/groups';
import { hypot } from '../src/game/fmath';
import { ALL_MODS } from '../src/mods';
import type { FormationType } from '../src/game/army/formations';

// ============================================================================================
// Cifras del prototipo (propuesta de BALANCE.battle). Se cambian aquí y se vuelve a correr.
// ============================================================================================
const PROTO = {
  /** Tamaño de regimiento por tipo. */
  regimentSize: { inf: 10, spear: 10, arch: 12, cav: 8, gen: 1 } as Record<Kind, number>,
  /** Moral base por tipo (0–100). */
  moraleBase: { inf: 60, spear: 55, arch: 50, cav: 80, gen: 100 } as Record<Kind, number>,
  morale: {
    /** Puntos de moral perdidos por cada 5 % de efectivos del regimiento que cae. */
    perLoss: 2,
    /** Pérdida por segundo mientras se recibe daño por el flanco / la retaguardia (dura `hitLingers` s tras el último golpe). */
    flankPerSec: 2,
    rearPerSec: 5,
    hitLingers: 1.5,
    /** Golpe de moral al regimiento que recibe una carga (una vez por carga). */
    chargeHit: 10,
    /** Al caer el General: golpe a todos los regimientos propios y techo de moral el resto de la batalla. */
    generalDead: 30,
    generalDeadCap: 50,
    /** Contagio: un vecino propio (a `contagionRadius` casillas) que huye. */
    contagion: 5,
    contagionRadius: 8,
    /** Ver huir a un enemigo (a `sightRadius` casillas). */
    enemyRouts: 5,
    sightRadius: 12,
    /** Inferioridad numérica cercana: enemigos a `nearRadius` ≥ `outnumbered` × propios → −perSec. */
    outnumberedPerSec: 0.5,
    outnumbered: 2,
    nearRadius: 8,
    /** Subidas: General a `auraRadius` del regimiento; lejos del enemigo (> farRadius); en reserva (> reserveRadius). */
    generalPerSec: 0.1,
    auraRadius: 7,
    farPerSec: 2,
    farRadius: 12,
    reservePerSec: 1,
    reserveRadius: 8,
    /** Umbral «vacilante» y su penalización de daño. */
    wavering: 25,
    waveringDamage: 0.85,
    /** Huida: se recupera (a `recoverTo`) tras `recoverAfter` s sin enemigos a `pursuitRadius` y a más de `farRadius` del enemigo. */
    recoverAfter: 6,
    recoverTo: 45,
    pursuitRadius: 6,
    /** Daño extra que reciben los que huyen. */
    routedDamage: 1.2,
  },
  angle: {
    /** Límites del frente y del flanco (grados desde la orientación del regimiento golpeado). */
    frontDeg: 60,
    flankDeg: 120,
    flankMul: 1.3,
    rearMul: 1.6,
    /** Un regimiento parado gira hacia de donde le llegan más golpes (grados por segundo; 0 = no gira). Los golpes recientes pesan `turnMemory` s. */
    turnRate: 60,
    turnMemory: 2,
    /** Peso de un golpe a distancia al decidir hacia dónde girar (los de cuerpo a cuerpo pesan 1). */
    rangedWeight: 0.3,
  },
  charge: {
    /** Segundos avanzando a toda velocidad hacia el enemigo para tener ímpetu. */
    buildUp: 2,
    /** Fracción de la velocidad del grupo que cuenta como «a toda velocidad». */
    speedFraction: 0.8,
    /** Multiplicador del primer golpe de cada jinete al llegar. */
    mul: 2.5,
    /** Segundos tras el primer golpe durante los que los jinetes que llegan aún golpean con ímpetu. */
    lasts: 3,
    /** Contra lanceros de frente: carga anulada y daño de contragolpe a cada jinete que llega. */
    spearCounter: 50,
  },
  ai: {
    /** La IA retira un regimiento por debajo de `retreatBelow` y lo vuelve a mandar por encima de `rejoinAbove`. */
    retreatBelow: 25,
    rejoinAbove: 50,
    /** Casillas hacia su lado a las que se reagrupa. */
    regroupDistance: 12,
    /** Caballería: segundos trabada antes de desengancharse y volver a cargar; casillas a las que se retira. */
    cavEngaged: 8,
    cavPullBack: 9,
    cavRest: 5,
    /** Retardo de las órdenes con el General muerto (s). */
    noGeneralDelay: 4,
    /** Los arqueros se colocan a esta distancia detrás de la infantería. */
    archersBehind: 6,
    thinkEvery: 1,
  },
  end: {
    /** Rotura: fracción del ejército (por efectivos) huyendo o fuera del campo durante `routSeconds` seguidos. */
    routFraction: 0.85,
    routSeconds: 30,
    /** Estancamiento: segundos sin daño alguno para dar la batalla por acabada «por tiempo». */
    stall: 120,
  },
  /** Aura del General (copia del `UnitDef` del mod: no se toca el del juego). El del juego (×1,2 de ataque, +1 de armadura) decide él solo la batalla. */
  generalAura: { attackMul: 1.05, armorAdd: 0.25 },
  /** Despliegue: distancia entre las dos líneas y profundidad del campo (casillas). */
  field: { gap: 26, width: 46, height: 34, edge: 30 },
  combat: {
    /** Factor global del daño en la batalla (1 = el del motor). Ver la calibración: el motor mata un regimiento en ~30 s de contacto. */
    damageMul: 0.16,
    /** Factor para los golpes con bono de clase (lanza contra caballería): se atenúan menos para que el contraataque siga contando. */
    bonusMul: 0.6,
  },
};

type Kind = 'inf' | 'spear' | 'arch' | 'cav' | 'gen';
type Side = 1 | 2;
type CavPlan = 'flank' | 'frontal' | 'reserve';
type Variant = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h';

const VARIANTS: Record<Variant, { name: string; cav: [CavPlan, CavPlan]; general: [boolean, boolean]; spearRegs: [number, number] }> = {
  a: { name: 'Espejo', cav: ['flank', 'flank'], general: [true, true], spearRegs: [1, 1] },
  b: { name: 'Azul carga de frente', cav: ['frontal', 'flank'], general: [true, true], spearRegs: [1, 1] },
  c: { name: 'Azul flanquea, Rojo carga de frente', cav: ['flank', 'frontal'], general: [true, true], spearRegs: [1, 1] },
  d: { name: 'Azul sin General', cav: ['flank', 'flank'], general: [false, true], spearRegs: [1, 1] },
  e: { name: 'Rojo con el doble de lanceros', cav: ['flank', 'flank'], general: [true, true], spearRegs: [1, 2] },
  h: { name: 'Cae el General azul a los 3 min', cav: ['flank', 'flank'], general: [true, true], spearRegs: [1, 1] },
  g: { name: 'Azul flanquea, Rojo guarda la caballería en reserva', cav: ['flank', 'reserve'], general: [true, true], spearRegs: [1, 1] },
  f: { name: 'Azul carga de frente contra el doble de lanceros', cav: ['frontal', 'flank'], general: [true, true], spearRegs: [1, 2] },
};

/** Postura: la infantería y los arqueros no se alejan de su hueco (cohesión); la caballería persigue. */
const stanceFor = (k: Kind) => k === 'cav' ? 'aggressive' : 'defensive';
const UNIT_OF: Record<Kind, string> = { inf: 'longSwordsman', spear: 'pikeman', arch: 'crossbowman', cav: 'knight', gen: 'general' };

// ============================================================================================
// Estado por regimiento
// ============================================================================================
interface Regiment {
  id: number;
  side: Side;
  kind: Kind;
  members: number[];
  initial: number;
  morale: number;
  base: number;
  routed: boolean;
  fled: boolean;
  fledCount: number;
  group?: Group;
  groupAt: number;
  facing: Pt;
  prevPos?: Pt;
  /** De dónde llegan los golpes recientes (vector acumulado con olvido). */
  threat: Pt;
  lastEnemyNear: number;
  flankUntil: number;
  rearUntil: number;
  /** Carga: ímpetu acumulado, en carga, hasta cuándo golpea con ímpetu, quién ya golpeó, a quién ya se le dio el golpe de moral. */
  chargeT: number;
  charging: boolean;
  chargeUntil: number;
  struck: Set<number>;
  chargeHitRegs: Set<number>;
  /** IA. */
  state: 'advance' | 'regroup' | 'pull' | 'rest' | 'reserve';
  stateAt: number;
  target?: Pt;
  routs: number;
  recoveries: number;
  regroups: number;
}

interface SideState {
  id: Side;
  dir: number;
  regs: Regiment[];
  generalDead: boolean;
  hadGeneral: boolean;
  edge: Pt;
  cav: CavPlan;
  queue: { at: number; fn: () => void }[];
  initialUnits: number;
}

interface Result {
  seed: number;
  winner: 0 | 1 | 2;
  end: 'rotura' | 'aniquilación' | 'tiempo';
  minutes: number;
  lost: [number, number];
  fled: [number, number];
  routs: [number, number];
  recoveries: [number, number];
  regroups: [number, number];
  clashes: number;
  generalDead: [boolean, boolean];
}

const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

// ============================================================================================
// La batalla
// ============================================================================================
class Battle {
  game!: Game;
  sides!: [SideState, SideState];
  regs: Regiment[] = [];
  byUnit = new Map<number, Regiment>();
  cx = 0; cy = 0;
  lastDamage = 0;
  lastClash = -999;
  clashes = 0;
  brokenSince: Record<number, number> = {};
  log: string[] = [];
  hits: Record<string, number> = {};
  /** Centroide de cada regimiento este tick (para el ángulo del golpe y las consultas). */
  centroids = new Map<number, Pt>();

  constructor(private variant: Variant, private seed: number, private minutes: number, private verbose: boolean) {}

  async setup() {
    // Registro base + el General del mod Guerra declarada (sin el mod: su regla de paz impediría luchar)
    const withWar = buildRegistry(ALL_MODS);
    const general = withWar.units.get('general')!;
    const mods = ALL_MODS.filter(m => m.id !== 'declared-war' && m.id !== 'regicide');
    const reg = buildRegistry(mods);
    reg.addUnit({ ...general, aura: { ...general.aura!, attackMul: PROTO.generalAura.attackMul, armorAdd: PROTO.generalAura.armorAdd } });
    await reg.mapTypes.get('arabia')?.load?.();
    const game = new Game(reg, {
      mapType: 'arabia', mapSize: 96, startingResources: 'standard', startAge: 2, victory: 'conquest', visibility: 'revealed',
      popLimit: 200, speed: 1, seed: this.seed, mods: mods.map(m => m.id),
      players: [
        { name: 'Azul', civ: 'france', color: '#3b6fe0', human: true, difficulty: 'normal' },
        { name: 'Rojo', civ: 'france', color: '#d63a3a', human: true, difficulty: 'normal' },
      ],
    });
    this.game = game;
    // Sin economía ni IA ni victoria del motor: fuera los sistemas de IA y de victoria, y fuera todo lo que no sea el campo
    game.systems = game.systems.filter((_, i) => !/ai|victory/i.test(game.systemIds[i]));
    for (const e of [...game.list]) if (e.kind !== 'resource') game.remove(e);
    game.update(0); // purga
    this.findField();
    this.deploy();
    game.events.on('damaged', ev => this.onDamaged(ev.target, ev.attacker, ev.amount));
    game.events.on('entityDied', ev => this.onDied(ev.entity));
  }

  /** Busca el rectángulo más llano y caminable del mapa para el campo, y lo limpia de árboles y minas. */
  private findField() {
    const m = this.game.map, F = PROTO.field;
    let best: { x: number; y: number; score: number } | null = null;
    for (let cy = F.height / 2 + 2; cy <= m.h - F.height / 2 - 2; cy += 2) {
      for (let cx = F.width / 2 + 2; cx <= m.w - F.width / 2 - 2; cx += 2) {
        let walk = 0, n = 0, hmin = Infinity, hmax = -Infinity;
        for (let y = cy - F.height / 2; y < cy + F.height / 2; y++) for (let x = cx - F.width / 2; x < cx + F.width / 2; x++) {
          n++;
          if (m.walkable(x, y)) walk++;
          const h = m.heightAt(x + 0.5, y + 0.5);
          hmin = Math.min(hmin, h); hmax = Math.max(hmax, h);
        }
        const score = walk / n - (hmax - hmin) * 0.1 - (hypot(cx - m.w / 2, cy - m.h / 2) / m.w) * 0.05;
        if (!best || score > best.score) best = { x: cx, y: cy, score };
      }
    }
    this.cx = best!.x; this.cy = best!.y;
    for (const e of [...this.game.nodes]) {
      if (Math.abs(e.x - this.cx) < F.width / 2 + 3 && Math.abs(e.y - this.cy) < F.height / 2 + 3) this.game.remove(e);
    }
    this.game.update(0);
  }

  private deploy() {
    const V = VARIANTS[this.variant], F = PROTO.field;
    this.sides = [1, 2].map(i => {
      const side = i as Side, dir = (side === 1) === (this.seed % 2 === 1) ? 1 : -1; // el lado del campo alterna por semilla: sin sesgo de terreno
      const edgeX = this.cx - dir * (F.width / 2 + F.edge);
      const s: SideState = {
        id: side, dir, regs: [], generalDead: false, hadGeneral: V.general[side - 1],
        edge: this.game.findFreeTile(edgeX, this.cy, 10) ?? { x: edgeX, y: this.cy },
        cav: V.cav[side - 1], queue: [], initialUnits: 0,
      };
      const lineX = this.cx - dir * F.gap / 2;
      const spearRegs = V.spearRegs[side - 1];
      // Infantería: 4 regimientos en línea; los lanceros en el centro
      const infKinds: Kind[] = spearRegs >= 2 ? ['inf', 'spear', 'spear', 'inf'] : ['inf', 'spear', 'inf', 'inf'];
      infKinds.forEach((k, j) => this.makeRegiment(s, k, lineX, this.cy + (j - 1.5) * 6));
      // Arqueros detrás
      this.makeRegiment(s, 'arch', lineX - dir * 5, this.cy - 4);
      this.makeRegiment(s, 'arch', lineX - dir * 5, this.cy + 4);
      // Caballería en los flancos
      this.makeRegiment(s, 'cav', lineX - dir * 3, this.cy - 15);
      this.makeRegiment(s, 'cav', lineX - dir * 3, this.cy + 15);
      if (s.hadGeneral) this.makeRegiment(s, 'gen', lineX - dir * 8, this.cy);
      s.initialUnits = s.regs.reduce((a, r) => a + r.initial, 0);
      return s;
    }) as [SideState, SideState];
  }

  private makeRegiment(s: SideState, kind: Kind, x: number, y: number) {
    const n = PROTO.regimentSize[kind];
    const units: Entity[] = [];
    const cols = kind === 'cav' ? 4 : 5;
    for (let i = 0; i < n; i++) {
      const px = x - s.dir * Math.floor(i / cols) * 0.9, py = y + ((i % cols) - (Math.min(cols, n) - 1) / 2) * 0.9;
      const p = this.game.findFreeTile(px, py, 6) ?? { x: px, y: py };
      const u = this.game.spawnUnit(UNIT_OF[kind], s.id, p.x, p.y);
      u.stance = stanceFor(kind);
      units.push(u);
    }
    const r: Regiment = {
      id: this.regs.length + 1, side: s.id, kind, members: units.map(u => u.id), initial: n,
      morale: PROTO.moraleBase[kind], base: PROTO.moraleBase[kind], routed: false, fled: false, fledCount: 0,
      groupAt: -99, facing: { x: s.dir, y: 0 }, threat: { x: 0, y: 0 }, lastEnemyNear: -99, flankUntil: 0, rearUntil: 0,
      chargeT: 0, charging: false, chargeUntil: 0, struck: new Set(), chargeHitRegs: new Set(),
      state: kind === 'cav' && s.cav === 'reserve' ? 'reserve' : 'advance', stateAt: 0, routs: 0, recoveries: 0, regroups: 0,
    };
    this.regs.push(r);
    s.regs.push(r);
    for (const u of units) this.byUnit.set(u.id, r);
    this.hold(r, { x, y }, { x: s.dir, y: 0 }, 4);
  }

  // ------------------------------------------------------------------ consultas
  alive(r: Regiment): Entity[] {
    const out: Entity[] = [];
    for (const id of r.members) { const u = this.game.get(id); if (u) out.push(u); }
    return out;
  }
  centroid(r: Regiment): Pt | null {
    const us = this.alive(r);
    if (!us.length) return null;
    return { x: us.reduce((a, u) => a + u.x, 0) / us.length, y: us.reduce((a, u) => a + u.y, 0) / us.length };
  }
  enemies(side: Side): Entity[] {
    return this.game.units.filter(u => !u.dead && u.owner !== side && u.owner !== 0);
  }
  nearestEnemyDist(r: Regiment, c: Pt): number {
    let d = Infinity;
    for (const u of this.enemies(r.side)) d = Math.min(d, hypot(u.x - c.x, u.y - c.y));
    return d;
  }
  /** Regimiento enemigo activo (no huido) más cercano; `prefer` da prioridad a esos tipos. */
  nearestEnemyReg(r: Regiment, c: Pt, prefer?: Kind[]): Regiment | null {
    let best: Regiment | null = null, bd = Infinity;
    const other = this.sides[r.side === 1 ? 1 : 0];
    for (const e of other.regs) {
      if (e.fled || e.routed) continue;
      const ec = this.centroid(e);
      if (!ec) continue;
      let d = hypot(ec.x - c.x, ec.y - c.y);
      if (prefer?.includes(e.kind)) d *= 0.3;
      if (e.state === 'regroup') d *= 2; // los que se reagrupan no son el objetivo preferente (la línea no los persigue)
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }
  generalOf(side: Side): Entity | undefined {
    const r = this.sides[side - 1].regs.find(x => x.kind === 'gen');
    return r ? this.alive(r)[0] : undefined;
  }

  // ------------------------------------------------------------------ órdenes (sobre los grupos del motor)
  private order(r: Regiment, mode: GroupMode, route: Pt[], type: FormationType = 'line', facing?: Pt, zoneRadius?: number) {
    const us = this.alive(r);
    if (!us.length) { r.group = undefined; return; }
    const g = createGroup(this.game, us, { type, mode, route, finalFacing: facing, zoneRadius });
    r.group = g ?? undefined;
    r.groupAt = this.game.time;
    r.target = route[route.length - 1];
  }
  hold(r: Regiment, at: Pt, facing: Pt, radius = 6) { this.order(r, 'zone', [at], r.kind === 'cav' ? 'wedge' : 'line', facing, radius); }
  attackTo(r: Regiment, route: Pt[]) { this.order(r, 'attack', route, r.kind === 'cav' ? 'wedge' : 'line'); }
  moveTo(r: Regiment, at: Pt) { this.order(r, 'move', [at], r.kind === 'cav' ? 'wedge' : 'line'); }
  retreatTo(r: Regiment, at: Pt) { this.order(r, 'retreat', [at], 'loose'); }

  /** Con el General muerto, las órdenes tardan (cadena de mando). */
  issue(s: SideState, fn: () => void) {
    if (s.generalDead) s.queue.push({ at: this.game.time + PROTO.ai.noGeneralDelay, fn });
    else fn();
  }

  // ------------------------------------------------------------------ ganchos de combate
  private onDamaged(t: Entity, a: Entity | undefined, amount: number) {
    this.lastDamage = this.game.time;
    if (this.game.time - this.lastClash > 20) this.clashes++;
    this.lastClash = this.game.time;
    const tr = this.byUnit.get(t.id);
    const ar = a ? this.byUnit.get(a.id) : undefined;
    if (!tr || !a) return;
    const adef = this.game.unitDef(a), tdef = this.game.unitDef(t);
    let mul = (adef.bonus ?? []).some(b => tdef.classes.includes(b.vs)) ? PROTO.combat.bonusMul : PROTO.combat.damageMul;
    // Ángulo entre la orientación del regimiento golpeado y la dirección del golpe, medida desde el
    // centro del regimiento (no desde la unidad: en la melé las unidades se mezclan y cualquier golpe
    // parecería de flanco)
    const tc = this.centroids.get(tr.id) ?? t;
    const dx = a.x - tc.x, dy = a.y - tc.y, d = hypot(dx, dy) || 1;
    const cosA = (dx * tr.facing.x + dy * tr.facing.y) / d;
    const deg = Math.acos(Math.max(-1, Math.min(1, cosA))) * 180 / Math.PI;
    const A = PROTO.angle, now = this.game.time;
    const front = deg <= A.frontDeg;
    const melee = !this.game.unitDef(a).range;
    const w = melee ? 1 : A.rangedWeight;
    tr.threat.x += dx / d * w; tr.threat.y += dy / d * w;
    if (!tr.routed) {
      // El daño extra vale para todo; la sangría de moral, solo cuando es cuerpo a cuerpo (una flecha por la espalda no desmoraliza como una carga)
      if (deg > A.flankDeg) { mul *= A.rearMul; if (melee) tr.rearUntil = now + PROTO.morale.hitLingers; }
      else if (deg > A.frontDeg) { mul *= A.flankMul; if (melee) tr.flankUntil = now + PROTO.morale.hitLingers; }
    } else mul *= PROTO.morale.routedDamage;
    if (ar) {
      if (ar.morale < PROTO.morale.wavering && !ar.routed) mul *= PROTO.morale.waveringDamage;
      // Carga: primer golpe de cada jinete con ímpetu
      if (ar.charging && !ar.struck.has(a.id)) {
        ar.struck.add(a.id);
        if (ar.chargeUntil === Infinity) ar.chargeUntil = now + PROTO.charge.lasts;
        if (tr.kind === 'spear' && !tr.routed && front) {
          // Muro de lanzas: carga anulada y contragolpe
          a.hp -= PROTO.charge.spearCounter;
          if (a.hp <= 0) this.game.kill(a, t);
        } else {
          mul *= PROTO.charge.mul;
          if (!ar.chargeHitRegs.has(tr.id)) { ar.chargeHitRegs.add(tr.id); tr.morale -= PROTO.morale.chargeHit; }
        }
      }
    }
    if (this.verbose) { const k = `${this.name(tr.side)} ${tr.kind} por ${ar?.kind ?? '?'} ${deg > A.flankDeg ? 'retaguardia' : deg > A.frontDeg ? 'flanco' : 'frente'}`; this.hits[k] = (this.hits[k] ?? 0) + 1; }
    if (mul !== 1 && !t.dead) {
      t.hp -= amount * (mul - 1);
      if (t.hp <= 0) this.game.kill(t, a);
    }
  }

  private onDied(e: Entity) {
    const r = this.byUnit.get(e.id);
    if (!r) return;
    r.morale -= (100 / r.initial) / 5 * PROTO.morale.perLoss;
    if (r.kind === 'gen') {
      const s = this.sides[r.side - 1];
      s.generalDead = true;
      for (const x of s.regs) x.morale -= PROTO.morale.generalDead;
      this.note(`cae el General de ${this.name(r.side)}`);
    }
  }

  name(side: Side) { return side === 1 ? 'Azul' : 'Rojo'; }
  note(t: string) { if (this.verbose) this.log.push(`[${fmt(this.game.time)}] ${t}`); }

  // ------------------------------------------------------------------ moral por tick
  private moraleTick(dt: number) {
    const M = PROTO.morale, now = this.game.time;
    for (const r of this.regs) {
      if (r.fled) continue;
      const c = this.centroid(r);
      if (!c) continue;
      const s = this.sides[r.side - 1];
      // Orientación: la de la marcha mientras el grupo se mueve; parado, gira hacia de donde le pegan
      if (r.group && !groups(this.game).includes(r.group)) r.group = undefined;
      const moving = !!r.group && r.group.arrivedAt === undefined && !r.group.foes.length && r.group.mode !== 'zone';
      const decay = Math.exp(-dt / PROTO.angle.turnMemory);
      r.threat.x *= decay; r.threat.y *= decay;
      if (moving) r.facing = r.group!.facing;
      else if (!r.routed && PROTO.angle.turnRate > 0 && hypot(r.threat.x, r.threat.y) > 0.5) {
        const want = Math.atan2(r.threat.y, r.threat.x), cur = Math.atan2(r.facing.y, r.facing.x);
        let diff = want - cur;
        while (diff > Math.PI) diff -= 2 * Math.PI;
        while (diff < -Math.PI) diff += 2 * Math.PI;
        const step = Math.max(-1, Math.min(1, diff / (PROTO.angle.turnRate * Math.PI / 180 * dt))) * PROTO.angle.turnRate * Math.PI / 180 * dt;
        const ang = cur + step;
        r.facing = { x: Math.cos(ang), y: Math.sin(ang) };
      }
      const dEnemy = this.nearestEnemyDist(r, c);
      if (dEnemy <= M.pursuitRadius) r.lastEnemyNear = now;
      const cap = s.generalDead ? Math.min(r.base, M.generalDeadCap) : r.base;
      if (!r.routed) {
        if (now < r.rearUntil) r.morale -= M.rearPerSec * dt;
        else if (now < r.flankUntil) r.morale -= M.flankPerSec * dt;
        // Inferioridad numérica cercana
        if (dEnemy <= M.nearRadius) {
          let own = 0, foe = 0;
          for (const u of this.game.units) {
            if (u.dead || u.owner === 0 || hypot(u.x - c.x, u.y - c.y) > M.nearRadius) continue;
            if (u.owner === r.side) own++; else if (!this.game.unitDef(u).range) foe++; // los arqueros enemigos no cuentan como «superioridad»
          }
          if (foe >= M.outnumbered * own) r.morale -= M.outnumberedPerSec * dt;
        }
        const g = this.generalOf(r.side);
        if (g && r.kind !== 'gen' && hypot(g.x - c.x, g.y - c.y) <= M.auraRadius) r.morale = Math.min(cap, r.morale + M.generalPerSec * dt);
        if (dEnemy > M.farRadius) r.morale = Math.min(cap, r.morale + M.farPerSec * dt);
        else if (dEnemy > M.reserveRadius) r.morale = Math.min(cap, r.morale + M.reservePerSec * dt);
        if (r.morale <= 0) this.rout(r, c);
      } else {
        // Huida: ¿llega al borde? ¿se recupera?
        if (hypot(c.x - s.edge.x, c.y - s.edge.y) < 3) {
          r.fled = true; r.fledCount = this.alive(r).length;
          for (const u of this.alive(r)) this.game.remove(u);
          this.note(`${this.label(r)} abandona el campo`);
          continue;
        }
        if (now - r.lastEnemyNear >= M.recoverAfter && dEnemy > M.farRadius) {
          r.routed = false; r.morale = Math.min(cap, M.recoverTo); r.recoveries++;
          for (const u of this.alive(r)) u.stance = stanceFor(r.kind);
          r.state = 'regroup'; r.stateAt = now;
          this.hold(r, c, { x: s.dir, y: 0 });
          this.note(`${this.label(r)} se recupera`);
        }
      }
      r.morale = Math.max(0, Math.min(100, r.morale));
    }
  }

  label(r: Regiment) { return `${this.name(r.side)} ${r.kind}#${r.id}`; }

  private rout(r: Regiment, c: Pt) {
    const M = PROTO.morale, s = this.sides[r.side - 1];
    r.routed = true; r.morale = 0; r.routs++; r.lastEnemyNear = this.game.time;
    r.charging = false; r.chargeT = 0;
    for (const u of this.alive(r)) u.stance = 'passive';
    this.retreatTo(r, s.edge);
    this.note(`${this.label(r)} huye (${this.alive(r).length} de ${r.initial})`);
    // Contagio a los vecinos propios; ánimo a los enemigos que lo ven
    for (const o of this.regs) {
      if (o === r || o.fled || o.routed) continue;
      const oc = this.centroid(o);
      if (!oc) continue;
      const d = hypot(oc.x - c.x, oc.y - c.y);
      if (o.side === r.side && d <= M.contagionRadius) o.morale -= M.contagion;
      if (o.side !== r.side && d <= M.sightRadius) o.morale = Math.min(o.base, o.morale + M.enemyRouts);
    }
  }

  // ------------------------------------------------------------------ carga (ímpetu)
  private chargeTick(dt: number) {
    const C = PROTO.charge, now = this.game.time;
    for (const r of this.regs) {
      if (r.kind !== 'cav' && r.kind !== 'gen') continue;
      if (r.fled || r.routed) { r.chargeT = 0; r.charging = false; continue; }
      const g = r.group;
      const c = this.centroid(r);
      if (!g || !c) { r.prevPos = undefined; r.chargeT = 0; continue; }
      const pos = g.pos;
      if (r.prevPos && (g.mode === 'attack' || g.mode === 'move')) {
        const vx = (pos.x - r.prevPos.x) / dt, vy = (pos.y - r.prevPos.y) / dt, v = hypot(vx, vy);
        // Ímpetu: avanza a toda velocidad hacia algún regimiento enemigo a menos de 14 casillas (el que mejor alineado esté)
        let dot = -1;
        for (const e of this.sides[r.side === 1 ? 1 : 0].regs) {
          if (e.fled || e.routed) continue;
          const ec = this.centroids.get(e.id);
          if (!ec) continue;
          const dx = ec.x - c.x, dy = ec.y - c.y, d = hypot(dx, dy) || 1;
          if (d > 14) continue;
          dot = Math.max(dot, (vx * dx + vy * dy) / (d * (v || 1)));
        }
        if (v >= C.speedFraction * g.speed && dot >= 0.6) r.chargeT += dt; else r.chargeT = Math.max(0, r.chargeT - dt * 2);
        if (!r.charging && r.chargeT >= C.buildUp) { r.charging = true; r.chargeUntil = Infinity; r.struck.clear(); r.chargeHitRegs.clear(); }
      }
      r.prevPos = { x: pos.x, y: pos.y };
      if (r.charging && now > r.chargeUntil) { r.charging = false; r.chargeT = 0; }
      if (r.charging && r.chargeUntil === Infinity && r.chargeT === 0) { r.charging = false; } // paró sin golpear
    }
  }

  // ------------------------------------------------------------------ IA mínima
  private think(s: SideState) {
    const now = this.game.time, AI = PROTO.ai;
    const inf = s.regs.filter(r => (r.kind === 'inf' || r.kind === 'spear') && !r.fled && !r.routed && r.state === 'advance');
    const infPts = inf.map(r => this.centroid(r)).filter((p): p is Pt => !!p);
    const front = infPts.length ? { x: infPts.reduce((a, p) => a + p.x, 0) / infPts.length, y: infPts.reduce((a, p) => a + p.y, 0) / infPts.length } : null;
    for (const r of s.regs) {
      if (r.fled) continue;
      const c = this.centroid(r);
      if (!c) continue;
      if (r.routed) {
        if (!r.group) this.retreatTo(r, s.edge); // el grupo se deshizo (rezagados): otra vez al borde
        continue;
      }
      // Retirar con la moral baja; volver por encima de rejoinAbove
      if (r.state !== 'regroup' && r.morale < AI.retreatBelow) {
        r.state = 'regroup'; r.stateAt = now; r.regroups++;
        const back = { x: c.x - s.dir * AI.regroupDistance, y: c.y };
        this.issue(s, () => this.retreatTo(r, this.game.findFreeTile(back.x, back.y, 6) ?? back));
        this.note(`${this.label(r)} se reagrupa (moral ${r.morale.toFixed(0)})`);
        continue;
      }
      if (r.state === 'regroup') {
        if (r.morale >= AI.rejoinAbove) { r.state = r.kind === 'cav' && s.cav === 'reserve' ? 'reserve' : 'advance'; r.stateAt = now; r.groupAt = -99; }
        else { if (!r.group) this.hold(r, c, { x: s.dir, y: 0 }); continue; }
      }
      const fighting = !!r.group && r.group.foes.length > 0;
      switch (r.kind) {
        case 'inf': case 'spear': {
          const e = this.nearestEnemyReg(r, c);
          const ec = e ? this.centroid(e) : null;
          if (!ec) { if (!r.group) this.hold(r, c, { x: s.dir, y: 0 }); break; }
          const stale = !r.group || (!fighting && now - r.groupAt > 4 && (!r.target || hypot(r.target.x - ec.x, r.target.y - ec.y) > 5));
          if (stale) this.issue(s, () => this.attackTo(r, [ec]));
          break;
        }
        case 'arch': {
          const e = this.nearestEnemyReg(r, c);
          const ec = e ? this.centroid(e) : null;
          const dEnemy = this.nearestEnemyDist(r, c);
          // Enemigo encima: atrás
          if (dEnemy < 2.5 && now - r.groupAt > 3) {
            const back = { x: c.x - s.dir * 7, y: c.y };
            this.issue(s, () => this.moveTo(r, this.game.findFreeTile(back.x, back.y, 6) ?? back));
            break;
          }
          let goal: Pt;
          if (front && ec) goal = { x: front.x - s.dir * AI.archersBehind, y: c.y + (front.y - c.y) * 0.5 };
          else if (ec) goal = { x: ec.x - s.dir * 4, y: ec.y };
          else { if (!r.group) this.hold(r, c, { x: s.dir, y: 0 }); break; }
          const stale = !r.group || (!fighting && now - r.groupAt > 4 && (!r.target || hypot(r.target.x - goal.x, r.target.y - goal.y) > 3));
          if (stale) this.issue(s, () => this.attackTo(r, [this.game.findFreeTile(goal.x, goal.y, 6) ?? goal]));
          break;
        }
        case 'cav': this.thinkCav(s, r, c, fighting, front); break;
        case 'gen': {
          const dEnemy = this.nearestEnemyDist(r, c);
          let goal = front ? { x: front.x - s.dir * 4, y: front.y } : c;
          if (dEnemy < 6) goal = { x: goal.x - s.dir * 8, y: goal.y }; // ponerse a salvo
          if (!r.group || (now - r.groupAt > 3 && (!r.target || hypot(r.target.x - goal.x, r.target.y - goal.y) > 2))) {
            this.hold(r, this.game.findFreeTile(goal.x, goal.y, 6) ?? goal, { x: s.dir, y: 0 }, 3);
          }
          break;
        }
      }
    }
  }

  private thinkCav(s: SideState, r: Regiment, c: Pt, fighting: boolean, front: Pt | null) {
    const now = this.game.time, AI = PROTO.ai, F = PROTO.field;
    const flankY = r.id % 2 ? this.cy - F.height / 2 + 2 : this.cy + F.height / 2 - 2;
    if (r.state === 'reserve') {
      // Guardar la caballería: junto a los arqueros propios, defiende lo que se acerque
      const goal = front ? { x: front.x - s.dir * (AI.archersBehind + 3), y: c.y } : c;
      if (!r.group || (now - r.groupAt > 4 && !fighting && (!r.target || hypot(r.target.x - goal.x, r.target.y - goal.y) > 3))) {
        this.hold(r, this.game.findFreeTile(goal.x, goal.y, 6) ?? goal, { x: s.dir, y: 0 }, 10);
      }
      return;
    }
    if (r.state === 'pull') {
      if (now - r.stateAt > AI.cavRest || !r.group) { r.state = 'advance'; r.stateAt = now; r.groupAt = -99; }
      else return;
    }
    // Trabada demasiado tiempo: desengancharse para volver a cargar
    if (fighting && now - r.stateAt > AI.cavEngaged) {
      r.state = 'pull'; r.stateAt = now;
      const away = s.cav === 'frontal' ? { x: c.x - s.dir * AI.cavPullBack, y: c.y } : { x: c.x, y: c.y + (c.y < this.cy ? -1 : 1) * AI.cavPullBack };
      this.issue(s, () => this.moveTo(r, this.game.findFreeTile(away.x, away.y, 6) ?? away));
      return;
    }
    if (fighting) return;
    // Flanquear solo cuando la infantería propia ya ha trabado (si no, la caballería llega sola y se la come la línea entera)
    if (s.cav === 'flank') {
      const engaged = s.regs.some(x => (x.kind === 'inf' || x.kind === 'spear') && !x.fled && !x.routed && !!x.group && x.group.foes.length > 0);
      if (!engaged) { if (!r.group || r.group.mode !== 'zone') this.hold(r, c, { x: s.dir, y: 0 }, 4); return; }
    }
    if (!r.group || now - r.groupAt > 5 || r.group.mode === 'zone') {
      let e: Regiment | null, route: Pt[];
      if (s.cav === 'frontal') {
        e = this.nearestEnemyReg(r, c, ['spear']); // la carga de frente va a por la línea de lanzas
        const ec = e ? this.centroid(e) : null;
        if (!ec) return;
        route = [ec];
      } else {
        // Flanquear: por fuera hasta la altura del enemigo y luego a su retaguardia (arqueros, General)
        e = this.nearestEnemyReg(r, c, ['arch']);
        const ec = e ? this.centroid(e) : null;
        if (!ec) return;
        const wide = Math.abs(c.y - flankY) > 3 && Math.abs(c.x - ec.x) > 6;
        const behind = { x: ec.x + s.dir * 4, y: ec.y }; // detrás de ellos: el enemigo mira hacia -dir
        route = wide ? [this.game.findFreeTile(c.x, flankY, 6) ?? { x: c.x, y: flankY }, this.game.findFreeTile(ec.x + s.dir * 4, flankY, 6) ?? { x: ec.x, y: flankY }, behind] : [behind];
      }
      r.stateAt = now;
      this.issue(s, () => this.attackTo(r, route));
    }
  }

  // ------------------------------------------------------------------ fin de la batalla
  private strength(s: SideState) {
    let active = 0, routed = 0, fled = 0;
    for (const r of s.regs) {
      if (r.fled) { fled += r.fledCount; continue; }
      const n = this.alive(r).length;
      if (r.routed) routed += n; else active += n;
    }
    return { active, routed, fled, total: active + routed + fled };
  }

  private checkEnd(): Result | null {
    const now = this.game.time;
    const st = this.sides.map(s => this.strength(s));
    const broken = st.map((x, i) => {
      const frac = x.total ? (x.routed + x.fled) / x.total : 1;
      const isBroken = frac >= PROTO.end.routFraction || x.active === 0;
      if (isBroken) this.brokenSince[i] ??= now; else delete this.brokenSince[i];
      return isBroken && now - this.brokenSince[i] >= PROTO.end.routSeconds;
    });
    const annihilated = st.map(x => x.active + x.routed === 0);
    let winner: 0 | 1 | 2 | null = null, end: Result['end'] | null = null;
    if (annihilated[0] || annihilated[1]) { end = 'aniquilación'; winner = annihilated[0] && annihilated[1] ? 0 : annihilated[0] ? 2 : 1; }
    else if (broken[0] || broken[1]) { end = 'rotura'; winner = broken[0] && broken[1] ? (st[0].active > st[1].active ? 1 : st[1].active > st[0].active ? 2 : 0) : broken[0] ? 2 : 1; }
    else if (now >= this.minutes * 60 || now - this.lastDamage > PROTO.end.stall) {
      end = 'tiempo';
      winner = st[0].active > st[1].active ? 1 : st[1].active > st[0].active ? 2 : 0;
    }
    if (end === null || winner === null) return null;
    const sum = (f: (r: Regiment) => number) => this.sides.map(s => s.regs.reduce((a, r) => a + f(r), 0)) as [number, number];
    return {
      seed: this.seed, winner, end, minutes: now / 60,
      lost: this.sides.map((s, i) => s.initialUnits - st[i].total) as [number, number],
      fled: [st[0].fled, st[1].fled], routs: sum(r => r.routs), recoveries: sum(r => r.recoveries), regroups: sum(r => r.regroups),
      clashes: this.clashes, generalDead: [this.sides[0].generalDead, this.sides[1].generalDead],
    };
  }

  run(): Result {
    const g = this.game;
    let nextThink = 0, nextReport = 60;
    while (true) {
      g.update(TICK_DT);
      this.centroids.clear();
      for (const r of this.regs) { const c = this.centroid(r); if (c) this.centroids.set(r.id, c); }
      this.moraleTick(TICK_DT);
      if (this.variant === 'h' && g.time >= 180 && !this.sides[0].generalDead) { const gen = this.generalOf(1); if (gen) g.kill(gen); else this.sides[0].generalDead = true; }
      this.chargeTick(TICK_DT);
      for (const s of this.sides) {
        while (s.queue.length && s.queue[0].at <= g.time) s.queue.shift()!.fn();
      }
      if (g.time >= nextThink) {
        nextThink = g.time + PROTO.ai.thinkEvery;
        for (const s of this.sides) this.think(s);
        const r = this.checkEnd();
        if (r) return r;
      }
      if (this.verbose && g.time >= nextReport) {
        nextReport += 60;
        const line = this.sides.map(s => `${this.name(s.id)}: ${s.regs.filter(r => !r.fled).map(r => `${r.kind[0]}${this.alive(r).length}${r.routed ? '!' : ''}${r.state === 'regroup' ? '~' : ''}${Math.round(r.morale)}${r.kind === 'cav' ? `@${Math.round(this.centroids.get(r.id)?.x ?? 0)},${Math.round(this.centroids.get(r.id)?.y ?? 0)}${r.state[0]}${r.charging ? '*' : ''}` : ''}`).join(' ')}`).join(' | ');
        this.log.push(`[${fmt(g.time)}] ${line}`);
      }
    }
  }
}

// ============================================================================================
// Ejecución: tabla por variante, variantes en paralelo
// ============================================================================================
const argv = process.argv.slice(2);
const argOf = (k: string, def: string) => argv.find(a => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? def;
const nSeeds = Number(argOf('seeds', '20'));
const minutes = Number(argOf('minutes', '25'));
const variants = argOf('variants', 'a,b,c,d,e,f,g,h').split(',') as Variant[];
const jobs = Number(argOf('jobs', '8'));
const verbose = argv.includes('--verbose');
const childVariant = argOf('child', '') as Variant | '';
// --set=morale.perLoss=1 --set=charge.mul=3 ...: cambia cifras de PROTO sin editar (para calibrar)
const sets = argv.filter(a => a.startsWith('--set=')).map(a => a.slice(6));
for (const kv of sets) {
  const [path, val] = kv.split('=');
  const keys = path.split('.');
  let o: any = PROTO;
  for (const k of keys.slice(0, -1)) o = o[k];
  o[keys[keys.length - 1]] = Number(val);
}

async function runVariant(v: Variant): Promise<Result[]> {
  const out: Result[] = [];
  for (let seed = 1; seed <= nSeeds; seed++) {
    const b = new Battle(v, seed, minutes, verbose);
    await b.setup();
    const r = b.run();
    if (verbose) { console.error(b.log.join('\n')); console.error(`-- ${v} semilla ${seed}: ${r.end}, gana ${r.winner}, ${fmt(r.minutes * 60)}`); }
    out.push(r);
  }
  return out;
}

function table(v: Variant, rs: Result[]) {
  const V = VARIANTS[v];
  const n = rs.length, pct = (k: number) => `${Math.round(100 * k / n)} %`;
  const wins = [0, 1, 2].map(w => rs.filter(r => r.winner === w).length);
  const ends = ['rotura', 'aniquilación', 'tiempo'].map(e => rs.filter(r => r.end === e).length);
  const mean = (f: (r: Result) => number) => rs.reduce((a, r) => a + f(r), 0) / n;
  const mins = rs.map(r => r.minutes);
  const inRange = rs.filter(r => r.minutes >= 10 && r.minutes <= 20).length;
  const lines = [
    `\n=== Variante ${v}: ${V.name} (${n} semillas, tope ${minutes} min) ===`,
    `Gana: Azul ${wins[1]} (${pct(wins[1])}) · Rojo ${wins[2]} (${pct(wins[2])}) · empate ${wins[0]}`,
    `Final: rotura ${ends[0]} (${pct(ends[0])}) · aniquilación ${ends[1]} (${pct(ends[1])}) · tiempo ${ends[2]} (${pct(ends[2])})`,
    `Duración: media ${mean(r => r.minutes).toFixed(1)} min · mín ${Math.min(...mins).toFixed(1)} · máx ${Math.max(...mins).toFixed(1)} · entre 10 y 20 min: ${inRange} (${pct(inRange)})`,
    `Bajas (muertos) por bando: Azul ${mean(r => r.lost[0]).toFixed(1)} · Rojo ${mean(r => r.lost[1]).toFixed(1)}  |  huidos del campo: Azul ${mean(r => r.fled[0]).toFixed(1)} · Rojo ${mean(r => r.fled[1]).toFixed(1)}`,
    `Huidas / recuperaciones / reagrupamientos (regimientos): Azul ${mean(r => r.routs[0]).toFixed(1)} / ${mean(r => r.recoveries[0]).toFixed(1)} / ${mean(r => r.regroups[0]).toFixed(1)} · Rojo ${mean(r => r.routs[1]).toFixed(1)} / ${mean(r => r.recoveries[1]).toFixed(1)} / ${mean(r => r.regroups[1]).toFixed(1)}`,
    `Choques (fases con > 20 s de calma entre medias): media ${mean(r => r.clashes).toFixed(1)} · General caído: Azul ${rs.filter(r => r.generalDead[0]).length}, Rojo ${rs.filter(r => r.generalDead[1]).length}`,
    `| semilla | gana | final | min | bajas A/R | huidos A/R | huidas A/R | recup. A/R | choques |`,
    `| --- | --- | --- | --- | --- | --- | --- | --- | --- |`,
    ...rs.map(r => `| ${r.seed} | ${['empate', 'Azul', 'Rojo'][r.winner]} | ${r.end} | ${r.minutes.toFixed(1)} | ${r.lost[0]}/${r.lost[1]} | ${r.fled[0]}/${r.fled[1]} | ${r.routs[0]}/${r.routs[1]} | ${r.recoveries[0]}/${r.recoveries[1]} | ${r.clashes} |`),
  ];
  return lines.join('\n');
}

if (childVariant) {
  // Proceso hijo: una variante, resultados en JSON por la salida estándar
  const rs = await runVariant(childVariant);
  process.stdout.write(JSON.stringify(rs));
} else {
  const t0 = Date.now();
  const results = new Map<Variant, Result[]>();
  if (jobs <= 1) {
    for (const v of variants) results.set(v, await runVariant(v));
  } else {
    const pending = [...variants];
    const workers = Array.from({ length: Math.min(jobs, variants.length) }, async () => {
      while (pending.length) {
        const v = pending.shift()!;
        const rs = await new Promise<Result[]>((resolve, reject) => {
          const args = [process.argv[1], `--child=${v}`, `--seeds=${nSeeds}`, `--minutes=${minutes}`, ...sets.map(x => `--set=${x}`), ...(verbose ? ['--verbose'] : [])];
          const p = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'inherit'] });
          let buf = '';
          p.stdout.on('data', d => { buf += d; });
          p.on('close', code => code === 0 ? resolve(JSON.parse(buf)) : reject(new Error(`variante ${v}: código ${code}`)));
        });
        results.set(v, rs);
        console.log(`Variante ${v} terminada (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
      }
    });
    await Promise.all(workers);
  }
  for (const v of variants) console.log(table(v, results.get(v)!));
  console.log(`\nTotal: ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
