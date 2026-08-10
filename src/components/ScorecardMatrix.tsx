'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { ESPNCompetitor, ESPNPlayerSummary, ESPNRoundLinescore } from '@/types/espn';
import { Circle, Square, Award, ChevronDown, ChevronUp } from 'lucide-react';
import { getPlayerStatusInfo, formatScoreDisplay } from '@/lib/espn';
import { getGolferRoundScoreToPar } from '@/lib/scoring';

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
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('mp_scorecard_collapsed') === 'true';
    }
    return false;
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('mp_scorecard_collapsed', String(next));
      }
      return next;
    });
  };

  // Filter rounds to only show started rounds (or R1 preview if pre-tournament)
  const startedRounds = useMemo(() => {
    if (!playerSummary || !playerSummary.rounds || playerSummary.rounds.length === 0) return [];
    const started = playerSummary.rounds.filter((rd) => {
      const hasStrokes = rd.holes && rd.holes.some((h) => (h.strokes || 0) > 0);
      const hasDisplayVal = Boolean(rd.displayValue && rd.displayValue.trim() !== '' && rd.displayValue !== '-');
      return hasStrokes || hasDisplayVal;
    });
    if (started.length === 0 && playerSummary.rounds.length > 0) {
      return [playerSummary.rounds[0]];
    }
    return started;
  }, [playerSummary]);

  // Auto-focus latest started round when player or rounds update
  useEffect(() => {
    if (startedRounds.length > 0) {
      const isCurrentActiveValid = startedRounds.some((r) => r.period === activeRound);
      if (!isCurrentActiveValid) {
        const latestPeriod = startedRounds[startedRounds.length - 1].period;
        setActiveRound(latestPeriod);
      }
    }
  }, [startedRounds, activeRound]);

  // Use the leaderboard competitor (has linescores) for CUT detection
  const statusInfo = competitor ? getPlayerStatusInfo(competitor, eventStatus) : null;

  if (loading) {
    return (
      <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant animate-pulse space-y-3">
        <div className="h-6 w-48 bg-surface-container-high rounded" />
        <div className="h-32 bg-surface-container-high/60 rounded-lg" />
      </div>
    );
  }

  if (!playerSummary || !playerSummary.rounds || playerSummary.rounds.length === 0) {
    return (
      <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant text-center">
        <Award className="w-6 h-6 text-secondary mx-auto mb-1.5" />
        <h4 className="text-xs font-bold text-on-surface">Scorecard Data Unavailable</h4>
        <p className="text-[11px] text-on-surface-variant mt-0.5">
          Hole-by-hole linescores will populate live when the tournament round begins.
        </p>
      </div>
    );
  }

  const currentRoundData: ESPNRoundLinescore | undefined = startedRounds.find(
    (r) => r.period === activeRound
  ) || startedRounds[0];

  const holes = currentRoundData?.holes || [];
  const frontNine = holes.filter((h) => h.hole >= 1 && h.hole <= 9);
  const backNine = holes.filter((h) => h.hole >= 10 && h.hole <= 18);

  const frontParTotal = frontNine.reduce((acc, h) => acc + (h.par || 0), 0);
  const frontScoreTotal = frontNine.filter((h) => (h.strokes || 0) > 0).reduce((acc, h) => acc + h.strokes, 0);

  const backParTotal = backNine.reduce((acc, h) => acc + (h.par || 0), 0);
  const backScoreTotal = backNine.filter((h) => (h.strokes || 0) > 0).reduce((acc, h) => acc + h.strokes, 0);

  const grandParTotal = frontParTotal + backParTotal;
  const grandScoreTotal = frontScoreTotal + backScoreTotal;

  const renderScoreBadge = (scoreType: string, strokes: number, par: number) => {
    if (!strokes || strokes === 0) {
      return <span className="font-semibold text-on-surface-variant text-xs">-</span>;
    }

    const diff = strokes - par;
    const type = scoreType?.toLowerCase() || '';

    if (type.includes('unplayed')) {
      return <span className="font-semibold text-on-surface-variant text-xs">-</span>;
    }

    if (type.includes('eagle') || diff <= -2) {
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500 text-amber-950 border border-amber-400 font-black text-xs shadow-xs">
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
    return <span className="font-semibold text-on-surface text-xs">{strokes}</span>;
  };

  // Render Compact Collapsed Ribbon Strip
  if (isCollapsed) {
    return (
      <div
        onClick={toggleCollapse}
        className="cursor-pointer bg-surface-container-low border border-outline-variant rounded-xl px-4 py-2.5 flex items-center justify-between shadow-xs hover:border-outline transition"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-black uppercase tracking-wider text-on-surface">
            {playerName}'s Hole-by-Hole Scorecard
          </span>
          {(() => {
            const rd = currentRoundData;
            if (!rd) return null;
            const roundParTotal = rd.holes ? rd.holes.reduce((sum, h) => sum + (h.par || 0), 0) : null;
            const rawScoreToPar = competitor 
              ? getGolferRoundScoreToPar(competitor, rd.period, roundParTotal && roundParTotal > 50 ? roundParTotal : null)
              : null;
            const formattedScore = rawScoreToPar !== null 
              ? (rawScoreToPar === 0 ? 'E' : rawScoreToPar > 0 ? `+${rawScoreToPar}` : `${rawScoreToPar}`)
              : null;
            const labelSuffix = formattedScore ? ` (${formattedScore})` : '';

            return (
              <span className="text-[10px] font-extrabold text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded-full border border-outline-variant/60">
                R{rd.period}{labelSuffix} • Hidden
              </span>
            );
          })()}
        </div>
        <button className="flex items-center gap-1 text-xs font-bold text-tertiary hover:text-tertiary/80 transition">
          <span>Expand</span>
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-surface-container-low border border-outline-variant p-4 sm:p-5 space-y-4 shadow-xs">
      {/* Ribbon Header & Round Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant pb-3">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-on-surface">
              {playerName}'s Hole-by-Hole Scorecard
            </h3>
            <div className="flex items-center gap-2 mt-1">
              {statusInfo?.isCut && (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded bg-error/15 text-error border border-error/30">
                  Missed 36-Hole Cut
                </span>
              )}
              {statusInfo?.isWD && (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded bg-secondary-container text-secondary border border-outline-variant">
                  Withdrawn (WD)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Round Tabs & Collapse Ribbon Action */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-surface-container-lowest p-1 rounded-lg border border-outline-variant">
            {startedRounds.map((rd) => {
              // Extract course par if available in current holes par total
              const roundParTotal = rd.holes ? rd.holes.reduce((sum, h) => sum + (h.par || 0), 0) : null;
              
              // Use getGolferRoundScoreToPar to resolve score relative to par
              const rawScoreToPar = competitor 
                ? getGolferRoundScoreToPar(competitor, rd.period, roundParTotal && roundParTotal > 50 ? roundParTotal : null)
                : null;
              
              const formattedScore = rawScoreToPar !== null 
                ? (rawScoreToPar === 0 ? 'E' : rawScoreToPar > 0 ? `+${rawScoreToPar}` : `${rawScoreToPar}`)
                : null;

              const labelSuffix = formattedScore ? ` (${formattedScore})` : '';

              return (
                <button
                  key={rd.period}
                  onClick={() => setActiveRound(rd.period)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                    activeRound === rd.period
                      ? 'bg-tertiary text-on-tertiary shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                  }`}
                >
                  R{rd.period}{labelSuffix}
                </button>
              );
            })}
          </div>

          <button
            onClick={toggleCollapse}
            title="Collapse Scorecard Section"
            className="p-1.5 text-on-surface-variant hover:text-on-surface bg-surface-container-lowest hover:bg-surface-container-high rounded-lg border border-outline-variant transition cursor-pointer"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
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
          <span className="w-3.5 h-3.5 rounded-full bg-amber-500 border border-amber-400" />
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
