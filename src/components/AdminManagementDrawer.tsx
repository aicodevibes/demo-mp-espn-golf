'use client';

import React, { useState } from 'react';
import { ESPNEvent, ESPNCompetitor } from '@/types/espn';
import { Settings, X, Calendar, UserPlus, Trash2, Search, Check, Plus } from 'lucide-react';
import { GolferHeadshot } from './GolferHeadshot';

import { TrackedPlayer } from '@/lib/firebase/firestore';

interface AdminManagementDrawerProps {
  events: ESPNEvent[];
  activeEventId?: string;
  onSelectEvent: (eventId: string) => Promise<void>;
  trackedPlayers: TrackedPlayer[];
  fieldCompetitors?: ESPNCompetitor[];
  onAddTrackedPlayer?: (comp: ESPNCompetitor) => Promise<void>;
  onRemoveTrackedPlayer: (playerId: string) => Promise<void>;
}

export function AdminManagementDrawer({
  events,
  activeEventId,
  onSelectEvent,
  trackedPlayers,
  fieldCompetitors = [],
  onAddTrackedPlayer,
  onRemoveTrackedPlayer,
}: AdminManagementDrawerProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleEventChange = async (eventId: string) => {
    setSaving(true);
    await onSelectEvent(eventId);
    setSaving(false);
  };

  const trackedPlayerIds = trackedPlayers.map((p) => p.playerId);

  const filteredCompetitors = fieldCompetitors.filter((c) =>
    c.athlete.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Floating Admin Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xl shadow-emerald-950/60 border border-emerald-400/40 transition-all hover:scale-105"
      >
        <Settings className="w-4 h-4" /> Admin Controls
      </button>

      {/* Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-950 border-l border-slate-800 h-full p-6 flex flex-col justify-between shadow-2xl overflow-y-auto">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-base font-bold text-slate-100">Event & Roster Controls</h2>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tournament Selector Section */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-400" /> Active PGA Tournament
                </label>
                <select
                  value={activeEventId || ''}
                  onChange={(e) => handleEventChange(e.target.value)}
                  disabled={saving}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-medium focus:outline-none focus:border-emerald-500"
                >
                  <option value="" disabled>
                    -- Select Active Event --
                  </option>
                  {events.map((evt) => (
                    <option key={evt.id} value={evt.id}>
                      {evt.name} {evt.status?.type?.detail ? `(${evt.status.type.detail})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400">
                  Changing the active tournament updates live leaderboards for all visitors.
                </p>
              </div>

              {/* Golfer Inventory Search & Add Section */}
              <div className="space-y-3 pt-2 border-t border-slate-900">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-emerald-400" /> Select Golfers from Field
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {fieldCompetitors.length} Available
                  </span>
                </label>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search golfer to add..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Scrollable Inventory List */}
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {filteredCompetitors.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-3">No matching golfers found.</p>
                  ) : (
                    filteredCompetitors.map((comp) => {
                      const isTracked = trackedPlayerIds.includes(comp.athlete.id);
                      return (
                        <div
                          key={comp.athlete.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <GolferHeadshot
                              name={comp.athlete?.displayName || 'Golfer'}
                              src={comp.athlete?.headshot?.href}
                              size={24}
                            />

                            <span className="font-semibold text-slate-200 truncate max-w-35">
                              {comp.athlete.displayName}
                            </span>
                          </div>

                          {isTracked ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              <Check className="w-3 h-3" /> Tracked
                            </span>
                          ) : (
                            <button
                              onClick={() => onAddTrackedPlayer?.(comp)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1 rounded transition shadow-sm"
                            >
                              <Plus className="w-3 h-3" /> + Add
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Active Tracked Roster Section */}
              <div className="space-y-3 pt-2 border-t border-slate-900">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" /> Active Watchlist ({trackedPlayers.length})
                </label>

                {trackedPlayers.length === 0 ? (
                  <p className="text-xs text-slate-400 bg-slate-900/40 p-3 rounded-lg border border-slate-800 text-center">
                    Your tracked watchlist is currently empty. Use the search list above to add golfers.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {trackedPlayers.map((p) => (
                      <div
                        key={p.playerId}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <GolferHeadshot
                            name={p.name}
                            src={p.headshotUrl}
                            size={24}
                          />
                          <span className="font-semibold text-slate-200">{p.name}</span>
                        </div>

                        <button
                          onClick={() => onRemoveTrackedPlayer(p.playerId)}
                          className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition"
                          title="Remove player"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-800">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-xs transition"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
