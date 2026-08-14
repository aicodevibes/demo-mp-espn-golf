'use client';

import React from 'react';
import { Award } from 'lucide-react';
import { Participant } from '@/types/contest';

export interface AdminGreedyManagerProps {
  selectedParticipants: Participant[];
  fieldGolfers: { id: string; name: string }[];
  onGreedySelect: (participant: Participant, playerId: string) => void;
}

export function AdminGreedyManager({
  selectedParticipants,
  fieldGolfers,
  onGreedySelect,
}: AdminGreedyManagerProps) {
  const greedyParticipants = selectedParticipants.filter((p) => p.isGreedyParticipant);

  return (
    <section className="bg-surface-container-low border border-outline-variant rounded-xl p-6 space-y-4 shadow-xs">
      <div className="border-b border-outline-variant/60 pb-3 flex justify-between items-center">
        <h2 className="text-sm font-black uppercase tracking-widest text-on-surface flex items-center gap-2">
          <Award className="w-5 h-5 text-tertiary" /> Greedy Side-Game Assignments
        </h2>
        <span className="text-xs text-on-surface-variant font-bold">
          {greedyParticipants.length} Assigned
        </span>
      </div>

      <div className="overflow-x-auto border border-outline-variant/60 rounded-lg">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="bg-surface-container text-[10px] font-extrabold uppercase tracking-wider border-b border-outline-variant/60 text-on-surface-variant">
              <th className="py-2.5 px-4 w-1/2">Participant Name</th>
              <th className="py-2.5 px-4 w-1/2">Greedy Golfer Selection</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/40">
            {greedyParticipants.length === 0 ? (
              <tr>
                <td colSpan={2} className="py-6 text-center text-on-surface-variant italic">
                  No participants are flagged as Greedy Side-Game players. Add or edit a participant and check the &apos;Greedy Side-Game Player?&apos; box to display them here.
                </td>
              </tr>
            ) : (
              greedyParticipants.map((p) => (
                <tr key={p.id} className="hover:bg-surface-container-high transition-colors">
                  <td className="py-3 px-4 font-bold text-on-surface">{p.name}</td>
                  <td className="py-3 px-4">
                    <select
                      value={p.greedyPlayerId || ''}
                      onChange={(e) => onGreedySelect(p, e.target.value)}
                      className="w-full max-w-xs bg-surface-container border border-outline-variant rounded px-2.5 py-1 text-xs text-on-surface outline-none focus:border-outline"
                    >
                      <option value="">-- Choose Greedy Golfer --</option>
                      {fieldGolfers.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
