import { describe, it, expect } from 'vitest';
import { getGolferCumulativeScoreToPar, normalizeCompetitor } from '@/lib/espn';
import { ESPNCompetitor } from '@/types/espn';

describe('Keith Mitchell Active Round Score Bug (Phase 1 & 2 Repro)', () => {
  const keithMitchellFixture: ESPNCompetitor = {
    id: '8906',
    status: {
      displayValue: 'Thru 3',
      period: 2,
      hole: 3,
      thru: 3,
      type: {
        id: '1',
        name: 'STATUS_IN_PROGRESS',
        state: 'in',
        completed: false,
        description: 'In Progress',
      },
      position: {
        id: '7',
        displayName: 'T7',
        isTie: true,
      },
    },
    // In ESPN leaderboard API, comp.score is an object with R1 score
    score: {
      value: 69,
      displayValue: '-1',
    } as any,
    linescores: [
      {
        value: 69,
        displayValue: '-1',
        period: 1,
      },
      {
        value: 10,
        displayValue: '-3',
        period: 2,
      },
    ],
    statistics: [
      {
        name: 'scoreToPar',
        value: -4,
        displayValue: '-4',
      },
    ],
    athlete: {
      id: '8906',
      displayName: 'Keith Mitchell',
      headshot: {
        href: 'https://a.espncdn.com/i/headshots/golf/players/full/8906.png',
      },
    },
  };

  it('evaluates cumulative score as -4 (not stale R1 score -1)', () => {
    const scoreMeta = getGolferCumulativeScoreToPar(keithMitchellFixture);
    expect(scoreMeta.formattedScore).toBe('-4');
    expect(scoreMeta.isUnderPar).toBe(true);

    const norm = normalizeCompetitor(keithMitchellFixture);
    expect(norm.scoreDisplay).toBe('-4');
    expect(norm.scoreToPar).toBe(-4);
  });
});
