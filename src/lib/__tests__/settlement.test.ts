import { describe, it, expect } from 'vitest';
import { calculateWagerSettlement } from '../settlement';
import { Participant, ContestConfig, ParticipantStanding, DayMoneyRoundResult, GreedyStanding } from '@/types/contest';

describe('Wager Settlement Engine (src/lib/settlement.ts)', () => {
  const sampleConfig: ContestConfig = {
    espnEventId: '401811961',
    eventName: 'US Open',
    season: 2026,
    entryFee: 100,
    mainPayouts: [500, 300, 200],
    dayMoneyPool: 50,
    coursePar: 70,
    isFinalized: true,
  };

  const sampleParticipants: Participant[] = [
    { id: 'p1', name: 'Pat', draftedPlayerIds: ['g1', 'g2'], hasPaidEntry: true },
    { id: 'p2', name: 'Greg', draftedPlayerIds: ['g3', 'g4'], hasPaidEntry: false },
    { id: 'p3', name: 'Sam', draftedPlayerIds: ['g5', 'g6'], hasPaidEntry: true },
  ];

  const sampleStandings: ParticipantStanding[] = [
    {
      rank: 1,
      participant: sampleParticipants[0],
      dailyScores: { 1: 140, 2: 138 },
      totalScore: 278,
      isCut: false,
      projectedPayout: 500,
      draftedGolferDetails: [],
    },
    {
      rank: 2,
      participant: sampleParticipants[1],
      dailyScores: { 1: 142, 2: 140 },
      totalScore: 282,
      isCut: false,
      projectedPayout: 300,
      draftedGolferDetails: [],
    },
    {
      rank: 3,
      participant: sampleParticipants[2],
      dailyScores: { 1: 145, 2: 144 },
      totalScore: 289,
      isCut: false,
      projectedPayout: 200,
      draftedGolferDetails: [],
    },
  ];

  const sampleDayMoneyResults: DayMoneyRoundResult[] = [
    {
      round: 1,
      lowScore: 68,
      winners: [
        { participantId: 'p1', participantName: 'Pat', golferId: 'g1', golferName: 'Golf 1', dailyScore: 68, payout: 50 },
      ],
      totalPool: 50,
    },
    {
      round: 2,
      lowScore: 67,
      winners: [
        { participantId: 'p2', participantName: 'Greg', golferId: 'g3', golferName: 'Golf 3', dailyScore: 67, payout: 25 },
        { participantId: 'p3', participantName: 'Sam', golferId: 'g5', golferName: 'Golf 5', dailyScore: 67, payout: 25 },
      ],
      totalPool: 50,
    },
  ];

  it('calculates participant settlement breakdown and net balances correctly', () => {
    const summary = calculateWagerSettlement(
      sampleParticipants,
      sampleStandings,
      sampleDayMoneyResults,
      [],
      sampleConfig
    );

    expect(summary.isFinalized).toBe(true);
    expect(summary.totalEntryFeesCollected).toBe(300); // 3 * 100
    expect(summary.settlements).toHaveLength(3);

    // Pat (Rank 1): Main $500 + DayMoney $50 = $550 total. Entry Fee $100 -> Net +$450. Paid: true
    const pat = summary.settlements.find((s) => s.participantId === 'p1');
    expect(pat).toBeDefined();
    expect(pat?.mainPayout).toBe(500);
    expect(pat?.dayMoneyPayout).toBe(50);
    expect(pat?.totalWinnings).toBe(550);
    expect(pat?.netBalance).toBe(450);
    expect(pat?.hasPaid).toBe(true);

    // Greg (Rank 2): Main $300 + DayMoney $25 = $325 total. Entry Fee $100 -> Net +$225. Paid: false
    const greg = summary.settlements.find((s) => s.participantId === 'p2');
    expect(greg).toBeDefined();
    expect(greg?.mainPayout).toBe(300);
    expect(greg?.dayMoneyPayout).toBe(25);
    expect(greg?.totalWinnings).toBe(325);
    expect(greg?.netBalance).toBe(225);
    expect(greg?.hasPaid).toBe(false);

    // Sam (Rank 3): Main $200 + DayMoney $25 = $225 total. Entry Fee $100 -> Net +$125. Paid: true
    const sam = summary.settlements.find((s) => s.participantId === 'p3');
    expect(sam).toBeDefined();
    expect(sam?.mainPayout).toBe(200);
    expect(sam?.dayMoneyPayout).toBe(25);
    expect(sam?.totalWinnings).toBe(225);
    expect(sam?.netBalance).toBe(125);
    expect(sam?.hasPaid).toBe(true);
  });

  it('uses default entry fee of $50 when entryFee is omitted in config', () => {
    const configWithoutEntryFee = { ...sampleConfig, entryFee: undefined };
    const summary = calculateWagerSettlement(
      sampleParticipants,
      sampleStandings,
      [],
      [],
      configWithoutEntryFee
    );

    expect(summary.totalEntryFeesCollected).toBe(150); // 3 * 50
    const pat = summary.settlements.find((s) => s.participantId === 'p1');
    expect(pat?.entryFee).toBe(50);
    expect(pat?.netBalance).toBe(450); // 500 - 50 = 450
  });

  it('suppresses payouts and net balance calculations when isFinalized is false', () => {
    const unfinalizedConfig = { ...sampleConfig, isFinalized: false };
    const summary = calculateWagerSettlement(
      sampleParticipants,
      sampleStandings,
      sampleDayMoneyResults,
      [],
      unfinalizedConfig
    );
    expect(summary.isFinalized).toBe(false);
    expect(summary.totalMainPayoutsDistributed).toBe(0);
    expect(summary.totalDayMoneyDistributed).toBe(0);
    expect(summary.totalPayoutsDistributed).toBe(0);

    const pat = summary.settlements.find((s) => s.participantId === 'p1');
    expect(pat?.mainPayout).toBe(0);
    expect(pat?.dayMoneyPayout).toBe(0);
    expect(pat?.totalWinnings).toBe(0);
    expect(pat?.netBalance).toBe(0);
  });
});

