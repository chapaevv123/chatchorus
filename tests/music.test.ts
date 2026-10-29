import { describe, expect, it } from 'vitest';
import { MusicState, allowedPitchClasses, noteFor, quantize, voiceFor, type ChatEvent } from '../src/music';
import { demoEvents, SCENARIOS } from '../src/demo';

const event = (id: string, viewerId: string, at: number, text = 'hello'): ChatEvent => ({ id, viewerId, viewer: viewerId, at, text, source: 'DEMO' });

describe('musical pipeline', () => {
  it('quantizes forward and keeps generated notes inside the bar scale', () => {
    expect(quantize(105, 100, 0)).toBe(200);
    for (const mood of ['CALM', 'HAPPY', 'HYPE', 'MYSTERY', 'TENSE'] as const) for (let bar = 0; bar < 8; bar++) {
      expect(allowedPitchClasses(mood, bar)).toContain(noteFor('ada', 'hello', mood, bar) % 12);
    }
  });
  it('assigns stable voices and plays a single viewer', () => {
    const state = new MusicState(); const one = state.accept(event('1', 'ada', 1000));
    expect(one).not.toBeNull(); expect(one?.voice).toBe(voiceFor('ada'));
    expect(state.accept(event('2', 'ada', 1500))?.midi).toBeDefined();
  });
  it('deduplicates IDs and caps a burst at 24 notes per second', () => {
    const state = new MusicState(); expect(state.accept(event('same', 'ada', 1000))).not.toBeNull();
    expect(state.accept(event('same', 'ada', 2000))).toBeNull();
    let accepted = 0;
    for (let i = 0; i < 50; i++) if (state.accept(event(String(i), `viewer${i}`, 3000 + i * 10))) accepted++;
    expect(accepted).toBe(24);
  });
  it('can reset to a clean, reproducible scenario', () => {
    const state = new MusicState(); state.accept(event('a', 'ada', 1000, 'hype 🔥'));
    state.reset(); expect(state.accept(event('a', 'ada', 1000, 'hype 🔥'))).not.toBeNull();
    for (const scenario of SCENARIOS) expect(demoEvents(scenario, 1234)).toEqual(demoEvents(scenario, 1234));
    expect(demoEvents('quiet', 1234)).toHaveLength(0);
    expect(demoEvents('one', 1234)).toHaveLength(1);
    expect(demoEvents('three', 1234)).toHaveLength(3);
    expect(demoEvents('hype', 1234)).toHaveLength(8);
    expect(demoEvents('burst', 1234)).toHaveLength(45);
    expect(demoEvents('calm', 1234)).toHaveLength(0);
  });
});
