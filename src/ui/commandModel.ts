import type { AnyDef, TechDef } from '../core/types';
import { ids } from '../game/net/netCommands';
import { groupOf } from '../game/army/groups';
import type { Entity } from '../game/Entity';
import type { Game } from '../game/Game';
import {
  buildablesFor, buildingAvail, costText, exploreAvail, researchablesAt, techAvail, trainablesAt, unitAvail, type Avail,
} from '../game/rules';
import type { Session } from '../app/Session';
import { portrait } from '../render/icons';
import { canShelterSomewhere, garrisonOf, nearestShelter } from '../game/garrison';

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
  build: Record<'economy' | 'military', { cmd: Cmd; items: Cmd[] }> | null;
  attackMove: Cmd | null;
  /** Auto-exploración (unidades con `autoExplore`). */
  explore: Cmd | null;
  stop: Cmd | null;
  /** Refugiarse en el edificio propio más cercano que admita a la unidad (unidades con refugio disponible). */
  shelter: Cmd | null;
  /** Sacar a los refugiados de los edificios seleccionados. */
  evacuate: Cmd | null;
  /** Pantalla de estrategia (formación, postura y órdenes tácticas) para las tropas. */
  strategy: Cmd | null;
  /** Unidades que entrenar y tecnologías que investigar en los edificios seleccionados. */
  train: Cmd[];
  research: Cmd[];
  /** Eliminar la selección (o cancelar la construcción de unos cimientos). */
  del: Cmd | null;
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

/** Calcula los comandos disponibles para la selección actual del jugador humano. */
export function selectionCommands(s: Session): CommandSet {
  const g = s.game, p = g.human, ui = s.ui;
  const sel = ui.selected(g).filter(e => e.owner === p.id);
  const units = sel.filter(e => e.kind === 'unit');
  const blds = sel.filter(e => e.kind === 'building');
  const set: CommandSet = { units, blds, build: null, attackMove: null, explore: null, stop: null, shelter: null, evacuate: null, strategy: null, train: [], research: [], del: null };
  if (!sel.length) return set;
  const del: Cmd = {
    icon: '❌', label: 'Eliminar', avail: OK, tip: '<b>Eliminar</b> (Supr)<br>Destruye la selección.',
    action: () => { s.orders.send({ t: 'delete', ids: ids(sel) }); ui.setSelection([]); },
  };
  set.del = del;

  if (units.length) {
    if (units.some(u => g.unitDef(u).builder)) {
      const list = (cat: 'economy' | 'military') => buildablesFor(g, p, cat).filter(id => buildingAvail(g, p, id).visible).map(id => {
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
    set.stop = { icon: '✋', label: 'Detener', avail: OK, tip: '<b>Detener</b>', action: () => { s.orders.send({ t: 'stop', units: ids(units) }); } };
    return set;
  }

  const inside = blds.flatMap(b => garrisonOf(g, b));
  if (inside.length) {
    set.evacuate = {
      icon: '🚪', label: 'Sacar', avail: OK, badge: String(inside.length),
      tip: `<b>Sacar a los refugiados</b><br>${inside.map(u => esc(g.unitDef(u).name)).join(', ')} salen del edificio y quedan a la vista.`,
      action: () => s.orders.send({ t: 'ungarrison', at: ids(blds) }),
    };
  }
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
