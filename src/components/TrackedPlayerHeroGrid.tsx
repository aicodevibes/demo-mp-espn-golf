'use client';

import React from 'react';
import { ESPNCompetitor } from '@/types/espn';
import { Trophy, Activity, Award } from 'lucide-react';
import { GolferHeadshot } from './GolferHeadshot';
import { getWinnerStatus } from '@/lib/espn';


interface TrackedPlayerHeroGridProps {
  trackedCompetitors: ESPNCompetitor[];
  allCompetitors?: ESPNCompetitor[];
  eventStatus?: any;
  selectedPlayerId?: string;
  onSelectPlayer?: (playerId: string) => void;
}

export function TrackedPlayerHeroGrid({
  trackedCompetitors,
  allCompetitors = [],
  eventStatus,
  selectedPlayerId,
  onSelectPlayer,
}: TrackedPlayerHeroGridProps) {
  if (!trackedCompetitors || trackedCompetitors.length === 0) {
    return (
      <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800 text-center">
        <Trophy className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <h4 className="text-sm font-semibold text-slate-300">No Tracked Golfers Selected</h4>
        <p className="text-xs text-slate-400 mt-1">
          Use the Admin Controls to pin golfers to your main hero watchlist.
        </p>
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

        const winnerInfo = getWinnerStatus(comp, eventStatus, allCompetitors.length > 0 ? allCompetitors : trackedCompetitors);

        return (
          <div
            key={`${playerId}-${idx}`}
            onClick={() => onSelectPlayer?.(playerId)}
            className={`cursor-pointer group relative overflow-hidden rounded-xl border p-4 transition-all duration-200 ${
              winnerInfo.isWinner
                ? 'bg-linear-to-b from-amber-950/60 to-slate-900 border-amber-400 shadow-xl shadow-amber-950/50'
                : isSelected
                ? 'bg-linear-to-b from-emerald-950/60 to-slate-900 border-emerald-500 shadow-lg shadow-emerald-950/40'
                : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
            }`}
          >
            {/* Top Winner or Rank Badge */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-[11px] font-bold text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
                Pos: {comp.status?.position?.displayName || comp.order || '-'}
              </span>

              {winnerInfo.isWinner ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-400 shadow-sm animate-pulse">
                  <Trophy className="w-3 h-3 text-amber-400" /> {winnerInfo.badgeLabel}
                </span>
              ) : winnerInfo.badgeLabel ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
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
                      className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border border-slate-900"
                    />
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-100 group-hover:text-emerald-400 transition truncate max-w-30">
                    {comp.athlete.displayName}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Thru: <span className="font-semibold text-slate-300">{comp.status?.thru || 'F'}</span>
                  </p>
                </div>
              </div>

              {/* Total Score to Par */}
              <div className="text-right">
                <div
                  className={`text-xl font-black ${
                    isUnderPar
                      ? 'text-emerald-400'
                      : isOverPar
                      ? 'text-rose-400'
                      : 'text-slate-300'
                  }`}
                >
                  {score}
                </div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
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
