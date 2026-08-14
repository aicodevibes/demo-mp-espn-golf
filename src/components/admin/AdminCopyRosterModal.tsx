'use client';

import React from 'react';
import { X, Copy } from 'lucide-react';
import { ESPNEvent } from '@/types/espn';

export interface AdminCopyRosterModalProps {
  isOpen: boolean;
  syncing: boolean;
  events: ESPNEvent[];
  selectedEventId: string;
  sourceCopyEventId: string;
  onChangeSourceCopyEventId: (id: string) => void;
  onClose: () => void;
  onCopyRoster: () => void;
}

export function AdminCopyRosterModal({
  isOpen,
  syncing,
  events,
  selectedEventId,
  sourceCopyEventId,
  onChangeSourceCopyEventId,
  onClose,
  onCopyRoster,
}: AdminCopyRosterModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
        <div className="flex justify-between items-center border-b border-outline-variant/60 pb-3">
          <h3 className="text-base font-extrabold text-on-surface flex items-center gap-2">
            <Copy className="w-4 h-4 text-tertiary" /> Copy Roster from Past Event
          </h3>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-on-surface-variant leading-relaxed">
          Select a prior tournament event below. Participant names will be copied to the current event, while drafted golfers, greedy picks, and payment flags will be cleanly reset to defaults.
        </p>

        <select
          value={sourceCopyEventId}
          onChange={(e) => onChangeSourceCopyEventId(e.target.value)}
          className="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-xs text-on-surface outline-none focus:border-outline"
        >
          <option value="">-- Select Source Tournament Event --</option>
          {events
            .filter((ev) => ev.id !== selectedEventId)
            .map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name} ({ev.id})
              </option>
            ))}
        </select>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-on-surface-variant hover:bg-surface-container rounded-lg border border-outline-variant"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onCopyRoster}
            disabled={!sourceCopyEventId || syncing}
            className="px-5 py-2 text-xs font-bold bg-tertiary hover:bg-tertiary/90 text-on-tertiary rounded-lg shadow-xs transition disabled:opacity-50"
          >
            {syncing ? 'Copying...' : 'Copy Roster & Reset Picks'}
          </button>
        </div>
      </div>
    </div>
  );
}
