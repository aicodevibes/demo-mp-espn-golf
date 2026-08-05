import { Participant, ContestConfig } from '@/types/contest';
import { ESPNCompetitor } from '@/types/espn';
import {
  calculateDayMoneyWinners,
  calculateParticipantStandings,
  createPlayerDraftedByMap,
  getGolferRoundScoreToPar,
} from '@/lib/scoring';
import { getPlayerStatusInfo } from '@/lib/espn';

export type ActivityEventType = 'day_money' | 'birdie_streak' | 'cut' | 'top_10';

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
 * representing key tournament events (day money, birdie streaks/hot rounds, cut/WD, top 10 standings).
 */
export function generateTournamentActivityEvents(
  participants: Participant[] = [],
  competitors: ESPNCompetitor[] = [],
  contestConfig?: ContestConfig | null,
  eventStatus?: any
): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  const safeParticipants = Array.isArray(participants) ? participants : [];
  const safeCompetitors = Array.isArray(competitors) ? competitors : [];

  if (safeParticipants.length === 0 && safeCompetitors.length === 0) {
    return events;
  }

  const draftedMap = createPlayerDraftedByMap(safeParticipants);

  // 1. Day Money Events
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

  // 2. Birdie Streak / Hot Round Events
  try {
    safeCompetitors.forEach((comp) => {
      const golferId = comp.athlete?.id || comp.id;
      const golferName = comp.athlete?.displayName || comp.athlete?.shortName || `Golfer (${golferId})`;
      const drafters = draftedMap.get(golferId) || [];
      const drafterStr = drafters.length > 0 ? ` • Drafted by ${drafters.join(', ')}` : '';

      if (comp.linescores && Array.isArray(comp.linescores)) {
        comp.linescores.forEach((ls) => {
          const round = ls.period;
          if (!round || typeof ls.value !== 'number') return;

          const relScore = getGolferRoundScoreToPar(comp, round, contestConfig?.coursePar);
          // Highlight exceptional rounds: score-to-par <= -3 or low stroke score <= 68
          if ((relScore !== null && relScore <= -3) || (ls.value > 0 && ls.value <= 68)) {
            const relDisplay =
              relScore === null
                ? `${ls.value} strokes`
                : relScore === 0
                ? 'E'
                : relScore > 0
                ? `+${relScore}`
                : `${relScore}`;

            events.push({
              id: `birdie_streak_${golferId}_r${round}`,
              type: 'birdie_streak',
              icon: 'Flame',
              title: `Hot Round: ${golferName} (${relDisplay})`,
              subtitle: `Shot ${ls.value} in Round ${round}${drafterStr}`,
              timestamp: `Round ${round}`,
            });
          }
        });
      }
    });
  } catch (err) {
    console.error('Error generating birdie streak activity events:', err);
  }

  // 3. Cut / WD Events
  try {
    safeCompetitors.forEach((comp) => {
      const golferId = comp.athlete?.id || comp.id;
      const golferName = comp.athlete?.displayName || comp.athlete?.shortName || `Golfer (${golferId})`;
      const statusInfo = getPlayerStatusInfo(comp, eventStatus);

      if (statusInfo.isCut || statusInfo.isWD) {
        const drafters = draftedMap.get(golferId) || [];
        const label = statusInfo.isWD ? 'Withdrawn' : 'Missed Cut';
        const drafterStr =
          drafters.length > 0
            ? `Impacts: ${drafters.join(', ')}`
            : 'Full Field';

        events.push({
          id: `cut_${golferId}`,
          type: 'cut',
          icon: 'Scissors',
          title: `${golferName} - ${label}`,
          subtitle: `${drafterStr} • Score: ${comp.score || (statusInfo.isWD ? 'WD' : 'CUT')}`,
          timestamp: statusInfo.isWD ? 'WD' : 'Cut Line',
        });
      }
    });
  } catch (err) {
    console.error('Error generating cut activity events:', err);
  }

  // 4. Top 10 Standings Events
  try {
    const standings = calculateParticipantStandings(
      safeParticipants,
      safeCompetitors,
      contestConfig,
      eventStatus
    );

    const top10 = standings.filter((s) => s.rank <= 10 && !s.isCut);
    top10.forEach((s) => {
      const scoreDisplay = s.totalScore > 0 ? `+${s.totalScore}` : s.totalScore === 0 ? 'E' : `${s.totalScore}`;
      const payoutText = s.projectedPayout > 0 ? ` • Projected Payout $${s.projectedPayout.toFixed(2)}` : '';
      const rankBadge =
        s.rank === 1
          ? '🥇 Leader'
          : s.rank === 2
          ? '🥈 2nd Place'
          : s.rank === 3
          ? '🥉 3rd Place'
          : `#${s.rank} Standing`;

      events.push({
        id: `top_10_${s.participant.id}`,
        type: 'top_10',
        icon: 'Trophy',
        title: `${rankBadge}: ${s.participant.name}`,
        subtitle: `Score: ${scoreDisplay}${payoutText}`,
        timestamp: 'Live Standings',
      });
    });
  } catch (err) {
    console.error('Error generating top 10 activity events:', err);
  }

  return events;
}
