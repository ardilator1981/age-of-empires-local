import { Commands } from '../game/commands';
import type { Entity } from '../game/Entity';
import { buildingAvail } from '../game/rules';
import type { Session } from '../app/Session';

const HOTKEYS = 'QWERTASDFGZXCVB';
/** Pulsación larga (ms) = orden contextual / tooltip. */
export const LONG_PRESS_MS = 400;
/** Distancia (px) a partir de la cual un toque se convierte en arrastre. */
const TOUCH_SLOP = 12;
/** Tras un toque, los eventos de ratón sintéticos del navegador se ignoran durante este tiempo (ms). */
const TOUCH_MOUSE_GUARD = 800;

interface TouchPt { x: number; y: number; x0: number; y0: number }
/** tap: un dedo aún sin moverse · box: recuadro de selección · place: colocando un edificio · pan: dos dedos · done: ya se dio la orden */
type Gesture = 'none' | 'tap' | 'box' | 'place' | 'pan' | 'done';

/** Ratón, teclado y pantalla táctil durante la partida. */
export class Input {
  private keys = new Set<string>();
  private drag: { x: number; y: number } | null = null;
  private pan: { x: number; y: number; cx: number; cy: number } | null = null;
  private lastClick = { t: 0, id: 0 };
  private lastGroupKey = { t: 0, k: -1 };
  private idleIndex = 0;
  private off: (() => void)[] = [];
  // táctil
  private touches = new Map<number, TouchPt>();
  private gesture: Gesture = 'none';
  private pinch: { mx: number; my: number; d: number } | null = null;
  private pressTimer = 0;
  private lastTouchAt = -1e9;
  private lastPlacing: unknown = null;
  private orderBtnState = '';
  /** Botón "Ordenar": mientras está activo, tocar el mapa da una orden en vez de seleccionar. */
  orderMode = false;

  constructor(private s: Session) {
    const canvas = s.renderer.canvas;
    this.listen(canvas, 'mousedown', e => this.onDown(e as MouseEvent));
    this.listen(window, 'mousemove', e => this.onMove(e as MouseEvent));
    this.listen(window, 'mouseup', e => this.onUp(e as MouseEvent));
    this.listen(canvas, 'contextmenu', e => e.preventDefault());
    this.listen(canvas, 'wheel', e => this.onWheel(e as WheelEvent), { passive: false });
    this.listen(window, 'keydown', e => this.onKey(e as KeyboardEvent));
    this.listen(window, 'keyup', e => this.keys.delete((e as KeyboardEvent).key));
    this.listen(window, 'blur', () => this.keys.clear());
    this.listen(document, 'mouseleave', () => { s.ui.mouse.inside = false; });
    const mm = s.minimap.canvas;
    this.listen(mm, 'mousedown', e => this.onMinimap(e as MouseEvent));
    this.listen(mm, 'mousemove', e => { if ((e as MouseEvent).buttons & 1) this.onMinimap(e as MouseEvent); });
    this.listen(mm, 'contextmenu', e => e.preventDefault());

    // Pantalla táctil
    const touchOpts = { passive: false };
    this.listen(canvas, 'touchstart', e => this.onTouchStart(e as TouchEvent), touchOpts);
    this.listen(canvas, 'touchmove', e => this.onTouchMove(e as TouchEvent), touchOpts);
    this.listen(canvas, 'touchend', e => this.onTouchEnd(e as TouchEvent, false), touchOpts);
    this.listen(canvas, 'touchcancel', e => this.onTouchEnd(e as TouchEvent, true), touchOpts);
    this.listen(mm, 'touchstart', e => this.onMinimapTouch(e as TouchEvent, true), touchOpts);
    this.listen(mm, 'touchmove', e => this.onMinimapTouch(e as TouchEvent, false), touchOpts);
    this.listen(window, 'touchstart', () => this.noteTouch(), { capture: true, passive: true });
    // iOS ignora user-scalable=no: evita el zoom de página con dos dedos
    this.listen(document, 'gesturestart', e => e.preventDefault(), touchOpts);

    const btn = (id: string) => document.getElementById(id);
    const order = btn('btn-order'), idle = btn('btn-idle'), panel = btn('btn-panel');
    if (order) this.listen(order, 'click', () => this.toggleOrderMode());
    if (idle) this.listen(idle, 'click', () => { if (this.active) this.nextIdleVillager(); });
    if (panel) this.listen(panel, 'click', () => document.getElementById('hud')!.classList.toggle('collapsed'));
  }

  private listen(t: EventTarget, type: string, fn: (e: Event) => void, opts?: AddEventListenerOptions) {
    t.addEventListener(type, fn, opts);
    this.off.push(() => t.removeEventListener(type, fn, opts));
  }

  dispose() { this.off.forEach(f => f()); clearTimeout(this.pressTimer); }

  private get game() { return this.s.game; }
  private get ui() { return this.s.ui; }
  private get active() { return !this.s.app.paused && !this.s.app.menuOpen; }
  private get recentTouch() { return performance.now() - this.lastTouchAt < TOUCH_MOUSE_GUARD; }

  private ownSelected(): Entity[] {
    return this.ui.selected(this.game).filter(e => e.owner === this.game.humanId);
  }

  private marker(x: number, y: number, color: string) {
    this.ui.markers.push({ x, y, t: performance.now() / 1000, color });
  }

  // ------------------------------------------------------------ acciones comunes (ratón y táctil)

  /** Mueve el fantasma del edificio que se está colocando a un punto de la pantalla. */
  private setGhost(sx: number, sy: number) {
    const { ui, game } = this;
    if (!ui.placing) return;
    const def = game.reg.building(ui.placing.defId);
    const w = this.s.renderer.cam.screenToWorld(sx, sy);
    ui.placing.tx = Math.round(w.x - def.size / 2);
    ui.placing.ty = Math.round(w.y - def.size / 2);
    ui.placing.valid = game.canPlace(def.id, ui.placing.tx, ui.placing.ty, game.humanId);
  }

  /** Coloca el edificio del fantasma. `keep` = seguir colocando otro igual (Mayús). */
  private placeBuilding(keep: boolean) {
    const { ui, game } = this;
    if (!ui.placing) return;
    const { defId, tx, ty } = ui.placing;
    const builders = this.ownSelected().filter(u => u.kind === 'unit' && game.unitDef(u).builder);
    const b = Commands.placeBuilding(game, game.humanId, defId, tx, ty, builders);
    if (b) {
      this.marker(b.x, b.y, '#7dff7d');
      if (!keep || !buildingAvail(game, game.human, defId).ok) { ui.placing = null; ui.page = 'main'; }
    } else {
      const a = buildingAvail(game, game.human, defId);
      game.notify(a.ok ? 'No se puede construir ahí' : a.reason ?? 'No disponible', game.humanId, 'warn');
    }
  }

  private attackMoveAt(sx: number, sy: number, keep: boolean, touch: boolean) {
    const { ui, game } = this;
    const w = this.s.renderer.cam.screenToWorld(sx, sy);
    const units = this.ownSelected().filter(u => u.kind === 'unit');
    const target = this.pick(sx, sy, touch);
    if (target && game.isEnemy(game.humanId, target.owner) && target.kind !== 'resource') Commands.attack(game, units, target);
    else Commands.attackMove(game, units, w.x, w.y);
    this.marker(w.x, w.y, '#ff6b6b');
    if (!keep) ui.targeting = null;
  }

  /** Orden contextual en un punto de la pantalla (clic derecho o pulsación larga). */
  private orderAt(sx: number, sy: number, touch: boolean) {
    const { ui } = this;
    if (ui.placing || ui.targeting) { ui.placing = null; ui.targeting = null; return; }
    const w = this.s.renderer.cam.screenToWorld(sx, sy);
    this.command(w.x, w.y, this.pick(sx, sy, touch));
  }

  /** Busca una entidad bajo el punto; con el dedo se tolera un poco de imprecisión. */
  private pick(sx: number, sy: number, touch: boolean): Entity | null {
    const r = this.s.renderer;
    const hit = r.pickAt(sx, sy);
    if (hit || !touch) return hit;
    for (const [dx, dy] of [[0, -14], [0, 14], [-14, 0], [14, 0], [-10, -10], [10, -10], [-10, 10], [10, 10]]) {
      const h = r.pickAt(sx + dx, sy + dy);
      if (h) return h;
    }
    return null;
  }

  /** Clic o toque simple: seleccionar (dos veces seguidas = todas las de ese tipo en pantalla). */
  private selectAt(sx: number, sy: number, shift: boolean, touch: boolean) {
    const { ui, game } = this;
    const r = this.s.renderer;
    const hit = this.pick(sx, sy, touch);
    const now = performance.now();
    if (!hit) { if (!shift) ui.setSelection([]); return; }
    if (hit.owner === game.humanId && hit.kind === 'unit' && this.lastClick.id === hit.id && now - this.lastClick.t < (touch ? 450 : 350)) {
      // Doble clic: todas las unidades de ese tipo en pantalla
      ui.setSelection(r.drawn.filter(d => d.e.owner === game.humanId && d.e.defId === hit.defId).map(d => d.e.id));
    } else if (shift && hit.owner === game.humanId) {
      const s = new Set(ui.selection);
      if (s.has(hit.id)) s.delete(hit.id); else s.add(hit.id);
      ui.setSelection([...s]);
    } else {
      ui.setSelection([hit.id]);
    }
    this.lastClick = { t: now, id: hit.id };
  }

  private boxSelect(box: { x0: number; y0: number; x1: number; y1: number }, shift: boolean) {
    const { ui, game } = this;
    const units = this.s.renderer.unitsInBox(box.x0, box.y0, box.x1, box.y1, game.humanId);
    if (shift) ui.setSelection([...new Set([...ui.selection, ...units.map(u => u.id)])]);
    else ui.setSelection(units.map(u => u.id));
  }

  // ------------------------------------------------------------ ratón

  private onDown(e: MouseEvent) {
    if (!this.active || this.recentTouch) return;
    const { ui } = this;
    const cam = this.s.renderer.cam;
    if (e.button === 1) {
      e.preventDefault();
      this.pan = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y };
      return;
    }
    if (e.button === 2) { this.orderAt(e.clientX, e.clientY, false); return; }
    if (e.button !== 0) return;

    if (ui.placing) { this.placeBuilding(e.shiftKey); return; }
    if (ui.targeting === 'attackMove') { this.attackMoveAt(e.clientX, e.clientY, e.shiftKey, false); return; }
    this.drag = { x: e.clientX, y: e.clientY };
  }

  /** Orden contextual (clic derecho en el mapa o en el minimapa). */
  private command(x: number, y: number, target: Entity | null) {
    const { game } = this;
    const sel = this.ownSelected();
    const units = sel.filter(u => u.kind === 'unit');
    if (units.length) {
      const res = Commands.smart(game, game.humanId, units, x, y, target);
      const color = res === 'attack' ? '#ff6b6b' : res === 'gather' || res === 'build' ? '#ffd866' : '#7dff7d';
      this.marker(target ? target.x : x, target ? target.y : y, color);
      return;
    }
    const blds = sel.filter(b => b.kind === 'building' && b.complete);
    if (blds.length) {
      for (const b of blds) Commands.setRally(game, b, target ? target.x : x, target ? target.y : y, target);
      this.marker(x, y, '#ffffff');
    }
  }

  private onMove(e: MouseEvent) {
    if (this.recentTouch) return;
    const { ui } = this;
    ui.mouse.x = e.clientX; ui.mouse.y = e.clientY; ui.mouse.inside = true;
    const cam = this.s.renderer.cam;
    if (this.pan) {
      cam.x = this.pan.cx - (e.clientX - this.pan.x) / cam.zoom;
      cam.y = this.pan.cy - (e.clientY - this.pan.y) / cam.zoom;
      return;
    }
    if (this.drag && Math.hypot(e.clientX - this.drag.x, e.clientY - this.drag.y) > 6) {
      ui.dragBox = { x0: this.drag.x, y0: this.drag.y, x1: e.clientX, y1: e.clientY };
    }
    if (ui.placing) this.setGhost(e.clientX, e.clientY);
  }

  private onUp(e: MouseEvent) {
    if (e.button === 1) { this.pan = null; return; }
    if (e.button !== 0 || !this.drag) return;
    const { ui } = this;
    const box = ui.dragBox;
    this.drag = null;
    ui.dragBox = null;
    if (box) this.boxSelect(box, e.shiftKey);
    else this.selectAt(e.clientX, e.clientY, e.shiftKey, false);
  }

  private onWheel(e: WheelEvent) {
    e.preventDefault();
    if (!this.active) return;
    this.s.renderer.cam.zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
  }

  private onMinimap(e: MouseEvent) {
    if (!this.active || this.recentTouch) return;
    const mm = this.s.minimap;
    const rect = mm.canvas.getBoundingClientRect();
    const w = mm.fromMini(e.clientX - rect.left, e.clientY - rect.top);
    if (e.button === 2) { this.command(w.x, w.y, null); return; }
    this.s.renderer.cam.centerOn(w.x, w.y);
  }

  // ------------------------------------------------------------ pantalla táctil

  private noteTouch() {
    this.lastTouchAt = performance.now();
    this.ui.mouse.inside = false;
    document.documentElement.classList.add('touch');
  }

  private firstTouch(): TouchPt | undefined { return this.touches.values().next().value; }

  private pinchState() {
    const [a, b] = [...this.touches.values()];
    return { mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, d: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)) };
  }

  private onTouchStart(e: TouchEvent) {
    e.preventDefault();
    this.noteTouch();
    if (!this.active) return;
    for (const t of e.changedTouches) this.touches.set(t.identifier, { x: t.clientX, y: t.clientY, x0: t.clientX, y0: t.clientY });
    if (this.touches.size >= 2) {
      // Dos dedos: mover la cámara y pellizcar para hacer zoom (anula lo que hiciera el primer dedo)
      clearTimeout(this.pressTimer);
      this.ui.dragBox = null;
      this.gesture = 'pan';
      this.pinch = this.pinchState();
      return;
    }
    if (this.gesture !== 'none') return;
    const p = this.firstTouch()!;
    if (this.ui.placing) { this.gesture = 'place'; this.setGhost(p.x, p.y); return; }
    this.gesture = 'tap';
    clearTimeout(this.pressTimer);
    this.pressTimer = window.setTimeout(() => this.onLongPress(), LONG_PRESS_MS);
  }

  private onTouchMove(e: TouchEvent) {
    e.preventDefault();
    if (!this.active) return;
    for (const t of e.changedTouches) {
      const p = this.touches.get(t.identifier);
      if (p) { p.x = t.clientX; p.y = t.clientY; }
    }
    const { ui } = this;
    if (this.gesture === 'pan') {
      if (this.touches.size < 2 || !this.pinch) return;
      const cam = this.s.renderer.cam, now = this.pinchState();
      cam.zoomAt(now.d / this.pinch.d, now.mx, now.my);
      cam.x -= (now.mx - this.pinch.mx) / cam.zoom;
      cam.y -= (now.my - this.pinch.my) / cam.zoom;
      cam.clamp(this.game.map.w, this.game.map.h);
      this.pinch = now;
      return;
    }
    const p = this.firstTouch();
    if (!p) return;
    if (this.gesture === 'place') { this.setGhost(p.x, p.y); return; }
    if (this.gesture === 'tap' && Math.hypot(p.x - p.x0, p.y - p.y0) > TOUCH_SLOP) {
      clearTimeout(this.pressTimer);
      this.gesture = 'box';
    }
    if (this.gesture === 'box') ui.dragBox = { x0: p.x0, y0: p.y0, x1: p.x, y1: p.y };
  }

  private onTouchEnd(e: TouchEvent, cancelled: boolean) {
    e.preventDefault();
    const gesture = this.gesture;
    const end = e.changedTouches[0];
    for (const t of e.changedTouches) this.touches.delete(t.identifier);
    if (gesture === 'pan' && this.touches.size >= 2) { this.pinch = this.pinchState(); return; }
    // Al levantar uno de los dos dedos, el que queda no hace nada hasta soltarlo
    if (this.touches.size > 0) return;
    clearTimeout(this.pressTimer);
    this.gesture = 'none';
    this.pinch = null;
    const { ui } = this;
    const box = ui.dragBox;
    ui.dragBox = null;
    if (cancelled || !this.active || !end) return;
    const x = end.clientX, y = end.clientY;
    if (gesture === 'place') { this.setGhost(x, y); this.placeBuilding(false); }
    else if (gesture === 'box' && box) this.boxSelect(box, false);
    else if (gesture === 'tap') {
      if (ui.targeting === 'attackMove') this.attackMoveAt(x, y, false, true);
      else if (this.orderMode) this.orderAt(x, y, true);
      else this.selectAt(x, y, false, true);
    }
  }

  private onLongPress() {
    if (this.gesture !== 'tap' || !this.active) return;
    const p = this.firstTouch();
    if (!p) return;
    this.gesture = 'done';
    navigator.vibrate?.(15);
    this.orderAt(p.x, p.y, true);
  }

  private onMinimapTouch(e: TouchEvent, start: boolean) {
    e.preventDefault();
    this.noteTouch();
    if (!this.active || e.touches.length !== 1) return;
    const t = e.touches[0];
    const mm = this.s.minimap;
    const rect = mm.canvas.getBoundingClientRect();
    const w = mm.fromMini(t.clientX - rect.left, t.clientY - rect.top);
    if (this.orderMode) { if (start) this.command(w.x, w.y, null); return; }
    this.s.renderer.cam.centerOn(w.x, w.y);
  }

  private toggleOrderMode() {
    const { ui } = this;
    if (ui.placing || ui.targeting) { ui.placing = null; ui.targeting = null; return; }
    this.orderMode = !this.orderMode;
  }

  /** Botón "Ordenar" de la barra táctil: refleja el modo actual. */
  private refreshTouchButtons() {
    const { ui } = this;
    const st = ui.placing || ui.targeting ? 'cancel' : this.orderMode ? 'on' : 'off';
    if (st === this.orderBtnState) return;
    this.orderBtnState = st;
    const b = document.getElementById('btn-order');
    if (!b) return;
    b.className = `tbtn ${st}`;
    b.innerHTML = st === 'cancel' ? '✖<span>Cancelar</span>' : '🎯<span>Ordenar</span>';
  }

  // ------------------------------------------------------------ teclado

  private onKey(e: KeyboardEvent) {
    const t = e.target as HTMLElement;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
    const app = this.s.app;
    if (e.key === 'F10' || ((e.key === 'p' || e.key === 'P') && !e.ctrlKey && !e.metaKey)) {
      e.preventDefault();
      app.togglePause();
      return;
    }
    if (!this.active) {
      if (e.key === 'Escape' && app.paused) app.togglePause();
      return;
    }
    this.keys.add(e.key);
    const { ui, game } = this;

    if (e.key === 'Escape') {
      if (ui.placing) ui.placing = null;
      else if (ui.targeting) ui.targeting = null;
      else if (ui.page !== 'main') ui.page = 'main';
      else if (ui.selection.length) ui.setSelection([]);
      else app.togglePause();
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      for (const s of this.ownSelected()) Commands.delete(game, s);
      ui.setSelection([]);
      return;
    }
    if (/^[0-9]$/.test(e.key)) {
      const k = Number(e.key);
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        ui.groups[k] = this.ownSelected().map(s => s.id);
        game.notify(`Grupo ${k} asignado`, game.humanId);
      } else {
        const ids = ui.groups[k].filter(id => game.get(id));
        if (ids.length) {
          ui.setSelection(ids);
          const now = performance.now();
          if (this.lastGroupKey.k === k && now - this.lastGroupKey.t < 400) this.centerOnSelection();
          this.lastGroupKey = { t: now, k };
        }
      }
      return;
    }
    if (e.key === ' ') { e.preventDefault(); this.centerOnSelection(); return; }
    if (e.key === 'h' || e.key === 'H') {
      const tc = game.buildings.find(x => !x.dead && x.owner === game.humanId && game.buildingDef(x).classes.includes('townCenter'));
      if (tc) { ui.setSelection([tc.id]); this.s.renderer.cam.centerOn(tc.x, tc.y); }
      return;
    }
    if (e.key === '.') { this.nextIdleVillager(); return; }
    if (e.key === ',') {
      const idle = game.units.filter(x => !x.dead && x.owner === game.humanId && !x.order && !game.unitDef(x).gatherer);
      if (idle.length) ui.setSelection(idle.map(x => x.id));
      return;
    }
    const k = e.key.toUpperCase();
    if (k.length === 1 && HOTKEYS.includes(k) && !e.ctrlKey && !e.metaKey) {
      this.s.hud.pressHotkey(HOTKEYS.indexOf(k), e.shiftKey);
    }
  }

  private nextIdleVillager() {
    const { ui, game } = this;
    const idle = game.units.filter(x => !x.dead && x.owner === game.humanId && !x.order && game.unitDef(x).gatherer);
    if (!idle.length) { game.notify('No hay aldeanos inactivos', game.humanId); return; }
    const u = idle[this.idleIndex++ % idle.length];
    ui.setSelection([u.id]);
    this.s.renderer.cam.centerOn(u.x, u.y);
  }

  private centerOnSelection() {
    const sel = this.ui.selected(this.game);
    if (!sel.length) return;
    const x = sel.reduce((a, s) => a + s.x, 0) / sel.length, y = sel.reduce((a, s) => a + s.y, 0) / sel.length;
    this.s.renderer.cam.centerOn(x, y);
  }

  /** Desplazamiento de cámara con flechas y bordes de pantalla. */
  update(dt: number) {
    this.refreshTouchButtons();
    if (!this.active) return;
    const { ui } = this;
    // En táctil, el fantasma de un edificio recién elegido aparece en el centro de la vista
    if (ui.placing !== this.lastPlacing) {
      this.lastPlacing = ui.placing;
      if (ui.placing && document.documentElement.classList.contains('touch') && this.gesture !== 'place') {
        const cam = this.s.renderer.cam;
        this.setGhost(cam.viewW / 2, cam.viewH * 0.4);
      }
    }
    const cam = this.s.renderer.cam;
    const sp = (900 * dt) / cam.zoom;
    let dx = 0, dy = 0;
    if (this.keys.has('ArrowLeft')) dx -= 1;
    if (this.keys.has('ArrowRight')) dx += 1;
    if (this.keys.has('ArrowUp')) dy -= 1;
    if (this.keys.has('ArrowDown')) dy += 1;
    const m = ui.mouse, E = 6;
    if (m.inside && !this.pan && !this.drag) {
      if (m.x <= E) dx -= 1;
      if (m.x >= cam.viewW - E) dx += 1;
      if (m.y <= E) dy -= 1;
      if (m.y >= cam.viewH - E) dy += 1;
    }
    cam.x += dx * sp;
    cam.y += dy * sp;
    cam.clamp(this.game.map.w, this.game.map.h);
  }
}
