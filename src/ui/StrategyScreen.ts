import type { Session } from '../app/Session';
import { pixelRatio } from '../core/constants';
import type { Pt } from '../core/types';
import { FORMATIONS, type FormationType } from '../game/army/formations';
import { groups, type GroupMode } from '../game/army/groups';
import { STANCES, stanceOf, type Stance } from '../game/army/stances';
import { Commands, formationFor } from '../game/commands';
import type { Entity } from '../game/Entity';
import { setUIPrefs, uiPrefs, type StrategyTime } from './layout';

/**
 * Pantalla de estrategia: formación, postura y órdenes tácticas para el ejército seleccionado
 * o para todo el ejército, con un mapa táctico en el que se tocan los puntos de destino, las
 * rutas de patrulla o los puntos de reunión. La comparten la interfaz de escritorio y la móvil.
 *
 * Contra la IA, mientras está abierta el juego se pausa o va a cámara lenta (ajustable). En una
 * partida en línea (aún no existe) no se toca el tiempo de nadie: solo se muestra el panel.
 */

type Tool = GroupMode | 'rally' | null;
type Scope = 'sel' | 'all';

const ORDERS: { id: Exclude<Tool, null>; icon: string; name: string; hint: string }[] = [
  { id: 'attack', icon: '🎯', name: 'Avanzar atacando', hint: 'Toca el destino. Avanzan en formación y luchan con lo que encuentren.' },
  { id: 'move', icon: '🚶', name: 'Mover', hint: 'Toca el destino. Van en formación sin pararse a luchar.' },
  { id: 'retreat', icon: '↩️', name: 'Retirada', hint: 'Toca adónde retirarse (o confirma: a la base). No luchan por el camino.' },
  { id: 'patrol', icon: '🔁', name: 'Patrullar', hint: 'Toca dos o más puntos de la ruta y confirma.' },
  { id: 'escort', icon: '🛡️', name: 'Escoltar', hint: 'Toca la unidad que quieres proteger (por ejemplo, el General).' },
  { id: 'zone', icon: '⭕', name: 'Mantener zona', hint: 'Toca el centro de la zona que deben defender.' },
  { id: 'rally', icon: '🚩', name: 'Punto de reunión', hint: 'Toca dónde se reúnen las tropas nuevas de tus edificios militares.' },
];

const PICKS: { id: string; icon: string; name: string; test: (s: Session, e: Entity) => boolean }[] = [
  { id: 'all', icon: '⚔️', name: 'Todo el ejército', test: () => true },
  { id: 'inf', icon: '🗡️', name: 'Infantería', test: (s, e) => { const d = s.game.unitDef(e); return !d.classes.includes('cavalry') && !d.classes.includes('siege') && s.game.human.getStat(d, 'range') < 1; } },
  { id: 'arch', icon: '🏹', name: 'A distancia', test: (s, e) => { const d = s.game.unitDef(e); return !d.classes.includes('siege') && !d.classes.includes('cavalry') && s.game.human.getStat(d, 'range') >= 1; } },
  { id: 'cav', icon: '🐎', name: 'Caballería', test: (s, e) => s.game.unitDef(e).classes.includes('cavalry') },
  { id: 'siege', icon: '🪵', name: 'Asedio', test: (s, e) => s.game.unitDef(e).classes.includes('siege') },
];

const TIMES: [StrategyTime, string][] = [['pause', '⏸ Pausa'], ['slow', '🐢 Cámara lenta'], ['normal', '▶ Normal']];

function esc(s: string) {
  return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

export class StrategyScreen {
  readonly root: HTMLElement;
  open = false;
  private scope: Scope = 'sel';
  private tool: Tool = null;
  private points: Pt[] = [];
  private escortId = 0;
  private canvas!: HTMLCanvasElement;
  private base: HTMLCanvasElement | null = null;
  private sig = '';
  private size = 300;
  private onKey = (e: KeyboardEvent) => {
    if (!this.open) return;
    if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); this.close(); }
  };

  constructor(private s: Session) {
    this.root = document.createElement('div');
    this.root.id = 'strategy';
    document.getElementById('hud')!.appendChild(this.root);
    this.root.addEventListener('click', e => this.onClick(e));
    window.addEventListener('keydown', this.onKey, true);
  }

  dispose() {
    window.removeEventListener('keydown', this.onKey, true);
    if (this.open) this.close();
    this.root.remove();
  }

  /** Tropas sobre las que actúa: la selección (si tiene tropas) o todo el ejército. */
  private troops(): Entity[] {
    const g = this.s.game;
    const mil = (e: Entity) => e.kind === 'unit' && !e.dead && e.owner === g.humanId && !g.unitDef(e).gatherer && (g.unitDef(e).attack ?? 0) > 0;
    if (this.scope === 'sel') {
      const sel = this.s.ui.selected(g).filter(mil);
      if (sel.length) return sel;
    }
    return g.units.filter(mil);
  }

  toggle() { if (this.open) this.close(); else this.show(); }

  show() {
    if (this.open) return;
    const g = this.s.game, app = this.s.app;
    this.open = true;
    this.tool = null; this.points = []; this.escortId = 0;
    this.scope = this.s.ui.selected(g).some(e => e.owner === g.humanId && e.kind === 'unit' && !g.unitDef(e).gatherer) ? 'sel' : 'all';
    this.root.classList.add('open');
    this.base = null;
    this.sig = '';
    this.render();
    this.applyTime();
    void app;
  }

  close() {
    if (!this.open) return;
    this.open = false;
    this.root.classList.remove('open');
    this.root.innerHTML = '';
    const app = this.s.app;
    app.timeScale = 1;
    if (this.pausedByMe) { this.pausedByMe = false; app.setPaused(false); }
  }

  private pausedByMe = false;

  /** Pausa o cámara lenta mientras está abierta (solo contra la IA). */
  private applyTime() {
    const app = this.s.app, g = this.s.game;
    if (g.opts.online) return;
    const t = uiPrefs().strategyTime;
    app.timeScale = t === 'slow' ? 0.25 : 1;
    if (t === 'pause' && !app.paused) { app.setPaused(true, false); this.pausedByMe = true; }
    if (t !== 'pause' && this.pausedByMe) { this.pausedByMe = false; app.setPaused(false); }
  }

  // ------------------------------------------------------------ interfaz

  private render() {
    const g = this.s.game, troops = this.troops();
    const nSel = this.s.ui.selected(g).filter(e => e.owner === g.humanId && e.kind === 'unit' && !g.unitDef(e).gatherer && (g.unitDef(e).attack ?? 0) > 0).length;
    const nAll = g.units.filter(e => !e.dead && e.owner === g.humanId && !g.unitDef(e).gatherer && (g.unitDef(e).attack ?? 0) > 0).length;
    const form = troops.length ? formationFor(troops) : null;
    const stances = new Set(troops.map(stanceOf));
    const stance = stances.size === 1 ? [...stances][0] : null;
    const time = uiPrefs().strategyTime;
    const tool = ORDERS.find(o => o.id === this.tool);
    const ui = this.s.ui;
    const grp = [1, 2, 3, 4, 5].map(k => {
      const n = ui.groups[k].filter(id => g.get(id)).length;
      return `<button class="st-b small${n ? '' : ' empty'}" data-grp="${k}" title="Tocar: seleccionar · Mayús o ‘Guardar’: guardar">${k}${n ? `<i>${n}</i>` : ''}</button>`;
    }).join('');
    const confirm = tool ? `<div class="st-tool">
        <p><b>${tool.icon} ${tool.name}</b> — ${tool.hint}</p>
        <p class="st-pts">${this.tool === 'escort' ? (this.escortId && g.get(this.escortId) ? `Proteger: <b>${esc(g.unitDef(g.get(this.escortId)!).name)}</b>` : 'Ninguna unidad elegida') : `${this.points.length} punto${this.points.length === 1 ? '' : 's'}`}</p>
        <div class="st-row">
          <button class="st-b ok" data-a="confirm">✔ Ordenar</button>
          ${this.tool === 'patrol' ? '<button class="st-b" data-a="undo">↶ Deshacer</button>' : ''}
          <button class="st-b" data-a="tool-cancel">✖</button>
        </div></div>` : '';
    const head = `<b>📜 Estrategia</b>
        <div class="st-seg"><button class="${this.scope === 'sel' ? 'on' : ''}" data-scope="sel">Selección (${nSel})</button><button class="${this.scope === 'all' ? 'on' : ''}" data-scope="all">Todo el ejército (${nAll})</button></div>
        <button class="st-b close" data-a="close" aria-label="Cerrar">✖</button>`;
    const side = `${confirm}
          <section><h3>Seleccionar</h3><div class="st-row wrap">${PICKS.map(p => `<button class="st-b" data-pick="${p.id}">${p.icon}<span>${p.name}</span></button>`).join('')}</div>
            <div class="st-row grp"><span>Grupos</span>${grp}<button class="st-b small" data-a="save-mode">${this.saveMode ? '💾 Toca un número' : '💾 Guardar'}</button></div></section>
          <section><h3>Formación</h3><div class="st-row wrap">${FORMATIONS.map(f => `<button class="st-b${form === f.id ? ' on' : ''}" data-form="${f.id}" title="${esc(f.desc)}">${f.icon}<span>${f.name}</span></button>`).join('')}</div></section>
          <section><h3>Postura</h3><div class="st-row wrap">${STANCES.map(st => `<button class="st-b${stance === st.id ? ' on' : ''}" data-stance="${st.id}" title="${esc(st.desc)}">${st.icon}<span>${st.name}</span></button>`).join('')}</div></section>
          <section><h3>Órdenes</h3><div class="st-row wrap">${ORDERS.map(o => `<button class="st-b${this.tool === o.id ? ' on' : ''}" data-tool="${o.id}">${o.icon}<span>${o.name}</span></button>`).join('')}<button class="st-b" data-a="stop">✋<span>Detener</span></button></div></section>
          <section><h3>Mientras está abierta</h3><div class="st-seg">${TIMES.map(([v, l]) => `<button class="${time === v ? 'on' : ''}" data-time="${v}">${l}</button>`).join('')}</div>
            ${g.opts.online ? '<p class="st-note">Partida en línea: el tiempo no se detiene.</p>' : ''}</section>`;
    // El esqueleto (y el lienzo del mapa) se crea una vez; luego solo cambian la cabecera y el panel
    if (!this.root.firstElementChild) {
      this.root.innerHTML = `<div class="st-card"><div class="st-head"></div><div class="st-body">
        <div class="st-map"><canvas></canvas><div class="st-maphint"></div></div><div class="st-side"></div></div></div>`;
      this.canvas = this.root.querySelector('canvas')!;
      this.canvas.addEventListener('click', e => this.onMap(e));
      this.sig = '';
    }
    const sig = head + side;
    if (sig !== this.sig) {
      this.sig = sig;
      this.root.querySelector('.st-head')!.innerHTML = head;
      this.root.querySelector('.st-side')!.innerHTML = side;
    }
    this.root.querySelector('.st-maphint')!.textContent = tool ? tool.hint : 'Elige una orden y toca el mapa';
    this.draw();
  }

  private saveMode = false;

  private acc = 0;
  /** Refresco mientras está abierta (los contadores y el mapa táctico). */
  update(dt: number) {
    if (!this.open) return;
    this.acc += dt;
    if (this.acc < 0.15) return;
    this.acc = 0;
    this.render();
  }

  private onClick(e: MouseEvent) {
    const t = e.target as HTMLElement;
    const g = this.s.game, ui = this.s.ui;
    const el = t.closest('button') as HTMLElement | null;
    if (!el) return;
    const d = el.dataset;
    const troops = this.troops();
    if (d.a === 'close') { this.close(); return; }
    if (d.scope) this.scope = d.scope as Scope;
    else if (d.pick) {
      const p = PICKS.find(x => x.id === d.pick)!;
      const mil = g.units.filter(u => !u.dead && u.owner === g.humanId && !g.unitDef(u).gatherer && (g.unitDef(u).attack ?? 0) > 0 && p.test(this.s, u));
      if (!mil.length) g.notify(`No tienes ${p.name.toLowerCase()}`, g.humanId);
      ui.setSelection(mil.map(u => u.id));
      this.scope = 'sel';
    } else if (d.grp) {
      const k = Number(d.grp);
      if (this.saveMode || e.shiftKey) {
        if (!troops.length) return;
        ui.groups[k] = troops.map(u => u.id);
        g.notify(`Grupo ${k}: ${troops.length} unidades`, g.humanId);
        this.saveMode = false;
      } else {
        const ids = ui.groups[k].filter(id => g.get(id));
        if (ids.length) { ui.setSelection(ids); this.scope = 'sel'; }
      }
    } else if (d.a === 'save-mode') this.saveMode = !this.saveMode;
    else if (d.form) {
      if (!troops.length) return;
      Commands.setFormation(g, troops, d.form as FormationType);
    } else if (d.stance) {
      if (!troops.length) return;
      Commands.setStance(g, troops, d.stance as Stance);
    } else if (d.tool) {
      this.tool = this.tool === d.tool ? null : d.tool as Tool;
      this.points = []; this.escortId = 0;
      // La escolta del General es lo más habitual: se propone sola
      if (this.tool === 'escort') {
        const gen = g.units.find(u => !u.dead && u.owner === g.humanId && g.unitDef(u).aura && !troops.includes(u));
        if (gen) this.escortId = gen.id;
      }
    } else if (d.a === 'stop') { Commands.stop(g, troops); g.notify('✋ Alto', g.humanId); }
    else if (d.a === 'undo') this.points.pop();
    else if (d.a === 'tool-cancel') { this.tool = null; this.points = []; }
    else if (d.a === 'confirm') { this.confirm(troops); return; }
    else if (d.time) { setUIPrefs({ strategyTime: d.time as StrategyTime }); this.applyTime(); }
    this.render();
  }

  private confirm(troops: Entity[]) {
    const g = this.s.game, tool = this.tool;
    if (!tool) return;
    if (tool === 'rally') {
      const p = this.points[0];
      if (!p) { g.notify('Toca un punto en el mapa', g.humanId, 'warn'); return; }
      const blds = g.buildings.filter(b => !b.dead && b.complete && b.owner === g.humanId && g.buildingDef(b).category === 'military');
      for (const b of blds) Commands.setRally(g, b, p.x, p.y);
      g.notify(`🚩 Punto de reunión para ${blds.length} edificios militares`, g.humanId);
      this.tool = null; this.points = [];
      this.render();
      return;
    }
    if (!troops.length) { g.notify('No tienes tropas', g.humanId, 'warn'); return; }
    let points = [...this.points];
    if (tool === 'retreat' && !points.length) {
      const tc = g.buildings.find(b => !b.dead && b.owner === g.humanId && g.buildingDef(b).classes.includes('townCenter'));
      if (tc) points = [g.findFreeTile(tc.x + tc.size, tc.y + tc.size, 6) ?? { x: tc.x, y: tc.y }];
    }
    if (tool === 'patrol' && points.length === 1) {
      const c = { x: troops.reduce((s, u) => s + u.x, 0) / troops.length, y: troops.reduce((s, u) => s + u.y, 0) / troops.length };
      points = [points[0], c];
    }
    if (tool === 'escort' && !g.get(this.escortId)) { g.notify('Toca la unidad que quieres proteger', g.humanId, 'warn'); return; }
    if (tool !== 'escort' && !points.length) { g.notify('Toca un punto en el mapa', g.humanId, 'warn'); return; }
    const grp = Commands.army(g, troops, { kind: tool, points, targetId: this.escortId || undefined });
    if (!grp) { g.notify('No se pudo dar la orden', g.humanId, 'warn'); return; }
    // Orden dada: se cierra y sigue el juego
    this.close();
  }

  // ------------------------------------------------------------ mapa táctico

  private get k() { const m = this.s.game.map; return this.size / (m.w + m.h); }
  private toMap(x: number, y: number): Pt { const k = this.k, m = this.s.game.map; return { x: (x - y) * k + m.h * k, y: ((x + y) * k) / 2 + this.size / 4 }; }
  private fromMap(mx: number, my: number): Pt {
    const k = this.k, m = this.s.game.map;
    const a = (mx - m.h * k) / k, b = ((my - this.size / 4) * 2) / k;
    return { x: (a + b) / 2, y: (b - a) / 2 };
  }

  private onMap(e: MouseEvent) {
    const g = this.s.game;
    const r = this.canvas.getBoundingClientRect();
    // El rombo se dibuja subido S/4 (ver draw): se deshace aquí
    const p = this.fromMap(e.clientX - r.left, e.clientY - r.top + this.size / 4 - 1);
    if (p.x < 0 || p.y < 0 || p.x >= g.map.w || p.y >= g.map.h) return;
    if (!this.tool) { this.s.renderer.cam.centerOn(p.x, p.y); return; }
    if (this.tool === 'escort') {
      const troops = this.troops();
      let best: Entity | null = null, bd = 4;
      for (const u of g.units) {
        if (u.dead || u.owner !== g.humanId || troops.includes(u)) continue;
        const d = Math.hypot(u.x - p.x, u.y - p.y);
        if (d < bd) { bd = d; best = u; }
      }
      if (best) this.escortId = best.id;
      else g.notify('Toca cerca de una unidad tuya que no esté en el grupo', g.humanId, 'warn');
    } else if (this.tool === 'patrol') this.points.push(p);
    else this.points = [p];
    this.render();
  }

  private draw() {
    const c = this.canvas;
    if (!c) return;
    const g = this.s.game, m = g.map, rend = this.s.renderer;
    const box = c.parentElement!.getBoundingClientRect();
    const S = Math.max(160, Math.floor(Math.min(box.width, box.height * 2)));
    const dpr = pixelRatio();
    if (this.size !== S || c.width !== S * dpr) {
      this.size = S;
      c.width = S * dpr; c.height = (S / 2) * dpr + 2 * dpr;
      c.style.width = `${S}px`; c.style.height = `${S / 2 + 2}px`;
    }
    const ctx = c.getContext('2d')!;
    if (!this.base) {
      const src = rend.minimapPixels;
      if (src) {
        this.base = document.createElement('canvas');
        this.base.width = m.w; this.base.height = m.h;
        this.base.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(src.data), m.w, m.h), 0, 0);
      }
    }
    const k = this.k, oy = -S / 4 + 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, S, S);
    ctx.setTransform(dpr * k, (dpr * k) / 2, -dpr * k, (dpr * k) / 2, dpr * m.h * k, dpr * oy + dpr * S / 4);
    ctx.imageSmoothingEnabled = false;
    if (this.base) ctx.drawImage(this.base, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(rend.fogCanvas, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, dpr * oy);
    const troops = new Set(this.troops().map(u => u.id));
    // Edificios y unidades visibles
    for (const e of g.actors) {
      if (e.dead || !rend.isVisible(e)) continue;
      const q = this.toMap(e.x, e.y);
      ctx.fillStyle = g.players[e.owner].color;
      if (e.kind === 'building') { const s = Math.max(3, e.size * k * 1.2); ctx.fillRect(q.x - s / 2, q.y - s / 4, s, s / 2); continue; }
      const sel = troops.has(e.id);
      ctx.beginPath(); ctx.arc(q.x, q.y, sel ? 3 : 1.8, 0, Math.PI * 2); ctx.fill();
      if (sel) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke(); }
    }
    // Grupos propios en marcha: su ruta y su zona
    for (const grp of groups(g)) {
      if (grp.owner !== g.humanId) continue;
      ctx.strokeStyle = grp.mode === 'retreat' ? 'rgba(160,200,255,0.9)' : grp.mode === 'move' ? 'rgba(255,255,255,0.8)' : 'rgba(255,120,90,0.9)';
      ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
      ctx.beginPath();
      const p0 = this.toMap(grp.pos.x, grp.pos.y); ctx.moveTo(p0.x, p0.y);
      const pts = grp.mode === 'patrol' ? [...grp.route.slice(grp.ri), ...grp.route.slice(0, grp.ri + 1)] : grp.route.slice(grp.ri);
      for (const p of pts) { const q = this.toMap(p.x, p.y); ctx.lineTo(q.x, q.y); }
      ctx.stroke(); ctx.setLineDash([]);
      if (grp.zone) this.ellipse(ctx, grp.zone, grp.zone.r, 'rgba(255,210,110,0.9)');
    }
    // Lo que se está dibujando ahora
    if (this.points.length) {
      ctx.strokeStyle = '#ffe08a'; ctx.fillStyle = '#ffe08a'; ctx.lineWidth = 2;
      ctx.beginPath();
      this.points.forEach((p, i) => { const q = this.toMap(p.x, p.y); if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); });
      if (this.tool === 'patrol' && this.points.length > 1) { const q = this.toMap(this.points[0].x, this.points[0].y); ctx.lineTo(q.x, q.y); }
      ctx.stroke();
      this.points.forEach((p, i) => {
        const q = this.toMap(p.x, p.y);
        ctx.beginPath(); ctx.arc(q.x, q.y, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(String(i + 1), q.x, q.y + 3); ctx.fillStyle = '#ffe08a';
      });
      if (this.tool === 'zone') this.ellipse(ctx, this.points[0], 6, '#ffe08a');
    }
    if (this.tool === 'escort' && this.escortId) {
      const t = g.get(this.escortId);
      if (t) { const q = this.toMap(t.x, t.y); ctx.strokeStyle = '#7dff7d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(q.x, q.y, 7, 0, Math.PI * 2); ctx.stroke(); }
    }
    // Lo que se ve en pantalla
    const cam = rend.cam;
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1;
    ctx.beginPath();
    [[0, 0], [cam.viewW, 0], [cam.viewW, cam.viewH], [0, cam.viewH]].forEach(([x, y], i) => {
      const w = cam.screenToWorld(x, y), q = this.toMap(w.x, w.y);
      if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y);
    });
    ctx.closePath(); ctx.stroke();
    ctx.textAlign = 'left';
  }

  private ellipse(ctx: CanvasRenderingContext2D, c: Pt, r: number, color: string) {
    ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i <= 36; i++) {
      const t = (i / 36) * Math.PI * 2, q = this.toMap(c.x + Math.cos(t) * r, c.y + Math.sin(t) * r);
      if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y);
    }
    ctx.stroke();
  }
}
