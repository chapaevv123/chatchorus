export type Mood = 'CALM' | 'HAPPY' | 'HYPE' | 'MYSTERY' | 'TENSE';
export type ChatEvent = { id: string; viewerId: string; viewer: string; text: string; at: number; source: 'LIVE' | 'DEMO' };
export type NoteEvent = ChatEvent & { mood: Mood; midi: number; beat: number; voice: number; energy: number };

const SCALES: Record<Mood, number[]> = {
  CALM: [0, 2, 4, 7, 9], HAPPY: [0, 2, 4, 7, 9], HYPE: [0, 2, 4, 7, 9],
  MYSTERY: [0, 3, 5, 7, 10], TENSE: [0, 3, 5, 7, 10],
};
export const PROGRESSION = [0, 5, 3, 4];
const WORDS: Record<Exclude<Mood, 'CALM'>, RegExp> = {
  HAPPY: /\b(love|nice|yay|joy|beautiful|sweet|happy)\b|[❤️😊✨]/i,
  HYPE: /\b(hype|let'?s go|wow|pog|amazing|go go|fire)\b|[🔥🚀]/i,
  MYSTERY: /\b(why|secret|mystery|hmm|unknown|shadow|what if)\b|[🌙🔮]/i,
  TENSE: /\b(tense|scary|danger|nooo|boss|stress|panic)\b|[😱⚡]/i,
};

export function hashViewer(id: string): number {
  let hash = 2166136261;
  for (const ch of id) { hash ^= ch.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return hash >>> 0;
}

export function voiceFor(id: string): number { return hashViewer(id) % 5; }
export function quantize(time: number, beatMs: number, origin = 0): number {
  if (!Number.isFinite(time) || beatMs <= 0) throw new Error('Invalid quantization input');
  return origin + Math.ceil((time - origin) / beatMs) * beatMs;
}
export function classifyMood(text: string): Mood {
  for (const mood of ['HYPE', 'HAPPY', 'MYSTERY', 'TENSE'] as const) if (WORDS[mood].test(text)) return mood;
  return 'CALM';
}
export function allowedPitchClasses(mood: Mood, bar: number): number[] {
  const root = PROGRESSION[((bar % 4) + 4) % 4];
  return SCALES[mood].map(n => (n + root) % 12);
}
export function noteFor(viewerId: string, text: string, mood: Mood, bar: number): number {
  const pitches = allowedPitchClasses(mood, bar);
  const seed = hashViewer(viewerId + ':' + text);
  return 48 + pitches[seed % pitches.length] + 12 * (1 + (seed >>> 8) % 2);
}

export class MusicState {
  mood: Mood = 'CALM';
  energy = 0.18;
  tempo = 76;
  private moodVotes: Record<Mood, number> = { CALM: 1, HAPPY: 0, HYPE: 0, MYSTERY: 0, TENSE: 0 };
  private seen = new Set<string>();
  private perViewer = new Map<string, number>();
  private recent: number[] = [];
  private origin = 0;
  private override: Mood | null = null;

  setOverride(value: Mood | null): void { this.override = value; this.mood = value ?? this.mood; }
  reset(): void { this.seen.clear(); this.perViewer.clear(); this.recent = []; this.origin = 0; this.energy = 0.18; this.tempo = 76; this.moodVotes = { CALM: 1, HAPPY: 0, HYPE: 0, MYSTERY: 0, TENSE: 0 }; this.mood = this.override ?? 'CALM'; }
  tick(now: number): void {
    this.recent = this.recent.filter(t => now - t < 8000);
    const target = Math.min(1, 0.16 + this.recent.length / 28);
    this.energy += (target - this.energy) * 0.18;
    this.tempo += ((76 + this.energy * 54) - this.tempo) * 0.12;
    for (const key of Object.keys(this.moodVotes) as Mood[]) this.moodVotes[key] *= 0.965;
    if (!this.override) {
      const winner = (Object.keys(this.moodVotes) as Mood[]).sort((a, b) => this.moodVotes[b] - this.moodVotes[a])[0];
      if (this.moodVotes[winner] > this.moodVotes[this.mood] + 0.8) this.mood = winner;
    }
  }
  accept(event: ChatEvent): NoteEvent | null {
    if (this.seen.has(event.id)) return null;
    this.seen.add(event.id);
    if (this.seen.size > 2048) this.seen.delete(this.seen.values().next().value!);
    const last = this.perViewer.get(event.viewerId) ?? -Infinity;
    if (event.at - last < 180) return null;
    this.recent = this.recent.filter(t => event.at - t < 1000);
    if (this.recent.length >= 24) return null;
    this.perViewer.set(event.viewerId, event.at);
    this.recent.push(event.at);
    this.moodVotes[classifyMood(event.text)] += 1.5;
    this.tick(event.at);
    const beatMs = 60000 / this.tempo / 2;
    if (!this.origin) this.origin = event.at;
    const beat = quantize(event.at, beatMs, this.origin);
    const bar = Math.floor((beat - this.origin) / (beatMs * 8));
    return { ...event, mood: this.mood, energy: this.energy, voice: voiceFor(event.viewerId), midi: noteFor(event.viewerId, event.text, this.mood, bar), beat };
  }
}
