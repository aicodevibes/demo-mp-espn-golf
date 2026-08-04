import { describe, it, expect } from 'vitest';
import { calculateParticipantStandings, calculateDayMoneyWinners } from '../scoring';
import { Participant } from '@/types/contest';
import { ESPNCompetitor } from '@/types/espn';

describe('Scoring Engine (lib/scoring.ts)', () => {
  const sampleParticipants: Participant[] = [
    { id: 'p1', name: 'Pat', draftedPlayerIds: ['g1', 'g2', 'g3'] },
    { id: 'p2', name: 'Greg', draftedPlayerIds: ['g4', 'g5', 'g6'] },
  ];

  const sampleCompetitors: ESPNCompetitor[] = [
    {
      id: 'g1',
      athlete: { id: 'g1', displayName: 'Justin Rose' },
      linescores: [{ period: 1, value: 70 }, { period: 2, value: 72 }],
      score: '-2',
    },
    {
      id: 'g2',
      athlete: { id: 'g2', displayName: 'Sam Burns' },
      linescores: [{ period: 1, value: 68 }, { period: 2, value: 69 }],
      score: '-7',
    },
    {
      id: 'g3',
      athlete: { id: 'g3', displayName: 'Ryan Gerard' },
      linescores: [{ period: 1, value: 71 }, { period: 2, value: 70 }],
      score: '-3',
    },
    {
      id: 'g4',
      athlete: { id: 'g4', displayName: 'Wyndham Clark' },
      linescores: [{ period: 1, value: 75 }, { period: 2, value: 74 }],
      score: '+5',
    },
    {
      id: 'g5',
      athlete: { id: 'g5', displayName: 'Cameron Young' },
      linescores: [{ period: 1, value: 68 }, { period: 2, value: 69 }],
      score: '-7',
    },
    {
      id: 'g6',
      athlete: { id: 'g6', displayName: 'Brooks Koepka' },
      linescores: [{ period: 1, value: 72 }, { period: 2, value: 71 }],
      score: '-1',
    },
  ];

  it('calculates participant daily score using lowest 2 drafted golfer scores', () => {
    const standings = calculateParticipantStandings(sampleParticipants, sampleCompetitors);
    expect(standings).toHaveLength(2);
    // Pat: g2 (68) + g1 (70) = 138 for Round 1
    const pat = standings.find((s) => s.participant.name === 'Pat');
    expect(pat).toBeDefined();
    expect(pat?.dailyScores[1]).toBe(138); // 68 + 70
  });

  it('calculates Day Money winners and splits payout equally on ties', () => {
    const dayMoney = calculateDayMoneyWinners(sampleParticipants, sampleCompetitors);
    expect(dayMoney).toHaveLength(4);
    // Round 1 low score is 68 (tied between Sam Burns [Pat] and Cameron Young [Greg])
    const r1 = dayMoney[0];
    expect(r1.lowScore).toBe(68);
    expect(r1.winners).toHaveLength(2);
    expect(r1.winners[0].payout).toBe(37.5);
    expect(r1.winners[1].payout).toBe(37.5);
  });
});
