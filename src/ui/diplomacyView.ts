import type { Session } from '../app/Session';
import { BALANCE } from '../config/balance';
import { ALLIANCE, PEACE, diplomacyOff, diploState, embargoed, proposalsFor, relation } from '../game/diplomacy';

/**
 * Vista de la diplomacia: una fila por rival con su relación y los botones para proponer, aceptar,
 * romper, regalar y decretar embargos. La comparten el panel de escritorio y la pantalla móvil.
 * Todo son órdenes de red `diplo` (`session.orders.send`), así que también sirve en línea.
 */

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const REL = ['⚔ En guerra', '🕊 En paz', '🤝 Aliados'];
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.ceil(s % 60)).padStart(2, '0')}`;
const TRIBUTE = 100;

/** Propuestas que esperan mi respuesta (para el distintivo). */
export function pendingCount(s: Session): number {
  return proposalsFor(s.game, s.game.humanId).length;
}

export function diplomacyHtml(s: Session): string {
  const g = s.game, me = g.human;
  if (diplomacyOff(g)) return '<p class="note">En este modo de juego no hay diplomacia.</p>';
  const d = diploState(g);
  const rows = g.players.slice(1).filter(q => q.id !== me.id).map(q => {
    const rel = relation(g, me.id, q.id);
    const head = `<span class="swatch" style="background:${q.color}"></span><b>${esc(q.name)}</b> <small>${esc(q.identity)}</small>`;
    if (q.defeated) return `<li class="dip">${head} — Derrotado</li>`;
    const incoming = proposalsFor(g, me.id).filter(p => p.from === q.id);
    const out = d?.proposals.filter(p => p.from === me.id && p.to === q.id) ?? [];
    const lock = d ? Math.max(0, BALANCE.diplomacy.treatyLock - (g.time - d.since[me.id * d.n + q.id])) : 0;
    const btn = (a: string, label: string, extra = '', off = false) => `<button data-d="${a}" data-to="${q.id}" ${extra} class="${off ? 'off' : ''}">${label}</button>`;
    const b: string[] = [];
    for (const p of incoming) {
      b.push(`<button data-d="accept" data-id="${p.id}">✔ Aceptar ${p.kind === 'peace' ? 'la paz' : 'la alianza'}</button><button data-d="decline" data-id="${p.id}">✖ Rechazar</button>`);
    }
    if (rel === 0 && !out.some(p => p.kind === 'peace')) b.push(btn('propose', '🕊 Proponer paz', 'data-kind="peace"'));
    if (rel === PEACE) {
      if (!out.some(p => p.kind === 'alliance')) b.push(btn('propose', '🤝 Proponer alianza', 'data-kind="alliance"', lock > 0));
      b.push(btn('break', lock > 0 ? `⚔ Declarar guerra (${clock(lock)})` : '⚔ Declarar guerra', '', lock > 0));
    }
    if (rel === ALLIANCE) b.push(btn('break', lock > 0 ? `💔 Romper alianza (${clock(lock)})` : '💔 Romper alianza', '', lock > 0));
    b.push(btn('tribute', `🎁 ${TRIBUTE} de oro`, '', (me.res.gold ?? 0) < TRIBUTE));
    const emb = embargoed(g, me.id, q.id) && d && d.embargo[me.id * d.n + q.id] === 1;
    b.push(btn('embargo', emb ? '✅ Levantar embargo' : '⛔ Embargo', `data-on="${emb ? 0 : 1}"`));
    const note = [out.length ? 'esperando respuesta…' : '', embargoed(g, me.id, q.id) ? '⛔ embargo' : ''].filter(Boolean).join(' · ');
    return `<li class="dip">${head} — ${REL[rel]}${note ? ` <small>${note}</small>` : ''}<div class="wp-btns dip-btns">${b.join('')}</div></li>`;
  }).join('');
  const total = Math.floor(me.data.tradeTotal ?? 0);
  return `<ul class="m-list dip-list">${rows}</ul>${total ? `<p class="note">🐪 Ganado con el comercio: ${total} de oro</p>` : ''}`;
}

/** Atiende los botones de `diplomacyHtml` dentro de `root`; `after` repinta. */
export function bindDiplomacy(root: HTMLElement, s: Session, after: () => void) {
  root.addEventListener('click', e => {
    const t = (e.target as HTMLElement).closest('[data-d]') as HTMLElement | null;
    if (!t || t.classList.contains('off')) return;
    const a = t.dataset.d!, to = Number(t.dataset.to), id = Number(t.dataset.id);
    const send = (args: Record<string, unknown>) => s.orders.send({ t: 'mod', id: 'diplo', args });
    switch (a) {
      case 'propose': send({ a, to, kind: t.dataset.kind }); break;
      case 'accept': case 'decline': send({ a, id }); break;
      case 'break': send({ a, to }); break;
      case 'tribute': send({ a, to, res: 'gold', amount: TRIBUTE }); break;
      case 'embargo': send({ a, to, on: t.dataset.on === '1' }); break;
    }
    after();
  });
}
