import { buildRegistry, type Registry } from '../core/Registry';
import { auditCatalog, CAT_TYPES, STATE_LABEL, type CatalogResult, type CatItem, type CatNotes, type CatState, type CatType } from '../catalog/audit';
import notes from '../../docs/catalogo-notas.json';
import { ALL_MODS } from '../mods';
import { ART } from '../mods/art';
import { portrait } from '../render/icons';
import { artVersion } from '../render/art/assets';
import { esc } from './menuOptions';

/**
 * Pantalla de Catálogo: todo el contenido del juego con el estado de su lógica (la misma auditoría
 * que `npm run catalog`, ver src/catalog/audit.ts). Pestañas por tipo, filtros y búsqueda; sirve
 * en escritorio y en móvil (la rejilla se adapta y los controles miden 44 px).
 */
type Tab = CatType | 'compare';
type StateFilter = CatState | 'all' | 'issues';

const COLOR = '#c0392b';
const BADGE: Record<CatState, string> = { ok: '✔', unused: '⚠', dev: '🛠', deco: '🎨' };

export class CatalogScreen {
  private reg: Registry;
  private res: CatalogResult;
  private tab: Tab = 'unit';
  private age = 'all';
  private civ = 'all';
  private state: StateFilter = 'all';
  private q = '';
  private seenArt = -1;
  private timer = 0;

  constructor(private overlay: HTMLElement, private onBack: () => void) {
    this.reg = buildRegistry(ALL_MODS);
    this.res = auditCatalog({ reg: this.reg, mods: ALL_MODS, art: new Set(ART.map(a => `${a.kind}:${a.id}`)), notes: notes as CatNotes });
  }

  show() {
    this.overlay.innerHTML = `
      <div class="menu catalog">
        <h1>📚 Catálogo</h1>
        <div class="sub">Todo el contenido del juego y si tiene lógica detrás. ✔ integrado · ⚠ sin usar · 🛠 en desarrollo · 🎨 decorativo.</div>
        <div class="cat-tabs" data-tabs></div>
        <div class="cat-filters" data-filters></div>
        <div class="cat-summary" data-summary></div>
        <div class="cat-body" data-body></div>
        <div class="buttons"><button data-back>↩ Volver</button></div>
      </div>`;
    this.overlay.style.display = 'flex';
    this.overlay.querySelector('[data-back]')!.addEventListener('click', () => this.close());
    this.renderChrome();
    this.renderBody();
    // Las imágenes de los retratos llegan cuando cargan las hojas: se repinta al cambiar la versión del arte
    this.timer = window.setInterval(() => {
      if (!this.overlay.querySelector('.catalog')) { clearInterval(this.timer); return; }
      if (artVersion() !== this.seenArt) this.renderBody();
    }, 800);
  }

  private close() { clearInterval(this.timer); this.onBack(); }

  private renderChrome() {
    const o = this.overlay;
    const count = (t: CatType) => this.res.items.filter(i => i.type === t).length;
    const issues = (t: CatType) => this.res.items.filter(i => i.type === t && i.state !== 'ok').length;
    o.querySelector('[data-tabs]')!.innerHTML = [
      ...CAT_TYPES.map(t => `<button class="${this.tab === t.type ? 'sel' : ''}" data-tab="${t.type}">${t.icon} ${t.label} <small>${count(t.type)}${issues(t.type) ? ` · ⚠${issues(t.type)}` : ''}</small></button>`),
      `<button class="${this.tab === 'compare' ? 'sel' : ''}" data-tab="compare">⚖️ Comparar civilizaciones</button>`,
    ].join('');
    o.querySelectorAll<HTMLElement>('[data-tab]').forEach(b => b.addEventListener('click', () => {
      this.tab = b.dataset.tab as Tab; this.renderChrome(); this.renderBody();
    }));
    const ages = this.reg.ages;
    const filters = this.tab === 'compare' ? '' : `
      <input type="search" data-q placeholder="Buscar por nombre, id o descripción…" value="${esc(this.q)}">
      <select data-age><option value="all">Todas las edades</option>${ages.map(a => `<option value="${a.index}"${this.age === String(a.index) ? ' selected' : ''}>${esc(a.name)}</option>`).join('')}</select>
      <select data-civ><option value="all">Todas las civilizaciones</option>${[...this.reg.civs.values()].map(c => `<option value="${c.id}"${this.civ === c.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
      <select data-state>
        <option value="all">Cualquier estado</option><option value="issues"${this.state === 'issues' ? ' selected' : ''}>Con problemas o pendientes</option>
        ${(Object.keys(STATE_LABEL) as CatState[]).map(s => `<option value="${s}"${this.state === s ? ' selected' : ''}>${STATE_LABEL[s]}</option>`).join('')}
      </select>`;
    o.querySelector('[data-filters]')!.innerHTML = filters;
    const q = o.querySelector<HTMLInputElement>('[data-q]');
    q?.addEventListener('input', () => { this.q = q.value; this.renderBody(); });
    o.querySelector<HTMLSelectElement>('[data-age]')?.addEventListener('change', e => { this.age = (e.target as HTMLSelectElement).value; this.renderBody(); });
    o.querySelector<HTMLSelectElement>('[data-civ]')?.addEventListener('change', e => { this.civ = (e.target as HTMLSelectElement).value; this.renderBody(); });
    o.querySelector<HTMLSelectElement>('[data-state]')?.addEventListener('change', e => { this.state = (e.target as HTMLSelectElement).value as StateFilter; this.renderBody(); });
  }

  private matches(i: CatItem): boolean {
    if (i.type !== this.tab) return false;
    if (this.age !== 'all' && (i.age === undefined || i.age > Number(this.age))) return false;
    if (this.civ !== 'all' && i.civs.length && !i.civs.includes(this.civ)) return false;
    if (this.state === 'issues' ? i.state === 'ok' : this.state !== 'all' && i.state !== this.state) return false;
    const q = this.q.trim().toLowerCase();
    return !q || `${i.name} ${i.id} ${i.description}`.toLowerCase().includes(q);
  }

  private picture(i: CatItem): string {
    const kind = i.type === 'unit' ? 'unit' : i.type === 'building' ? 'building' : i.type === 'node' ? 'resource' : null;
    if (kind) {
      try { return `<img class="cat-pic" src="${portrait(this.reg, kind, i.id, COLOR, i.age ?? 0)}" alt="">`; } catch { /* sin retrato */ }
    }
    return `<span class="cat-pic ic">${i.icon}</span>`;
  }

  private card(i: CatItem): string {
    const civs = i.civs.length ? i.civs.map(c => this.reg.civs.get(c)?.name ?? c).join(', ') : 'Todas';
    const cost = Object.entries(i.cost).filter(([, v]) => (v ?? 0) > 0).map(([r, v]) => `<span title="${esc(this.reg.resources.get(r)?.name ?? r)}">${this.reg.resources.get(r)?.icon ?? r} ${v}</span>`).join(' ');
    const li = (xs: string[]) => xs.length ? `<ul>${xs.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
    const why = [...i.missing, ...(i.note ? [`Nota${i.note.phase ? ` (fase ${i.note.phase})` : ''}: ${i.note.text}`] : [])];
    return `<article class="cat-card ${i.state}">
      <div class="cat-head">${this.picture(i)}<div><b>${esc(i.name)}</b>
        <span class="cat-badge ${i.state}" title="${esc(STATE_LABEL[i.state])}">${BADGE[i.state]} ${esc(STATE_LABEL[i.state].replace(/^\S+ /, ''))}</span></div></div>
      <div class="cat-meta">${i.ageName ? esc(i.ageName) + ' · ' : ''}${esc(civs)}${i.ai === null ? '' : i.ai ? ' · IA ✔' : ' · IA ✗'}${i.art === '—' ? '' : ' · ' + i.art}</div>
      ${cost ? `<div class="cat-cost">${cost}</div>` : ''}
      <p>${esc(i.description)}</p>
      ${why.length ? `<div class="cat-why"><b>${i.state === 'dev' ? 'En desarrollo' : i.state === 'ok' ? 'Nota' : 'Qué le falta'}:</b> ${why.map(esc).join(' ')}</div>` : ''}
      <details><summary>Qué hace e implicaciones</summary>
        ${li(i.does)}${li(i.links)}${li(i.hints)}<small>Mod: ${esc(i.mod)} · id: <code>${esc(i.id)}</code></small>
      </details></article>`;
  }

  private renderBody() {
    this.seenArt = artVersion();
    const body = this.overlay.querySelector('[data-body]') as HTMLElement | null;
    const sum = this.overlay.querySelector('[data-summary]') as HTMLElement | null;
    if (!body || !sum) return;
    if (this.tab === 'compare') { sum.textContent = ''; body.innerHTML = this.compare(); return; }
    const all = this.res.items.filter(i => i.type === this.tab);
    const shown = all.filter(i => this.matches(i));
    const n = (s: CatState) => all.filter(i => i.state === s).length;
    sum.innerHTML = `${shown.length} de ${all.length} · ✔ ${n('ok')} · ⚠ ${n('unused')} · 🛠 ${n('dev')} · 🎨 ${n('deco')}`;
    body.innerHTML = shown.length ? `<div class="cat-grid">${shown.map(i => this.card(i)).join('')}</div>` : '<p class="note">Nada coincide con los filtros.</p>';
  }

  /** Comparativa de civilizaciones: contenido acumulado por edad y contenido único. */
  private compare(): string {
    const reps = this.res.civReports;
    const ages = reps[0]?.ages ?? [];
    const table = (title: string, pick: (a: (typeof ages)[number]) => string) => `<h3>${title}</h3>
      <div class="cat-scroll"><table class="cat-table"><thead><tr><th>Civilización</th>${ages.map(a => `<th>${esc(a.ageName)}</th>`).join('')}</tr></thead>
      <tbody>${reps.map(c => `<tr><th>${esc(c.name)}</th>${c.ages.map(a => `<td>${esc(pick(a))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    return `<p class="note">Recuentos acumulados hasta cada edad (contenido común más propio). «Mejor unidad» = vida × daño por segundo, un índice grueso para detectar desequilibrios.</p>
      ${table('Unidades entrenables', a => String(a.units))}
      ${table('Edificios', a => String(a.buildings))}
      ${table('Tecnologías', a => String(a.techs))}
      ${table('Mejor unidad militar (índice)', a => a.best ? `${a.best.name} (${a.best.score})` : '—')}
      <h3>Identidad y contenido único</h3>
      <div class="cat-scroll"><table class="cat-table"><thead><tr><th>Civilización</th><th>Bonos</th><th>Únicos</th><th>Poderes</th></tr></thead><tbody>
      ${reps.map(c => `<tr><th>${esc(c.name)}</th><td>${esc(c.bonusText.join(' · ') || '—')}</td>
        <td>${esc([...c.unique.units, ...c.unique.buildings, ...c.unique.techs].join(', ') || '—')}</td><td>${esc(c.powers.join(', ') || '—')}</td></tr>`).join('')}
      </tbody></table></div>`;
  }
}
