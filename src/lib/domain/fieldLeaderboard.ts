import { ESPNCompetitor, ESPNEventStatus } from '@/types/espn';
import { Participant } from '@/types/contest';
import { NormalizedTournament, NormalizedCompetitor, normalizeCompetitor } from '@/lib/espn';
import { createPlayerDraftedByMap } from '@/lib/scoring';
import { getGolferProfile, GolferProfile, GolferDirectoryOptions } from './golferDirectory';

export interface EnrichedCompetitor extends NormalizedCompetitor {
  profile: GolferProfile;
  formattedRank: string;
  parsedScoreToPar: number;
  isInactive: boolean;
}

export interface FieldLeaderboardEvaluation {
  top10Leaders: EnrichedCompetitor[];
  draftedGolfers: EnrichedCompetitor[];
  activeField: EnrichedCompetitor[];
  cutField: EnrichedCompetitor[];
  projectedCutIndex: number;
  playerDraftedByMap: Map<string, string[]>;
  rankDisplayMap: Map<string, string>;

  // Backward-compatibility aliases during transition
  top10Competitors: EnrichedCompetitor[];
  otherDrafted: EnrichedCompetitor[];
  otherDraftedCompetitors: EnrichedCompetitor[];
  activeFieldCompetitors: EnrichedCompetitor[];
  cutFieldCompetitors: EnrichedCompetitor[];
}

export interface FieldLeaderboardOptions extends GolferDirectoryOptions {
  competitors?: ESPNCompetitor[] | NormalizedCompetitor[];
  participants?: Participant[];
  eventStatus?: ESPNEventStatus | null | unknown;
  searchQuery?: string;
  tournament?: NormalizedTournament | null;
}

/**
 * Parses numeric position from ESPN competitor (e.g., 10 for "10" or "T10").
 */
export function parsePositionNumber(comp: ESPNCompetitor | null | undefined, defaultRank: number = 999): number {
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
export function parseCompetitorScoreToPar(comp: ESPNCompetitor | null | undefined): number {
  if (!comp) return 0;
  if ('scoreToPar' in comp && typeof (comp as NormalizedCompetitor).scoreToPar === 'number') {
    return (comp as NormalizedCompetitor).scoreToPar ?? 0;
  }
  const str = typeof comp.score === 'string' ? comp.score.trim() : '';
  if (str === 'CUT' || str === 'WD' || str === 'DQ' || str === '-') {
    return 999;
  }
  if (str === 'E' || str === 'EVEN' || str === '0') {
    return 0;
  }
  if (str.startsWith('+') || str.startsWith('-')) {
    const parsed = parseInt(str.replace('+', ''), 10);
    if (!isNaN(parsed)) return parsed;
  }
  const parsedDirect = parseInt(str, 10);
  if (!isNaN(parsedDirect)) return parsedDirect;

  const norm = normalizeCompetitor(comp);
  return norm.scoreToPar ?? 0;
}

/**
 * Canonical sorting function for tournament competitors:
 * 1. Active competitors first, sorted strictly by score-to-par ascending (e.g. -5, -2, -1, E, +1, +2).
 * 2. Cut / Withdrawn / Disqualified competitors last.
 */
export function sortCompetitorsByLeaderboard(
  competitors: (ESPNCompetitor | NormalizedCompetitor)[],
  eventStatus?: any
): (ESPNCompetitor | NormalizedCompetitor)[] {
  const safe = Array.isArray(competitors) ? [...competitors] : [];

  return safe.sort((a, b) => {
    const normA = 'statusInfo' in a ? (a as NormalizedCompetitor) : normalizeCompetitor(a, eventStatus);
    const normB = 'statusInfo' in b ? (b as NormalizedCompetitor) : normalizeCompetitor(b, eventStatus);

    const isInactiveA = normA.statusInfo.isInactive;
    const isInactiveB = normB.statusInfo.isInactive;

    // Inactive (Cut/WD/DQ) go to bottom
    if (isInactiveA && !isInactiveB) return 1;
    if (!isInactiveA && isInactiveB) return -1;

    // Primary: Compare numeric score to par (lower is better: -5 < -2 < -1 < 0 < +1 < +2)
    const scoreA = normA.scoreToPar ?? parseCompetitorScoreToPar(a);
    const scoreB = normB.scoreToPar ?? parseCompetitorScoreToPar(b);
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
export function computeLeaderboardRankDisplays(competitors: (ESPNCompetitor | NormalizedCompetitor)[]): Map<string, string> {
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
 * Core Pure Domain Evaluator: Sorts, categorizes, formats ranks, and enriches PGA tournament competitors
 * with GolferProfiles and draftedBy participant ownerships in a single pass.
 */
export function evaluateFieldLeaderboard(
  input: (ESPNCompetitor | NormalizedCompetitor)[] | FieldLeaderboardOptions,
  secondaryOptions: FieldLeaderboardOptions = {}
): FieldLeaderboardEvaluation {
  let competitors: (ESPNCompetitor | NormalizedCompetitor)[] = [];
  let options: FieldLeaderboardOptions = {};

  if (Array.isArray(input)) {
    competitors = input;
    options = secondaryOptions;
  } else if (input && typeof input === 'object') {
    options = input;
    if (options.tournament) {
      competitors = options.tournament.competitors || [];
    } else {
      competitors = options.competitors || [];
    }
  }

  const { participants = [], eventStatus, searchQuery, playerDirectoryMap } = options;
  const statusObj = (eventStatus && typeof eventStatus === 'object') ? (eventStatus as ESPNEventStatus) : undefined;

  // Canonical sorting
  const sorted = sortCompetitorsByLeaderboard(competitors, statusObj);

  // Participant draft map
  const playerDraftedByMap = createPlayerDraftedByMap(participants);

  // Set of all drafted player IDs
  const allDraftedPlayerIdsSet = new Set<string>();
  participants.forEach((p) => {
    p.draftedPlayerIds?.forEach((pid) => allDraftedPlayerIdsSet.add(pid));
  });

  // Dynamic ranks for active competitors
  const activeUnfiltered = sorted.filter((c) => {
    const norm = 'statusInfo' in c ? (c as NormalizedCompetitor) : normalizeCompetitor(c, statusObj);
    return !norm.statusInfo.isInactive;
  });
  const rankDisplayMap = computeLeaderboardRankDisplays(activeUnfiltered);

  // Enrich competitors in single pass
  const enriched: EnrichedCompetitor[] = sorted.map((comp) => {
    const athleteId = comp.athlete?.id || comp.id || '';
    const norm = 'statusInfo' in comp ? (comp as NormalizedCompetitor) : normalizeCompetitor(comp, statusObj);
    const statusInfo = norm.statusInfo;
    const scoreToPar = parseCompetitorScoreToPar(comp);
    const posNum = parsePositionNumber(comp);
    const dynamicRank = rankDisplayMap.get(athleteId);

    let formattedRank = '-';
    if (statusInfo.isCut) formattedRank = 'CUT';
    else if (statusInfo.isWD) formattedRank = 'WD';
    else if (statusInfo.isDQ) formattedRank = 'DQ';
    else if (dynamicRank) {
      formattedRank = dynamicRank;
    } else if (typeof comp.status?.position?.displayName === 'string' && comp.status.position.displayName && comp.status.position.displayName !== 'E') {
      formattedRank = comp.status.position.displayName;
    } else if (posNum < 999) {
      formattedRank = `${posNum}`;
    }

    const profile = getGolferProfile(athleteId, {
      competitors,
      participants,
      playerDirectoryMap,
    });

    return {
      ...norm,
      profile,
      formattedRank,
      parsedScoreToPar: scoreToPar,
      isInactive: statusInfo.isInactive,
    };
  });

  // Calculate Top 10 (including ties) from active competitors
  const top10Leaders: EnrichedCompetitor[] = [];
  const top10IdsSet = new Set<string>();

  const activeEnriched = enriched.filter((c) => !c.isInactive);
  const cutEnriched = enriched.filter((c) => c.isInactive);

  if (activeEnriched.length > 0) {
    const limit = Math.min(10, activeEnriched.length);
    const tenthComp = activeEnriched[limit - 1];
    const tenthScore = tenthComp.parsedScoreToPar;

    activeEnriched.forEach((comp, idx) => {
      const pid = comp.athlete?.id || comp.id;
      const isInsideFirst10 = idx < 10;
      const isTiedWithTenth = comp.parsedScoreToPar === tenthScore;

      if (isInsideFirst10 || isTiedWithTenth) {
        top10Leaders.push(comp);
        if (pid) top10IdsSet.add(pid);
      }
    });
  }

  // Filter other drafted golfers (drafted, but outside top 10)
  const draftedGolfers = enriched.filter((comp) => {
    const pid = comp.athlete?.id || comp.id;
    return pid && allDraftedPlayerIdsSet.has(pid) && !top10IdsSet.has(pid);
  });

  // Search filtering for Full Field lists
  const q = searchQuery ? searchQuery.trim().toLowerCase() : '';
  const filterBySearch = (list: EnrichedCompetitor[]) => {
    if (!q) return list;
    return list.filter((c) => {
      const name = c.profile.name.toLowerCase();
      const short = (c.profile.shortName || '').toLowerCase();
      const id = c.profile.id.toLowerCase();
      return name.includes(q) || short.includes(q) || id === q;
    });
  };

  const activeField = filterBySearch(activeEnriched);
  const cutField = filterBySearch(cutEnriched);
  const projectedCutIndex = activeEnriched.length;

  return {
    top10Leaders,
    draftedGolfers,
    activeField,
    cutField,
    projectedCutIndex,
    playerDraftedByMap,
    rankDisplayMap,

    // Aliases
    top10Competitors: top10Leaders,
    otherDrafted: draftedGolfers,
    otherDraftedCompetitors: draftedGolfers,
    activeFieldCompetitors: activeField,
    cutFieldCompetitors: cutField,
  };
}

/**
 * Alias export to match domain naming.
 */
export const evaluateLeaderboard = evaluateFieldLeaderboard;
