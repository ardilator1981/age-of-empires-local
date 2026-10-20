import type { Session } from '../app/Session';
import { BALANCE } from '../config/balance';
import { TICK_DT } from '../core/constants';
import type { NetGame } from '../net/NetGame';

function esc(s: string) {
  return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

/**
 * Lo propio de una partida en red, encima del mapa y en las dos interfaces (escritorio y móvil):
 * latencia y retardo, a quién se espera, la pausa para todos (con el botón de reanudar) y si la
 * IA está jugando por ti.
 */
export class NetHud {
  private el = document.createElement('div');
  private sig = '';

  constructor(private s: Session, private net: NetGame) {
    this.el.id = 'net-hud';
    document.getElementById('hud')!.appendChild(this.el);
    this.el.addEventListener('click', e => {
      const a = (e.target as HTMLElement).closest('[data-net]') as HTMLElement | null;
      if (a?.dataset.net === 'resume') this.s.orders.send({ t: 'pause', on: false });
    });
  }

  update() {
    const net = this.net, g = this.s.game;
    if (this.s.orders !== net || net.game !== g) { this.el.style.display = 'none'; return; }
    this.el.style.display = '';
    const ms = (t: number) => `${Math.round(t)} ms`;
    const delay = net.peer ? net.peer.delay * TICK_DT * 1000 : 0;
    const rtt = net.rtt;
    const quality = rtt === null ? '' : rtt < 120 ? 'good' : rtt < 250 ? 'ok' : 'bad';
    const chip = `<span class="nh-chip ${quality}" title="Ida y vuelta con ${net.isHost ? 'el invitado más lento' : 'el anfitrión'} · retardo de las órdenes">📶 ${rtt === null ? '—' : ms(rtt)} · ⏱ ${ms(delay)}</span>`;
    const lines: string[] = [];
    const pause = g.data.netPause as { by: number } | undefined;
    if (pause) lines.push(`<div class="nh-banner">⏸ Pausa de ${esc(g.players[pause.by]?.name ?? '?')} <button data-net="resume">▶ Reanudar</button></div>`);
    if (net.waitingMs > BALANCE.net.waitNotice) {
      const who = net.waitingNames();
      const secs = Math.floor(net.waitingMs / 1000);
      lines.push(`<div class="nh-banner wait">⏳ Esperando a ${esc(who.join(', ') || 'los demás')}…${secs >= 2 ? ` ${secs} s` : ''}${net.isHost && secs >= 2 ? '<small>Si no vuelve pronto, la IA jugará por él</small>' : ''}</div>`);
    }
    if (g.human.data.aiControl) lines.push('<div class="nh-banner">🤖 La IA juega por ti mientras vuelves…</div>');
    if (net.loading) lines.push('<div class="nh-banner">⏳ Cargando la partida del anfitrión…</div>');
    const html = chip + lines.join('');
    if (html !== this.sig) { this.sig = html; this.el.innerHTML = html; }
  }

  dispose() { this.el.remove(); }
}
