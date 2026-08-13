import { describe, it, expect } from 'vitest';
import { evaluateGolferRoundScore, isRoundCompleted } from '../eventHelpers';
import { calculateDayMoneyWinners, calculateParticipantStandings } from '../../scoring';
import { ESPNCompetitor } from '@/types/espn';

describe('Live In-Progress Event Scoring Seams', () => {
  it('correctly evaluates relative scoreToPar for in-progress player with 54 cumulative strokes through 14 holes', () => {
    const inProgressCompetitor: ESPNCompetitor = {
      id: '10140',
      athlete: {
        id: '10140',
        displayName: 'Eric Cole',
      },
      status: {
        period: 1,
        thru: 14,
        type: {
          id: '2',
          name: 'STATUS_IN_PROGRESS',
          state: 'in',
          completed: false,
          description: 'In Progress',
        },
        position: { id: '33', displayName: 'T33' },
      },
      score: { value: 54, displayValue: '+1' },
      linescores: [
        {
          value: 54,
          displayValue: '+1',
          period: 1,
        },
      ],
    };

    const res = evaluateGolferRoundScore(inProgressCompetitor, 1, 72);

    expect(res.roundStrokes).toBe(54);
    expect(res.scoreToPar).toBe(1);
    expect(res.formattedScore).toBe('+1');
    expect(res.isOverPar).toBe(true);
    expect(res.isUnderPar).toBe(false);
  });

  it('correctly identifies an in-progress round as NOT completed for Day Money eligibility', () => {
    const inProgressCompetitor: ESPNCompetitor = {
      id: '10140',
      athlete: { id: '10140', displayName: 'Eric Cole' },
      status: {
        period: 1,
        thru: 14,
        type: { name: 'STATUS_IN_PROGRESS', state: 'in', completed: false },
      },
      linescores: [{ value: 54, displayValue: '+1', period: 1 }],
    };

    expect(isRoundCompleted(inProgressCompetitor, 1)).toBe(false);
  });

  it('correctly identifies a completed 18-hole round for Day Money eligibility', () => {
    const finishedCompetitor: ESPNCompetitor = {
      id: '10140',
      athlete: { id: '10140', displayName: 'Eric Cole' },
      status: {
        period: 1,
        thru: 18,
        type: { name: 'STATUS_POST', state: 'post', completed: true },
      },
      linescores: [{ value: 68, displayValue: '-2', period: 1 }],
    };

    expect(isRoundCompleted(finishedCompetitor, 1)).toBe(true);
  });

  it('shows in-progress leaders with zero official payout until round is completed', () => {
    const participants = [
      {
        id: 'p1',
        name: 'Player One',
        draftedPlayerIds: ['c1', 'c2', 'c3', 'c4'],
      },
    ];

    const allCompetitors: ESPNCompetitor[] = [
      {
        id: 'c1',
        athlete: { id: 'c1', displayName: 'Partial Golfer' },
        status: { period: 1, thru: 5, type: { state: 'in', completed: false } },
        linescores: [{ value: 18, displayValue: '-2', period: 1 }],
      },
    ];

    const results = calculateDayMoneyWinners(participants, allCompetitors);
    expect(results[0].isCompleted).toBe(false);
    expect(results[0].winners).toHaveLength(1);
    expect(results[0].winners[0].payout).toBe(0);
    expect(results[0].winners[0].thru).toBe('5');
  });
});
