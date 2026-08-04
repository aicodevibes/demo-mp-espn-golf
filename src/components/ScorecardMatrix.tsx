'use client';

import React, { useState } from 'react';
import { ESPNCompetitor, ESPNPlayerSummary, ESPNRoundLinescore } from '@/types/espn';
import { Circle, Square, Award } from 'lucide-react';
import { getPlayerStatusInfo } from '@/lib/espn';

interface ScorecardMatrixProps {
  playerSummary: ESPNPlayerSummary | null;
  /** The full competitor object from the leaderboard (has linescores for CUT detection). */
  competitor?: ESPNCompetitor | null;
  eventStatus?: any;
  loading?: boolean;
  playerName?: string;
}

export function ScorecardMatrix({
  playerSummary,
  competitor,
  eventStatus,
  loading,
  playerName = 'Selected Golfer',
}: ScorecardMatrixProps) {
  const [activeRound, setActiveRound] = useState<number>(1);

  // Use the leaderboard competitor (has linescores) — not playerSummary.competitor which ESPN
  // never populates in the player summary API response.
  const statusInfo = competitor ? getPlayerStatusInfo(competitor, eventStatus) : null;

  if (loading) {
    return (
      <div className="p-6 rounded-xl bg-surface-container-low border border-outline-variant animate-pulse space-y-4">
        <div className="h-6 w-48 bg-surface-container-high rounded" />
        <div className="h-40 bg-surface-container-high/60 rounded-lg" />
      </div>
    );
  }

  if (!playerSummary || !playerSummary.rounds || playerSummary.rounds.length === 0) {
    return (
      <div className="p-8 rounded-xl bg-surface-container-low border border-outline-variant text-center">
        <Award className="w-8 h-8 text-secondary mx-auto mb-2" />
        <h4 className="text-sm font-semibold text-on-surface">Scorecard Data Unavailable</h4>
        <p className="text-xs text-on-surface-variant mt-1">
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
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-900 border-2 border-amber-400 font-extrabold text-xs shadow-xs">
          {strokes}
        </span>
      );
    }
    if (type.includes('birdie') || diff === -1) {
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-tertiary/15 text-tertiary border border-tertiary font-bold text-xs">
          {strokes}
        </span>
      );
    }
    if (type.includes('double') || diff >= 2) {
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-error text-on-error border border-error font-bold text-xs">
          {strokes}
        </span>
      );
    }
    if (type.includes('bogey') || diff === 1) {
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-error/10 text-error border border-error/30 font-semibold text-xs">
          {strokes}
        </span>
      );
    }
    return <span className="font-semibold text-on-surface text-xs">{strokes || '-'}</span>;
  };

  return (
    <div className="rounded-xl bg-surface-container-low border border-outline-variant p-5 space-y-4 shadow-xs">
      {/* Header & Round Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant pb-3">
        <div>
          <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-tertiary" />
            {playerName}'s Hole-by-Hole Scorecard
          </h3>
          <p className="text-xs text-on-surface-variant">Traditional 18-Hole Round Performance Matrix</p>
          {statusInfo?.isCut && (
            <span className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-extrabold px-2 py-0.5 rounded bg-error/15 text-error border border-error/30">
              ✂️ Missed 36-Hole Cut
            </span>
          )}
          {statusInfo?.isWD && (
            <span className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-extrabold px-2 py-0.5 rounded bg-secondary-container text-secondary border border-outline-variant">
              🚪 Withdrawn (WD)
            </span>
          )}
        </div>

        {/* Round Tabs */}
        <div className="flex items-center gap-1.5 bg-surface-container-lowest p-1 rounded-lg border border-outline-variant">
          {(playerSummary.rounds || []).map((rd) => (
            <button
              key={rd.period}
              onClick={() => setActiveRound(rd.period)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                activeRound === rd.period
                  ? 'bg-tertiary text-on-tertiary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              R{rd.period} {rd.displayValue ? `(${rd.displayValue})` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Scorecard Table Matrix */}
      <div className="overflow-x-auto">
        <table className="w-full text-center border-collapse min-w-160">
          <thead>
            <tr className="bg-surface-container-high text-[11px] font-bold text-on-surface-variant uppercase tracking-wider border-b border-outline-variant">
              <th className="py-2.5 px-2 text-left">Hole</th>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((h) => (
                <th key={h} className="w-8 py-2.5">{h}</th>
              ))}
              <th className="py-2.5 px-2 bg-surface-container-highest text-tertiary">OUT</th>
              {[10, 11, 12, 13, 14, 15, 16, 17, 18].map((h) => (
                <th key={h} className="w-8 py-2.5">{h}</th>
              ))}
              <th className="py-2.5 px-2 bg-surface-container-highest text-tertiary">IN</th>
              <th className="py-2.5 px-2 bg-primary-container text-on-primary-container font-extrabold">TOT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/60 text-xs">
            {/* Par Row */}
            <tr className="bg-surface-container-lowest text-on-surface-variant">
              <td className="py-2 px-2 text-left font-bold text-on-surface-variant">PAR</td>
              {frontNine.map((h) => (
                <td key={h.hole} className="py-2 font-medium">{h.par || '-'}</td>
              ))}
              <td className="py-2 font-bold bg-surface-container-high text-on-surface">{frontParTotal || '-'}</td>
              {backNine.map((h) => (
                <td key={h.hole} className="py-2 font-medium">{h.par || '-'}</td>
              ))}
              <td className="py-2 font-bold bg-surface-container-high text-on-surface">{backParTotal || '-'}</td>
              <td className="py-2 font-bold bg-primary-container/40 text-on-primary-container">{grandParTotal || '-'}</td>
            </tr>

            {/* Strokes Row */}
            <tr className="bg-surface-container-lowest">
              <td className="py-3 px-2 text-left font-bold text-on-surface">SCORE</td>
              {frontNine.map((h) => (
                <td key={h.hole} className="py-2.5">
                  {renderScoreBadge(h.scoreType, h.strokes, h.par)}
                </td>
              ))}
              <td className="py-2.5 font-bold bg-surface-container-high text-tertiary text-sm">{frontScoreTotal || '-'}</td>
              {backNine.map((h) => (
                <td key={h.hole} className="py-2.5">
                  {renderScoreBadge(h.scoreType, h.strokes, h.par)}
                </td>
              ))}
              <td className="py-2.5 font-bold bg-surface-container-high text-tertiary text-sm">{backScoreTotal || '-'}</td>
              <td className="py-2.5 font-extrabold bg-primary-container text-on-primary-container text-base">{grandScoreTotal || '-'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Legend Footer */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-[11px] text-on-surface-variant border-t border-outline-variant/60">
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-full bg-amber-100 border border-amber-400" />
          <span>Eagle or Better</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-full bg-tertiary/15 border border-tertiary" />
          <span>Birdie</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-error/10 border border-error/30" />
          <span>Bogey</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-error border border-error" />
          <span>Double Bogey+</span>
        </div>
      </div>
    </div>
  );
}
