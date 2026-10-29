import type { ChatEvent } from './music.ts';

export const SCENARIOS = ['quiet', 'one', 'three', 'hype', 'burst', 'calm'] as const;
export type Scenario = typeof SCENARIOS[number];
const viewers = ['Ada', 'Brio', 'Coda', 'Dawn', 'Echo', 'Faye', 'Glim', 'Halo'];

export function demoEvents(scenario: Scenario, start: number): ChatEvent[] {
  if (scenario === 'quiet' || scenario === 'calm') return [];
  const count = scenario === 'one' ? 1 : scenario === 'three' ? 3 : scenario === 'hype' ? 8 : 45;
  return Array.from({ length: count }, (_, i) => ({
    id: `demo-${scenario}-${start}-${i}`, viewerId: `demo-${i % (scenario === 'one' ? 1 : scenario === 'three' ? 3 : 8)}`,
    viewer: viewers[i % (scenario === 'one' ? 1 : scenario === 'three' ? 3 : 8)],
    text: scenario === 'hype' ? (i % 2 ? 'let\'s go 🔥' : 'wow amazing') : scenario === 'burst' ? 'wow' : (i % 2 ? 'nice' : 'hello'),
    at: start + i * (scenario === 'burst' ? 32 : 480), source: 'DEMO' as const,
  }));
}
