import { describe, it, expect } from 'vitest';
import { calculateParticipantStandings, calculateDayMoneyWinners, getGolferRoundScoreToPar, calculateGreedyStandings, calculateWagerSettlement } from '../scoring';
import { Participant, ContestConfig } from '@/types/contest';
import { ESPNCompetitor } from '@/types/espn';

describe('Scoring Engine (lib/scoring.ts)', () => {
  const sampleConfig: ContestConfig = {
    espnEventId: '401811961',
    eventName: 'Wyndham Championship',
    season: 2026,
    mainPayouts: [500, 300, 200, 100],
    dayMoneyPool: 100,
    coursePar: 70,
  };

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

  it('calculates participant daily score using lowest 2 drafted golfer scores to par', () => {
    const standings = calculateParticipantStandings(sampleParticipants, sampleCompetitors, sampleConfig);
    expect(standings).toHaveLength(2);
    // Pat: g2 (-2 to par) + g1 (0 to par) = -2 to par for Round 1
    const pat = standings.find((s) => s.participant.name === 'Pat');
    expect(pat).toBeDefined();
    expect(pat?.dailyScores[1]).toBe(-2); // -2 + 0
    // Check custom mainPayouts (500 for 1st)
    expect(pat?.projectedPayout).toBe(500);
  });

  it('calculates Day Money winners and splits custom payout equally on ties', () => {
    const dayMoney = calculateDayMoneyWinners(sampleParticipants, sampleCompetitors, sampleConfig);
    expect(dayMoney).toHaveLength(4);
    // Round 1 low score is 68 (tied between Sam Burns [Pat] and Cameron Young [Greg])
    const r1 = dayMoney[0];
    expect(r1.lowScore).toBe(68);
    expect(r1.winners).toHaveLength(2);
    // 100 pool / 2 = 50
    expect(r1.winners[0].payout).toBe(50);
    expect(r1.winners[1].payout).toBe(50);
  });

  it('computes score to par dynamically via getGolferRoundScoreToPar', () => {
    const comp: ESPNCompetitor = {
      id: 'c1',
      athlete: { id: 'c1', displayName: 'Tiger Woods' },
      score: '-4',
      linescores: [{ period: 1, value: 68 }, { period: 2, value: 72 }],
    };

    // With explicit coursePar 70
    expect(getGolferRoundScoreToPar(comp, 1, 70)).toBe(-2);
    expect(getGolferRoundScoreToPar(comp, 2, 70)).toBe(2);

    // Inferred coursePar = (140 - (-4)) / 2 = 72
    expect(getGolferRoundScoreToPar(comp, 1, null)).toBe(-4);
    expect(getGolferRoundScoreToPar(comp, 2, null)).toBe(0);
  });

  it('correctly uses finished round scores but excludes unplayed round scores for Pierceson Coody (WD) player', () => {
    const wdCompetitors: ESPNCompetitor[] = [
      {
        id: 'coody',
        athlete: { id: 'coody', displayName: 'Pierceson Coody' },
        linescores: [
          { period: 1, value: 76, displayValue: '+6' }, 
          { period: 2, value: 0, displayValue: 'E' }, // Dummy linescore for unplayed round 2
          { period: 3, value: 0, displayValue: 'WD' },
          { period: 4, value: 0, displayValue: 'WD' }
        ],
        score: 'WD',
        status: { position: { displayName: 'WD' }, type: { name: 'STATUS_WITHDRAWN', description: 'Withdrawn', detail: 'WD', state: 'post' } } as any,
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
    ];

    const wdParticipants: Participant[] = [
      { id: 'p1', name: 'Pat', draftedPlayerIds: ['coody', 'g2', 'g3'] }
    ];

    const standings = calculateParticipantStandings(wdParticipants, wdCompetitors, sampleConfig);
    const pat = standings[0];
    expect(pat).toBeDefined();

    // Round 1 daily score should be best two: Burns (-2) + Gerard (+1) = -1
    // Pierceson Coody (+6) is not in top 2 (since it's worst score)
    expect(pat.dailyScores[1]).toBe(-1);

    // Round 2 daily score should be best two: Burns (-1) + Gerard (0) = -1
    // Pierceson Coody's Round 2 score must be null (not default to EVEN/0) so it does NOT help the participant score.
    // The only available scores for R2 are Burns (-1) and Gerard (0). Since we need best 2, and we only have 2 active scores,
    // the team daily score for R2 is -1.
    expect(pat.dailyScores[2]).toBe(-1); 

    // Drafted golfer details check
    const coody = pat.draftedGolferDetails.find((g) => g.id === 'coody');
    expect(coody).toBeDefined();
    expect(coody?.isWD).toBe(true);
    expect(coody?.isCut).toBe(false);
    expect(coody?.roundScoresToPar[1]).toBe(6); // Finished round 1 at +6
    expect(coody?.roundScoresToPar[2]).toBeNull(); // Withdrawn, did not finish round 2
    expect(coody?.roundScoreDisplayStr).toBe('+6/WD/WD/WD');
  });
  it('computes calculateGreedyStandings independently of main tournament cut status', () => {
    const greedyParticipants: Participant[] = [
      { id: 'p1', name: 'Pat', draftedPlayerIds: ['g1', 'g2', 'g3'], isGreedyParticipant: true, greedyPlayerId: 'g1' },
      { id: 'p2', name: 'Greg', draftedPlayerIds: ['g4', 'g5', 'g6'], isGreedyParticipant: true, greedyPlayerId: 'g5' },
    ];

    const greedyStandings = calculateGreedyStandings(greedyParticipants, sampleCompetitors, 70);
    expect(greedyStandings).toHaveLength(2);
    // g1 score: -2 (rank 2), g5 score: -7 (rank 1)
    expect(greedyStandings[0].participant.name).toBe('Greg');
    expect(greedyStandings[0].rank).toBe(1);
    expect(greedyStandings[1].participant.name).toBe('Pat');
    expect(greedyStandings[1].rank).toBe(2);
  });

  it('calculates full WagerSettlementSummary with payouts and entry fee balances', () => {
    const participantsWithPayment: Participant[] = [
      { id: 'p1', name: 'Pat', draftedPlayerIds: ['g1', 'g2', 'g3'], hasPaidEntry: true },
      { id: 'p2', name: 'Greg', draftedPlayerIds: ['g4', 'g5', 'g6'], hasPaidEntry: false },
    ];

    const configWithFees: ContestConfig = {
      ...sampleConfig,
      entryFee: 100,
      isFinalized: true,
    };


    const summary = calculateWagerSettlement(participantsWithPayment, sampleCompetitors, configWithFees);
    expect(summary.totalEntryFeesCollected).toBe(200);
    expect(summary.settlements).toHaveLength(2);

    const pat = summary.settlements.find((s) => s.participantName === 'Pat');
    expect(pat).toBeDefined();
    expect(pat?.hasPaid).toBe(true);
    expect(pat?.mainPayout).toBe(500);
    expect(pat?.netBalance).toBe(500); // 500 main payout - 0 unpaid entry fee (since already paid)
  });

  describe('4th Golfer Replacement Rules (#6)', () => {
    const golfers4thTest: ESPNCompetitor[] = [
      // Participant Pat's original players: g1 (active), g2 (CUT), g3 (CUT)
      {
        id: 'g1',
        athlete: { id: 'g1', displayName: 'Active Player 1' },
        linescores: [{ period: 1, value: 70 }, { period: 2, value: 70 }, { period: 3, value: 70 }, { period: 4, value: 70 }], // Even (0 to par)
        score: 'E',
      },
      {
        id: 'g2',
        athlete: { id: 'g2', displayName: 'Cut Player 1' },
        linescores: [{ period: 1, value: 75 }, { period: 2, value: 75 }],
        score: 'CUT',
        status: { position: { displayName: 'CUT' }, type: { name: 'STATUS_CUT', description: 'Cut', detail: 'CUT', state: 'post' } } as any,
      },
      {
        id: 'g3',
        athlete: { id: 'g3', displayName: 'Cut Player 2' },
        linescores: [{ period: 1, value: 76 }, { period: 2, value: 76 }],
        score: 'CUT',
        status: { position: { displayName: 'CUT' }, type: { name: 'STATUS_CUT', description: 'Cut', detail: 'CUT', state: 'post' } } as any,
      },
      // 4th Golfer assigned post-cut
      {
        id: 'g4th',
        athlete: { id: 'g4th', displayName: '4th Replacement Golfer' },
        linescores: [{ period: 1, value: 65 }, { period: 2, value: 65 }, { period: 3, value: 68 }, { period: 4, value: 69 }], // R1: -5, R2: -5, R3: -2, R4: -1
        score: '-13',
      },
    ];

    const participantWith4th: Participant[] = [
      {
        id: 'p1',
        name: 'Pat',
        draftedPlayerIds: ['g1', 'g2', 'g3', 'g4th'], // 4th golfer at index 3
      },
    ];

    it('ignores 4th golfer R1 and R2 scores for daily team score and displays "-" in draftedGolferDetails', () => {
      const standings = calculateParticipantStandings(participantWith4th, golfers4thTest, sampleConfig);
      const pat = standings[0];
      const g4thDetail = pat.draftedGolferDetails.find((g) => g.id === 'g4th');

      expect(g4thDetail).toBeDefined();
      expect(g4thDetail?.roundScoresToPar[1]).toBeNull();
      expect(g4thDetail?.roundScoresToPar[2]).toBeNull();
      expect(g4thDetail?.roundScoreDisplayStr).toBe('-/-/-2/-1'); // R1/R2 excluded, R3/R4 active

      // R1 daily score should NOT include g4th (-5 to par).
      // Active original scores: g1 (0). Cut scores: g2 (+5), g3 (+6).
      // Best two original: g1 (0) + g2 (+5) = +5.
      expect(pat.dailyScores[1]).toBe(5);
      expect(pat.dailyScores[2]).toBe(5);
    });

    it('activates 4th golfer for R3 and R4 and sums both active player scores', () => {
      const standings = calculateParticipantStandings(participantWith4th, golfers4thTest, sampleConfig);
      const pat = standings[0];

      // R3: active g1 (0) + active g4th (-2) = -2
      expect(pat.dailyScores[3]).toBe(-2);

      // R4: active g1 (0) + active g4th (-1) = -1
      expect(pat.dailyScores[4]).toBe(-1);
    });

    it('excludes 4th golfer from R1/R2 Day Money but includes them for R3/R4', () => {
      const dayMoney = calculateDayMoneyWinners(participantWith4th, golfers4thTest, sampleConfig);
      const r1 = dayMoney[0]; // R1
      const r3 = dayMoney[2]; // R3

      // R1 low score of 65 (shot by g4th) must NOT win Day Money for Pat
      expect(r1.winners.some((w) => w.golferId === 'g4th')).toBe(false);

      // R3 low score of 68 (shot by g4th) SHOULD win Day Money for Pat
      expect(r3.lowScore).toBe(68);
      expect(r3.winners.some((w) => w.golferId === 'g4th')).toBe(true);
    });
  });
});

