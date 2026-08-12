import { ESPNCompetitor, ESPNEventStatus } from '@/types/espn';
import { Participant } from '@/types/contest';
import { getPlayerStatusInfo } from '@/lib/espn';
import { createPlayerDraftedByMap } from '@/lib/scoring';
import {
  parsePositionNumber,
  parseCompetitorScoreToPar,
  sortCompetitorsByLeaderboard,
} from '@/lib/fieldLeaderboard';
import { getGolferProfile, GolferProfile, GolferDirectoryOptions } from './golferDirectory';

export interface EnrichedCompetitor extends ESPNCompetitor {
  profile: GolferProfile;
  formattedRank: string;
  parsedScoreToPar: number;
  isInactive: boolean;
}

export interface FieldLeaderboardEvaluation {
  top10Leaders: EnrichedCompetitor[];
  otherDrafted: EnrichedCompetitor[];
  activeField: EnrichedCompetitor[];
  cutField: EnrichedCompetitor[];
  projectedCutIndex: number;
  playerDraftedByMap: Map<string, string[]>;
}

export interface FieldLeaderboardOptions extends GolferDirectoryOptions {
  eventStatus?: ESPNEventStatus | null | unknown;
  searchQuery?: string;
}

/**
 * Pure domain evaluator that sorts, categorizes, formats ranks, and enriches PGA tournament competitors
 * with GolferProfiles and draftedBy participant ownerships in a single pass.
 */
export function evaluateLeaderboard(
  competitors: ESPNCompetitor[] = [],
  options: FieldLeaderboardOptions = {}
): FieldLeaderboardEvaluation {
  const { competitors: optComps, participants = [], eventStatus, searchQuery } = options;
  const rawCompetitors = competitors.length > 0 ? competitors : optComps || [];

  // Sort competitors canonically (active first by score, cut/wd last)
  const sorted = sortCompetitorsByLeaderboard(rawCompetitors, eventStatus);

  // Build playerDraftedByMap via domain scoring helper
  const playerDraftedByMap = createPlayerDraftedByMap(participants);


  // Enrich competitors with GolferProfile, rank badge, and score to par
  const enriched: EnrichedCompetitor[] = sorted.map((comp) => {
    const athleteId = comp.athlete?.id || comp.id || '';
    const statusInfo = getPlayerStatusInfo(comp, eventStatus);
    const scoreToPar = parseCompetitorScoreToPar(comp);
    const posNum = parsePositionNumber(comp);

    let formattedRank = 'E';
    if (statusInfo.isCut) formattedRank = 'CUT';
    else if (statusInfo.isWD) formattedRank = 'WD';
    else if (statusInfo.isDQ) formattedRank = 'DQ';
    else if (typeof comp.status?.position?.displayName === 'string' && comp.status.position.displayName) {
      formattedRank = comp.status.position.displayName;
    } else if (posNum < 999) {
      formattedRank = `${posNum}`;
    }

    const profile = getGolferProfile(athleteId, {
      competitors: rawCompetitors,
      participants,
      playerDirectoryMap: options.playerDirectoryMap,
    });

    return {
      ...comp,
      profile,
      formattedRank,
      parsedScoreToPar: scoreToPar,
      isInactive: statusInfo.isInactive,
    };
  });

  // Filter by search query if provided
  let filtered = enriched;
  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    filtered = enriched.filter((c) => {
      const name = c.profile.name.toLowerCase();
      const short = (c.profile.shortName || '').toLowerCase();
      const id = c.profile.id.toLowerCase();
      return name.includes(q) || short.includes(q) || id === q;
    });
  }

  // Active vs Cut split
  const activeCompetitors = filtered.filter((c) => !c.isInactive);
  const cutCompetitors = filtered.filter((c) => c.isInactive);

  // Top 10 Leaders (includes all ties at T10 or higher)
  let top10CutoffScore: number | null = null;
  if (activeCompetitors.length >= 10) {
    top10CutoffScore = activeCompetitors[9].parsedScoreToPar;
  } else if (activeCompetitors.length > 0) {
    top10CutoffScore = activeCompetitors[activeCompetitors.length - 1].parsedScoreToPar;
  }

  const top10Leaders: EnrichedCompetitor[] = [];
  const otherDrafted: EnrichedCompetitor[] = [];

  activeCompetitors.forEach((c) => {
    const isTop10Leader = top10CutoffScore !== null && c.parsedScoreToPar <= top10CutoffScore;
    if (isTop10Leader) {
      top10Leaders.push(c);
    } else if (c.profile.draftedBy.length > 0) {
      otherDrafted.push(c);
    }
  });

  const projectedCutIndex = activeCompetitors.length;

  return {
    top10Leaders,
    otherDrafted,
    activeField: activeCompetitors,
    cutField: cutCompetitors,
    projectedCutIndex,
    playerDraftedByMap,
  };
}
