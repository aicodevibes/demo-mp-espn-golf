'use client';

import React, { useState } from 'react';
import { ESPNEvent, ESPNCompetitor } from '@/types/espn';
import { Settings, X, Calendar, UserPlus, Trash2, Search, Check, Plus } from 'lucide-react';
import { GolferHeadshot } from './GolferHeadshot';

import { TrackedPlayer } from '@/lib/firebase/firestore';
import { formatEventDates } from '@/lib/espn';

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

  const liveEvents = React.useMemo(() => events.filter((e) => e.status?.type?.state === 'in'), [events]);
  const pastEvents = React.useMemo(() => events.filter((e) => e.status?.type?.state === 'post'), [events]);
  const upcomingEvents = React.useMemo(() => events.filter((e) => e.status?.type?.state === 'pre'), [events]);

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
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-tertiary hover:bg-tertiary/90 text-on-tertiary font-bold text-xs shadow-lg border border-tertiary transition-all hover:scale-105 cursor-pointer"
      >
        <Settings className="w-4 h-4" /> Admin Controls
      </button>

      {/* Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-primary/40 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-surface-container border-l border-outline-variant h-full p-6 flex flex-col justify-between shadow-2xl overflow-y-auto">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-outline-variant pb-4">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-tertiary" />
                  <h2 className="text-base font-bold text-on-surface">Event & Roster Controls</h2>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tournament Selector Section */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-tertiary" /> Active PGA Tournament
                </label>
                <select
                  value={activeEventId || ''}
                  onChange={(e) => handleEventChange(e.target.value)}
                  disabled={saving}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-surface font-medium focus:outline-none focus:border-tertiary"
                >
                  <option value="" disabled>
                    -- Select Active Event --
                  </option>

                  {/* 🟢 Live Events */}
                  {liveEvents.length > 0 && (
                    <optgroup label="🟢 Live / Active Event">
                      {liveEvents.map((evt) => (
                        <option key={evt.id} value={evt.id}>
                          {evt.name} ({formatEventDates(evt.date, evt.endDate)})
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {/* 🏁 Past Events */}
                  {pastEvents.length > 0 && (
                    <optgroup label="🏁 Past Events">
                      {pastEvents.map((evt) => (
                        <option key={evt.id} value={evt.id}>
                          {evt.name} ({formatEventDates(evt.date, evt.endDate)})
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {/* 📅 Upcoming Events */}
                  {upcomingEvents.length > 0 && (
                    <optgroup label="📅 Upcoming Events">
                      {upcomingEvents.map((evt) => (
                        <option key={evt.id} value={evt.id}>
                          {evt.name} ({formatEventDates(evt.date, evt.endDate)})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <p className="text-[11px] text-on-surface-variant">
                  Changing the active tournament updates live leaderboards for all visitors.
                </p>
              </div>

              {/* Golfer Inventory Search & Add Section */}
              <div className="space-y-3 pt-2 border-t border-outline-variant">
                <label className="text-xs font-bold text-on-surface flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-tertiary" /> Select Golfers from Field
                  </span>
                  <span className="text-[11px] text-on-surface-variant">
                    {fieldCompetitors.length} Available
                  </span>
                </label>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-outline" />
                  <input
                    type="text"
                    placeholder="Search golfer to add..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg pl-9 pr-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-tertiary"
                  />
                </div>

                {/* Scrollable Inventory List */}
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {filteredCompetitors.length === 0 ? (
                    <p className="text-xs text-on-surface-variant text-center py-3">No matching golfers found.</p>
                  ) : (
                    filteredCompetitors.map((comp) => {
                      const isTracked = trackedPlayerIds.includes(comp.athlete.id);
                      return (
                        <div
                          key={comp.athlete.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-surface-container-lowest border border-outline-variant text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <GolferHeadshot
                              name={comp.athlete?.displayName || 'Golfer'}
                              src={comp.athlete?.headshot?.href}
                              size={24}
                            />

                            <span className="font-semibold text-on-surface truncate max-w-35">
                              {comp.athlete.displayName}
                            </span>
                          </div>

                          {isTracked ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-tertiary bg-tertiary/15 px-2 py-0.5 rounded border border-tertiary/30">
                              <Check className="w-3 h-3" /> Tracked
                            </span>
                          ) : (
                            <button
                              onClick={() => onAddTrackedPlayer?.(comp)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-on-tertiary bg-tertiary hover:bg-tertiary/90 px-2.5 py-1 rounded transition shadow-xs cursor-pointer"
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
              <div className="space-y-3 pt-2 border-t border-outline-variant">
                <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-tertiary" /> Active Watchlist ({trackedPlayers.length})
                </label>

                {trackedPlayers.length === 0 ? (
                  <p className="text-xs text-on-surface-variant bg-surface-container-low p-3 rounded-lg border border-outline-variant text-center">
                    Your tracked watchlist is currently empty. Use the search list above to add golfers.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {trackedPlayers.map((p) => (
                      <div
                        key={p.playerId}
                        className="flex items-center justify-between p-2 rounded-lg bg-surface-container-lowest border border-outline-variant text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <GolferHeadshot
                            name={p.name}
                            src={p.headshotUrl}
                            size={24}
                          />
                          <span className="font-semibold text-on-surface">{p.name}</span>
                        </div>

                        <button
                          onClick={() => onRemoveTrackedPlayer(p.playerId)}
                          className="p-1 rounded text-error hover:bg-error/10 transition cursor-pointer"
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
            <div className="pt-4 border-t border-outline-variant">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full py-2 rounded-lg bg-secondary hover:bg-secondary/90 text-on-secondary font-semibold text-xs transition cursor-pointer"
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
