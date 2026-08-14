'use client';

import React from 'react';
import { UserPlus, X } from 'lucide-react';
import { Participant } from '@/types/contest';
import { ESPNCompetitor } from '@/types/espn';
import { normalizeCompetitor } from '@/lib/espn';

export interface AdminFourthGolferManagerProps {
  selectedParticipants: Participant[];
  competitors: ESPNCompetitor[];
  fieldGolfers: { id: string; name: string }[];
  getGolferNameById: (id: string) => string;
  onFourthGolferSelect: (participant: Participant, playerId: string) => void;
}

export function AdminFourthGolferManager({
  selectedParticipants,
  competitors,
  fieldGolfers,
  getGolferNameById,
  onFourthGolferSelect,
}: AdminFourthGolferManagerProps) {
  const compMap = new Map(competitors.map((c) => [c.athlete?.id || c.id, c]));
  const allDraftedIds = new Set(
    selectedParticipants.flatMap((p) => p.draftedPlayerIds)
  );

  // Available undrafted golfers from field (or include current 4th golfer if selected)
  const getAvailableGolfersForParticipant = (current4thId?: string) => {
    return fieldGolfers.filter(
      (g) => !allDraftedIds.has(g.id) || g.id === current4thId
    );
  };

  const eligibleCount = selectedParticipants.filter((p) => {
    const cutCount = p.draftedPlayerIds.slice(0, 3).filter((id) => {
      const comp = compMap.get(id);
      if (!comp) return false;
      const status = normalizeCompetitor(comp).statusInfo;
      return status.isCut || status.isWD;
    }).length;
    return cutCount >= 2;
  }).length;

  return (
    <section className="bg-surface-container-low border border-outline-variant rounded-xl p-6 space-y-4 shadow-xs">
      <div className="border-b border-outline-variant/60 pb-3 flex justify-between items-center">
        <div>
          <h2 className="text-sm font-black uppercase tracking-widest text-on-surface flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-tertiary" /> 4th Golfer Post-Cut Assignment
          </h2>
          <p className="text-[11px] text-on-surface-variant mt-0.5">
            Participants who lose 2 drafted golfers to CUT or WD after Round 2 receive a 4th replacement golfer for Rounds 3 & 4.
          </p>
        </div>
        <span className="text-xs font-bold text-on-surface-variant bg-surface-container px-2.5 py-1 rounded-full border border-outline-variant/60">
          {eligibleCount} Eligible
        </span>
      </div>

      <div className="overflow-x-auto border border-outline-variant/60 rounded-lg">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="bg-surface-container text-[10px] font-extrabold uppercase tracking-wider border-b border-outline-variant/60 text-on-surface-variant">
              <th className="py-2.5 px-4 w-1/4">Participant</th>
              <th className="py-2.5 px-4 w-1/3">Roster Status (R1-R3 Cut/WDs)</th>
              <th className="py-2.5 px-4 w-5/12">4th Replacement Golfer Pick</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/40">
            {selectedParticipants.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-6 text-center text-on-surface-variant italic">
                  No participants in event.
                </td>
              </tr>
            ) : (
              selectedParticipants.map((p) => {
                const originalPicks = p.draftedPlayerIds.slice(0, 3);
                const cutCount = originalPicks.filter((id) => {
                  const comp = compMap.get(id);
                  if (!comp) return false;
                  const status = normalizeCompetitor(comp).statusInfo;
                  return status.isCut || status.isWD;
                }).length;

                const isEligible = cutCount >= 2;
                const fourthGolferId = p.draftedPlayerIds[3] || '';

                return (
                  <tr
                    key={p.id}
                    className={`transition-colors ${
                      isEligible ? 'bg-amber-500/5 hover:bg-amber-500/10' : 'hover:bg-surface-container-high'
                    }`}
                  >
                    <td className="py-3 px-4 font-bold text-on-surface">
                      <div className="flex items-center gap-2">
                        <span>{p.name}</span>
                        {isEligible && (
                          <span className="text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded">
                            Needs 4th Golfer
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="flex flex-wrap gap-1">
                          {originalPicks.map((id) => {
                            const comp = compMap.get(id);
                            const status = comp ? normalizeCompetitor(comp).statusInfo : { isCut: false, isWD: false };
                            const name = getGolferNameById(id);
                            const isLost = status.isCut || status.isWD;
                            return (
                              <span
                                key={id}
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                  isLost
                                    ? 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30 line-through'
                                    : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                }`}
                              >
                                {name} {status.isWD ? '(WD)' : status.isCut ? '(CUT)' : ''}
                              </span>
                            );
                          })}
                        </div>
                        <p className="text-[10px] text-on-surface-variant">
                          Cut/WD Count:{' '}
                          <strong className={cutCount >= 2 ? 'text-red-600 dark:text-red-400 font-bold' : ''}>
                            {cutCount} / 3
                          </strong>
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <select
                          value={fourthGolferId}
                          onChange={(e) => onFourthGolferSelect(p, e.target.value)}
                          disabled={!isEligible}
                          className="w-full max-w-xs bg-surface-container border border-outline-variant rounded px-2.5 py-1 text-xs text-on-surface outline-none focus:border-outline disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="">
                            {isEligible ? '-- Select 4th Undrafted Golfer --' : 'N/A (Roster Intact)'}
                          </option>
                          {getAvailableGolfersForParticipant(fourthGolferId).map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                        {fourthGolferId && (
                          <button
                            onClick={() => onFourthGolferSelect(p, '')}
                            title="Remove 4th Golfer"
                            className="p-1 text-red-600 hover:bg-red-500/10 rounded transition cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
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
