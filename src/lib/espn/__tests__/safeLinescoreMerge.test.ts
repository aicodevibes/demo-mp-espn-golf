import { describe, it, expect } from 'vitest';
import { EspnTournamentAdapter } from '../adapter';

describe('normalizePlayerSummary safe linescore merge', () => {
  it('preserves live competitor linescores when rawSummary returns unplayed zero-stroke placeholders', () => {
    // Scenario: ESPN rawSummary endpoint returns Round 2 with 18 zero-stroke
    // placeholder holes (the round hasn't started in their detailed feed yet),
    // but the live leaderboard competitor already has real in-progress strokes.
    const realHoleData = Array.from({ length: 8 }, (_, i) => ({
      period: i + 1,
      value: i < 4 ? 3 : 4,         // mix of 3s and 4s — real played strokes
      par: 4,
      scoreType: { displayValue: i < 4 ? '-1' : '0' },
    }));

    const zeroStrokePlaceholders = Array.from({ length: 18 }, (_, i) => ({
      period: i + 1,
      value: 0,     // unplayed — zero strokes
      par: 4,
      scoreType: { displayValue: '0' },
    }));

    const rawSummary = {
      rounds: [
        {
          period: 1,
          displayValue: '70',
          value: 70,
          linescores: Array.from({ length: 18 }, (_, i) => ({
            period: i + 1,
            value: 4,
            par: 4,
            scoreType: { displayValue: '0' },
          })),
        },
        {
          period: 2,
          displayValue: '-',       // stale/empty display value
          value: 0,                // stale/no value
          linescores: zeroStrokePlaceholders,  // 💀 the dangerous payload
        },
      ],
    };

    const competitor = {
      id: '12345',
      athlete: {
        id: '12345',
        displayName: 'Test Golfer',
      },
      status: {
        thru: 8,
        period: 2,
        type: { state: 'in', completed: false, description: 'In Progress' },
      },
      linescores: [
        { period: 1, value: 70, displayValue: '70' },
        {
          period: 2,
          value: 29,
          displayValue: '-2',
          linescores: realHoleData,   // live hole-by-hole from leaderboard
        },
      ],
    };

    const normalized = EspnTournamentAdapter.normalizePlayerSummary(
      rawSummary,
      competitor as any,
    );

    // Round 2 should NOT have been overwritten by the zero-stroke placeholders
    const r2 = normalized.rounds.find(r => r.period === 2);
    expect(r2).toBeDefined();

    // The round should still carry the live competitor's display value, not the stale '-'
    expect(r2?.displayValue).toBe('29');

    // Verify the underlying hole data was preserved — at least one hole should have real strokes
    const playedHoles = r2?.holes.filter(h => h.strokes > 0) ?? [];
    expect(playedHoles.length).toBeGreaterThan(0);
  });

  it('accepts rawSummary linescores when they contain actual played strokes', () => {
    // rawSummary has real detailed linescores for Round 1 — these should win
    const detailedLinescores = Array.from({ length: 18 }, (_, i) => ({
      period: i + 1,
      value: i % 3 === 0 ? 3 : 4,
      par: 4,
      scoreType: { displayValue: i % 3 === 0 ? '-1' : '0' },
    }));

    const rawSummary = {
      rounds: [
        {
          period: 1,
          displayValue: '68',
          value: 68,
          linescores: detailedLinescores,
        },
      ],
    };

    const competitor = {
      id: '12345',
      athlete: {
        id: '12345',
        displayName: 'Test Golfer',
      },
      status: {
        thru: 18,
        period: 1,
        type: { state: 'post', completed: true, description: 'Final' },
      },
      linescores: [
        { period: 1, value: 68, displayValue: '68' },
      ],
    };

    const normalized = EspnTournamentAdapter.normalizePlayerSummary(
      rawSummary,
      competitor as any,
    );

    const r1 = normalized.rounds.find(r => r.period === 1);
    expect(r1).toBeDefined();

    // Detailed linescores should have been used (18 holes with strokes)
    const playedHoles = r1?.holes.filter(h => h.strokes > 0) ?? [];
    expect(playedHoles.length).toBe(18);
  });
});
