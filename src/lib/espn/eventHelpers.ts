import { ESPNCompetitor, ESPNCompetitorScore, ESPNEvent, ESPNCalendarItem } from '@/types/espn';

export function formatEventDates(startDate?: string, endDate?: string): string {
  if (!startDate) return '';
  try {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : start;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const startMonth = months[start.getUTCMonth()];
    const startDay = start.getUTCDate();
    const endMonth = months[end.getUTCMonth()];
    const endDay = end.getUTCDate();
    const year = end.getUTCFullYear();

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} – ${endDay}, ${year}`;
    }
    return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`;
  } catch (err) {
    return '';
  }
}

export function formatScoreDisplay(score: ESPNCompetitorScore, eventStatus?: any): string {
  const state = eventStatus?.type?.state;
  const isPreEvent = state === 'pre' || (eventStatus?.type?.completed === false && eventStatus?.type?.description === 'Scheduled');

  if (score === null || score === undefined || score === '') return isPreEvent ? '-' : 'E';
  if (typeof score === 'string') {
    const trimmed = score.trim();
    if (trimmed === '' || trimmed === '0' || trimmed === 'EVEN') return isPreEvent ? '-' : 'E';
    if (trimmed === 'E' && isPreEvent) return '-';
    return trimmed;
  }
  if (typeof score === 'number') {
    if (score === 0) return isPreEvent ? '-' : 'E';
    return score > 0 ? `+${score}` : String(score);
  }
  if (typeof score === 'object') {
    if (score.displayValue !== undefined && score.displayValue !== null) {
      const disp = String(score.displayValue).trim();
      if (disp === '' || disp === '0' || disp === 'EVEN') return isPreEvent ? '-' : 'E';
      if (disp === 'E' && isPreEvent) return '-';
      return disp;
    }
    if (score.value !== undefined && score.value !== null) {
      const val = Number(score.value);
      if (isNaN(val) || val === 0) return isPreEvent ? '-' : 'E';
      return val > 0 ? `+${val}` : String(val);
    }
  }
  return isPreEvent ? '-' : 'E';
}

export interface ScoreMeta {
  formattedScore: string;
  isUnderPar: boolean;
  isOverPar: boolean;
}

export function getScoreMeta(score: ESPNCompetitorScore, eventStatus?: any): ScoreMeta {
  const formattedScore = formatScoreDisplay(score, eventStatus);
  const isUnderPar = formattedScore.startsWith('-');
  const isOverPar = formattedScore.startsWith('+');
  return { formattedScore, isUnderPar, isOverPar };
}


export interface ESPNScoreboardPayload {
  events?: ESPNEvent[];
  leagues?: Array<{
    calendar?: ESPNCalendarItem[];
  }>;
}

export function parseESPNScoreboardResponse(data: ESPNScoreboardPayload | unknown): ESPNEvent[] {
  if (!data || typeof data !== 'object') return [];
  const payload = data as ESPNScoreboardPayload;
  const liveEvents: ESPNEvent[] = payload.events || [];
  const liveEventsMap = new Map(liveEvents.map((e) => [e.id, e]));

  const calendarItems: ESPNCalendarItem[] = payload.leagues?.[0]?.calendar || [];
  const calendarEvents: ESPNEvent[] = calendarItems.map((item) => {
    if (liveEventsMap.has(item.id)) {
      return liveEventsMap.get(item.id)!;
    }
    return {
      id: item.id,
      name: item.label || item.name || 'PGA Event',
      shortName: item.label || item.name,
      date: item.startDate || item.date,
      endDate: item.endDate,
      status: item.status || {
        type: {
          name: 'STATUS_SCHEDULED',
          description: 'Scheduled',
          detail: '',
          state: 'pre',
        },
      },
    };
  });

  return calendarEvents.length > 0 ? calendarEvents : liveEvents;
}

/**
 * Resolves the active ESPN event metadata immediately from scoreboard fallback
 * while detailed event leaderboard payload is loading asynchronously.
 */
export function resolveActiveEvent(
  events: ESPNEvent[] = [],
  activeEventObj: ESPNEvent | null = null,
  activeEventId?: string | null
): ESPNEvent | null {
  if (activeEventObj) return activeEventObj;
  if (events.length === 0) return null;
  if (activeEventId) {
    const found = events.find((e) => e.id === activeEventId);
    if (found) return found;
  }
  return events[0] || null;
}

export interface WinnerStatusInfo {
  isWinner: boolean;
  isPlayoff: boolean;
  badgeLabel: string;
}

export function getWinnerStatus(
  comp: ESPNCompetitor,
  eventStatus?: any,
  allCompetitors: ESPNCompetitor[] = []
): WinnerStatusInfo {
  const isFinal =
    eventStatus?.type?.state === 'post' ||
    eventStatus?.type?.completed === true ||
    eventStatus?.type?.detail?.toLowerCase().includes('final');

  if (!isFinal) {
    return { isWinner: false, isPlayoff: false, badgeLabel: '' };
  }

  const detailText = (eventStatus?.type?.detail || '').toLowerCase();
  const positionStr = comp.status?.position?.displayName || `${comp.order || ''}`;

  // Playoff detection
  const hasPlayoffText = detailText.includes('playoff') || detailText.includes('extra');
  const runnerUpHasSameScore =
    allCompetitors.length >= 2 &&
    allCompetitors[0]?.score === allCompetitors[1]?.score &&
    allCompetitors[0]?.score !== undefined &&
    (allCompetitors[1]?.status?.position?.displayName?.includes('P') ||
     allCompetitors[1]?.status?.position?.displayName?.includes('T'));

  const isPlayoff = hasPlayoffText || runnerUpHasSameScore;

  const isFirst = comp.order === 1 || positionStr === '1';
  const isSecond = comp.order === 2 || positionStr === 'P2' || positionStr === '2';

  if (isFirst) {
    return {
      isWinner: true,
      isPlayoff,
      badgeLabel: isPlayoff ? '🏆 Champion (Playoff)' : '🏆 Champion',
    };
  }

  if (isSecond && isPlayoff) {
    return {
      isWinner: false,
      isPlayoff: true,
      badgeLabel: '2nd (Playoff)',
    };
  }

  return { isWinner: false, isPlayoff: false, badgeLabel: '' };
}

export interface PlayerStatusInfo {
  isCut: boolean;
  isWD: boolean;
  isDQ: boolean;
  isMDF: boolean;
  isInactive: boolean;
  badgeLabel: string;
}

export function getPlayerStatusInfo(comp: ESPNCompetitor, eventStatus?: any): PlayerStatusInfo {
  if (!comp) {
    return { isCut: false, isWD: false, isDQ: false, isMDF: false, isInactive: false, badgeLabel: '' };
  }

  // NOTE: ESPN sends a null/empty status object for players who missed the 36-hole cut.
  // We must compute the linescore-based check BEFORE any early returns on status fields.
  const currentPeriod = eventStatus?.period || (comp.status as any)?.period || 0;
  const isFinalOrLateRound =
    eventStatus?.type?.state === 'post' ||
    eventStatus?.type?.completed === true ||
    currentPeriod >= 3;

  // Cut detection via round count: active players have 4 linescores (rounds), cut players have 2.
  const missedCutByRounds =
    isFinalOrLateRound &&
    Array.isArray(comp.linescores) &&
    comp.linescores.length === 2;

  // String-based status checks (only meaningful when ESPN does populate status fields)
  const pos = (comp.status?.position?.displayName || '').toUpperCase();
  const displayVal = (comp.status?.displayValue || '').toUpperCase();
  const typeName = (comp.status?.type?.name || '').toUpperCase();
  const shortDetail = (comp.status?.type?.shortDetail || '').toUpperCase();
  const detail = (comp.status?.type?.detail || '').toUpperCase();
  const description = (comp.status?.type?.description || '').toUpperCase();

  const isWD =
    pos === 'WD' ||
    displayVal === 'WD' ||
    typeName === 'STATUS_WITHDRAWN' ||
    shortDetail.includes('WD') ||
    detail.includes('WITHDRAWN') ||
    detail.includes('WD') ||
    description.includes('WITHDRAWN');

  const isDQ =
    pos === 'DQ' ||
    displayVal === 'DQ' ||
    typeName === 'STATUS_DISQUALIFIED' ||
    detail.includes('DISQUALIFIED');

  const isMDF = pos === 'MDF' || displayVal === 'MDF' || detail.includes('MDF');

  const isCutByString =
    pos === 'CUT' ||
    pos === 'MC' ||
    displayVal === 'CUT' ||
    displayVal === 'MC' ||
    typeName === 'STATUS_CUT' ||
    typeName === 'STATUS_MISSED_CUT' ||
    shortDetail.includes('CUT') ||
    shortDetail.includes('MC') ||
    detail.includes('CUT') ||
    detail.includes('MISSED CUT') ||
    description.includes('CUT');

  // Combine: a player is CUT if ESPN says so via strings, OR they only have 2 rounds in a completed event
  // (and they're not WD/DQ, which have their own distinct treatment)
  const finalIsCut = !isWD && !isDQ && (isCutByString || (missedCutByRounds && !isWD && !isDQ));
  const isInactive = finalIsCut || isWD || isDQ || isMDF;

  let badgeLabel = '';
  if (finalIsCut) badgeLabel = 'CUT';
  else if (isWD) badgeLabel = 'WD';
  else if (isDQ) badgeLabel = 'DQ';
  else if (isMDF) badgeLabel = 'MDF';

  return { isCut: finalIsCut, isWD, isDQ, isMDF, isInactive, badgeLabel };
}

/**
 * Returns all competitors in the Top 10 positions, expanding beyond 10 items
 * to include any competitors tied for 10th place (T10).
 */
export function getTop10WithTies(competitors: ESPNCompetitor[] = []): ESPNCompetitor[] {
  if (!competitors || competitors.length <= 10) return competitors || [];

  const initial10 = competitors.slice(0, 10);
  const tenthPlaceCompetitor = initial10[9];
  if (!tenthPlaceCompetitor) return initial10;

  const tenthPos = tenthPlaceCompetitor.status?.position?.displayName;
  const tenthScore = tenthPlaceCompetitor.score;

  const additionalTies: ESPNCompetitor[] = [];
  for (let i = 10; i < competitors.length; i++) {
    const competitor = competitors[i];
    const competitorPosition = competitor.status?.position?.displayName;
    const competitorScore = competitor.score;

    const isPosMatch = Boolean(
      tenthPos && competitorPosition && (competitorPosition === tenthPos || competitorPosition === `T${tenthPos.replace('T', '')}`)
    );
    const isScoreMatch = tenthScore !== undefined && competitorScore !== undefined && competitorScore === tenthScore;

    if (isPosMatch || isScoreMatch) {
      additionalTies.push(competitor);
    } else {
      break;
    }
  }

  return [...initial10, ...additionalTies];
}

export interface GolferRoundScoreResult {
  roundStrokes: number | null;
  scoreToPar: number | null;
  formattedScore: string;
  isUnderPar: boolean;
  isOverPar: boolean;
  isEven: boolean;
  isInactive: boolean;
  statusDetail: string;
}

/**
 * Single deep module function at the @/lib/espn seam to evaluate a competitor's round score,
 * score-to-par, formatting, and WD/CUT status.
 */
export function evaluateGolferRoundScore(
  comp: ESPNCompetitor,
  round: number,
  coursePar?: number | null,
  eventCourseHoles?: number[]
): GolferRoundScoreResult {
  if (!comp) {
    return {
      roundStrokes: null,
      scoreToPar: null,
      formattedScore: '-',
      isUnderPar: false,
      isOverPar: false,
      isEven: false,
      isInactive: false,
      statusDetail: '',
    };
  }

  const statusInfo = getPlayerStatusInfo(comp);
  const statusPos = (comp.status?.position?.displayName || '').toUpperCase();
  const statusType = (comp.status?.type?.name || '').toUpperCase();
  const isWD = statusPos === 'WD' || statusType === 'STATUS_WITHDRAWN' || statusInfo.isWD;
  const isCut = statusPos === 'CUT' || statusPos === 'MC' || statusInfo.isCut;

  // Extract strokes for the requested round period
  let strokes: number | null = null;
  if (comp.linescores && Array.isArray(comp.linescores)) {
    const ls = comp.linescores.find((l) => l.period === round);
    if (ls && typeof ls.value === 'number' && ls.value > 0) {
      strokes = ls.value;
    }
  }

  // Handle WD or CUT players with no valid round strokes
  if (isWD && (strokes === null || strokes === 0)) {
    return {
      roundStrokes: null,
      scoreToPar: null,
      formattedScore: 'WD',
      isUnderPar: false,
      isOverPar: false,
      isEven: false,
      isInactive: true,
      statusDetail: 'Withdrawn',
    };
  }

  if (isCut && (strokes === null || strokes === 0)) {
    return {
      roundStrokes: null,
      scoreToPar: null,
      formattedScore: 'CUT',
      isUnderPar: false,
      isOverPar: false,
      isEven: false,
      isInactive: true,
      statusDetail: 'Missed Cut',
    };
  }

  // First check explicit relative score on linescore (e.g. "-2", "+3", "E")
  const ls = comp.linescores?.find((l) => l.period === round);
  let derivedScoreToPar: number | null = null;

  if (ls?.displayValue) {
    const dv = ls.displayValue.trim();
    if (dv === 'E' || dv === 'EVEN') derivedScoreToPar = 0;
    else if (dv.startsWith('+') || dv.startsWith('-')) {
      const parsed = parseInt(dv.replace('+', ''), 10);
      if (!isNaN(parsed) && Math.abs(parsed) <= 30) {
        derivedScoreToPar = parsed;
      }
    }
  }

  if (strokes === null || strokes === 0) {
    return {
      roundStrokes: null,
      scoreToPar: null,
      formattedScore: '-',
      isUnderPar: false,
      isOverPar: false,
      isEven: false,
      isInactive: statusInfo.isInactive,
      statusDetail: statusInfo.badgeLabel || '',
    };
  }

  // If strokes is already relative (e.g. -5, +3, 0)
  if (Math.abs(strokes) <= 25) {
    derivedScoreToPar = strokes;
  }

  // Standard calculation if relative score wasn't directly found
  if (derivedScoreToPar === null) {
    // 1. Calculate course par from event 18-hole array if available
    let resolvedPar: number | null = null;
    if (eventCourseHoles && eventCourseHoles.length > 0) {
      const sum = eventCourseHoles.reduce((acc, p) => acc + (typeof p === 'number' && p > 0 ? p : 4), 0);
      if (sum > 50) resolvedPar = sum;
    }

    // 2. Use explicit coursePar parameter if valid
    if (resolvedPar === null && coursePar && coursePar > 50) {
      resolvedPar = coursePar;
    }

    // 3. Fallback: infer par from cumulative comp.score and completed linescores
    if (resolvedPar === null && comp.score && comp.linescores && comp.linescores.length > 0) {
      const scoreMeta = getScoreMeta(comp.score);
      const toPar = scoreMeta.formattedScore === 'E' ? 0 : parseInt(scoreMeta.formattedScore.replace('+', ''), 10);
      if (!isNaN(toPar)) {
        const completed = comp.linescores.filter((l) => typeof l.value === 'number' && l.value > 40);
        if (completed.length > 0) {
          const totalStrokes = completed.reduce((sum, l) => sum + (l.value || 0), 0);
          const inferredPar = Math.round((totalStrokes - toPar) / completed.length);
          if (inferredPar > 50) resolvedPar = inferredPar;
        }
      }
    }

    // Final fallback to PGA standard 72
    const finalPar = resolvedPar || 72;
    derivedScoreToPar = strokes - finalPar;
  }

  const formattedScore = formatScoreDisplay(derivedScoreToPar);
  const isUnderPar = derivedScoreToPar < 0;
  const isOverPar = derivedScoreToPar > 0;
  const isEven = derivedScoreToPar === 0;

  return {
    roundStrokes: strokes,
    scoreToPar: derivedScoreToPar,
    formattedScore,
    isUnderPar,
    isOverPar,
    isEven,
    isInactive: statusInfo.isInactive,
    statusDetail: statusInfo.badgeLabel || '',
  };
}

import espnCatalogData from './espnPlayerDirectory.json';

export const AUTHENTIC_ESPN_PGA_CATALOG: Array<{
  id: string;
  name: string;
  headshotUrl: string;
  country?: string;
  flag?: string;
}> = espnCatalogData;

export const SYNTHETIC_PGA_FIELD: ESPNCompetitor[] = AUTHENTIC_ESPN_PGA_CATALOG.map((item) => ({
  id: item.id,
  athlete: {
    id: item.id,
    displayName: item.name,
    isSynthetic: true,
    headshot: { href: item.headshotUrl },
    country: item.country ? { abbreviation: item.country } : undefined,
    flag: item.flag ? { href: item.flag } : undefined,
  },
}));

export function resolveEventCompetitorsWithFallback(
  eventComps?: ESPNCompetitor[] | null,
  fallbackComps?: ESPNCompetitor[] | null
): ESPNCompetitor[] {
  if (eventComps && eventComps.length > 0) {
    return eventComps;
  }
  if (fallbackComps && fallbackComps.length > 0) {
    return fallbackComps;
  }
  return SYNTHETIC_PGA_FIELD;
}

export const DEFAULT_PLAYER_DIRECTORY_MAP: Record<
  string,
  { id: string; name: string; headshotUrl?: string }
> = Object.fromEntries(
  AUTHENTIC_ESPN_PGA_CATALOG.map((c) => [
    c.id,
    {
      id: c.id,
      name: c.name,
      headshotUrl: c.headshotUrl,
    },
  ])
);



