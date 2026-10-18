import { isTouchDevice, PLAYER_COLORS, PLAYER_COLOR_NAMES } from '../core/constants';
import { buildRegistry, type Registry } from '../core/Registry';
import type { GameOptions } from '../game/Game';
import { ALL_MODS } from '../mods';
import type { App } from '../app/App';

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
}

const STORAGE_KEY = 'aoe-local-menu-v1';

const DEFAULTS: MenuState = {
  name: 'Jugador', civ: 'franks', color: 0,
  rivals: [{ civ: 'random', difficulty: 'normal', color: 1 }],
  // En móviles, mapa pequeño por defecto (menos trabajo para la CPU y la GPU)
  mapType: 'arabia', mapSize: isTouchDevice() ? 80 : 96, startingResources: 'standard', startAge: 0, victory: 'conquest',
  visibility: 'normal', popLimit: 125, speed: 1.5,
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
    <span>Ctrl+1..9: crear grupo · 1..9: seleccionar grupo · Supr: eliminar · P/F10/Esc: pausa</span>
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

  constructor(private app: App) {
    this.state = { ...DEFAULTS };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.state = { ...DEFAULTS, ...JSON.parse(raw) };
    } catch { /* sin almacenamiento */ }
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
              <label>Tamaño</label><select data-k="mapSize">${SIZES.map(([v, l]) => opt(v, l, st.mapSize)).join('')}</select>
              <label>Recursos</label><select data-k="startingResources">${opt('low', 'Bajos', st.startingResources)}${opt('standard', 'Estándar', st.startingResources)}${opt('high', 'Altos', st.startingResources)}</select>
              <label>Edad inicial</label><select data-k="startAge">${reg.ages.map(a => opt(a.index, a.name, st.startAge)).join('')}</select>
              <label>Victoria</label><select data-k="victory">${[...reg.victories.values()].map(v => opt(v.id, v.name, st.victory)).join('')}</select>
              <span></span><small>${esc(vic?.description ?? '')}</small>
              <label>Visibilidad</label><select data-k="visibility">${opt('normal', 'Normal', st.visibility)}${opt('explored', 'Explorado', st.visibility)}${opt('revealed', 'Todo visible', st.visibility)}</select>
              <label>Población</label><select data-k="popLimit">${[50, 75, 125, 200].map(v => opt(v, String(v), st.popLimit)).join('')}</select>
              <label>Velocidad</label><select data-k="speed">${SPEEDS.map(([v, l]) => opt(v, l, st.speed)).join('')}</select>
            </div>
          </section>
          <section>
            <h2>Mods</h2>
            ${mods}
            <p class="note">Añade tus propios mods en <code>src/mods/</code> (ver README).</p>
          </section>
        </div>
        <button class="start" data-start>⚔️ ¡Comenzar partida!</button>
        ${help()}
      </div>`);

    const root = this.overlay;
    root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-k]').forEach(el => {
      el.addEventListener('change', () => {
        const k = el.dataset.k as keyof MenuState;
        const num = ['color', 'mapSize', 'startAge', 'popLimit', 'speed'].includes(k);
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
    root.querySelector('[data-start]')!.addEventListener('click', () => this.app.start(this.buildOptions()));
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
      popLimit: st.popLimit, speed: st.speed, seed: Math.floor(Math.random() * 1e9), mods: st.mods,
    };
  }

  // ------------------------------------------------------------ pausa y fin de partida

  showPause() {
    this.show(`
      <div class="menu small">
        <h1>Pausa</h1>
        <div class="buttons">
          <button data-a="resume">▶ Continuar</button>
          <button data-a="restart">↻ Reiniciar partida</button>
          <button data-a="menu">☰ Menú principal</button>
        </div>
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
        <h1>${won ? '🏆 ¡Victoria!' : '💀 Derrota'}</h1>
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

  private bindButtons() {
    this.overlay.querySelectorAll<HTMLButtonElement>('[data-a]').forEach(b => {
      b.addEventListener('click', () => {
        const a = b.dataset.a;
        if (a === 'resume') this.app.togglePause();
        else if (a === 'restart') this.app.restart();
        else if (a === 'menu') this.app.toMenu();
        else if (a === 'observe') { this.hide(); this.app.menuOpen = false; }
      });
    });
  }
}
