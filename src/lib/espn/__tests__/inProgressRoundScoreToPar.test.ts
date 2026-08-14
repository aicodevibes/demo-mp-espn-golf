import { describe, it, expect } from 'vitest';
import { EspnTournamentAdapter } from '@/lib/espn';

describe('In-Progress Round Score-to-Par Bug', () => {
  it('calculates scoreToPar as -3 for a golfer thru 3 holes (not -60 against 18-hole par)', () => {
    const rawSummary = {
      profile: { id: '8906', displayName: 'Keith Mitchell' },
      rounds: [
        {
          period: 2,
          displayValue: '-3',
          linescores: [
            { period: 1, value: 3, par: 4, scoreType: { displayValue: '-1' } },
            { period: 2, value: 3, par: 4, scoreType: { displayValue: '-1' } },
            { period: 3, value: 2, par: 3, scoreType: { displayValue: '-1' } },
          ],
        },
      ],
      courseHoles: [4, 4, 3, 4, 5, 4, 3, 4, 4, 4, 4, 3, 4, 4, 5, 3, 4, 4], // Wyndham Par 70
    };

    const summary = EspnTournamentAdapter.normalizePlayerSummary(rawSummary);
    const round2 = summary.rounds[0];

    expect(round2.period).toBe(2);
    expect(round2.totalStrokes).toBe(8);
    expect(round2.totalPar).toBe(70);
    expect(round2.scoreToPar).toBe(-3);
    expect(round2.formattedScore).toBe('-3');
  });
});
