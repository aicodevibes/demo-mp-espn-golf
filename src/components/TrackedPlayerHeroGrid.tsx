'use client';

import React from 'react';
import { ESPNCompetitor } from '@/types/espn';
import { UserCheck, Activity } from 'lucide-react';
import { GolferHeadshot } from './GolferHeadshot';

interface TrackedPlayerHeroGridProps {
  trackedCompetitors: ESPNCompetitor[];
  loading?: boolean;
  selectedPlayerId?: string;
  onSelectPlayer?: (playerId: string) => void;
}

export function TrackedPlayerHeroGrid({
  trackedCompetitors,
  loading,
  selectedPlayerId,
  onSelectPlayer,
}: TrackedPlayerHeroGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-slate-900/60 rounded-xl animate-pulse border border-slate-800" />
        ))}
      </div>
    );
  }

  if (!trackedCompetitors || trackedCompetitors.length === 0) {
    return (
      <div className="p-6 rounded-xl bg-slate-900/40 border border-dashed border-slate-800 text-center">
        <UserCheck className="w-8 h-8 text-emerald-500/60 mx-auto mb-2" />
        <p className="text-sm text-slate-300 font-medium">No golfers currently in your tracking list.</p>
        <p className="text-xs text-slate-400 mt-1">Sign in with Google to add golfers to your custom dashboard.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {trackedCompetitors.map((comp, idx) => {
        const playerId = comp.athlete?.id || comp.id || `player-${idx}`;
        const isSelected = selectedPlayerId === playerId;
        const score = comp.score || 'E';
        const isUnderPar = score.startsWith('-');
        const isOverPar = score.startsWith('+');

        return (
          <div
            key={`${playerId}-${idx}`}
            onClick={() => onSelectPlayer?.(playerId)}
            className={`cursor-pointer group relative overflow-hidden rounded-xl border p-4 transition-all duration-200 ${

              isSelected
                ? 'bg-linear-to-b from-emerald-950/60 to-slate-900 border-emerald-500 shadow-lg shadow-emerald-950/40'
                : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
            }`}
          >
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
                      className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border border-slate-900"
                    />
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-100 group-hover:text-emerald-400 transition truncate max-w-30">
                    {comp.athlete.displayName}
                  </h3>

                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                    <span className="font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      Pos: #{comp.order || '-'}
                    </span>
                    <span className="truncate">
                      {comp.status?.thru ? `Thru ${comp.status.thru}` : 'Scheduled'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Par Score Badge */}
              <div className="text-right">
                <span
                  className={`inline-block font-extrabold text-xl tracking-tight ${
                    isUnderPar
                      ? 'text-emerald-400'
                      : isOverPar
                      ? 'text-rose-400'
                      : 'text-slate-200'
                  }`}
                >
                  {score}
                </span>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Total
                </p>
              </div>
            </div>

            {/* Selection indicator bar */}
            {isSelected && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 rounded-b-xl" />
            )}
          </div>
        );
      })}
    </div>
  );
}
