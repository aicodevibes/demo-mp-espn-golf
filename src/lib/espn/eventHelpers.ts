import { ESPNCompetitor } from '@/types/espn';

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
  const finalIsCut = isCutByString || (missedCutByRounds && !isWD && !isDQ);
  const isInactive = finalIsCut || isWD || isDQ || isMDF;

  let badgeLabel = '';
  if (finalIsCut) badgeLabel = 'CUT';
  else if (isWD) badgeLabel = 'WD';
  else if (isDQ) badgeLabel = 'DQ';
  else if (isMDF) badgeLabel = 'MDF';

  return { isCut: finalIsCut, isWD, isDQ, isMDF, isInactive, badgeLabel };
}
