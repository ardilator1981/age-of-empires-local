import qrcode from 'qrcode-generator';
import type { App } from '../app/App';
import { BALANCE } from '../config/balance';
import { PLAYER_COLORS, PLAYER_COLOR_NAMES } from '../core/constants';
import type { Registry } from '../core/Registry';
import { buildRegistry } from '../core/Registry';
import { civIncomplete } from '../game/rules';
import { SAVE_VERSION } from '../game/save';
import { ALL_MODS } from '../mods';
import { NetGame } from '../net/NetGame';
import { NET_PROTOCOL, type LobbySettings, type LobbyState, type Transport } from '../net/protocol';
import { TabTransport } from '../net/transports/broadcast';
import { joinManual, ManualHost, STUN } from '../net/transports/manual';
import { STRATEGIES, TrysteroTransport, type Strategy } from '../net/transports/trystero';
import { DIFFS, esc, opt, POP_LIMITS, RESOURCES, SIZES, SPEEDS, VISIBILITY } from './menuOptions';

/**
 * Sala de las partidas en red. Tres formas de conectar:
 * - **Por internet:** sala con código y enlace; los navegadores se encuentran por redes públicas
 *   y gratuitas (Trystero) y luego hablan directamente (WebRTC).
 * - **Sin intermediarios:** el anfitrión crea una invitación (código o QR) por jugador y cada uno
 *   le devuelve su respuesta. No interviene nadie más (solo STUN públicos).
 * - **En este navegador:** otra pestaña (para probar en un solo ordenador).
 *
 * El anfitrión elige las opciones y los puestos de la IA; cada jugador, su nombre, civilización y
 * color. Al empezar, todos cargan la partida del anfitrión (ver net/NetGame.ts).
 */

type Mode = 'internet' | 'manual' | 'tabs';

export interface LobbyDefaults {
  name: string;
  civ: string;
  color: number;
  settings: LobbySettings;
  registry: () => Registry;
  rememberName: (name: string) => void;
}

interface ConnPrefs { mode: Mode; strategy: 'auto' | Strategy; turnUrl: string; turnUser: string; turnPass: string }

const PREFS_KEY = 'aoe-net-prefs-v1';
/** Sala en la que está esta pestaña como invitado (para volver sola si se recarga). */
const ROOM_KEY = 'aoe-net-room';
const CLIENT_KEY = 'aoe-net-client';
/** Versión que tienen que compartir los jugadores (además del contenido, que se compara al empezar). */
export const NET_BUILD = `${NET_PROTOCOL}.${SAVE_VERSION}`;
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function loadPrefs(): ConnPrefs {
  const d: ConnPrefs = { mode: 'internet', strategy: 'auto', turnUrl: '', turnUser: '', turnPass: '' };
  try { return { ...d, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') }; } catch { return d; }
}
function savePrefs(p: ConnPrefs) { try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* sin almacenamiento */ } }

let memoId = '';
/**
 * Identificador de este cliente, para volver a la misma partida si se corta o se recarga la
 * página. Va en sessionStorage: es de esta pestaña (dos pestañas son dos jugadores) y sobrevive
 * a recargarla.
 */
export function clientId(): string {
  // Un juego incrustado (iframe) comparte sessionStorage con la página: tiene el suyo propio
  if (window.top !== window) return memoId ||= Math.random().toString(36).slice(2);
  try {
    let id = sessionStorage.getItem(CLIENT_KEY);
    if (!id) { id = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2); sessionStorage.setItem(CLIENT_KEY, id); }
    return id;
  } catch { return memoId ||= Math.random().toString(36).slice(2); }
}

const newCode = () => Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
const baseUrl = () => location.href.replace(/[#?].*$/, '');
const qrSvg = (text: string) => {
  const q = qrcode(0, 'L');
  q.addData(text);
  q.make();
  return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
};
const MODES: [Mode, string, string][] = [
  ['internet', '🌍 Por internet', 'Con un código o un enlace. Gratis y sin servidor propio: los navegadores se encuentran por redes públicas (Nostr, BitTorrent o MQTT) y luego se conectan directamente.'],
  ['manual', '📷 Sin intermediarios', 'El anfitrión enseña un código o QR a cada jugador, y este le devuelve el suyo. No pasa por nadie más. Ideal en la misma wifi.'],
  ['tabs', '🗂 En este navegador', 'Otra pestaña de este mismo navegador. Para probar sin red.'],
];

export class Lobby {
  private prefs = loadPrefs();
  private net: NetGame | null = null;
  private code = '';
  private role: 'host' | 'guest' = 'host';
  private status = '';
  private manualHost: ManualHost | null = null;
  private invite: { code: string; accept: (a: string) => Promise<void>; cancel: () => void } | null = null;
  private answer = '';
  private offs: (() => void)[] = [];
  private answerCh: BroadcastChannel | null = null;
  private armed = '';

  constructor(private app: App, private overlay: HTMLElement, private d: LobbyDefaults, private back: () => void) {}

  private render(html: string) {
    this.overlay.innerHTML = html;
    this.overlay.style.display = 'flex';
  }

  private ice(): RTCIceServer[] {
    const p = this.prefs;
    return p.turnUrl ? [...STUN, { urls: p.turnUrl, username: p.turnUser || undefined, credential: p.turnPass || undefined }] : STUN;
  }

  // ------------------------------------------------------------ entrada

  show() {
    const p = this.prefs;
    const modes = MODES.map(([m, label, desc]) => `<button class="nl-mode${p.mode === m ? ' on' : ''}" data-mode="${m}"><b>${label}</b><small>${desc}</small></button>`).join('');
    this.render(`
      <div class="menu small net-lobby">
        <h1>🌐 Jugar en red</h1>
        <div class="sub">Partida con amigos: cada uno en su dispositivo, móvil u ordenador.</div>
        <div class="nl-row"><label>Tu nombre</label><input data-name value="${esc(this.d.name)}" maxlength="18"></div>
        <div class="nl-modes">${modes}</div>
        <div class="nl-actions">
          <button class="start" data-create>🏠 Crear sala</button>
          ${p.mode === 'manual'
            ? '<div class="nl-join"><textarea data-code rows="2" placeholder="Pega aquí la invitación del anfitrión"></textarea><button class="small" data-join>Unirme</button></div>'
            : '<div class="nl-join"><input data-code placeholder="Código de la sala" maxlength="6" autocapitalize="characters" autocomplete="off"><button class="small" data-join>Unirme</button></div>'}
        </div>
        <details class="nl-adv"><summary>Opciones de conexión</summary>
          <div class="grid">
            <label>Señalización</label><select data-strategy>${opt('auto', 'Automática (Nostr, luego BitTorrent y MQTT)', p.strategy)}${STRATEGIES.map(([v, l]) => opt(v, l, p.strategy)).join('')}</select>
            <label>TURN (opcional)</label><input data-turn="turnUrl" value="${esc(p.turnUrl)}" placeholder="turn:servidor:3478">
            <label>Usuario</label><input data-turn="turnUser" value="${esc(p.turnUser)}">
            <label>Contraseña</label><input data-turn="turnPass" type="password" value="${esc(p.turnPass)}">
          </div>
          <p class="note">Casi siempre basta con los STUN públicos (Google y Cloudflare). Un TURN solo hace falta si alguna red (algunas de datos móviles o de empresa) no deja conectar directamente; los hay con capa gratuita (ver docs/multijugador.md).</p>
        </details>
        <p class="nl-status">${esc(this.status)}</p>
        <div class="buttons"><button data-back>↩ Volver</button></div>
      </div>`);
    const root = this.overlay;
    const nameEl = root.querySelector<HTMLInputElement>('[data-name]')!;
    nameEl.addEventListener('change', () => { this.d.name = nameEl.value.trim() || 'Jugador'; this.d.rememberName(this.d.name); });
    root.querySelectorAll<HTMLElement>('[data-mode]').forEach(b => b.addEventListener('click', () => { this.prefs.mode = b.dataset.mode as Mode; savePrefs(this.prefs); this.show(); }));
    root.querySelector<HTMLSelectElement>('[data-strategy]')!.addEventListener('change', e => { this.prefs.strategy = (e.target as HTMLSelectElement).value as ConnPrefs['strategy']; savePrefs(this.prefs); });
    root.querySelectorAll<HTMLInputElement>('[data-turn]').forEach(el => el.addEventListener('change', () => { (this.prefs as any)[el.dataset.turn!] = el.value.trim(); savePrefs(this.prefs); }));
    root.querySelector('[data-create]')!.addEventListener('click', () => { this.d.name = nameEl.value.trim() || 'Jugador'; this.create(); });
    root.querySelector('[data-join]')!.addEventListener('click', () => {
      this.d.name = nameEl.value.trim() || 'Jugador';
      const v = root.querySelector<HTMLInputElement | HTMLTextAreaElement>('[data-code]')!.value.trim();
      if (!v) return;
      if (this.prefs.mode === 'manual') void this.joinManual(v);
      else this.join(v.toUpperCase().replace(/[^A-Z0-9]/g, ''));
    });
    root.querySelector('[data-back]')!.addEventListener('click', () => { this.close(); this.back(); });
  }

  // ------------------------------------------------------------ crear y unirse

  private strategies(): Strategy[] {
    const all = STRATEGIES.map(s => s[0]);
    return this.prefs.strategy === 'auto' ? all : [this.prefs.strategy, ...all.filter(s => s !== this.prefs.strategy)];
  }

  private transport(code: string, host: boolean): Transport {
    if (this.prefs.mode === 'tabs') return new TabTransport(code);
    const turn = this.prefs.turnUrl ? [{ urls: this.prefs.turnUrl, username: this.prefs.turnUser || undefined, credential: this.prefs.turnPass || undefined }] : undefined;
    return new TrysteroTransport(code, {
      host, strategies: this.strategies(), turn,
      onState: text => { this.status = text; this.updateStatus(); },
    });
  }

  private netGame(t: Transport, role: 'host' | 'guest'): NetGame {
    this.role = role;
    const net = new NetGame({
      transport: t, role, clientId: clientId(), name: this.d.name, build: NET_BUILD, code: this.code,
      registry: mods => buildRegistry(ALL_MODS.filter(m => m.core || mods.includes(m.id))),
      prepareMap: async (reg, mapType) => { await reg.mapTypes.get(mapType)?.load?.(); },
      settings: role === 'host' ? { ...this.d.settings } : undefined,
      me: { civ: this.d.civ, color: this.d.color },
    });
    this.net = net;
    // La app juega cada partida que salga de aquí; la sala se dibuja con cada cambio
    this.app.playNet(net);
    this.offs.push(
      net.on('lobby', () => {
        if (role === 'guest' && /Buscando|Conectando|respuesta/.test(this.status)) this.status = 'Estás en la sala';
        if (!this.app.session) this.room();
      }),
      net.on('refused', reason => { this.status = reason; this.close(); this.show(); }),
      net.on('game', () => this.stopListening()),
      net.on('hostLost', () => { if (!this.app.session) { this.status = 'Se ha perdido la conexión con el anfitrión'; this.close(); this.show(); } }),
      net.on('info', text => { if (!this.app.session) { this.status = text; this.updateStatus(); } }),
    );
    return net;
  }

  private create() {
    this.code = this.prefs.mode === 'manual' ? '' : newCode();
    if (this.prefs.mode === 'manual') {
      this.manualHost = new ManualHost(this.ice());
      this.netGame(this.manualHost, 'host');
      this.listenAnswers();
    } else this.netGame(this.transport(this.code, true), 'host');
    this.status = this.prefs.mode === 'manual' ? 'Crea una invitación para cada jugador' : 'Esperando a que entren jugadores…';
    this.room();
  }

  join(code: string) {
    if (code.length < 4) { this.status = 'El código de la sala tiene 6 letras o números'; this.show(); return; }
    this.code = code;
    try { sessionStorage.setItem(ROOM_KEY, JSON.stringify({ mode: this.prefs.mode, code })); } catch { /* sin almacenamiento */ }
    this.status = this.prefs.mode === 'tabs' ? 'Buscando la sala en las otras pestañas…' : 'Buscando la sala…';
    this.netGame(this.transport(code, false), 'guest');
    this.room();
  }

  /** Abre directamente una forma de unirse (desde un enlace). */
  joinWith(mode: Mode, code: string) {
    this.prefs.mode = mode;
    if (mode === 'manual') void this.joinManual(code);
    else this.join(code);
  }

  private async joinManual(invite: string) {
    this.status = 'Preparando la respuesta…';
    this.room();
    try {
      const { transport, answer } = await joinManual(invite, this.ice());
      this.answer = answer;
      this.status = 'Devuelve tu respuesta al anfitrión';
      this.netGame(transport, 'guest');
      this.room();
    } catch (err) {
      this.status = `No se pudo usar la invitación: ${(err as Error).message}`;
      this.show();
    }
  }

  /** Respuestas que llegan desde otra pestaña (al escanear el QR de respuesta con la cámara). */
  private listenAnswers() {
    try {
      this.answerCh = new BroadcastChannel('aoe-respuesta');
      this.answerCh.onmessage = e => { if (typeof e.data?.code === 'string') void this.acceptAnswer(e.data.code); };
    } catch { /* sin BroadcastChannel */ }
  }

  private async acceptAnswer(code: string) {
    if (!this.invite) { this.status = 'No hay ninguna invitación pendiente'; this.updateStatus(); return; }
    try {
      await this.invite.accept(code);
      this.invite = null;
      this.status = 'Conectando…';
    } catch (err) { this.status = `Respuesta no válida: ${(err as Error).message}`; }
    this.room();
  }

  // ------------------------------------------------------------ sala

  private room() {
    const net = this.net, l = net?.lobby ?? null;
    const host = this.role === 'host';
    const reg = this.d.registry();
    const civs = [...reg.civs.values()];
    const civOpts = (cur: string) => opt('random', '🎲 Aleatoria', cur) + civs.map(c => opt(c.id, civIncomplete(reg, c) ? `${c.name} (incompleta)` : c.name, cur)).join('');
    const colorOpts = (cur: number) => PLAYER_COLORS.map((_, i) => opt(i, PLAYER_COLOR_NAMES[i], cur)).join('');
    const me = clientId();
    const slots = (l?.slots ?? []).map((s, i) => {
      const mine = s.clientId === me, ai = s.kind === 'ai', edit = mine || (host && ai);
      const label = ai ? 'IA' : `${esc(s.name)}${s.clientId === l!.hostId ? ' 👑' : ''}${mine ? ' (tú)' : ''}`;
      return `<div class="prow nl-slot"><span class="swatch" style="background:${PLAYER_COLORS[s.color]}"></span>
        ${mine ? `<input data-pick="name" value="${esc(s.name)}" maxlength="18">` : `<span class="nl-pname">${label}</span>`}
        ${edit ? `<select data-slot="${i}" data-pick="civ">${civOpts(s.civ)}</select>` : `<span class="nl-civ">${esc(s.civ === 'random' ? '🎲 Aleatoria' : reg.civs.get(s.civ)?.name ?? s.civ)}</span>`}
        ${edit ? `<select data-slot="${i}" data-pick="color">${colorOpts(s.color)}</select>` : ''}
        ${ai && host ? `<select data-slot="${i}" data-pick="difficulty">${DIFFS.map(([v, t]) => opt(v, t, s.difficulty)).join('')}</select><button class="small" data-del="${i}">✕</button>` : ai ? `<small>${DIFFS.find(x => x[0] === s.difficulty)?.[1]}</small>` : ''}
      </div>`;
    }).join('');
    const humans = l?.slots.filter(s => s.kind === 'human').length ?? 0;
    const link = this.code ? `${baseUrl()}#sala=${this.code}${this.prefs.mode === 'tabs' ? '&modo=pestanas' : ''}` : '';
    const invite = this.prefs.mode === 'manual' && host ? this.inviteHtml() : '';
    const answer = this.prefs.mode === 'manual' && !host && this.answer ? this.answerHtml() : '';
    this.render(`
      <div class="menu small net-lobby">
        <h1>${host ? '🏠 Tu sala' : '🤝 Sala'}</h1>
        ${this.code ? `<div class="nl-code"><span>Código</span><b>${this.code}</b>${host ? `<button class="small" data-copy="${esc(link)}">📋 Copiar enlace</button>${'share' in navigator ? `<button class="small" data-share="${esc(link)}">📤 Compartir</button>` : ''}<button class="small" data-qr>▦ QR</button>` : ''}</div>
          ${host ? `<div class="nl-qr" hidden>${qrSvg(link)}<small>Escanéalo con la cámara del otro móvil</small></div>` : ''}` : ''}
        ${invite}${answer}
        <section class="nl-section"><h2>Jugadores</h2>
          ${slots || '<p class="note">Conectando…</p>'}
          ${host && l && l.slots.length < BALANCE.net.maxPlayers ? '<button class="small" data-ai>+ Añadir IA</button>' : ''}
        </section>
        ${l ? this.settingsHtml(l, host, reg) : ''}
        <p class="nl-status">${esc(this.status)}</p>
        ${host ? `<button class="start" data-start${humans < 2 ? ' disabled' : ''}>⚔️ Empezar partida</button>${humans < 2 ? '<p class="note">Hace falta al menos otro jugador.</p>' : ''}` : (l ? '<p class="note">El anfitrión empezará la partida.</p>' : '')}
        <div class="buttons"><button data-leave>🚪 Salir de la sala</button></div>
      </div>`);
    this.bindRoom(host);
  }

  private settingsHtml(l: LobbyState, host: boolean, reg: Registry): string {
    const s = l.settings;
    const sel = (k: keyof LobbySettings, opts: [string | number, string][]) =>
      host ? `<select data-set="${k}">${opts.map(([v, t]) => opt(v, t, s[k] as any)).join('')}</select>` : `<span>${esc(opts.find(o => o[0] === s[k])?.[1] ?? String(s[k]))}</span>`;
    const maps: [string, string][] = [...reg.mapTypes.values()].map(m => [m.id, m.name]);
    return `<section class="nl-section"><h2>Partida</h2><div class="grid">
      <label>Mapa</label>${sel('mapType', maps)}
      <label>Tamaño</label>${sel('mapSize', SIZES)}
      <label>Recursos</label>${sel('startingResources', RESOURCES)}
      <label>Edad inicial</label>${sel('startAge', reg.ages.map(a => [a.index, a.name]))}
      <label>Victoria</label>${sel('victory', [...reg.victories.values()].map(v => [v.id, v.name]))}
      <label>Visibilidad</label>${sel('visibility', VISIBILITY)}
      <label>Población</label>${sel('popLimit', POP_LIMITS.map(v => [v, String(v)]))}
      <label>Velocidad</label>${sel('speed', SPEEDS)}
      <label>Mods</label><span>${esc(s.mods.map(id => ALL_MODS.find(m => m.id === id)?.name ?? id).join(', ') || 'Ninguno')}</span>
    </div>${host ? '<p class="note">Los mods son los del menú principal.</p>' : ''}</section>`;
  }

  private inviteHtml(): string {
    if (!this.invite) return `<section class="nl-section"><h2>Invitar</h2>
      <p class="note">Una invitación por jugador. Se la enseñas (QR) o se la mandas (copiar o compartir), y te devuelve su respuesta.</p>
      <button class="small" data-invite>➕ Crear invitación</button></section>`;
    const url = `${baseUrl()}#unirse=${this.invite.code}`;
    return `<section class="nl-section"><h2>Invitación</h2>
      <div class="nl-qr">${qrSvg(url)}<small>1. Que el otro jugador escanee esto con la cámara (o mándale el enlace)</small></div>
      <div class="nl-copyrow"><button class="small" data-copy="${esc(url)}">📋 Copiar enlace</button>${'share' in navigator ? `<button class="small" data-share="${esc(url)}">📤 Compartir</button>` : ''}</div>
      <small>2. Pega aquí su respuesta (o escanea su QR con la cámara de este dispositivo):</small>
      <div class="nl-join"><textarea data-answer rows="2" placeholder="Respuesta del jugador"></textarea><button class="small" data-accept>Conectar</button></div>
      <button class="small" data-invite-cancel>Cancelar invitación</button></section>`;
  }

  private answerHtml(): string {
    const url = `${baseUrl()}#respuesta=${this.answer}`;
    return `<section class="nl-section"><h2>Tu respuesta</h2>
      <div class="nl-qr">${qrSvg(url)}<small>Enséñasela al anfitrión: que la escanee con la cámara</small></div>
      <div class="nl-copyrow"><button class="small" data-copy="${esc(this.answer)}">📋 Copiar respuesta</button>${'share' in navigator ? `<button class="small" data-share-text="${esc(this.answer)}">📤 Compartir</button>` : ''}</div>
      <textarea readonly rows="2" class="nl-codebox">${esc(this.answer)}</textarea></section>`;
  }

  private bindRoom(host: boolean) {
    const root = this.overlay, net = this.net;
    root.querySelectorAll<HTMLElement>('[data-copy]').forEach(b => b.addEventListener('click', () => void this.copy(b.dataset.copy!)));
    root.querySelectorAll<HTMLElement>('[data-share]').forEach(b => b.addEventListener('click', () => {
      void navigator.share?.({ title: 'Liada de Imperios · partida en red', text: 'Únete a mi partida', url: b.dataset.share }).catch(() => {});
    }));
    root.querySelectorAll<HTMLElement>('[data-share-text]').forEach(b => b.addEventListener('click', () => {
      void navigator.share?.({ title: 'Respuesta para la partida', text: b.dataset.shareText }).catch(() => {});
    }));
    root.querySelector('[data-qr]')?.addEventListener('click', () => { const q = root.querySelector<HTMLElement>('.nl-qr'); if (q) q.hidden = !q.hidden; });
    root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-pick]').forEach(el => el.addEventListener('change', () => {
      const k = el.dataset.pick!, slot = el.dataset.slot !== undefined ? Number(el.dataset.slot) : -1;
      const v = k === 'color' ? Number(el.value) : el.value;
      const s = net?.lobby?.slots[slot];
      if (s && s.kind === 'ai') net!.editSlot(slot, { [k]: v });
      else {
        net?.pick({ [k]: v });
        if (k === 'name') { this.d.name = String(v); this.d.rememberName(this.d.name); }
        if (k === 'civ') this.d.civ = String(v);
      }
    }));
    root.querySelectorAll<HTMLSelectElement>('[data-set]').forEach(el => el.addEventListener('change', () => {
      const k = el.dataset.set as keyof LobbySettings;
      const num = ['mapSize', 'startAge', 'popLimit', 'speed'].includes(k);
      net?.setSettings({ [k]: num ? Number(el.value) : el.value } as Partial<LobbySettings>);
    }));
    root.querySelectorAll<HTMLElement>('[data-del]').forEach(b => b.addEventListener('click', () => net?.editSlot(Number(b.dataset.del), null)));
    root.querySelector('[data-ai]')?.addEventListener('click', () => net?.addAI());
    root.querySelector('[data-start]')?.addEventListener('click', () => {
      this.status = 'Creando la partida…';
      this.updateStatus();
      void net?.start();
    });
    root.querySelector('[data-invite]')?.addEventListener('click', async () => {
      this.status = 'Preparando la invitación…';
      this.updateStatus();
      try { this.invite = await this.manualHost!.invite(); this.status = ''; } catch (err) { this.status = `No se pudo crear: ${(err as Error).message}`; }
      this.room();
    });
    root.querySelector('[data-accept]')?.addEventListener('click', () => {
      const v = root.querySelector<HTMLTextAreaElement>('[data-answer]')!.value.trim();
      if (v) void this.acceptAnswer(v);
    });
    root.querySelector('[data-invite-cancel]')?.addEventListener('click', () => { this.invite?.cancel(); this.invite = null; this.room(); });
    root.querySelector('[data-leave]')!.addEventListener('click', () => {
      if (this.armed !== 'leave' && host && (net?.lobby?.slots.length ?? 0) > 1) { this.armed = 'leave'; const b = root.querySelector('[data-leave]')!; b.textContent = '¿Seguro? Se cierra la sala'; return; }
      this.armed = '';
      this.close();
      this.status = '';
      this.show();
    });
  }

  private updateStatus() {
    const el = this.overlay.querySelector('.nl-status');
    if (el) el.textContent = this.status;
  }

  private async copy(text: string) {
    try { await navigator.clipboard.writeText(text); this.status = 'Copiado'; } catch {
      // Sin portapapeles (p. ej. por http en la red local): se enseña para copiarlo a mano
      window.prompt('Copia esto:', text);
    }
    this.updateStatus();
  }

  private stopListening() {
    this.offs.forEach(f => f());
    this.offs = [];
    this.answerCh?.close();
    this.answerCh = null;
  }

  /** Sale de la sala (si la partida no ha empezado). */
  private close() {
    try { sessionStorage.removeItem(ROOM_KEY); } catch { /* sin almacenamiento */ }
    this.stopListening();
    this.invite?.cancel();
    this.invite = null;
    this.answer = '';
    // Sin partida empezada, la sala se cierra; con partida, ya es de la app
    if (this.net && !this.net.game) { if (this.app.net === this.net) this.app.leaveNet(); else this.net.leave(); }
    this.net = null;
  }
}

/**
 * Enlaces que abren directamente la sala: `#sala=CÓDIGO` (por internet o, con `&modo=pestanas`,
 * otra pestaña), `#unirse=INVITACIÓN` (sin intermediarios) y `#respuesta=RESPUESTA` (se la pasa a la
 * pestaña del anfitrión de este mismo navegador). Devuelve si había alguno.
 */
export function openFromUrl(app: App, lobby: () => Lobby): boolean {
  const h = new URLSearchParams(location.hash.slice(1));
  const sala = h.get('sala'), unirse = h.get('unirse'), respuesta = h.get('respuesta');
  if (!sala && !unirse && !respuesta) {
    // Se ha recargado la página estando en una sala: se vuelve a ella (y a la partida, si había)
    let room: { mode: Mode; code: string } | null = null;
    try { room = JSON.parse(sessionStorage.getItem(ROOM_KEY) ?? 'null'); } catch { /* nada */ }
    if (!room || room.mode === 'manual') return false;
    lobby().joinWith(room.mode, room.code);
    return true;
  }
  history.replaceState(null, '', location.pathname + location.search);
  if (respuesta) {
    try { new BroadcastChannel('aoe-respuesta').postMessage({ code: respuesta }); } catch { /* sin BroadcastChannel */ }
    const overlay = document.getElementById('overlay')!;
    overlay.innerHTML = `<div class="menu small net-lobby"><h1>📨 Respuesta recibida</h1>
      <div class="sub">Si la partida está abierta en otra pestaña de este navegador, ya le ha llegado: vuelve a ella.</div>
      <p class="note">Si no, copia la respuesta y pégala en la sala:</p><textarea readonly rows="3" class="nl-codebox">${esc(respuesta)}</textarea>
      <div class="buttons"><button data-back>☰ Ir al menú</button></div></div>`;
    overlay.style.display = 'flex';
    overlay.querySelector('[data-back]')!.addEventListener('click', () => app.menu.showMain());
    return true;
  }
  if (unirse) lobby().joinWith('manual', unirse);
  else lobby().joinWith(h.get('modo') === 'pestanas' ? 'tabs' : 'internet', sala!.toUpperCase());
  return true;
}
