import { ESPNCompetitor, ESPNEventStatus } from '@/types/espn';
import { getPlayerStatusInfo, formatScoreDisplay, evaluateGolferRoundScore, isRoundCompleted, getGolferCumulativeScoreToPar, DEFAULT_PLAYER_DIRECTORY_MAP } from './espn/eventHelpers';
import {
  Participant,
  ParticipantStanding,
  DraftedGolferStatus,
  DayMoneyRoundResult,
  DayMoneyWinner,
  ContestConfig,
  GreedyStanding,
  ParticipantSettlement,
  WagerSettlementSummary,
} from '@/types/contest';
import { calculateWagerSettlement as calculateWagerSettlementFromSettlement } from '@/lib/settlement';

const DEFAULT_MAIN_PAYOUTS = [600, 320, 180, 100];
const DEFAULT_DAY_MONEY_POOL = 75;

/**
 * Creates a Map of playerId -> participant names who drafted that golfer
 */
export function createPlayerDraftedByMap(participants: Participant[] = []): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const safeParticipants = Array.isArray(participants) ? participants : [];
  safeParticipants.forEach((p) => {
    if (!p) return;
    p.draftedPlayerIds?.forEach((pid) => {
      if (!pid) return;
      const existing = map.get(pid) || [];
      existing.push(p.name || 'Participant');
      map.set(pid, existing);
    });
  });
  return map;
}

/**
 * Helper to extract round strokes from ESPN competitor linescores
 */
export function getGolferRoundStrokes(comp: ESPNCompetitor, round: number): number | null {
  if (!comp || !comp.linescores) return null;
  const ls = comp.linescores.find((l) => l.period === round);
  if (!ls || typeof ls.value !== 'number') return null;
  return ls.value;
}

/**
 * Helper to calculate score-to-par for a specific round dynamically
 * Delegates directly to the deep module seam at @/lib/espn.
 */
export function getGolferRoundScoreToPar(
  comp: ESPNCompetitor,
  round: number,
  coursePar?: number | null
): number | null {
  return evaluateGolferRoundScore(comp, round, coursePar).scoreToPar;
}


/**
 * Calculates participant daily scores, total scores, cut status, and payouts
 */
export function calculateParticipantStandings(
  participants: Participant[],
  allCompetitors: ESPNCompetitor[],
  contestConfig?: ContestConfig | null,
  eventStatus?: ESPNEventStatus | null,
  playerDirectoryMap?: Record<string, { id: string; name: string; headshotUrl?: string }>
): ParticipantStanding[] {
  const mainPayouts = contestConfig?.mainPayouts || DEFAULT_MAIN_PAYOUTS;
  const coursePar = contestConfig?.coursePar ?? null;

  const compMap = new Map<string, ESPNCompetitor>(
    allCompetitors.map((c) => [c.athlete?.id || c.id, c])
  );

  const standings: ParticipantStanding[] = participants.map((p) => {
    const golferDetails: DraftedGolferStatus[] = p.draftedPlayerIds.map((id, index) => {
      const isFourthGolfer = index === 3;
      const comp = compMap.get(id);
      const directoryPlayer = playerDirectoryMap?.[id] || DEFAULT_PLAYER_DIRECTORY_MAP[id];
      const name = comp?.athlete?.displayName || directoryPlayer?.name || `Golfer (${id})`;
      const statusInfo = comp ? getPlayerStatusInfo(comp, eventStatus) : { isCut: false, isWD: false };
      const roundStrokes: { [rd: number]: number | null } = {};
      const roundScoresToPar: { [rd: number]: number | null } = {};

      // Collect round strokes & compute score-to-par
      for (let rd = 1; rd <= 4; rd++) {
        roundStrokes[rd] = comp ? getGolferRoundStrokes(comp, rd) : null;
      }

      const displayParts: string[] = [];
      for (let rd = 1; rd <= 4; rd++) {
        const strokes = comp ? getGolferRoundStrokes(comp, rd) : null;
        const isCutOrWD = statusInfo.isCut || statusInfo.isWD;
        
        // 4th golfer (index 3) is strictly excluded for R1 and R2
        if (isFourthGolfer && (rd === 1 || rd === 2)) {
          roundScoresToPar[rd] = null;
          displayParts.push('-');
          continue;
        }

        // For rounds 3 and 4, if a player is CUT or WD, they must be marked as C or WD and have null roundScoresToPar
        const isPostCutRound = rd >= 3 && isCutOrWD;
        
        if (isPostCutRound || (isCutOrWD && strokes === null)) {
          roundScoresToPar[rd] = null;
          displayParts.push(statusInfo.isWD ? 'WD' : 'C');
        } else {
          const rel = comp ? getGolferRoundScoreToPar(comp, rd, coursePar) : null;
          roundScoresToPar[rd] = rel;
          if (rel === null) {
            displayParts.push(isCutOrWD ? (statusInfo.isWD ? 'WD' : 'C') : '-');
          } else {
            displayParts.push(rel === 0 ? 'E' : rel > 0 ? `+${rel}` : `${rel}`);
          }
        }
      }

      const roundScoreDisplayStr = displayParts.join('/');

      return {
        id,
        name,
        isCut: statusInfo.isCut,
        isWD: statusInfo.isWD,
        totalScoreToPar: comp ? formatScoreDisplay(comp.score, eventStatus) : '-',

        roundStrokes,
        roundScoresToPar,
        roundScoreDisplayStr,
      };
    });

    const activeGolfersCount = golferDetails.filter((g) => !g.isCut && !g.isWD).length;
    const isParticipantCut = activeGolfersCount === 0;

    const dailyScores: { [rd: number]: number | null } = {};
    let totalScore = 0;

    for (let rd = 1; rd <= 4; rd++) {
      const roundScoresToPar = golferDetails
        .map((g) => g.roundScoresToPar[rd])
        .filter((s): s is number => s !== null && s !== undefined);

      if (roundScoresToPar.length === 0) {
        dailyScores[rd] = null;
      } else {
        roundScoresToPar.sort((a, b) => a - b);
        // Best 2 scores to par
        const bestTwo = roundScoresToPar.slice(0, 2);
        const daySum = bestTwo.reduce((sum, val) => sum + val, 0);
        dailyScores[rd] = daySum;
        totalScore += daySum;
      }
    }

    return {
      rank: 0,
      participant: p,
      dailyScores,
      totalScore,
      isCut: isParticipantCut,
      projectedPayout: 0,
      draftedGolferDetails: golferDetails,
    };
  });

  // Sort standings: Active participants first (by totalScore ascending), Cut participants last
  standings.sort((a, b) => {
    if (a.isCut && !b.isCut) return 1;
    if (!a.isCut && b.isCut) return -1;
    return a.totalScore - b.totalScore;
  });

  // Compute Ranks and Payout Allocations
  let currentRank = 1;
  for (let i = 0; i < standings.length; i++) {
    if (i > 0 && standings[i].totalScore !== standings[i - 1].totalScore && !standings[i].isCut) {
      currentRank = i + 1;
    }
    standings[i].rank = standings[i].isCut ? standings.length : currentRank;
  }

  // Calculate Top 4 Prize Pools with Tie Splitting
  for (let i = 0; i < standings.length; i++) {
    if (standings[i].isCut || i >= mainPayouts.length) continue;

    let tieCount = 1;
    let poolSum = mainPayouts[i] || 0;

    for (let j = i + 1; j < standings.length && j < mainPayouts.length; j++) {
      if (standings[j].totalScore === standings[i].totalScore && !standings[j].isCut) {
        tieCount++;
        poolSum += mainPayouts[j] || 0;
      } else {
        break;
      }
    }

    const splitPayout = Math.round((poolSum / tieCount) * 100) / 100;
    for (let k = i; k < i + tieCount && k < standings.length; k++) {
      standings[k].projectedPayout = splitPayout;
    }
    i += tieCount - 1;
  }

  return standings;
}

/**
 * Calculates Day Money Winners for Days 1 through 4
 */
export function calculateDayMoneyWinners(
  participants: Participant[],
  allCompetitors: ESPNCompetitor[],
  contestConfig?: ContestConfig | null,
  eventStatus?: ESPNEventStatus | null
): DayMoneyRoundResult[] {
  const dayMoneyPool = contestConfig?.dayMoneyPool ?? DEFAULT_DAY_MONEY_POOL;

  const compMap = new Map<string, ESPNCompetitor>(
    allCompetitors.map((c) => [c.athlete?.id || c.id, c])
  );

  const golferOwnerMap = new Map<string, { owner: Participant; isFourthGolfer: boolean }[]>();
  participants.forEach((p) => {
    p.draftedPlayerIds.forEach((gid, index) => {
      const isFourthGolfer = index === 3;
      const existing = golferOwnerMap.get(gid) || [];
      golferOwnerMap.set(gid, [...existing, { owner: p, isFourthGolfer }]);
    });
  });

  const results: DayMoneyRoundResult[] = [];

  for (let rd = 1; rd <= 4; rd++) {
    interface Candidate {
      owner: Participant;
      golferId: string;
      golferName: string;
      scoreToPar: number;
      roundStrokes: number | null;
      formattedScore: string;
      thruNum: number;
      isCompleted: boolean;
    }

    const candidates: Candidate[] = [];

    golferOwnerMap.forEach((entries, golferId) => {
      const comp = compMap.get(golferId);
      if (!comp) return;

      const statusInfo = getPlayerStatusInfo(comp, eventStatus);
      if ((rd === 3 || rd === 4) && (statusInfo.isCut || statusInfo.isWD)) return;

      const roundScoreRes = evaluateGolferRoundScore(comp, rd, contestConfig?.coursePar);
      if (roundScoreRes.scoreToPar === null) return;

      const ls = comp.linescores?.find((l) => l.period === rd);
      const isRoundDone = isRoundCompleted(comp, rd, eventStatus);
      const thru = comp.status?.thru;

      let thruNum = 0;
      if (isRoundDone || thru === 18 || comp.status?.type?.completed) {
        thruNum = 18;
      } else if (typeof thru === 'number' && thru > 0) {
        thruNum = thru;
      } else if (ls && typeof ls.value === 'number' && ls.value >= 40) {
        thruNum = 18;
      }

      if (thruNum === 0 && !isRoundDone && (!ls || !ls.value)) return;

      const golferName = comp.athlete?.displayName || `Golfer (${golferId})`;

      entries.forEach(({ owner, isFourthGolfer }) => {
        if (isFourthGolfer && (rd === 1 || rd === 2)) return;

        candidates.push({
          owner,
          golferId,
          golferName,
          scoreToPar: roundScoreRes.scoreToPar!,
          roundStrokes: roundScoreRes.roundStrokes,
          formattedScore: roundScoreRes.formattedScore,
          thruNum,
          isCompleted: isRoundDone,
        });
      });
    });

    if (candidates.length === 0) {
      results.push({
        round: rd,
        lowScore: null,
        winners: [],
        totalPool: dayMoneyPool,
        isCompleted: false,
      });
      continue;
    }

    // Find lowest relative score to par for round rd (e.g. -5 < -2 < E < +1)
    const minScoreToPar = Math.min(...candidates.map((c) => c.scoreToPar));
    const leaders = candidates.filter((c) => c.scoreToPar === minScoreToPar);

    // Tie-breaker sort: most finished holes first (thruNum descending: 18 / F > 15 > 2)
    leaders.sort((a, b) => b.thruNum - a.thruNum);

    // Round is completed if all leaders (and active event) have completed round rd
    const isRoundDone = leaders.every((l) => l.isCompleted || l.thruNum === 18) &&
      (eventStatus?.type?.state === 'post' || (eventStatus?.period && eventStatus.period > rd) || leaders.every((l) => l.isCompleted));

    const splitPayout = Math.round((dayMoneyPool / leaders.length) * 100) / 100;

    const lowScoreDisplay = isRoundDone && leaders[0]?.roundStrokes
      ? leaders[0].roundStrokes
      : leaders[0]?.formattedScore || 'E';

    const winners: DayMoneyWinner[] = leaders.map((l) => ({
      participantId: l.owner.id,
      participantName: l.owner.name,
      golferId: l.golferId,
      golferName: l.golferName,
      dailyScore: l.roundStrokes && l.thruNum === 18 ? l.roundStrokes : l.formattedScore,
      payout: isRoundDone ? splitPayout : 0,
      thru: l.thruNum === 18 ? 'F' : l.thruNum > 0 ? `${l.thruNum}` : '-',
      isCompleted: l.isCompleted,
    }));

    results.push({
      round: rd,
      lowScore: lowScoreDisplay,
      winners,
      totalPool: dayMoneyPool,
      isCompleted: isRoundDone,
    });
  }

  return results;
}

/**
 * Calculates Greedy Side-Bet Standings.
 * Tracks performance of each participant's designated Greedy Golfer independently of main contest cut status.
 */
export function calculateGreedyStandings(
  greedyParticipants: Participant[],
  allCompetitors: ESPNCompetitor[],
  coursePar?: number | null,
  playerDirectoryMap?: Record<string, { id: string; name: string; headshotUrl?: string }>,
  eventStatus?: any
): GreedyStanding[] {
  const compMap = new Map<string, ESPNCompetitor>(
    allCompetitors.map((c) => [c.athlete?.id || c.id, c])
  );

  const standings: GreedyStanding[] = greedyParticipants.map((p) => {
    const comp = p.greedyPlayerId ? compMap.get(p.greedyPlayerId) : null;
    const directoryPlayer = p.greedyPlayerId ? (playerDirectoryMap?.[p.greedyPlayerId] || DEFAULT_PLAYER_DIRECTORY_MAP[p.greedyPlayerId]) : null;
    const name = comp?.athlete?.displayName || directoryPlayer?.name || (p.greedyPlayerId ? `Golfer (${p.greedyPlayerId})` : 'Unassigned');
    const statusInfo = comp ? getPlayerStatusInfo(comp, eventStatus) : { isCut: false, isWD: false };

    const roundStrokes: { [rd: number]: number | null } = {};
    const roundScoresToPar: { [rd: number]: number | null } = {};

    for (let rd = 1; rd <= 4; rd++) {
      roundStrokes[rd] = comp ? getGolferRoundStrokes(comp, rd) : null;
      roundScoresToPar[rd] = comp ? getGolferRoundScoreToPar(comp, rd, coursePar) : null;
    }

    let numericScoreToPar = 0;
    let rawScoreStr = 'E';
    if (comp) {
      const cum = getGolferCumulativeScoreToPar(comp, eventStatus);
      rawScoreStr = cum.formattedScore;
      if (rawScoreStr === 'E' || rawScoreStr === 'EVEN' || rawScoreStr === '-') {
        numericScoreToPar = 0;
      } else if (rawScoreStr.startsWith('+') || rawScoreStr.startsWith('-')) {
        const parsed = parseInt(rawScoreStr.replace('+', ''), 10);
        numericScoreToPar = isNaN(parsed) ? 0 : parsed;
      } else if (rawScoreStr === 'CUT' || rawScoreStr === 'WD' || rawScoreStr === 'DQ') {
        numericScoreToPar = 999;
      }
    }

    return {
      rank: 0,
      participant: p,
      greedyGolfer: p.greedyPlayerId
        ? {
            id: p.greedyPlayerId,
            name,
            scoreToPar: rawScoreStr,
            numericScoreToPar,
            roundStrokes,
            roundScoresToPar,
            isCut: statusInfo.isCut,
            isWD: statusInfo.isWD,
          }
        : null,
      numericScoreToPar,
    };
  });

  // Sort greedy standings by score-to-par ascending (lower score is better)
  standings.sort((a, b) => a.numericScoreToPar - b.numericScoreToPar);

  // Assign ranks
  let currentRank = 1;
  for (let i = 0; i < standings.length; i++) {
    if (i > 0 && standings[i].numericScoreToPar !== standings[i - 1].numericScoreToPar) {
      currentRank = i + 1;
    }
    standings[i].rank = currentRank;
  }

  return standings;
}

/**
 * Calculates Wager Settlement Ledger & Pot Summaries by delegating to the settlement deep module seam.
 */
export function calculateWagerSettlement(
  participants: Participant[] = [],
  allCompetitors: ESPNCompetitor[] = [],
  contestConfig?: ContestConfig | null,
  eventStatus?: ESPNEventStatus | null
): WagerSettlementSummary {
  const standings = calculateParticipantStandings(participants, allCompetitors, contestConfig, eventStatus);
  const dayMoneyResults = calculateDayMoneyWinners(participants, allCompetitors, contestConfig, eventStatus);
  const greedyParticipants = (participants || []).filter((p) => p.isGreedyParticipant);
  const greedyStandings = calculateGreedyStandings(
    greedyParticipants,
    allCompetitors,
    contestConfig?.coursePar
  );

  return calculateWagerSettlementFromSettlement(
    participants,
    standings,
    dayMoneyResults,
    greedyStandings,
    contestConfig
  );
}




