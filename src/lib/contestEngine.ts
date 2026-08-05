import { ESPNCompetitor, ESPNEvent } from '@/types/espn';
import {
  Participant,
  ContestConfig,
  ParticipantStanding,
  DayMoneyRoundResult,
  WagerSettlementSummary,
  GreedyStanding,
} from '@/types/contest';
import {
  calculateParticipantStandings,
  calculateDayMoneyWinners,
  createPlayerDraftedByMap,
  calculateGreedyStandings,
} from '@/lib/scoring';
import { calculateWagerSettlement } from '@/lib/settlement';

export interface ContestEvaluationResult {
  standings: ParticipantStanding[];
  dayMoneyResults: DayMoneyRoundResult[];
  wagerLedger: WagerSettlementSummary;
  playerDraftedByMap: Map<string, string[]>;
  greedyStandings: GreedyStanding[];
}

/**
 * Deep module seam for contest evaluation.
 * Evaluates standings, day money winners, drafted golfer mapping, greedy side bets,
 * and wager settlement summaries in a single atomic pass.
 */
export function evaluateContest(
  participants: Participant[] = [],
  competitors: ESPNCompetitor[] = [],
  contestConfig?: ContestConfig | null,
  eventStatus?: ESPNEvent['status'] | null
): ContestEvaluationResult {
  const safeParticipants = Array.isArray(participants) ? participants : [];
  const safeCompetitors = Array.isArray(competitors) ? competitors : [];

  // 1. Build fast player drafted by map
  const playerDraftedByMap = createPlayerDraftedByMap(safeParticipants);

  // 2. Compute main participant standings & payouts
  const standings = calculateParticipantStandings(
    safeParticipants,
    safeCompetitors,
    contestConfig,
    eventStatus
  );

  // 3. Compute Day Money round results (R1-R4)
  const dayMoneyResults = calculateDayMoneyWinners(
    safeParticipants,
    safeCompetitors,
    contestConfig,
    eventStatus
  );

  // 4. Compute Greedy side bet standings
  const greedyParticipants = safeParticipants.filter((p) => p.isGreedyParticipant);
  const greedyStandings = calculateGreedyStandings(
    greedyParticipants,
    safeCompetitors,
    contestConfig?.coursePar
  );

  // 5. Compute Wager Settlement Summary
  const wagerLedger = calculateWagerSettlement(
    safeParticipants,
    standings,
    dayMoneyResults,
    greedyStandings,
    contestConfig
  );

  return {
    standings,
    dayMoneyResults,
    wagerLedger,
    playerDraftedByMap,
    greedyStandings,
  };
}
