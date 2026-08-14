import { describe, it, expect } from 'vitest';
import { EspnTournamentAdapter } from '../adapter';

describe('Alex Fitzpatrick in-progress Round 2 Scorecard', () => {
  it('includes in-progress Round 2 when rawSummary has hole-by-hole linescores', () => {
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
            scoreType: { displayValue: 'E' },
          })),
        },
        {
          period: 2,
          displayValue: '-2',
          value: 29,
          linescores: [
            { period: 1, value: 3, par: 4, scoreType: { displayValue: '-1' } },
            { period: 2, value: 3, par: 4, scoreType: { displayValue: '-1' } },
            { period: 3, value: 5, par: 5, scoreType: { displayValue: 'E' } },
            { period: 4, value: 3, par: 3, scoreType: { displayValue: 'E' } },
            { period: 5, value: 3, par: 4, scoreType: { displayValue: '-1' } },
            { period: 6, value: 4, par: 4, scoreType: { displayValue: 'E' } },
            { period: 7, value: 5, par: 4, scoreType: { displayValue: '+1' } },
            { period: 8, value: 3, par: 3, scoreType: { displayValue: 'E' } },
          ],
        },
        {
          period: 3,
        },
      ],
      courseHoles: [4, 4, 5, 3, 4, 4, 4, 3, 4, 4, 3, 4, 4, 3, 4, 5, 4, 4],
    };

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
        { period: 3 },
      ],
    };

    const normalized = EspnTournamentAdapter.normalizePlayerSummary(rawSummary, competitor as any);
    console.log('Normalized rounds count:', normalized.rounds.length);
    console.log('Normalized rounds:', normalized.rounds.map(r => ({
      period: r.period,
      displayValue: r.displayValue,
      formattedScore: r.formattedScore,
      holesWithStrokes: r.holes.filter(h => h.isPlayed).length,
    })));

    expect(normalized.rounds.length).toBeGreaterThanOrEqual(2);
    expect(normalized.rounds[1].period).toBe(2);
    expect(normalized.rounds[1].holes.filter(h => h.isPlayed).length).toBe(8);
  });
});
