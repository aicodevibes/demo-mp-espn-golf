'use client';

import React from 'react';
import { Star } from 'lucide-react';
import { ESPNEvent } from '@/types/espn';

export interface AdminCalendarSidebarProps {
  events: ESPNEvent[];
  loadingEvents: boolean;
  activeEventId: string;
  selectedEventId: string;
  onSelectEvent: (eventId: string) => void;
}

export function AdminCalendarSidebar({
  events,
  loadingEvents,
  activeEventId,
  selectedEventId,
  onSelectEvent,
}: AdminCalendarSidebarProps) {
  return (
    <aside className="lg:col-span-4 bg-surface-container-low border border-outline-variant rounded-xl p-6 space-y-4 shadow-xs h-fit sticky top-6">
      <h2 className="text-xs font-black uppercase tracking-widest text-on-surface border-b border-outline-variant/60 pb-3">
        PGA Calendar Events
      </h2>
      <p className="text-[11px] text-on-surface-variant">
        Quick selection of scheduled tournaments on the PGA Tour. Active event is starred.
      </p>

      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {loadingEvents ? (
          <div className="py-4 text-center text-xs text-on-surface-variant italic">
            Loading events list...
          </div>
        ) : (
          events.map((e) => {
            const isActive = e.id === activeEventId;
            const isCurrentEdit = e.id === selectedEventId;
            return (
              <button
                key={e.id}
                onClick={() => onSelectEvent(e.id)}
                className={`w-full text-left p-3 rounded-lg border text-xs transition flex justify-between items-center gap-3 cursor-pointer ${
                  isCurrentEdit
                    ? 'bg-secondary-container text-on-secondary-container border-outline'
                    : 'bg-surface-container-lowest border-outline-variant/60 hover:bg-surface-container hover:border-outline-variant'
                }`}
              >
                <div className="space-y-1">
                  <p className="font-bold truncate max-w-44">{e.name}</p>
                  <p className="text-[10px] text-on-surface-variant font-semibold">
                    {e.date ? new Date(e.date).toLocaleDateString() : 'N/A'}
                  </p>
                </div>

                {isActive && (
                  <span className="bg-tertiary text-on-tertiary px-1.5 py-0.5 rounded text-[9px] font-black uppercase flex items-center gap-0.5 shrink-0">
                    <Star className="w-2.5 h-2.5 fill-on-tertiary" /> Active
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
