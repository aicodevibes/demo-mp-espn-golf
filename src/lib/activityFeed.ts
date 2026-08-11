import { Participant, ContestConfig } from '@/types/contest';
import { ESPNCompetitor } from '@/types/espn';
import {
  calculateDayMoneyWinners,
  createPlayerDraftedByMap,
} from '@/lib/scoring';
import { parsePositionNumber } from '@/lib/fieldLeaderboard';

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
  eventId?: string | null
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
        result.winners.forEach((w) => {
          events.push({
            id: `day_money_r${result.round}_${w.participantId}_${w.golferId}`,
            type: 'day_money',
            icon: 'DollarSign',
            title: `Round ${result.round} Day Money Winner`,
            subtitle: `${w.participantName} (${w.golferName} shot ${w.dailyScore}) • $${w.payout.toFixed(2)}`,
            timestamp: `Round ${result.round}`,
          });
        });
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
        const scoreDisplay = typeof comp.score === 'object' ? (comp.score?.displayValue || 'E') : (comp.score || 'E');
        const latestRound = comp.linescores?.length || 1;

        events.push({
          id: `drafted_leader_${golferId}`,
          type: 'drafted_leader',
          icon: 'Trophy',
          title: `Tournament Leader: ${golferName}`,
          subtitle: `Score: ${scoreDisplay} • Drafted by ${drafters.join(', ')}`,
          timestamp: `Round ${latestRound}`,
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

      if (comp.linescores && Array.isArray(comp.linescores)) {
        comp.linescores.forEach((ls) => {
          const round = ls.period || 1;
          if (ls.linescores && Array.isArray(ls.linescores)) {
            ls.linescores.forEach((holeLs: any, holeIdx: number) => {
              let isEagle = false;
              const diffStr = holeLs.scoreType?.displayValue;
              if (diffStr) {
                const diff = parseInt(diffStr, 10);
                if (!isNaN(diff) && diff <= -2) {
                  isEagle = true;
                }
              } else if (typeof holeLs.value === 'number' && typeof holeLs.par === 'number') {
                if (holeLs.value <= holeLs.par - 2) {
                  isEagle = true;
                }
              } else if (holeLs.scoreType?.name?.toLowerCase().includes('eagle')) {
                isEagle = true;
              }

              if (isEagle) {
                const holeNum = holeLs.period || holeIdx + 1;
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
