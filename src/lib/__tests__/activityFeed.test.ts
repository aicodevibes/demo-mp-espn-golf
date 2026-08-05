import { describe, it, expect } from 'vitest';
import { generateTournamentActivityEvents } from '../activityFeed';
import { Participant, ContestConfig } from '@/types/contest';
import { ESPNCompetitor } from '@/types/espn';

describe('Activity Feed Generator (src/lib/activityFeed.ts)', () => {
  const sampleConfig: ContestConfig = {
    espnEventId: '401811961',
    eventName: 'Wyndham Championship',
    season: 2026,
    mainPayouts: [500, 300, 200, 100],
    dayMoneyPool: 100,
    coursePar: 70,
  };

  const sampleParticipants: Participant[] = [
    { id: 'p1', name: 'Pat', draftedPlayerIds: ['g1', 'g2'] },
    { id: 'p2', name: 'Greg', draftedPlayerIds: ['g3', 'g4'] },
  ];

  const sampleCompetitors: ESPNCompetitor[] = [
    {
      id: 'g1',
      athlete: { id: 'g1', displayName: 'Justin Rose' },
      linescores: [{ period: 1, value: 66 }, { period: 2, value: 68 }],
      score: '-6',
    },
    {
      id: 'g2',
      athlete: { id: 'g2', displayName: 'Sam Burns' },
      linescores: [{ period: 1, value: 72 }, { period: 2, value: 74 }],
      score: '+6',
      status: {
        type: { name: 'STATUS_CUT', description: 'Cut', detail: 'Cut', state: 'post' },
      },
    },
    {
      id: 'g3',
      athlete: { id: 'g3', displayName: 'Ryan Gerard' },
      linescores: [{ period: 1, value: 70 }, { period: 2, value: 71 }],
      score: '+1',
    },
    {
      id: 'g4',
      athlete: { id: 'g4', displayName: 'Wyndham Clark' },
      linescores: [{ period: 1, value: 75 }],
      score: 'WD',
      status: {
        type: { name: 'STATUS_WD', description: 'Withdrawn', detail: 'WD', state: 'post' },
      },
    },
  ];

  it('returns empty array when participants and competitors are empty', () => {
    const events = generateTournamentActivityEvents([], [], sampleConfig);
    expect(events).toEqual([]);
  });

  it('generates activity events for day money, hot rounds, cut/WD, and top 10', () => {
    const events = generateTournamentActivityEvents(
      sampleParticipants,
      sampleCompetitors,
      sampleConfig
    );

    expect(events.length).toBeGreaterThan(0);

    // Check Day Money events
    const dayMoneyEvents = events.filter((e) => e.type === 'day_money');
    expect(dayMoneyEvents.length).toBeGreaterThan(0);
    expect(dayMoneyEvents[0].icon).toBe('DollarSign');
    expect(dayMoneyEvents[0].title).toContain('Day Money Winner');

    // Check Birdie Streak / Hot Round events
    const hotRoundEvents = events.filter((e) => e.type === 'birdie_streak');
    expect(hotRoundEvents.length).toBeGreaterThan(0);
    expect(hotRoundEvents[0].icon).toBe('Flame');
    expect(hotRoundEvents[0].title).toContain('Hot Round');

    // Check Cut / WD events
    const cutEvents = events.filter((e) => e.type === 'cut');
    expect(cutEvents.length).toBeGreaterThan(0);
    expect(cutEvents[0].icon).toBe('Scissors');

    // Check Top 10 events
    const top10Events = events.filter((e) => e.type === 'top_10');
    expect(top10Events.length).toBeGreaterThan(0);
    expect(top10Events[0].icon).toBe('Trophy');
  });
});
