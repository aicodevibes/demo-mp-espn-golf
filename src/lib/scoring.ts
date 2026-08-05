import { ESPNCompetitor } from '@/types/espn';
import { getPlayerStatusInfo } from '@/lib/espn';
import {
  Participant,
  ParticipantStanding,
  DraftedGolferStatus,
  DayMoneyRoundResult,
  DayMoneyWinner,
  ContestConfig,
} from '@/types/contest';

const DEFAULT_MAIN_PAYOUTS = [600, 320, 180, 100];
const DEFAULT_DAY_MONEY_POOL = 75;

/**
 * Creates a Map of playerId -> participant names who drafted that golfer
 */
export function createPlayerDraftedByMap(participants: Participant[] = []): Map<string, string[]> {
  const map = new Map<string, string[]>();
  participants.forEach((p) => {
    p.draftedPlayerIds?.forEach((pid) => {
      const existing = map.get(pid) || [];
      existing.push(p.name);
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
 */
export function getGolferRoundScoreToPar(
  comp: ESPNCompetitor,
  round: number,
  coursePar?: number | null
): number | null {
  const strokes = getGolferRoundStrokes(comp, round);
  if (strokes === null) return null;

  // If strokes is already a relative score (e.g. -5, +3, 0 when strokes < 40)
  if (Math.abs(strokes) <= 20) {
    return strokes;
  }

  // If explicit course par is provided
  if (coursePar && coursePar > 50) {
    return strokes - coursePar;
  }

  // Check if linescore displayValue is a relative score string like "-2", "+3", "E"
  const ls = comp.linescores?.find((l) => l.period === round);
  if (ls?.displayValue) {
    const dv = ls.displayValue.trim();
    if (dv === 'E') return 0;
    if (dv.startsWith('+') || dv.startsWith('-')) {
      const parsed = parseInt(dv.replace('+', ''), 10);
      if (!isNaN(parsed) && Math.abs(parsed) <= 25) return parsed;
    }
  }

  // Derive course par dynamically from cumulative score-to-par (comp.score) and completed linescores
  if (comp.score && comp.linescores && comp.linescores.length > 0) {
    const rawToPar = comp.score.trim();
    const toPar = rawToPar === 'E' ? 0 : parseInt(rawToPar.replace('+', ''), 10);
    if (!isNaN(toPar)) {
      const completed = comp.linescores.filter((l) => typeof l.value === 'number' && l.value > 40);
      if (completed.length > 0) {
        const totalStrokes = completed.reduce((sum, l) => sum + l.value, 0);
        const inferredPar = Math.round((totalStrokes - toPar) / completed.length);
        if (inferredPar > 50) {
          return strokes - inferredPar;
        }
      }
    }
  }

  // Default fallback if par cannot be inferred (assume 72 as standard PGA par)
  return strokes - 72;
}

/**
 * Calculates participant daily scores, total scores, cut status, and payouts
 */
export function calculateParticipantStandings(
  participants: Participant[],
  allCompetitors: ESPNCompetitor[],
  contestConfig?: ContestConfig | null,
  eventStatus?: any
): ParticipantStanding[] {
  const mainPayouts = contestConfig?.mainPayouts || DEFAULT_MAIN_PAYOUTS;
  const coursePar = contestConfig?.coursePar ?? null;

  const compMap = new Map<string, ESPNCompetitor>(
    allCompetitors.map((c) => [c.athlete?.id || c.id, c])
  );

  const standings: ParticipantStanding[] = participants.map((p) => {
    const golferDetails: DraftedGolferStatus[] = p.draftedPlayerIds.map((id) => {
      const comp = compMap.get(id);
      const name = comp?.athlete?.displayName || `Golfer (${id})`;
      const statusInfo = comp ? getPlayerStatusInfo(comp, eventStatus) : { isCut: false, isWD: false };
      const roundStrokes: { [rd: number]: number | null } = {};
      const roundScoresToPar: { [rd: number]: number | null } = {};

      // Collect round strokes & compute score-to-par
      for (let rd = 1; rd <= 4; rd++) {
        roundStrokes[rd] = comp ? getGolferRoundStrokes(comp, rd) : null;
      }

      const displayParts: string[] = [];
      for (let rd = 1; rd <= 4; rd++) {
        const isCutRound = rd >= 3 && (statusInfo.isCut || statusInfo.isWD);
        if (isCutRound) {
          roundScoresToPar[rd] = null;
          displayParts.push('C');
        } else {
          const rel = comp ? getGolferRoundScoreToPar(comp, rd, coursePar) : null;
          roundScoresToPar[rd] = rel;
          if (rel === null) {
            displayParts.push('-');
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
        totalScoreToPar: comp?.score || 'E',
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
  eventStatus?: any
): DayMoneyRoundResult[] {
  const dayMoneyPool = contestConfig?.dayMoneyPool ?? DEFAULT_DAY_MONEY_POOL;

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

    golferOwnerMap.forEach((owners, golferId) => {
      const comp = compMap.get(golferId);
      if (!comp) return;
      const statusInfo = getPlayerStatusInfo(comp, eventStatus);
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
              payout: 0,
            });
          });
        }
      });

      if (winners.length > 0) {
        const splitPayout = Math.round((dayMoneyPool / winners.length) * 100) / 100;
        winners.forEach((w) => (w.payout = splitPayout));
      }
    }

    results.push({
      round: rd,
      lowScore: minScore,
      winners,
      totalPool: dayMoneyPool,
    });
  }

  return results;
}

