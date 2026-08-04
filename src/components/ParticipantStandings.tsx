'use client';

import React from 'react';
import { ParticipantStanding } from '@/types/contest';
import { Trophy, Scissors } from 'lucide-react';

interface ParticipantStandingsProps {
  standings: ParticipantStanding[];
  loading?: boolean;
}

/** Format a numeric daily team score for display (raw strokes sum → relative display) */
function formatTeamDayScore(score: number | null | undefined): string {
  if (score === null || score === undefined) return '-';
  // score is raw strokes (e.g. 138). For now display as-is until we wire par.
  // Once real ESPN par data is available this becomes relative to par.
  return score.toString();
}

/** Format total score to par string */
function formatTotal(total: number): string {
  if (total === 0) return 'E';
  return total > 0 ? `+${total}` : `${total}`;
}

/** Rank badge styling */
function rankBadgeClass(rank: number, isCut: boolean): string {
  if (isCut) return 'bg-red-500/10 text-red-500 text-[9px]';
  if (rank === 1) return 'bg-amber-400 text-amber-950';
  if (rank === 2) return 'bg-slate-300 text-slate-800';
  if (rank === 3) return 'bg-amber-700 text-white';
  if (rank === 4) return 'bg-emerald-600 text-white';
  return 'bg-surface-container-high text-on-surface-variant';
}

export function ParticipantStandings({ standings, loading }: ParticipantStandingsProps) {
  if (loading) {
    return (
      <div className="rounded-xl bg-surface-container-low border border-outline-variant p-6 animate-pulse space-y-4">
        <div className="h-6 w-56 bg-surface-container-high rounded" />
        <div className="h-80 bg-surface-container-lowest rounded-lg border border-outline-variant/60" />
      </div>
    );
  }

  const activeStandings = standings.filter((s) => !s.isCut);
  const cutStandings = standings.filter((s) => s.isCut);

  const renderRow = (s: ParticipantStanding) => {
    const isTopFour = s.rank <= 4 && !s.isCut;
    const rowClass = s.isCut
      ? 'opacity-60 text-on-surface-variant'
      : isTopFour
      ? 'bg-amber-400/5'
      : '';

    return (
      <tr
        key={s.participant.id}
        className={`border-b border-outline-variant/40 transition-colors hover:bg-surface-container ${rowClass}`}
      >
        {/* POS */}
        <td className="py-3 pl-4 pr-2 text-center align-middle w-12">
          <span
            className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-black text-xs shadow-xs ${rankBadgeClass(s.rank, s.isCut)}`}
          >
            {s.isCut ? 'CUT' : s.rank}
          </span>
        </td>

        {/* PARTICIPANT NAME */}
        <td className="py-3 px-3 align-middle w-32">
          <div className="flex flex-col">
            <span className="font-bold text-sm text-on-surface leading-tight">
              {s.participant.name}
            </span>
            {isTopFour && s.projectedPayout > 0 && (
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 mt-0.5">
                ${s.projectedPayout.toFixed(0)} prize
              </span>
            )}
          </div>
        </td>

        {/* DRAFTED PLAYERS — multi-line, name + round score string */}
        <td className="py-2 px-3 align-middle">
          <div className="flex flex-col gap-0.5">
            {s.draftedGolferDetails.map((g) => (
              <div
                key={g.id}
                className="flex items-baseline justify-between gap-3 min-w-0"
              >
                {/* Name + status badge */}
                <div className="flex items-center gap-1.5 min-w-0 flex-shrink-0">
                  <span
                    className={`text-xs leading-snug truncate ${
                      g.isCut || g.isWD
                        ? 'text-on-surface-variant line-through'
                        : 'text-on-surface'
                    }`}
                  >
                    {g.name}
                  </span>
                  {g.isCut && (
                    <span className="text-[9px] font-black uppercase text-red-500 bg-red-500/10 px-1 py-px rounded leading-none shrink-0">
                      CUT
                    </span>
                  )}
                  {g.isWD && (
                    <span className="text-[9px] font-black uppercase text-orange-500 bg-orange-500/10 px-1 py-px rounded leading-none shrink-0">
                      WD
                    </span>
                  )}
                </div>
                {/* Per-round score string */}
                <span className="text-[11px] font-mono text-on-surface-variant tabular-nums shrink-0">
                  {g.roundScoreDisplayStr}
                </span>
              </div>
            ))}
          </div>
        </td>

        {/* R1 / R2 / R3 / R4 — team daily scores */}
        {[1, 2, 3, 4].map((rd) => {
          const raw = s.dailyScores[rd];
          const display = raw != null ? formatTeamDayScore(raw) : '-';
          return (
            <td
              key={rd}
              className="py-3 px-2 text-center align-middle w-12 text-sm font-semibold text-on-surface-variant tabular-nums"
            >
              {display}
            </td>
          );
        })}

        {/* TOTAL */}
        <td className="py-3 px-3 text-center align-middle w-16">
          <span className={`text-base font-black tabular-nums ${
            s.totalScore < 0 ? 'text-tertiary' : s.totalScore > 0 ? 'text-error' : 'text-on-surface'
          }`}>
            {s.isCut ? 'CUT' : formatTotal(s.totalScore)}
          </span>
        </td>

        {/* PAYOUT */}
        <td className="py-3 pr-4 pl-2 text-right align-middle w-24">
          {s.projectedPayout > 0 ? (
            <span className="text-xs font-extrabold text-tertiary bg-tertiary/10 border border-tertiary/25 px-2 py-0.5 rounded">
              ${s.projectedPayout.toFixed(2)}
            </span>
          ) : (
            <span className="text-on-surface-variant/40 text-xs">—</span>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="rounded-xl bg-surface-container-low border border-outline-variant shadow-xs overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-outline-variant flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-lowest">
        <div>
          <h3 className="text-sm font-extrabold uppercase tracking-widest text-on-surface flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
            Overall Standings
          </h3>
          <p className="text-xs text-on-surface-variant mt-0.5">
            12-Participant US Open Pool · Best 2 daily drafted scores
          </p>
        </div>

        {/* Prize allocation pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { pos: '1st', pool: '$600', cls: 'bg-amber-400 text-amber-950' },
            { pos: '2nd', pool: '$320', cls: 'bg-slate-300 text-slate-800' },
            { pos: '3rd', pool: '$180', cls: 'bg-amber-700 text-white' },
            { pos: '4th', pool: '$100', cls: 'bg-emerald-600 text-white' },
          ].map((item) => (
            <div
              key={item.pos}
              className="flex items-center gap-1 border border-outline-variant rounded-lg px-2.5 py-1.5 bg-surface-container text-center"
            >
              <span className={`text-[10px] font-black px-1.5 py-px rounded ${item.cls}`}>
                {item.pos}
              </span>
              <span className="text-xs font-bold text-on-surface">{item.pool}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] border-collapse">
          <thead>
            <tr className="bg-surface-container text-[10px] font-extrabold tracking-widest uppercase text-on-surface-variant border-b border-outline-variant">
              <th className="py-2.5 pl-4 pr-2 text-center w-12">POS</th>
              <th className="py-2.5 px-3 text-left w-32">PARTICIPANT</th>
              <th className="py-2.5 px-3 text-left">DRAFTED PLAYERS</th>
              <th className="py-2.5 px-2 text-center w-12">R1</th>
              <th className="py-2.5 px-2 text-center w-12">R2</th>
              <th className="py-2.5 px-2 text-center w-12">R3</th>
              <th className="py-2.5 px-2 text-center w-12">R4</th>
              <th className="py-2.5 px-3 text-center w-16 text-tertiary">TOTAL</th>
              <th className="py-2.5 pr-4 pl-2 text-right w-24">PAYOUT</th>
            </tr>
          </thead>
          <tbody>
            {/* Active participants */}
            {activeStandings.map((s) => renderRow(s))}

            {/* Cut line divider */}
            {cutStandings.length > 0 && (
              <tr>
                <td colSpan={9} className="py-2 px-4">
                  <div className="flex items-center gap-3">
                    <div className="h-px bg-red-500/30 flex-1" />
                    <span className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-red-500 bg-red-500/10 border border-red-500/25 px-3 py-1 rounded-full shrink-0">
                      <Scissors className="w-3 h-3" />
                      36-Hole Cut · {cutStandings.length} Eliminated
                    </span>
                    <div className="h-px bg-red-500/30 flex-1" />
                  </div>
                </td>
              </tr>
            )}

            {/* Cut participants */}
            {cutStandings.map((s) => renderRow(s))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
