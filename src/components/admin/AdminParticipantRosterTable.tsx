'use client';

import React from 'react';
import { UserPlus, X, Plus } from 'lucide-react';
import { Participant } from '@/types/contest';
import { ESPNCompetitor } from '@/types/espn';
import { parseCommaDelimitedGolfers } from '@/lib/espn/golferMatcher';

export interface AdminParticipantRosterTableProps {
  selectedParticipants: Participant[];
  participantsLoading: boolean;
  isEventFinalized: boolean;
  fieldGolfers: { id: string; name: string }[];
  competitors: ESPNCompetitor[];
  editingParticipant: Participant | null;
  partName: string;
  partGolfersInput: string;
  partGolfer1: string;
  partGolfer2: string;
  partGolfer3: string;
  partIsGreedy: boolean;
  partGreedyPlayer: string;
  getGolferNameById: (id: string) => string;
  onChangeName: (name: string) => void;
  onChangeGolfersInput: (input: string) => void;
  onChangeGolfer1: (id: string) => void;
  onChangeGolfer2: (id: string) => void;
  onChangeGolfer3: (id: string) => void;
  onChangeIsGreedy: (isGreedy: boolean) => void;
  onChangeGreedyPlayer: (id: string) => void;
  onSaveParticipant: (e: React.FormEvent) => void;
  onCancelEdit: () => void;
  onStartEdit: (p: Participant) => void;
  onDeleteParticipant: (id: string) => void;
  onTogglePayment: (p: Participant) => void;
}

export function AdminParticipantRosterTable({
  selectedParticipants,
  participantsLoading,
  isEventFinalized,
  fieldGolfers,
  competitors,
  editingParticipant,
  partName,
  partGolfersInput,
  partGolfer1,
  partGolfer2,
  partGolfer3,
  partIsGreedy,
  partGreedyPlayer,
  getGolferNameById,
  onChangeName,
  onChangeGolfersInput,
  onChangeGolfer1,
  onChangeGolfer2,
  onChangeGolfer3,
  onChangeIsGreedy,
  onChangeGreedyPlayer,
  onSaveParticipant,
  onCancelEdit,
  onStartEdit,
  onDeleteParticipant,
  onTogglePayment,
}: AdminParticipantRosterTableProps) {
  return (
    <section className="bg-surface-container-low border border-outline-variant rounded-xl p-6 space-y-6 shadow-xs">
      <h2 className="text-sm font-black uppercase tracking-widest text-on-surface border-b border-outline-variant/60 pb-3 flex justify-between items-center">
        <span>Main Rosters</span>
        <span className="text-xs text-on-surface-variant font-bold normal-case">
          {selectedParticipants.length} Participant(s)
        </span>
      </h2>

      {/* Add / Edit Form Box */}
      <div className="p-4 rounded-lg bg-surface-container-lowest border border-outline-variant/60 space-y-4">
        <div className="flex items-center justify-between border-b border-outline-variant/40 pb-2">
          <h3 className="text-xs font-black uppercase tracking-widest text-tertiary flex items-center gap-1">
            <UserPlus className="w-4 h-4" />
            {editingParticipant ? `Edit Participant: ${editingParticipant.name}` : 'Add Participant'}
          </h3>
          {editingParticipant && (
            <button
              onClick={onCancelEdit}
              className="text-xs font-bold text-on-surface-variant hover:text-on-surface flex items-center gap-0.5"
            >
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          )}
        </div>

        <form onSubmit={onSaveParticipant} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Participant Name */}
            <div className="md:col-span-4 space-y-1">
              <label className="text-[11px] font-bold text-on-surface-variant">Participant Name</label>
              <input
                type="text"
                placeholder="Enter participant name"
                value={partName}
                onChange={(e) => onChangeName(e.target.value)}
                className="w-full bg-surface-container border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface outline-none focus:border-outline"
                required
              />
            </div>

            {/* Comma-delimited drafted golfers input */}
            <div className="md:col-span-8 space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-on-surface-variant">
                  Drafted Golfers (Comma-Delimited Names or IDs)
                </label>
                <span className="text-[10px] text-tertiary font-bold">
                  Supports 3 or 4 golfers (Days 3 & 4 cut replacements)
                </span>
              </div>
              <input
                type="text"
                placeholder="e.g. Scottie Scheffler, Rory McIlroy, Ludvig Aberg, Xander Schauffele"
                value={partGolfersInput}
                onChange={(e) => onChangeGolfersInput(e.target.value)}
                className="w-full bg-surface-container border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface outline-none focus:border-outline font-mono"
              />
            </div>

            {/* Live Matched Golfers Chips */}
            {partGolfersInput.trim() && (
              <div className="md:col-span-12 bg-surface-container-high/40 border border-outline-variant/60 rounded-lg p-2.5 space-y-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-on-surface-variant block">
                  Live Golfer Resolution Preview:
                </span>
                <div className="flex flex-wrap gap-2">
                  {parseCommaDelimitedGolfers(partGolfersInput, competitors).map((g, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${
                        g.matchedId
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                      }`}
                    >
                      <span className="text-[10px] font-bold opacity-70">#{idx + 1}</span>
                      <span>{g.competitor?.athlete?.displayName || g.rawInput}</span>
                      {g.matchedId ? (
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">✓ Matched</span>
                      ) : (
                        <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400">⚠️ Unrecognized</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fallback Dropdown Selectors (if text box is empty) */}
            {!partGolfersInput.trim() && (
              <>
                <div className="md:col-span-4 space-y-1">
                  <label className="text-[11px] font-bold text-on-surface-variant">Golfer 1</label>
                  <select
                    value={partGolfer1}
                    onChange={(e) => onChangeGolfer1(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface outline-none focus:border-outline"
                  >
                    <option value="">-- Choose Golfer 1 --</option>
                    {fieldGolfers.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-4 space-y-1">
                  <label className="text-[11px] font-bold text-on-surface-variant">Golfer 2</label>
                  <select
                    value={partGolfer2}
                    onChange={(e) => onChangeGolfer2(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface outline-none focus:border-outline"
                  >
                    <option value="">-- Choose Golfer 2 --</option>
                    {fieldGolfers.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-4 space-y-1">
                  <label className="text-[11px] font-bold text-on-surface-variant">Golfer 3</label>
                  <select
                    value={partGolfer3}
                    onChange={(e) => onChangeGolfer3(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface outline-none focus:border-outline"
                  >
                    <option value="">-- Choose Golfer 3 --</option>
                    {fieldGolfers.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Greedy Toggle & Player Picker */}
            <div className="md:col-span-6 flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="greedyCheckbox"
                checked={partIsGreedy}
                onChange={(e) => onChangeIsGreedy(e.target.checked)}
                className="rounded border-outline-variant bg-surface text-primary focus:ring-primary w-4 h-4"
              />
              <label
                htmlFor="greedyCheckbox"
                className="text-xs font-bold text-on-surface cursor-pointer select-none"
              >
                Greedy Side-Game Player?
              </label>
            </div>

            {partIsGreedy && (
              <div className="md:col-span-6 space-y-1">
                <label className="text-[11px] font-bold text-on-surface-variant">Greedy Golfer</label>
                <select
                  value={partGreedyPlayer}
                  onChange={(e) => onChangeGreedyPlayer(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface outline-none focus:border-outline"
                >
                  <option value="">-- Choose Greedy Golfer --</option>
                  {fieldGolfers.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isEventFinalized}
              className="inline-flex items-center gap-1 bg-primary text-on-primary hover:bg-primary/95 text-xs font-bold px-4 py-2 rounded-lg transition disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" /> {editingParticipant ? 'Save Participant' : 'Add Participant'}
            </button>
          </div>
        </form>
      </div>

      {/* Participants Table */}
      <div className="overflow-x-auto border border-outline-variant/60 rounded-lg">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="bg-surface-container text-[10px] font-extrabold uppercase tracking-wider border-b border-outline-variant/60 text-on-surface-variant">
              <th className="py-2.5 px-4 w-1/4">Name</th>
              <th className="py-2.5 px-4 w-5/12">Drafted Golfer Roster</th>
              <th className="py-2.5 px-4 text-center w-2/12">Entry Payment</th>
              <th className="py-2.5 px-4 text-right w-2/12">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/40">
            {participantsLoading ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-on-surface-variant">
                  Loading participants...
                </td>
              </tr>
            ) : selectedParticipants.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-on-surface-variant font-medium">
                  No participants added yet for this tournament. Add participants manually or click 'Seed Default Names'.
                </td>
              </tr>
            ) : (
              selectedParticipants.map((p) => (
                <tr key={p.id} className="hover:bg-surface-container-high transition-colors">
                  <td className="py-3 px-4 font-bold text-on-surface">{p.name}</td>
                  <td className="py-3 px-4 text-on-surface-variant">
                    {p.draftedPlayerIds.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {p.draftedPlayerIds.map((id) => (
                          <span
                            key={id}
                            className="px-2 py-0.5 bg-surface-container-high border border-outline-variant/40 rounded-full text-[11px]"
                          >
                            {getGolferNameById(id)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="italic text-[11px] text-outline">Empty roster</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      disabled={isEventFinalized}
                      onClick={() => onTogglePayment(p)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer disabled:opacity-50 ${
                        p.hasPaidEntry
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                      }`}
                    >
                      {p.hasPaidEntry ? 'Paid ✅' : 'Unpaid ⏳'}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-right space-x-1.5">
                    <button
                      onClick={() => onStartEdit(p)}
                      disabled={isEventFinalized}
                      className="text-secondary hover:text-primary font-bold transition text-[11px] disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <span className="text-outline-variant/40">|</span>
                    <button
                      onClick={() => onDeleteParticipant(p.id)}
                      disabled={isEventFinalized}
                      className="text-red-600 hover:text-red-700 font-bold transition text-[11px] disabled:opacity-50"
                    >
                      Delete
                    </button>
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
