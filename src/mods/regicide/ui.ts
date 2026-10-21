import type { Session } from '../../app/Session';
import type { HudPanelDef, OverlayContext } from '../../core/types';
import { ids } from '../../game/net/netCommands';
import { nearestShelter } from '../../game/garrison';
import { kingOf, regicideOn, rivalKings, shelterOfKing } from './rules';

/**
 * Panel del modo "Matar al rey": dónde está tu rey, qué hacer con él y cuántos reyes rivales
 * quedan. Usa el estilo del panel de Guerra declarada y empieza plegado en la interfaz móvil.
 */
export const kingPanel: HudPanelDef = {
  id: 'regicide',
  create(session: Session) {
    const g = session.game, ui = session.ui as any;
    if (!regicideOn(g)) return null;
    const el = document.createElement('div');
    el.className = 'war-panel';
    let sig = '';
    let folded = document.documentElement.classList.contains('ui-movil') || (window.innerWidth < 600 && window.innerHeight > window.innerWidth);

    el.addEventListener('click', e => {
      const b = (e.target as HTMLElement).closest('[data-a]') as HTMLElement | null;
      if (!b) return;
      const a = b.dataset.a!;
      const k = kingOf(g, g.humanId);
      if (a === 'fold') folded = !folded;
      else if (k && a === 'view') {
        // Con el rey dentro se selecciona su edificio (el rey no se ve); fuera, el propio rey
        const where = shelterOfKing(g, k) ?? k;
        ui.setSelection([where.id]);
        session.renderer.cam.centerOn(where.x, where.y);
      } else if (k && a === 'hide') {
        const s = nearestShelter(g, k);
        if (s) session.orders.send({ t: 'garrison', units: [k.id], target: s.id });
        else g.notify('No tienes ningún refugio libre para el rey', g.humanId, 'warn');
      } else if (k && a === 'out') {
        const s = shelterOfKing(g, k);
        if (s) session.orders.send({ t: 'ungarrison', at: ids([s]) });
      }
      sig = '';
      update();
    });

    function update() {
      const k = kingOf(g, g.humanId), inn = k ? shelterOfKing(g, k) : undefined;
      const foes = rivalKings(g, g.humanId).length;
      const status = !k ? '<p class="bad">Tu rey ha caído</p>'
        : inn ? `<p class="good">Tu rey está a salvo en: ${g.buildingDef(inn).name}</p>`
          : `<p class="bad">⚠️ Tu rey está fuera, expuesto (${Math.round(k.hp)}/${Math.round(k.maxHp)} PV)</p>`;
      const btns = !k ? '' : `<div class="wp-btns"><button data-a="view">📍 Ver rey</button>${inn ? '<button data-a="out">🚪 Sacar</button>' : '<button data-a="hide">🏰 Refugiar</button>'}</div>`;
      const html = `${status}<p class="note">Pierdes si matan a tu rey. Gana el último con rey vivo: busca y mata a los ${foes} rey${foes === 1 ? '' : 'es'} rival${foes === 1 ? '' : 'es'}. Se esconden en sus edificios: derríbalos.</p>${btns}`;
      const head = `👑 ${k ? (inn ? 'Rey a salvo' : 'Rey expuesto') : 'Rey caído'}`;
      const cls = !k ? 'battle' : inn ? '' : 'battle';
      const s = `${cls}|${head}|${html}|${folded}`;
      if (s === sig) return;
      sig = s;
      el.className = `war-panel ${cls}${folded ? ' folded' : ''}`;
      el.innerHTML = `<div class="wp-head" data-a="fold"><span>${head}</span><b class="wp-time"></b><i>${folded ? '▸' : '▾'}</i></div><div class="wp-body">${html}</div>`;
    }
    update();
    return { el, update };
  },
};

function crown(o: OverlayContext, x: number, y: number, label: string) {
  const { ctx } = o, z = o.zoom;
  const c = o.project(x, y);
  ctx.font = `bold ${Math.max(12, Math.round(18 * z))}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.strokeText(label, c.x, c.y - 12 * z);
  ctx.fillStyle = '#ffe08a'; ctx.fillText(label, c.x, c.y - 12 * z);
  ctx.textAlign = 'left';
}

/** Corona sobre el edificio donde se esconde tu rey (si va por fuera, ya se le ve la corona). */
export function drawKingWorld(o: OverlayContext) {
  const g = o.game;
  if (!regicideOn(g)) return;
  const k = kingOf(g, g.humanId), inn = k ? shelterOfKing(g, k) : undefined;
  if (inn) crown(o, inn.x, inn.y, '👑');
}

/** Punto dorado del rey propio en el minimapa (también dentro de un edificio). */
export function drawKingMinimap(o: OverlayContext) {
  const g = o.game;
  if (!regicideOn(g)) return;
  const k = kingOf(g, g.humanId);
  if (!k) return;
  const p = o.project(k.x, k.y);
  o.ctx.fillStyle = '#ffd24a'; o.ctx.strokeStyle = '#2a1a06'; o.ctx.lineWidth = 1.5;
  o.ctx.beginPath(); o.ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2); o.ctx.fill(); o.ctx.stroke();
}
