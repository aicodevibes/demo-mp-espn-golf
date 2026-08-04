'use client';

import React from 'react';
import { ParticipantStanding } from '@/types/contest';
import { Trophy, Award, Scissors } from 'lucide-react';

interface ParticipantStandingsProps {
  standings: ParticipantStanding[];
  loading?: boolean;
}

export function ParticipantStandings({ standings, loading }: ParticipantStandingsProps) {
  if (loading) {
    return (
      <div className="p-card rounded-xl bg-surface-container-low border border-outline-variant animate-pulse space-y-4">
        <div className="h-6 w-48 bg-surface-container-high rounded" />
        <div className="h-64 bg-surface-container-lowest rounded-lg border border-outline-variant/60" />
      </div>
    );
  }

  const activeStandings = standings.filter((s) => !s.isCut);
  const cutStandings = standings.filter((s) => s.isCut);

  const topFourWinners = standings.filter((s) => s.rank <= 4 && !s.isCut);

  const renderStandingRow = (s: ParticipantStanding, idx: number) => {
    const isTopFour = s.rank <= 4 && !s.isCut;

    return (
      <tr
        key={s.participant.id}
        className={`transition text-xs ${
          isTopFour
            ? 'bg-amber-500/5 hover:bg-amber-500/10 font-medium'
            : s.isCut
            ? 'bg-surface-container-high/60 text-on-surface-variant opacity-75'
            : 'bg-surface-container-lowest hover:bg-surface-container text-on-surface'
        }`}
      >
        {/* Rank Position Badge */}
        <td className="py-3 px-3 text-center font-bold">
          <span
            className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-black text-xs ${
              s.rank === 1
                ? 'bg-amber-400 text-amber-950 shadow-xs'
                : s.rank === 2
                ? 'bg-slate-300 text-slate-900 shadow-xs'
                : s.rank === 3
                ? 'bg-amber-700 text-white shadow-xs'
                : s.rank === 4
                ? 'bg-tertiary text-on-tertiary shadow-xs'
                : s.isCut
                ? 'bg-error/15 text-error text-[10px]'
                : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            {s.isCut ? 'CUT' : s.rank}
          </span>
        </td>

        {/* Participant Name */}
        <td className="py-3 px-3 text-left font-bold text-on-surface">
          <div className="flex items-center gap-2">
            <span>{s.participant.name}</span>
            {isTopFour && (
              <span className="text-[10px] font-extrabold text-amber-900 bg-amber-200 px-1.5 py-0.2 rounded">
                Payout
              </span>
            )}
          </div>
        </td>

        {/* Drafted Players List with Cut Badges */}
        <td className="py-3 px-3 text-left">
          <div className="flex flex-wrap gap-1.5">
            {s.draftedGolferDetails.map((g) => (
              <span
                key={g.id}
                className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border ${
                  g.isCut
                    ? 'bg-error/10 text-error border-error/30 font-semibold'
                    : g.isWD
                    ? 'bg-secondary-container text-secondary border-outline-variant font-semibold'
                    : 'bg-surface-container-low text-on-surface border-outline-variant/60 font-medium'
                }`}
              >
                {g.name}
                {g.isCut && <span className="text-[9px] font-black uppercase">CUT</span>}
                {g.isWD && <span className="text-[9px] font-black uppercase">WD</span>}
              </span>
            ))}
          </div>
        </td>

        {/* Round Scores (R1, R2, R3, R4) */}
        {[1, 2, 3, 4].map((rd) => {
          const score = s.dailyScores[rd];
          return (
            <td key={rd} className="py-3 px-2 text-center font-semibold text-on-surface-variant">
              {score !== null && score !== undefined ? score : '-'}
            </td>
          );
        })}

        {/* Total Score */}
        <td className="py-3 px-3 text-center font-black text-sm text-on-surface">
          {s.totalScore}
        </td>

        {/* Projected Payout */}
        <td className="py-3 px-3 text-right font-black text-sm">
          {s.projectedPayout > 0 ? (
            <span className="text-tertiary bg-tertiary/15 px-2 py-0.5 rounded border border-tertiary/30">
              ${s.projectedPayout.toFixed(2)}
            </span>
          ) : (
            <span className="text-on-surface-variant text-xs font-normal">-</span>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="rounded-xl bg-surface-container-low border border-outline-variant p-card space-y-5 shadow-xs">
      {/* Top Section: Payout Summary Cards */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-outline-variant pb-4">
        <div>
          <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
            <Trophy className="w-5 h-5 text-tertiary" /> Official Contest Standings
          </h3>
          <p className="text-xs text-on-surface-variant">
            12-Participant US Open Pool • Sum of 2 best daily drafted scores
          </p>
        </div>

        {/* Top 4 Prize Allocations Banner */}
        <div className="grid grid-cols-4 gap-2 w-full md:w-auto">
          {[
            { pos: '1st', pool: '$600.00', bg: 'bg-amber-400 text-amber-950' },
            { pos: '2nd', pool: '$320.00', bg: 'bg-slate-300 text-slate-900' },
            { pos: '3rd', pool: '$180.00', bg: 'bg-amber-700 text-white' },
            { pos: '4th', pool: '$100.00', bg: 'bg-tertiary text-on-tertiary' },
          ].map((item) => (
            <div
              key={item.pos}
              className="bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-center"
            >
              <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-black ${item.bg}`}>
                {item.pos}
              </span>
              <p className="text-xs font-black text-on-surface mt-1">{item.pool}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Standings Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-160">
          <thead>
            <tr className="bg-surface-container-high text-[11px] font-bold text-on-surface-variant uppercase tracking-wider border-b border-outline-variant">
              <th className="py-2.5 px-3 text-center w-12">POS</th>
              <th className="py-2.5 px-3">PARTICIPANT</th>
              <th className="py-2.5 px-3">DRAFTED PLAYERS</th>
              <th className="py-2.5 px-2 text-center w-12">R1</th>
              <th className="py-2.5 px-2 text-center w-12">R2</th>
              <th className="py-2.5 px-2 text-center w-12">R3</th>
              <th className="py-2.5 px-2 text-center w-12">R4</th>
              <th className="py-2.5 px-3 text-center w-16 bg-surface-container-highest text-tertiary">TOT</th>
              <th className="py-2.5 px-3 text-right w-24">PAYOUT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/60">
            {/* Active Participants */}
            {activeStandings.map((s, idx) => renderStandingRow(s, idx))}

            {/* ✂️ Participant Cut Line Divider */}
            {cutStandings.length > 0 && (
              <tr>
                <td colSpan={9} className="py-2 px-1">
                  <div className="flex items-center gap-2 my-1">
                    <div className="h-px bg-error/30 flex-1" />
                    <span className="text-[10px] font-extrabold tracking-wider uppercase text-error bg-error/10 px-2.5 py-0.5 rounded-full border border-error/30 flex items-center gap-1 shadow-xs">
                      <Scissors className="w-3 h-3 text-error" /> 36-Hole Participant Cut Line ({cutStandings.length} Cut)
                    </span>
                    <div className="h-px bg-error/30 flex-1" />
                  </div>
                </td>
              </tr>
            )}

            {/* Cut Participants */}
            {cutStandings.map((s, idx) => renderStandingRow(s, activeStandings.length + idx))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
