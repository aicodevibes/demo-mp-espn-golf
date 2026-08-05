import { ESPNCompetitor, ESPNPlayerSummary, ESPNRoundLinescore, ESPNHoleScore } from '@/types/espn';

export function formatPlayerSummaryFromCompetitor(comp: ESPNCompetitor): ESPNPlayerSummary {
  const rounds: ESPNRoundLinescore[] = (comp.linescores || []).map((rd: any, idx: number) => {
    const roundPeriod = rd.period || idx + 1;
    const roundValue = rd.value ? `${rd.value}` : rd.displayValue || '-';

    const rawHolesMap = new Map<number, ESPNHoleScore>();
    (rd.linescores || []).forEach((h: any, hIdx: number) => {
      const holeNum = h.period || hIdx + 1;
      const strokes = h.value || 0;
      const diffStr = h.scoreType?.displayValue || 'E';
      const diff = parseInt(diffStr, 10) || 0;
      const par = strokes > 0 ? (strokes - diff > 0 ? strokes - diff : 4) : 4;

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
      return (
        rawHolesMap.get(holeNum) || {
          hole: holeNum,
          par: 4,
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
      id: comp.athlete?.id || comp.id,
      displayName: comp.athlete?.displayName || 'Golfer',
      headshotUrl: comp.athlete?.headshot?.href,
    },
    rounds,
  };
}

export function createSyntheticCompetitor(
  playerId: string,
  displayName?: string,
  headshotUrl?: string,
  country?: string
): ESPNCompetitor {
  return {
    id: playerId,
    score: 'E',
    athlete: {
      id: playerId,
      displayName: displayName || `Golfer (${playerId})`,
      headshot: { href: headshotUrl || '' },
      country: { abbreviation: country || '' },
    },
  } as ESPNCompetitor;
}
