import { describe, it, expect } from 'vitest';
import { calculateParticipantStandings } from '../scoring';
import { Participant, ContestConfig } from '@/types/contest';

describe('Player Directory Resolution Seam', () => {
  it('resolves player name and headshot from player directory map when live competitor is absent', () => {
    const mockParticipants: Participant[] = [
      {
        id: 'p1',
        name: 'Greg',
        draftedPlayerIds: ['3092582', '6007', '4587'], // Morikawa, Schauffele, Rahm
        greedyPlayerId: '3092582',
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

    // Directory map containing stored player metadata from Firestore
    const playerDirectoryMap: Record<string, { id: string; name: string; headshotUrl?: string }> = {
      '3092582': { id: '3092582', name: 'Collin Morikawa', headshotUrl: 'https://a.espncdn.com/i/headshots/golf/players/full/3092582.png' },
      '6007': { id: '6007', name: 'Xander Schauffele', headshotUrl: 'https://a.espncdn.com/i/headshots/golf/players/full/6007.png' },
      '4587': { id: '4587', name: 'Jon Rahm', headshotUrl: 'https://a.espncdn.com/i/headshots/golf/players/full/4587.png' },
    };

    // Live ESPN competitors array is empty (scheduled event)
    const liveCompetitors: any[] = [];

    const standings = calculateParticipantStandings(
      mockParticipants,
      liveCompetitors,
      mockConfig,
      null,
      playerDirectoryMap
    );

    expect(standings).toHaveLength(1);
    const gregStanding = standings[0];
    expect(gregStanding.draftedGolferDetails).toHaveLength(3);

    // Assert names are resolved from playerDirectoryMap
    expect(gregStanding.draftedGolferDetails[0].name).toBe('Collin Morikawa');
    expect(gregStanding.draftedGolferDetails[1].name).toBe('Xander Schauffele');
    expect(gregStanding.draftedGolferDetails[2].name).toBe('Jon Rahm');

    // Assert no fallback string like "Golfer (3092582)" appears
    expect(gregStanding.draftedGolferDetails[0].name).not.toContain('Golfer (3092582)');
  });
});
