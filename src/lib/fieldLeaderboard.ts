import { ESPNCompetitor } from '@/types/espn';
import { Participant } from '@/types/contest';
import { getPlayerStatusInfo } from '@/lib/espn';
import { createPlayerDraftedByMap } from '@/lib/scoring';

export interface FieldLeaderboardEvaluation {
  top10Competitors: ESPNCompetitor[];
  otherDraftedCompetitors: ESPNCompetitor[];
  activeFieldCompetitors: ESPNCompetitor[];
  cutFieldCompetitors: ESPNCompetitor[];
  playerDraftedByMap: Map<string, string[]>;
  rankDisplayMap: Map<string, string>;
}

export interface FieldLeaderboardOptions {
  competitors: ESPNCompetitor[];
  participants: Participant[];
  eventStatus?: any;
  searchQuery?: string;
}

/**
 * Parses numeric position from ESPN competitor (e.g., 10 for "10" or "T10").
 */
export function parsePositionNumber(comp: ESPNCompetitor, defaultRank: number = 999): number {
  if (!comp) return defaultRank;

  if (typeof comp.order === 'number' && comp.order > 0) return comp.order;

  const rawPos = comp.status?.position?.id || comp.status?.position?.displayName;
  if (typeof rawPos === 'number') return rawPos;
  if (typeof rawPos === 'string') {
    const cleaned = rawPos.replace(/[^\d]/g, '');
    const parsed = parseInt(cleaned, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }

  return defaultRank;
}

/**
 * Parses numeric score to par from ESPN competitor score.
 */
export function parseCompetitorScoreToPar(comp: ESPNCompetitor): number {
  if (!comp || comp.score === null || comp.score === undefined) return 0;

  const scoreStr = typeof comp.score === 'object'
    ? String(comp.score.displayValue || comp.score.value || 'E')
    : String(comp.score);

  const trimmed = scoreStr.trim();
  if (trimmed === '' || trimmed === 'E' || trimmed === 'EVEN' || trimmed === '0') {
    return 0;
  }

  if (trimmed.startsWith('+') || trimmed.startsWith('-')) {
    const parsed = parseInt(trimmed.replace('+', ''), 10);
    if (!isNaN(parsed)) return parsed;
  }

  const parsedDirect = parseInt(trimmed, 10);
  if (!isNaN(parsedDirect)) return parsedDirect;

  return 0;
}

/**
 * Canonical sorting function for tournament competitors:
 * 1. Active competitors first, sorted strictly by score-to-par ascending (e.g. -5, -2, -1, E, +1, +2).
 * 2. Cut / Withdrawn / Disqualified competitors last.
 */
export function sortCompetitorsByLeaderboard(
  competitors: ESPNCompetitor[],
  eventStatus?: any
): ESPNCompetitor[] {
  const safe = Array.isArray(competitors) ? [...competitors] : [];

  return safe.sort((a, b) => {
    const statusA = getPlayerStatusInfo(a, eventStatus);
    const statusB = getPlayerStatusInfo(b, eventStatus);

    // Inactive (Cut/WD/DQ) go to bottom
    if (statusA.isInactive && !statusB.isInactive) return 1;
    if (!statusA.isInactive && statusB.isInactive) return -1;

    // Primary: Compare numeric score to par (lower is better: -5 < -2 < -1 < 0 < +1 < +2)
    const scoreA = parseCompetitorScoreToPar(a);
    const scoreB = parseCompetitorScoreToPar(b);
    if (scoreA !== scoreB) {
      return scoreA - scoreB;
    }

    // Secondary: Compare parsed position numbers
    const posA = parsePositionNumber(a);
    const posB = parsePositionNumber(b);
    if (posA !== posB) {
      return posA - posB;
    }

    // Tertiary: Compare ESPN order if available
    if (typeof a.order === 'number' && typeof b.order === 'number' && a.order !== b.order) {
      return a.order - b.order;
    }

    return (a.athlete?.displayName || '').localeCompare(b.athlete?.displayName || '');
  });
}

/**
 * Calculates dynamic leaderboard rank display (e.g. "1", "T2", "T94") for a sorted array of active competitors.
 */
export function computeLeaderboardRankDisplays(competitors: ESPNCompetitor[]): Map<string, string> {
  const map = new Map<string, string>();
  let i = 0;
  while (i < competitors.length) {
    const score = parseCompetitorScoreToPar(competitors[i]);
    let j = i;
    while (j < competitors.length && parseCompetitorScoreToPar(competitors[j]) === score) {
      j++;
    }
    const tieCount = j - i;
    const rankStr = tieCount > 1 ? `T${i + 1}` : `${i + 1}`;

    for (let k = i; k < j; k++) {
      const pid = competitors[k].athlete?.id || competitors[k].id;
      if (pid) map.set(pid, rankStr);
    }
    i = j;
  }
  return map;
}

/**
 * Pure domain seam that processes tournament field competitors, calculates Top 10 leaders
 * (including position ties), excludes Top 10 from other drafted pool golfers, and partitions
 * full field search results into active vs cut competitors in a single pass.
 */
export function evaluateFieldLeaderboard({
  competitors = [],
  participants = [],
  eventStatus,
  searchQuery = '',
}: FieldLeaderboardOptions): FieldLeaderboardEvaluation {
  // Sort competitors strictly by leaderboard position & active status
  const sortedCompetitors = sortCompetitorsByLeaderboard(competitors, eventStatus);
  const playerDraftedByMap = createPlayerDraftedByMap(participants);

  // Separate active vs cut competitors from sorted array
  const activeCompetitors = sortedCompetitors.filter((c) => !getPlayerStatusInfo(c, eventStatus).isInactive);
  const cutCompetitors = sortedCompetitors.filter((c) => getPlayerStatusInfo(c, eventStatus).isInactive);

  // 1. Calculate Top 10 (including ties) from active competitors
  const top10Competitors: ESPNCompetitor[] = [];
  const top10IdsSet = new Set<string>();

  if (activeCompetitors.length > 0) {
    const limit = Math.min(10, activeCompetitors.length);
    const tenthComp = activeCompetitors[limit - 1];
    const tenthScore = parseCompetitorScoreToPar(tenthComp);

    activeCompetitors.forEach((comp, idx) => {
      if (!comp) return;
      const pid = comp.athlete?.id || comp.id;
      const score = parseCompetitorScoreToPar(comp);

      const isInsideFirst10 = idx < 10;
      const isTiedWithTenth = score === tenthScore;

      if (isInsideFirst10 || isTiedWithTenth) {
        top10Competitors.push(comp);
        if (pid) top10IdsSet.add(pid);
      }
    });
  }

  // 2. Calculate set of all drafted player IDs
  const allDraftedPlayerIdsSet = new Set<string>();
  participants.forEach((p) => {
    p.draftedPlayerIds?.forEach((pid) => allDraftedPlayerIdsSet.add(pid));
  });

  // 3. Filter other drafted competitors (drafted, but outside top 10)
  const otherDraftedCompetitors = sortedCompetitors.filter((comp) => {
    if (!comp) return false;
    const pid = comp.athlete?.id || comp.id;
    return pid && allDraftedPlayerIdsSet.has(pid) && !top10IdsSet.has(pid);
  });

  // 4. Filter Full Field with search query and active/cut partition
  const q = searchQuery.toLowerCase().trim();

  const activeFieldCompetitors = q
    ? activeCompetitors.filter((c) => c?.athlete?.displayName?.toLowerCase().includes(q))
    : activeCompetitors;

  const cutFieldCompetitors = q
    ? cutCompetitors.filter((c) => c?.athlete?.displayName?.toLowerCase().includes(q))
    : cutCompetitors;

  const rankDisplayMap = computeLeaderboardRankDisplays(activeCompetitors);

  return {
    top10Competitors,
    otherDraftedCompetitors,
    activeFieldCompetitors,
    cutFieldCompetitors,
    playerDraftedByMap,
    rankDisplayMap,
  };
}
