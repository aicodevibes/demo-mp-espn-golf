import { describe, it, expect } from 'vitest';
import { EspnTournamentAdapter } from '../adapter';

describe('normalizePlayerSummary fallback when rawSummary is null', () => {
  it('handles competitor fallback with in-progress linescores', () => {
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
        {
          value: 71,
          displayValue: '+1',
          period: 1,
          inScore: 36,
          outScore: 35,
        },
        {
          value: 29,
          displayValue: '-2',
          period: 2,
          outScore: 29,
        },
        {
          period: 3,
        },
      ],
    };

    const fallbackNorm = EspnTournamentAdapter.normalizePlayerSummary(null, competitor as any);
    console.log('Fallback norm rounds:', fallbackNorm.rounds.map(r => ({
      period: r.period,
      displayValue: r.displayValue,
      formattedScore: r.formattedScore,
      holesWithStrokes: r.holes.filter(h => h.isPlayed).length,
    })));

    expect(fallbackNorm.rounds.length).toBeGreaterThanOrEqual(2);
  });
});
