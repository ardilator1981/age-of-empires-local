import type { Game } from '../game/Game';

/**
 * Música medieval generativa: todo se sintetiza en el navegador con Web Audio, sin archivos.
 *
 * Cada pieza se compone al vuelo (modo, tonalidad, progresión, melodías y carácter al azar) con una forma
 * reconocible (intro · A · A' · B · B' · A'' · coda) y se separa de la siguiente por un silencio, así que
 * una partida larga nunca repite lo mismo. La instrumentación crece con la edad del jugador y la música
 * pasa a un tema de batalla cuando sus unidades o edificios están en combate.
 */

export type MoodId = 'menu' | 'peace' | 'battle';
type StingerId = 'ageUp' | 'victory' | 'defeat';
type Voice = 'flute' | 'vielle' | 'shawm' | 'trumpet';
type Character = 'menu' | 'battle' | 'pastoral' | 'chanson' | 'dance';

const MODES = {
  dorian: [0, 2, 3, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  ionian: [0, 2, 4, 5, 7, 9, 11],
} as const;

interface MoodDef {
  /** Modos posibles y sus progresiones (grados de la escala, uno por compás). */
  modes: { mode: readonly number[]; progs: number[][] }[];
  /** Tónica en MIDI (octava del laúd). */
  tonics: number[];
  /** Pasos (corcheas) por compás. */
  steps: number;
  /** Arpegios: índice de nota del acorde por paso (ver ARP_DEG), -1 = silencio. */
  arps: number[][];
  /** Ritmos de la melodía por compás, en pasos. */
  rhythms: number[][];
  /** Percusión grave (B/b pandero, W/w timbal de guerra) y aguda (t pandereta, k baqueta). */
  drumsLow: string[];
  drumsHigh: string[];
  /** Silencio entre piezas, en segundos. */
  gap: [number, number];
}

const ARP_DEG = [0, 2, 4, 7, 9];
const RHYTHMS_6 = [[3, 3], [2, 1, 3], [1, 1, 1, 3], [2, 1, 2, 1], [3, 1, 1, 1], [1, 1, 1, 1, 2], [2, 2, 2], [4, 2]];
const RHYTHMS_8 = [[2, 2, 2, 2], [3, 1, 2, 2], [1, 1, 2, 4], [4, 2, 2], [2, 1, 1, 4], [3, 3, 2], [1, 1, 1, 1, 2, 2], [2, 2, 4]];

const MOODS: Record<MoodId, MoodDef> = {
  menu: {
    modes: [
      { mode: MODES.dorian, progs: [[0, 6, 0, 4], [0, 3, 0, 6], [0, 6, 5, 6]] },
      { mode: MODES.aeolian, progs: [[0, 5, 6, 0], [0, 3, 4, 0], [0, 6, 5, 4]] },
    ],
    tonics: [50, 52, 45],
    steps: 6,
    arps: [[0, 2, 3, 4, 3, 2], [0, 2, 3, 2, 4, 2]],
    rhythms: [[3, 3], [6], [4, 2], [2, 1, 3], [2, 2, 2]],
    drumsLow: ['b.....'],
    drumsHigh: ['......'],
    gap: [3, 6],
  },
  peace: {
    modes: [
      { mode: MODES.dorian, progs: [[0, 6, 0, 4], [0, 3, 6, 0], [0, 6, 5, 6], [0, 2, 3, 0]] },
      { mode: MODES.mixolydian, progs: [[0, 6, 3, 0], [0, 3, 6, 0], [0, 4, 6, 0]] },
      { mode: MODES.ionian, progs: [[0, 3, 4, 0], [0, 4, 3, 0], [0, 5, 3, 4]] },
      { mode: MODES.aeolian, progs: [[0, 5, 6, 0], [0, 6, 5, 6], [0, 3, 6, 0]] },
    ],
    tonics: [50, 52, 48, 55, 45],
    steps: 6,
    arps: [[0, 2, 3, 2, 1, 2], [0, -1, 2, 3, 2, -1], [0, 2, 1, 3, 2, 1], [0, -1, -1, 2, -1, -1]],
    rhythms: RHYTHMS_6,
    drumsLow: ['B..b..', 'B..b.b', 'B.bB..'],
    drumsHigh: ['...t..', '..t..t', '.t..t.'],
    gap: [5, 12],
  },
  battle: {
    modes: [
      { mode: MODES.aeolian, progs: [[0, 5, 6, 0], [0, 6, 5, 6], [0, 0, 5, 6]] },
      { mode: MODES.phrygian, progs: [[0, 1, 0, 6], [0, 1, 2, 1]] },
      { mode: MODES.dorian, progs: [[0, 6, 0, 6], [0, 3, 6, 0]] },
    ],
    tonics: [45, 50, 52, 47],
    steps: 8,
    arps: [[0, 0, 2, 0, 3, 0, 2, 0], [0, -1, 0, 2, 0, -1, 0, 2], [0, 2, 3, 2, 0, 2, 3, 2]],
    rhythms: RHYTHMS_8,
    drumsLow: ['W.bWW.b.', 'W..bW.bb', 'W.bbW.bW'],
    drumsHigh: ['..t...t.', 't.t.t.t.', 'k.k.t.k.'],
    gap: [0, 0.2],
  },
};

interface Note { at: number; len: number; deg: number; vel: number }
interface Phrase { prog: number[]; melody: Note[] | null; role: 'intro' | 'main' | 'interlude' | 'outro' }
interface Channels { lute: AudioNode; lead: AudioNode; harp: AudioNode; drum: AudioNode; drone: AudioNode }
interface Piece {
  mood: MoodId;
  char: Character;
  tonic: number;
  mode: readonly number[];
  steps: number;
  stepSec: number;
  arp: number[];
  drumLow: string;
  drumHigh: string;
  lead: Voice;
  drone: boolean;
  drums: boolean;
  harp: boolean;
  phrases: Phrase[];
  bus: GainNode;
  ch: Channels;
  stopDrone?: (t: number, fade: number) => void;
}

const LOOKAHEAD = 0.3;
const STORAGE_KEY = 'aoe-local-audio-v1';
const LEAD_OCTAVE: Record<Voice, number> = { flute: 12, vielle: 0, shawm: 0, trumpet: 12 };

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
const mod7 = (d: number) => ((d % 7) + 7) % 7;

/** Grado más cercano a `from` que cumple `ok`. */
function nearest(from: number, ok: (d: number) => boolean): number {
  for (let k = 0; k < 7; k++) {
    const dirs = Math.random() < 0.5 ? [-k, k] : [k, -k];
    for (const d of dirs) if (ok(from + d)) return from + d;
  }
  return from;
}

export class Music {
  volume = 0.6;
  muted = false;
  private ctx: BaseAudioContext | null = null;
  private mix!: GainNode;
  private filter!: BiquadFilterNode;
  private out!: GainNode;
  private noise!: AudioBuffer;
  private fluteWave!: PeriodicWave;
  private plucks = new Map<string, AudioBuffer>();
  private piece: Piece | null = null;
  private lastMood: MoodId = 'menu';
  private lastBattleTonic = 0;
  private phraseIdx = 0;
  private step = 0;
  private nextTime = 0;
  private gapUntil = 0;
  private lastPump = 0;
  private game: Game | null = null;
  private offs: (() => void)[] = [];
  private heat = 0;
  private over = false;
  private paused = false;
  /** Tiempo simulado para renderizar sin tiempo real (OfflineAudioContext). */
  private simTime: number | null = null;

  constructor() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (typeof s.volume === 'number') this.volume = Math.max(0, Math.min(1, s.volume));
        this.muted = !!s.muted;
      }
    } catch { /* sin almacenamiento */ }
    // Los navegadores solo dejan sonar audio tras un gesto del usuario
    const unlock = () => this.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', () => this.syncRunning());
  }

  // ------------------------------------------------------------ API pública

  /** Conecta la música a una partida: escucha combates, cambios de edad y el final. */
  attach(game: Game) {
    this.detach();
    this.game = game;
    this.heat = 0;
    this.over = false;
    const h = game.humanId;
    this.offs = [
      game.events.on('damaged', ({ target, attacker }) => {
        const a = attacker?.owner ?? -1, d = target.owner;
        if (a <= 0 || d <= 0 || a === d || (a !== h && d !== h)) return;
        this.heat = Math.min(1.5, this.heat + (d === h ? 0.05 : 0.035));
      }),
      game.events.on('ageReached', ({ player }) => { if (player.id === h) this.stinger('ageUp'); }),
      game.events.on('gameOver', ({ won }) => { this.over = true; this.stinger(won ? 'victory' : 'defeat'); }),
    ];
    this.transition();
  }

  /** Vuelve a la música del menú. */
  detach() {
    if (!this.game) return;
    this.offs.forEach(f => f());
    this.offs = [];
    this.game = null;
    this.transition();
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    if (!this.ctx) return;
    const t = this.now();
    this.filter.frequency.setTargetAtTime(paused ? 900 : 18000, t, 0.15);
    this.applyLevel();
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.volume > 0) this.muted = false;
    this.save();
    this.applyLevel();
    this.syncRunning();
  }

  /** Activa o silencia la música; devuelve si queda silenciada. */
  toggleMute(): boolean {
    this.muted = !this.muted;
    this.save();
    this.applyLevel();
    if (this.muted) setTimeout(() => this.syncRunning(), 300);
    else this.syncRunning();
    return this.muted;
  }

  /** Renderiza unos segundos de un ambiente a un AudioBuffer (para escucharlo o depurar). */
  async render(mood: MoodId, seconds: number, age = 1): Promise<AudioBuffer> {
    const off = new OfflineAudioContext(2, Math.ceil(44100 * seconds), 44100);
    const m = new Music();
    m.volume = 1;
    m.muted = false;
    m.init(off);
    m.out.gain.value = 1;
    m.game = { human: { age } } as unknown as Game;
    if (mood === 'battle') m.heat = 1.5;
    m.lastMood = mood === 'battle' ? 'battle' : 'peace';
    if (mood === 'menu') m.game = null;
    for (let t = 0; t < seconds; t += 0.04) {
      m.simTime = t;
      if (mood === 'battle') m.heat = 1.5;
      m.pump();
    }
    return off.startRendering();
  }

  // ------------------------------------------------------------ motor

  private unlock() {
    if (!this.ctx) {
      try { this.init(new AudioContext({ latencyHint: 'playback' })); } catch { return; }
      window.setInterval(() => this.pump(), 40);
    }
    this.syncRunning();
  }

  private init(ctx: BaseAudioContext) {
    this.ctx = ctx;
    this.mix = ctx.createGain();
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = this.paused ? 900 : 18000;
    this.filter.Q.value = 0.4;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 10;
    comp.ratio.value = 3;
    comp.attack.value = 0.01;
    comp.release.value = 0.25;
    this.out = ctx.createGain();
    this.out.gain.value = this.level();
    const verb = ctx.createConvolver();
    verb.buffer = this.impulse(2.8);
    const wet = ctx.createGain();
    wet.gain.value = 0.3;
    this.mix.connect(this.filter);
    this.mix.connect(verb);
    verb.connect(wet);
    wet.connect(this.filter);
    this.filter.connect(comp);
    comp.connect(this.out);
    this.out.connect(ctx.destination);

    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = this.noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    // Flauta dulce: casi una senoide con armónicos muy suaves
    this.fluteWave = ctx.createPeriodicWave(new Float32Array([0, 0, 0, 0, 0]), new Float32Array([0, 1, 0.12, 0.05, 0.02]));
  }

  private now() { return this.simTime ?? this.ctx!.currentTime; }

  private level() { return this.muted ? 0 : this.volume * this.volume * 0.9 * (this.paused ? 0.7 : 1); }

  private applyLevel() {
    if (this.ctx) this.out.gain.setTargetAtTime(this.level(), this.now(), 0.08);
  }

  private save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ volume: this.volume, muted: this.muted })); } catch { /* ignorar */ }
  }

  private syncRunning() {
    const ctx = this.ctx;
    if (!(ctx instanceof AudioContext)) return;
    const want = !this.muted && this.volume > 0 && !document.hidden;
    if (want && ctx.state === 'suspended') ctx.resume().catch(() => {});
    else if (!want && ctx.state === 'running') ctx.suspend().catch(() => {});
  }

  /** Corta la pieza actual con un fundido y deja paso a la que toque. */
  private transition() {
    if (!this.ctx) return;
    const now = this.now();
    if (this.piece) this.endPiece(this.piece, now, 1.2);
    this.piece = null;
    this.gapUntil = now + 1.2;
  }

  private wantMood(): MoodId {
    if (!this.game || this.over) return 'menu';
    if (this.lastMood === 'battle') return this.heat > 0.12 ? 'battle' : 'peace';
    return this.heat > 0.5 ? 'battle' : 'peace';
  }

  private pump() {
    const ctx = this.ctx;
    if (!ctx || (this.simTime === null && ctx.state !== 'running')) return;
    const now = this.now();
    const dt = Math.min(1, Math.max(0, now - this.lastPump));
    this.lastPump = now;
    this.heat *= Math.exp(-dt / 10);
    if (!this.piece) {
      if (now < this.gapUntil) return;
      this.startPiece(this.wantMood(), now + 0.05);
    }
    if (this.nextTime < now) this.nextTime = now + 0.05;
    while (this.piece && this.nextTime < now + LOOKAHEAD) {
      this.playStep(this.nextTime);
      this.advance();
    }
  }

  private advance() {
    const p = this.piece!;
    this.nextTime += p.stepSec;
    this.step++;
    const want = this.wantMood();
    // A la batalla se entra en el siguiente compás; del resto se sale al acabar la frase
    if (this.step % p.steps === 0 && want === 'battle' && p.mood !== 'battle') {
      this.endPiece(p, this.nextTime, 0.6);
      this.startPiece('battle', this.nextTime);
      return;
    }
    if (this.step < 4 * p.steps) return;
    this.step = 0;
    this.phraseIdx++;
    if (want !== p.mood) {
      this.endPiece(p, this.nextTime, 2.5);
      this.piece = null;
      this.gapUntil = this.nextTime + (p.mood === 'battle' ? 2 : 1);
      return;
    }
    if (this.phraseIdx < p.phrases.length) return;
    const def = MOODS[p.mood];
    const gap = rand(def.gap[0], def.gap[1]);
    this.endPiece(p, this.nextTime + (p.mood === 'battle' ? 0 : 1.5), 2.5);
    if (gap < 0.3) this.startPiece(want, this.nextTime + gap);
    else {
      this.piece = null;
      this.gapUntil = this.nextTime + gap;
    }
  }

  private endPiece(p: Piece, t: number, fade: number) {
    p.bus.gain.setTargetAtTime(0, t, fade / 3);
    p.stopDrone?.(t, fade);
    if (this.simTime === null) setTimeout(() => p.bus.disconnect(), (t - this.now() + fade + 4) * 1000);
  }

  // ------------------------------------------------------------ composición

  private startPiece(mood: MoodId, t: number) {
    const ctx = this.ctx!;
    const def = MOODS[mood];
    const { mode, progs } = pick(def.modes);
    const progA = pick(progs);
    let progB = pick(progs);
    while (progs.length > 1 && progB === progA) progB = pick(progs);
    let tonic = pick(def.tonics);
    if (mood === 'battle' && this.lastBattleTonic && Math.random() < 0.5) tonic = this.lastBattleTonic;
    if (mood === 'battle') this.lastBattleTonic = tonic;
    const age = this.game?.human.age ?? 1;

    let char: Character = mood === 'peace' ? 'pastoral' : mood;
    if (mood === 'peace') {
      const w = { pastoral: 1, chanson: 1, dance: 0.4 + 0.4 * age };
      let r = Math.random() * (w.pastoral + w.chanson + w.dance);
      char = (r -= w.pastoral) < 0 ? 'pastoral' : (r -= w.chanson) < 0 ? 'chanson' : 'dance';
    }
    const stepSec = {
      menu: rand(0.3, 0.34), battle: rand(0.135, 0.155), pastoral: rand(0.25, 0.28), chanson: rand(0.21, 0.24), dance: rand(0.17, 0.19),
    }[char];
    const S = def.steps;
    const gen = (prog: number[]) => this.melody(prog, S, def.rhythms);
    const cad = (prog: number[]) => [...prog.slice(0, 3), 0];
    const A = gen(progA), B = gen(progB);
    const ph = (prog: number[], melody: Note[] | null, role: Phrase['role'] = 'main'): Phrase => ({ prog, melody, role });

    let phrases: Phrase[];
    if (mood === 'menu') {
      phrases = [ph(progA, null, 'intro'), ph(progA, A), ph(progB, B), ph(cad(progA), this.vary(A, true)), ph(progA, null, 'outro')];
    } else if (mood === 'battle') {
      phrases = [ph(progA, null, 'intro'), ph(progA, A), ph(progA, this.vary(A, false)), ph(progB, B), ph(progB, this.vary(B, false)), ph(cad(progA), this.vary(A, true))];
    } else {
      phrases = [ph(progA, null, 'intro'), ph(progA, A), ph(progA, this.vary(A, false)), ph(progB, B)];
      if (Math.random() < 0.5) phrases.push(ph(progB, this.vary(B, false)));
      if (Math.random() < 0.6) phrases.push(ph(progB, this.vary(B, false), 'interlude'));
      phrases.push(ph(cad(progA), this.vary(A, true)), ph(progA, null, 'outro'));
    }

    const bus = ctx.createGain();
    bus.connect(this.mix);
    const lead: Voice = mood === 'battle' ? 'shawm' : char === 'chanson' ? pick(['flute', 'vielle'] as const) : char === 'dance' && Math.random() < 0.4 ? 'vielle' : 'flute';
    const p: Piece = {
      mood, char, tonic, mode, steps: S, stepSec,
      arp: pick(def.arps), drumLow: pick(def.drumsLow), drumHigh: pick(def.drumsHigh), lead,
      drone: mood !== 'peace' || char !== 'chanson' || Math.random() < 0.5,
      drums: mood !== 'peace' || char === 'dance' || (char === 'chanson' && age >= 1),
      harp: mood === 'menu' || char === 'chanson',
      phrases, bus, ch: this.channels(bus),
    };
    if (p.drone) p.stopDrone = this.drone(p, t);
    this.piece = p;
    this.lastMood = mood;
    this.phraseIdx = 0;
    this.step = 0;
    this.nextTime = t;
  }

  /** Melodía de una frase de 4 compases: notas largas sobre el acorde, notas cortas por grados conjuntos. */
  private melody(prog: number[], S: number, rhythms: number[][]): Note[] {
    const notes: Note[] = [];
    let deg = nearest(7 + prog[0] + pick([0, 2, 4]), d => d >= 5 && d <= 12);
    const endings = rhythms.filter(r => r[r.length - 1] >= 3);
    for (let b = 0; b < 4; b++) {
      const chord = prog[b];
      const chordTone = (d: number) => [0, 2, 4].includes(mod7(d - chord));
      const rh = b === 3 ? (endings.length ? pick(endings) : [S]) : pick(rhythms);
      let s = 0;
      rh.forEach((len, i) => {
        const last = b === 3 && i === rh.length - 1;
        if (last) deg = nearest(deg, d => mod7(d - chord) === 0);
        else if (s === 0 || len >= 3) deg = nearest(deg + pick([-2, -1, 0, 1, 2]), chordTone);
        else deg += pick([-1, -1, 1, 1, -2, 2, 1, -1, 0]);
        if (deg > 14) deg -= 2;
        if (deg < 4) deg += 2;
        if (last || i === 0 || Math.random() > 0.07) notes.push({ at: b * S + s, len, deg, vel: (s === 0 ? 0.9 : 0.75) * rand(0.9, 1.05) });
        s += len;
      });
    }
    return notes;
  }

  /** Variación de una melodía: cambia alguna nota, añade un ornamento y opcionalmente cierra en la tónica. */
  private vary(m: Note[], cadence: boolean): Note[] {
    const out = m.map(n => ({ ...n }));
    const last = out[out.length - 1];
    const inner = out.slice(0, -1);
    for (let k = 0; k < 2; k++) if (inner.length && Math.random() < 0.7) pick(inner).deg += pick([-1, 1]);
    const long = inner.filter(n => n.len >= 2);
    if (long.length && Math.random() < 0.5) {
      const n = pick(long), a = Math.floor(n.len / 2);
      out.push({ at: n.at + a, len: n.len - a, deg: n.deg + pick([-1, 1]), vel: n.vel * 0.85 });
      n.len = a;
    }
    if (cadence && last) last.deg = nearest(last.deg, d => mod7(d) === 0);
    return out.sort((a, b) => a.at - b.at);
  }

  private midi(p: { tonic: number; mode: readonly number[] }, deg: number) {
    const o = Math.floor(deg / 7);
    return p.tonic + p.mode[deg - o * 7] + 12 * o;
  }

  private playStep(t: number) {
    const p = this.piece!, ph = p.phrases[this.phraseIdx], S = p.steps;
    const bar = Math.floor(this.step / S), s = this.step % S;
    const chord = ph.prog[bar];
    const age = this.game?.human.age ?? 1;
    const hum = () => t + (Math.random() - 0.5) * 0.012;
    const outro = ph.role === 'outro';

    // Bajo: raíz en la parte fuerte y, a veces, la quinta
    if (s === 0) this.pluck(p.ch.lute, hum(), 'lute', this.midi(p, chord - 7), 0.55, 2.2);
    if (!outro && s === S / 2 && (S === 8 || Math.random() < 0.5)) this.pluck(p.ch.lute, hum(), 'lute', this.midi(p, chord - 3), 0.38, 1.6);

    // Arpegio (laúd; arpa en el menú). En la coda se va apagando
    const a = p.arp[s];
    if (a >= 0 && (!outro || (bar < 3 && Math.random() < 1 - bar * 0.3))) {
      const harp = p.mood === 'menu';
      this.pluck(harp ? p.ch.harp : p.ch.lute, hum(), harp ? 'harp' : 'lute', this.midi(p, chord + ARP_DEG[a]), (s === 0 ? 0.38 : 0.3) * rand(0.85, 1.1), 1.2);
    }
    if (outro && bar === 3 && s === 0) {
      [0, 2, 4, 7].forEach((d, i) => this.pluck(p.ch.harp, t + i * 0.06, 'harp', this.midi(p, d + 7), 0.3, 3));
    }

    // Melodía; el interludio lo toca el arpa y, en edades avanzadas, el arpa armoniza las notas largas
    if (ph.melody) {
      for (const n of ph.melody) {
        if (n.at !== this.step) continue;
        if (ph.role === 'interlude') {
          this.pluck(p.ch.harp, t, 'harp', this.midi(p, n.deg) + 12, 0.45 * n.vel, 1.8);
          continue;
        }
        this.voice(p.ch.lead, t, p.lead, this.midi(p, n.deg) + LEAD_OCTAVE[p.lead], n.len * p.stepSec * 0.96, n.vel);
        if ((p.harp || age >= 2) && n.len >= 3 && p.mood !== 'battle') {
          this.pluck(p.ch.harp, t + 0.01, 'harp', this.midi(p, n.deg - (p.mood === 'menu' ? 4 : 2)) + 12, 0.3, 1.6);
        }
      }
    }

    // Percusión: entra tras el primer compás y se retira en la coda
    const drums = p.drums && !(ph.role === 'intro' && bar < 1 && p.mood !== 'battle') && !(outro && bar >= 2);
    if (drums) {
      const lo = p.drumLow[s];
      if (lo !== '.') this.drum(p.ch.drum, t, lo);
      const tamb = p.mood === 'battle' ? age >= 1 : age >= 2 || p.char === 'dance';
      const hi = p.drumHigh[s];
      if (tamb && hi !== '.') this.drum(p.ch.drum, hum(), hi);
    }
  }

  // ------------------------------------------------------------ fanfarrias

  private stinger(kind: StingerId) {
    const ctx = this.ctx;
    if (!ctx || (this.simTime === null && ctx.state !== 'running')) return;
    const t0 = this.now() + 0.15;
    if (this.piece) this.endPiece(this.piece, t0, 0.7);
    this.piece = null;
    const bus = ctx.createGain();
    bus.connect(this.mix);
    const ch = this.channels(bus);
    const key = { tonic: 50, mode: kind === 'defeat' ? MODES.aeolian : MODES.ionian };
    let dur: number;

    if (kind === 'defeat') {
      // Lamento lento de flauta sobre un bordón
      const beat = 0.45;
      const line: [number, number, number][] = [[7, 0, 2], [6, 2, 1], [4, 3, 1], [5, 4, 2], [4, 6, 1], [3, 7, 1], [1, 8, 1.5], [0, 9.5, 4]];
      for (const [d, at, len] of line) this.voice(ch.lead, t0 + at * beat, 'flute', this.midi(key, d) + 12, len * beat, 0.8);
      const stop = this.drone({ tonic: key.tonic, mood: 'menu', ch }, t0);
      stop(t0 + 9.5 * beat, 3);
      this.drum(ch.drum, t0, 'W');
      this.drum(ch.drum, t0 + 9.5 * beat, 'w');
      dur = 9.5 * beat + 3;
    } else {
      // Fanfarria de trompetas con timbal y arpa
      const beat = kind === 'ageUp' ? 0.2 : 0.22;
      const line: [number, number, number][] = kind === 'ageUp'
        ? [[0, 0, 1], [4, 1, 1], [7, 2, 1], [7, 3, 0.5], [9, 3.5, 0.5], [11, 4, 5]]
        : [[0, 0, 1], [0, 1, 0.5], [0, 1.5, 0.5], [4, 2, 1], [2, 3, 1], [4, 4, 1], [7, 5, 6]];
      for (const [d, at, len] of line) {
        this.voice(ch.lead, t0 + at * beat, 'trumpet', this.midi(key, d), len * beat, 0.9);
        if (len >= 1) this.voice(ch.lead, t0 + at * beat, 'trumpet', this.midi(key, d - 2), len * beat, 0.55);
      }
      const end = line[line.length - 1][1];
      for (let i = 0; i <= end; i++) this.drum(ch.drum, t0 + i * beat, i === end ? 'W' : 'w');
      for (let i = 0; i < 6; i++) this.drum(ch.drum, t0 + (end + i / 6) * beat, 't');
      for (let i = 0; i < 8; i++) this.pluck(ch.harp, t0 + end * beat + i * 0.05, 'harp', this.midi(key, 7 + i), 0.3, 2.5);
      this.pluck(ch.lute, t0 + end * beat, 'lute', this.midi(key, -7), 0.6, 3);
      dur = end * beat + 2.6;
    }
    if (this.simTime === null) setTimeout(() => bus.disconnect(), (dur + 5) * 1000);
    this.gapUntil = t0 + dur;
  }

  // ------------------------------------------------------------ instrumentos

  private channels(bus: AudioNode): Channels {
    const ctx = this.ctx!;
    const mk = (pan: number, ...filters: BiquadFilterNode[]) => {
      const g = ctx.createGain();
      let n: AudioNode = g;
      for (const f of filters) { n.connect(f); n = f; }
      const pn = ctx.createStereoPanner();
      pn.pan.value = pan;
      n.connect(pn);
      pn.connect(bus);
      return g;
    };
    const biquad = (type: BiquadFilterType, freq: number, q = 0.7, gain = 0) => {
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      f.gain.value = gain;
      return f;
    };
    return {
      lute: mk(-0.3, biquad('lowpass', 3000), biquad('peaking', 240, 1, 3)),
      lead: mk(0.2),
      harp: mk(0.4, biquad('highpass', 150)),
      drum: mk(0),
      drone: mk(-0.05, biquad('lowpass', 900)),
    };
  }

  /** Cuerda pulsada por Karplus-Strong, generada una vez por nota y guardada en caché. */
  private pluckBuf(kind: 'lute' | 'harp', midi: number): AudioBuffer {
    const key = kind + midi;
    const cached = this.plucks.get(key);
    if (cached) return cached;
    const ctx = this.ctx!, sr = ctx.sampleRate;
    const seconds = kind === 'lute' ? 2.6 : 3.2;
    const bright = kind === 'lute' ? 0.55 : 0.85;
    const decay = kind === 'lute' ? 0.996 : 0.998;
    const n = Math.floor(sr * seconds);
    const buf = ctx.createBuffer(1, n, sr), out = buf.getChannelData(0);
    const N = Math.max(2, Math.round(sr / mtof(midi) - 0.5));
    const line = new Float32Array(N);
    let lp = 0, mean = 0;
    for (let i = 0; i < N; i++) { lp += bright * (Math.random() * 2 - 1 - lp); line[i] = lp; mean += lp; }
    mean /= N;
    for (let i = 0; i < N; i++) line[i] -= mean;
    let idx = 0, peak = 1e-6;
    for (let i = 0; i < n; i++) {
      const nx = idx + 1 === N ? 0 : idx + 1;
      const v = line[idx];
      out[i] = v;
      if (i < N * 4) peak = Math.max(peak, Math.abs(v));
      line[idx] = decay * 0.5 * (v + line[nx]);
      idx = nx;
    }
    const fade = Math.floor(sr * 0.05);
    for (let i = 0; i < n; i++) out[i] = (out[i] / peak) * (i > n - fade ? (n - i) / fade : 1);
    this.plucks.set(key, buf);
    return buf;
  }

  private pluck(dest: AudioNode, t: number, kind: 'lute' | 'harp', midi: number, vel: number, ring: number) {
    const ctx = this.ctx!, buf = this.pluckBuf(kind, midi);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vel * (kind === 'lute' ? 0.5 : 0.38), t);
    g.gain.setTargetAtTime(0, t + ring, 0.25);
    src.connect(g);
    g.connect(dest);
    src.start(t);
    src.stop(t + Math.min(buf.duration, ring + 1.5));
  }

  /** Voces sostenidas: flauta dulce, viela, chirimía y trompeta. */
  private voice(dest: AudioNode, t: number, kind: Voice, midi: number, dur: number, vel: number) {
    const ctx = this.ctx!, f = mtof(midi);
    const o = ctx.createOscillator();
    o.frequency.value = f;
    const g = ctx.createGain();
    let head: AudioNode = o;
    const chain = (node: AudioNode) => { head.connect(node); head = node; };
    let attack = 0.05, rel = 0.08, level = vel, vibDepth = 0.005, vibRate = 5;
    if (kind === 'flute') {
      o.setPeriodicWave(this.fluteWave);
      level *= 0.3;
      this.breath(dest, t, f, vel * 0.06, dur);
    } else if (kind === 'vielle') {
      o.type = 'sawtooth';
      const lp = ctx.createBiquadFilter(); lp.frequency.value = 2000;
      const body = ctx.createBiquadFilter(); body.type = 'peaking'; body.frequency.value = 700; body.gain.value = 4;
      chain(lp); chain(body);
      attack = 0.09; rel = 0.12; level *= 0.12; vibRate = 5.3;
    } else if (kind === 'shawm') {
      o.type = 'sawtooth';
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1300; bp.Q.value = 0.9;
      const lp = ctx.createBiquadFilter(); lp.frequency.value = 4000;
      chain(bp); chain(lp);
      attack = 0.025; level *= 0.4; vibDepth = 0.003; vibRate = 5.6;
    } else {
      o.type = 'sawtooth';
      const lp = ctx.createBiquadFilter();
      lp.frequency.setValueAtTime(600, t);
      lp.frequency.linearRampToValueAtTime(2800, t + 0.05);
      lp.frequency.setTargetAtTime(1800, t + 0.05, 0.2);
      chain(lp);
      attack = 0.03; level *= 0.14; vibDepth = 0.002;
    }
    chain(g);
    g.connect(dest);
    if (dur > 0.35) {
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = vibRate * rand(0.92, 1.08);
      lg.gain.setValueAtTime(0, t);
      lg.gain.linearRampToValueAtTime(f * vibDepth, t + Math.min(0.6, dur));
      lfo.connect(lg);
      lg.connect(o.frequency);
      lfo.start(t);
      lfo.stop(t + dur + rel * 6);
    }
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + attack);
    g.gain.setTargetAtTime(level * 0.8, t + attack, 0.3);
    g.gain.setTargetAtTime(0, Math.max(t + attack, t + dur - 0.02), rel);
    o.start(t);
    o.stop(t + dur + rel * 6);
  }

  /** Soplo de la flauta: ruido filtrado al principio de cada nota. */
  private breath(dest: AudioNode, t: number, f: number, amp: number, dur: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = f * 1.2;
    bp.Q.value = 1.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(amp, t + 0.02);
    g.gain.setTargetAtTime(amp * 0.25, t + 0.02, 0.05);
    g.gain.setTargetAtTime(0, t + dur, 0.05);
    src.connect(bp);
    bp.connect(g);
    g.connect(dest);
    src.start(t, Math.random() * 1.5);
    src.stop(t + dur + 0.3);
  }

  /** Bordón de zanfona: tónica y quinta graves con un leve batido. Devuelve la función para pararlo. */
  private drone(p: Pick<Piece, 'tonic' | 'mood' | 'ch'>, t: number): (t: number, fade: number) => void {
    const ctx = this.ctx!;
    const root = p.tonic - 12;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(p.mood === 'battle' ? 0.06 : 0.045, t + 4);
    g.connect(p.ch.drone);
    const oscs = ([[root, 0, 'sawtooth', 0.5], [root, 6, 'sawtooth', 0.35], [root + 7, -4, 'sawtooth', 0.3], [root - 12, 0, 'triangle', 0.6]] as const).map(([m, cents, type, amp]) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = mtof(m);
      o.detune.value = cents;
      const og = ctx.createGain();
      og.gain.value = amp;
      o.connect(og);
      og.connect(g);
      o.start(t);
      return o;
    });
    // Respiración lenta del bordón
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 0.13;
    lg.gain.value = 0.01;
    lfo.connect(lg);
    lg.connect(g.gain);
    lfo.start(t);
    oscs.push(lfo);
    return (t2, fade) => {
      g.gain.cancelScheduledValues(t2);
      g.gain.setTargetAtTime(0, t2, fade / 3);
      for (const o of oscs) o.stop(t2 + fade + 1);
    };
  }

  /** Percusión: B/b pandero, W/w timbal de guerra, t pandereta, k baqueta. */
  private drum(dest: AudioNode, t: number, c: string) {
    const ctx = this.ctx!;
    const big = c === 'B' || c === 'W';
    const noise = (type: BiquadFilterType, freq: number, q: number, amp: number, len: number, at = t) => {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(amp, at + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, at + len);
      src.connect(f);
      f.connect(g);
      g.connect(dest);
      src.start(at, Math.random() * 1.5);
      src.stop(at + len + 0.05);
    };
    const lc = c.toLowerCase();
    if (lc === 'b' || lc === 'w') {
      const war = lc === 'w', v = big ? 1 : 0.55;
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(war ? 95 : 130, t);
      o.frequency.exponentialRampToValueAtTime(war ? 42 : 62, t + (war ? 0.3 : 0.2));
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v * (war ? 0.9 : 0.6), t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (war ? 0.8 : 0.45));
      o.connect(g);
      g.connect(dest);
      o.start(t);
      o.stop(t + 0.9);
      noise('lowpass', war ? 600 : 1500, 0.7, v * 0.3, war ? 0.09 : 0.06);
    } else if (lc === 't') {
      noise('highpass', 6000, 0.7, 0.16, 0.14);
      noise('highpass', 7000, 0.7, 0.07, 0.1, t + 0.045);
    } else if (lc === 'k') {
      noise('bandpass', 3000, 3, 0.25, 0.035);
    }
  }

  /** Respuesta al impulso de una sala de piedra, cálida (se filtran los agudos). */
  private impulse(seconds: number): AudioBuffer {
    const ctx = this.ctx!, sr = ctx.sampleRate, len = Math.floor(sr * seconds);
    const b = ctx.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const k = 0.15 + 0.5 * (1 - i / len);
        lp += k * (Math.random() * 2 - 1 - lp);
        d[i] = lp * Math.pow(1 - i / len, 3) * Math.min(1, i / (sr * 0.012));
      }
    }
    return b;
  }
}
