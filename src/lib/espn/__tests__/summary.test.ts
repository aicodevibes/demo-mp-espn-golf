import { describe, it, expect } from 'vitest';
import { formatPlayerSummaryFromCompetitor, formatPlayerSummaryFromESPNData } from '../summary';

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

  it('correctly extracts explicit hole pars (Par 3, Par 4, Par 5) from ESPN player summary payload', () => {
    const mockESPNPlayerSummaryResponse = {
      profile: {
        id: '3470',
        displayName: 'Scottie Scheffler',
        headshot: 'https://a.espncdn.com/i/headshots/golf/players/full/3470.png',
      },
      rounds: [
        {
          period: 1,
          value: 68,
          displayValue: '-4',
          linescores: [
            { period: 1, value: 4, par: 4, scoreType: { displayValue: 'E' } },
            { period: 2, value: 4, par: 5, scoreType: { displayValue: '-1' } }, // Birdie on Par 5
            { period: 3, value: 3, par: 4, scoreType: { displayValue: '-1' } },
            { period: 4, value: 2, par: 3, scoreType: { displayValue: '-1' } }, // Birdie on Par 3
          ],
        },
        {
          period: 2,
          displayValue: '-',
          linescores: [],
        },
      ],
    };

    const summary = formatPlayerSummaryFromESPNData(mockESPNPlayerSummaryResponse as any);

    expect(summary.player.displayName).toBe('Scottie Scheffler');
    expect(summary.rounds.length).toBe(2);

    // Round 1 hole 2 should have par 5
    expect(summary.rounds[0].holes[1].hole).toBe(2);
    expect(summary.rounds[0].holes[1].par).toBe(5);
    expect(summary.rounds[0].holes[1].strokes).toBe(4);
    expect(summary.rounds[0].holes[1].scoreType).toBe('birdie');

    // Round 1 hole 4 should have par 3
    expect(summary.rounds[0].holes[3].hole).toBe(4);
    expect(summary.rounds[0].holes[3].par).toBe(3);
    expect(summary.rounds[0].holes[3].strokes).toBe(2);

    // Round 2 (unplayed) should inherit known hole pars from round 1
    expect(summary.rounds[1].holes[1].par).toBe(5);
    expect(summary.rounds[1].holes[3].par).toBe(3);
  });
});

