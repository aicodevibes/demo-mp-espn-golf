import { describe, it, expect } from 'vitest';
import { formatPlayerSummaryFromCompetitor } from '../summary';

describe('formatPlayerSummaryFromCompetitor', () => {
  it('correctly maps linescores into round numbers, stroke totals, and 18-hole par & score types', () => {
    const mockCompetitor = {
      id: '3470',
      athlete: {
        id: '3470',
        displayName: 'Scottie Scheffler',
      },
      linescores: [
        {
          period: 1,
          value: 68,
          displayValue: '-4',
          linescores: [
            { period: 1, value: 3, scoreType: { displayValue: '-1' } }, // Birdie (Par 4, 3 strokes)
            { period: 2, value: 4, scoreType: { displayValue: 'E' } },  // Par (Par 4, 4 strokes)
          ],
        },
        {
          period: 2,
          value: 66,
          displayValue: '-6',
          linescores: [],
        },
      ],
    };

    const summary = formatPlayerSummaryFromCompetitor(mockCompetitor as any);

    expect(summary.player.displayName).toBe('Scottie Scheffler');
    expect(summary.rounds.length).toBe(2);
    expect(summary.rounds[0].period).toBe(1);
    expect(summary.rounds[0].displayValue).toBe('68');
    expect(summary.rounds[0].holes[0].par).toBe(4);
    expect(summary.rounds[0].holes[0].strokes).toBe(3);
    expect(summary.rounds[0].holes[0].scoreType).toBe('birdie');
    expect(summary.rounds[1].displayValue).toBe('66');
  });

  it('assigns scoreType unplayed when a hole has 0 strokes', () => {
    const mockCompetitor = {
      id: '123',
      linescores: [
        {
          period: 1,
          value: 0,
          linescores: [
            { period: 1, value: 0, scoreType: { displayValue: 'E' } },
          ],
        },
      ],
    };

    const summary = formatPlayerSummaryFromCompetitor(mockCompetitor as any);
    expect(summary.rounds[0].holes[0].strokes).toBe(0);
    expect(summary.rounds[0].holes[0].scoreType).toBe('unplayed');
  });
});
