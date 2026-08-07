'use client';

import React, { useState } from 'react';
import { ESPNCompetitor, ESPNEvent } from '@/types/espn';
import { Trophy, CheckCircle2, PlusCircle, Search, Calendar, Activity } from 'lucide-react';
import { GolferHeadshot } from './GolferHeadshot';
import { useAuth } from '@/context/AuthContext';
import { formatEventDates, getWinnerStatus, getPlayerStatusInfo, getScoreMeta } from '@/lib/espn';

interface LiveLeaderboardProps {
  competitors: ESPNCompetitor[];
  eventObj?: ESPNEvent;
  selectedPlayerId?: string;
  onSelectPlayer?: (playerId: string) => void;
  trackedPlayerIds?: string[];
  onToggleTrackPlayer?: (comp: ESPNCompetitor) => void;
}

export function LiveLeaderboard({
  competitors,
  eventObj,
  selectedPlayerId,
  onSelectPlayer,
  trackedPlayerIds = [],
  onToggleTrackPlayer,
}: LiveLeaderboardProps) {
  const { isAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState<string>('');

  const formattedDates = formatEventDates(eventObj?.date, eventObj?.endDate);
  const eventState = eventObj?.status?.type?.state;
  const statusDetail = eventObj?.status?.type?.detail || 'Scheduled';

  // Vercel Performance Rule: rerender-memo & js-set-map-lookups
  const trackedSet = React.useMemo(
    () => new Set(trackedPlayerIds),
    [trackedPlayerIds]
  );

  const filteredCompetitors = React.useMemo(() => {
    if (!searchQuery.trim()) return competitors;
    const query = searchQuery.toLowerCase();
    return competitors.filter((comp) =>
      comp.athlete?.displayName?.toLowerCase().includes(query)
    );
  }, [competitors, searchQuery]);

  // Partition competitors into active vs cut/withdrawn (sorted to bottom under Cut Line)
  const { activeCompetitors, cutCompetitors } = React.useMemo(() => {
    const active: ESPNCompetitor[] = [];
    const cut: ESPNCompetitor[] = [];

    filteredCompetitors.forEach((comp) => {
      const status = getPlayerStatusInfo(comp, eventObj?.status);
      if (status.isInactive) {
        cut.push(comp);
      } else {
        active.push(comp);
      }
    });

    return { activeCompetitors: active, cutCompetitors: cut };
  }, [filteredCompetitors, eventObj]);

  if (competitors.length === 0) {
    return (
      <div className="rounded-xl bg-surface-container-low border border-outline-variant p-6 text-center space-y-2 shadow-xs">
        <Calendar className="w-8 h-8 text-secondary mx-auto" />
        <h3 className="text-sm font-bold text-on-surface">
          ⚪ Tournament Scheduled
        </h3>
        <p className="text-xs text-on-surface-variant max-w-xs mx-auto">
          The player field roster and tee times have not yet been released by ESPN for this event.
        </p>
      </div>
    );
  }

  const renderCompetitorRow = (comp: ESPNCompetitor, idx: number) => {
    const playerId = comp.athlete?.id || comp.id || `comp-${idx}`;
    const isTracked = trackedSet.has(playerId);
    const isSelected = selectedPlayerId === playerId;
    const { formattedScore: score, isUnderPar, isOverPar } = getScoreMeta(comp.score);

    const winnerInfo = getWinnerStatus(comp, eventObj?.status, competitors);
    const statusInfo = getPlayerStatusInfo(comp, eventObj?.status);

    return (
      <div
        key={`${playerId}-${idx}`}
        onClick={() => onSelectPlayer?.(playerId)}
        className={`group flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition ${
          winnerInfo.isWinner
            ? 'bg-amber-50 border-amber-400 text-amber-950 font-medium'
            : statusInfo.isCut
            ? 'bg-surface-container-high border-outline-variant/60 text-on-surface-variant opacity-75'
            : statusInfo.isWD
            ? 'bg-surface-container-high border-outline-variant/60 text-on-surface-variant opacity-75'
            : isSelected
            ? 'bg-primary-container border-primary-container text-on-primary-container font-semibold'
            : 'bg-surface-container-lowest hover:bg-surface-container border-outline-variant/80 text-on-surface'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span className="w-8 text-center font-bold">
            {statusInfo.isCut ? (
              <span className="px-1.5 py-0.5 rounded bg-error/15 text-error border border-error/30 font-extrabold text-[10px]">
                CUT
              </span>
            ) : statusInfo.isWD ? (
              <span className="px-1.5 py-0.5 rounded bg-secondary-container text-secondary border border-outline-variant font-extrabold text-[10px]">
                WD
              </span>
            ) : (
              <span className="text-on-surface-variant">
                {comp.status?.position?.displayName || comp.order || '-'}
              </span>
            )}
          </span>

          <GolferHeadshot
            name={comp.athlete?.displayName || 'Golfer'}
            src={comp.athlete?.headshot?.href}
            playerId={playerId}
            size={28}
          />

          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-on-surface group-hover:text-tertiary transition truncate max-w-27.5 sm:max-w-35">
                {comp.athlete.displayName}
              </p>

              {winnerInfo.isWinner ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-900 bg-amber-200 px-1.5 py-0.5 rounded border border-amber-400">
                  <Trophy className="w-3 h-3 text-amber-700" /> Champion
                </span>
              ) : winnerInfo.badgeLabel ? (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded border border-outline-variant/60">
                  {winnerInfo.badgeLabel}
                </span>
              ) : null}
            </div>

            <p className="text-[10px] text-on-surface-variant">
              Thru: {comp.status?.thru || 'F'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`font-extrabold text-sm ${
              isUnderPar
                ? 'text-tertiary'
                : isOverPar
                ? 'text-error'
                : 'text-on-surface-variant'
            }`}
          >
            {score}
          </span>

          {/* Admin Track / Untrack Button */}
          {isAdmin && onToggleTrackPlayer && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleTrackPlayer(comp);
              }}
              title={isTracked ? 'Remove from watchlist' : 'Add to watchlist'}
              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded transition cursor-pointer ${
                isTracked
                  ? 'bg-tertiary/15 text-tertiary border border-tertiary/40'
                  : 'bg-tertiary text-on-tertiary hover:bg-tertiary/90 shadow-xs'
              }`}
            >
              {isTracked ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-tertiary" /> Tracked
                </>
              ) : (
                <>
                  <PlusCircle className="w-3 h-3" /> + Track
                </>
              )}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-xl bg-surface-container-low border border-outline-variant p-4 space-y-3 shadow-xs">
      {/* Header & Status Badges */}
      <div className="border-b border-outline-variant pb-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
            <Trophy className="w-4 h-4 text-tertiary" /> Live Field Leaderboard
          </h3>
          <span className="text-xs font-semibold text-on-surface-variant">
            {competitors.length} Field
          </span>
        </div>

        {/* Date & Event Status Subheader */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {formattedDates && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-on-secondary-container bg-secondary-container px-2 py-0.5 rounded border border-outline-variant/60">
              <Calendar className="w-3 h-3 text-secondary" /> {formattedDates}
            </span>
          )}

          {eventState === 'in' ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-on-tertiary bg-tertiary px-2 py-0.5 rounded shadow-xs animate-pulse">
              <Activity className="w-3 h-3 text-white" /> Live ({statusDetail})
            </span>
          ) : eventState === 'post' ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-on-primary-container bg-primary-container px-2 py-0.5 rounded border border-primary-container">
              <Trophy className="w-3 h-3 text-tertiary" /> Final
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-on-secondary-container bg-secondary-container px-2 py-0.5 rounded border border-outline-variant/60">
              Scheduled
            </span>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-outline" />
        <input
          type="text"
          placeholder="Filter field golfers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg pl-9 pr-3 py-1.5 text-xs text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-tertiary"
        />
      </div>

      {/* Leaderboard Table List with Cut Line Separator */}
      <div className="overflow-y-auto max-h-130 pr-1 space-y-1 scrollbar-thin">
        {/* Active / Made Cut Golfers */}
        {activeCompetitors.map((comp, idx) => renderCompetitorRow(comp, idx))}

        {/* ✂️ 36-Hole Cut Line Divider */}
        {cutCompetitors.length > 0 && (
          <div className="flex items-center gap-2 py-2 px-1 my-2">
            <div className="h-px bg-error/30 flex-1" />
            <span className="text-[10px] font-extrabold tracking-wider uppercase text-error bg-error/10 px-2.5 py-0.5 rounded-full border border-error/30 shadow-xs">
              ✂️ 36-Hole Cut Line ({cutCompetitors.length} Cut / WD)
            </span>
            <div className="h-px bg-error/30 flex-1" />
          </div>
        )}

        {/* Cut / Withdrawn Golfers */}
        {cutCompetitors.map((comp, idx) => renderCompetitorRow(comp, activeCompetitors.length + idx))}
      </div>
    </div>
  );
}
