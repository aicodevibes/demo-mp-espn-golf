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
}

export interface FieldLeaderboardOptions {
  competitors: ESPNCompetitor[];
  participants: Participant[];
  eventStatus?: any;
  searchQuery?: string;
}

/**
 * Parses numeric or display position from ESPN competitor.
 * Returns standard integer position (e.g. 10 for "10" or "T10").
 */
function parsePositionNumber(comp: ESPNCompetitor, defaultRank: number): number {
  if (!comp) return defaultRank;
  const rawPos = comp.status?.position?.id || comp.status?.position?.displayName || comp.order;
  if (typeof rawPos === 'number') return rawPos;
  if (typeof rawPos === 'string') {
    const cleaned = rawPos.replace(/[^\d]/g, '');
    const parsed = parseInt(cleaned, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return defaultRank;
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
  const safeCompetitors = Array.isArray(competitors) ? competitors : [];
  const playerDraftedByMap = createPlayerDraftedByMap(participants);

  // 1. Calculate Top 10 (including ties)
  let cutOffRank = 10;
  if (safeCompetitors.length > 10) {
    const tenthComp = safeCompetitors[9];
    const tenthPos = parsePositionNumber(tenthComp, 10);
    cutOffRank = tenthPos;
  }

  const top10Competitors: ESPNCompetitor[] = [];
  const top10IdsSet = new Set<string>();

  safeCompetitors.forEach((comp, idx) => {
    if (!comp) return;
    const pid = comp.athlete?.id || comp.id;
    const pos = parsePositionNumber(comp, idx + 1);

    if (idx < 10 || pos <= cutOffRank) {
      top10Competitors.push(comp);
      if (pid) top10IdsSet.add(pid);
    }
  });

  // 2. Calculate set of all drafted player IDs
  const allDraftedPlayerIdsSet = new Set<string>();
  participants.forEach((p) => {
    p.draftedPlayerIds?.forEach((pid) => allDraftedPlayerIdsSet.add(pid));
  });

  // 3. Filter other drafted competitors (drafted, but outside top 10)
  const otherDraftedCompetitors = safeCompetitors.filter((comp) => {
    if (!comp) return false;
    const pid = comp.athlete?.id || comp.id;
    return pid && allDraftedPlayerIdsSet.has(pid) && !top10IdsSet.has(pid);
  });

  // 4. Filter Full Field with search query and active/cut partition
  const q = searchQuery.toLowerCase().trim();
  const filteredCompetitors = q
    ? safeCompetitors.filter((c) => c?.athlete?.displayName?.toLowerCase().includes(q))
    : safeCompetitors;

  const activeFieldCompetitors: ESPNCompetitor[] = [];
  const cutFieldCompetitors: ESPNCompetitor[] = [];

  filteredCompetitors.forEach((comp) => {
    const status = getPlayerStatusInfo(comp, eventStatus);
    if (status.isInactive) {
      cutFieldCompetitors.push(comp);
    } else {
      activeFieldCompetitors.push(comp);
    }
  });

  return {
    top10Competitors,
    otherDraftedCompetitors,
    activeFieldCompetitors,
    cutFieldCompetitors,
    playerDraftedByMap,
  };
}
