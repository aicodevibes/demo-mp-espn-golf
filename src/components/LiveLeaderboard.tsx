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
        {competitors.map((comp) => {
          const isTracked = trackedPlayerIds.includes(comp.athlete.id);
          const isSelected = selectedPlayerId === comp.athlete.id;
          const score = comp.score || 'E';
          const isUnderPar = score.startsWith('-');
          const isOverPar = score.startsWith('+');

          return (
            <div
              key={comp.athlete.id}
              onClick={() => onSelectPlayer?.(comp.athlete.id)}
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
                    title={isTracked ? 'Remove from tracking' : 'Add to tracking'}
                    className={`p-1 rounded transition ${
                      isTracked
                        ? 'text-emerald-400 hover:text-emerald-300'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {isTracked ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <PlusCircle className="w-4 h-4 text-slate-400 hover:text-emerald-400" />
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
