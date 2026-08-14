import React from 'react';
import { Trophy } from 'lucide-react';
import { GolferHeadshot } from './GolferHeadshot';
import { NormalizedCompetitor } from '@/lib/espn';

interface TrackedPlayerHeroGridProps {
  trackedCompetitors: NormalizedCompetitor[];
  allCompetitors?: NormalizedCompetitor[];
  eventStatus?: any;
  rankDisplayMap?: Map<string, string>;
  selectedPlayerId?: string;
  onSelectPlayer?: (playerId: string) => void;
}

export function TrackedPlayerHeroGrid({
  trackedCompetitors,
  rankDisplayMap,
  selectedPlayerId,
  onSelectPlayer,
}: TrackedPlayerHeroGridProps) {
  if (!trackedCompetitors || trackedCompetitors.length === 0) {
    return (
      <div className="p-card rounded-xl bg-surface-container-low border border-outline-variant text-center">
        <Trophy className="w-8 h-8 text-secondary mx-auto mb-2" />
        <h4 className="text-sm font-semibold text-on-surface">No Golfers Displayed</h4>
        <p className="text-xs text-on-surface-variant mt-1">
          Leaderboard competitors will appear here once tournament data is live.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {trackedCompetitors.map((comp, idx) => {
        const playerId = comp.athlete?.id || comp.id || `player-${idx}`;
        const isSelected = selectedPlayerId === playerId;

        const score = comp.scoreDisplay ?? '-';
        const isUnderPar = Boolean(comp.scoreMeta?.isUnderPar);
        const isOverPar = Boolean(comp.scoreMeta?.isOverPar);
        const thru = comp.thruDisplay ?? '-';

        const statusInfo = comp.statusInfo || {
          isCut: false,
          isWD: false,
          isDQ: false,
          isWinner: false,
          badgeLabel: '',
          statusBadge: '',
        };

        const winnerInfo = {
          isWinner: Boolean(statusInfo.isWinner),
          badgeLabel: statusInfo.badgeLabel || statusInfo.statusBadge || '',
        };

        const computedRank =
          rankDisplayMap?.get(playerId) ||
          (comp.status?.position?.displayName && comp.status.position.displayName !== 'E' ? comp.status.position.displayName : null) ||
          (comp.order ? `${comp.order}` : '-');

        return (
          <div
            key={`${playerId}-${idx}`}
            onClick={() => onSelectPlayer?.(playerId)}
            className={`cursor-pointer group relative overflow-hidden rounded-xl border p-card transition-all duration-200 ${
              winnerInfo.isWinner
                ? 'bg-surface-container-lowest border-amber-500 shadow-md ring-2 ring-amber-500/20'
                : statusInfo.isCut
                ? 'bg-surface-container-high border-outline-variant opacity-75'
                : statusInfo.isWD
                ? 'bg-surface-container-high border-outline-variant opacity-75'
                : isSelected
                ? 'bg-surface-container-lowest border-tertiary shadow-md ring-2 ring-tertiary/20'
                : 'bg-surface-container-lowest hover:bg-surface-container-low border-outline-variant hover:border-outline'
            }`}
          >
            {/* Top Winner or Rank Badge */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-[11px] font-bold text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded border border-outline-variant/60">
                Pos: {computedRank}
              </span>

              {winnerInfo.isWinner ? (
                <span className="inline-flex items-center text-[11px] font-black text-amber-950 bg-amber-500 px-2.5 py-0.5 rounded-full shadow-xs">
                  {winnerInfo.badgeLabel}
                </span>
              ) : statusInfo.isCut ? (
                <span className="inline-flex items-center text-[10px] font-extrabold text-error bg-error/10 px-2 py-0.5 rounded border border-error/30">
                  Missed Cut
                </span>
              ) : statusInfo.isWD ? (
                <span className="inline-flex items-center text-[10px] font-extrabold text-secondary bg-secondary-container px-2 py-0.5 rounded border border-outline-variant">
                  Withdrawn
                </span>
              ) : winnerInfo.badgeLabel ? (
                <span className="inline-flex items-center text-[10px] font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded border border-outline-variant/60">
                  {winnerInfo.badgeLabel}
                </span>
              ) : null}
            </div>

            <div className="flex items-start justify-between gap-3">
              {/* Headshot & Bio */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <GolferHeadshot
                    name={comp.athlete?.displayName || 'Golfer'}
                    src={comp.athlete?.headshot?.href}
                    playerId={playerId}
                    size={48}
                    priority={idx < 4}
                  />

                  {comp.athlete?.flag?.href && (
                    <img
                      src={comp.athlete.flag.href}
                      alt={comp.athlete.country?.abbreviation || 'Flag'}
                      width={16}
                      height={16}
                      className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border border-surface-container-lowest shadow-xs"
                    />
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-bold text-on-surface group-hover:text-tertiary transition truncate max-w-30">
                    {comp.athlete?.displayName || 'Golfer'}
                  </h3>
                  <p className="text-[11px] text-on-surface-variant">
                    Thru: <span className="font-semibold text-on-surface">{thru}</span>
                  </p>
                </div>
              </div>

              {/* Total Score to Par */}
              <div className="text-right">
                <div
                  className={`text-xl font-black ${
                    isUnderPar
                      ? 'text-tertiary'
                      : isOverPar
                      ? 'text-error'
                      : 'text-on-surface-variant'
                  }`}
                >
                  {score}
                </div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-outline">
                  Total
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
