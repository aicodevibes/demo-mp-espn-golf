import {
  Participant,
  ParticipantStanding,
  DayMoneyRoundResult,
  GreedyStanding,
  ContestConfig,
  ParticipantSettlement,
  WagerSettlementSummary,
} from '@/types/contest';

export const DEFAULT_ENTRY_FEE = 50;

/**
 * Calculates the complete Wager Settlement Ledger for all tournament participants.
 * Computes entry fees owed, main payouts won, day money payouts won, total winnings,
 * net balance profit/loss, and payment verification statuses.
 */
export function calculateWagerSettlement(
  participants: Participant[] = [],
  standings: ParticipantStanding[] = [],
  dayMoneyResults: DayMoneyRoundResult[] = [],
  greedyStandings: GreedyStanding[] = [],
  contestConfig?: ContestConfig | null
): WagerSettlementSummary {
  const safeParticipants = Array.isArray(participants) ? participants : [];
  const entryFee = contestConfig?.entryFee ?? DEFAULT_ENTRY_FEE;
  const isFinalized = Boolean(contestConfig?.isFinalized);

  // Map participant ID -> main payout from standings
  const mainPayoutMap = new Map<string, number>();
  (standings || []).forEach((st) => {
    if (st?.participant?.id) {
      mainPayoutMap.set(st.participant.id, st.projectedPayout || 0);
    }
  });

  // Map participant ID -> aggregated Day Money winnings across R1-R4
  const dayMoneyMap = new Map<string, number>();
  (dayMoneyResults || []).forEach((res) => {
    (res?.winners || []).forEach((winner) => {
      if (winner?.participantId) {
        const current = dayMoneyMap.get(winner.participantId) || 0;
        dayMoneyMap.set(winner.participantId, Math.round((current + (winner.payout || 0)) * 100) / 100);
      }
    });
  });

  // Map participant ID -> Greedy side bet payout (if any)
  const greedyPayoutMap = new Map<string, number>();
  // Default $0 unless configured

  let totalEntryFeesCollected = 0;
  let totalMainPayoutsDistributed = 0;
  let totalDayMoneyDistributed = 0;
  let totalGreedyDistributed = 0;

  const settlements: ParticipantSettlement[] = safeParticipants.map((p) => {
    const pEntryFee = entryFee;
    totalEntryFeesCollected += pEntryFee;

    const mainPayout = mainPayoutMap.get(p.id) || 0;
    totalMainPayoutsDistributed += mainPayout;

    const dayMoneyPayout = dayMoneyMap.get(p.id) || 0;
    totalDayMoneyDistributed += dayMoneyPayout;

    const greedyPayout = greedyPayoutMap.get(p.id) || 0;
    totalGreedyDistributed += greedyPayout;

    const totalWinnings = Math.round((mainPayout + dayMoneyPayout + greedyPayout) * 100) / 100;
    const netBalance = Math.round((totalWinnings - pEntryFee) * 100) / 100;

    return {
      participantId: p.id,
      participantName: p.name || 'Participant',
      entryFee: pEntryFee,
      hasPaid: Boolean(p.hasPaidEntry),
      mainPayout,
      dayMoneyPayout,
      greedyPayout,
      totalWinnings,
      netBalance,
    };
  });

  // Sort settlements: Highest total winnings / net balance first
  settlements.sort((a, b) => b.netBalance - a.netBalance);

  const totalPayoutsDistributed =
    Math.round(
      (totalMainPayoutsDistributed + totalDayMoneyDistributed + totalGreedyDistributed) * 100
    ) / 100;
  const netPoolBalance = Math.round((totalEntryFeesCollected - totalPayoutsDistributed) * 100) / 100;

  return {
    totalEntryFeesCollected,
    totalMainPayoutsDistributed,
    totalDayMoneyDistributed,
    totalGreedyDistributed,
    totalPayoutsDistributed,
    netPoolBalance,
    isFinalized,
    settlements,
  };
}
