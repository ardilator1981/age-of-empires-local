import type { Session } from '../app/Session';
import { Commands } from '../game/commands';
import type { Entity } from '../game/Entity';
import { costText } from '../game/rules';
import { esc, pic, selectionCommands, taskText, type Cmd, type CommandSet } from './commandModel';
import { LONG_PRESS_MS } from './Input';
import { haptic, isMobileLayout, setUIPrefs, uiPrefs, UI_SCALES, type LayoutPref } from './layout';
import { bindSoundControls, soundControlsHtml } from './soundSettings';
import { ICONS } from './svgIcons';

/** Botón de la interfaz móvil (bandeja u hoja). */
interface Btn {
  icon: string;
  label: string;
  ok: boolean;
  tip: string;
  badge?: string;
  cost?: string;
  /** Acción destructiva: el primer toque la arma y hay que tocar otra vez para confirmar. */
  confirm?: boolean;
  /** Abre otra cosa (hoja de construcción, "más"): no cierra la hoja. */
  keepOpen?: boolean;
  run: () => void;
}

type Tab = 'economy' | 'military' | 'units' | 'techs' | 'actions';
const TAB_NAMES: Record<Tab, string> = { economy: 'Economía', military: 'Militar', units: 'Unidades', techs: 'Tecnologías', actions: 'Acciones' };
type Screen = 'game' | 'stats' | 'techs' | 'diplomacy' | 'settings';
const SCREENS: [Screen, string][] = [['game', 'Partida'], ['stats', 'Estadísticas'], ['techs', 'Tecnologías'], ['diplomacy', 'Diplomacia'], ['settings', 'Ajustes']];
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
/** Grupos de control con botón en la interfaz móvil. */
const GROUPS = [1, 2, 3, 4, 5];
const ARM_MS = 2500;
const GESTURE_HELP = `
  <ul class="m-gestures">
    <li><b>👆 Tocar</b> seleccionar · <b>dos toques</b> todas las unidades de ese tipo en pantalla</li>
    <li><b>☝️ Arrastrar</b> recuadro de selección (o mover la cámara con el modo ✥)</li>
    <li><b>✌️ Dos dedos</b> mover la cámara · <b>pellizcar</b> zoom</li>
    <li><b>⏱ Mantener pulsado</b> en el mapa o el minimapa: mover, atacar, recolectar, construir…</li>
    <li><b>Botones</b> mantener pulsado = ver coste y descripción · <b>1–5</b> mantener pulsado = guardar grupo</li>
  </ul>`;

/**
 * Interfaz móvil: el mapa ocupa toda la pantalla y los controles flotan encima, pequeños.
 * Usa el mismo motor, las mismas reglas y los mismos comandos que la de escritorio (ver commandModel.ts).
 */
export class MobileHUD {
  private root: HTMLElement;
  private el: Record<string, HTMLElement> = {};
  private off: (() => void)[] = [];
  private acc = 1;
  private selVersion = -1;
  private set: CommandSet | null = null;
  private trayBtns: Btn[] = [];
  private sheetBtns: Btn[] = [];
  private sheetTab: Tab | null = null;
  private lastBuildTab: Tab = 'economy';
  private screen: Screen | null = null;
  private armed: { key: string; timer: number } | null = null;
  private alerts: { x: number; y: number; t: number }[] = [];
  private folded = false;
  private mini: 'normal' | 'small' | 'full' = 'normal';
  private sig: Record<string, string> = {};
  private groupPress: { k: number; timer: number; fired: boolean } | null = null;
  private hint = false;
  /** Mostrar la pista de gestos en cuanto empiece la partida (si no se ha visto ya). */
  private hintPending = true;

  constructor(private s: Session) {
    const hud = document.getElementById('hud')!;
    this.root = document.createElement('div');
    this.root.id = 'mhud';
    this.root.innerHTML = `
      <div id="m-top" data-mt="res"></div>
      <div id="m-btns">
        <button class="mbtn" data-a="alerts" data-mt="alerts">🔔<i class="mb-badge"></i></button>
        <button class="mbtn" data-a="army" data-mt="army">⚔️</button>
        <button class="mbtn" data-a="idle" data-mt="idle">💤<i class="mb-badge"></i></button>
        <button class="mbtn soon" data-a="strategy" data-mt="strategy">📜</button>
        <button class="mbtn" data-a="menu" data-mt="menu">☰</button>
      </div>
      <button id="m-mode" class="mbtn" data-a="mode" data-mt="mode"></button>
      <div id="m-groups"></div>
      <div id="m-mini">
        <div id="m-mini-canvas"></div>
        <button class="mbtn m-mini-btn" data-a="mini-full" data-mt="mini-full">⤢</button>
        <button class="mbtn m-mini-btn" data-a="mini-toggle" data-mt="mini-toggle">⇲</button>
      </div>
      <div id="m-tray">
        <div class="m-info"></div>
        <div class="m-acts"></div>
        <button class="m-fold" data-a="fold" aria-label="Plegar">▾</button>
      </div>
      <div id="m-target"><span>Toca el destino del ataque</span><button class="mbtn" data-a="cancel-target">✖</button></div>
      <div id="m-place">
        <button class="mbtn big cancel" data-a="place-cancel">✖<span>Cancelar</span></button>
        <div class="m-place-info"></div>
        <button class="mbtn big ok" data-a="place-ok">✔<span>Construir</span></button>
      </div>
      <div id="m-sheet-back" data-a="sheet-close"></div>
      <div id="m-sheet"><div class="m-tabs"></div><div class="m-grid"></div></div>
      <div id="m-screen"></div>
      <div id="m-hint"></div>`;
    hud.appendChild(this.root);
    for (const id of ['m-top', 'm-btns', 'm-mode', 'm-groups', 'm-mini', 'm-mini-canvas', 'm-tray', 'm-target', 'm-place', 'm-sheet', 'm-screen', 'm-hint']) {
      this.el[id] = this.root.querySelector('#' + id)!;
    }
    this.el.info = this.root.querySelector('.m-info')!;
    this.el.acts = this.root.querySelector('.m-acts')!;
    this.el.tabs = this.root.querySelector('.m-tabs')!;
    this.el.grid = this.root.querySelector('.m-grid')!;
    this.el.placeInfo = this.root.querySelector('.m-place-info')!;

    const g = s.game;
    this.el['m-top'].innerHTML = [...g.reg.resources.values()].map(r =>
      `<span class="m-res">${r.icon}<b id="mres-${r.id}">0</b></span>`).join('')
      + `<span class="m-res">${ICONS.pop}<b id="mres-pop">0/0</b></span><span class="m-age" id="m-age"></span><span class="m-clock" id="m-clock"></span>`;
    this.el['m-groups'].innerHTML = GROUPS.map(k => `<button class="mbtn grp" data-g="${k}">${k}<i class="mb-badge"></i></button>`).join('');

    this.on(this.root, 'click', e => this.onClick(e as MouseEvent));
    this.on(this.el['m-groups'], 'touchstart', e => this.onGroupDown(e as TouchEvent), { passive: true });
    this.on(this.el['m-groups'], 'mousedown', e => this.onGroupDown(e as MouseEvent));
    this.on(this.el['m-groups'], 'touchend', () => this.onGroupUp());
    this.on(this.el['m-groups'], 'mouseup', () => this.onGroupUp());
    this.on(this.el['m-groups'], 'touchmove', () => this.onGroupUp(true), { passive: true });
    // El minimapa a pantalla completa se cierra al elegir un punto
    this.on(this.el['m-mini'], 'touchend', () => { if (this.mini === 'full') setTimeout(() => this.setMini('normal'), 60); });
    this.on(this.el['m-mini'], 'mouseup', () => { if (this.mini === 'full') setTimeout(() => this.setMini('normal'), 60); });
    // La página nunca hace scroll ni zoom por gestos sobre la interfaz flotante (salvo dentro de las listas)
    this.on(this.root, 'touchmove', e => {
      if (!(e.target as HTMLElement).closest('.m-grid, #m-screen, .m-gestures')) e.preventDefault();
    }, { passive: false });

    s.hud.tipProvider = el => this.tipFor(el);
    this.off.push(g.events.on('notify', n => {
      if (n.playerId !== undefined && n.playerId !== g.humanId) return;
      if (n.at && n.tone === 'warn') this.alerts.push({ x: n.at.x, y: n.at.y, t: g.time });
    }));
    this.applyLayout();
  }

  private on(t: EventTarget, type: string, fn: (e: Event) => void, opts?: AddEventListenerOptions) {
    t.addEventListener(type, fn, opts);
    this.off.push(() => t.removeEventListener(type, fn, opts));
  }

  dispose() {
    this.off.forEach(f => f());
    this.disarm();
    if (this.screen || this.hint) this.s.app.paused = false;
    this.moveMinimap(false);
    this.root.remove();
    this.s.hud.tipProvider = null;
  }

  // ------------------------------------------------------------ cambio de interfaz

  /** Se llama al entrar o salir de la interfaz móvil. */
  applyLayout() {
    const mobile = isMobileLayout();
    this.moveMinimap(mobile);
    if (!mobile) {
      this.closeSheet();
      this.setMini('normal');
      if (this.screen || this.hint) {
        // La pantalla móvil queda oculta: se pasa al menú de pausa de escritorio
        this.screen = null; this.hint = false;
        this.el['m-screen'].innerHTML = ''; this.el['m-hint'].innerHTML = '';
        this.root.classList.remove('screen-open', 'hint-open');
        this.s.app.setPaused(true);
      }
    } else this.hintPending = true;
    this.sig = {};
    this.acc = 1;
  }

  /** El lienzo del minimapa es el mismo en las dos interfaces: se mueve de sitio. */
  private moveMinimap(mobile: boolean) {
    const c = this.s.minimap.canvas;
    const dest = mobile ? this.el['m-mini-canvas'] : document.getElementById('minimap-wrap');
    if (dest && c.parentElement !== dest) dest.appendChild(c);
    requestAnimationFrame(() => this.s.minimap.resize());
  }

  private setMini(m: 'normal' | 'small' | 'full') {
    if (this.mini === m) return;
    this.mini = m;
    this.root.classList.toggle('mini-small', m === 'small');
    this.root.classList.toggle('mini-full', m === 'full');
    (this.root.querySelector('[data-a="mini-full"]') as HTMLElement).textContent = m === 'full' ? '✖' : '⤢';
    (this.root.querySelector('[data-a="mini-toggle"]') as HTMLElement).textContent = m === 'small' ? '🗺️' : '⇲';
    requestAnimationFrame(() => this.s.minimap.resize());
  }

  // ------------------------------------------------------------ actualización

  update(dt: number) {
    if (!isMobileLayout()) return;
    const ui = this.s.ui;
    if (this.hintPending && !this.s.app.menuOpen) {
      this.hintPending = false;
      if (!uiPrefs().hintSeen) this.showHint();
    }
    // Si la pausa se quitó desde fuera (Esc), se cierra la pantalla de menú
    if ((this.screen || this.hint) && !this.s.app.paused) this.closeScreen(false);
    this.root.classList.toggle('placing', !!ui.placing);
    this.root.classList.toggle('targeting', !!ui.targeting && !ui.placing);
    if (ui.placing) this.refreshPlace();
    this.acc += dt;
    if (this.selVersion !== ui.selectionVersion) { this.selVersion = ui.selectionVersion; this.acc = 1; this.folded = false; this.closeSheet(); }
    if (this.acc < 0.2) return;
    this.acc = 0;
    this.refreshTop();
    this.refreshSide();
    this.refreshTray();
    if (this.sheetTab) this.renderSheet();
  }

  private setHtml(key: string, el: HTMLElement, html: string) {
    if (this.sig[key] === html) return;
    this.sig[key] = html;
    el.innerHTML = html;
  }

  private refreshTop() {
    const g = this.s.game, p = g.human;
    for (const r of g.reg.resources.values()) {
      const b = document.getElementById(`mres-${r.id}`);
      if (b) b.textContent = String(Math.floor(p.res[r.id] ?? 0));
    }
    const pop = document.getElementById('mres-pop')!;
    pop.textContent = `${p.popUsed}/${p.popCap}`;
    pop.classList.toggle('bad', p.popUsed >= p.popCap);
    document.getElementById('m-age')!.textContent = ROMAN[p.age] ?? String(p.age + 1);
    const t = Math.floor(g.time);
    document.getElementById('m-clock')!.textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  }

  private idleVillagers(): number {
    const g = this.s.game;
    let n = 0;
    for (const u of g.units) if (!u.dead && u.owner === g.humanId && !u.order && g.unitDef(u).gatherer) n++;
    return n;
  }

  private refreshSide() {
    const g = this.s.game, ui = this.s.ui;
    this.alerts = this.alerts.filter(a => g.time - a.t < 45);
    const badge = (a: string, n: number) => {
      const i = this.el['m-btns'].querySelector(`[data-a="${a}"] .mb-badge`) as HTMLElement;
      i.textContent = n ? String(n) : '';
    };
    badge('alerts', this.alerts.length);
    badge('idle', this.idleVillagers());
    const mode = this.s.input.cameraMode;
    this.setHtml('mode', this.el['m-mode'], mode ? '✥<span>Cámara</span>' : '⬚<span>Selección</span>');
    this.el['m-mode'].classList.toggle('on', mode);
    // Grupos: los guardados siempre; todos mientras hay algo propio seleccionado (para poder guardarlo)
    const own = ui.selected(g).some(e => e.owner === g.humanId && e.kind === 'unit');
    let shown = 0;
    for (const k of GROUPS) {
      const b = this.el['m-groups'].querySelector(`[data-g="${k}"]`) as HTMLElement;
      const n = ui.groups[k].filter(id => g.get(id)).length;
      const vis = n > 0 || own;
      b.style.display = vis ? '' : 'none';
      b.classList.toggle('empty', !n);
      (b.querySelector('.mb-badge') as HTMLElement).textContent = n ? String(n) : '';
      if (vis) shown++;
    }
    this.el['m-groups'].style.display = shown ? '' : 'none';
  }

  // ------------------------------------------------------------ bandeja de selección

  private btnFromCmd(c: Cmd, extra: Partial<Btn> = {}): Btn {
    const g = this.s.game;
    return {
      icon: c.icon, label: c.label, ok: c.avail.ok, tip: c.tip, badge: c.badge, cost: c.cost,
      run: () => {
        if (!c.avail.ok) { g.rejectAvail(g.humanId, c.avail); return; }
        c.action(false);
      },
      ...extra,
    };
  }

  private tabsFor(set: CommandSet): Tab[] {
    const tabs: Tab[] = [];
    if (set.build) tabs.push('economy', 'military');
    if (set.train.length) tabs.push('units');
    if (set.research.length) tabs.push('techs');
    if (set.del || set.stop) tabs.push('actions');
    return tabs;
  }

  private delBtn(set: CommandSet): Btn | null {
    if (!set.del) return null;
    const cancel = set.del.icon === '🚫';
    return this.btnFromCmd(set.del, {
      confirm: true, label: cancel ? 'Cancelar construcción' : 'Eliminar',
      tip: `${set.del.tip}<br><small>Toca dos veces para confirmar</small>`,
    });
  }

  /** 4-5 acciones de la bandeja; el resto, en la hoja «Más». */
  private trayActions(set: CommandSet): Btn[] {
    const out: Btn[] = [];
    const more = (tab: Tab): Btn => ({
      icon: '⋯', label: 'Más', ok: true, tip: '<b>Más acciones</b>', keepOpen: true, run: () => this.openSheet(tab),
    });
    if (set.units.length) {
      if (set.build) {
        out.push({
          icon: set.build.economy.cmd.icon, label: 'Construir', ok: true, keepOpen: true,
          tip: '<b>Construir</b><br>Edificios económicos y militares.', run: () => this.openSheet(this.lastBuildTab),
        });
      }
      if (set.attackMove) out.push(this.btnFromCmd(set.attackMove));
      if (set.explore) out.push(this.btnFromCmd(set.explore));
      if (set.stop) out.push(this.btnFromCmd(set.stop));
      out.push(more('actions'));
      return out;
    }
    if (!set.blds.length) return out;
    const prod = [...set.train, ...set.research];
    if (!prod.length) {
      const d = this.delBtn(set);
      if (d) out.push(d);
      return out;
    }
    prod.slice(0, 4).forEach(c => out.push(this.btnFromCmd(c)));
    out.push(more(set.train.length ? 'units' : 'techs'));
    return out;
  }

  private btnHtml(b: Btn, key: string, cls = '') {
    const armed = this.armed?.key === key;
    return `<button class="mbtn cmd-m${b.ok ? '' : ' off'}${armed ? ' armed' : ''}${cls}" data-b="${key}" data-mt="${key}">`
      + `<span class="ic">${b.icon}</span>${b.badge ? `<i class="mb-badge">${b.badge}</i>` : ''}${armed ? '<em>¿Seguro?</em>' : ''}</button>`;
  }

  private infoHtml(sel: Entity[]): string {
    const g = this.s.game;
    if (sel.length > 1) {
      // Selección múltiple: una ficha por tipo (tocar = quedarse solo con ese tipo)
      const byType = new Map<string, Entity[]>();
      for (const e of sel) byType.set(e.defId, [...(byType.get(e.defId) ?? []), e]);
      const chips = [...byType.entries()].slice(0, 6).map(([id, es]) => {
        const e = es[0];
        return `<button class="m-chip" data-type="${id}" style="border-color:${g.players[e.owner].color}">${pic(g, e.kind === 'unit' ? 'unit' : 'building', id, e.owner)}<b>${es.length}</b></button>`;
      }).join('');
      return `<div class="m-multi"><span class="m-count">${sel.length}</span>${chips}</div>`;
    }
    const e = sel[0];
    const owner = g.players[e.owner];
    let icon: string, name: string, line = '';
    let pct = -1;
    if (e.kind === 'resource') {
      const nd = g.reg.resourceNodes.get(e.defId)!;
      const r = g.reg.resources.get(nd.resource);
      icon = pic(g, 'resource', e.defId, 0); name = nd.name;
      line = `${r?.icon ?? ''} ${Math.ceil(e.amount)}`;
    } else {
      const def = g.defOf(e);
      icon = pic(g, e.kind === 'unit' ? 'unit' : 'building', e.defId, e.owner); name = def.name;
      pct = Math.max(0, e.hp / e.maxHp) * 100;
      if (e.owner !== g.humanId) line = `<span style="color:${owner.color}">${esc(owner.name)}</span>`;
      else if (e.kind === 'unit') {
        line = taskText(g, e);
        if (e.carry && e.carry.amount > 0) line += ` · ${g.reg.resources.get(e.carry.type)?.icon ?? ''} ${Math.floor(e.carry.amount)}`;
      } else if (!e.complete) line = `En construcción: ${Math.floor(e.progress * 100)} %`;
      else if (g.buildingDef(e).gatherable) line = `🍖 ${Math.ceil(e.amount)}`;
      else line = `${Math.ceil(e.hp)}/${Math.round(e.maxHp)}`;
      // Relieve: ventaja o desventaja de altura (el detalle, en la interfaz de escritorio)
      const adv = e.data.heightAdv as { range: number; damage: number; until: number } | undefined;
      if (adv && adv.until >= g.time && (adv.range > 0 || adv.damage !== 0)) {
        line += adv.damage > 0 || adv.range > 0 ? ' · <span class="hg-up">▲ altura</span>' : ' · <span class="hg-down">▼ cuesta arriba</span>';
      }
    }
    let queue = '';
    if (e.kind === 'building' && e.owner === g.humanId && e.queue.length) {
      queue = `<div class="m-queue">${e.queue.slice(0, 5).map((q, i) => {
        const d = q.kind === 'unit' ? g.reg.unit(q.id) : g.reg.tech(q.id);
        const ic = q.kind === 'unit' ? pic(g, 'unit', q.id, e.owner) : `<span>${d.icon}</span>`;
        const key = `q${i}`;
        return `<button class="m-q${this.armed?.key === key ? ' armed' : ''}" data-q="${i}" data-mt="${key}">${ic}${i === 0 ? `<i style="width:${q.progress * 100}%"></i>` : ''}</button>`;
      }).join('')}${e.queue.length > 5 ? `<span class="m-more">+${e.queue.length - 5}</span>` : ''}</div>`;
    }
    return `<div class="m-port" style="border-color:${owner.color}">${icon}</div>
      <div class="m-txt"><b>${esc(name)}</b>${pct >= 0 ? `<div class="m-hp"><i style="width:${pct}%"></i></div>` : ''}<small>${line}</small></div>${queue}`;
  }

  private refreshTray() {
    const g = this.s.game, ui = this.s.ui;
    const sel = ui.selected(g);
    this.root.classList.toggle('has-sel', sel.length > 0);
    this.root.classList.toggle('folded', this.folded);
    if (!sel.length) { this.set = null; this.trayBtns = []; this.setHtml('info', this.el.info, ''); this.setHtml('acts', this.el.acts, ''); return; }
    this.set = selectionCommands(this.s);
    this.trayBtns = this.trayActions(this.set);
    this.setHtml('info', this.el.info, this.infoHtml(sel));
    this.setHtml('acts', this.el.acts, this.trayBtns.map((b, i) => this.btnHtml(b, `t${i}`)).join(''));
  }

  // ------------------------------------------------------------ hoja de construcción / entrenamiento

  private openSheet(tab: Tab) {
    this.sheetTab = tab;
    if (tab === 'economy' || tab === 'military') this.lastBuildTab = tab;
    this.root.classList.add('sheet-open');
    this.sig.sheet = '';
    this.renderSheet();
  }

  private closeSheet() {
    if (!this.sheetTab) return;
    this.sheetTab = null;
    this.sheetBtns = [];
    this.root.classList.remove('sheet-open');
  }

  private renderSheet() {
    const set = this.set ?? selectionCommands(this.s);
    const tabs = this.tabsFor(set);
    if (!tabs.length) { this.closeSheet(); return; }
    if (!this.sheetTab || !tabs.includes(this.sheetTab)) this.sheetTab = tabs[0];
    const tab = this.sheetTab;
    let btns: Btn[] = [];
    if ((tab === 'economy' || tab === 'military') && set.build) btns = set.build[tab].items.map(c => this.btnFromCmd(c));
    else if (tab === 'units') btns = set.train.map(c => this.btnFromCmd(c));
    else if (tab === 'techs') btns = set.research.map(c => this.btnFromCmd(c));
    else if (tab === 'actions') {
      if (set.attackMove) btns.push(this.btnFromCmd(set.attackMove));
      if (set.explore) btns.push(this.btnFromCmd(set.explore));
      if (set.stop) btns.push(this.btnFromCmd(set.stop));
      btns.push({ icon: '🎯', label: 'Centrar', ok: true, tip: '<b>Centrar la cámara</b> en la selección', run: () => this.s.input.centerOnSelection() });
      const d = this.delBtn(set);
      if (d) btns.push(d);
    }
    this.sheetBtns = btns;
    this.setHtml('tabs', this.el.tabs, tabs.map(t => `<button class="m-tab${t === tab ? ' on' : ''}" data-tab="${t}">${TAB_NAMES[t]}</button>`).join('')
      + '<button class="mbtn m-close" data-a="sheet-close" aria-label="Cerrar">✖</button>');
    this.setHtml('sheet', this.el.grid, btns.map((b, i) => {
      const key = `s${i}`, armed = this.armed?.key === key;
      // Coste debajo del icono solo con iconos y números (la descripción, con pulsación larga)
      const cost = b.cost ?? '';
      return `<button class="m-cell${b.ok ? '' : ' off'}${armed ? ' armed' : ''}" data-b="${key}" data-mt="${key}">
        <span class="ic">${b.icon}</span>${b.badge ? `<i class="mb-badge">${b.badge}</i>` : ''}
        <span class="lbl">${armed ? '¿Seguro?' : esc(b.label)}</span>${cost ? `<span class="cst">${cost}</span>` : ''}</button>`;
    }).join('') || '<div class="m-empty">Nada disponible</div>');
  }

  // ------------------------------------------------------------ colocar edificios

  private refreshPlace() {
    const g = this.s.game, ui = this.s.ui, pl = ui.placing!;
    const def = g.reg.building(pl.defId);
    this.el['m-place'].classList.toggle('invalid', !pl.valid);
    this.setHtml('place', this.el.placeInfo, `<b>${esc(def.name)}</b><span>${costText(g, g.human.getCost(def))}</span><small>Arrastra para moverlo</small>`);
  }

  // ------------------------------------------------------------ toques

  private disarm() {
    if (!this.armed) return;
    clearTimeout(this.armed.timer);
    this.armed = null;
    this.sig.acts = ''; this.sig.sheet = ''; this.sig.info = '';
  }

  /** Primer toque en una acción destructiva: se arma. Devuelve true si ya estaba armada (hay que ejecutarla). */
  private confirmed(key: string): boolean {
    if (this.armed?.key === key) { this.disarm(); return true; }
    this.disarm();
    haptic(8);
    this.armed = { key, timer: window.setTimeout(() => { this.disarm(); this.acc = 1; }, ARM_MS) };
    this.acc = 1;
    this.update(0);
    return false;
  }

  private runBtn(b: Btn, key: string, fromSheet: boolean) {
    if (b.confirm && !this.confirmed(key)) return;
    if (!b.confirm) this.disarm();
    b.run();
    if (b.ok) haptic(8);
    if (fromSheet && b.ok && !b.keepOpen) this.closeSheet();
    this.sig = {};
    this.acc = 1;
  }

  private onClick(e: MouseEvent) {
    const t = e.target as HTMLElement;
    const g = this.s.game, ui = this.s.ui, input = this.s.input;
    const b = t.closest('[data-b]') as HTMLElement | null;
    if (b) {
      const key = b.dataset.b!;
      const list = key[0] === 's' ? this.sheetBtns : this.trayBtns;
      const btn = list[Number(key.slice(1))];
      if (btn) this.runBtn(btn, key, key[0] === 's');
      return;
    }
    const tab = t.closest('[data-tab]') as HTMLElement | null;
    if (tab) { this.openSheet(tab.dataset.tab as Tab); return; }
    const chip = t.closest('[data-type]') as HTMLElement | null;
    if (chip) { ui.setSelection(ui.selected(g).filter(x => x.defId === chip.dataset.type).map(x => x.id)); return; }
    const q = t.closest('[data-q]') as HTMLElement | null;
    if (q) {
      const key = `q${q.dataset.q}`;
      if (!this.confirmed(key)) return;
      const bld = ui.selected(g)[0];
      if (bld && bld.owner === g.humanId) Commands.cancel(g, bld, Number(q.dataset.q));
      this.acc = 1;
      return;
    }
    const grp = t.closest('[data-g]') as HTMLElement | null;
    if (grp) { this.onGroupClick(Number(grp.dataset.g)); return; }
    const sc = t.closest('[data-screen]') as HTMLElement | null;
    if (sc) { this.openScreen(sc.dataset.screen as Screen); return; }
    const a = (t.closest('[data-a]') as HTMLElement | null)?.dataset.a;
    if (!a) return;
    switch (a) {
      case 'menu': this.openScreen('game'); break;
      case 'idle': input.nextIdleVillager(); break;
      case 'army': input.selectArmy(); break;
      case 'alerts': {
        const last = this.alerts.pop();
        if (!last) { g.notify('Sin alertas recientes', g.humanId); break; }
        this.s.renderer.cam.centerOn(last.x, last.y);
        ui.pings.push({ x: last.x, y: last.y, t: g.time });
        break;
      }
      case 'strategy': g.notify('Pantalla de estrategia: próximamente', g.humanId); break;
      case 'mode': input.cameraMode = !input.cameraMode; haptic(8); this.acc = 1; break;
      case 'mini-toggle': this.setMini(this.mini === 'small' ? 'normal' : 'small'); break;
      case 'mini-full': this.setMini(this.mini === 'full' ? 'normal' : 'full'); break;
      case 'fold': this.folded = !this.folded; this.acc = 1; break;
      case 'sheet-close': this.closeSheet(); break;
      case 'cancel-target': input.cancelTargeting(); break;
      case 'place-cancel': input.cancelTargeting(); break;
      case 'place-ok':
        if (!ui.placing?.valid) { g.reject(g.humanId, 'placement', 'No se puede construir ahí'); break; }
        input.confirmPlacement();
        break;
      case 'screen-close': this.closeScreen(true); break;
      case 'hint-ok': setUIPrefs({ hintSeen: true }); this.closeScreen(true); break;
      case 'resume': this.closeScreen(true); break;
      case 'restart': if (this.confirmed('restart')) this.s.app.restart(); else this.renderScreen(); break;
      case 'to-menu': if (this.confirmed('to-menu')) this.s.app.toMenu(); else this.renderScreen(); break;
      case 'show-hint': this.closeScreen(false); this.showHint(); break;
      case 'scale': setUIPrefs({ scale: Number((t.closest('[data-v]') as HTMLElement).dataset.v) }); this.renderScreen(); requestAnimationFrame(() => this.s.minimap.resize()); break;
      case 'haptics': setUIPrefs({ haptics: !uiPrefs().haptics }); haptic(15); this.renderScreen(); break;
    }
  }

  // ------------------------------------------------------------ grupos de control (tocar = seleccionar, mantener = guardar)

  private onGroupDown(e: TouchEvent | MouseEvent) {
    const b = (e.target as HTMLElement).closest('[data-g]') as HTMLElement | null;
    if (!b) return;
    this.onGroupUp(true);
    const k = Number(b.dataset.g);
    const gp = { k, fired: false, timer: 0 };
    gp.timer = window.setTimeout(() => { gp.fired = true; this.s.input.assignGroup(k); this.acc = 1; }, LONG_PRESS_MS);
    this.groupPress = gp;
  }

  private onGroupUp(cancel = false) {
    const gp = this.groupPress;
    if (!gp) return;
    clearTimeout(gp.timer);
    if (cancel) this.groupPress = null;
  }

  private onGroupClick(k: number) {
    const gp = this.groupPress;
    this.groupPress = null;
    // Tras una pulsación larga (guardar grupo) el clic no selecciona
    if (gp?.k === k && gp.fired) return;
    if (!this.s.input.selectGroup(k)) this.s.game.notify(`Mantén pulsado ${k} para guardar la selección como grupo`, this.s.game.humanId);
  }

  // ------------------------------------------------------------ tooltips (pulsación larga, vía HUD)

  private tipFor(el: HTMLElement): string {
    const k = el.dataset.mt!;
    const g = this.s.game;
    if (k[0] === 't') return this.trayBtns[Number(k.slice(1))]?.tip ?? '';
    if (k[0] === 's') return this.sheetBtns[Number(k.slice(1))]?.tip ?? '';
    if (k[0] === 'q') return '<b>Cancelar</b><br>Toca dos veces para quitarlo de la cola.';
    const fixed: Record<string, string> = {
      res: `<b>Recursos</b> · ${esc(g.reg.ageName(g.human.age))} · ${esc(g.human.civ.name)}`,
      alerts: '<b>Alertas</b><br>Lleva la cámara al último ataque o aviso.',
      army: '<b>Ejército</b><br>Selecciona todas tus unidades militares (dos veces: centrar).',
      idle: '<b>Aldeano inactivo</b><br>Selecciona el siguiente aldeano sin tarea.',
      strategy: '<b>Pantalla de estrategia</b><br>Próximamente.',
      menu: '<b>Menú</b><br>Pausa, estadísticas, tecnologías, diplomacia y ajustes.',
      mode: '<b>Arrastrar con un dedo</b><br>⬚ Selección: dibuja un recuadro · ✥ Cámara: mueve el mapa.',
      'mini-full': '<b>Minimapa a pantalla completa</b><br>Toca un punto para ir allí.',
      'mini-toggle': '<b>Plegar o desplegar el minimapa</b>',
    };
    return fixed[k] ?? '';
  }

  // ------------------------------------------------------------ pantallas (menú) y pista de gestos

  private openScreen(sc: Screen) {
    if (!this.screen && !this.hint) this.s.app.setPaused(true, false);
    this.closeSheet();
    this.screen = sc;
    this.root.classList.add('screen-open');
    this.renderScreen();
  }

  private closeScreen(resume: boolean) {
    const was = this.screen || this.hint;
    this.screen = null;
    this.hint = false;
    this.disarm();
    this.root.classList.remove('screen-open', 'hint-open');
    this.el['m-screen'].innerHTML = '';
    this.el['m-hint'].innerHTML = '';
    if (was && resume && this.s.app.paused) this.s.app.setPaused(false);
  }

  showHint() {
    if (!this.screen && !this.hint) this.s.app.setPaused(true, false);
    this.hint = true;
    this.root.classList.add('hint-open');
    this.el['m-hint'].innerHTML = `<div class="m-card"><h2>Controles táctiles</h2>${GESTURE_HELP}
      <button class="m-wide" data-a="hint-ok">Entendido</button></div>`;
  }

  private renderScreen() {
    const sc = this.screen;
    if (!sc) return;
    const g = this.s.game, p = g.human, app = this.s.app;
    const tabs = SCREENS.map(([id, name]) => `<button class="m-tab${id === sc ? ' on' : ''}" data-screen="${id}">${name}</button>`).join('');
    let body = '';
    const armed = (k: string) => this.armed?.key === k;
    if (sc === 'game') {
      const t = Math.floor(g.time);
      body = `<div class="m-col">
        <p class="m-sub">${esc(g.reg.ageName(p.age))} · ${esc(p.civ.name)} · ${Math.floor(t / 60)} min</p>
        <button class="m-wide" data-a="resume">▶ Continuar</button>
        <button class="m-wide${armed('restart') ? ' armed' : ''}" data-a="restart">${armed('restart') ? '¿Seguro? Toca otra vez' : '↻ Reiniciar partida'}</button>
        <button class="m-wide${armed('to-menu') ? ' armed' : ''}" data-a="to-menu">${armed('to-menu') ? '¿Seguro? Toca otra vez' : '☰ Menú principal'}</button>
        <button class="m-wide" data-a="show-hint">✋ Ayuda de gestos</button></div>`;
    } else if (sc === 'stats') {
      const rows = g.players.slice(1).map(q => `<tr style="color:${q.color}"><td>${esc(q.name)}</td><td>${esc(g.reg.ageName(q.age))}</td>
        <td>${q.stats.kills}</td><td>${q.stats.losses}</td><td>${q.stats.razed}</td><td>${Math.floor(q.stats.gathered)}</td><td>${q.defeated ? 'Derrotado' : 'En pie'}</td></tr>`).join('');
      const units = g.units.filter(u => !u.dead && u.owner === p.id).length;
      const blds = g.buildings.filter(b => !b.dead && b.owner === p.id).length;
      body = `<p class="m-sub">Población ${p.popUsed}/${p.popCap} · ${units} unidades · ${blds} edificios · ${p.stats.trained} entrenadas</p>
        <div class="m-scroll"><table class="stats"><tr><th>Jugador</th><th>Edad</th><th>Bajas</th><th>Pérdidas</th><th>Edificios destruidos</th><th>Recursos</th><th>Estado</th></tr>${rows}</table></div>`;
    } else if (sc === 'techs') {
      const done = [...p.researched].filter(id => g.reg.techs.has(id)).map(id => g.reg.tech(id));
      const doing = g.buildings.filter(b => !b.dead && b.owner === p.id).flatMap(b => b.queue.filter(q => q.kind === 'tech').map(q => ({ def: g.reg.tech(q.id), pr: q.progress })));
      body = `<div class="m-scroll">${doing.length ? `<h3>Investigando</h3><ul class="m-list">${doing.map(d => `<li>${d.def.icon} ${esc(d.def.name)} <small>${Math.floor(d.pr * 100)} %</small></li>`).join('')}</ul>` : ''}
        <h3>Investigadas</h3>${done.length ? `<ul class="m-list">${done.map(d => `<li>${d.icon} <b>${esc(d.name)}</b> <small>${esc(d.description)}</small></li>`).join('')}</ul>` : '<p class="m-sub">Todavía ninguna.</p>'}</div>`;
    } else if (sc === 'diplomacy') {
      body = `<div class="m-scroll"><ul class="m-list">${g.players.slice(1).map(q => `<li><span class="swatch" style="background:${q.color}"></span>
        <b>${esc(q.name)}</b> <small>${esc(q.civ.name)}</small> — ${q.id === p.id ? 'Tú' : q.defeated ? 'Derrotado' : g.isEnemy(p.id, q.id) ? '⚔ Enemigo' : '🤝 Aliado'}</li>`).join('')}</ul>
        <p class="m-sub">Las alianzas se eligen al crear la partida.</p></div>`;
    } else {
      const pr = uiPrefs();
      const lay: [LayoutPref, string][] = [['auto', 'Automática'], ['mobile', 'Móvil'], ['desktop', 'Escritorio']];
      body = `<div class="m-scroll"><div class="m-set">
        <label>Interfaz</label><div class="m-seg">${lay.map(([v, l]) => `<button class="${pr.layout === v ? 'on' : ''}" data-layout="${v}">${l}</button>`).join('')}</div>
        <label>Tamaño de los controles</label><div class="m-seg">${UI_SCALES.map(([v, l]) => `<button class="${pr.scale === v ? 'on' : ''}" data-a="scale" data-v="${v}">${l}</button>`).join('')}</div>
        <label>Vibración</label><div class="m-seg"><button class="${pr.haptics ? 'on' : ''}" data-a="haptics">${pr.haptics ? 'Activada' : 'Desactivada'}</button></div>
        ${soundControlsHtml(app.audio, true)}
      </div></div>`;
    }
    this.el['m-screen'].innerHTML = `<div class="m-card wide"><div class="m-tabs">${tabs}<button class="mbtn m-close" data-a="screen-close" aria-label="Cerrar">✖</button></div>${body}</div>`;
    bindSoundControls(this.el['m-screen'], app.audio, () => this.s.hud.updateSoundButton());
    this.el['m-screen'].querySelectorAll<HTMLElement>('[data-layout]').forEach(b => b.addEventListener('click', () => {
      setUIPrefs({ layout: b.dataset.layout as LayoutPref });
      if (isMobileLayout()) this.renderScreen();
    }));
  }
}
