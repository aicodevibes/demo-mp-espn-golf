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

export function getPlayerStatusInfo(comp: ESPNCompetitor): PlayerStatusInfo {
  if (!comp || !comp.status) {
    return { isCut: false, isWD: false, isDQ: false, isMDF: false, isInactive: false, badgeLabel: '' };
  }

  const pos = (comp.status?.position?.displayName || '').toUpperCase();
  const typeName = (comp.status?.type?.name || '').toUpperCase();
  const detail = (comp.status?.type?.detail || '').toUpperCase();

  const isCut = pos === 'CUT' || typeName === 'STATUS_CUT' || detail.includes('CUT');
  const isWD = pos === 'WD' || typeName === 'STATUS_WITHDRAWN' || detail.includes('WITHDRAWN') || detail.includes('WD');
  const isDQ = pos === 'DQ' || typeName === 'STATUS_DISQUALIFIED' || detail.includes('DISQUALIFIED');
  const isMDF = pos === 'MDF' || detail.includes('MDF');

  const isInactive = isCut || isWD || isDQ || isMDF;

  let badgeLabel = '';
  if (isCut) badgeLabel = 'CUT';
  else if (isWD) badgeLabel = 'WD';
  else if (isDQ) badgeLabel = 'DQ';
  else if (isMDF) badgeLabel = 'MDF';

  return { isCut, isWD, isDQ, isMDF, isInactive, badgeLabel };
}

