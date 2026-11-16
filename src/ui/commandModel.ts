import type { AnyDef, TechDef } from '../core/types';
import { ids } from '../game/net/netCommands';
import { groupOf } from '../game/army/groups';
import type { Entity } from '../game/Entity';
import type { Game } from '../game/Game';
import {
  buildablesFor, buildingAvail, costText, exploreAvail, missingText, researchablesAt, techAvail, trainablesAt, unitAvail, type Avail,
} from '../game/rules';
import type { Session } from '../app/Session';
import { portrait } from '../render/icons';
import { playerPowers, powerAvail, powerWait } from '../game/powers';
import { ACT_NAMES, spyProblem, spyWait, type SpyAct } from '../game/espionage';
import { isPost, isTrader } from '../game/trade';
import { BALANCE } from '../config/balance';
import { canShelterSomewhere, garrisonOf, nearestShelter } from '../game/garrison';
import { canMountSomewhere, postedOn } from '../game/walkway';
import { canUpgrade, connectedSegments, upgradeCost } from '../game/wallUpgrade';
import { commandState, generalOf, harangueState } from '../mods/battle/orders';
import { regimentOf } from '../mods/battle/state';

/**
 * Qué se puede hacer con la selección actual. Lo comparten la interfaz de escritorio (rejilla de 15 botones)
 * y la móvil (bandeja y hojas con pestañas): cada una lo dibuja a su manera, pero las acciones son las mismas.
 */

export interface Cmd {
  icon: string;
  label: string;
  avail: Avail;
  tip: string;
  badge?: string;
  /** Coste en HTML (iconos y números), para mostrarlo aparte del tooltip. */
  cost?: string;
  action: (shift: boolean) => void;
}

export interface CommandSet {
  /** Unidades propias seleccionadas (si hay alguna, mandan sobre los edificios). */
  units: Entity[];
  /** Edificios propios seleccionados. */
  blds: Entity[];
  /** Menús de construcción (solo si hay constructores): botón de categoría y edificios visibles. */
  build: Record<'economy' | 'military' | 'defense', { cmd: Cmd; items: Cmd[] }> | null;
  attackMove: Cmd | null;
  /** Auto-exploración (unidades con `autoExplore`). */
  explore: Cmd | null;
  stop: Cmd | null;
  /** Refugiarse en el edificio propio más cercano que admita a la unidad (unidades con refugio disponible). */
  shelter: Cmd | null;
  /** Sacar a los refugiados de los edificios seleccionados (y bajar a los del paso de ronda de las murallas). */
  evacuate: Cmd | null;
  /** Subir al paso de ronda de la muralla más cercana (tiradores a pie), o bajar de él si ya están arriba. */
  wall: Cmd | null;
  /** Pantalla de estrategia (formación, postura y órdenes tácticas) para las tropas. */
  strategy: Cmd | null;
  /** Mejorar en el sitio los tramos de defensa seleccionados / toda la línea que se toca con ellos (`game/wallUpgrade.ts`). */
  upgrade: Cmd[];
  /** Unidades que entrenar y tecnologías que investigar en los edificios seleccionados. */
  train: Cmd[];
  research: Cmd[];
  /** Eliminar la selección (o cancelar la construcción de unos cimientos). */
  del: Cmd | null;
  /** Poderes activos de la civilización (no dependen de la selección). */
  powers: Cmd[];
  /** Misiones de las unidades de comercio y espionaje seleccionadas (comerciar, informe, robar, sabotear, sobornar). */
  missions: Cmd[];
  /** Órdenes de la capa táctica (mod battle): correr o caminar, cargar y arengar. */
  battle: Cmd[];
}

export const OK: Avail = { visible: true, ok: true };

export function esc(s: string) {
  return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

/** Retrato (imagen) de una unidad, edificio o recurso, con el color del jugador. */
export function pic(g: Game, kind: 'unit' | 'building' | 'resource', defId: string, owner: number): string {
  const p = g.players[owner];
  return `<img class="pic" alt="" decoding="sync" src="${portrait(g.reg, kind, defId, p?.color ?? '#aaa', p?.age ?? 0)}">`;
}

export function statsLine(g: Game, def: AnyDef): string {
  const p = g.human;
  const parts = [`❤ ${Math.round(p.getStat(def, 'hp'))}`];
  const atk = p.getStat(def, 'attack');
  if (atk) parts.push(`⚔ ${Math.round(atk * 10) / 10}`);
  parts.push(`🛡 ${p.getStat(def, 'armorMelee')}/${p.getStat(def, 'armorPierce')}`);
  const rng = p.getStat(def, 'range');
  if (rng >= 1) parts.push(`🏹 ${rng}`);
  if (def.bonus?.length) parts.push(def.bonus.map(b => `+${b.amount} vs ${b.vs}`).join(', '));
  return parts.join(' · ');
}

export function tipHtml(name: string, cost: string, desc: string, a: Avail, extra = '') {
  return `<b>${esc(name)}</b>${cost ? ` <span class="cost">${cost}</span>` : ''}<br>${esc(desc)}${extra ? `<br><span class="stats">${extra}</span>` : ''}${!a.ok && a.reason ? `<br><span class="bad">${esc(a.reason)}</span>` : ''}`;
}

/** Texto de la tarea actual de una unidad. */
export function taskText(g: Game, e: Entity): string {
  const o = e.order;
  if (!o) return 'Inactivo';
  switch (o.type) {
    case 'gather': {
      const t = g.get(o.targetId);
      const r = g.reg.resources.get(t?.resType ?? o.resType ?? '');
      return o.phase === 'return' ? 'Llevando recursos' : `Recolectando ${(r?.name ?? '').toLowerCase()}`;
    }
    case 'build': {
      const t = g.get(o.targetId);
      return t?.complete ? 'Reparando' : 'Construyendo';
    }
    case 'attack': return 'Atacando';
    case 'attackMove': return 'Ataque-movimiento';
    case 'explore': return 'Explorando';
    case 'formation': {
      const grp = groupOf(g, e);
      const mode: Record<string, string> = {
        move: 'En formación', attack: 'Avanzando al ataque', patrol: 'Patrullando', retreat: 'En retirada', escort: 'Escoltando', zone: 'Defendiendo la zona',
      };
      return `${mode[grp?.mode ?? 'move']}${o.target ? ' · luchando' : ''}`;
    }
    case 'move': return 'Moviéndose';
    default: return o.type;
  }
}

/** Poderes activos de la civilización del jugador humano, con su enfriamiento. */
export function powerCommands(s: Session): Cmd[] {
  const g = s.game, p = g.human, ui = s.ui;
  return playerPowers(g, p).map(d => {
    const a = powerAvail(g, p, d.id), wait = powerWait(g, p, d.id);
    const cost = d.cost ? costText(g, d.cost) : '';
    return {
      icon: d.icon, label: d.name, avail: a, cost, badge: wait > 0 ? String(wait) : undefined,
      tip: tipHtml(d.name, cost, d.description, a, `⏳ Enfriamiento ${Math.round(d.cooldown / 60 * 10) / 10} min`),
      action: () => {
        const av = powerAvail(g, p, d.id);
        if (!av.ok) { g.rejectAvail(p.id, av); return; }
        if (d.target !== 'point') { s.orders.send({ t: 'mod', id: 'power', args: { id: d.id } }); return; }
        g.notify(`${d.icon} ${d.name}: toca el mapa donde quieres usarlo`, p.id, 'info');
        ui.pickPoint = { owner: 'power', onPick: pt => { ui.pickPoint = null; s.orders.send({ t: 'mod', id: 'power', args: { id: d.id, x: pt.x, y: pt.y } }); } };
      },
    } as Cmd;
  });
}

/** Entidad bajo un punto del mundo que cumpla el filtro (edificio que lo contiene, o unidad a menos de 1 casilla). */
function entityAt(g: Game, pt: { x: number; y: number }, ok: (e: Entity) => boolean): Entity | null {
  for (const b of g.buildings) if (!b.dead && ok(b) && pt.x >= b.tx && pt.x < b.tx + b.size && pt.y >= b.ty && pt.y < b.ty + b.size) return b;
  let best: Entity | null = null, bd = 1;
  for (const u of g.units) {
    if (u.dead || u.inside || !ok(u)) continue;
    const d = Math.hypot(u.x - pt.x, u.y - pt.y);
    if (d < bd) { bd = d; best = u; }
  }
  return best;
}

const SPY_ICON: Record<SpyAct, string> = { intel: '📋', steal: '📜', sabotage: '🔥', bribe: '💰' };
const SPY_TIP: Record<SpyAct, string> = {
  intel: 'Entra en un edificio enemigo: informe de su ejército, aldeanos y recursos, y deja ver la zona un rato.',
  steal: 'Copia la tecnología más cara que el enemigo tenga y tú no (de tu edad o menor), pagando una parte. Enfriamiento largo.',
  sabotage: 'Daña un edificio enemigo y retrasa lo que fabrica.',
  bribe: 'Soborna a una unidad enemiga: se convierte en agente doble y su dueño real ve lo que ella ve. Si pasa junto a su vigilancia, la descubren.',
};

/** Misiones de caravanas (comerciar) y espías (informe, robo, sabotaje, soborno). */
function missionCommands(s: Session, units: Entity[]): Cmd[] {
  const g = s.game, p = g.human, ui = s.ui, out: Cmd[] = [];
  const pick = (owner: string, hint: string, ok: (e: Entity) => boolean, send: (target: Entity) => void) => {
    g.notify(hint, p.id, 'info');
    ui.placing = null; ui.targeting = null;
    ui.pickPoint = { owner, onPick: pt => { ui.pickPoint = null; const t = entityAt(g, pt, ok); if (t) send(t); else g.reject(p.id, 'other', 'No hay un objetivo válido ahí'); } };
  };
  const caravans = units.filter(u => isTrader(g, u));
  if (caravans.length) {
    out.push({
      icon: '🐪', label: 'Comerciar', avail: OK,
      tip: '<b>Comerciar</b> (o clic derecho en un mercado)<br>Elige un puesto comercial propio lejano o de alguien que no esté en guerra contigo: la caravana va y viene cobrando oro según la distancia. Más con aliados.',
      action: () => pick('trade', '🐪 Toca el mercado con el que comerciar', e => e.kind === 'building' && isPost(g, e),
        t => s.orders.send({ t: 'mod', id: 'trade', args: { units: ids(caravans), dest: t.id } })),
    });
  }
  const spies = units.filter(u => g.unitDef(u).stealth);
  if (spies.length) {
    const wait = Math.min(...spies.map(u => spyWait(g, u)));
    for (const act of ['intel', 'steal', 'sabotage', 'bribe'] as SpyAct[]) {
      const cost = act === 'bribe' ? costText(g, { gold: BALANCE.espionage.bribeCost }) : '';
      const a: Avail = wait > 0 ? { visible: true, ok: false, reason: `El espía descansa ${wait} s`, code: 'requirement' } : OK;
      out.push({
        icon: SPY_ICON[act], label: ACT_NAMES[act], avail: a, cost, badge: wait > 0 ? String(wait) : undefined,
        tip: tipHtml(ACT_NAMES[act], cost, SPY_TIP[act], a),
        action: () => {
          if (!a.ok) { g.rejectAvail(p.id, a); return; }
          pick(`spy-${act}`, `🕵️ ${ACT_NAMES[act]}: toca ${act === 'bribe' ? 'la unidad enemiga' : 'el edificio enemigo'}`,
            e => !spyProblem(g, p.id, act, e) && (act === 'bribe' ? e.kind === 'unit' : e.kind === 'building'),
            t => s.orders.send({ t: 'mod', id: 'spy', args: { units: ids(spies), act, target: t.id } }));
        },
      });
    }
  }
  return out;
}

/** Órdenes de la capa táctica para los soldados seleccionados: correr, cargar (caballería) y arengar (con General). */
function battleCommands(s: Session, units: Entity[]): Cmd[] {
  const g = s.game, p = g.human, ui = s.ui, out: Cmd[] = [];
  if (!g.reg.netCommands.has('battle')) return out;
  const men = units.filter(u => { const r = regimentOf(g, u); return !!r && !r.routed; });
  if (!men.length) return out;
  const send = (args: Record<string, unknown>) => s.orders.send({ t: 'mod', id: 'battle', args: { ...args, units: ids(men) } });
  const regs = [...new Map(men.map(u => [regimentOf(g, u)!.id, regimentOf(g, u)!])).values()];
  const running = regs.every(r => r.running);
  const tired = Math.max(...regs.map(r => r.fatigue));
  const runA: Avail = !running && tired >= 100 ? { visible: true, ok: false, reason: 'Demasiado cansados para correr', code: 'requirement' } : OK;
  out.push({
    icon: '🏃', label: running ? 'Caminar' : 'Correr', avail: runA, badge: tired > 0 ? `${Math.round(tired)}%` : undefined,
    tip: tipHtml(running ? 'Caminar' : 'Correr', '', `Las tropas corren ×${BALANCE.battle.runMul} de velocidad, pero se cansan: cansadas luchan peor, van más lentas y pierden moral. Descansan caminando o quietas.`, runA, `😓 Cansancio ${Math.round(tired)} %`),
    action: () => { if (!runA.ok) { g.rejectAvail(p.id, runA); return; } send({ op: 'run' }); },
  });
  if (regs.some(r => r.cavalry)) {
    const a: Avail = commandState(g, p.id).ok ? OK : { visible: true, ok: false, reason: commandState(g, p.id).reason, code: 'requirement' };
    out.push({
      icon: '🐎', label: 'Cargar', avail: a,
      tip: tipHtml('Cargar', '', 'Corren hacia un punto del mapa atacando. La caballería que llega a toda velocidad golpea la primera vez con mucha más fuerza; contra lanceros de frente la carga se anula. Cansa.', a),
      action: () => {
        if (!a.ok) { g.rejectAvail(p.id, a); return; }
        g.notify('🐎 Toca el mapa: la carga irá hacia ese punto', p.id, 'info');
        ui.placing = null; ui.targeting = null;
        ui.pickPoint = { owner: 'charge', onPick: pt => { ui.pickPoint = null; send({ op: 'charge', x: pt.x, y: pt.y }); } };
      },
    });
  }
  if (generalOf(g, p.id) || battleHasGeneralTrouble(g, p.id)) {
    const h = harangueState(g, p.id);
    const a: Avail = h.ok ? OK : { visible: true, ok: false, reason: h.reason, code: 'requirement' };
    out.push({
      icon: '📣', label: 'Arengar', avail: a, badge: h.wait ? String(h.wait) : undefined,
      tip: tipHtml('Arengar', '', `El General sube la moral (+${BALANCE.battle.harangue}) de las tropas propias cercanas a él. Enfriamiento ${BALANCE.battle.harangueCooldown} s.`, a),
      action: () => { if (!a.ok) { g.rejectAvail(p.id, a); return; } send({ op: 'harangue' }); },
    });
  }
  return out;
}

/** ¿Ha caído el General de este jugador (para mostrar «Arengar» desactivado en vez de ocultarlo)? */
function battleHasGeneralTrouble(g: Game, pid: number): boolean {
  return !commandState(g, pid).ok;
}

/** «Mejorar» y «Mejorar toda la línea» para los tramos de defensa seleccionados. */
function upgradeCommands(s: Session, blds: Entity[]): Cmd[] {
  const g = s.game, p = g.human, out: Cmd[] = [];
  const costOf = (list: Entity[]) => {
    const total: Record<string, number> = {};
    for (const e of list) for (const [r, v] of Object.entries(upgradeCost(g, p.id, e.defId))) total[r] = (total[r] ?? 0) + (v ?? 0);
    return total;
  };
  const make = (icon: string, label: string, list: Entity[], connected: boolean, text: string): Cmd => {
    const total = costOf(list), cost = costText(g, total);
    const to = g.reg.building(list[0].defId).upgrade!.to;
    const a: Avail = list.some(e => p.canAfford(upgradeCost(g, p.id, e.defId))) ? OK : { visible: true, ok: false, reason: missingText(g, p, total), code: 'resources' };
    return {
      icon, label, avail: a, cost, badge: String(list.length),
      tip: tipHtml(label, cost, `${text}<br>${list.length} tramo${list.length === 1 ? '' : 's'} → ${esc(g.reg.building(to).name)}${list.some(e => g.reg.building(e.defId).upgrade!.to !== to) ? ' y similares' : ''}. Los tramos siguen en pie durante la obra y conservan su salud proporcional; los aldeanos más cercanos la hacen.`, a),
      action: () => {
        if (!a.ok) { g.rejectAvail(p.id, a); return; }
        s.orders.send({ t: 'upgradeWall', ids: ids(blds), connected });
      },
    };
  };
  const mine = blds.filter(b => canUpgrade(g, b));
  if (mine.length) out.push(make('⬆️', 'Mejorar', mine, false, '<b>Mejorar</b><br>Convierte los tramos seleccionados en la defensa de la era actual, en su sitio.'));
  const line = [...new Map(blds.flatMap(b => connectedSegments(g, b)).map(e => [e.id, e])).values()].filter(b => canUpgrade(g, b));
  if (line.length > mine.length) out.push(make('🧱', 'Mejorar línea', line, true, '<b>Mejorar toda la línea</b><br>Mejora todos los tramos de muro que se tocan con la selección.'));
  return out;
}

/** Calcula los comandos disponibles para la selección actual del jugador humano. */
export function selectionCommands(s: Session): CommandSet {
  const g = s.game, p = g.human, ui = s.ui;
  const sel = ui.selected(g).filter(e => e.owner === p.id);
  const units = sel.filter(e => e.kind === 'unit');
  const blds = sel.filter(e => e.kind === 'building');
  const set: CommandSet = { units, blds, build: null, attackMove: null, explore: null, stop: null, shelter: null, evacuate: null, wall: null, strategy: null, upgrade: [], train: [], research: [], del: null, powers: powerCommands(s), missions: [], battle: [] };
  if (!sel.length) return set;
  const del: Cmd = {
    icon: '❌', label: 'Eliminar', avail: OK, tip: '<b>Eliminar</b> (Supr)<br>Destruye la selección.',
    action: () => { s.orders.send({ t: 'delete', ids: ids(sel) }); ui.setSelection([]); },
  };
  set.del = del;

  if (units.length) {
    if (units.some(u => g.unitDef(u).builder)) {
      const list = (cat: 'economy' | 'military' | 'defense') => buildablesFor(g, p, cat).filter(id => buildingAvail(g, p, id).visible).map(id => {
        const def = g.reg.building(id);
        const a = buildingAvail(g, p, id);
        const cost = costText(g, p.getCost(def));
        return {
          icon: pic(g, 'building', id, p.id), label: def.name, avail: a, cost,
          tip: tipHtml(def.name, cost, def.description, a),
          action: () => {
            const av = buildingAvail(g, p, id);
            if (!av.ok) { g.rejectAvail(p.id, av); return; }
            ui.placing = { defId: id, tx: 0, ty: 0, valid: false };
          },
        } as Cmd;
      });
      const eco = g.reg.buildings.has('house') ? pic(g, 'building', 'house', p.id) : '🏠';
      const mil = g.reg.buildings.has('barracks') ? pic(g, 'building', 'barracks', p.id) : '⚔️';
      set.build = {
        economy: { cmd: { icon: eco, label: 'Construir eco', avail: OK, tip: '<b>Construir edificio económico</b>', action: () => { ui.page = 'economy'; } }, items: list('economy') },
        military: { cmd: { icon: mil, label: 'Construir mil', avail: OK, tip: '<b>Construir edificio militar</b>', action: () => { ui.page = 'military'; } }, items: list('military') },
        defense: { cmd: { icon: g.reg.buildings.has('stoneWall') ? pic(g, 'building', 'stoneWall', p.id) : '🧱', label: 'Construir defensas', avail: OK, tip: '<b>Construir defensas</b><br>Empalizadas, murallas, puertas, zanjas y torres de muralla. Las líneas se trazan arrastrando.', action: () => { ui.page = 'defense'; } }, items: list('defense') },
      };
    }
    if (units.some(u => (g.unitDef(u).attack ?? 0) > 0 && !g.unitDef(u).gatherer)) {
      set.strategy = {
        icon: '📜', label: 'Estrategia', avail: OK,
        tip: '<b>Estrategia</b> (Tab)<br>Formación, postura y órdenes: avanzar atacando, retirada, patrulla, escolta y mantener zona.',
        action: () => s.strategy.toggle(),
      };
      set.attackMove = {
        icon: '🎯', label: 'Ataque-movimiento', avail: OK,
        tip: '<b>Ataque-movimiento</b><br>Avanza hacia un punto atacando a todo enemigo que encuentre. Haz clic en el mapa.',
        action: () => { ui.targeting = 'attackMove'; },
      };
    }
    set.missions = missionCommands(s, units);
    set.battle = battleCommands(s, units);
    const scouts = units.filter(u => g.unitDef(u).autoExplore);
    if (scouts.length) {
      const a = exploreAvail(g, p, scouts[0].defId);
      set.explore = {
        icon: '🧭', label: 'Auto-exploración', avail: a,
        tip: tipHtml('Auto-exploración', '', 'Explora el mapa sola, zona por zona, hasta que no quede nada por descubrir. Cualquier otra orden la detiene.', a),
        action: () => {
          const av = exploreAvail(g, p, scouts[0].defId);
          if (!av.ok) { g.rejectAvail(p.id, av); return; }
          s.orders.send({ t: 'explore', units: ids(scouts) });
        },
      };
    }
    const sheltering = units.filter(u => canShelterSomewhere(g, u));
    if (sheltering.length) {
      set.shelter = {
        icon: '🏰', label: 'Refugiarse', avail: OK,
        tip: '<b>Refugiarse</b><br>Entra en el edificio propio más cercano con refugio (también con clic derecho sobre él). Dentro no pueden atacarte.',
        action: () => {
          for (const u of sheltering) {
            const b = nearestShelter(g, u);
            if (b) s.orders.send({ t: 'garrison', units: [u.id], target: b.id });
          }
        },
      };
    }
    const onWall = units.filter(u => u.onWall);
    if (onWall.length) {
      set.wall = {
        icon: '🪜', label: 'Bajar de la muralla', avail: OK,
        tip: '<b>Bajar de la muralla</b><br>Bajan del paso de ronda por el lado por el que subieron. Cualquier otra orden que no sea atacar también los baja.',
        action: () => s.orders.send({ t: 'dismountWall', ids: ids(onWall) }),
      };
    } else {
      const climbers = units.filter(u => canMountSomewhere(g, u));
      if (climbers.length) {
        set.wall = {
          icon: '🏯', label: 'Subir a la muralla', avail: OK,
          tip: '<b>Subir a la muralla</b><br>Suben al paso de ronda de los tramos de muralla propios más cercanos (también con clic derecho sobre un tramo) y disparan desde arriba: más alcance y daño por la altura, armadura extra, y solo se les alcanza a distancia. Cualquier orden que no sea atacar los baja.',
          action: () => s.orders.send({ t: 'mountWall', units: ids(climbers), target: 0 }),
        };
      }
    }
    set.stop = { icon: '✋', label: 'Detener', avail: OK, tip: '<b>Detener</b>', action: () => { s.orders.send({ t: 'stop', units: ids(units) }); } };
    return set;
  }

  const inside = blds.flatMap(b => garrisonOf(g, b));
  const posted = blds.flatMap(b => postedOn(g, b));
  if (inside.length) {
    set.evacuate = {
      icon: '🚪', label: 'Sacar', avail: OK, badge: String(inside.length + posted.length),
      tip: `<b>Sacar a los refugiados</b><br>${inside.map(u => esc(g.unitDef(u).name)).join(', ')} salen del edificio y quedan a la vista.`,
      action: () => {
        s.orders.send({ t: 'ungarrison', at: ids(blds) });
        if (posted.length) s.orders.send({ t: 'dismountWall', ids: ids(blds) });
      },
    };
  } else if (posted.length) {
    set.evacuate = {
      icon: '🪜', label: 'Bajar de la muralla', avail: OK, badge: String(posted.length),
      tip: `<b>Bajar de la muralla</b><br>${posted.map(u => esc(g.unitDef(u).name)).join(', ')} bajan del paso de ronda.`,
      action: () => s.orders.send({ t: 'dismountWall', ids: ids(blds) }),
    };
  }
  set.upgrade = upgradeCommands(s, blds);
  const defId = blds[0].defId;
  if (!blds.every(b => b.defId === defId)) return set;
  if (!blds[0].complete) {
    set.del = { ...del, icon: '🚫', tip: '<b>Cancelar construcción</b><br>Recuperas los recursos no gastados.' };
    return set;
  }
  const target = () => [...blds].sort((x, y) => x.queue.length - y.queue.length)[0];
  for (const id of trainablesAt(g, p, defId)) {
    const a = unitAvail(g, p, id);
    if (!a.visible) continue;
    const def = g.reg.unit(id);
    const queued = blds.reduce((n, x) => n + x.queue.filter(q => q.id === id).length, 0);
    const cost = costText(g, p.getCost(def));
    set.train.push({
      icon: pic(g, 'unit', id, p.id), label: def.name, avail: a, badge: queued ? String(queued) : undefined, cost,
      tip: tipHtml(def.name, cost, def.description, a, statsLine(g, def)) + '<br><small>Mayús+clic: 5 unidades</small>',
      action: shift => {
        for (let i = 0; i < (shift ? 5 : 1); i++) {
          // Se comprueba aquí para responder al momento (en red, la orden se ejecuta después)
          const b = target(), av = unitAvail(g, p, p.resolveUnit(id));
          if (!av.ok) { g.rejectAvail(p.id, av); break; }
          if (b.queue.length >= 15) { g.reject(p.id, 'queue', 'Cola llena'); break; }
          if (s.orders.send({ t: 'train', at: b.id, unit: id }) === false) break;
        }
      },
    });
  }
  for (const id of researchablesAt(g, p, defId)) {
    const def: TechDef = g.reg.tech(id);
    const a = techAvail(g, p, id);
    const cost = costText(g, p.getCost(def));
    set.research.push({
      icon: def.icon, label: def.name, avail: a, cost,
      tip: tipHtml(def.name, cost, def.description, a, `⏱ ${def.researchTime}s`),
      action: () => {
        const av = techAvail(g, p, id);
        if (!av.ok) { g.rejectAvail(p.id, av); return; }
        s.orders.send({ t: 'research', at: target().id, tech: id });
      },
    });
  }
  return set;
}
