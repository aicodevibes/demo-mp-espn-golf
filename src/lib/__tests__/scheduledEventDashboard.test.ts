import { describe, it, expect } from 'vitest';
import { resolveEventCompetitorsWithFallback } from '../espn';
import { evaluateContest } from '../contestEngine';
import { Participant, ContestConfig } from '@/types/contest';

describe('Scheduled/Upcoming Event Dashboard Evaluation', () => {
  it('resolves golfer names and prevents "Golfer (1234)" fallbacks when ESPN leaderboard is empty', () => {
    const mockParticipants: Participant[] = [
      {
        id: 'p1',
        name: 'Alice',
        draftedPlayerIds: ['3470', '3471', '3472'],
        greedyPlayerId: '3470',
        hasPaidEntry: true,
      },
    ];

    const mockConfig: ContestConfig = {
      espnEventId: 'event-upcoming',
      eventName: 'Upcoming Championship',
      entryFee: 50,
      mainPayouts: [600, 320, 180, 100],
      dayMoneyPool: 75,
      coursePar: 72,
      isFinalized: false,
      season: 2026,
    };

    // ESPN leaderboard endpoint returns 0 competitors for future event
    const espnComps: any[] = [];
    const resolvedCompetitors = resolveEventCompetitorsWithFallback(espnComps, []);

    const contestEvaluation = evaluateContest(mockParticipants, resolvedCompetitors, mockConfig);
    const standings = contestEvaluation.standings;

    expect(standings).toHaveLength(1);
    const aliceStanding = standings[0];
    expect(aliceStanding.draftedGolferDetails).toHaveLength(3);

    // Verify golfer names are resolved (e.g. Scottie Scheffler) instead of "Golfer (3470)"
    expect(aliceStanding.draftedGolferDetails[0].name).toBe('Scottie Scheffler');
    expect(aliceStanding.draftedGolferDetails[0].name).not.toContain('Golfer (3470)');
  });
});
