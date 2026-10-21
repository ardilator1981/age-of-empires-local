import type { RejectReason } from '../core/EventBus';
import type { Entity } from '../game/Entity';
import type { Game } from '../game/Game';
import { Music } from './Music';
import { noiseBuffer, PRELOAD_ORDER, SFX, type SfxId } from './sfx';

/**
 * Único punto de salida del sonido. Escucha los eventos del juego y decide qué suena, con qué prioridad y
 * a qué volumen; el resto del código solo emite eventos. Gestiona además:
 * - el `AudioContext` compartido con la música y su desbloqueo tras el primer toque (iOS y Android);
 * - los buses de volumen (general, música, efectos y alertas) y el silencio, guardados entre partidas;
 * - el límite de voces simultáneas, el cooldown por tipo de sonido y el volumen por distancia y visibilidad
 *   de los sonidos de combate;
 * - la precarga diferida: los efectos se generan como `AudioBuffer` en segundo plano tras el desbloqueo.
 */

export interface AudioSettings {
  master: number;
  music: number;
  effects: number;
  alerts: number;
  muted: boolean;
}

/** Qué parte del mapa se está mirando, en casillas: centro y radio aproximado de la vista. */
export type ListenerView = () => { x: number; y: number; r: number };

interface Voice { src: AudioBufferSourceNode; gain: GainNode; prio: number; end: number; group?: string }

const STORAGE_KEY = 'aoe-local-audio-v2';
const OLD_STORAGE_KEY = 'aoe-local-audio-v1';
const DEFAULTS: AudioSettings = { master: 0.8, music: 0.6, effects: 0.8, alerts: 0.9, muted: false };
const MAX_VOICES = 10;
const MAX_COMBAT_VOICES = 3;

const ERROR_SOUND: Record<RejectReason, SfxId> = {
  resources: 'errResources', placement: 'errPlacement', population: 'errPopulation',
  requirement: 'errGeneric', queue: 'errGeneric', other: 'errGeneric',
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export class AudioManager {
  readonly music = new Music();
  settings: AudioSettings = { ...DEFAULTS };
  private ctx: AudioContext | null = null;
  private bus!: { master: GainNode; music: GainNode; effects: GainNode; alerts: GainNode };
  private buffers = new Map<SfxId, AudioBuffer>();
  private pending = new Map<SfxId, Promise<AudioBuffer | null>>();
  private voices: Voice[] = [];
  private lastPlayed = new Map<SfxId, number>();
  private game: Game | null = null;
  private view: ListenerView | null = null;
  private offs: (() => void)[] = [];
  private paused = false;
  private ambient: { stop: () => void } | null = null;
  private birdTimer = 0;

  constructor() {
    this.load();
    // Los navegadores (sobre todo iOS) solo dejan sonar audio tras un gesto del usuario
    const unlock = () => this.unlock();
    for (const type of ['pointerdown', 'touchend', 'keydown', 'click']) window.addEventListener(type, unlock, { capture: true, passive: true });
    document.addEventListener('visibilitychange', () => this.syncRunning());
  }

  // ------------------------------------------------------------ partida

  /** Conecta el sonido a una partida. `view` dice qué se está mirando (para el volumen del combate). */
  attach(game: Game, view: ListenerView) {
    this.detach();
    this.game = game;
    this.view = view;
    this.music.attach(game);
    const h = game.humanId, ev = game.events;
    this.offs = [
      ev.on('orderIssued', ({ playerId, kind }) => {
        if (playerId !== h) return;
        this.play(kind === 'move' ? 'confirmMove' : kind === 'gather' ? 'confirmGather' : kind === 'build' ? 'confirmBuild' : 'confirmAttack');
      }),
      ev.on('actionRejected', ({ playerId, reason }) => { if (playerId === h) this.play(ERROR_SOUND[reason]); }),
      ev.on('buildingCompleted', ({ entity }) => { if (entity.owner === h) this.play('buildingDone'); }),
      ev.on('unitTrained', ({ entity }) => { if (entity.owner === h) this.play('unitTrained'); }),
      ev.on('techResearched', ({ player, techId }) => {
        // Las edades tienen su propia fanfarria
        if (player.id === h && game.reg.techs.get(techId)?.setsAge === undefined) this.play('techDone');
      }),
      ev.on('ageReached', ({ player }) => { if (player.id === h) this.play('ageUp'); }),
      ev.on('resourceDepleted', ({ playerId, area }) => { if (playerId === h && area) this.play('depleted'); }),
      ev.on('underAttack', ({ playerId, kind }) => { if (playerId === h) this.play(kind === 'building' ? 'alertBuildings' : 'alertUnits'); }),
      ev.on('villagerIdle', ({ entity }) => { if (entity.owner === h) this.play('villagerIdle'); }),
      ev.on('damaged', ({ target, attacker }) => this.combatSound(target, attacker)),
      ev.on('entityDied', ({ entity }) => this.animalSound(entity)),
    ];
    this.startAmbient();
  }

  /** Vuelve al menú: solo queda la música del menú. */
  detach() {
    this.offs.forEach(f => f());
    this.offs = [];
    this.stopAmbient();
    if (this.game) this.music.detach();
    this.game = null;
    this.view = null;
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    this.music.setPaused(paused);
    if (paused) this.stopAmbient();
    else this.startAmbient();
  }

  // ------------------------------------------------------------ ajustes

  /** Silencia o activa todo el sonido; devuelve si queda silenciado. */
  toggleMute(): boolean {
    this.settings.muted = !this.settings.muted;
    this.save();
    this.applyLevels();
    if (this.settings.muted) setTimeout(() => this.syncRunning(), 300);
    else this.syncRunning();
    return this.settings.muted;
  }

  /** Cambia un volumen (0..1). Subir cualquiera quita el silencio. */
  setVolume(kind: 'master' | 'music' | 'effects' | 'alerts', v: number) {
    this.settings[kind] = clamp01(v);
    if (v > 0) this.settings.muted = false;
    this.save();
    this.applyLevels();
    this.syncRunning();
  }

  /** ¿No se oye nada? (silencio o volumen general a cero) */
  get silent() { return this.settings.muted || this.settings.master === 0; }

  /** Muestra de un bus, para oír el volumen al moverlo en los ajustes. */
  preview(kind: 'effects' | 'alerts') {
    this.unlock();
    this.lastPlayed.delete(kind === 'alerts' ? 'errGeneric' : 'confirmMove');
    this.play(kind === 'alerts' ? 'errGeneric' : 'confirmMove');
  }

  private load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        for (const k of ['master', 'music', 'effects', 'alerts'] as const) if (typeof s[k] === 'number') this.settings[k] = clamp01(s[k]);
        this.settings.muted = !!s.muted;
        return;
      }
      // Ajustes de la versión anterior (solo música)
      const old = localStorage.getItem(OLD_STORAGE_KEY);
      if (old) {
        const s = JSON.parse(old);
        if (typeof s.volume === 'number') this.settings.music = clamp01(s.volume);
        this.settings.muted = !!s.muted;
      }
    } catch { /* sin almacenamiento */ }
  }

  private save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings)); } catch { /* ignorar */ }
  }

  private applyLevels() {
    if (!this.ctx) return;
    const s = this.settings, t = this.ctx.currentTime;
    // Curva cuadrática: el control se siente más natural que lineal
    this.bus.master.gain.setTargetAtTime(s.muted ? 0 : s.master * s.master, t, 0.05);
    this.bus.music.gain.setTargetAtTime(s.music * s.music * 0.9, t, 0.05);
    this.bus.effects.gain.setTargetAtTime(s.effects * s.effects, t, 0.05);
    this.bus.alerts.gain.setTargetAtTime(s.alerts * s.alerts, t, 0.05);
  }

  // ------------------------------------------------------------ contexto y desbloqueo

  private unlock() {
    if (!this.ctx) {
      const AC: typeof AudioContext | undefined = window.AudioContext ?? (window as any).webkitAudioContext;
      if (!AC) return;
      // iOS: que suene aunque el interruptor de silencio esté puesto, como un juego (Safari 17+)
      try { const as = (navigator as any).audioSession; if (as) as.type = 'playback'; } catch { /* no disponible */ }
      try { this.ctx = new AC({ latencyHint: 'interactive' }); } catch { try { this.ctx = new AC(); } catch { return; } }
      const ctx = this.ctx;
      const g = () => ctx.createGain();
      this.bus = { master: g(), music: g(), effects: g(), alerts: g() };
      // Un compresor suave al final evita saturar cuando coinciden música, alertas y combate
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -10;
      comp.ratio.value = 4;
      this.bus.music.connect(this.bus.master);
      this.bus.effects.connect(this.bus.master);
      this.bus.alerts.connect(this.bus.master);
      this.bus.master.connect(comp);
      comp.connect(ctx.destination);
      this.applyLevels();
      this.music.connect(ctx, this.bus.music);
      ctx.addEventListener?.('statechange', () => { if (ctx.state === 'running') this.startAmbient(); });
      // Precarga diferida: no compite con el arranque de la partida
      setTimeout(() => void this.preloadAll(), 1200);
    }
    const ctx = this.ctx;
    if (ctx.state !== 'running' && this.wantRunning()) {
      ctx.resume().catch(() => {});
      // iOS antiguo: hay que reproducir algo dentro del gesto para «despertar» el audio
      try {
        const b = ctx.createBuffer(1, 1, 22050), src = ctx.createBufferSource();
        src.buffer = b;
        src.connect(ctx.destination);
        src.start(0);
      } catch { /* ignorar */ }
    }
  }

  private wantRunning() { return !this.silent && !document.hidden; }

  /** Suspende el contexto si no debe sonar nada (silencio, pestaña oculta): ahorra batería en el móvil. */
  private syncRunning() {
    const ctx = this.ctx;
    if (!ctx) return;
    if (this.wantRunning() && ctx.state !== 'running') ctx.resume().catch(() => {});
    else if (!this.wantRunning() && ctx.state === 'running') ctx.suspend().catch(() => {});
  }

  // ------------------------------------------------------------ efectos

  /** Genera un efecto como `AudioBuffer` (una sola vez). */
  private ensure(id: SfxId): Promise<AudioBuffer | null> {
    const have = this.buffers.get(id);
    if (have) return Promise.resolve(have);
    let p = this.pending.get(id);
    if (!p) {
      p = this.renderSfx(id).then(b => { if (b) this.buffers.set(id, b); return b; }).catch(() => null);
      this.pending.set(id, p);
    }
    return p;
  }

  private renderSfx(id: SfxId): Promise<AudioBuffer | null> {
    const ctx = this.ctx;
    const OAC: typeof OfflineAudioContext | undefined = window.OfflineAudioContext ?? (window as any).webkitOfflineAudioContext;
    if (!ctx || !OAC) return Promise.resolve(null);
    const def = SFX[id], sr = ctx.sampleRate;
    const off = new OAC(1, Math.ceil(def.dur * sr), sr);
    def.make(off, off.destination);
    return new Promise(resolve => {
      off.oncomplete = e => resolve(e.renderedBuffer);
      const r = off.startRendering() as Promise<AudioBuffer> | undefined;
      r?.then(resolve, () => resolve(null));
    });
  }

  private async preloadAll() {
    for (const id of PRELOAD_ORDER) {
      await this.ensure(id);
      // Respiro entre efecto y efecto para no bloquear fotogramas en móviles lentos
      await new Promise(r => setTimeout(r, 30));
    }
  }

  /** Reproduce un efecto respetando cooldown, prioridades y límite de voces. */
  private play(id: SfxId, opts: { gain?: number; pan?: number; rate?: number } = {}) {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || this.silent) return;
    const def = SFX[id], now = ctx.currentTime;
    if (now - (this.lastPlayed.get(id) ?? -1e9) < def.cooldown) return;
    this.voices = this.voices.filter(v => v.end > now);
    if (def.group && this.voices.filter(v => v.group === def.group).length >= MAX_COMBAT_VOICES) return;
    if (this.voices.length >= MAX_VOICES) {
      // Corta la voz menos importante (y más antigua) si es menos importante que la nueva
      let victim: Voice | null = null;
      for (const v of this.voices) if (v.prio < def.prio && (!victim || v.prio < victim.prio)) victim = v;
      if (!victim) return;
      victim.gain.gain.setTargetAtTime(0, now, 0.01);
      victim.src.stop(now + 0.05);
      this.voices.splice(this.voices.indexOf(victim), 1);
    }
    this.lastPlayed.set(id, now);
    const buf = this.buffers.get(id);
    if (buf) { this.start(id, buf, opts); return; }
    // Aún no estaba generado: se genera ya y suena si llega a tiempo
    const asked = performance.now();
    void this.ensure(id).then(b => { if (b && performance.now() - asked < 250) this.start(id, b, opts); });
  }

  private start(id: SfxId, buf: AudioBuffer, opts: { gain?: number; pan?: number; rate?: number }) {
    const ctx = this.ctx!, def = SFX[id], now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const rate = opts.rate ?? 1;
    src.playbackRate.value = rate;
    const gain = ctx.createGain();
    gain.gain.value = def.gain * (opts.gain ?? 1);
    src.connect(gain);
    let head: AudioNode = gain;
    if (opts.pan && ctx.createStereoPanner) {
      const pn = ctx.createStereoPanner();
      pn.pan.value = Math.max(-1, Math.min(1, opts.pan));
      gain.connect(pn);
      head = pn;
    }
    head.connect(this.bus[def.bus]);
    src.start(now);
    this.voices.push({ src, gain, prio: def.prio, end: now + buf.duration / rate, group: def.group });
  }

  /** Volumen y panorama de un sonido en el mapa: solo si se ve (niebla), más bajo cuanto más lejos de la vista. */
  private spatial(target: Entity): { gain: number; pan: number } | null {
    const g = this.game, view = this.view?.();
    if (!g || !view || this.paused) return null;
    const human = g.players[g.humanId];
    const tx = Math.floor(target.x), ty = Math.floor(target.y);
    if (!g.map.inBounds(tx, ty) || !human.visible[ty * g.map.w + tx]) return null;
    const d = Math.hypot(target.x - view.x, target.y - view.y);
    const gain = clamp01(1 - d / (view.r * 1.5));
    if (gain < 0.08) return null;
    // En la vista isométrica, la x de pantalla crece con (x - y)
    const pan = ((target.x - target.y) - (view.x - view.y)) / (view.r * 1.4);
    return { gain, pan };
  }

  /** Golpes del combate. */
  private combatSound(target: Entity, attacker?: Entity) {
    const sp = this.spatial(target);
    if (!sp) return;
    const g = this.game!;
    const ranged = !!attacker && attacker.kind === 'unit' && (g.unitDef(attacker).range ?? 0) > 1.5;
    const id: SfxId = target.kind === 'building' ? 'hitBuilding' : ranged ? 'hitArrow' : 'hitMelee';
    this.play(id, { gain: sp.gain, pan: sp.pan, rate: 0.9 + Math.random() * 0.2 });
  }

  /** Un animal cae (caza o sacrificio de ganado). */
  private animalSound(e: Entity) {
    if (e.kind !== 'unit' || !this.game?.unitDef(e).wildlife) return;
    const sp = this.spatial(e);
    if (sp) this.play('animalDeath', { gain: sp.gain, pan: sp.pan, rate: 0.85 + Math.random() * 0.4 });
  }

  // ------------------------------------------------------------ ambiente

  /** Viento suave y algún pájaro de vez en cuando, muy bajos, durante la partida. */
  private startAmbient() {
    const ctx = this.ctx;
    if (!ctx || this.ambient || !this.game || this.paused || ctx.state !== 'running') return;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx);
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 420;
    f.Q.value = 0.6;
    // Ráfagas: el filtro y el volumen oscilan muy despacio
    const lfo = ctx.createOscillator(), lfoG = ctx.createGain();
    lfo.frequency.value = 0.09;
    lfoG.gain.value = 180;
    lfo.connect(lfoG);
    lfoG.connect(f.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.035, ctx.currentTime + 3);
    const lfo2 = ctx.createOscillator(), lfo2G = ctx.createGain();
    lfo2.frequency.value = 0.05;
    lfo2G.gain.value = 0.015;
    lfo2.connect(lfo2G);
    lfo2G.connect(g.gain);
    src.connect(f);
    f.connect(g);
    g.connect(this.bus.effects);
    src.start();
    lfo.start();
    lfo2.start();
    const scheduleBird = () => {
      this.birdTimer = window.setTimeout(() => {
        this.play('bird', { gain: 0.5 + Math.random() * 0.5, pan: Math.random() * 1.6 - 0.8, rate: 0.85 + Math.random() * 0.3 });
        scheduleBird();
      }, 7000 + Math.random() * 14000);
    };
    scheduleBird();
    this.ambient = {
      stop: () => {
        const t = ctx.currentTime;
        g.gain.cancelScheduledValues(t);
        g.gain.setTargetAtTime(0, t, 0.3);
        for (const n of [src, lfo, lfo2]) n.stop(t + 1.5);
        clearTimeout(this.birdTimer);
      },
    };
  }

  private stopAmbient() {
    this.ambient?.stop();
    this.ambient = null;
  }
}
