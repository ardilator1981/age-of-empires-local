import type { Registry } from '../core/Registry';
import type { MapTypeDef } from '../core/types';
import { Game, type GameOptions } from '../game/Game';
import { regionAttribution } from '../mods/real-maps';

/**
 * Selector de regiones reales: mapamundi con las regiones marcadas, lista por
 * categorías y vista previa del mapa (relieve, roca, agua, bosques y posiciones de
 * salida) antes de confirmar. Los datos de cada región van incluidos en el juego:
 * no hace falta conexión.
 */

const WORLD = { w: 720, h: 360, latMax: 80 };
const CATEGORY_ICON: Record<string, string> = {
  'Alta montaña': '🏔️', 'Costa': '🌊', 'Valle fluvial': '🏞️', 'Desierto': '🏜️', 'Meseta y llanura': '🌾', 'Valle glaciar': '❄️', 'Otras': '🗺️',
};

function esc(s: string) {
  return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

export interface PickerOptions {
  overlay: HTMLElement;
  registry: Registry;
  selected: string;
  /** Opciones de partida para la vista previa y para jugar (misma semilla). */
  options: (mapType: string, seed: number) => GameOptions;
  onChoose: (mapType: string, seed: number, playNow: boolean) => void;
  onBack: () => void;
}

export class RegionPicker {
  private sel: string;
  private seed = Math.floor(Math.random() * 1e9);
  private token = 0;
  private regions: MapTypeDef[];

  constructor(private o: PickerOptions) {
    this.regions = [...o.registry.mapTypes.values()].filter(m => m.region);
    this.sel = this.regions.some(r => r.id === o.selected) ? o.selected : this.regions[0]?.id ?? '';
  }

  show() {
    const groups = new Map<string, MapTypeDef[]>();
    for (const r of this.regions) {
      const k = r.region!.category;
      groups.set(k, [...(groups.get(k) ?? []), r]);
    }
    const list = [...groups.entries()].map(([cat, rs]) => `
      <h3>${CATEGORY_ICON[cat] ?? '🗺️'} ${esc(cat)}</h3>
      ${rs.map(r => `<button class="region${r.id === this.sel ? ' sel' : ''}" data-region="${r.id}"><b>${esc(r.name.replace(' (real)', ''))}</b><small>${esc(r.region!.country)}</small></button>`).join('')}`).join('');
    this.o.overlay.innerHTML = `
      <div class="menu regions">
        <h1>Elegir una región real</h1>
        <div class="sub">Relieve, ríos, bosques y pueblos reales. Recuadro de ${this.regions[0]?.region?.sizeKm ?? 8}×${this.regions[0]?.region?.sizeKm ?? 8} km. Funciona sin conexión.</div>
        <div class="region-cols">
          <section class="world-col">
            <div class="world"><img src="maps/world.png" alt="Mapamundi" draggable="false"><div class="marks"></div></div>
            <div class="region-list">${list || '<p>No hay regiones generadas (npm run regions).</p>'}</div>
          </section>
          <section class="preview-col">
            <h2 class="rp-name"></h2>
            <div class="rp-meta"></div>
            <div class="rp-canvas"><canvas width="720" height="372"></canvas><div class="rp-loading">Generando vista previa…</div></div>
            <div class="rp-legend">
              <span><i style="background:#77706a"></i>Roca (infranqueable)</span><span><i style="background:#a8845a"></i>Pasos y caminos</span>
              <span><i style="background:#2c5c94"></i>Agua</span><span><i style="background:#6aa0a8"></i>Vado</span>
              <span><i style="background:#e8eef4"></i>Nieve</span><span><i style="background:#1f4d1f"></i>Bosque</span><span><i class="dot"></i>Inicio</span>
            </div>
            <p class="rp-desc"></p>
            <p class="rp-attr"></p>
            <div class="buttons row">
              <button data-a="choose">✔ Elegir esta región</button>
              <button data-a="play">⚔️ ¡Jugar aquí!</button>
              <button data-a="reroll" title="Otra disposición de inicio">🎲 Otra disposición</button>
              <button data-a="back">↩ Volver</button>
            </div>
          </section>
        </div>
      </div>`;
    this.o.overlay.style.display = 'flex';
    const root = this.o.overlay;
    root.querySelectorAll<HTMLButtonElement>('[data-region]').forEach(b => b.addEventListener('click', () => this.select(b.dataset.region!)));
    root.querySelector('[data-a="choose"]')!.addEventListener('click', () => this.o.onChoose(this.sel, this.seed, false));
    root.querySelector('[data-a="play"]')!.addEventListener('click', () => this.o.onChoose(this.sel, this.seed, true));
    root.querySelector('[data-a="reroll"]')!.addEventListener('click', () => { this.seed = Math.floor(Math.random() * 1e9); this.renderPreview(); });
    root.querySelector('[data-a="back"]')!.addEventListener('click', () => this.o.onBack());
    this.drawMarks();
    this.select(this.sel);
  }

  private drawMarks() {
    const box = this.o.overlay.querySelector('.marks')!;
    box.innerHTML = this.regions.filter(r => r.region!.lat || r.region!.lon).map(r => {
      const x = ((r.region!.lon + 180) / 360) * 100;
      const y = ((WORLD.latMax - r.region!.lat) / (2 * WORLD.latMax)) * 100;
      return `<button class="mark${r.id === this.sel ? ' sel' : ''}" data-mark="${r.id}" style="left:${x}%;top:${y}%" title="${esc(r.name)}"></button>`;
    }).join('');
    box.querySelectorAll<HTMLButtonElement>('[data-mark]').forEach(b => b.addEventListener('click', () => this.select(b.dataset.mark!)));
  }

  private select(id: string) {
    if (!id) return;
    this.sel = id;
    const root = this.o.overlay;
    root.querySelectorAll<HTMLElement>('[data-region]').forEach(b => b.classList.toggle('sel', b.dataset.region === id));
    root.querySelectorAll<HTMLElement>('[data-mark]').forEach(b => b.classList.toggle('sel', b.dataset.mark === id));
    const r = this.regions.find(x => x.id === id)!;
    const info = r.region!;
    root.querySelector('.rp-name')!.textContent = r.name.replace(' (real)', '');
    root.querySelector('.rp-meta')!.textContent = `${CATEGORY_ICON[info.category] ?? ''} ${info.category} · ${info.country} · ${info.sizeKm}×${info.sizeKm} km · ${Math.abs(info.lat).toFixed(2)}° ${info.lat >= 0 ? 'N' : 'S'}, ${Math.abs(info.lon).toFixed(2)}° ${info.lon >= 0 ? 'E' : 'O'}`;
    root.querySelector('.rp-desc')!.textContent = r.description;
    this.renderPreview();
  }

  /** Genera la partida de verdad (mismo generador y misma semilla) y dibuja su mapa. */
  private async renderPreview() {
    const token = ++this.token;
    const root = this.o.overlay;
    const canvas = root.querySelector<HTMLCanvasElement>('.rp-canvas canvas')!;
    const loading = root.querySelector<HTMLElement>('.rp-loading')!;
    loading.style.display = 'flex';
    const mt = this.o.registry.mapTypes.get(this.sel)!;
    try {
      await mt.load?.();
      const attr = await regionAttribution(this.sel).catch(() => [] as string[]);
      if (token !== this.token) return;
      root.querySelector('.rp-attr')!.textContent = attr.join(' · ');
      await new Promise(r => setTimeout(r, 0)); // deja pintar el aviso de carga
      const g = new Game(this.o.registry, this.o.options(this.sel, this.seed));
      if (token !== this.token) return;
      drawMapPreview(canvas, g);
    } catch (err) {
      console.error(err);
      root.querySelector('.rp-attr')!.textContent = 'No se pudo generar la vista previa.';
    }
    if (token === this.token) loading.style.display = 'none';
  }
}

/** Dibuja el mapa de una partida en un rombo (como el minimapa), con sombreado del relieve. */
export function drawMapPreview(canvas: HTMLCanvasElement, g: Game) {
  const m = g.map, reg = g.reg, th = m.tileHeights();
  const img = new ImageData(m.w, m.h);
  const H = (x: number, y: number) => th[Math.max(0, Math.min(m.h - 1, y)) * m.w + Math.max(0, Math.min(m.w - 1, x))];
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const i = y * m.w + x;
    const t = reg.terrains[m.terrain[i]];
    let c = t.color;
    if (t.id === 'dirt') c = [168, 132, 90];
    const light = Math.max(0.55, Math.min(1.45, 1 + (H(x - 1, y) - H(x + 1, y)) * 0.22 + (H(x, y - 1) - H(x, y + 1)) * 0.08));
    img.data[i * 4] = c[0] * light; img.data[i * 4 + 1] = c[1] * light; img.data[i * 4 + 2] = c[2] * light; img.data[i * 4 + 3] = 255;
  }
  for (const e of g.nodes) {
    if (e.dead) continue;
    const nd = reg.resourceNodes.get(e.defId);
    if (!nd) continue;
    const n = parseInt(nd.minimapColor.slice(1), 16), i = (e.ty * m.w + e.tx) * 4;
    img.data[i] = (n >> 16) & 255; img.data[i + 1] = (n >> 8) & 255; img.data[i + 2] = n & 255;
  }
  const tmp = document.createElement('canvas');
  tmp.width = m.w; tmp.height = m.h;
  tmp.getContext('2d')!.putImageData(img, 0, 0);
  const ctx = canvas.getContext('2d')!;
  const S = canvas.width, k = S / (m.w + m.h), oy = (canvas.height - S / 2) / 2;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, S, canvas.height);
  ctx.setTransform(k, k / 2, -k, k / 2, m.h * k, oy);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp, 0, 0);
  // Bases de los jugadores
  for (const b of g.buildings) {
    if (b.dead || !reg.building(b.defId).classes.includes('townCenter')) continue;
    ctx.fillStyle = g.players[b.owner].color;
    ctx.fillRect(b.tx - 1, b.ty - 1, b.size + 2, b.size + 2);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.8;
    ctx.strokeRect(b.tx - 1, b.ty - 1, b.size + 2, b.size + 2);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = 'bold 22px Georgia, serif';
  ctx.fillText('N ↑', 14, 30);
}
