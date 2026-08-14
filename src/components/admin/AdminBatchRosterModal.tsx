'use client';

import React from 'react';
import { X } from 'lucide-react';

export interface AdminBatchRosterModalProps {
  isOpen: boolean;
  syncing: boolean;
  batchRosterText: string;
  onChangeBatchRosterText: (text: string) => void;
  onClose: () => void;
  onProcessBatchRosters: () => void;
}

export function AdminBatchRosterModal({
  isOpen,
  syncing,
  batchRosterText,
  onChangeBatchRosterText,
  onClose,
  onProcessBatchRosters,
}: AdminBatchRosterModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
        <div className="flex justify-between items-center border-b border-outline-variant/60 pb-3">
          <h3 className="text-base font-extrabold text-on-surface flex items-center gap-2">
            📋 Batch Paste Participant Rosters
          </h3>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-on-surface-variant leading-relaxed">
          Paste your participant names and comma-delimited golfer rosters below (one participant per line). Format:{' '}
          <code className="font-mono text-tertiary">Name: Golfer 1, Golfer 2, Golfer 3</code>
        </p>

        <textarea
          rows={8}
          placeholder={`Pat: Scottie Scheffler, Rory McIlroy, Xander Schauffele\nGreg: Jon Rahm, Viktor Hovland, Brooks Koepka\nDereck: Collin Morikawa, Wyndham Clark, Patrick Cantlay`}
          value={batchRosterText}
          onChange={(e) => onChangeBatchRosterText(e.target.value)}
          className="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-xs text-on-surface font-mono outline-none focus:border-outline"
        />

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
            onClick={onProcessBatchRosters}
            disabled={syncing || !batchRosterText.trim()}
            className="px-5 py-2 text-xs font-bold bg-tertiary hover:bg-tertiary/90 text-on-tertiary rounded-lg shadow-xs transition disabled:opacity-50"
          >
            {syncing ? 'Processing...' : 'Import Rosters'}
          </button>
        </div>
      </div>
    </div>
  );
}
