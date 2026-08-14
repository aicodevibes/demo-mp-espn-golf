'use client';

import React from 'react';
import { ParticipantStanding, ContestConfig } from '@/types/contest';
import { Trophy } from 'lucide-react';

interface ParticipantStandingsProps {
  standings: ParticipantStanding[];
  contestConfig: ContestConfig | null;
  loading?: boolean;
  onSelectParticipant?: (participantId: string) => void;
  onSelectPlayer?: (playerId: string) => void;
}

/** Format a numeric daily team score relative to par for display */
function formatTeamDayScore(score: number | null | undefined): string {
  if (score === null || score === undefined) return '-';
  if (score === 0) return 'E';
  return score > 0 ? `+${score}` : `${score}`;
}

/** Format total score to par string */
function formatTotal(total: number): string {
  if (total === 0) return 'E';
  return total > 0 ? `+${total}` : `${total}`;
}

/** Rank badge styling */
function rankBadgeClass(rank: number, isCut: boolean): string {
  if (isCut) return 'bg-red-500/10 text-red-500 border border-red-500/20 text-[9px] font-extrabold';
  if (rank === 1) return 'bg-amber-500 text-amber-950 font-black';
  if (rank === 2) return 'bg-slate-300 text-slate-900 font-extrabold';
  if (rank === 3) return 'bg-amber-700 text-white font-bold';
  if (rank === 4) return 'bg-emerald-600 text-white font-bold';
  return 'bg-surface-container-high text-on-surface-variant font-bold';
}

export function ParticipantStandings({
  standings,
  contestConfig,
  loading,
  onSelectParticipant,
  onSelectPlayer,
}: ParticipantStandingsProps) {
  if (loading) {
    return (
      <div className="rounded-xl bg-surface-container-low border border-outline-variant p-6 animate-pulse space-y-4">
        <div className="h-6 w-56 bg-surface-container-high rounded" />
        <div className="h-80 bg-surface-container-lowest rounded-lg border border-outline-variant/60" />
      </div>
    );
  }

  if (!loading && standings.length === 0) {
    return (
      <div className="rounded-xl bg-surface-container-lowest border border-outline-variant p-8 text-center space-y-3">
        <div className="inline-flex p-3 rounded-full bg-surface-container-high text-on-surface-variant">
          <Trophy className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-on-surface">No Participants Configured</h3>
        <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
          No participants added yet for this tournament. Administrators can add participants or copy a past roster in the Admin panel.
        </p>

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
      ? 'bg-surface-container-lowest font-medium'
      : '';

    return (
      <tr
        key={s.participant.id}
        className={`border-b border-outline-variant/40 transition-colors hover:bg-surface-container ${rowClass}`}
      >
        {/* POS */}
        <td className="py-3 pl-4 pr-2 text-center align-middle w-12">
          <span
            className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs shadow-xs ${rankBadgeClass(s.rank, s.isCut)}`}
          >
            {s.isCut ? 'CUT' : s.rank}
          </span>
        </td>

        {/* PARTICIPANT NAME */}
        <td
          className={`py-3 px-3 align-middle w-32 ${onSelectParticipant ? 'cursor-pointer' : ''}`}
          onClick={() => onSelectParticipant?.(s.participant.id)}
        >
          <div className="flex flex-col">
            <span className="font-bold text-sm text-on-surface hover:text-tertiary transition leading-tight">
              {s.participant.name}
            </span>
            {contestConfig?.isFinalized && isTopFour && s.projectedPayout > 0 && (
              <span className="text-[10px] font-extrabold text-tertiary mt-0.5">
                ${s.projectedPayout.toFixed(0)} prize
              </span>
            )}
          </div>
        </td>

        {/* DRAFTED PLAYERS — multi-line, name + round score string */}
        <td className="py-2 px-3 align-middle">
          <div className="flex flex-col gap-0.5">
            {s.draftedGolferDetails.map((g, idx) => (
              <div
                key={g.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectParticipant?.(s.participant.id);
                  onSelectPlayer?.(g.id);
                }}
                className={`flex items-baseline justify-between gap-3 min-w-0 ${
                  onSelectPlayer ? 'cursor-pointer hover:bg-surface-container-high rounded px-1 py-0.5 transition' : ''
                }`}
              >
                {/* Name + status badge */}
                <div className="flex items-center gap-1.5 min-w-0 flex-shrink-0">
                  <span
                    className={`text-xs leading-snug truncate ${
                      g.isCut || g.isWD
                        ? 'text-on-surface-variant line-through'
                        : 'text-on-surface font-medium'
                    }`}
                  >
                    {g.name}
                  </span>
                  {idx === 3 && (
                    <span className="text-[9px] font-black uppercase text-purple-400 bg-purple-500/10 px-1 py-px rounded leading-none shrink-0 border border-purple-500/20">
                      4th · Post-Cut
                    </span>
                  )}
                  {g.isCut && (
                    <span className="text-[9px] font-black uppercase text-red-500 bg-red-500/10 px-1 py-px rounded leading-none shrink-0 border border-red-500/20">
                      CUT
                    </span>
                  )}
                  {g.isWD && (
                    <span className="text-[9px] font-black uppercase text-orange-500 bg-orange-500/10 px-1 py-px rounded leading-none shrink-0 border border-orange-500/20">
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
      </tr>
    );
  };

  return (
    <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 sm:p-5 space-y-4 shadow-xs">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/60 pb-3">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-on-surface">
            Overall Standings
          </h3>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-outline-variant/60 bg-surface-container-lowest">
        <table className="w-full min-w-[700px] border-collapse">
          <thead>
            <tr className="bg-surface-container-high text-[10px] font-black tracking-wider uppercase text-on-surface-variant border-b border-outline-variant">
              <th className="py-2.5 pl-4 pr-2 text-center w-12">POS</th>
              <th className="py-2.5 px-3 text-left w-32">PARTICIPANT</th>
              <th className="py-2.5 px-3 text-left">DRAFTED PLAYERS</th>
              <th className="py-2.5 px-2 text-center w-12">R1</th>
              <th className="py-2.5 px-2 text-center w-12">R2</th>
              <th className="py-2.5 px-2 text-center w-12">R3</th>
              <th className="py-2.5 px-2 text-center w-12">R4</th>
              <th className="py-2.5 px-3 text-center w-16 text-tertiary">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {/* Active participants */}
            {activeStandings.map((s) => renderRow(s))}

            {/* Cut line divider */}
            {cutStandings.length > 0 && (
              <tr>
                <td colSpan={8} className="py-2 px-4">
                  <div className="flex items-center gap-3">
                    <div className="h-px bg-red-500/30 flex-1" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-red-500 bg-red-500/10 border border-red-500/25 px-3 py-1 rounded-full shrink-0">
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

