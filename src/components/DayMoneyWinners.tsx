'use client';

import React from 'react';
import { DayMoneyRoundResult, ContestConfig } from '@/types/contest';
import { DollarSign, Trophy, Award } from 'lucide-react';

interface DayMoneyWinnersProps {
  dayMoneyResults: DayMoneyRoundResult[];
  contestConfig: ContestConfig | null;
  eventStatus?: any;
  loading?: boolean;
}

export function DayMoneyWinners({ dayMoneyResults, contestConfig, eventStatus, loading }: DayMoneyWinnersProps) {
  if (loading) {
    return (
      <div className="p-card rounded-xl bg-surface-container-low border border-outline-variant animate-pulse space-y-4">
        <div className="h-6 w-48 bg-surface-container-high rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((d) => (
            <div key={d} className="h-32 bg-surface-container-lowest rounded-lg border border-outline-variant/60" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-surface-container-low border border-outline-variant p-card space-y-4 shadow-xs">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-outline-variant pb-3">
        <h3 className="text-sm font-black uppercase tracking-wider text-on-surface">
          Day Money Winners (${(contestConfig?.dayMoneyPool ?? 75).toFixed(2)} / Day)
        </h3>
        <span className="hidden sm:inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant border border-outline-variant/60">
          Daily Side Pool
        </span>
      </div>

      {/* 4-Day Winners Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {dayMoneyResults.map((result) => {
          const hasWinners = result.winners && result.winners.length > 0;
          const isRoundComplete =
            eventStatus?.type?.state === 'post' ||
            (eventStatus?.period && eventStatus.period > result.round);
          const isTie = result.winners && result.winners.length > 1;

          return (
            <div
              key={result.round}
              className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 flex flex-col justify-between space-y-3 transition hover:border-outline"
            >
              {/* Day Header */}
              <div className="flex items-center justify-between border-b border-outline-variant/60 pb-2">
                <span className="text-xs font-bold text-on-surface">Day {result.round} Money</span>
                {result.lowScore !== null ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-black text-tertiary bg-tertiary/15 px-2 py-0.5 rounded border border-tertiary/30">
                    {isRoundComplete ? 'Low' : 'Projected Low'}: {result.lowScore}
                  </span>
                ) : (
                  <span className="text-[10px] text-on-surface-variant bg-surface-container px-2 py-0.5 rounded">
                    Pending
                  </span>
                )}
              </div>

              {/* Winners Body */}
              <div className="space-y-2 min-h-16">
                {!hasWinners ? (
                  <div className="text-center py-3">
                    <Award className="w-5 h-5 text-outline mx-auto mb-1 opacity-60" />
                    <p className="text-[11px] text-on-surface-variant">Round in progress / pending</p>
                  </div>
                ) : (
                  result.winners.map((w, idx) => (
                    <div
                      key={`${w.participantId}-${idx}`}
                      className="flex items-center justify-between p-1.5 rounded bg-surface-container-low border border-outline-variant/40 text-xs"
                    >
                      <div>
                        <p className="font-bold text-on-surface">{w.participantName}</p>
                        <p className="text-[10px] text-on-surface-variant font-medium truncate max-w-28">
                          {w.golferName}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-black text-tertiary text-xs">
                          ${w.payout.toFixed(2)}
                        </span>
                        {isTie && (
                          <div className="text-[9px] font-bold text-secondary uppercase">Tie Split</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer Purse Indicator */}
              <div className="pt-2 border-t border-outline-variant/40 flex items-center justify-between text-[10px] text-on-surface-variant">
                <span>Purse: ${result.totalPool.toFixed(2)}</span>
                {isTie && <span className="text-tertiary font-semibold">Equal Split</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
