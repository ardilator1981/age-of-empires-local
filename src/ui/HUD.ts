import type { AnyDef, TechDef } from '../core/types';
import { Commands } from '../game/commands';
import type { Entity } from '../game/Entity';
import {
  buildablesFor, buildingAvail, costText, exploreAvail, researchablesAt, techAvail, trainablesAt, unitAvail, type Avail,
} from '../game/rules';
import type { Session } from '../app/Session';
import { portrait } from '../render/icons';
import { sightRadius } from '../game/vision';
import { LONG_PRESS_MS } from './Input';
import { ICONS } from './svgIcons';

const HOTKEYS = 'QWERTASDFGZXCVB';

interface Cmd {
  icon: string;
  label: string;
  avail: Avail;
  tip: string;
  badge?: string;
  action: (shift: boolean) => void;
}

function esc(s: string) {
  return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

const OK: Avail = { visible: true, ok: true };

/** Interfaz HTML superpuesta: barra superior, comandos, selección y avisos. */
export class HUD {
  private cmds: (Cmd | null)[] = [];
  private cmdSig = '';
  private acc = 1;
  private selVersion = -1;
  private off: (() => void)[] = [];
  private lastTouch = -1e9;
  private tip0: { x: number; y: number; timer: number; shown: boolean } | null = null;
  private tipHide = 0;
  private el = {
    resources: document.getElementById('resources')!,
    age: document.getElementById('age')!,
    clock: document.getElementById('clock')!,
    commands: document.getElementById('commands')!,
    selection: document.getElementById('selection')!,
    notices: document.getElementById('notices')!,
    tooltip: document.getElementById('tooltip')!,
  };

  constructor(private s: Session) {
    const g = s.game;
    this.el.resources.innerHTML = [...g.reg.resources.values()].map(r =>
      `<div class="res" data-tip="${esc(r.name)}"><span class="ic">${r.icon}</span><b id="res-${r.id}">0</b><small id="resv-${r.id}"></small></div>`,
    ).join('') + `<div class="res" data-tip="Población"><span class="ic">${ICONS.pop}</span><b id="res-pop">0/0</b></div>`;

    this.on(this.el.commands, 'click', e => {
      const b = (e.target as HTMLElement).closest('[data-i]') as HTMLElement | null;
      if (b) this.run(Number(b.dataset.i), (e as MouseEvent).shiftKey);
    });
    this.on(this.el.selection, 'click', e => this.onSelectionClick(e as MouseEvent));
    const hud = document.getElementById('hud')!;
    this.on(hud, 'mousemove', e => this.onHover(e as MouseEvent));
    this.on(hud, 'mouseleave', () => { this.el.tooltip.style.display = 'none'; });
    this.on(document.getElementById('btn-menu')!, 'click', () => s.app.togglePause());
    this.on(document.getElementById('btn-music')!, 'click', () => { s.app.music.toggleMute(); this.updateMusicButton(); });
    this.updateMusicButton();
    // Tooltips con pulsación larga en pantallas táctiles
    this.on(hud, 'touchstart', e => this.onTouchTipStart(e as TouchEvent));
    this.on(hud, 'touchmove', e => this.onTouchTipMove(e as TouchEvent));
    this.on(hud, 'touchend', e => this.onTouchTipEnd(e as TouchEvent));
    this.on(hud, 'touchcancel', () => this.onTouchTipEnd(null));
    this.on(hud, 'contextmenu', e => e.preventDefault());
    this.on(document.getElementById('btn-rotate-ok')!, 'click', () => hud.classList.add('portrait-ok'));

    this.off.push(g.events.on('notify', n => {
      if (n.playerId !== undefined && n.playerId !== g.humanId) return;
      this.notice(n.text, n.tone ?? 'info', n.at);
      if (n.at && n.tone === 'warn') s.ui.pings.push({ x: n.at.x, y: n.at.y, t: g.time });
    }));
    this.el.notices.innerHTML = '';
  }

  /** Retrato (imagen) de una unidad, edificio o recurso, con el color del jugador. */
  private pic(kind: 'unit' | 'building' | 'resource', defId: string, owner: number): string {
    const g = this.s.game, p = g.players[owner];
    return `<img class="pic" alt="" decoding="sync" src="${portrait(g.reg, kind, defId, p?.color ?? '#aaa', p?.age ?? 0)}">`;
  }

  private on(t: EventTarget, type: string, fn: (e: Event) => void) {
    t.addEventListener(type, fn);
    this.off.push(() => t.removeEventListener(type, fn));
  }

  /** Refleja en la barra superior si la música suena o está silenciada. */
  updateMusicButton() {
    const b = document.getElementById('btn-music')!, m = this.s.app.music;
    const off = m.muted || m.volume === 0;
    b.textContent = off ? '🔇' : '🎵';
    b.classList.toggle('off', off);
  }

  dispose() {
    this.off.forEach(f => f());
    if (this.tip0) clearTimeout(this.tip0.timer);
    clearTimeout(this.tipHide);
    this.el.notices.innerHTML = '';
    this.el.tooltip.style.display = 'none';
  }

  notice(text: string, tone: string, at?: { x: number; y: number }) {
    // No apilar avisos idénticos seguidos
    const first = this.el.notices.firstElementChild;
    if (first && first.textContent === text) first.remove();
    const d = document.createElement('div');
    d.className = `notice ${tone}`;
    d.textContent = text;
    if (at) {
      d.classList.add('link');
      d.onclick = () => this.s.renderer.cam.centerOn(at.x, at.y);
    }
    this.el.notices.prepend(d);
    while (this.el.notices.children.length > 6) this.el.notices.lastChild!.remove();
    setTimeout(() => d.classList.add('fade'), 5000);
    setTimeout(() => d.remove(), 6000);
  }

  update(dt: number) {
    this.acc += dt;
    if (this.selVersion !== this.s.ui.selectionVersion) { this.selVersion = this.s.ui.selectionVersion; this.acc = 1; }
    if (this.acc < 0.2) return;
    this.acc = 0;
    this.refreshTop();
    this.refreshCommands();
    this.refreshSelection();
  }

  // ------------------------------------------------------------ barra superior

  private refreshTop() {
    const g = this.s.game, p = g.human;
    const workers: Record<string, number> = {};
    for (const e of g.units) {
      if (e.dead || e.owner !== p.id || e.order?.type !== 'gather') continue;
      const t = g.get(e.order.targetId);
      const r = t?.resType ?? e.carry?.type;
      if (r) workers[r] = (workers[r] ?? 0) + 1;
    }
    for (const r of g.reg.resources.values()) {
      document.getElementById(`res-${r.id}`)!.textContent = String(Math.floor(p.res[r.id] ?? 0));
      document.getElementById(`resv-${r.id}`)!.textContent = workers[r.id] ? `(${workers[r.id]})` : '';
    }
    const pop = document.getElementById('res-pop')!;
    pop.textContent = `${p.popUsed}/${p.popCap}`;
    pop.classList.toggle('bad', p.popUsed >= p.popCap);
    this.el.age.textContent = `${g.reg.ageName(p.age)} · ${p.civ.name}`;
    const t = Math.floor(g.time);
    this.el.clock.textContent = `${Math.floor(t / 3600) ? Math.floor(t / 3600) + ':' : ''}${String(Math.floor(t / 60) % 60).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  }

  // ------------------------------------------------------------ comandos

  private statsLine(def: AnyDef): string {
    const g = this.s.game, p = g.human;
    const parts = [`❤ ${Math.round(p.getStat(def, 'hp'))}`];
    const atk = p.getStat(def, 'attack');
    if (atk) parts.push(`⚔ ${Math.round(atk * 10) / 10}`);
    parts.push(`🛡 ${p.getStat(def, 'armorMelee')}/${p.getStat(def, 'armorPierce')}`);
    const rng = p.getStat(def, 'range');
    if (rng >= 1) parts.push(`🏹 ${rng}`);
    if (def.bonus?.length) parts.push(def.bonus.map(b => `+${b.amount} vs ${b.vs}`).join(', '));
    void g;
    return parts.join(' · ');
  }

  private tip(name: string, cost: string, desc: string, a: Avail, extra = '') {
    return `<b>${esc(name)}</b>${cost ? ` <span class="cost">${cost}</span>` : ''}<br>${esc(desc)}${extra ? `<br><span class="stats">${extra}</span>` : ''}${!a.ok && a.reason ? `<br><span class="bad">${esc(a.reason)}</span>` : ''}`;
  }

  private computeCommands(): (Cmd | null)[] {
    const s = this.s, g = s.game, p = g.human, ui = s.ui;
    const sel = ui.selected(g).filter(e => e.owner === p.id);
    const out: (Cmd | null)[] = new Array(15).fill(null);
    if (!sel.length) return out;
    const units = sel.filter(e => e.kind === 'unit');
    const blds = sel.filter(e => e.kind === 'building');
    const del: Cmd = {
      icon: '❌', label: 'Eliminar', avail: OK, tip: '<b>Eliminar</b> (Supr)<br>Destruye la selección.',
      action: () => { sel.forEach(e => Commands.delete(g, e)); ui.setSelection([]); },
    };

    if (units.length) {
      const builders = units.filter(u => g.unitDef(u).builder);
      if (builders.length && ui.page !== 'main') {
        const ids = buildablesFor(g, p, ui.page).filter(id => buildingAvail(g, p, id).visible);
        ids.slice(0, 14).forEach((id, i) => {
          const def = g.reg.building(id);
          const a = buildingAvail(g, p, id);
          out[i] = {
            icon: this.pic('building', id, p.id), label: def.name, avail: a,
            tip: this.tip(def.name, costText(g, p.getCost(def)), def.description, a),
            action: () => {
              const av = buildingAvail(g, p, id);
              if (!av.ok) { g.notify(av.reason ?? 'No disponible', p.id, 'warn'); return; }
              ui.placing = { defId: id, tx: 0, ty: 0, valid: false };
            },
          };
        });
        out[14] = { icon: '↩️', label: 'Volver', avail: OK, tip: '<b>Volver</b> (Esc)', action: () => { ui.page = 'main'; } };
        return out;
      }
      if (builders.length) {
        const eco = g.reg.buildings.has('house') ? this.pic('building', 'house', p.id) : '🏠';
        const mil = g.reg.buildings.has('barracks') ? this.pic('building', 'barracks', p.id) : '⚔️';
        out[0] = { icon: eco, label: 'Construir eco', avail: OK, tip: '<b>Construir edificio económico</b>', action: () => { ui.page = 'economy'; } };
        out[1] = { icon: mil, label: 'Construir mil', avail: OK, tip: '<b>Construir edificio militar</b>', action: () => { ui.page = 'military'; } };
      }
      if (units.some(u => (g.unitDef(u).attack ?? 0) > 0 && !g.unitDef(u).gatherer)) {
        out[5] = {
          icon: '🎯', label: 'Ataque-movimiento', avail: OK,
          tip: '<b>Ataque-movimiento</b><br>Avanza hacia un punto atacando a todo enemigo que encuentre. Haz clic en el mapa.',
          action: () => { ui.targeting = 'attackMove'; },
        };
      }
      const scouts = units.filter(u => g.unitDef(u).autoExplore);
      if (scouts.length) {
        const a = exploreAvail(g, p, scouts[0].defId);
        out[6] = {
          icon: '🧭', label: 'Auto-exploración', avail: a,
          tip: this.tip('Auto-exploración', '', 'Explora el mapa sola, zona por zona, hasta que no quede nada por descubrir. Cualquier otra orden la detiene.', a),
          action: () => {
            const av = exploreAvail(g, p, scouts[0].defId);
            if (!av.ok) { g.notify(av.reason ?? 'No disponible', p.id, 'warn'); return; }
            Commands.explore(g, scouts);
          },
        };
      }
      out[10] = { icon: '✋', label: 'Detener', avail: OK, tip: '<b>Detener</b>', action: () => Commands.stop(g, units) };
      out[14] = del;
      return out;
    }

    if (blds.length) {
      const defId = blds[0].defId;
      if (!blds.every(b => b.defId === defId)) { out[14] = del; return out; }
      const b = blds[0];
      if (!b.complete) {
        out[14] = { ...del, icon: '🚫', tip: '<b>Cancelar construcción</b><br>Recuperas los recursos no gastados.' };
        return out;
      }
      const target = () => [...blds].sort((x, y) => x.queue.length - y.queue.length)[0];
      const items: Cmd[] = [];
      for (const id of trainablesAt(g, p, defId)) {
        const a = unitAvail(g, p, id);
        if (!a.visible) continue;
        const def = g.reg.unit(id);
        const queued = blds.reduce((n, x) => n + x.queue.filter(q => q.id === id).length, 0);
        items.push({
          icon: this.pic('unit', id, p.id), label: def.name, avail: a, badge: queued ? String(queued) : undefined,
          tip: this.tip(def.name, costText(g, p.getCost(def)), def.description, a, this.statsLine(def)) + '<br><small>Mayús+clic: 5 unidades</small>',
          action: shift => {
            for (let i = 0; i < (shift ? 5 : 1); i++) {
              if (!Commands.train(g, target(), id)) {
                const av = unitAvail(g, p, id);
                g.notify(av.ok ? 'Cola llena' : av.reason ?? 'No disponible', p.id, 'warn');
                break;
              }
            }
          },
        });
      }
      for (const id of researchablesAt(g, p, defId)) {
        const def: TechDef = g.reg.tech(id);
        const a = techAvail(g, p, id);
        items.push({
          icon: def.icon, label: def.name, avail: a,
          tip: this.tip(def.name, costText(g, p.getCost(def)), def.description, a, `⏱ ${def.researchTime}s`),
          action: () => {
            if (!Commands.research(g, target(), id)) {
              const av = techAvail(g, p, id);
              g.notify(av.reason ?? 'No disponible', p.id, 'warn');
            }
          },
        });
      }
      items.slice(0, 14).forEach((c, i) => { out[i] = c; });
      out[14] = del;
    }
    return out;
  }

  private refreshCommands() {
    this.cmds = this.computeCommands();
    const sig = this.cmds.map(c => (c ? `${c.label}${c.avail.ok ? 1 : 0}${c.badge ?? ''}` : '_')).join('|') + this.s.ui.page + this.s.game.human.age;
    if (sig === this.cmdSig) return;
    this.cmdSig = sig;
    this.el.commands.innerHTML = this.cmds.map((c, i) => c
      ? `<button class="cmd${c.avail.ok ? '' : ' off'}" data-i="${i}" data-tipi="${i}"><span class="ic">${c.icon}</span><span class="hk">${HOTKEYS[i]}</span>${c.badge ? `<span class="badge">${c.badge}</span>` : ''}</button>`
      : `<div class="cmd empty"></div>`).join('');
  }

  private run(i: number, shift: boolean) {
    const c = this.cmds[i];
    if (!c) return;
    if (!c.avail.ok && c.avail.reason) {
      this.s.game.notify(c.avail.reason, this.s.game.humanId, 'warn');
      return;
    }
    c.action(shift);
    this.acc = 1;
    this.cmdSig = '';
    this.update(0);
  }

  pressHotkey(i: number, shift: boolean) {
    this.refreshCommands();
    this.run(i, shift);
  }

  // ------------------------------------------------------------ panel de selección

  private taskText(e: Entity): string {
    const g = this.s.game;
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
      case 'move': return 'Moviéndose';
      default: return o.type;
    }
  }

  private refreshSelection() {
    const g = this.s.game, ui = this.s.ui;
    const sel = ui.selected(g);
    if (sel.length !== ui.selection.length) ui.selection = sel.map(e => e.id);
    if (!sel.length) { this.setSelectionHtml(`<div class="sel-empty">Selecciona unidades o edificios.<br><small>${document.documentElement.classList.contains('touch')
      ? 'Toca: seleccionar · Mantén pulsado: ordenar · Dos dedos: mover y zoom'
      : 'Clic izquierdo: seleccionar · Clic derecho: ordenar · Rueda: zoom'}</small></div>`); return; }
    if (sel.length > 1) {
      this.setSelectionHtml(`<div class="sel-multi">${sel.slice(0, 40).map(e => {
        const def = g.defOf(e);
        const pct = Math.max(0, e.hp / e.maxHp) * 100;
        return `<div class="mini" data-select="${e.id}" data-tip="${esc(def.name)}" style="border-color:${g.players[e.owner].color}">${this.pic(e.kind === 'unit' ? 'unit' : 'building', e.defId, e.owner)}<i style="width:${pct}%"></i></div>`;
      }).join('')}</div>`);
      return;
    }
    const e = sel[0];
    const owner = g.players[e.owner];
    let icon = '', name = '', body = '';
    if (e.kind === 'resource') {
      const nd = g.reg.resourceNodes.get(e.defId)!;
      const r = g.reg.resources.get(nd.resource);
      icon = this.pic('resource', e.defId, 0); name = nd.name;
      body = `<div class="line">${r?.icon ?? ''} ${Math.ceil(e.amount)} de ${(r?.name ?? '').toLowerCase()}</div>`;
    } else {
      const def = g.defOf(e);
      icon = this.pic(e.kind === 'unit' ? 'unit' : 'building', e.defId, e.owner); name = def.name;
      const pct = Math.max(0, e.hp / e.maxHp) * 100;
      body += `<div class="hp"><i style="width:${pct}%"></i><span>${Math.ceil(e.hp)} / ${Math.round(e.maxHp)}</span></div>`;
      body += `<div class="line stats">${this.statsLine(def)}</div>`;
      // Relieve: ventaja o desventaja de altura y visión extra
      const adv = e.data.heightAdv as { range: number; damage: number; until: number } | undefined;
      if (adv && adv.until >= g.time && (adv.range > 0 || adv.damage !== 0)) {
        const up = adv.damage > 0 || adv.range > 0;
        const parts = [adv.range ? `+${adv.range} alcance` : '', `${adv.damage > 0 ? '+' : ''}${Math.round(adv.damage * 100)} % daño`].filter(Boolean);
        body += `<div class="line ${up ? 'hg-up' : 'hg-down'}">${up ? '▲ Ventaja de altura' : '▼ Ataca cuesta arriba'}: ${parts.join(', ')}</div>`;
      }
      const losBonus = Math.round(sightRadius(g, e) - (owner.getStat(def, 'los') + (e.kind === 'building' ? e.size / 2 : 0)));
      if (losBonus > 0) body += `<div class="line hg-up">⛰ Visión +${losBonus} por la altura</div>`;
      if (e.kind === 'unit') {
        const udef = g.unitDef(e);
        if (udef.gatherer) {
          const cap = owner.getStat(udef, 'carryCapacity');
          const c = e.carry && e.carry.amount > 0 ? `${g.reg.resources.get(e.carry.type)?.icon ?? ''} ${Math.floor(e.carry.amount)}/${cap}` : 'nada';
          body += `<div class="line">Carga: ${c}</div>`;
        }
        if (e.owner === g.humanId) body += `<div class="line task">${this.taskText(e)}</div>`;
      } else {
        const bdef = g.buildingDef(e);
        if (!e.complete) body += `<div class="line">En construcción: ${Math.floor(e.progress * 100)}%</div>`;
        else if (bdef.gatherable) body += `<div class="line">🍖 ${Math.ceil(e.amount)} de alimento restante</div>`;
        if (bdef.dropSite) body += `<div class="line">Acepta: ${bdef.dropSite.map(r => g.reg.resources.get(r)?.icon ?? r).join(' ')}</div>`;
        if (e.queue.length && e.owner === g.humanId) {
          body += `<div class="queue">${e.queue.map((q, i) => {
            const d = q.kind === 'unit' ? g.reg.unit(q.id) : g.reg.tech(q.id);
            const ic = q.kind === 'unit' ? this.pic('unit', q.id, e.owner) : `<span>${d.icon}</span>`;
            return `<div class="qi" data-cancel="${i}" data-tip="${esc(d.name)} — clic para cancelar">${ic}${i === 0 ? `<i style="width:${q.progress * 100}%"></i>` : ''}</div>`;
          }).join('')}</div>`;
        }
      }
    }
    this.setSelectionHtml(`<div class="sel-single">
      <div class="portrait" style="border-color:${owner.color}">${icon}</div>
      <div class="info"><div class="name">${esc(name)}</div><div class="owner" style="color:${owner.color}">${esc(owner.name)}${e.owner ? ' · ' + esc(owner.civ.name) : ''}</div>${body}</div>
    </div>`);
  }

  private lastSelHtml = '';
  /** Solo toca el DOM si el contenido ha cambiado (evita parpadeos de las imágenes). */
  private setSelectionHtml(html: string) {
    if (html === this.lastSelHtml) return;
    this.lastSelHtml = html;
    this.el.selection.innerHTML = html;
  }

  private onSelectionClick(e: MouseEvent) {
    const g = this.s.game, ui = this.s.ui;
    const t = e.target as HTMLElement;
    const sel = t.closest('[data-select]') as HTMLElement | null;
    if (sel) {
      const id = Number(sel.dataset.select);
      if (e.shiftKey) ui.setSelection(ui.selection.filter(x => x !== id));
      else ui.setSelection([id]);
      return;
    }
    const c = t.closest('[data-cancel]') as HTMLElement | null;
    if (c) {
      const b = ui.selected(g)[0];
      if (b && b.owner === g.humanId) Commands.cancel(g, b, Number(c.dataset.cancel));
      this.acc = 1;
    }
  }

  /** Texto del tooltip del elemento (botón de comando o cualquier cosa con data-tip). */
  private tipFor(t: HTMLElement): string {
    const ci = t.closest('[data-tipi]') as HTMLElement | null;
    const ti = t.closest('[data-tip]') as HTMLElement | null;
    if (ci) return this.cmds[Number(ci.dataset.tipi)]?.tip ?? '';
    if (ti) return esc(ti.dataset.tip ?? '');
    return '';
  }

  private showTip(html: string, x: number, y: number, gap: number) {
    const tt = this.el.tooltip;
    if (!html) { tt.style.display = 'none'; return; }
    tt.innerHTML = html;
    tt.style.display = 'block';
    const w = tt.offsetWidth, h = tt.offsetHeight;
    tt.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, x + 14)) + 'px';
    tt.style.top = Math.max(8, y - h - gap) + 'px';
  }

  private onHover(e: MouseEvent) {
    // Los navegadores móviles generan eventos de ratón tras cada toque: se ignoran
    if (performance.now() - this.lastTouch < 1000) return;
    this.showTip(this.tipFor(e.target as HTMLElement), e.clientX, e.clientY, 12);
  }

  private onTouchTipStart(e: TouchEvent) {
    this.lastTouch = performance.now();
    if (this.tip0) clearTimeout(this.tip0.timer);
    clearTimeout(this.tipHide);
    this.el.tooltip.style.display = 'none';
    this.tip0 = null;
    const t = e.touches[0];
    const html = t && e.touches.length === 1 ? this.tipFor(e.target as HTMLElement) : '';
    if (!html) return;
    const tip = { x: t.clientX, y: t.clientY, shown: false, timer: 0 };
    tip.timer = window.setTimeout(() => {
      tip.shown = true;
      navigator.vibrate?.(10);
      // Por encima del dedo para que no lo tape
      this.showTip(html, tip.x - 60, tip.y, 36);
    }, LONG_PRESS_MS);
    this.tip0 = tip;
  }

  private onTouchTipMove(e: TouchEvent) {
    const t = e.touches[0], tip = this.tip0;
    if (!t || !tip || tip.shown) return;
    if (Math.hypot(t.clientX - tip.x, t.clientY - tip.y) > 12) { clearTimeout(tip.timer); this.tip0 = null; }
  }

  private onTouchTipEnd(e: TouchEvent | null) {
    this.lastTouch = performance.now();
    const tip = this.tip0;
    this.tip0 = null;
    if (!tip) return;
    clearTimeout(tip.timer);
    if (!tip.shown) return;
    // La pulsación larga solo muestra la información: no ejecuta el botón
    e?.preventDefault();
    this.tipHide = window.setTimeout(() => { this.el.tooltip.style.display = 'none'; }, 1800);
  }
}
