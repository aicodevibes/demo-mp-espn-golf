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

export interface NormalizedHoleScore {
  hole: number;
  par: number;
  strokes: number;
  diff: number | null;
  scoreType: string;
  badgeClass: string;
  isPlayed: boolean;
}

export interface NormalizedRoundLinescore {
  period: number;
  displayValue: string;
  scoreToPar: number | null;
  formattedScore: string;
  frontPar: number;
  frontStrokes: number;
  backPar: number;
  backStrokes: number;
  totalPar: number;
  totalStrokes: number;
  holes: NormalizedHoleScore[];
}

export interface NormalizedPlayerProfile {
  id: string;
  displayName: string;
  shortName: string;
  initials: string;
  headshotUrls: string[];
  countryFlagUrl?: string;
}

export interface NormalizedPlayerSummary {
  player: NormalizedPlayerProfile;
  rounds: NormalizedRoundLinescore[];
}

export interface NormalizeTournamentOptions {
  activeEventId?: string | null;
  playerDirectoryMap?: Record<string, { id: string; name: string; headshotUrl?: string; countryFlagUrl?: string }>;
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
  playerDirectoryMap: Record<string, { id: string; name: string; headshotUrl?: string; countryFlagUrl?: string }> = DEFAULT_PLAYER_DIRECTORY_MAP
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

  // Country flag (from live payload or player directory fallback)
  const countryFlagUrl = comp.athlete?.flag?.href || dirPlayer?.countryFlagUrl;

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

  const customFallback = options.playerDirectoryMap
    ? Object.values(options.playerDirectoryMap).map((dirPlayer) => ({
        id: dirPlayer.id,
        order: 99,
        score: '-',
        status: {
          thru: 0,
          position: { displayName: '-' },
          type: { state: 'pre', completed: false, description: 'Scheduled' },
        },
        athlete: {
          id: dirPlayer.id,
          displayName: dirPlayer.name,
          headshot: { href: dirPlayer.headshotUrl || '' },
          flag: dirPlayer.countryFlagUrl ? { href: dirPlayer.countryFlagUrl } : undefined,
        },
      } as ESPNCompetitor))
    : null;

  const rawComps = resolveEventCompetitorsWithFallback(
    detailedEvent?.competitions?.[0]?.competitors || activeEvent?.competitions?.[0]?.competitors,
    customFallback
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

  let compsToNormalize = rawComps;
  // If scheduled/pre-event has empty competitors list, automatically synthesize from player directory
  if (compsToNormalize.length === 0 && Object.keys(dirMap).length > 0) {
    compsToNormalize = Object.values(dirMap).map((dirPlayer) => ({
      id: dirPlayer.id,
      order: 99,
      score: '-',
      status: {
        thru: 0,
        position: { displayName: '-' },
        type: { state: 'pre', completed: false, description: 'Scheduled' },
      },
      athlete: {
        id: dirPlayer.id,
        displayName: dirPlayer.name,
        headshot: { href: dirPlayer.headshotUrl || '' },
        flag: dirPlayer.countryFlagUrl ? { href: dirPlayer.countryFlagUrl } : undefined,
      },
    } as ESPNCompetitor));
  }

  // Normalize all competitors
  const normalizedCompetitors: NormalizedCompetitor[] = compsToNormalize.map((c) =>
    normalizeCompetitor(c, eventStatus, compsToNormalize, dirMap)
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
 * Deep Module Seam: Normalizes raw ESPN hole-by-hole linescores into structured 18-hole scorecard view models.
 */
export function normalizePlayerSummary(
  rawSummary: any,
  fallbackComp?: ESPNCompetitor | null,
  eventCourseHoles?: number[],
  playerDirectoryMap: Record<string, { id: string; name: string; headshotUrl?: string }> = DEFAULT_PLAYER_DIRECTORY_MAP
): NormalizedPlayerSummary {
  const sourceData = rawSummary || fallbackComp;
  const profile = sourceData?.profile || sourceData?.athlete || fallbackComp?.athlete;

  // Deep Module Seam: Combine rounds from rawSummary (detailed hole-by-hole) and fallbackComp linescores (live leaderboard rounds).
  // rawSummary provides detailed hole-by-hole data; fallbackComp provides live round summaries from the leaderboard feed.
  // Merge strategy: prefer rawSummary linescores only when they contain actual played strokes, otherwise preserve fallbackComp's live data.
  const summaryRounds: any[] = rawSummary?.rounds || rawSummary?.linescores || [];
  const compRounds: any[] = fallbackComp?.linescores || [];

  /** Returns true if the linescores array contains at least one hole with strokes played (value > 0). */
  const hasPlayedHoles = (linescores: any[] | undefined): boolean =>
    Array.isArray(linescores) && linescores.some((h: any) => (h.value || 0) > 0);

  const roundsByPeriod = new Map<number, any>();
  compRounds.forEach((rd: any, idx: number) => {
    const period = rd.period || idx + 1;
    roundsByPeriod.set(period, rd);
  });
  summaryRounds.forEach((rd: any, idx: number) => {
    const period = rd.period || idx + 1;
    const existing = roundsByPeriod.get(period);
    if (existing) {
      roundsByPeriod.set(period, {
        ...existing,
        ...rd,
        displayValue: rd.displayValue && rd.displayValue !== '-' ? rd.displayValue : existing.displayValue,
        value: rd.value !== undefined && rd.value !== 0 ? rd.value : existing.value,
        linescores: hasPlayedHoles(rd.linescores) ? rd.linescores : existing.linescores,
      });
    } else {
      roundsByPeriod.set(period, rd);
    }
  });

  const rawRounds: any[] = Array.from(roundsByPeriod.values()).sort((a, b) => (a.period || 0) - (b.period || 0));
  if (rawRounds.length === 0 && sourceData?.linescores) {
    rawRounds.push(...sourceData.linescores);
  }
  const athleteId = profile?.id || fallbackComp?.athlete?.id || fallbackComp?.id || '';
  const dirPlayer = playerDirectoryMap[athleteId];

  const displayName = profile?.displayName || dirPlayer?.name || fallbackComp?.athlete?.displayName || (athleteId ? `Golfer (${athleteId})` : 'Golfer');
  const firstName = profile?.firstName || getGolferNameTokens(displayName)[0] || '';
  const lastName = profile?.lastName || (fallbackComp ? getGolferLastName(fallbackComp) : displayName.split(' ').slice(1).join(' '));
  const shortName = profile?.shortName || `${firstName ? firstName.charAt(0) + '.' : ''} ${lastName}`.trim() || displayName;
  const initials = getGolferInitials(displayName);

  const rawHeadshot = typeof profile?.headshot === 'string' ? profile.headshot : profile?.headshot?.href || fallbackComp?.athlete?.headshot?.href;
  const headshotUrls = resolveGolferHeadshotUrls(athleteId, rawHeadshot, dirPlayer?.headshotUrl);
  const countryFlagUrl = profile?.flag?.href || fallbackComp?.athlete?.flag?.href;

  const playerProfile: NormalizedPlayerProfile = {
    id: athleteId,
    displayName,
    shortName,
    initials,
    headshotUrls,
    countryFlagUrl,
  };

  // Known hole pars map across rounds
  const knownHoleParsMap = new Map<number, number>();
  const courseHolesList: number[] = rawSummary?.courseHoles || eventCourseHoles || [];
  courseHolesList.forEach((parVal, hIdx) => {
    if (typeof parVal === 'number' && parVal > 0 && hIdx < 18) {
      knownHoleParsMap.set(hIdx + 1, parVal);
    }
  });

  // Pass 1: Extract pars from all available linescores
  rawRounds.forEach((rd: any) => {
    (rd.linescores || []).forEach((h: any, hIdx: number) => {
      const holeNum = h.period || hIdx + 1;
      const strokes = h.value || 0;
      const diffStr = h.scoreType?.displayValue || '0';
      const diff = parseInt(diffStr, 10) || 0;

      let extractedPar: number | undefined;
      if (typeof h.par === 'number' && h.par > 0) {
        extractedPar = h.par;
      } else if (strokes > 0 && diff !== undefined && !isNaN(diff)) {
        const derived = strokes - diff;
        if (derived > 0) extractedPar = derived;
      }

      if (extractedPar && holeNum >= 1 && holeNum <= 18) {
        knownHoleParsMap.set(holeNum, extractedPar);
      }
    });
  });

  // Pass 2: Format each round
  const rounds: NormalizedRoundLinescore[] = rawRounds.map((rd: any, idx: number) => {
    const roundPeriod = rd.period || idx + 1;
    const roundDisplayValue = rd.value !== undefined && rd.value !== 0 ? `${rd.value}` : rd.displayValue || '-';

    let frontPar = 0;
    let frontStrokes = 0;
    let backPar = 0;
    let backStrokes = 0;
    let playedHolesCount = 0;
    let playedDiffSum = 0;

    const rawHolesMap = new Map<number, any>();
    (rd.linescores || []).forEach((h: any, hIdx: number) => {
      const holeNum = h.period || hIdx + 1;
      rawHolesMap.set(holeNum, h);
    });

    const holes: NormalizedHoleScore[] = Array.from({ length: 18 }, (_, i) => {
      const holeNum = i + 1;
      const rawHole = rawHolesMap.get(holeNum);
      const strokes = rawHole?.value || 0;
      const isPlayed = strokes > 0;

      let par = knownHoleParsMap.get(holeNum) || 4;
      if (typeof rawHole?.par === 'number' && rawHole.par > 0) {
        par = rawHole.par;
      }

      let diff: number | null = null;
      let scoreType = 'unplayed';
      let badgeClass = 'text-on-surface-variant';

      if (isPlayed) {
        diff = strokes - par;
        playedHolesCount++;
        playedDiffSum += diff;

        if (diff <= -2) {
          scoreType = 'eagle';
          badgeClass = 'bg-amber-500 text-amber-950 border border-amber-400 font-black';
        } else if (diff === -1) {
          scoreType = 'birdie';
          badgeClass = 'bg-tertiary/15 text-tertiary border border-tertiary font-bold';
        } else if (diff === 0) {
          scoreType = 'par';
          badgeClass = 'text-on-surface font-semibold';
        } else if (diff === 1) {
          scoreType = 'bogey';
          badgeClass = 'bg-error/10 text-error border border-error/30 font-semibold';
        } else if (diff >= 2) {
          scoreType = 'double';
          badgeClass = 'bg-error text-on-error border border-error font-bold';
        }
      }

      if (holeNum <= 9) {
        frontPar += par;
        if (isPlayed) frontStrokes += strokes;
      } else {
        backPar += par;
        if (isPlayed) backStrokes += strokes;
      }

      return {
        hole: holeNum,
        par,
        strokes,
        diff,
        scoreType,
        badgeClass,
        isPlayed,
      };
    });

    const totalPar = frontPar + backPar;
    const totalStrokes = frontStrokes + backStrokes;

    let scoreToPar: number | null = null;
    if (playedHolesCount > 0) {
      scoreToPar = playedDiffSum;
    } else if (typeof rd.displayValue === 'string') {
      const dv = rd.displayValue.trim();
      if (dv === 'E' || dv === 'EVEN') {
        scoreToPar = 0;
      } else if (dv.startsWith('+') || dv.startsWith('-')) {
        const parsed = parseInt(dv.replace('+', ''), 10);
        if (!isNaN(parsed) && Math.abs(parsed) <= 30) {
          scoreToPar = parsed;
        }
      }
    }

    const formattedScore = scoreToPar === null ? '-' : scoreToPar === 0 ? 'E' : scoreToPar > 0 ? `+${scoreToPar}` : `${scoreToPar}`;

    return {
      period: roundPeriod,
      displayValue: roundDisplayValue,
      scoreToPar,
      formattedScore,
      frontPar,
      frontStrokes,
      backPar,
      backStrokes,
      totalPar,
      totalStrokes,
      holes,
    };
  });

  return {
    player: playerProfile,
    rounds,
  };
}

/**
 * Deep Module Object aggregating the adapter pipeline.
 */
export const EspnTournamentAdapter = {
  normalizeTournamentSnapshot,
  normalizePlayerSummary,
  normalizeCompetitor,
  getGolferCardViewModel,
  resolveGolferHeadshotUrls,
  getCachedScoreboard: readScoreboardCache,
  cacheScoreboard: writeScoreboardCache,
};
