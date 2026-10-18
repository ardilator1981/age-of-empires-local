import { Commands } from '../game/commands';
import type { Entity } from '../game/Entity';
import { buildingAvail } from '../game/rules';
import type { Session } from '../app/Session';

const HOTKEYS = 'QWERTASDFGZXCVB';

/** Ratón y teclado durante la partida. */
export class Input {
  private keys = new Set<string>();
  private drag: { x: number; y: number } | null = null;
  private pan: { x: number; y: number; cx: number; cy: number } | null = null;
  private lastClick = { t: 0, id: 0 };
  private lastGroupKey = { t: 0, k: -1 };
  private idleIndex = 0;
  private off: (() => void)[] = [];

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
  }

  private listen(t: EventTarget, type: string, fn: (e: Event) => void, opts?: AddEventListenerOptions) {
    t.addEventListener(type, fn, opts);
    this.off.push(() => t.removeEventListener(type, fn, opts));
  }

  dispose() { this.off.forEach(f => f()); }

  private get game() { return this.s.game; }
  private get ui() { return this.s.ui; }
  private get active() { return !this.s.app.paused && !this.s.app.menuOpen; }

  private ownSelected(): Entity[] {
    return this.ui.selected(this.game).filter(e => e.owner === this.game.humanId);
  }

  private marker(x: number, y: number, color: string) {
    this.ui.markers.push({ x, y, t: performance.now() / 1000, color });
  }

  // ------------------------------------------------------------ ratón

  private onDown(e: MouseEvent) {
    if (!this.active) return;
    const { ui, game } = this;
    const cam = this.s.renderer.cam;
    if (e.button === 1) {
      e.preventDefault();
      this.pan = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y };
      return;
    }
    if (e.button === 2) { this.onRightClick(e); return; }
    if (e.button !== 0) return;

    if (ui.placing) {
      const { defId, tx, ty } = ui.placing;
      const builders = this.ownSelected().filter(u => u.kind === 'unit' && game.unitDef(u).builder);
      const b = Commands.placeBuilding(game, game.humanId, defId, tx, ty, builders);
      if (b) {
        this.marker(b.x, b.y, '#7dff7d');
        if (!e.shiftKey || !buildingAvail(game, game.human, defId).ok) { ui.placing = null; ui.page = 'main'; }
      } else {
        const a = buildingAvail(game, game.human, defId);
        game.notify(a.ok ? 'No se puede construir ahí' : a.reason ?? 'No disponible', game.humanId, 'warn');
      }
      return;
    }
    if (ui.targeting === 'attackMove') {
      const w = cam.screenToWorld(e.clientX, e.clientY);
      const units = this.ownSelected().filter(u => u.kind === 'unit');
      const target = this.s.renderer.pickAt(e.clientX, e.clientY);
      if (target && game.isEnemy(game.humanId, target.owner) && target.kind !== 'resource') Commands.attack(game, units, target);
      else Commands.attackMove(game, units, w.x, w.y);
      this.marker(w.x, w.y, '#ff6b6b');
      if (!e.shiftKey) ui.targeting = null;
      return;
    }
    this.drag = { x: e.clientX, y: e.clientY };
  }

  private onRightClick(e: MouseEvent) {
    const { ui, game } = this;
    if (ui.placing || ui.targeting) { ui.placing = null; ui.targeting = null; return; }
    const r = this.s.renderer;
    const w = r.cam.screenToWorld(e.clientX, e.clientY);
    const target = r.pickAt(e.clientX, e.clientY);
    this.command(w.x, w.y, target);
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
    const { ui, game } = this;
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
    if (ui.placing) {
      const def = game.reg.building(ui.placing.defId);
      const w = cam.screenToWorld(e.clientX, e.clientY);
      ui.placing.tx = Math.round(w.x - def.size / 2);
      ui.placing.ty = Math.round(w.y - def.size / 2);
      ui.placing.valid = game.canPlace(def.id, ui.placing.tx, ui.placing.ty, game.humanId);
    }
  }

  private onUp(e: MouseEvent) {
    if (e.button === 1) { this.pan = null; return; }
    if (e.button !== 0 || !this.drag) return;
    const { ui, game } = this;
    const r = this.s.renderer;
    const box = ui.dragBox;
    this.drag = null;
    ui.dragBox = null;
    if (box) {
      const units = r.unitsInBox(box.x0, box.y0, box.x1, box.y1, game.humanId);
      if (e.shiftKey) ui.setSelection([...new Set([...ui.selection, ...units.map(u => u.id)])]);
      else ui.setSelection(units.map(u => u.id));
      return;
    }
    const hit = r.pickAt(e.clientX, e.clientY);
    const now = performance.now();
    if (!hit) { if (!e.shiftKey) ui.setSelection([]); return; }
    if (hit.owner === game.humanId && hit.kind === 'unit' && this.lastClick.id === hit.id && now - this.lastClick.t < 350) {
      // Doble clic: todas las unidades de ese tipo en pantalla
      ui.setSelection(r.drawn.filter(d => d.e.owner === game.humanId && d.e.defId === hit.defId).map(d => d.e.id));
    } else if (e.shiftKey && hit.owner === game.humanId) {
      const s = new Set(ui.selection);
      if (s.has(hit.id)) s.delete(hit.id); else s.add(hit.id);
      ui.setSelection([...s]);
    } else {
      ui.setSelection([hit.id]);
    }
    this.lastClick = { t: now, id: hit.id };
  }

  private onWheel(e: WheelEvent) {
    e.preventDefault();
    if (!this.active) return;
    this.s.renderer.cam.zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
  }

  private onMinimap(e: MouseEvent) {
    if (!this.active) return;
    const mm = this.s.minimap;
    const rect = mm.canvas.getBoundingClientRect();
    const w = mm.fromMini(e.clientX - rect.left, e.clientY - rect.top);
    if (e.button === 2) { this.command(w.x, w.y, null); return; }
    this.s.renderer.cam.centerOn(w.x, w.y);
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
    if (e.key === '.') {
      const idle = game.units.filter(x => !x.dead && x.owner === game.humanId && !x.order && game.unitDef(x).gatherer);
      if (!idle.length) { game.notify('No hay aldeanos inactivos', game.humanId); return; }
      const u = idle[this.idleIndex++ % idle.length];
      ui.setSelection([u.id]);
      this.s.renderer.cam.centerOn(u.x, u.y);
      return;
    }
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

  private centerOnSelection() {
    const sel = this.ui.selected(this.game);
    if (!sel.length) return;
    const x = sel.reduce((a, s) => a + s.x, 0) / sel.length, y = sel.reduce((a, s) => a + s.y, 0) / sel.length;
    this.s.renderer.cam.centerOn(x, y);
  }

  /** Desplazamiento de cámara con flechas y bordes de pantalla. */
  update(dt: number) {
    if (!this.active) return;
    const cam = this.s.renderer.cam;
    const sp = (900 * dt) / cam.zoom;
    let dx = 0, dy = 0;
    if (this.keys.has('ArrowLeft')) dx -= 1;
    if (this.keys.has('ArrowRight')) dx += 1;
    if (this.keys.has('ArrowUp')) dy -= 1;
    if (this.keys.has('ArrowDown')) dy += 1;
    const m = this.ui.mouse, E = 6;
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
