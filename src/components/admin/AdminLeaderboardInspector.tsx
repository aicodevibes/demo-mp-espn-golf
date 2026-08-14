'use client';

import React from 'react';
import { Trophy, Search } from 'lucide-react';
import { ESPNCompetitor } from '@/types/espn';
import { ContestConfig } from '@/types/contest';
import { getGolferRoundScoreToPar } from '@/lib/scoring';
import { normalizeCompetitor } from '@/lib/espn';

export interface AdminLeaderboardInspectorProps {
  loadingCompetitors: boolean;
  filteredLiveCompetitors: ESPNCompetitor[];
  selectedContestConfig: ContestConfig | null;
  liveSearchQuery: string;
  onChangeLiveSearchQuery: (query: string) => void;
}

export function AdminLeaderboardInspector({
  loadingCompetitors,
  filteredLiveCompetitors,
  selectedContestConfig,
  liveSearchQuery,
  onChangeLiveSearchQuery,
}: AdminLeaderboardInspectorProps) {
  const formatParVal = (val: number | null) => {
    if (val === null) return '-';
    if (val === 0) return 'E';
    return val > 0 ? `+${val}` : `${val}`;
  };

  return (
    <section className="bg-surface-container-low border border-outline-variant rounded-xl p-6 space-y-4 shadow-xs">
      <div className="border-b border-outline-variant/60 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-on-surface flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" /> ESPN Competitors Field
        </h2>

        <div className="relative max-w-xs w-full">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-3.5 w-3.5 text-on-surface-variant" />
          </span>
          <input
            type="text"
            placeholder="Search field..."
            value={liveSearchQuery}
            onChange={(e) => onChangeLiveSearchQuery(e.target.value)}
            className="pl-9 pr-3 py-1.5 bg-surface-container border border-outline-variant rounded-lg text-xs w-full text-on-surface outline-none focus:border-outline"
          />
        </div>
      </div>

      <div className="overflow-x-auto border border-outline-variant/60 rounded-lg max-h-96 overflow-y-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="sticky top-0 bg-surface-container text-[10px] font-extrabold uppercase tracking-wider border-b border-outline-variant/60 text-on-surface-variant z-10">
            <tr>
              <th className="py-2.5 px-4 w-2/5">Player Name</th>
              <th className="py-2.5 px-2 text-center w-12">R1</th>
              <th className="py-2.5 px-2 text-center w-12">R2</th>
              <th className="py-2.5 px-2 text-center w-12">R3</th>
              <th className="py-2.5 px-2 text-center w-12">R4</th>
              <th className="py-2.5 px-4 text-center w-20">Total Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/40">
            {loadingCompetitors ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-on-surface-variant">
                  Loading field scores...
                </td>
              </tr>
            ) : filteredLiveCompetitors.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-on-surface-variant italic">
                  No golfers match the search criteria.
                </td>
              </tr>
            ) : (
              filteredLiveCompetitors.map((c) => {
                const par = selectedContestConfig?.coursePar;
                const r1 = getGolferRoundScoreToPar(c, 1, par);
                const r2 = getGolferRoundScoreToPar(c, 2, par);
                const r3 = getGolferRoundScoreToPar(c, 3, par);
                const r4 = getGolferRoundScoreToPar(c, 4, par);

                return (
                  <tr key={c.id} className="hover:bg-surface-container-high transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-on-surface">
                      {c.athlete?.displayName || 'Unknown Golfer'}
                    </td>
                    <td className="py-2.5 px-2 text-center text-on-surface-variant font-mono">
                      {formatParVal(r1)}
                    </td>
                    <td className="py-2.5 px-2 text-center text-on-surface-variant font-mono">
                      {formatParVal(r2)}
                    </td>
                    <td className="py-2.5 px-2 text-center text-on-surface-variant font-mono">
                      {formatParVal(r3)}
                    </td>
                    <td className="py-2.5 px-2 text-center text-on-surface-variant font-mono">
                      {formatParVal(r4)}
                    </td>
                    <td className="py-2.5 px-4 text-center font-bold text-tertiary">
                      {normalizeCompetitor(c).scoreDisplay || (typeof c.score === 'string' ? c.score : '-')}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
