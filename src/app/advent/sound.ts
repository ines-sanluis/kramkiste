/**
 * All the calendar's sounds, made live with the Web Audio API (no audio
 * files): a soft music-box melody (an original tune) and little effects
 * for doors, presents, sparkles, fireworks and the characters.
 *
 * Browsers only allow sound after a tap, so nothing plays until unlock()
 * is called from a pointer event. The on/off choice is remembered.
 */

const STORAGE_KEY = "advent-sound";

type Sfx =
  | "creak"
  | "knock"
  | "whoosh"
  | "land"
  | "pop"
  | "chime"
  | "boop"
  | "clink"
  | "boom"
  | "star"
  | "puff"
  | "jingle";

// The music box tune: [midi note, length in beats], in 3/4.
// 0 = rest. An original little waltz, 8 bars, looped.
const MELODY: [number, number][] = [
  [76, 2], [79, 1],
  [84, 2], [83, 1],
  [81, 1], [79, 1], [76, 1],
  [79, 3],
  [74, 2], [77, 1],
  [81, 2], [79, 1],
  [76, 1], [74, 1], [72, 1],
  [74, 3],
];
const BASS = [48, 45, 41, 43, 50, 41, 48, 43]; // one per bar
const BEAT = 0.42; // seconds

const freq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private music!: GainNode;
  private sfx!: GainNode;
  private reverb!: ConvolverNode;
  private noise!: AudioBuffer;
  private musicTimer: number | null = null;
  private nextNoteTime = 0;
  private noteIndex = 0;
  private barIndex = 0;
  private beatInBar = 0;
  private listeners = new Set<() => void>();
  enabled = true;

  constructor() {
    if (typeof window === "undefined") return;
    try {
      this.enabled = window.localStorage.getItem(STORAGE_KEY) !== "off";
    } catch {
      // storage unavailable: default on
    }
  }

  /** Call from a tap. Creates the audio graph the first time. */
  unlock() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.build();
      document.addEventListener("visibilitychange", () => {
        if (!this.ctx) return;
        if (document.hidden) void this.ctx.suspend();
        else if (this.enabled) void this.ctx.resume();
      });
    }
    if (this.enabled) {
      void this.ctx.resume();
      this.startMusic();
    }
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    try {
      window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
    } catch {
      // not remembered, fine
    }
    if (!this.ctx) {
      if (on) this.unlock();
    } else if (on) {
      void this.ctx.resume();
      this.startMusic();
    } else {
      this.stopMusic();
      void this.ctx.suspend();
    }
    this.listeners.forEach((l) => l());
  }

  subscribe(l: () => void) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  // ── graph ────────────────────────────────────────────────────────────
  private build() {
    const ctx = this.ctx!;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(ctx.destination);

    // a soft room: generated impulse response (decaying noise)
    this.reverb = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 2.2);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    this.reverb.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    this.reverb.connect(wet).connect(this.master);

    this.music = ctx.createGain();
    this.music.gain.value = 0.11;
    this.music.connect(this.master);
    this.music.connect(this.reverb);

    this.sfx = ctx.createGain();
    this.sfx.gain.value = 0.45;
    this.sfx.connect(this.master);
    this.sfx.connect(this.reverb);

    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const n = this.noise.getChannelData(0);
    for (let i = 0; i < n.length; i++) n[i] = Math.random() * 2 - 1;
  }

  // ── music box ────────────────────────────────────────────────────────
  private startMusic() {
    if (!this.ctx || this.musicTimer !== null) return;
    this.nextNoteTime = this.ctx.currentTime + 0.3;
    // schedule a little ahead, every 150 ms (keeps time even if a frame drops)
    this.musicTimer = window.setInterval(() => this.scheduleMusic(), 150);
  }

  private stopMusic() {
    if (this.musicTimer !== null) window.clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  private scheduleMusic() {
    const ctx = this.ctx!;
    while (this.nextNoteTime < ctx.currentTime + 0.6) {
      const [note, beats] = MELODY[this.noteIndex];
      const t = this.nextNoteTime;
      if (this.beatInBar === 0) this.bell(freq(BASS[this.barIndex % BASS.length]), t, 0.5, this.music, 2.4);
      if (note) this.bell(freq(note), t, 0.8, this.music, 1.8);
      this.nextNoteTime += beats * BEAT;
      this.beatInBar += beats;
      if (this.beatInBar >= 3) {
        this.beatInBar = 0;
        this.barIndex++;
      }
      this.noteIndex = (this.noteIndex + 1) % MELODY.length;
      // a breath before the tune starts again
      if (this.noteIndex === 0) this.nextNoteTime += BEAT * 3;
    }
  }

  /** A music-box / bell note: sine + a quieter overtone, quick attack, long fade. */
  private bell(f: number, t: number, vol: number, out: AudioNode, decay = 1.4) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    g.connect(out);
    for (const [mult, amp] of [
      [1, 1],
      [3.01, 0.25],
      [5.2, 0.08],
    ]) {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f * mult;
      const og = ctx.createGain();
      og.gain.value = amp;
      o.connect(og).connect(g);
      o.start(t);
      o.stop(t + decay + 0.05);
    }
  }

  private noiseBurst(
    t: number,
    dur: number,
    vol: number,
    filter: { type: BiquadFilterType; from: number; to?: number; q?: number },
  ) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = filter.type;
    f.Q.value = filter.q ?? 1;
    f.frequency.setValueAtTime(filter.from, t);
    if (filter.to) f.frequency.exponentialRampToValueAtTime(filter.to, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.03, dur / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.sfx);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }

  private tone(t: number, from: number, to: number, dur: number, vol: number, type: OscillatorType = "sine") {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.sfx);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  /** A bell note that climbs with `step` (for doors popping in one by one). */
  ding(step: number) {
    if (!this.ctx || !this.enabled || this.ctx.state !== "running") return;
    const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31, 33, 36];
    const note = 79 + scale[Math.min(step, scale.length - 1)];
    this.bell(freq(note), this.ctx.currentTime + 0.01, 0.3, this.sfx, 1.2);
  }

  // ── effects ──────────────────────────────────────────────────────────
  play(name: Sfx) {
    if (!this.ctx || !this.enabled || this.ctx.state !== "running") return;
    const t = this.ctx.currentTime + 0.01;
    switch (name) {
      case "creak": {
        // an old wooden door: a wobbly, filtered saw
        const ctx = this.ctx;
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.setValueAtTime(95, t);
        o.frequency.linearRampToValueAtTime(140, t + 0.25);
        o.frequency.linearRampToValueAtTime(110, t + 0.5);
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 23;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 18;
        lfo.connect(lfoGain).connect(o.frequency);
        const f = ctx.createBiquadFilter();
        f.type = "bandpass";
        f.frequency.value = 900;
        f.Q.value = 6;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.18, t + 0.06);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
        o.connect(f).connect(g).connect(this.sfx);
        o.start(t);
        lfo.start(t);
        o.stop(t + 0.6);
        lfo.stop(t + 0.6);
        break;
      }
      case "knock":
        for (const dt of [0, 0.13]) {
          this.tone(t + dt, 190, 110, 0.09, 0.5);
          this.noiseBurst(t + dt, 0.05, 0.15, { type: "lowpass", from: 900 });
        }
        break;
      case "whoosh":
        this.noiseBurst(t, 0.9, 0.22, { type: "bandpass", from: 350, to: 2400, q: 1.5 });
        break;
      case "land":
        this.tone(t, 120, 60, 0.18, 0.45);
        this.noiseBurst(t, 0.12, 0.1, { type: "lowpass", from: 600 });
        break;
      case "pop":
        this.tone(t, 900, 180, 0.09, 0.4);
        this.noiseBurst(t, 0.06, 0.2, { type: "highpass", from: 2000 });
        break;
      case "chime":
        [84, 88, 91, 96, 100].forEach((n, i) => this.bell(freq(n), t + i * 0.075, 0.35, this.sfx, 1.6));
        break;
      case "boop":
        this.tone(t, 520, 880, 0.14, 0.3, "triangle");
        break;
      case "clink":
        this.bell(2640, t, 0.18, this.sfx, 0.6);
        this.bell(3170, t + 0.012, 0.14, this.sfx, 0.5);
        break;
      case "boom":
        this.noiseBurst(t, 0.9, 0.35, { type: "lowpass", from: 260, to: 80 });
        for (let i = 0; i < 6; i++) {
          this.noiseBurst(t + 0.25 + Math.random() * 0.5, 0.04, 0.06, { type: "highpass", from: 3000 });
        }
        break;
      case "star":
        this.tone(t, 2200, 700, 0.8, 0.12);
        [96, 100, 103].forEach((n, i) => this.bell(freq(n), t + 0.5 + i * 0.09, 0.2, this.sfx, 1.2));
        break;
      case "puff":
        this.noiseBurst(t, 0.35, 0.15, { type: "lowpass", from: 700, to: 300 });
        break;
      case "jingle":
        [79, 84, 88, 91, 88, 84, 91, 96].forEach((n, i) => this.bell(freq(n), t + i * 0.12, 0.3, this.sfx, 0.9));
        break;
    }
  }
}

/** One shared engine for the page. */
export const sound = new SoundEngine();
