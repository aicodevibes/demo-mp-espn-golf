'use client';

import React from 'react';
import { ESPNCompetitor } from '@/types/espn';
import { Trophy, CheckCircle2, PlusCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface LiveLeaderboardProps {
  competitors: ESPNCompetitor[];
  loading?: boolean;
  trackedPlayerIds: string[];
  onToggleTrackPlayer?: (competitor: ESPNCompetitor) => void;
  onSelectPlayer?: (playerId: string) => void;
  selectedPlayerId?: string;
}

export function LiveLeaderboard({
  competitors,
  loading,
  trackedPlayerIds,
  onToggleTrackPlayer,
  onSelectPlayer,
  selectedPlayerId,
}: LiveLeaderboardProps) {
  const { isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-4 animate-pulse space-y-3">
        <div className="h-5 w-32 bg-slate-800 rounded" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 bg-slate-800/60 rounded" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 space-y-3 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-emerald-400" /> Tournament Leaderboard
        </h3>
        <span className="text-[11px] font-semibold text-slate-400">
          {competitors.length} Field Players
        </span>
      </div>

      <div className="overflow-y-auto max-h-130 pr-1 space-y-1 scrollbar-thin">
        {competitors.map((comp, idx) => {
          const playerId = comp.athlete?.id || comp.id || `comp-${idx}`;
          const isTracked = trackedPlayerIds.includes(playerId);
          const isSelected = selectedPlayerId === playerId;
          const score = comp.score || 'E';
          const isUnderPar = score.startsWith('-');
          const isOverPar = score.startsWith('+');

          return (
            <div
              key={`${playerId}-${idx}`}
              onClick={() => onSelectPlayer?.(playerId)}
              className={`group flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition ${

                isSelected
                  ? 'bg-emerald-950/40 border-emerald-500/80 text-white'
                  : 'bg-slate-950/50 hover:bg-slate-900 border-slate-800/80 text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-6 text-center font-bold text-slate-400">
                  {comp.order || '-'}
                </span>
                <img
                  src={comp.athlete.headshot?.href || 'https://a.espncdn.com/i/headshots/golf/players/full/default.png'}
                  alt={comp.athlete.displayName}
                  className="w-7 h-7 rounded-full object-cover bg-slate-800 border border-slate-700"
                />
                <div>
                  <p className="font-semibold text-slate-200 group-hover:text-emerald-400 transition truncate max-w-27.5 sm:max-w-35">
                    {comp.athlete.displayName}
                  </p>
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

