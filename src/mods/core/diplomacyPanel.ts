import type { Session } from '../../app/Session';
import type { HudPanelDef } from '../../core/types';
import { diplomacyOff, diploState } from '../../game/diplomacy';
import { bindDiplomacy, diplomacyHtml, pendingCount } from '../../ui/diplomacyView';

/**
 * Panel de diplomacia de la interfaz de escritorio (plegado por defecto; se despliega solo cuando
 * llega una propuesta). La interfaz móvil usa la misma vista en su pantalla «Diplomacia».
 */
export const diplomacyPanel: HudPanelDef = {
  id: 'diplomacy',
  create(session: Session) {
    const g = session.game;
    if (!diploState(g) || diplomacyOff(g) || g.players.length < 3) return null;
    const el = document.createElement('div');
    let folded = true, sig = '', lastPending = 0;
    el.addEventListener('click', e => {
      if ((e.target as HTMLElement).closest('[data-fold]')) { folded = !folded; update(); }
    });
    bindDiplomacy(el, session, () => { sig = ''; update(); });
    function update() {
      const n = pendingCount(session);
      if (n > lastPending) folded = false; // te proponen algo: se abre solo
      lastPending = n;
      const body = folded ? '' : diplomacyHtml(session);
      const s = `${folded}|${n}|${body}`;
      if (s === sig) return;
      sig = s;
      el.className = `war-panel dip-panel${folded ? ' folded' : ''}`;
      el.innerHTML = `<div class="wp-head" data-fold="1"><span>🕊 Diplomacia</span><b class="wp-time">${n ? `${n} propuesta${n > 1 ? 's' : ''}` : ''}</b><i>${folded ? '▸' : '▾'}</i></div><div class="wp-body">${body}</div>`;
    }
    update();
    return { el, update };
  },
};
