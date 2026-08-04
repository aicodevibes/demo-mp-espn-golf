import { ESPNCompetitor } from '@/types/espn';
import { getPlayerStatusInfo } from '@/lib/espn';
import {
  Participant,
  ParticipantStanding,
  DraftedGolferStatus,
  DayMoneyRoundResult,
  DayMoneyWinner,
} from '@/types/contest';

const MAIN_PAYOUTS = [600, 320, 180, 100];
const DAY_MONEY_POOL = 75;

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
 * Calculates participant daily scores, total scores, cut status, and payouts
 */
export function calculateParticipantStandings(
  participants: Participant[],
  allCompetitors: ESPNCompetitor[],
  eventStatus?: any
): ParticipantStanding[] {
  const compMap = new Map<string, ESPNCompetitor>(
    allCompetitors.map((c) => [c.athlete?.id || c.id, c])
  );

  const standings: ParticipantStanding[] = participants.map((p) => {
    const golferDetails: DraftedGolferStatus[] = p.draftedPlayerIds.map((id) => {
      const comp = compMap.get(id);
      const name = comp?.athlete?.displayName || `Golfer (${id})`;
      const statusInfo = comp ? getPlayerStatusInfo(comp, eventStatus) : { isCut: false, isWD: false };
      const roundStrokes: { [rd: number]: number | null } = {};

      for (let rd = 1; rd <= 4; rd++) {
        roundStrokes[rd] = comp ? getGolferRoundStrokes(comp, rd) : null;
      }

      return {
        id,
        name,
        isCut: statusInfo.isCut,
        isWD: statusInfo.isWD,
        totalScoreToPar: comp?.score || 'E',
        roundStrokes,
      };
    });

    const activeGolfersCount = golferDetails.filter((g) => !g.isCut && !g.isWD).length;
    const isParticipantCut = activeGolfersCount === 0;

    const dailyScores: { [rd: number]: number | null } = {};
    let totalScore = 0;

    for (let rd = 1; rd <= 4; rd++) {
      const roundScores = golferDetails
        .map((g) => {
          const rawStrokes = g.roundStrokes[rd];
          if (rawStrokes === null || rawStrokes === undefined) return null;
          // Cut golfers on R3 & R4 get penalty 999
          if ((rd === 3 || rd === 4) && (g.isCut || g.isWD)) {
            return 999;
          }
          return rawStrokes;
        })
        .filter((s): s is number => s !== null);

      if (roundScores.length === 0) {
        dailyScores[rd] = null;
      } else {
        roundScores.sort((a, b) => a - b);
        // Best 2 scores
        const bestTwo = roundScores.slice(0, 2);
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
    if (standings[i].isCut || i >= 4) continue;
    
    // Find tied group range
    let tieCount = 1;
    let poolSum = MAIN_PAYOUTS[i] || 0;

    for (let j = i + 1; j < standings.length && j < 4; j++) {
      if (standings[j].totalScore === standings[i].totalScore && !standings[j].isCut) {
        tieCount++;
        poolSum += MAIN_PAYOUTS[j] || 0;
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
  eventStatus?: any
): DayMoneyRoundResult[] {
  const compMap = new Map<string, ESPNCompetitor>(
    allCompetitors.map((c) => [c.athlete?.id || c.id, c])
  );

  // Map each drafted golfer to their participant owner(s)
  const golferOwnerMap = new Map<string, Participant[]>();
  participants.forEach((p) => {
    p.draftedPlayerIds.forEach((gid) => {
      const existing = golferOwnerMap.get(gid) || [];
      golferOwnerMap.set(gid, [...existing, p]);
    });
  });

  const results: DayMoneyRoundResult[] = [];

  for (let rd = 1; rd <= 4; rd++) {
    let minScore: number | null = null;
    const golferMinScores: { golferId: string; golferName: string; score: number; owners: Participant[] }[] = [];

    golferOwnerMap.forEach((owners, golferId) => {
      const comp = compMap.get(golferId);
      if (!comp) return;
      const statusInfo = getPlayerStatusInfo(comp, eventStatus);
      // Cut/WD golfers ineligible on R3 & R4
      if ((rd === 3 || rd === 4) && (statusInfo.isCut || statusInfo.isWD)) return;

      const score = getGolferRoundStrokes(comp, rd);
      if (score === null || score === undefined) return;

      if (minScore === null || score < minScore) {
        minScore = score;
      }
    });

    const winners: DayMoneyWinner[] = [];

    if (minScore !== null) {
      golferOwnerMap.forEach((owners, golferId) => {
        const comp = compMap.get(golferId);
        if (!comp) return;
        const statusInfo = getPlayerStatusInfo(comp, eventStatus);
        if ((rd === 3 || rd === 4) && (statusInfo.isCut || statusInfo.isWD)) return;

        const score = getGolferRoundStrokes(comp, rd);
        if (score === minScore) {
          const golferName = comp.athlete?.displayName || `Golfer (${golferId})`;
          owners.forEach((owner) => {
            winners.push({
              participantId: owner.id,
              participantName: owner.name,
              golferId,
              golferName,
              dailyScore: minScore!,
              payout: 0, // Computed below after total winner count is known
            });
          });
        }
      });

      if (winners.length > 0) {
        const splitPayout = Math.round((DAY_MONEY_POOL / winners.length) * 100) / 100;
        winners.forEach((w) => (w.payout = splitPayout));
      }
    }

    results.push({
      round: rd,
      lowScore: minScore,
      winners,
      totalPool: DAY_MONEY_POOL,
    });
  }

  return results;
}
