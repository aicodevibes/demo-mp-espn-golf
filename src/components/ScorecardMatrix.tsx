'use client';

import React, { useState } from 'react';
import { ESPNPlayerSummary, ESPNRoundLinescore } from '@/types/espn';
import { Circle, Square, Award } from 'lucide-react';

interface ScorecardMatrixProps {
  playerSummary: ESPNPlayerSummary | null;
  loading?: boolean;
  playerName?: string;
}

export function ScorecardMatrix({
  playerSummary,
  loading,
  playerName = 'Selected Golfer',
}: ScorecardMatrixProps) {
  const [activeRound, setActiveRound] = useState<number>(1);

  if (loading) {
    return (
      <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 animate-pulse space-y-4">
        <div className="h-6 w-48 bg-slate-800 rounded" />
        <div className="h-40 bg-slate-800/60 rounded-lg" />
      </div>
    );
  }

  if (!playerSummary || !playerSummary.rounds || playerSummary.rounds.length === 0) {
    return (
      <div className="p-8 rounded-xl bg-slate-900/40 border border-slate-800 text-center">
        <Award className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <h4 className="text-sm font-semibold text-slate-300">Scorecard Data Unavailable</h4>
        <p className="text-xs text-slate-400 mt-1">
          Hole-by-hole linescores will populate live when the tournament round begins.
        </p>
      </div>
    );
  }

  const currentRoundData: ESPNRoundLinescore | undefined = playerSummary.rounds.find(
    (r) => r.period === activeRound
  ) || playerSummary.rounds[0];

  const holes = currentRoundData?.holes || [];
  const frontNine = holes.filter((h) => h.hole >= 1 && h.hole <= 9);
  const backNine = holes.filter((h) => h.hole >= 10 && h.hole <= 18);

  const frontParTotal = frontNine.reduce((acc, h) => acc + (h.par || 0), 0);
  const frontScoreTotal = frontNine.reduce((acc, h) => acc + (h.strokes || 0), 0);

  const backParTotal = backNine.reduce((acc, h) => acc + (h.par || 0), 0);
  const backScoreTotal = backNine.reduce((acc, h) => acc + (h.strokes || 0), 0);

  const grandParTotal = frontParTotal + backParTotal;
  const grandScoreTotal = frontScoreTotal + backScoreTotal;

  const renderScoreBadge = (scoreType: string, strokes: number, par: number) => {
    const diff = strokes - par;
    const type = scoreType?.toLowerCase() || '';

    if (type.includes('eagle') || diff <= -2) {
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/20 text-amber-300 border-2 border-amber-400 font-extrabold text-xs shadow-sm shadow-amber-900/30">
          {strokes}
        </span>
      );
    }
    if (type.includes('birdie') || diff === -1) {
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400 font-bold text-xs">
          {strokes}
        </span>
      );
    }
    if (type.includes('double') || diff >= 2) {
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-rose-950 text-rose-300 border border-rose-600 font-bold text-xs">
          {strokes}
        </span>
      );
    }
    if (type.includes('bogey') || diff === 1) {
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-rose-500/10 text-rose-400 border border-rose-500/40 font-semibold text-xs">
          {strokes}
        </span>
      );
    }
    return <span className="font-semibold text-slate-200 text-xs">{strokes || '-'}</span>;
  };

  return (
    <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-5 space-y-4 shadow-xl">
      {/* Header & Round Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            {playerName}'s Hole-by-Hole Scorecard
          </h3>
          <p className="text-xs text-slate-400">Traditional 18-Hole Round Performance Matrix</p>
        </div>

        {/* Round Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
          {[1, 2, 3, 4].map((rNum) => (
            <button
              key={rNum}
              onClick={() => setActiveRound(rNum)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                activeRound === rNum
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              R{rNum}
            </button>
          ))}
        </div>
      </div>

      {/* Scorecard Table Matrix */}
      <div className="overflow-x-auto">
        <table className="w-full text-center border-collapse min-w-[640px]">
          <thead>
            <tr className="bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <th className="py-2.5 px-2 text-left">Hole</th>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((h) => (
                <th key={h} className="w-8 py-2.5">{h}</th>
              ))}
              <th className="py-2.5 px-2 bg-slate-900 text-emerald-400">OUT</th>
              {[10, 11, 12, 13, 14, 15, 16, 17, 18].map((h) => (
                <th key={h} className="w-8 py-2.5">{h}</th>
              ))}
              <th className="py-2.5 px-2 bg-slate-900 text-emerald-400">IN</th>
              <th className="py-2.5 px-2 bg-emerald-950/40 text-emerald-300 font-extrabold">TOT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {/* Par Row */}
            <tr className="bg-slate-950/30 text-slate-400">
              <td className="py-2 px-2 text-left font-bold text-slate-400">PAR</td>
              {frontNine.map((h) => (
                <td key={h.hole} className="py-2 font-medium">{h.par || '-'}</td>
              ))}
              <td className="py-2 font-bold bg-slate-900 text-slate-300">{frontParTotal || '-'}</td>
              {backNine.map((h) => (
                <td key={h.hole} className="py-2 font-medium">{h.par || '-'}</td>
              ))}
              <td className="py-2 font-bold bg-slate-900 text-slate-300">{backParTotal || '-'}</td>
              <td className="py-2 font-bold bg-emerald-950/30 text-slate-200">{grandParTotal || '-'}</td>
            </tr>

            {/* Strokes Row */}
            <tr className="bg-slate-900/40">
              <td className="py-3 px-2 text-left font-bold text-slate-100">SCORE</td>
              {frontNine.map((h) => (
                <td key={h.hole} className="py-2.5">
                  {renderScoreBadge(h.scoreType, h.strokes, h.par)}
                </td>
              ))}
              <td className="py-2.5 font-bold bg-slate-900 text-emerald-400 text-sm">{frontScoreTotal || '-'}</td>
              {backNine.map((h) => (
                <td key={h.hole} className="py-2.5">
                  {renderScoreBadge(h.scoreType, h.strokes, h.par)}
                </td>
              ))}
              <td className="py-2.5 font-bold bg-slate-900 text-emerald-400 text-sm">{backScoreTotal || '-'}</td>
              <td className="py-2.5 font-extrabold bg-emerald-950/50 text-emerald-300 text-base">{grandScoreTotal || '-'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Legend Footer */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-[11px] text-slate-400 border-t border-slate-800/80">
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-full bg-amber-500/20 border border-amber-400" />
          <span>Eagle or Better</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 border border-emerald-400" />
          <span>Birdie</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-rose-500/10 border border-rose-500/40" />
          <span>Bogey</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-rose-950 border border-rose-600" />
          <span>Double Bogey+</span>
        </div>
      </div>
    </div>
  );
}
