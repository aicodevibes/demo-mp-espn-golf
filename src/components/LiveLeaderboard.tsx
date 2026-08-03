'use client';

import React, { useState } from 'react';
import { ESPNCompetitor, ESPNEvent } from '@/types/espn';
import { Trophy, CheckCircle2, PlusCircle, Search, Calendar, Activity } from 'lucide-react';
import { GolferHeadshot } from './GolferHeadshot';
import { useAuth } from '@/context/AuthContext';
import { formatEventDates, getWinnerStatus } from '@/lib/espn/eventHelpers';

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


  return (
    <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 space-y-3 shadow-xl">
      {/* Header & Status Badges */}
      <div className="border-b border-slate-800 pb-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-emerald-400" /> Live Field Leaderboard
          </h3>
          <span className="text-xs font-semibold text-slate-400">
            {competitors.length} Field
          </span>
        </div>

        {/* Date & Event Status Subheader */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {formattedDates && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              <Calendar className="w-3 h-3 text-slate-400" /> {formattedDates}
            </span>
          )}

          {eventState === 'in' ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 animate-pulse">
              <Activity className="w-3 h-3 text-emerald-400" /> Live ({statusDetail})
            </span>
          ) : eventState === 'post' ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
              <Trophy className="w-3 h-3 text-amber-400" /> Final
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              Scheduled
            </span>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
        <input
          type="text"
          placeholder="Filter field golfers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Leaderboard Table List */}
      <div className="overflow-y-auto max-h-130 pr-1 space-y-1 scrollbar-thin">
        {filteredCompetitors.map((comp, idx) => {
          const playerId = comp.athlete?.id || comp.id || `comp-${idx}`;
          const isTracked = trackedSet.has(playerId);

          const isSelected = selectedPlayerId === playerId;
          const score = comp.score || 'E';
          const isUnderPar = score.startsWith('-');
          const isOverPar = score.startsWith('+');

          const winnerInfo = getWinnerStatus(comp, eventObj?.status, competitors);

          return (
            <div
              key={`${playerId}-${idx}`}
              onClick={() => onSelectPlayer?.(playerId)}
              className={`group flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                winnerInfo.isWinner
                  ? 'bg-amber-950/40 border-amber-500/60 text-amber-100 font-medium'
                  : isSelected
                  ? 'bg-emerald-950/40 border-emerald-500/80 text-white'
                  : 'bg-slate-950/50 hover:bg-slate-900 border-slate-800/80 text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-6 text-center font-bold text-slate-400">
                  {comp.status?.position?.displayName || comp.order || '-'}
                </span>

                <GolferHeadshot
                  name={comp.athlete?.displayName || 'Golfer'}
                  src={comp.athlete?.headshot?.href}
                  playerId={playerId}
                  size={28}
                />

                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-slate-200 group-hover:text-emerald-400 transition truncate max-w-27.5 sm:max-w-35">
                      {comp.athlete.displayName}
                    </p>

                    {winnerInfo.isWinner ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-400/50">
                        <Trophy className="w-3 h-3 text-amber-400" /> Champion
                      </span>
                    ) : winnerInfo.badgeLabel ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                        {winnerInfo.badgeLabel}
                      </span>
                    ) : null}
                  </div>

                  <p className="text-[10px] text-slate-400">
                    Thru: {comp.status?.thru || 'F'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`font-extrabold text-sm ${
                    isUnderPar
                      ? 'text-emerald-400'
                      : isOverPar
                      ? 'text-rose-400'
                      : 'text-slate-300'
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
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded transition ${
                      isTracked
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm'
                    }`}
                  >
                    {isTracked ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Tracked
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
        })}
      </div>
    </div>
  );
}
