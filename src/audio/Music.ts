import type { Game } from '../game/Game';

/**
 * Música medieval generativa: todo se sintetiza en el navegador con Web Audio, sin archivos.
 *
 * Cada pieza se compone al vuelo (modo, tonalidad, progresión, ostinato y melodías al azar): un arpegio
 * lento que se repite sobre un bordón, con frases de flauta o arpa que aparecen y desaparecen. Las piezas
 * suelen mantener la tonalidad de la anterior y se separan con silencios, así que la música acompaña sin
 * cansar. La instrumentación crece con la edad del jugador y pasa a un tema más tenso en combate.
 */

export type MoodId = 'menu' | 'peace' | 'battle';
type StingerId = 'victory' | 'defeat';
type Voice = 'flute' | 'vielle' | 'shawm' | 'trumpet';
type Character = 'menu' | 'battle' | 'drift' | 'song';

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

// Música tranquila, casi hipnótica: acordes que cambian cada dos compases, un ostinato que se repite
// toda la pieza sobre un bordón, melodías escasas de notas largas y percusión mínima.
const MOODS: Record<MoodId, MoodDef> = {
  menu: {
    modes: [
      { mode: MODES.dorian, progs: [[0, 0, 6, 6], [0, 0, 3, 3], [0, 6, 0, 6]] },
      { mode: MODES.aeolian, progs: [[0, 0, 5, 5], [0, 0, 6, 6]] },
    ],
    tonics: [50, 45],
    steps: 6,
    arps: [[0, 2, 3, 4, 3, 2], [0, 3, 2, 3, 4, 3]],
    rhythms: [[6], [3, 3], [4, 2]],
    drumsLow: ['......'],
    drumsHigh: ['......'],
    gap: [6, 10],
  },
  peace: {
    modes: [
      { mode: MODES.dorian, progs: [[0, 0, 6, 6], [0, 0, 3, 3], [0, 0, 0, 6], [0, 6, 0, 6]] },
      { mode: MODES.mixolydian, progs: [[0, 0, 6, 6], [0, 0, 3, 3]] },
      { mode: MODES.aeolian, progs: [[0, 0, 5, 5], [0, 0, 6, 6], [0, 5, 0, 6]] },
      { mode: MODES.ionian, progs: [[0, 0, 3, 3], [0, 0, 4, 4]] },
    ],
    tonics: [50, 45, 52, 48],
    steps: 6,
    arps: [[0, 2, 3, 2, 1, 2], [0, 3, 2, 3, 1, 3], [0, -1, 2, -1, 3, -1], [0, 2, 4, 3, 2, 1]],
    rhythms: [[6], [3, 3], [4, 2], [2, 4], [3, 1, 2]],
    drumsLow: ['b.....', 'b.....', 'b..b..'],
    drumsHigh: ['......'],
    gap: [6, 14],
  },
  battle: {
    modes: [
      { mode: MODES.aeolian, progs: [[0, 0, 5, 6], [0, 0, 6, 6]] },
      { mode: MODES.phrygian, progs: [[0, 1, 0, 0], [0, 0, 1, 1]] },
      { mode: MODES.dorian, progs: [[0, 0, 6, 6]] },
    ],
    tonics: [45, 50],
    steps: 8,
    arps: [[0, -1, 2, -1, 0, -1, 2, -1], [0, 2, 3, 2, 0, 2, 3, 2]],
    rhythms: [[4, 4], [2, 2, 4], [3, 1, 4], [4, 2, 2], [8]],
    drumsLow: ['W...w...', 'W..wW...', 'W.......'],
    drumsHigh: ['....k...', '......k.'],
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

/**
 * El `AudioContext`, el desbloqueo en móvil, el volumen y el silencio los gestiona `AudioManager`, que
 * conecta la música a su bus con `connect`.
 */
export class Music {
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
  /** Tonalidad de la última pieza tranquila, para encadenar la siguiente sin saltos. */
  private lastPeaceKey: { tonic: number; modeIdx: number } | null = null;
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

  // ------------------------------------------------------------ API pública

  /** Empieza a sonar en el contexto ya desbloqueado, hacia `out` (el bus de música). */
  connect(ctx: AudioContext, out: AudioNode) {
    if (this.ctx) return;
    this.init(ctx, out);
    window.setInterval(() => this.pump(), 40);
  }

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
      // La fanfarria de la nueva edad es un efecto de sonido: la música le deja sitio
      game.events.on('ageReached', ({ player }) => { if (player.id === h) this.rest(4.5); }),
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

  /** En pausa la música suena amortiguada y más baja. */
  setPaused(paused: boolean) {
    this.paused = paused;
    if (!this.ctx) return;
    const t = this.now();
    this.filter.frequency.setTargetAtTime(paused ? 900 : 18000, t, 0.15);
    this.out.gain.setTargetAtTime(paused ? 0.7 : 1, t, 0.08);
  }

  /** Renderiza unos segundos de un ambiente a un AudioBuffer (para escucharlo o depurar). */
  async render(mood: MoodId, seconds: number, age = 1): Promise<AudioBuffer> {
    const off = new OfflineAudioContext(2, Math.ceil(44100 * seconds), 44100);
    const m = new Music();
    m.init(off, off.destination);
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

  private init(ctx: BaseAudioContext, dest: AudioNode) {
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
    this.out.gain.value = this.paused ? 0.7 : 1;
    const verb = ctx.createConvolver();
    verb.buffer = this.impulse(4);
    const wet = ctx.createGain();
    wet.gain.value = 0.42;
    this.mix.connect(this.filter);
    this.mix.connect(verb);
    verb.connect(wet);
    wet.connect(this.filter);
    this.filter.connect(comp);
    comp.connect(this.out);
    this.out.connect(dest);

    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = this.noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    // Flauta dulce: casi una senoide con armónicos muy suaves
    this.fluteWave = ctx.createPeriodicWave(new Float32Array([0, 0, 0, 0, 0]), new Float32Array([0, 1, 0.12, 0.05, 0.02]));
  }

  private now() { return this.simTime ?? this.ctx!.currentTime; }

  /** Corta la pieza actual con un fundido y deja paso a la que toque. */
  private transition() {
    this.rest(1.2);
  }

  /** Silencio de `seconds` (con fundido de la pieza que sonaba) antes de la siguiente pieza. */
  private rest(seconds: number) {
    if (!this.ctx) return;
    const now = this.now();
    if (this.piece) this.endPiece(this.piece, now, 1.2);
    this.piece = null;
    this.gapUntil = now + seconds;
  }

  private wantMood(): MoodId {
    if (!this.game || this.over) return 'menu';
    if (this.lastMood === 'battle') return this.heat > 0.15 ? 'battle' : 'peace';
    return this.heat > 0.6 ? 'battle' : 'peace';
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
    // Las piezas tranquilas suelen seguir en la tonalidad de la anterior, como un único flujo
    const keep = mood === 'peace' && this.lastPeaceKey && Math.random() < 0.65 ? this.lastPeaceKey : null;
    const modeIdx = keep?.modeIdx ?? Math.floor(Math.random() * def.modes.length);
    const { mode, progs } = def.modes[modeIdx];
    const progA = pick(progs);
    let progB = pick(progs);
    while (progs.length > 1 && progB === progA) progB = pick(progs);
    let tonic = keep?.tonic ?? pick(def.tonics);
    if (mood === 'battle' && this.lastBattleTonic && Math.random() < 0.7) tonic = this.lastBattleTonic;
    if (mood === 'battle') this.lastBattleTonic = tonic;
    if (mood === 'peace') this.lastPeaceKey = { tonic, modeIdx };
    const age = this.game?.human.age ?? 1;

    // «drift»: casi solo ostinato y bordón; «song»: con una melodía lenta de flauta o viela
    const char: Character = mood === 'peace' ? (Math.random() < 0.55 ? 'drift' : 'song') : mood;
    const stepSec = { menu: rand(0.4, 0.44), battle: rand(0.18, 0.2), drift: rand(0.38, 0.44), song: rand(0.32, 0.36) }[char];
    const S = def.steps;
    const gen = (prog: number[]) => this.melody(prog, S, def.rhythms);
    const cad = (prog: number[]) => [...prog.slice(0, 3), 0];
    const A = gen(progA), B = gen(progB);
    const ph = (prog: number[], melody: Note[] | null, role: Phrase['role'] = 'main'): Phrase => ({ prog, melody, role });
    // Frase en la que la melodía aparece o, en «drift», a menudo deja solo el ostinato
    const maybe = (prog: number[], m: Note[]) => ph(prog, char === 'drift' && Math.random() < 0.5 ? null : m);

    let phrases: Phrase[];
    if (mood === 'menu') {
      phrases = [ph(progA, null, 'intro'), ph(progA, null), ph(progA, A), ph(progA, A), ph(progB, B), ph(cad(progA), this.vary(A, true)), ph(progA, null, 'outro')];
    } else if (mood === 'battle') {
      phrases = [ph(progA, null, 'intro'), ph(progA, A), ph(progA, A), ph(progB, B), ph(progB, this.vary(B, false)), ph(progA, null), ph(cad(progA), this.vary(A, true))];
    } else {
      phrases = [ph(progA, null, 'intro'), ph(progA, null), maybe(progA, A), maybe(progA, A), ph(progA, null)];
      phrases.push(maybe(progB, B), maybe(progB, B));
      if (Math.random() < 0.6) phrases.push(ph(progB, this.vary(B, false), 'interlude'));
      phrases.push(ph(progA, null), maybe(progA, A), ph(cad(progA), this.vary(A, true)), ph(progA, null, 'outro'));
    }

    const bus = ctx.createGain();
    bus.gain.value = mood === 'battle' ? 0.75 : 1;
    bus.connect(this.mix);
    const lead: Voice = mood === 'battle' ? 'vielle' : char === 'song' && Math.random() < 0.3 ? 'vielle' : 'flute';
    const p: Piece = {
      mood, char, tonic, mode, steps: S, stepSec,
      arp: pick(def.arps), drumLow: pick(def.drumsLow), drumHigh: pick(def.drumsHigh), lead,
      drone: true,
      drums: mood === 'battle' || (mood === 'peace' && char === 'song' && age >= 1),
      harp: mood === 'menu' || Math.random() < 0.4,
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
        else if (s === 0 || len >= 3) deg = nearest(deg + pick([-1, 0, 1]), chordTone);
        else deg += pick([-1, 1, -1, 1, 0]);
        if (deg > 13) deg -= 2;
        if (deg < 5) deg += 2;
        // Silencios frecuentes: la melodía respira y deja oír el ostinato
        if (last || (i === 0 && b % 2 === 0) || Math.random() > 0.3) notes.push({ at: b * S + s, len, deg, vel: (s === 0 ? 0.8 : 0.68) * rand(0.95, 1.03) });
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
    if (inner.length && Math.random() < 0.6) pick(inner).deg += pick([-1, 1]);
    const long = inner.filter(n => n.len >= 2);
    if (long.length && Math.random() < 0.25) {
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
    const hum = () => t + (Math.random() - 0.5) * 0.008;
    const outro = ph.role === 'outro';
    // Oleaje lento de intensidad cada 8 compases: el ostinato «respira» sin cambiar de notas
    const swell = 0.8 + 0.2 * Math.sin(((this.phraseIdx * 4 * S + this.step) / (8 * S)) * Math.PI * 2);

    // Bajo: raíz en la parte fuerte; en batalla, también a mitad de compás
    if (s === 0) this.pluck(p.ch.lute, hum(), 'lute', this.midi(p, chord - 7), 0.45, 2.4);
    if (!outro && s === S / 2 && p.mood === 'battle') this.pluck(p.ch.lute, hum(), 'lute', this.midi(p, chord - 3), 0.32, 1.6);

    // Ostinato (laúd; arpa en el menú). En la coda se va apagando
    const a = p.arp[s];
    if (a >= 0 && (!outro || (bar < 3 && Math.random() < 1 - bar * 0.3))) {
      const harp = p.mood === 'menu';
      this.pluck(harp ? p.ch.harp : p.ch.lute, hum(), harp ? 'harp' : 'lute', this.midi(p, chord + ARP_DEG[a]), (s === 0 ? 0.32 : 0.25) * swell * rand(0.96, 1.03), 1.6);
    }
    if (outro && bar === 3 && s === 0) {
      [0, 2, 4, 7].forEach((d, i) => this.pluck(p.ch.harp, t + i * 0.06, 'harp', this.midi(p, d + 7), 0.3, 3));
    }

    // Melodía; el interludio lo toca el arpa y, en edades avanzadas, el arpa armoniza las notas largas
    if (ph.melody) {
      for (const n of ph.melody) {
        if (n.at !== this.step) continue;
        if (ph.role === 'interlude') {
          this.pluck(p.ch.harp, t, 'harp', this.midi(p, n.deg) + 12, 0.36 * n.vel, 2.4);
          continue;
        }
        this.voice(p.ch.lead, t, p.lead, this.midi(p, n.deg) + LEAD_OCTAVE[p.lead], n.len * p.stepSec * 0.96, n.vel);
        if ((p.harp || age >= 2) && n.len >= 3 && p.mood !== 'battle') {
          this.pluck(p.ch.harp, t + 0.01, 'harp', this.midi(p, n.deg - (p.mood === 'menu' ? 4 : 2)) + 12, 0.22, 2.4);
        }
      }
    }

    // Percusión: entra tras el primer compás y se retira en la coda
    const drums = p.drums && !(ph.role === 'intro' && bar < 1 && p.mood !== 'battle') && !(outro && bar >= 2);
    if (drums) {
      const lo = p.drumLow[s];
      if (lo !== '.') this.drum(p.ch.drum, t, lo);
      const tamb = p.mood === 'battle' && age >= 1;
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
      const beat = 0.3;
      const line: [number, number, number][] = [[0, 0, 1], [0, 1, 0.5], [0, 1.5, 0.5], [4, 2, 1], [2, 3, 1], [4, 4, 1], [7, 5, 6]];
      for (const [d, at, len] of line) {
        this.voice(ch.lead, t0 + at * beat, 'trumpet', this.midi(key, d), len * beat, 0.9);
        if (len >= 1) this.voice(ch.lead, t0 + at * beat, 'trumpet', this.midi(key, d - 2), len * beat, 0.5);
      }
      const end = line[line.length - 1][1];
      this.drum(ch.drum, t0, 'w');
      this.drum(ch.drum, t0 + end * beat, 'w');
      for (let i = 0; i < 8; i++) this.pluck(ch.harp, t0 + end * beat + i * 0.08, 'harp', this.midi(key, 7 + i), 0.26, 3);
      this.pluck(ch.lute, t0 + end * beat, 'lute', this.midi(key, -7), 0.6, 3);
      dur = end * beat + 3.5;
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
      lute: mk(-0.3, biquad('lowpass', 2200), biquad('peaking', 240, 1, 3)),
      lead: mk(0.2),
      harp: mk(0.4, biquad('highpass', 150)),
      drum: mk(0),
      drone: mk(-0.05, biquad('lowpass', 700)),
    };
  }

  /** Cuerda pulsada por Karplus-Strong, generada una vez por nota y guardada en caché. */
  private pluckBuf(kind: 'lute' | 'harp', midi: number): AudioBuffer {
    const key = kind + midi;
    const cached = this.plucks.get(key);
    if (cached) return cached;
    const ctx = this.ctx!, sr = ctx.sampleRate;
    const seconds = kind === 'lute' ? 2.6 : 3.2;
    const bright = kind === 'lute' ? 0.45 : 0.75;
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
      attack = 0.12; rel = 0.18; level *= 0.28; vibDepth = 0.0035; vibRate = 4.6;
      this.breath(dest, t, f, vel * 0.035, dur);
    } else if (kind === 'vielle') {
      o.type = 'sawtooth';
      const lp = ctx.createBiquadFilter(); lp.frequency.value = 2000;
      const body = ctx.createBiquadFilter(); body.type = 'peaking'; body.frequency.value = 700; body.gain.value = 4;
      chain(lp); chain(body);
      attack = 0.16; rel = 0.2; level *= 0.11; vibRate = 4.8;
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
      attack = 0.05; level *= 0.1; vibDepth = 0.002;
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
    g.gain.linearRampToValueAtTime(p.mood === 'battle' ? 0.055 : 0.05, t + 6);
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
    lfo.frequency.value = 0.07;
    lg.gain.value = 0.012;
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
