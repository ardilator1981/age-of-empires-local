import { BALANCE } from '../config/balance';
import { isTouchDevice, PLAYER_COLORS, PLAYER_COLOR_NAMES } from '../core/constants';
import { buildRegistry, type Registry } from '../core/Registry';
import type { GameOptions } from '../game/Game';
import { ALL_MODS } from '../mods';
import type { App } from '../app/App';
import { setUIPrefs, uiPrefs, type LayoutPref } from './layout';
import { RegionPicker } from './RegionPicker';
import { bindSettings, settingsHtml } from './SettingsPanel';
import { ago, AUTO_SLOT, deleteSlot, gameClock, listSlots, MANUAL_SLOTS } from '../app/saves';
import { bindSoundControls, soundControlsHtml } from './soundSettings';

type Diff = 'easy' | 'normal' | 'hard';

interface MenuState {
  name: string;
  civ: string;
  color: number;
  rivals: { civ: string; difficulty: Diff; color: number }[];
  mapType: string;
  mapSize: number;
  startingResources: 'low' | 'standard' | 'high';
  startAge: number;
  victory: string;
  visibility: 'normal' | 'explored' | 'revealed';
  popLimit: number;
  speed: number;
  mods: string[];
  /** Guerra declarada: minutos de preparación. */
  warPrepMinutes: number;
  /** Mods que ya existían la última vez que se guardó el menú (los nuevos se activan solos si son por defecto). */
  knownMods?: string[];
}

const STORAGE_KEY = 'aoe-local-menu-v1';

const DEFAULTS: MenuState = {
  name: 'Jugador', civ: 'franks', color: 0,
  rivals: [{ civ: 'random', difficulty: 'normal', color: 1 }],
  // En móviles, mapa pequeño por defecto (menos trabajo para la CPU y la GPU)
  mapType: 'arabia', mapSize: isTouchDevice() ? 80 : 96, startingResources: 'standard', startAge: 0, victory: 'conquest',
  visibility: 'normal', popLimit: 125, speed: 1.5, warPrepMinutes: BALANCE.war.prepMinutes,
  mods: ALL_MODS.filter(m => !m.core && m.defaultEnabled).map(m => m.id),
};

const SIZES: [number, string][] = [[64, 'Diminuto (64×64)'], [80, 'Pequeño (80×80)'], [96, 'Mediano (96×96)'], [120, 'Grande (120×120)'], [144, 'Enorme (144×144)']];
const SPEEDS: [number, string][] = [[1, 'Lenta'], [1.5, 'Normal'], [2, 'Rápida'], [3, 'Muy rápida']];
const DIFFS: [Diff, string][] = [['easy', 'Fácil'], ['normal', 'Normal'], ['hard', 'Difícil']];

function esc(s: string) {
  return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

function opt<T extends string | number>(value: T, label: string, cur: T) {
  return `<option value="${value}"${value === cur ? ' selected' : ''}>${esc(label)}</option>`;
}

const HELP_MOUSE = `
  <div class="help">
    <b>Controles</b>
    <span>Clic izq.: seleccionar / arrastrar para seleccionar varias</span>
    <span>Clic der.: mover, atacar, recolectar, construir, punto de reunión</span>
    <span>Doble clic: todas las unidades de ese tipo en pantalla</span>
    <span>Mayús: añadir a la selección / encadenar construcciones / entrenar 5</span>
    <span>Flechas, bordes o botón central: mover la cámara · Rueda: zoom</span>
    <span>Q W E R T / A S D F G / Z X C V B: botones de comando</span>
    <span>H: centro urbano · .: aldeano inactivo · ,: ejército inactivo · Espacio: centrar</span>
    <span>Ctrl+1..9: crear grupo · 1..9: seleccionar grupo · Supr: eliminar · P/F10/Esc: pausa · M: música</span>
    <span>Tab o 📜: estrategia (formación, postura y órdenes) · ⚔️: todo el ejército</span>
  </div>`;

const HELP_TOUCH = `
  <div class="help">
    <b>Controles táctiles</b>
    <span>Tocar: seleccionar · Tocar dos veces: todas las unidades de ese tipo en pantalla</span>
    <span>Arrastrar con un dedo: recuadro de selección</span>
    <span>Mantener pulsado (o botón 🎯 Ordenar y tocar): mover, atacar, recolectar, construir, punto de reunión</span>
    <span>Dos dedos: mover la cámara · Pellizcar: zoom · Minimapa: saltar a un punto</span>
    <span>Construir: elige el edificio, arrastra el fantasma con el dedo y suelta para colocarlo</span>
    <span>Mantener pulsado un botón: ver su descripción · 💤: aldeano inactivo · ▾: plegar el panel</span>
  </div>`;

const help = () => (isTouchDevice() || document.documentElement.classList.contains('touch') ? HELP_TOUCH : HELP_MOUSE);

export class Menu {
  private state: MenuState;
  private overlay = document.getElementById('overlay')!;
  private regCache: { key: string; reg: Registry } | null = null;
  /** Semilla de la vista previa de una región real, para jugar exactamente ese mapa. */
  private pinnedSeed: { map: string; seed: number } | null = null;

  constructor(private app: App) {
    this.state = { ...DEFAULTS };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.state = { ...DEFAULTS, ...JSON.parse(raw) };
    } catch { /* sin almacenamiento */ }
    const known = this.state.knownMods ?? this.state.mods;
    const added = ALL_MODS.filter(m => !m.core && m.defaultEnabled && !known.includes(m.id)).map(m => m.id);
    this.state.mods = [...new Set([...this.state.mods, ...added])];
    this.state.knownMods = ALL_MODS.map(m => m.id);
  }

  private save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state)); } catch { /* ignorar */ }
  }

  private registry(): Registry {
    const key = this.state.mods.join(',');
    if (!this.regCache || this.regCache.key !== key) {
      this.regCache = { key, reg: buildRegistry(ALL_MODS.filter(m => m.core || this.state.mods.includes(m.id))) };
    }
    return this.regCache.reg;
  }

  hide() { this.overlay.innerHTML = ''; this.overlay.style.display = 'none'; }

  private show(html: string) {
    this.overlay.innerHTML = html;
    this.overlay.style.display = 'flex';
  }

  // ------------------------------------------------------------ menú principal

  showMain() {
    const st = this.state, reg = this.registry();
    const civs = [...reg.civs.values()];
    if (!reg.civs.has(st.civ)) st.civ = civs[0]?.id ?? '';
    if (!reg.mapTypes.has(st.mapType)) st.mapType = [...reg.mapTypes.keys()][0];
    if (!reg.victories.has(st.victory)) st.victory = [...reg.victories.keys()][0];
    const civOpts = (cur: string, random: boolean) =>
      (random ? opt('random', '🎲 Aleatoria', cur) : '') + civs.map(c => opt(c.id, c.name, cur)).join('');
    const colorOpts = (cur: number) => PLAYER_COLORS.map((_, i) => opt(i, PLAYER_COLOR_NAMES[i], cur)).join('');
    const civ = reg.civs.get(st.civ);
    const map = reg.mapTypes.get(st.mapType);
    const vic = reg.victories.get(st.victory);

    const rivals = st.rivals.map((r, i) => `
      <div class="prow">
        <span class="swatch" style="background:${PLAYER_COLORS[r.color]}"></span>
        <span class="pname">IA ${i + 1}</span>
        <select data-r="${i}" data-rk="civ">${civOpts(r.civ, true)}</select>
        <select data-r="${i}" data-rk="difficulty">${DIFFS.map(([v, l]) => opt(v, l, r.difficulty)).join('')}</select>
        <select data-r="${i}" data-rk="color">${colorOpts(r.color)}</select>
        ${st.rivals.length > 1 ? `<button class="small" data-remove="${i}">✕</button>` : ''}
      </div>`).join('');

    const mods = ALL_MODS.filter(m => !m.core).map(m => `
      <label class="mod"><input type="checkbox" data-mod="${m.id}"${st.mods.includes(m.id) ? ' checked' : ''}>
        <span><b>${esc(m.name)}</b><small>${esc(m.description)}</small></span></label>`).join('') || '<small>No hay mods instalados.</small>';

    this.show(`
      <div class="menu">
        <h1>Age of Empires II</h1>
        <div class="sub">Edición local · motor modular</div>
        <div class="continue-box"></div>
        <div class="cols">
          <section>
            <h2>Jugadores</h2>
            <div class="prow">
              <span class="swatch" style="background:${PLAYER_COLORS[st.color]}"></span>
              <input data-k="name" value="${esc(st.name)}" maxlength="18">
              <select data-k="civ">${civOpts(st.civ, false)}</select>
              <select data-k="color">${colorOpts(st.color)}</select>
            </div>
            ${civ ? `<div class="civinfo"><b>${esc(civ.name)}</b> — ${esc(civ.description)}<ul>${civ.bonusText.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>` : ''}
            <h3>Rivales</h3>
            ${rivals}
            ${st.rivals.length < 5 ? '<button class="small" data-add>+ Añadir rival</button>' : ''}
          </section>
          <section>
            <h2>Partida</h2>
            <div class="grid">
              <label>Mapa</label><select data-k="mapType">${[...reg.mapTypes.values()].map(m => opt(m.id, m.name, st.mapType)).join('')}</select>
              <span></span><small>${esc(map?.description ?? '')}</small>
              ${[...reg.mapTypes.values()].some(m => m.region) ? '<span></span><button class="small" data-regions>🌍 Elegir región real…</button>' : ''}
              <label>Tamaño</label><select data-k="mapSize">${SIZES.map(([v, l]) => opt(v, l, st.mapSize)).join('')}</select>
              <label>Recursos</label><select data-k="startingResources">${opt('low', 'Bajos', st.startingResources)}${opt('standard', 'Estándar', st.startingResources)}${opt('high', 'Altos', st.startingResources)}</select>
              <label>Edad inicial</label><select data-k="startAge">${reg.ages.map(a => opt(a.index, a.name, st.startAge)).join('')}</select>
              <label>Victoria</label><select data-k="victory">${[...reg.victories.values()].map(v => opt(v.id, v.name, st.victory)).join('')}</select>
              <span></span><small>${esc(vic?.description ?? '')}</small>
              <label>Visibilidad</label><select data-k="visibility">${opt('normal', 'Normal', st.visibility)}${opt('explored', 'Explorado', st.visibility)}${opt('revealed', 'Todo visible', st.visibility)}</select>
              <label>Población</label><select data-k="popLimit">${[50, 75, 125, 200].map(v => opt(v, String(v), st.popLimit)).join('')}</select>
              <label>Velocidad</label><select data-k="speed">${SPEEDS.map(([v, l]) => opt(v, l, st.speed)).join('')}</select>
              ${st.mods.includes('declared-war') ? `<label>Preparación</label><select data-k="warPrepMinutes">${[2, 5, 10, 15, 20, 30, 45, 60].map(v => opt(v, `${v} min hasta la batalla`, st.warPrepMinutes)).join('')}</select>
              <span></span><small>Guerra declarada: tiempo entre la declaración y la batalla.</small>` : ''}
            </div>
          </section>
          <section>
            <h2>Mods</h2>
            ${mods}
            <p class="note">Añade tus propios mods en <code>src/mods/</code> (ver README).</p>
          </section>
        </div>
        <button class="start" data-start>⚔️ ¡Comenzar partida!</button>
        <div class="credits-link"><button class="small" data-settings>⚙️ Ajustes</button> <button class="small" data-credits>📜 Créditos y atribuciones</button></div>
        ${this.volumeHtml()}
        ${help()}
      </div>`);

    const root = this.overlay;
    root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-k]').forEach(el => {
      el.addEventListener('change', () => {
        const k = el.dataset.k as keyof MenuState;
        const num = ['color', 'mapSize', 'startAge', 'popLimit', 'speed', 'warPrepMinutes'].includes(k);
        (st as any)[k] = num ? Number(el.value) : el.value;
        this.save();
        this.showMain();
      });
    });
    root.querySelectorAll<HTMLSelectElement>('[data-r]').forEach(el => {
      el.addEventListener('change', () => {
        const r = st.rivals[Number(el.dataset.r)];
        const k = el.dataset.rk!;
        (r as any)[k] = k === 'color' ? Number(el.value) : el.value;
        this.save();
        this.showMain();
      });
    });
    root.querySelectorAll<HTMLInputElement>('[data-mod]').forEach(el => {
      el.addEventListener('change', () => {
        const id = el.dataset.mod!;
        st.mods = el.checked ? [...new Set([...st.mods, id])] : st.mods.filter(m => m !== id);
        this.save();
        this.showMain();
      });
    });
    root.querySelectorAll<HTMLButtonElement>('[data-remove]').forEach(el => {
      el.addEventListener('click', () => { st.rivals.splice(Number(el.dataset.remove), 1); this.save(); this.showMain(); });
    });
    root.querySelector('[data-add]')?.addEventListener('click', () => {
      const used = new Set([st.color, ...st.rivals.map(r => r.color)]);
      const color = PLAYER_COLORS.findIndex((_, i) => !used.has(i));
      st.rivals.push({ civ: 'random', difficulty: 'normal', color: Math.max(0, color) });
      this.save();
      this.showMain();
    });
    root.querySelector('[data-start]')!.addEventListener('click', () => void this.app.start(this.buildOptions()));
    void this.fillContinue(root);
    root.querySelector('[data-regions]')?.addEventListener('click', () => this.showRegions());
    root.querySelector('[data-credits]')?.addEventListener('click', () => this.showCredits());
    root.querySelector('[data-settings]')?.addEventListener('click', () => this.showSettings(() => this.showMain()));
    this.bindVolume();
  }

  buildOptions(): GameOptions {
    const st = this.state, reg = this.registry();
    const civIds = [...reg.civs.keys()];
    const pick = (c: string) => (c === 'random' || !reg.civs.has(c) ? civIds[Math.floor(Math.random() * civIds.length)] : c);
    // Evita colores repetidos
    const used = new Set<number>([st.color]);
    const colorFor = (c: number) => {
      if (!used.has(c)) { used.add(c); return c; }
      const free = PLAYER_COLORS.findIndex((_, i) => !used.has(i));
      used.add(free);
      return free;
    };
    const rivals = st.rivals.map((r, i) => {
      const civ = pick(r.civ);
      return { name: `IA ${i + 1} (${reg.civs.get(civ)?.name ?? civ})`, civ, color: PLAYER_COLORS[colorFor(r.color)], human: false, difficulty: r.difficulty };
    });
    return {
      mapType: st.mapType, mapSize: st.mapSize,
      players: [{ name: st.name || 'Jugador', civ: pick(st.civ), color: PLAYER_COLORS[st.color], human: true, difficulty: 'normal' }, ...rivals],
      startingResources: st.startingResources, startAge: st.startAge, victory: st.victory, visibility: st.visibility,
      popLimit: st.popLimit, speed: st.speed, seed: this.pinnedSeed?.map === st.mapType ? this.pinnedSeed.seed : Math.floor(Math.random() * 1e9), mods: st.mods,
      warPrepMinutes: st.warPrepMinutes,
    };
  }

  // ------------------------------------------------------------ pausa y fin de partida

  /** Botón "Continuar" con la última partida (guardado automático) y acceso a las guardadas. */
  private async fillContinue(root: HTMLElement) {
    await this.app.ready;
    const slots = await listSlots();
    const box = root.querySelector('.continue-box');
    if (!box || !slots.length) return;
    const auto = slots.find(s => s.id === AUTO_SLOT);
    box.innerHTML = `${auto ? `<button class="start continue" data-cont>▶ Continuar la partida<small>${esc(auto.meta.mapName)} · ${gameClock(auto.meta.time)} de juego · ${esc(auto.meta.civ)} · ${ago(auto.savedAt)}</small></button>` : ''}
      <button class="small" data-saves>📂 Partidas guardadas (${slots.length})</button>`;
    box.querySelector('[data-cont]')?.addEventListener('click', () => void this.loadSlot(AUTO_SLOT));
    box.querySelector('[data-saves]')!.addEventListener('click', () => this.showSaves('load', () => this.showMain()));
  }

  private async loadSlot(id: string) {
    const err = await this.app.load(id);
    if (err) this.toast(err);
  }

  private toast(text: string) {
    const d = document.createElement('div');
    d.className = 'menu-toast';
    d.textContent = text;
    this.overlay.appendChild(d);
    setTimeout(() => d.remove(), 3500);
  }

  private armedSlot = '';

  /**
   * Partidas guardadas. `save`: las 5 ranuras manuales para guardar la partida en curso;
   * `load`: todas las ocupadas (también el guardado automático) para cargarlas o borrarlas.
   */
  async showSaves(mode: 'save' | 'load', back: () => void) {
    await this.app.ready;
    const slots = await listSlots();
    const by = new Map(slots.map(s => [s.id, s]));
    const ids = mode === 'save' ? MANUAL_SLOTS : slots.map(s => s.id);
    const row = (id: string) => {
      const s = by.get(id);
      const title = id === AUTO_SLOT ? '⟳ Guardado automático' : `Ranura ${id}`;
      const info = s ? `${esc(s.meta.mapName)} · ${gameClock(s.meta.time)} · ${esc(s.meta.civ)}, ${esc(s.meta.age)} · ${ago(s.savedAt)} · ${(s.size / 1024).toFixed(0)} KB` : 'Vacía';
      const armed = (a: string) => this.armedSlot === `${a}:${id}`;
      const main = mode === 'save'
        ? `<button data-save="${id}" class="${armed('save') ? 'armed' : ''}">${armed('save') ? '¿Sobrescribir? Toca otra vez' : '💾 Guardar aquí'}</button>`
        : `<button data-load="${id}">▶ Cargar</button>`;
      return `<div class="slot${s ? '' : ' empty'}"><div><b>${title}</b><small>${info}</small></div>
        ${main}${s ? `<button class="small${armed('del') ? ' armed' : ''}" data-del="${id}">${armed('del') ? '¿Borrar?' : '🗑'}</button>` : ''}</div>`;
    };
    this.show(`
      <div class="menu small saves">
        <h1>${mode === 'save' ? '💾 Guardar partida' : '📂 Partidas guardadas'}</h1>
        <div class="slots">${ids.length ? ids.map(row).join('') : '<p class="note">No hay partidas guardadas.</p>'}</div>
        <p class="note">La partida también se guarda sola cada poco y al salir del juego.</p>
        <div class="buttons"><button data-back>↩ Volver</button></div>
      </div>`);
    const root = this.overlay;
    root.querySelector('[data-back]')!.addEventListener('click', () => { this.armedSlot = ''; back(); });
    root.querySelectorAll<HTMLElement>('[data-save]').forEach(b => b.addEventListener('click', async () => {
      const id = b.dataset.save!;
      if (by.has(id) && this.armedSlot !== `save:${id}`) { this.armedSlot = `save:${id}`; void this.showSaves(mode, back); return; }
      this.armedSlot = '';
      const g = this.app.session?.game;
      const name = g ? `${g.reg.mapTypes.get(g.opts.mapType)?.name ?? g.opts.mapType}` : 'Partida';
      const err = await this.app.saveTo(id, name);
      if (err) this.toast(err); else { void this.showSaves(mode, back); this.toast(`Partida guardada en la ranura ${id}`); }
    }));
    root.querySelectorAll<HTMLElement>('[data-load]').forEach(b => b.addEventListener('click', () => void this.loadSlot(b.dataset.load!)));
    root.querySelectorAll<HTMLElement>('[data-del]').forEach(b => b.addEventListener('click', async () => {
      const id = b.dataset.del!;
      if (this.armedSlot !== `del:${id}`) { this.armedSlot = `del:${id}`; void this.showSaves(mode, back); return; }
      this.armedSlot = '';
      await deleteSlot(id).catch(() => {});
      void this.showSaves(mode, back);
    }));
  }

  /** Velocidad de juego elegida (se recuerda para las partidas nuevas). */
  get speed() { return this.state.speed; }
  setSpeed(v: number) { this.state.speed = v; this.save(); }

  /** Ajustes (los mismos que en la interfaz móvil). */
  showSettings(back: () => void) {
    const render = () => {
      this.show(`<div class="menu small settings-menu">
          <h1>⚙️ Ajustes</h1>
          ${settingsHtml(this.app)}
          <div class="buttons"><button data-back>↩ Volver</button></div>
        </div>`);
      const root = this.overlay;
      bindSettings(root, this.app, render, () => this.app.session?.hud.updateSoundButton());
      root.querySelector('[data-back]')!.addEventListener('click', back);
    };
    render();
  }

  showPause() {
    this.show(`
      <div class="menu small">
        <h1>Pausa</h1>
        <div class="buttons">
          <button data-a="resume">▶ Continuar</button>
          <button data-a="save">💾 Guardar partida</button>
          <button data-a="load">📂 Cargar partida</button>
          <button data-a="settings">⚙️ Ajustes</button>
          <button data-a="restart">↻ Reiniciar partida</button>
          <button data-a="menu">☰ Menú principal</button>
        </div>
        ${this.volumeHtml()}
        ${help()}
      </div>`);
    this.bindButtons();
  }

  showGameOver(won: boolean) {
    const s = this.app.session;
    if (!s) return;
    const g = s.game;
    const rows = g.players.slice(1).map(p => `
      <tr style="color:${p.color}"><td>${esc(p.name)}</td><td>${esc(p.civ.name)}</td><td>${esc(g.reg.ageName(p.age))}</td>
      <td>${p.stats.kills}</td><td>${p.stats.losses}</td><td>${p.stats.razed}</td><td>${Math.floor(p.stats.gathered)}</td><td>${p.defeated ? 'Derrotado' : 'En pie'}</td></tr>`).join('');
    const t = Math.floor(g.time);
    this.app.menuOpen = true;
    this.show(`
      <div class="menu small">
        <h1>${won ? '🏆 ¡Vaya máquina!' : '💀 Te falta barrio'}</h1>
        <div class="sub">Duración: ${Math.floor(t / 60)} min ${t % 60} s</div>
        <table class="stats"><tr><th>Jugador</th><th>Civ.</th><th>Edad</th><th>Bajas causadas</th><th>Pérdidas</th><th>Edificios destruidos</th><th>Recursos</th><th>Estado</th></tr>${rows}</table>
        <div class="buttons">
          <button data-a="observe">👁 Seguir observando</button>
          <button data-a="restart">↻ Nueva partida</button>
          <button data-a="menu">☰ Menú principal</button>
        </div>
      </div>`);
    this.bindButtons();
  }

  /** Selector de regiones reales con mapamundi y vista previa. */
  showRegions() {
    const st = this.state;
    new RegionPicker({
      overlay: this.overlay,
      registry: this.registry(),
      selected: st.mapType,
      options: (mapType, seed) => ({ ...this.buildOptions(), mapType, seed }),
      onChoose: (mapType, seed, playNow) => {
        st.mapType = mapType;
        this.pinnedSeed = { map: mapType, seed };
        this.save();
        if (playNow) void this.app.start(this.buildOptions());
        else this.showMain();
      },
      onBack: () => this.showMain(),
    }).show();
  }

  /** Créditos y atribuciones de los datos geográficos. */
  showCredits() {
    this.show(`
      <div class="menu small credits">
        <h1>Créditos</h1>
        <div class="sub">Age of Empires II · Edición local — proyecto personal sin ánimo de lucro inspirado en <i>Age of Empires II</i> (marca de Microsoft). No usa ningún recurso gráfico ni sonoro del juego original: los gráficos, la música y los efectos de sonido se generan por código (detalle en <code>CREDITS.md</code>).</div>
        <h2>Relieve y datos de las regiones reales</h2>
        <ul>
          <li><b>Copernicus DEM GLO-30</b>: © DLR e.V. 2010-2014 y © Airbus Defence and Space GmbH 2014-2018, proporcionado bajo el programa COPERNICUS de la Unión Europea y la ESA.</li>
          <li><b>Institut Cartogràfic i Geològic de Catalunya (ICGC)</b>: Model d'Elevacions del Terreny, licencia CC BY 4.0 (regiones de Cataluña).</li>
          <li><b>OpenStreetMap</b>: ríos, lagos, bosques, usos del suelo y núcleos de población © colaboradores de OpenStreetMap, licencia ODbL 1.0 (openstreetmap.org/copyright).</li>
        </ul>
        <h2>Mapamundi del selector</h2>
        <p>Teselas de elevación <b>Terrarium</b> de Mapzen (AWS Open Data). Atribución requerida:</p>
        <ul class="small-list">
          <li>ArcticDEM terrain data DEM(s) were created from DigitalGlobe, Inc., imagery and funded under National Science Foundation awards 1043681, 1559691, and 1542736;</li>
          <li>Australia terrain data © Commonwealth of Australia (Geoscience Australia) 2017;</li>
          <li>Austria terrain data © offene Daten Österreichs – Digitales Geländemodell (DGM) Österreich;</li>
          <li>Canada terrain data contains information licensed under the Open Government Licence – Canada;</li>
          <li>Europe terrain data produced using Copernicus data and information funded by the European Union - EU-DEM layers;</li>
          <li>Global ETOPO1 terrain data U.S. National Oceanic and Atmospheric Administration;</li>
          <li>Mexico terrain data source: INEGI, Continental relief, 2016;</li>
          <li>New Zealand terrain data Copyright 2011 Crown copyright (c) Land Information New Zealand and the New Zealand Government (All rights reserved);</li>
          <li>Norway terrain data © Kartverket;</li>
          <li>United Kingdom terrain data © Environment Agency copyright and/or database right 2015. All rights reserved;</li>
          <li>United States 3DEP (formerly NED) and global GMTED2010 and SRTM terrain data courtesy of the U.S. Geological Survey.</li>
        </ul>
        <div class="buttons"><button data-a="back">↩ Volver</button></div>
      </div>`);
    this.overlay.querySelector('[data-a="back"]')!.addEventListener('click', () => this.showMain());
  }

  private volumeHtml() {
    const lay = uiPrefs().layout;
    return soundControlsHtml(this.app.audio, false)
      + `<label class="vol">Interfaz <select data-layout>${opt('auto', 'Automática', lay)}${opt('desktop', 'Escritorio', lay)}${opt('mobile', 'Móvil', lay)}</select></label>`;
  }

  private bindVolume() {
    bindSoundControls(this.overlay, this.app.audio, () => this.app.session?.hud.updateSoundButton());
    // Interfaz de escritorio o móvil (automática según la pantalla, o forzada)
    this.overlay.querySelector<HTMLSelectElement>('[data-layout]')?.addEventListener('change', e => {
      setUIPrefs({ layout: (e.target as HTMLSelectElement).value as LayoutPref });
    });
  }

  private bindButtons() {
    this.bindVolume();
    this.overlay.querySelectorAll<HTMLButtonElement>('[data-a]').forEach(b => {
      b.addEventListener('click', () => {
        const a = b.dataset.a;
        if (a === 'resume') this.app.togglePause();
        else if (a === 'restart') this.app.restart();
        else if (a === 'menu') this.app.toMenu();
        else if (a === 'observe') { this.hide(); this.app.menuOpen = false; }
        else if (a === 'save') void this.showSaves('save', () => this.showPause());
        else if (a === 'settings') this.showSettings(() => this.showPause());
        else if (a === 'load') void this.showSaves('load', () => this.showPause());
      });
    });
  }
}
