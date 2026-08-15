import { describe, it, expect } from 'vitest';
import { calculateDayMoneyWinners } from '../scoring';
import { Participant, ContestConfig } from '@/types/contest';
import { ESPNCompetitor, ESPNEventStatus } from '@/types/espn';

describe('Day Money Diagnosis & Requirements Test Loop', () => {
  const config: ContestConfig = {
    espnEventId: '401580344',
    eventName: 'US Open',
    season: 2026,
    coursePar: 72,
    dayMoneyPool: 100,
    entryFee: 50,
    mainPayouts: [600, 320, 180, 100],
  };

  it('Issue 1 & 2: does NOT mark round complete when some drafted players are still playing (even if leader finished 18 holes)', () => {
    const participants: Participant[] = [
      { id: 'p1', name: 'Alice', draftedPlayerIds: ['g1'] },
      { id: 'p2', name: 'Bob', draftedPlayerIds: ['g2'] },
    ];

    const competitors: ESPNCompetitor[] = [
      {
        id: 'g1',
        athlete: { id: 'g1', displayName: 'Golfer Finished Early' },
        status: { period: 1, thru: 18, type: { state: 'post', completed: true } },
        linescores: [{ period: 1, value: 68, displayValue: '-4' }],
      },
      {
        id: 'g2',
        athlete: { id: 'g2', displayName: 'Golfer Still Playing' },
        status: { period: 1, thru: 14, type: { state: 'in', completed: false } },
        linescores: [{ period: 1, value: 50, displayValue: '-3' }],
      },
    ];

    const eventStatus: ESPNEventStatus = {
      period: 1,
      type: { state: 'in', completed: false, description: 'In Progress', detail: 'Round 1 - In Progress' },
    };

    const results = calculateDayMoneyWinners(participants, competitors, config, eventStatus);
    const r1 = results[0];

    // Round 1 is NOT complete because Bob's golfer g2 is still playing round 1!
    expect(r1.isCompleted).toBe(false);
    expect(r1.winners[0].payout).toBe(0);
  });

  it('Issue 1: marks round complete when all active drafted players have completed the round', () => {
    const participants: Participant[] = [
      { id: 'p1', name: 'Alice', draftedPlayerIds: ['g1'] },
      { id: 'p2', name: 'Bob', draftedPlayerIds: ['g2'] },
    ];

    const competitors: ESPNCompetitor[] = [
      {
        id: 'g1',
        athlete: { id: 'g1', displayName: 'Golfer 1' },
        status: { period: 1, thru: 18, type: { state: 'post', completed: true } },
        linescores: [{ period: 1, value: 68, displayValue: '-4' }],
      },
      {
        id: 'g2',
        athlete: { id: 'g2', displayName: 'Golfer 2' },
        status: { period: 1, thru: 18, type: { state: 'post', completed: true } },
        linescores: [{ period: 1, value: 72, displayValue: 'E' }],
      },
    ];

    const eventStatus: ESPNEventStatus = {
      period: 1,
      type: { state: 'in', completed: false, description: 'In Progress', detail: 'Round 1' },
    };

    const results = calculateDayMoneyWinners(participants, competitors, config, eventStatus);
    const r1 = results[0];

    expect(r1.isCompleted).toBe(true);
    expect(r1.winners[0].payout).toBe(100);
  });

  it('Issue 3 & 4: formats completed round score as "strokes(scoreToPar)" e.g. "68(-4)" and in-progress as score to par only "-3"', () => {
    const participants: Participant[] = [
      { id: 'p1', name: 'Alice', draftedPlayerIds: ['g1'] },
    ];

    // Completed round:
    const completedCompetitors: ESPNCompetitor[] = [
      {
        id: 'g1',
        athlete: { id: 'g1', displayName: 'Golfer 1' },
        status: { period: 1, thru: 18, type: { state: 'post', completed: true } },
        linescores: [{ period: 1, value: 68, displayValue: '-4' }],
      },
    ];

    const completedResults = calculateDayMoneyWinners(participants, completedCompetitors, config);
    expect(completedResults[0].lowScore).toBe('68(-4)');
    expect(completedResults[0].winners[0].dailyScore).toBe('68(-4)');

    // In-progress round:
    const inProgressCompetitors: ESPNCompetitor[] = [
      {
        id: 'g1',
        athlete: { id: 'g1', displayName: 'Golfer 1' },
        status: { period: 1, thru: 12, type: { state: 'in', completed: false } },
        linescores: [{ period: 1, value: 45, displayValue: '-3' }],
      },
    ];

    const inProgressResults = calculateDayMoneyWinners(participants, inProgressCompetitors, config);
    expect(inProgressResults[0].lowScore).toBe('-3');
    expect(inProgressResults[0].winners[0].dailyScore).toBe('-3');
  });
});
