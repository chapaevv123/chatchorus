import type { Mood, NoteEvent } from './music';
import { PROGRESSION } from './music';

const WAVE: OscillatorType[] = ['sine', 'triangle', 'sine', 'triangle', 'sine'];
const cents = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

export class AudioController {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private toneFilter: BiquadFilterNode | null = null;
  private interval: ReturnType<typeof setTimeout> | null = null;
  private voices = 0;
  private muted = false;
  private volume = 0.58;
  private bar = 0;
  private tempo = 76;
  private mood: Mood = 'CALM';
  private effect: 'CLEAN' | 'WARM' | 'BRIGHT' = 'CLEAN';
  get running(): boolean { return !!this.context && this.context.state === 'running'; }
  setTempo(value: number): void { this.tempo = Math.max(60, Math.min(135, value)); }
  setMood(value: Mood): void { this.mood = value; }
  setEffect(value: 'CLEAN' | 'WARM' | 'BRIGHT'): void { this.effect = value; if (this.toneFilter && this.context) this.toneFilter.frequency.setTargetAtTime(value === 'WARM' ? 850 : value === 'BRIGHT' ? 6800 : 3200, this.context.currentTime, .08); }
  setVolume(value: number): void { this.volume = Math.max(0, Math.min(1, value)); this.updateGain(); }
  setMuted(value: boolean): void { this.muted = value; this.updateGain(); }
  private updateGain(): void { if (this.master && this.context) this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume * 0.32, this.context.currentTime, 0.04); }
  async start(): Promise<void> {
    if (this.context) { await this.context.resume(); this.updateGain(); return; }
    const ctx = new AudioContext();
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -20; compressor.ratio.value = 8;
    compressor.attack.value = 0.005; compressor.release.value = 0.18;
    const master = ctx.createGain();
    const toneFilter = ctx.createBiquadFilter(); toneFilter.type = 'lowpass'; toneFilter.frequency.value = this.effect === 'WARM' ? 850 : this.effect === 'BRIGHT' ? 6800 : 3200;
    master.gain.value = this.muted ? 0 : this.volume * 0.32;
    master.connect(toneFilter); toneFilter.connect(compressor); compressor.connect(ctx.destination);
    this.context = ctx; this.master = master; this.toneFilter = toneFilter;
    await ctx.resume();
    this.baseline();
    this.scheduleBaseline();
  }
  private scheduleBaseline(): void {
    this.interval = setTimeout(() => { this.baseline(); this.scheduleBaseline(); }, 60000 / this.tempo * 2);
  }
  private tone(midi: number, duration: number, level: number, type: OscillatorType, delay = 0): void {
    const ctx = this.context, master = this.master;
    if (!ctx || !master || this.voices >= 18) return;
    this.voices++;
    const osc = ctx.createOscillator(), amp = ctx.createGain();
    const at = ctx.currentTime + Math.max(0, Math.min(delay, 0.5));
    osc.type = type; osc.frequency.value = cents(midi);
    amp.gain.setValueAtTime(0, at);
    amp.gain.linearRampToValueAtTime(level, at + 0.025);
    amp.gain.exponentialRampToValueAtTime(0.001, at + duration);
    osc.connect(amp); amp.connect(master);
    osc.start(at); osc.stop(at + duration + 0.02);
    osc.onended = () => { this.voices = Math.max(0, this.voices - 1); osc.disconnect(); amp.disconnect(); };
  }
  private baseline(): void {
    const root = PROGRESSION[this.bar++ % 4];
    this.tone(36 + root, 1.7, 0.12, 'sine');
    this.tone(48 + root, 1.4, 0.06, 'triangle');
    this.tone(55 + root, 1.25, 0.035, 'sine', 0.08);
    this.tone(52 + root - (this.mood === 'MYSTERY' || this.mood === 'TENSE' ? 1 : 0), 1.25, 0.026, 'triangle', 0.12);
    if (this.mood === 'HYPE') this.tone(60 + root, 0.18, 0.035, 'triangle', 0.22);
  }
  play(note: NoteEvent): void {
    if (!this.running) return;
    const delay = (note.beat - Date.now()) / 1000;
    this.tone(note.midi, 0.35 + (1 - note.energy) * 0.5, 0.07, WAVE[note.voice], delay);
    if (note.voice === 2) this.tone(note.midi + 12, 0.18, 0.018, 'sine', delay);
  }
  async stop(): Promise<void> {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
    const ctx = this.context;
    this.context = null; this.master = null; this.toneFilter = null; this.voices = 0;
    if (ctx) await ctx.close();
  }
  emergencyStop(): Promise<void> { this.muted = true; return this.stop(); }
}
