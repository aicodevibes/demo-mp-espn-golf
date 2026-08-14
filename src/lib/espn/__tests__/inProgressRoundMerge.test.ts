import { describe, it, expect } from 'vitest';
import { EspnTournamentAdapter } from '../adapter';

describe('normalizePlayerSummary in-progress round merging', () => {
  it('merges in-progress round from fallbackComp if rawSummary.rounds is missing the in-progress round', () => {
    // rawSummary only has Round 1
    const rawSummary = {
      rounds: [
        {
          period: 1,
          displayValue: '+1',
          value: 71,
          linescores: Array.from({ length: 18 }, (_, i) => ({
            period: i + 1,
            value: 4,
            par: 4,
          })),
        },
      ],
      courseHoles: [4, 4, 5, 3, 4, 4, 4, 3, 4, 4, 3, 4, 4, 3, 4, 5, 4, 4],
    };

    // competitor already has Round 2 in progress on leaderboard
    const competitor = {
      id: '4364865',
      athlete: {
        id: '4364865',
        displayName: 'Alex Fitzpatrick',
      },
      status: {
        thru: 8,
        period: 2,
        type: { state: 'in', completed: false, description: 'In Progress' },
      },
      linescores: [
        { period: 1, value: 71, displayValue: '+1' },
        { period: 2, value: 29, displayValue: '-2' },
      ],
    };

    const normalized = EspnTournamentAdapter.normalizePlayerSummary(rawSummary, competitor as any);
    
    // Both Round 1 and in-progress Round 2 should be present in normalized.rounds!
    expect(normalized.rounds.length).toBeGreaterThanOrEqual(2);
    expect(normalized.rounds.some(r => r.period === 2)).toBe(true);
    const r2 = normalized.rounds.find(r => r.period === 2);
    expect(r2?.displayValue).toBe('29');
    expect(r2?.formattedScore).toBe('-2');
  });
});
