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
      order: 1,
      athlete: { id: 'g1', displayName: 'Justin Rose' },
      linescores: [
        { 
          period: 1, 
          value: 69, 
          linescores: [
            { period: 1, value: 3, scoreType: { displayValue: "-1" } }
          ]
        }, 
        { 
          period: 2, 
          value: 68,
          linescores: [
            { period: 1, value: 3, scoreType: { displayValue: "-2" } }
          ]
        }
      ],
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

  it('returns empty array when eventId mismatches contestConfig.espnEventId', () => {
    const events = generateTournamentActivityEvents(
      sampleParticipants,
      sampleCompetitors,
      sampleConfig,
      undefined,
      'different-event-123'
    );
    expect(events).toEqual([]);
  });

  it('generates activity events for day money, drafted leaders, and eagles', () => {
    const events = generateTournamentActivityEvents(
      sampleParticipants,
      sampleCompetitors,
      sampleConfig,
      undefined,
      '401811961'
    );

    expect(events.length).toBeGreaterThan(0);

    // Check Day Money events
    const dayMoneyEvents = events.filter((e) => e.type === 'day_money');
    expect(dayMoneyEvents.length).toBeGreaterThan(0);
    expect(dayMoneyEvents[0].icon).toBe('DollarSign');
    expect(dayMoneyEvents[0].title).toContain('Day Money Winner');

    // Check Drafted Leader events
    const leaderEvents = events.filter((e) => e.type === 'drafted_leader');
    expect(leaderEvents.length).toBeGreaterThan(0);
    expect(leaderEvents[0].icon).toBe('Trophy');
    expect(leaderEvents[0].title).toContain('Tournament Leader: Justin Rose');
    expect(leaderEvents[0].subtitle).toContain('Drafted by Pat');

    // Check Eagle events
    const eagleEvents = events.filter((e) => e.type === 'eagle');
    expect(eagleEvents.length).toBeGreaterThan(0);
    expect(eagleEvents[0].icon).toBe('Flame');
    expect(eagleEvents[0].title).toContain('Eagle Highlight: Justin Rose');

    // Ensure legacy events (cut, top_10) are removed
    const cutEvents = events.filter((e) => e.type === ('cut' as any));
    expect(cutEvents.length).toBe(0);
  });
});
