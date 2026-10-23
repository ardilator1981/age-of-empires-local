/**
 * Efectos de sonido sintetizados con Web Audio: no hay archivos de audio.
 *
 * Cada efecto es una receta que dibuja el sonido en un contexto (normalmente un `OfflineAudioContext`
 * que lo convierte en un `AudioBuffer` una sola vez). Son sonidos originales, hechos con osciladores,
 * ruido y filtros; ver CREDITS.md.
 */

export type SfxId =
  | 'confirmMove' | 'confirmGather' | 'confirmBuild' | 'confirmAttack'
  | 'buildingDone' | 'unitTrained' | 'techDone' | 'ageUp' | 'powerUsed' | 'coins' | 'treaty' | 'spyDone'
  | 'depleted' | 'alertUnits' | 'alertBuildings' | 'villagerIdle'
  | 'errResources' | 'errPlacement' | 'errPopulation' | 'errGeneric'
  | 'hitMelee' | 'hitArrow' | 'hitMusket' | 'hitCannon' | 'hitRock' | 'hitRifle' | 'hitGatling' | 'hitBuilding' | 'animalDeath' | 'bird' | 'oilHiss';

export type SfxBus = 'effects' | 'alerts';

export interface SfxDef {
  /** Duración en segundos del buffer que se genera. */
  dur: number;
  bus: SfxBus;
  /** Prioridad: si se llega al máximo de voces, un sonido nuevo puede cortar a uno de prioridad menor. */
  prio: number;
  /** Segundos mínimos entre dos reproducciones del mismo efecto. */
  cooldown: number;
  /** Volumen relativo. */
  gain: number;
  /** Grupo con su propio límite de voces simultáneas. */
  group?: 'combat';
  make(ctx: BaseAudioContext, out: AudioNode): void;
}

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>();
export function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  let b = noiseCache.get(ctx);
  if (!b) {
    b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noiseCache.set(ctx, b);
  }
  return b;
}

interface ToneOpts {
  type?: OscillatorType;
  freq: number;
  /** Frecuencia final (glissando exponencial). */
  to?: number;
  t?: number;
  dur: number;
  gain: number;
  attack?: number;
  /** Filtro paso bajo opcional. */
  lp?: number;
}

/** Nota con envolvente de percusión (ataque corto y caída exponencial). */
function tone(ctx: BaseAudioContext, out: AudioNode, o: ToneOpts) {
  const t = o.t ?? 0, att = o.attack ?? 0.005;
  const osc = ctx.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.freq, t);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + o.dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(o.gain, t + att);
  g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
  let head: AudioNode = osc;
  if (o.lp) {
    const f = ctx.createBiquadFilter();
    f.frequency.value = o.lp;
    osc.connect(f);
    head = f;
  }
  head.connect(g);
  g.connect(out);
  osc.start(t);
  osc.stop(t + o.dur + 0.02);
}

/** Nota sostenida (metales, cuernos): ataque, meseta y caída. */
function held(ctx: BaseAudioContext, out: AudioNode, o: ToneOpts & { release?: number; vibrato?: number }) {
  const t = o.t ?? 0, att = o.attack ?? 0.04, rel = o.release ?? 0.15;
  const osc = ctx.createOscillator();
  osc.type = o.type ?? 'sawtooth';
  osc.frequency.setValueAtTime(o.freq, t);
  if (o.to) osc.frequency.linearRampToValueAtTime(o.to, t + o.dur);
  if (o.vibrato) {
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 5.5;
    lg.gain.value = o.freq * o.vibrato;
    lfo.connect(lg);
    lg.connect(osc.frequency);
    lfo.start(t);
    lfo.stop(t + o.dur + rel);
  }
  const f = ctx.createBiquadFilter();
  f.frequency.setValueAtTime((o.lp ?? 2000) * 0.4, t);
  f.frequency.linearRampToValueAtTime(o.lp ?? 2000, t + att * 2);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(o.gain, t + att);
  g.gain.setValueAtTime(o.gain, t + Math.max(att, o.dur - rel));
  g.gain.linearRampToValueAtTime(0, t + o.dur);
  osc.connect(f);
  f.connect(g);
  g.connect(out);
  osc.start(t);
  osc.stop(t + o.dur + 0.02);
}

/** Golpe de ruido filtrado (madera, cuero, roce de metal). */
function burst(ctx: BaseAudioContext, out: AudioNode, o: { type: BiquadFilterType; freq: number; q?: number; t?: number; dur: number; gain: number }) {
  const t = o.t ?? 0;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  const f = ctx.createBiquadFilter();
  f.type = o.type;
  f.frequency.value = o.freq;
  f.Q.value = o.q ?? 0.7;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(o.gain, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
  src.connect(f);
  f.connect(g);
  g.connect(out);
  src.start(t, Math.random() * 0.5);
  src.stop(t + o.dur + 0.02);
}

/** Campana: parciales inarmónicos que caen a distinto ritmo. */
function bell(ctx: BaseAudioContext, out: AudioNode, freq: number, t: number, gain: number, dur = 1.2) {
  const partials: [number, number, number][] = [[1, 1, 1], [2.0, 0.5, 0.7], [2.76, 0.35, 0.5], [5.4, 0.18, 0.3], [0.5, 0.25, 1.2]];
  for (const [ratio, amp, len] of partials) tone(ctx, out, { freq: freq * ratio, t, dur: dur * len, gain: gain * amp, attack: 0.002 });
}

/** Cuerda pulsada corta (laúd): triángulo con armónico y caída rápida. */
function pluck(ctx: BaseAudioContext, out: AudioNode, midi: number, t: number, gain: number, dur = 0.35) {
  tone(ctx, out, { type: 'triangle', freq: mtof(midi), t, dur, gain, lp: 2500 });
  tone(ctx, out, { type: 'sine', freq: mtof(midi) * 2, t, dur: dur * 0.5, gain: gain * 0.35 });
}

/** Golpe de bloque de madera. */
function wood(ctx: BaseAudioContext, out: AudioNode, freq: number, t: number, gain: number) {
  tone(ctx, out, { freq, to: freq * 0.92, t, dur: 0.09, gain });
  burst(ctx, out, { type: 'bandpass', freq: freq * 3, q: 2, t, dur: 0.03, gain: gain * 0.5 });
}

export const SFX: Record<SfxId, SfxDef> = {
  // ------------------------------------------------------------ confirmaciones de órdenes
  confirmMove: {
    dur: 0.35, bus: 'effects', prio: 2, cooldown: 0.12, gain: 0.5,
    make: (c, o) => { pluck(c, o, 76, 0, 0.5, 0.25); pluck(c, o, 81, 0.06, 0.45, 0.28); },
  },
  confirmGather: {
    dur: 0.3, bus: 'effects', prio: 2, cooldown: 0.12, gain: 0.55,
    make: (c, o) => { wood(c, o, 520, 0, 0.6); wood(c, o, 700, 0.08, 0.5); },
  },
  confirmBuild: {
    dur: 0.4, bus: 'effects', prio: 2, cooldown: 0.12, gain: 0.55,
    make: (c, o) => {
      for (const t of [0, 0.13]) {
        tone(c, o, { freq: 240, to: 150, t, dur: 0.12, gain: 0.6 });
        burst(c, o, { type: 'bandpass', freq: 2400, q: 1.5, t, dur: 0.05, gain: 0.45 });
      }
    },
  },
  confirmAttack: {
    dur: 0.45, bus: 'effects', prio: 2, cooldown: 0.12, gain: 0.5,
    make: (c, o) => {
      // Espada que sale de la vaina y golpe de tambor
      burst(c, o, { type: 'highpass', freq: 3500, t: 0, dur: 0.22, gain: 0.25 });
      tone(c, o, { type: 'sawtooth', freq: 1400, to: 2600, t: 0, dur: 0.2, gain: 0.08, lp: 5000 });
      tone(c, o, { freq: 110, to: 55, t: 0.02, dur: 0.3, gain: 0.7 });
    },
  },

  // ------------------------------------------------------------ progreso
  buildingDone: {
    dur: 1.6, bus: 'effects', prio: 3, cooldown: 0.4, gain: 0.4,
    make: (c, o) => { [72, 76, 79].forEach((m, i) => bell(c, o, mtof(m), i * 0.12, 0.35, 1.2)); },
  },
  unitTrained: {
    dur: 0.7, bus: 'effects', prio: 2, cooldown: 0.3, gain: 0.45,
    make: (c, o) => {
      held(c, o, { freq: mtof(62), t: 0, dur: 0.16, gain: 0.35, lp: 1800, attack: 0.03 });
      held(c, o, { freq: mtof(67), t: 0.16, dur: 0.42, gain: 0.35, lp: 1800, attack: 0.03, vibrato: 0.004 });
    },
  },
  techDone: {
    dur: 1.6, bus: 'effects', prio: 3, cooldown: 0.4, gain: 0.35,
    make: (c, o) => { [79, 83, 86, 91].forEach((m, i) => bell(c, o, mtof(m), i * 0.07, 0.3, 0.9)); },
  },
  powerUsed: {
    dur: 1.2, bus: 'effects', prio: 3, cooldown: 0.5, gain: 0.5,
    make: (c, o) => {
      // Toque corto de trompa con un golpe de timbal
      held(c, o, { freq: mtof(62), t: 0, dur: 0.22, gain: 0.3, lp: 2200, attack: 0.02 });
      held(c, o, { freq: mtof(69), t: 0.2, dur: 0.7, gain: 0.3, lp: 2200, attack: 0.02, vibrato: 0.004 });
      tone(c, o, { freq: 110, to: 50, t: 0, dur: 0.5, gain: 0.7 });
    },
  },
  coins: {
    dur: 0.7, bus: 'effects', prio: 1, cooldown: 0.6, gain: 0.3,
    make: (c, o) => { [88, 93].forEach((m, i) => bell(c, o, mtof(m), i * 0.09, 0.25, 0.5)); },
  },
  treaty: {
    dur: 1.4, bus: 'effects', prio: 3, cooldown: 0.6, gain: 0.4,
    make: (c, o) => {
      // Dos notas de trompa que se encuentran en una quinta, como un apretón de manos
      held(c, o, { freq: mtof(60), t: 0, dur: 0.5, gain: 0.25, lp: 2200, attack: 0.04 });
      held(c, o, { freq: mtof(67), t: 0.25, dur: 0.9, gain: 0.25, lp: 2200, attack: 0.04, vibrato: 0.004 });
    },
  },
  spyDone: {
    dur: 0.6, bus: 'effects', prio: 2, cooldown: 0.5, gain: 0.3,
    make: (c, o) => {
      // Dos golpecitos secos y una nota grave: una misión hecha en silencio
      tone(c, o, { freq: 520, to: 380, t: 0, dur: 0.06, gain: 0.4, attack: 0.005 });
      tone(c, o, { freq: 520, to: 380, t: 0.12, dur: 0.06, gain: 0.4, attack: 0.005 });
      tone(c, o, { freq: 130, to: 90, t: 0.2, dur: 0.3, gain: 0.35 });
    },
  },
  ageUp: {
    dur: 3.2, bus: 'effects', prio: 4, cooldown: 2, gain: 0.5,
    make: (c, o) => {
      // Fanfarria de trompetas con timbal
      const beat = 0.24;
      const line: [number, number, number][] = [[62, 0, 1], [69, 1, 1], [74, 2, 1], [74, 3, 0.5], [78, 3.5, 0.5], [81, 4, 4.5]];
      for (const [m, at, len] of line) {
        held(c, o, { freq: mtof(m), t: at * beat, dur: len * beat, gain: 0.22, lp: 2600, attack: 0.03, vibrato: len > 2 ? 0.004 : 0 });
        if (len >= 1) held(c, o, { freq: mtof(m - 5), t: at * beat, dur: len * beat, gain: 0.13, lp: 2000, attack: 0.03 });
      }
      for (const at of [0, 4]) tone(c, o, { freq: 90, to: 42, t: at * beat, dur: 0.6, gain: 0.8 });
    },
  },

  // ------------------------------------------------------------ avisos
  depleted: {
    dur: 0.8, bus: 'alerts', prio: 3, cooldown: 3, gain: 0.5,
    make: (c, o) => {
      tone(c, o, { type: 'triangle', freq: mtof(55), t: 0, dur: 0.3, gain: 0.55, lp: 1500 });
      tone(c, o, { type: 'triangle', freq: mtof(50), t: 0.18, dur: 0.5, gain: 0.55, lp: 1200 });
      burst(c, o, { type: 'lowpass', freq: 600, t: 0.18, dur: 0.12, gain: 0.3 });
    },
  },
  alertUnits: {
    dur: 1.8, bus: 'alerts', prio: 5, cooldown: 10, gain: 0.75,
    make: (c, o) => {
      // Cuerno de guerra: dos toques graves
      held(c, o, { freq: mtof(45), to: mtof(45) * 1.01, t: 0, dur: 0.5, gain: 0.45, lp: 1100, attack: 0.08, release: 0.12 });
      held(c, o, { freq: mtof(45), t: 0.6, dur: 1.1, gain: 0.5, lp: 1300, attack: 0.08, release: 0.4, vibrato: 0.003 });
      held(c, o, { freq: mtof(52), t: 0.6, dur: 1.1, gain: 0.2, lp: 1000, attack: 0.1, release: 0.4 });
    },
  },
  alertBuildings: {
    dur: 2.2, bus: 'alerts', prio: 5, cooldown: 10, gain: 0.7,
    make: (c, o) => {
      // Campana de alarma: tres toques rápidos
      for (const t of [0, 0.32, 0.64]) bell(c, o, 520, t, 0.45, 1.5);
    },
  },
  villagerIdle: {
    dur: 0.9, bus: 'alerts', prio: 3, cooldown: 5, gain: 0.45,
    make: (c, o) => { bell(c, o, mtof(81), 0, 0.3, 0.7); bell(c, o, mtof(76), 0.18, 0.3, 0.8); },
  },

  // ------------------------------------------------------------ errores
  errResources: {
    dur: 0.5, bus: 'alerts', prio: 3, cooldown: 0.5, gain: 0.5,
    make: (c, o) => {
      // Bolsa casi vacía: dos notas graves que bajan y un tintineo apagado
      tone(c, o, { type: 'square', freq: mtof(52), t: 0, dur: 0.14, gain: 0.25, lp: 900 });
      tone(c, o, { type: 'square', freq: mtof(48), t: 0.15, dur: 0.28, gain: 0.25, lp: 700 });
      burst(c, o, { type: 'bandpass', freq: 5000, q: 4, t: 0.02, dur: 0.06, gain: 0.12 });
    },
  },
  errPlacement: {
    dur: 0.35, bus: 'alerts', prio: 3, cooldown: 0.5, gain: 0.45,
    make: (c, o) => { tone(c, o, { type: 'sawtooth', freq: 120, to: 95, t: 0, dur: 0.28, gain: 0.35, lp: 700, attack: 0.01 }); },
  },
  errPopulation: {
    dur: 0.6, bus: 'alerts', prio: 3, cooldown: 1, gain: 0.5,
    make: (c, o) => { [0, 0.13, 0.26].forEach((t, i) => wood(c, o, 300 - i * 40, t, 0.6)); },
  },
  errGeneric: {
    dur: 0.3, bus: 'alerts', prio: 3, cooldown: 0.5, gain: 0.45,
    make: (c, o) => { tone(c, o, { type: 'triangle', freq: mtof(47), to: mtof(45), t: 0, dur: 0.25, gain: 0.5, lp: 900 }); },
  },

  // ------------------------------------------------------------ combate y ambiente (volumen bajo)
  hitMelee: {
    dur: 0.35, bus: 'effects', prio: 1, cooldown: 0.07, gain: 0.22, group: 'combat',
    make: (c, o) => {
      for (const [f, a, d] of [[620, 0.3, 0.25], [1530, 0.2, 0.18], [2390, 0.14, 0.12], [3700, 0.08, 0.08]]) tone(c, o, { freq: f, t: 0, dur: d, gain: a, attack: 0.001 });
      burst(c, o, { type: 'bandpass', freq: 3000, q: 1, t: 0, dur: 0.05, gain: 0.3 });
    },
  },
  hitArrow: {
    dur: 0.15, bus: 'effects', prio: 1, cooldown: 0.07, gain: 0.22, group: 'combat',
    make: (c, o) => {
      tone(c, o, { freq: 190, to: 90, t: 0, dur: 0.07, gain: 0.6 });
      burst(c, o, { type: 'lowpass', freq: 1100, t: 0, dur: 0.05, gain: 0.4 });
    },
  },
  hitMusket: {
    dur: 0.3, bus: 'effects', prio: 1, cooldown: 0.07, gain: 0.24, group: 'combat',
    make: (c, o) => {
      // Estampido seco: ruido ancho que se apaga rápido y un golpe grave corto
      burst(c, o, { type: 'bandpass', freq: 1600, q: 0.6, t: 0, dur: 0.12, gain: 0.8 });
      burst(c, o, { type: 'lowpass', freq: 500, t: 0.01, dur: 0.22, gain: 0.45 });
      tone(c, o, { freq: 140, to: 60, t: 0, dur: 0.12, gain: 0.5 });
    },
  },
  hitCannon: {
    dur: 0.7, bus: 'effects', prio: 2, cooldown: 0.2, gain: 0.3, group: 'combat',
    make: (c, o) => {
      // Cañonazo: golpe muy grave con caída y una cola de ruido
      tone(c, o, { freq: 95, to: 38, t: 0, dur: 0.5, gain: 0.9 });
      burst(c, o, { type: 'lowpass', freq: 700, t: 0, dur: 0.45, gain: 0.7 });
      burst(c, o, { type: 'bandpass', freq: 1400, q: 0.5, t: 0, dur: 0.08, gain: 0.6 });
    },
  },
  hitRock: {
    dur: 0.55, bus: 'effects', prio: 2, cooldown: 0.2, gain: 0.3, group: 'combat',
    make: (c, o) => {
      // Piedra de catapulta o trabuquete: golpe sordo y grave con un crujido de escombros
      tone(c, o, { freq: 70, to: 32, t: 0, dur: 0.35, gain: 0.9 });
      burst(c, o, { type: 'lowpass', freq: 380, t: 0, dur: 0.3, gain: 0.8 });
      burst(c, o, { type: 'bandpass', freq: 900, q: 0.8, t: 0.02, dur: 0.16, gain: 0.45 });
    },
  },
  hitRifle: {
    dur: 0.28, bus: 'effects', prio: 1, cooldown: 0.07, gain: 0.22, group: 'combat',
    make: (c, o) => {
      // Fusil estriado: chasquido más agudo y seco que el mosquete, con menos cola grave
      burst(c, o, { type: 'bandpass', freq: 2600, q: 0.7, t: 0, dur: 0.07, gain: 0.8 });
      burst(c, o, { type: 'lowpass', freq: 700, t: 0.01, dur: 0.14, gain: 0.3 });
      tone(c, o, { freq: 190, to: 80, t: 0, dur: 0.08, gain: 0.4 });
    },
  },
  hitGatling: {
    dur: 0.3, bus: 'effects', prio: 1, cooldown: 0.09, gain: 0.2, group: 'combat',
    make: (c, o) => {
      // Ráfaga: tres chasquidos muy seguidos (ametralladora y aviones)
      for (const t of [0, 0.06, 0.12]) {
        burst(c, o, { type: 'bandpass', freq: 2200, q: 0.8, t, dur: 0.045, gain: 0.7 });
        tone(c, o, { freq: 170, to: 90, t, dur: 0.05, gain: 0.3 });
      }
    },
  },
  hitBuilding: {
    dur: 0.35, bus: 'effects', prio: 1, cooldown: 0.12, gain: 0.22, group: 'combat',
    make: (c, o) => {
      tone(c, o, { freq: 120, to: 65, t: 0, dur: 0.3, gain: 0.7 });
      burst(c, o, { type: 'lowpass', freq: 450, t: 0, dur: 0.18, gain: 0.5 });
    },
  },
  animalDeath: {
    dur: 0.45, bus: 'effects', prio: 1, cooldown: 0.15, gain: 0.3,
    make: (c, o) => {
      // Un balido corto: tono con vibrato rápido que cae, más un soplo de ruido
      tone(c, o, { type: 'sawtooth', freq: 360, to: 210, t: 0, dur: 0.32, gain: 0.35, attack: 0.01, lp: 1400 });
      tone(c, o, { type: 'sawtooth', freq: 372, to: 220, t: 0.012, dur: 0.3, gain: 0.25, attack: 0.01, lp: 1400 });
      burst(c, o, { type: 'bandpass', freq: 900, q: 1.5, t: 0, dur: 0.12, gain: 0.2 });
    },
  },
  oilHiss: {
    dur: 0.6, bus: 'effects', prio: 1, cooldown: 0.6, gain: 0.35,
    make: (c, o) => {
      // Aceite que cae y chisporrotea: siseo de ruido agudo con un chapoteo grave
      burst(c, o, { type: 'highpass', freq: 3200, t: 0, dur: 0.5, gain: 0.35 });
      burst(c, o, { type: 'bandpass', freq: 900, q: 1.2, t: 0.02, dur: 0.35, gain: 0.3 });
      tone(c, o, { freq: 180, to: 90, t: 0, dur: 0.18, gain: 0.3 });
    },
  },
  bird: {
    dur: 0.6, bus: 'effects', prio: 0, cooldown: 2, gain: 0.1,
    make: (c, o) => {
      const n = 2 + Math.floor(Math.random() * 3), base = 2600 + Math.random() * 900;
      for (let i = 0; i < n; i++) tone(c, o, { freq: base, to: base * 1.45, t: i * 0.11, dur: 0.07, gain: 0.3, attack: 0.01 });
    },
  },
};

/** Orden de precarga: primero lo que se oye nada más empezar. */
export const PRELOAD_ORDER: SfxId[] = [
  'confirmMove', 'confirmGather', 'confirmBuild', 'confirmAttack', 'errPlacement', 'errResources', 'errGeneric',
  'unitTrained', 'buildingDone', 'alertUnits', 'alertBuildings', 'errPopulation', 'depleted', 'techDone', 'ageUp', 'powerUsed',
  'coins', 'treaty', 'spyDone', 'villagerIdle', 'hitMelee', 'hitArrow', 'hitMusket', 'hitCannon', 'hitRock', 'hitRifle', 'hitGatling', 'hitBuilding', 'animalDeath', 'bird', 'oilHiss',
];
