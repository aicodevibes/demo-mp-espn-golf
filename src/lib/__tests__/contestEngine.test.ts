import { describe, it, expect } from 'vitest';
import { evaluateContest } from '../contestEngine';
import { Participant, ContestConfig } from '@/types/contest';
import { ESPNCompetitor } from '@/types/espn';

describe('Contest Engine Seam (lib/contestEngine.ts)', () => {
  const sampleConfig: ContestConfig = {
    espnEventId: '401811961',
    eventName: 'Wyndham Championship',
    season: 2026,
    mainPayouts: [500, 300, 200, 100],
    dayMoneyPool: 100,
    coursePar: 70,
    entryFee: 50,
  };

  const sampleParticipants: Participant[] = [
    { id: 'p1', name: 'Pat', draftedPlayerIds: ['g1', 'g2', 'g3'], hasPaidEntry: true },
    { id: 'p2', name: 'Greg', draftedPlayerIds: ['g4', 'g5', 'g6'], hasPaidEntry: false },
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

  it('evaluates entire contest in one atomic call', () => {
    const result = evaluateContest(sampleParticipants, sampleCompetitors, sampleConfig);

    // 1. Standings
    expect(result.standings).toHaveLength(2);
    const pat = result.standings.find((s) => s.participant.name === 'Pat');
    expect(pat).toBeDefined();
    expect(pat?.projectedPayout).toBe(500);

    // 2. Day Money
    expect(result.dayMoneyResults).toHaveLength(4);
    expect(result.dayMoneyResults[0].winners).toHaveLength(2); // Tied low score 68

    // 3. Drafted Player Map
    expect(result.playerDraftedByMap.get('g1')).toEqual(['Pat']);
    expect(result.playerDraftedByMap.get('g5')).toEqual(['Greg']);

    // 4. Wager Settlement Ledger
    expect(result.wagerLedger.totalEntryFeesCollected).toBe(100);
    expect(result.wagerLedger.settlements).toHaveLength(2);
    const patSettlement = result.wagerLedger.settlements.find((s) => s.participantName === 'Pat');
    expect(patSettlement?.mainPayout).toBe(500);
  });

  it('handles empty participants and competitors safely', () => {
    const result = evaluateContest([], [], null);
    expect(result.standings).toEqual([]);
    expect(result.dayMoneyResults).toHaveLength(4);
    expect(result.wagerLedger.settlements).toEqual([]);
    expect(result.playerDraftedByMap.size).toBe(0);
  });

  it('applies 999 stroke penalty on R3/R4 for cut golfers and splits tied main payouts', () => {
    const cutCompetitors: ESPNCompetitor[] = [
      {
        id: 'g1',
        athlete: { id: 'g1', displayName: 'Golfer 1' },
        status: { type: { name: 'STATUS_CUT', description: 'Cut', detail: 'CUT', state: 'post' } },
        linescores: [{ period: 1, value: 74 }, { period: 2, value: 76 }, { period: 3, value: 72 }, { period: 4, value: 72 }],
      },
      {
        id: 'g2',
        athlete: { id: 'g2', displayName: 'Golfer 2' },
        linescores: [{ period: 1, value: 70 }, { period: 2, value: 70 }, { period: 3, value: 70 }, { period: 4, value: 70 }],
      },
      {
        id: 'g3',
        athlete: { id: 'g3', displayName: 'Golfer 3' },
        linescores: [{ period: 1, value: 70 }, { period: 2, value: 70 }, { period: 3, value: 70 }, { period: 4, value: 70 }],
      },
    ];

    const cutParticipants: Participant[] = [
      { id: 'p1', name: 'Participant 1', draftedPlayerIds: ['g1', 'g2'] },
      { id: 'p2', name: 'Participant 2', draftedPlayerIds: ['g2', 'g3'] },
      { id: 'p3', name: 'Participant 3', draftedPlayerIds: ['g2', 'g3'] },
    ];

    const result = evaluateContest(cutParticipants, cutCompetitors, sampleConfig);

    // Verify 999 penalty applied to g1 on R3 and R4
    const p1 = result.standings.find((s) => s.participant.id === 'p1');
    expect(p1).toBeDefined();
    const g1Detail = p1?.draftedGolferDetails.find((g) => g.id === 'g1');
    expect(g1Detail?.isCut).toBe(true);
    expect(g1Detail?.roundScoreDisplayStr).toContain('C');

    // Verify p2 and p3 tied for 1st place split 1st ($500) + 2nd ($300) = $800 / 2 = $400 each
    const p2 = result.standings.find((s) => s.participant.id === 'p2');
    const p3 = result.standings.find((s) => s.participant.id === 'p3');
    expect(p2?.rank).toBe(1);
    expect(p3?.rank).toBe(1);
    expect(p2?.projectedPayout).toBe(400);
    expect(p3?.projectedPayout).toBe(400);
  });

  it('reflects isFinalized status in wagerLedger when contest is finalized', () => {
    const finalizedConfig: ContestConfig = {
      ...sampleConfig,
      isFinalized: true,
    };
    const result = evaluateContest(sampleParticipants, sampleCompetitors, finalizedConfig);
    expect(result.wagerLedger.isFinalized).toBe(true);
  });
});

