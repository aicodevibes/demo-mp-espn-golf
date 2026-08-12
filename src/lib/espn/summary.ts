import { ESPNCompetitor, ESPNPlayerSummary, ESPNRoundLinescore, ESPNHoleScore } from '@/types/espn';

export function formatPlayerSummaryFromESPNData(
  rawSummary: any,
  fallbackComp?: ESPNCompetitor | null,
  eventCourseHoles?: number[]
): ESPNPlayerSummary {
  if (!rawSummary && !fallbackComp) {
    return {
      player: { id: '', displayName: 'Golfer' },
      rounds: [],
    };
  }

  const sourceData = rawSummary || fallbackComp;
  const profile = sourceData.profile || sourceData.athlete || fallbackComp?.athlete;
  const rawRounds: any[] = sourceData.rounds || sourceData.linescores || fallbackComp?.linescores || [];

  // Map to hold known hole pars across rounds (e.g., hole 1 -> 4, hole 2 -> 5)
  const knownHoleParsMap = new Map<number, number>();

  // Pass 0: Pre-populate from explicit courseHoles list if provided by event or API
  const courseHolesList: number[] = rawSummary?.courseHoles || eventCourseHoles || [];
  courseHolesList.forEach((parVal, hIdx) => {
    if (typeof parVal === 'number' && parVal > 0 && hIdx < 18) {
      knownHoleParsMap.set(hIdx + 1, parVal);
    }
  });

  // Pass 1: Gather any explicit hole pars from all available rounds/linescores
  rawRounds.forEach((rd: any) => {
    (rd.linescores || []).forEach((h: any, hIdx: number) => {
      const holeNum = h.period || hIdx + 1;
      const strokes = h.value || 0;
      const diffStr = h.scoreType?.displayValue || 'E';
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

  // Pass 2: Format each round's 18 holes
  const rounds: ESPNRoundLinescore[] = rawRounds.map((rd: any, idx: number) => {
    const roundPeriod = rd.period || idx + 1;
    const roundValue = rd.value !== undefined && rd.value !== 0 ? `${rd.value}` : rd.displayValue || '-';

    const rawHolesMap = new Map<number, ESPNHoleScore>();
    (rd.linescores || []).forEach((h: any, hIdx: number) => {
      const holeNum = h.period || hIdx + 1;
      const strokes = h.value || 0;
      const diffStr = h.scoreType?.displayValue || 'E';
      const diff = parseInt(diffStr, 10) || 0;

      let par = knownHoleParsMap.get(holeNum) || 4;
      if (typeof h.par === 'number' && h.par > 0) {
        par = h.par;
      } else if (strokes > 0 && diff !== undefined && !isNaN(diff) && strokes - diff > 0) {
        par = strokes - diff;
      }

      let scoreTypeLabel = 'par';
      if (strokes === 0) {
        scoreTypeLabel = 'unplayed';
      } else if (diff <= -2) {
        scoreTypeLabel = 'eagle';
      } else if (diff === -1) {
        scoreTypeLabel = 'birdie';
      } else if (diff === 1) {
        scoreTypeLabel = 'bogey';
      } else if (diff >= 2) {
        scoreTypeLabel = 'double';
      }

      rawHolesMap.set(holeNum, {
        hole: holeNum,
        par,
        strokes,
        scoreType: scoreTypeLabel,
      });
    });

    const holes: ESPNHoleScore[] = Array.from({ length: 18 }, (_, i) => {
      const holeNum = i + 1;
      const fallbackPar = knownHoleParsMap.get(holeNum) || 4;
      return (
        rawHolesMap.get(holeNum) || {
          hole: holeNum,
          par: fallbackPar,
          strokes: 0,
          scoreType: 'unplayed',
        }
      );
    });

    return {
      period: roundPeriod,
      displayValue: roundValue,
      holes,
    };
  });

  return {
    player: {
      id: profile?.id || fallbackComp?.athlete?.id || fallbackComp?.id || '',
      displayName: profile?.displayName || fallbackComp?.athlete?.displayName || 'Golfer',
      headshotUrl:
        typeof profile?.headshot === 'string'
          ? profile.headshot
          : profile?.headshot?.href || fallbackComp?.athlete?.headshot?.href,
    },
    rounds,
  };
}

export function formatPlayerSummaryFromCompetitor(
  comp: ESPNCompetitor,
  eventCourseHoles?: number[]
): ESPNPlayerSummary {
  return formatPlayerSummaryFromESPNData(comp, comp, eventCourseHoles);
}

export function createSyntheticCompetitor(
  playerId: string,
  displayName?: string,
  headshotUrl?: string,
  country?: string
): ESPNCompetitor {
  return {
    id: playerId,
    score: '-',
    athlete: {
      id: playerId,
      displayName: displayName || `Golfer (${playerId})`,
      headshot: { href: headshotUrl || '' },
      country: { abbreviation: country || '' },
    },
  } as ESPNCompetitor;
}

