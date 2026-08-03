'use client';

import React, { useState } from 'react';
import { ESPNEvent, ESPNCompetitor } from '@/types/espn';
import { Settings, X, Calendar, UserPlus, Check, Trash2 } from 'lucide-react';
import { TrackedPlayer } from '@/lib/firebase/firestore';

interface AdminManagementDrawerProps {
  events: ESPNEvent[];
  activeEventId?: string;
  onSelectEvent: (eventId: string) => Promise<void>;
  trackedPlayers: TrackedPlayer[];
  onRemoveTrackedPlayer: (playerId: string) => Promise<void>;
}

export function AdminManagementDrawer({
  events,
  activeEventId,
  onSelectEvent,
  trackedPlayers,
  onRemoveTrackedPlayer,
}: AdminManagementDrawerProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  const handleEventChange = async (eventId: string) => {
    setSaving(true);
    await onSelectEvent(eventId);
    setSaving(false);
  };

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
          <div className="w-full max-w-md bg-slate-950 border-l border-slate-800 h-full p-6 flex flex-col justify-between shadow-2xl">
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
                  Changing the active tournament updates the live leaderboard and scorecard data for all site visitors.
                </p>
              </div>

              {/* Tracked Roster Section */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-emerald-400" /> Tracked Golfer Roster ({trackedPlayers.length})
                </label>

                {trackedPlayers.length === 0 ? (
                  <p className="text-xs text-slate-400 bg-slate-900/40 p-3 rounded-lg border border-slate-800 text-center">
                    No golfers in your tracking list. Use the '+' icon next to any golfer in the tournament leaderboard to add them.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    {trackedPlayers.map((p) => (
                      <div
                        key={p.playerId}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={p.headshotUrl || 'https://a.espncdn.com/i/headshots/golf/players/full/default.png'}
                            alt={p.name}
                            className="w-6 h-6 rounded-full object-cover bg-slate-800"
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
