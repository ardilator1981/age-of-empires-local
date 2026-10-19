import type { Session } from '../../app/Session';
import type { HudPanelDef, Pt } from '../../core/types';
import { moveInFormation } from '../../game/formation';
import { unitAvail } from '../../game/rules';
import { stagingPoint } from './ai';
import {
  activeWar, armyInCircle, battlePointInfo, conditions, declarableTargets, declareWar, enemyOf, fmt, GENERAL, isMilitary, isTownCenter,
  townLeft, warState,
} from './war';
import { BALANCE } from '../../config/balance';

function esc(s: string) {
  return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

/** Estado de la elección del punto de batalla (lo lee también el dibujo del mapa). */
export interface WarPick {
  owner: 'declared-war';
  target: number | null;
  pending: Pt | null;
  onPick(p: Pt): void;
}

/**
 * Panel del modo Guerra declarada: lista de condiciones, declaración (elegir rival y punto),
 * cuenta atrás de la preparación y marcador de la batalla. Pensado para el dedo: botones
 * grandes y la elección del punto en dos pasos (tocar el mapa y confirmar).
 */
export const warPanel: HudPanelDef = {
  id: 'declared-war',
  create(session: Session) {
    const g = session.game, ui = session.ui as any;
    if (!warState(g)) return null;
    const el = document.createElement('div');
    el.className = 'war-panel';
    let sig = '';
    // En un móvil en vertical el panel empieza plegado (se despliega tocando la cabecera)
    let folded = window.innerWidth < 600 && window.innerHeight > window.innerWidth;

    const pick = (): WarPick | null => (ui.pickPoint?.owner === 'declared-war' ? ui.pickPoint : null);
    const startPick = (target: number | null) => {
      const p: WarPick = { owner: 'declared-war', target, pending: null, onPick: pt => { p.pending = pt; } };
      ui.placing = null; ui.targeting = null;
      ui.pickPoint = p;
    };
    const myArmy = () => {
      const sel = ui.selected(g).filter((e: any) => e.owner === g.humanId && isMilitary(g, e));
      return sel.length ? sel : g.units.filter(u => !u.dead && u.owner === g.humanId && isMilitary(g, u));
    };

    el.addEventListener('click', e => {
      const b = (e.target as HTMLElement).closest('[data-a]') as HTMLElement | null;
      if (!b || b.classList.contains('off')) return;
      const a = b.dataset.a!;
      const w = activeWar(g, g.humanId);
      if (a === 'fold') folded = !folded;
      else if (a === 'declare') {
        const ts = declarableTargets(g, g.human);
        startPick(ts.length === 1 ? ts[0] : null);
      } else if (a === 'target') { const p = pick(); if (p) p.target = Number(b.dataset.id); }
      else if (a === 'cancel') ui.pickPoint = null;
      else if (a === 'confirm') {
        const p = pick();
        if (p?.pending && p.target !== null) {
          const r = declareWar(g, g.humanId, p.target, p.pending.x, p.pending.y);
          if (typeof r === 'string') g.notify(r, g.humanId, 'warn');
          else ui.pickPoint = null;
        }
      } else if (a === 'view' && w) session.renderer.cam.centerOn(w.x, w.y);
      else if (a === 'foe' && w) {
        const b = g.buildings.find(e => !e.dead && e.owner === enemyOf(w, g.humanId) && isTownCenter(g, e)) ?? g.buildings.find(e => !e.dead && e.owner === enemyOf(w, g.humanId));
        if (b) session.renderer.cam.centerOn(b.x, b.y);
      }
      else if (a === 'army' && w) {
        const units = myArmy();
        if (!units.length) { g.notify('No tienes tropas', g.humanId, 'warn'); return; }
        const s = stagingPoint(g, w, g.humanId);
        moveInFormation(g, units, s.at, s.facing);
        g.notify(`🚩 ${units.length} unidades en marcha hacia el punto de batalla`, g.humanId, 'info');
      }
      sig = '';
      update();
    });

    const row = (ok: boolean, text: string, extra = '') => `<li class="${ok ? 'ok' : 'no'}"><i>${ok ? '✔' : '✘'}</i><span>${text}</span>${extra ? `<small>${extra}</small>` : ''}</li>`;

    function body(): { head: string; time: string; html: string; cls: string } {
      const p = g.human, w = activeWar(g, p.id), pk = pick();
      if (w && w.phase === 'prep') {
        const foe = g.players[enemyOf(w, p.id)];
        const gen = conditions(g, p).general;
        return {
          cls: 'prep', head: `⚔️ Batalla contra ${esc(foe.name)}`, time: `en ${fmt(w.battleAt - g.time)}`,
          html: `<p>${w.a === p.id ? 'Has elegido' : `${esc(foe.name)} ha elegido`} el punto de batalla (círculo en el mapa). Entrena, fortifica y coloca tu ejército: nadie puede atacar hasta que empiece.</p>
            <p class="${gen ? 'good' : 'bad'}">🎖️ ${gen ? 'Tu General está listo' : 'Sin General: entrénalo en el Castillo'}</p>
            <div class="wp-btns"><button data-a="view">📍 Ver punto</button><button data-a="army">🚩 Ejército al punto</button></div>`,
        };
      }
      if (w && w.phase === 'battle') {
        const mine = armyInCircle(g, w, p.id), theirs = armyInCircle(g, w, enemyOf(w, p.id));
        const empty = w.empty[p.id] ?? 0;
        return {
          cls: 'battle', head: '⚔️ ¡Batalla!', time: `quedan ${fmt(w.endsAt - g.time)}`,
          html: `<p class="score"><b>Tú: ${mine.count}</b> · ${esc(g.players[enemyOf(w, p.id)].name)}: ${theirs.count} <small>tropas en el círculo</small></p>
            <p>Gana quien mate al General rival o deje al rival sin tropas en el círculo ${BALANCE.war.abandonSeconds} s. Solo se combate dentro del círculo.</p>
            ${empty > 0 ? `<p class="bad">⚠️ ¡Sin tropas en el círculo! Pierdes en ${Math.ceil(BALANCE.war.abandonSeconds - empty)} s</p>` : ''}
            <div class="wp-btns"><button data-a="view">📍 Ver</button><button data-a="army">🚩 Tropas al círculo</button></div>`,
        };
      }
      if (w && w.phase === 'conquest') {
        const won = w.result?.winner === p.id, foe = g.players[enemyOf(w, p.id)];
        const left = townLeft(g, won ? foe.id : p.id);
        return won ? {
          cls: 'conquest', head: '🏆 ¡Batalla ganada!', time: `quedan ${fmt((w.conquestUntil ?? g.time) - g.time)}`,
          html: `<p>Ya puedes atacar en todo el mapa. Arrasa el pueblo de ${esc(foe.name)} antes de que acabe el tiempo para ganar la partida; si resiste, vuelve la paz.</p>
            <p class="score"><b>Le quedan ${left} edificio${left === 1 ? '' : 's'}</b></p>
            ${(w.conquestEmpty ?? 0) > 0 ? `<p class="bad">⚠️ ¡Sin ejército! Si no entrenas tropas, la conquista fracasa en ${Math.ceil(BALANCE.war.conquestFailSeconds - (w.conquestEmpty ?? 0))} s</p>` : ''}
            <div class="wp-btns"><button data-a="foe">📍 Ver su pueblo</button></div>`,
        } : {
          cls: 'battle', head: '💀 Batalla perdida', time: `aguanta ${fmt((w.conquestUntil ?? g.time) - g.time)}`,
          html: `<p>${esc(foe.name)} viene a por tu pueblo. Defiéndelo: tus tropas y torres pueden atacar a sus tropas, pero no sus edificios. Si caen todos tus edificios, pierdes; si aguantas, vuelve la paz.</p>
            <p class="score"><b>Te quedan ${left} edificio${left === 1 ? '' : 's'}</b></p>`,
        };
      }
      if (pk) {
        const ts = declarableTargets(g, p);
        if (pk.target === null) {
          return {
            cls: 'pick', head: '⚔️ ¿Contra quién?', time: '',
            html: `<div class="wp-btns">${ts.map(id => `<button data-a="target" data-id="${id}" style="border-color:${g.players[id].color}">${esc(g.players[id].name)}</button>`).join('')}<button data-a="cancel">✖ Cancelar</button></div>`,
          };
        }
        let info = '<p>Toca el mapa (o haz clic) donde quieras librar la batalla.</p>';
        let ok = false;
        if (pk.pending) {
          const i = battlePointInfo(g, p.id, pk.target, pk.pending.x, pk.pending.y);
          ok = i.ok;
          info = `<p class="${i.ok ? 'good' : 'bad'}">${i.ok ? '✔ Punto válido' : `✘ ${esc(i.reason ?? '')}`}</p>
            <p>Alturas ${i.minH.toFixed(1)}–${i.maxH.toFixed(1)} · obstáculos ${Math.round(i.blocked * 100)} % · ${i.passes < 0 ? 'abierto por todos lados' : `${i.passes} entrada${i.passes === 1 ? '' : 's'}`}</p>`;
        }
        return {
          cls: 'pick', head: `⚔️ Punto de batalla contra ${esc(g.players[pk.target].name)}`, time: '',
          html: `${info}<div class="wp-btns"><button data-a="confirm" class="${ok ? '' : 'off'}">✔ Declarar aquí</button><button data-a="cancel">✖ Cancelar</button></div>`,
        };
      }
      const c = conditions(g, p);
      const ga = unitAvail(g, p, GENERAL);
      const genExtra = c.general ? '' : ga.reason?.startsWith('Disponible') ? ga.reason : 'Entrénalo en el Castillo';
      const ts = declarableTargets(g, p);
      return {
        cls: c.ok ? 'ready' : 'peace', head: '⚔️ Guerra declarada', time: c.ok && ts.length ? '¡lista!' : '',
        html: `<ul class="checks">
            ${row(c.age, g.reg.ageName(BALANCE.war.requiredAge))}
            ${row(c.discovered.length > 0, 'Asentamiento enemigo descubierto', c.discovered.map(id => esc(g.players[id].name)).join(', '))}
            ${row(c.general, 'General entrenado', genExtra)}
          </ul>
          <p class="note">Hasta que empiece una batalla nadie puede atacar.</p>
          <div class="wp-btns"><button data-a="declare" class="${ts.length ? '' : 'off'}">⚔️ Declarar la guerra</button></div>`,
      };
    }

    function update() {
      const b = body();
      const s = `${b.cls}|${b.head}|${b.html}|${folded}`;
      if (s !== sig) {
        sig = s;
        el.className = `war-panel ${b.cls}${folded ? ' folded' : ''}`;
        el.innerHTML = `<div class="wp-head" data-a="fold"><span>${b.head}</span><b class="wp-time"></b><i>${folded ? '▸' : '▾'}</i></div><div class="wp-body">${b.html}</div>`;
      }
      el.querySelector('.wp-time')!.textContent = b.time;
    }
    update();
    return { el, update };
  },
};
