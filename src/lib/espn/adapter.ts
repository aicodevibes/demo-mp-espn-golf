import {
  ESPNEvent,
  ESPNCompetitor,
  ESPNCompetitorScore,
  ESPNEventStatus,
} from '@/types/espn';
import {
  parseESPNScoreboardResponse,
  resolveActiveEvent,
  resolveEventCompetitorsWithFallback,
  formatEventDates,
  formatScoreDisplay,
  getScoreMeta,
  formatThruDisplay,
  getGolferCumulativeScoreToPar,
  getPlayerStatusInfo,
  getWinnerStatus,
  PlayerStatusInfo,
  WinnerStatusInfo,
  DEFAULT_PLAYER_DIRECTORY_MAP,
  ScoreMeta,
} from './eventHelpers';
import { readScoreboardCache, writeScoreboardCache } from './scoreboardCache';
import { getGolferInitials, normalizeGolferName, getGolferLastName, getGolferNameTokens } from '../domain/golferDirectory';

export interface NormalizedStatusInfo extends PlayerStatusInfo, WinnerStatusInfo {
  statusBadge: string;
}

export interface NormalizedCompetitor extends ESPNCompetitor {
  scoreDisplay: string;
  scoreToPar: number | null;
  scoreMeta: ScoreMeta;
  thruDisplay: string;
  statusInfo: NormalizedStatusInfo;
  headshotUrls: string[];
  countryFlagUrl?: string;
  initials: string;
}

export interface NormalizedTournament {
  id: string;
  name: string;
  shortName?: string;
  datesFormatted: string;
  statusState: 'pre' | 'in' | 'post' | string;
  statusDetail: string;
  period: number;
  isCompleted: boolean;
  isPlayoff: boolean;
  courseName?: string;
  rawEvent: ESPNEvent | null;
  competitors: NormalizedCompetitor[];
  competitorMap: Map<string, NormalizedCompetitor>;
  events: ESPNEvent[];
}

export interface GolferCardViewModel {
  id: string;
  displayName: string;
  shortName: string;
  initials: string;
  rankDisplay: string;
  scoreDisplay: string;
  scoreToPar: number | null;
  isUnderPar: boolean;
  isOverPar: boolean;
  thruDisplay: string;
  statusBadge: string;
  headshotUrls: string[];
  countryFlagUrl?: string;
  isCut: boolean;
  isWD: boolean;
  isDQ: boolean;
  isWinner: boolean;
  isPlayoff: boolean;
  isInactive: boolean;
  draftedBy: string[];
}

export interface NormalizeTournamentOptions {
  activeEventId?: string | null;
  playerDirectoryMap?: Record<string, { id: string; name: string; headshotUrl?: string }>;
}

/**
 * Resolves full ordered list of headshot URLs for a golfer with multi-stage CDN fallback.
 */
export function resolveGolferHeadshotUrls(
  athleteId: string,
  rawHeadshotHref?: string,
  directoryCustomUrl?: string
): string[] {
  const urls: string[] = [];

  // 1. Direct ESPN Athlete headshot href if valid http URL
  if (rawHeadshotHref && rawHeadshotHref.startsWith('http')) {
    urls.push(rawHeadshotHref);
  }

  // 2. Directory custom URL if provided
  if (directoryCustomUrl && directoryCustomUrl.startsWith('http')) {
    if (!urls.includes(directoryCustomUrl)) {
      urls.push(directoryCustomUrl);
    }
  }

  // 3. Direct ESPN full CDN URL
  const cleanId = (athleteId || '').trim();
  if (cleanId && /^\d+$/.test(cleanId)) {
    const directCdn = `https://a.espncdn.com/i/headshots/golf/players/full/${cleanId}.png`;
    if (!urls.includes(directCdn)) {
      urls.push(directCdn);
    }

    // 4. ESPN Combiner fallback URL
    const combinerUrl = `https://a.espncdn.com/combiner/i?img=/i/headshots/golf/players/full/${cleanId}.png&w=120&h=120&scale=crop`;
    if (!urls.includes(combinerUrl)) {
      urls.push(combinerUrl);
    }
  }

  return urls;
}

/**
 * Derives normalized competitor data with embedded status, pre-computed scores,
 * thru formatting, and multi-stage headshots.
 */
export function normalizeCompetitor(
  comp: ESPNCompetitor,
  eventStatus?: ESPNEventStatus,
  allCompetitors: ESPNCompetitor[] = [],
  playerDirectoryMap: Record<string, { id: string; name: string; headshotUrl?: string }> = DEFAULT_PLAYER_DIRECTORY_MAP
): NormalizedCompetitor {
  const athleteId = comp.athlete?.id || comp.id || '';
  const dirPlayer = playerDirectoryMap[athleteId];

  // Derive player status info (CUT, WD, DQ, etc.)
  const playerStatus = getPlayerStatusInfo(comp, eventStatus);

  // Derive winner / playoff status if tournament is completed
  const winnerStatus = getWinnerStatus(comp, eventStatus, allCompetitors);

  // Combine badge label
  let statusBadge = '';
  if (winnerStatus.badgeLabel) {
    statusBadge = winnerStatus.badgeLabel;
  } else if (playerStatus.badgeLabel) {
    statusBadge = playerStatus.badgeLabel;
  }

  const combinedStatusInfo: NormalizedStatusInfo = {
    isCut: playerStatus.isCut,
    isWD: playerStatus.isWD,
    isDQ: playerStatus.isDQ,
    isMDF: playerStatus.isMDF,
    isInactive: playerStatus.isInactive,
    isWinner: winnerStatus.isWinner,
    isPlayoff: winnerStatus.isPlayoff,
    badgeLabel: statusBadge,
    statusBadge,
  };

  // Pre-compute score and score meta
  const scoreMeta = getGolferCumulativeScoreToPar(comp, eventStatus);
  const scoreDisplay = scoreMeta.formattedScore;
  let scoreToPar: number | null = null;
  if (scoreDisplay === 'E' || scoreDisplay === 'EVEN') {
    scoreToPar = 0;
  } else if (scoreDisplay.startsWith('+') || scoreDisplay.startsWith('-')) {
    const parsed = parseInt(scoreDisplay.replace('+', ''), 10);
    if (!isNaN(parsed)) scoreToPar = parsed;
  }

  // Pre-compute thru display
  const thruDisplay = formatThruDisplay(comp, eventStatus);

  // Resolve headshot fallback chain
  const rawHeadshot = comp.athlete?.headshot?.href;
  const dirHeadshot = dirPlayer?.headshotUrl;
  const headshotUrls = resolveGolferHeadshotUrls(athleteId, rawHeadshot, dirHeadshot);

  // Country flag
  const countryFlagUrl = comp.athlete?.flag?.href;

  const displayName = comp.athlete?.displayName || dirPlayer?.name || (athleteId ? `Golfer (${athleteId})` : 'Unknown');
  const initials = getGolferInitials(displayName);

  return {
    ...comp,
    scoreDisplay,
    scoreToPar,
    scoreMeta,
    thruDisplay,
    statusInfo: combinedStatusInfo,
    headshotUrls,
    countryFlagUrl,
    initials,
  };
}

/**
 * Primary Deep Module Seam: Normalizes raw ESPN Scoreboard and detailed event payloads
 * into a single, fully pre-evaluated NormalizedTournament snapshot with O(1) competitor lookups.
 */
export function normalizeTournamentSnapshot(
  rawScoreboard: any,
  detailedEvent?: any,
  options: NormalizeTournamentOptions = {}
): NormalizedTournament {
  const events = parseESPNScoreboardResponse(rawScoreboard);
  const activeEvent = resolveActiveEvent(events, detailedEvent, options.activeEventId);

  const rawComps = resolveEventCompetitorsWithFallback(
    detailedEvent?.competitions?.[0]?.competitors || activeEvent?.competitions?.[0]?.competitors,
    null
  );

  const eventStatus: ESPNEventStatus =
    detailedEvent?.status || activeEvent?.status || {
      type: {
        name: 'STATUS_SCHEDULED',
        description: 'Scheduled',
        detail: 'Scheduled',
        state: 'pre',
        completed: false,
      },
      period: 0,
    };

  const statusState = eventStatus.type?.state || 'pre';
  const statusDetail = eventStatus.type?.detail || eventStatus.type?.description || 'Scheduled';
  const period = eventStatus.period || 0;
  const isCompleted = eventStatus.type?.completed === true || statusState === 'post' || statusDetail.toLowerCase().includes('final');

  // Check playoff flag
  const isPlayoff = Boolean(
    statusDetail.toLowerCase().includes('playoff') ||
      statusDetail.toLowerCase().includes('extra') ||
      (rawComps.length >= 2 &&
        rawComps[0]?.score === rawComps[1]?.score &&
        rawComps[0]?.score !== undefined &&
        (rawComps[1]?.status?.position?.displayName?.includes('P') ||
          rawComps[1]?.status?.position?.displayName?.includes('T')))
  );

  const datesFormatted = formatEventDates(activeEvent?.date, activeEvent?.endDate);
  const dirMap = options.playerDirectoryMap || DEFAULT_PLAYER_DIRECTORY_MAP;

  // Normalize all competitors
  const normalizedCompetitors: NormalizedCompetitor[] = rawComps.map((c) =>
    normalizeCompetitor(c, eventStatus, rawComps, dirMap)
  );

  // Build pre-indexed O(1) competitor map
  const competitorMap = new Map<string, NormalizedCompetitor>();
  normalizedCompetitors.forEach((c) => {
    const athleteId = c.athlete?.id || c.id;
    if (athleteId) {
      competitorMap.set(athleteId, c);
    }
  });

  return {
    id: activeEvent?.id || detailedEvent?.id || 'synthetic-event',
    name: activeEvent?.name || detailedEvent?.name || 'PGA Tournament',
    shortName: activeEvent?.shortName || detailedEvent?.shortName,
    datesFormatted,
    statusState,
    statusDetail,
    period,
    isCompleted,
    isPlayoff,
    courseName: activeEvent?.courses?.[0]?.name || detailedEvent?.courses?.[0]?.name,
    rawEvent: activeEvent || detailedEvent || null,
    competitors: normalizedCompetitors,
    competitorMap,
    events,
  };
}

/**
 * Helper to format rank badge text e.g. 1 -> "1st", 2 -> "2nd", 3 -> "3rd", 4 -> "4th", 10 -> "10th", "T2" -> "T2"
 */
export function formatRankDisplay(rank: number | string | undefined, positionStr?: string): string {
  if (positionStr && positionStr !== '-' && positionStr !== '') {
    return positionStr;
  }
  if (rank === undefined || rank === null || typeof rank !== 'number' || rank <= 0) {
    return '-';
  }
  if (rank === 1) return '1st';
  if (rank === 2) return '2nd';
  if (rank === 3) return '3rd';
  if (rank === 4) return '4th';
  return `${rank}th`;
}

/**
 * Secondary Deep Module Seam: Transforms a NormalizedCompetitor or raw ESPNCompetitor into a declarative
 * GolferCardViewModel ready for immediate zero-compute UI rendering.
 */
export function getGolferCardViewModel(
  competitor: NormalizedCompetitor | ESPNCompetitor,
  eventStatus?: any,
  rankMap?: Record<string, number>,
  draftedBy: string[] = []
): GolferCardViewModel {
  const athleteId = competitor.athlete?.id || competitor.id || '';
  const isAlreadyNormalized = 'statusInfo' in competitor && 'headshotUrls' in competitor;

  const normalized = isAlreadyNormalized
    ? (competitor as NormalizedCompetitor)
    : normalizeCompetitor(competitor, eventStatus);

  const rawPosition = normalized.status?.position?.displayName;
  const mappedRank = rankMap && athleteId ? rankMap[athleteId] : normalized.order;
  const rankDisplay = formatRankDisplay(mappedRank, rawPosition);

  const name = normalized.athlete?.displayName || 'Golfer';
  const firstName = normalized.athlete?.firstName || getGolferNameTokens(name)[0] || '';
  const lastName = normalized.athlete?.lastName || getGolferLastName(normalized);
  const shortName =
    normalized.athlete?.shortName ||
    `${firstName ? firstName.charAt(0) + '.' : ''} ${lastName}`.trim();

  return {
    id: athleteId,
    displayName: name,
    shortName: shortName || name,
    initials: normalized.initials || getGolferInitials(name),
    rankDisplay,
    scoreDisplay: normalized.scoreDisplay,
    scoreToPar: normalized.scoreToPar,
    isUnderPar: normalized.scoreMeta.isUnderPar,
    isOverPar: normalized.scoreMeta.isOverPar,
    thruDisplay: normalized.thruDisplay,
    statusBadge: normalized.statusInfo.statusBadge,
    headshotUrls: normalized.headshotUrls,
    countryFlagUrl: normalized.countryFlagUrl,
    isCut: normalized.statusInfo.isCut,
    isWD: normalized.statusInfo.isWD,
    isDQ: normalized.statusInfo.isDQ,
    isWinner: normalized.statusInfo.isWinner,
    isPlayoff: normalized.statusInfo.isPlayoff,
    isInactive: normalized.statusInfo.isInactive,
    draftedBy,
  };
}

/**
 * Deep Module Object aggregating the adapter pipeline.
 */
export const EspnTournamentAdapter = {
  normalizeTournamentSnapshot,
  getGolferCardViewModel,
  getCachedScoreboard: readScoreboardCache,
  cacheScoreboard: writeScoreboardCache,
};
