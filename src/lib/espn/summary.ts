import { ESPNCompetitor, ESPNPlayerSummary, ESPNRoundLinescore, ESPNHoleScore } from '@/types/espn';

export function formatPlayerSummaryFromCompetitor(comp: ESPNCompetitor): ESPNPlayerSummary {
  const rounds: ESPNRoundLinescore[] = (comp.linescores || []).map((rd: any, idx: number) => {
    const roundPeriod = rd.period || idx + 1;
    const roundValue = rd.value ? `${rd.value}` : rd.displayValue || '-';

    const holes: ESPNHoleScore[] = (rd.linescores || []).map((h: any, hIdx: number) => {
      const holeNum = h.period || hIdx + 1;
      const strokes = h.value || 0;
      const diffStr = h.scoreType?.displayValue || 'E';
      const diff = parseInt(diffStr, 10) || 0;
      const par = strokes > 0 ? (strokes - diff > 0 ? strokes - diff : 4) : 4;

      let scoreTypeLabel = 'par';
      if (diff <= -2) scoreTypeLabel = 'eagle';
      else if (diff === -1) scoreTypeLabel = 'birdie';
      else if (diff === 1) scoreTypeLabel = 'bogey';
      else if (diff >= 2) scoreTypeLabel = 'double';

      return {
        hole: holeNum,
        par: par,
        strokes: strokes,
        scoreType: scoreTypeLabel,
      };
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
