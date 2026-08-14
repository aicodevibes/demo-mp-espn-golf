import { Participant, ContestConfig } from '@/types/contest';
import { ESPNCompetitor } from '@/types/espn';
import {
  calculateDayMoneyWinners,
  createPlayerDraftedByMap,
} from '@/lib/scoring';
import { parsePositionNumber } from '@/lib/domain';
import { normalizeCompetitor, NormalizedCompetitor } from '@/lib/espn';

export type ActivityEventType = 'day_money' | 'drafted_leader' | 'eagle';

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  icon: string;
  title: string;
  subtitle: string;
  timestamp: string;
}

/**
 * Analyzes current tournament state and returns an array of activity items
 * representing key tournament highlights:
 * 1. Day Money Winners at round completion
 * 2. Drafted PGA Players leading the tournament after any round
 * 3. Eagles recorded by drafted PGA players
 */
export function generateTournamentActivityEvents(
  participants: Participant[] = [],
  competitors: ESPNCompetitor[] = [],
  contestConfig?: ContestConfig | null,
  eventStatus?: any,
  eventId?: string | null,
  playerSummaries?: Map<string, any>
): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  const safeParticipants = Array.isArray(participants) ? participants : [];
  const safeCompetitors = Array.isArray(competitors) ? competitors : [];

  // Guard: if eventId is provided and contestConfig has an espnEventId that doesn't match, return empty events
  if (eventId && contestConfig?.espnEventId && contestConfig.espnEventId !== eventId) {
    return events;
  }

  if (safeParticipants.length === 0 && safeCompetitors.length === 0) {
    return events;
  }

  const draftedMap = createPlayerDraftedByMap(safeParticipants);

  // 1. Day Money Events (End of Round Winners)
  try {
    const dayMoneyResults = calculateDayMoneyWinners(
      safeParticipants,
      safeCompetitors,
      contestConfig,
      eventStatus
    );

    dayMoneyResults.forEach((result) => {
      if (result.winners && result.winners.length > 0 && result.lowScore !== null) {
        if (!eventStatus || result.isCompleted || result.winners.some((w) => w.isCompleted || w.payout > 0)) {
        result.winners.forEach((w) => {
          events.push({
            id: `day_money_r${result.round}_${w.participantId}_${w.golferId}`,
            type: 'day_money',
            icon: 'DollarSign',
            title: `Round ${result.round} Day Money Winner`,
            subtitle: `${w.participantName} (${w.golferName} shot ${w.dailyScore}) • $${(w.payout || (result.totalPool / result.winners.length)).toFixed(2)}`,
            timestamp: `Round ${result.round}`,
          });
        });
      }
    }
  });
  } catch (err) {
    console.error('Error generating day money activity events:', err);
  }

  // 2. Drafted PGA Players Leading the Tournament
  try {
    safeCompetitors.forEach((comp) => {
      const golferId = comp.athlete?.id || comp.id;
      const drafters = draftedMap.get(golferId) || [];
      if (drafters.length === 0) return;

      const pos = parsePositionNumber(comp);
      if (pos === 1) {
        const golferName = comp.athlete?.displayName || comp.athlete?.shortName || `Golfer (${golferId})`;
        const normComp = 'scoreDisplay' in comp ? (comp as NormalizedCompetitor) : normalizeCompetitor(comp, eventStatus);
        const scoreDisplay = normComp.scoreDisplay;
        const completedRounds = (comp.linescores || []).filter(
          (ls: any) => typeof ls.value === 'number' && ls.value > 0
        ).length;
        const isCurrentlyPlaying = comp.status?.type?.state === 'in';
        const activeRound = isCurrentlyPlaying
          ? comp.status?.period || completedRounds + 1
          : completedRounds > 0
          ? completedRounds
          : eventStatus?.period || comp.status?.period || 1;

        events.push({
          id: `drafted_leader_${golferId}`,
          type: 'drafted_leader',
          icon: 'Trophy',
          title: `Tournament Leader: ${golferName}`,
          subtitle: `Score: ${scoreDisplay} • Drafted by ${drafters.join(', ')}`,
          timestamp: `Round ${activeRound}`,
        });
      }
    });
  } catch (err) {
    console.error('Error generating drafted leader activity events:', err);
  }

  // 3. Drafted Player Eagle Events
  try {
    safeCompetitors.forEach((comp) => {
      const golferId = comp.athlete?.id || comp.id;
      const drafters = draftedMap.get(golferId) || [];
      if (drafters.length === 0) return;

      const golferName = comp.athlete?.displayName || comp.athlete?.shortName || `Golfer (${golferId})`;
      const drafterStr = ` • Drafted by ${drafters.join(', ')}`;

      let summary: any = null;
      if (playerSummaries instanceof Map) {
        summary = playerSummaries.get(golferId);
      } else if (playerSummaries && typeof playerSummaries === 'object') {
        const sumId = (playerSummaries as any).id || (playerSummaries as any).athlete?.id;
        if (sumId === golferId || !sumId) {
          summary = playerSummaries;
        }
      }
      const roundSources: any[] = summary?.rounds || comp.linescores || comp.rounds || [];

      if (Array.isArray(roundSources)) {
        roundSources.forEach((ls: any, rdIdx: number) => {
          const round = ls.period || rdIdx + 1;
          const holeList: any[] = ls.linescores || ls.holes || ls.scorecard || ls.lineScores || [];

          if (Array.isArray(holeList)) {
            holeList.forEach((holeLs: any, holeIdx: number) => {
              let isEagle = false;
              const holeNum = holeLs.period || holeLs.hole || holeIdx + 1;

              // 1. Check scoreType object
              if (holeLs.scoreType) {
                const stName = String(holeLs.scoreType?.name || holeLs.scoreType?.displayName || '').toLowerCase();
                const stDisp = String(holeLs.scoreType?.displayValue || '').trim();
                const stId = String(holeLs.scoreType?.id || '');

                if (stName.includes('eagle') || stName.includes('albatross') || stName.includes('double eagle')) {
                  isEagle = true;
                } else if (stDisp.startsWith('-')) {
                  const diff = parseInt(stDisp.replace('-', ''), 10);
                  if (!isNaN(diff) && diff >= 2) {
                    isEagle = true;
                  }
                } else if (stId === '3' || stId === '4') {
                  isEagle = true;
                }
              }

              // 2. Check strokes vs par (e.g. 3 on Par 5, 2 on Par 4)
              const strokes = typeof holeLs.value === 'number' ? holeLs.value : (typeof holeLs.strokes === 'number' ? holeLs.strokes : null);
              const par = typeof holeLs.par === 'number' ? holeLs.par : null;
              if (!isEagle && strokes !== null && par !== null && par > 0 && strokes > 0) {
                if (strokes <= par - 2) {
                  isEagle = true;
                }
              }

              // 3. Check direct displayValue or relativeScore (e.g. "-2", "-3")
              if (!isEagle) {
                const dv = String(holeLs.displayValue || holeLs.relativeScore || '').trim();
                if (dv === '-2' || dv === '-3' || dv === '-4') {
                  isEagle = true;
                }
              }

              if (isEagle) {
                events.push({
                  id: `eagle_${golferId}_r${round}_h${holeNum}`,
                  type: 'eagle',
                  icon: 'Flame',
                  title: `Eagle Highlight: ${golferName}`,
                  subtitle: `Round ${round}, Hole ${holeNum}${drafterStr}`,
                  timestamp: `Round ${round}`,
                });
              }
            });
          }
        });
      }
    });
  } catch (err) {
    console.error('Error generating eagle activity events:', err);
  }

  return events;
}
