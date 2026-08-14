'use client';

import React from 'react';
import { Copy, Users, RefreshCw, X, ShieldCheck } from 'lucide-react';

export interface AdminRosterSyncOperationsProps {
  selectedEventId: string;
  isEventFinalized: boolean;
  syncing: boolean;
  eventsCount: number;
  participantsCount: number;
  onOpenBatchModal: () => void;
  onOpenCopyModal: () => void;
  onSeedDefaultNames: () => void;
  onAutoAssignRosters: () => void;
  onResetRosters: () => void;
  onFetchLatestScores: () => void;
  onRepairPlayerDirectory: () => void;
}

export function AdminRosterSyncOperations({
  selectedEventId,
  isEventFinalized,
  syncing,
  eventsCount,
  participantsCount,
  onOpenBatchModal,
  onOpenCopyModal,
  onSeedDefaultNames,
  onAutoAssignRosters,
  onResetRosters,
  onFetchLatestScores,
  onRepairPlayerDirectory,
}: AdminRosterSyncOperationsProps) {
  return (
    <section className="bg-surface-container-low border border-outline-variant rounded-xl p-6 space-y-5 shadow-xs">
      <h2 className="text-sm font-black uppercase tracking-widest text-on-surface border-b border-outline-variant/60 pb-3">
        Roster & Sync Operations
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Seeding & Reset Column */}
        <div className="p-4 rounded-lg bg-surface-container border border-outline-variant/60 space-y-4">
          <div>
            <h3 className="text-xs font-bold text-on-surface">Participant Seeding</h3>
            <p className="text-[11px] text-on-surface-variant">Initialize names or clear rosters</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onOpenBatchModal}
              disabled={syncing || isEventFinalized}
              className="inline-flex items-center gap-1 bg-surface-container-high hover:bg-surface-container-highest text-on-surface border border-outline-variant text-[11px] font-bold px-3 py-2 rounded transition disabled:opacity-50"
            >
              📋 Batch Paste Rosters
            </button>

            <button
              onClick={onOpenCopyModal}
              disabled={syncing || eventsCount < 2 || isEventFinalized}
              className="inline-flex items-center gap-1 bg-surface-container-high hover:bg-surface-container-highest text-on-surface border border-outline-variant text-[11px] font-bold px-3 py-2 rounded transition disabled:opacity-50"
            >
              <Copy className="w-3.5 h-3.5" /> Copy Roster from Event
            </button>

            <button
              onClick={onSeedDefaultNames}
              disabled={syncing || isEventFinalized}
              className="inline-flex items-center gap-1 bg-secondary text-on-secondary hover:bg-secondary/95 text-[11px] font-bold px-3 py-2 rounded transition disabled:opacity-50"
            >
              <Users className="w-3.5 h-3.5" /> Seed Default Names
            </button>

            <button
              onClick={onAutoAssignRosters}
              disabled={syncing || participantsCount === 0 || isEventFinalized}
              className="inline-flex items-center gap-1 bg-tertiary text-on-tertiary hover:bg-tertiary/95 text-[11px] font-bold px-3 py-2 rounded transition disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Auto-Assign Field Golfers
            </button>

            <button
              onClick={onResetRosters}
              disabled={syncing || isEventFinalized}
              className="inline-flex items-center gap-1 bg-red-600/10 text-red-600 border border-red-500/20 hover:bg-red-600/15 text-[11px] font-bold px-3 py-2 rounded transition disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5" /> Reset Rosters
            </button>
          </div>
        </div>

        {/* Sync Column */}
        <div className="p-4 rounded-lg bg-surface-container border border-outline-variant/60 space-y-4">
          <div>
            <h3 className="text-xs font-bold text-on-surface">ESPN Scores Sync</h3>
            <p className="text-[11px] text-on-surface-variant">
              Syncs scores for ESPN tournament ID:{' '}
              <code className="font-mono bg-surface-container-high px-1 rounded">
                {selectedEventId}
              </code>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onFetchLatestScores}
              disabled={syncing}
              className="inline-flex items-center gap-1 bg-tertiary text-on-tertiary hover:bg-tertiary/95 text-[11px] font-bold px-4 py-2 rounded transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Fetch Latest Scores'}
            </button>
            <button
              onClick={onRepairPlayerDirectory}
              disabled={syncing}
              className="inline-flex items-center gap-1 bg-surface-container-high text-on-surface hover:bg-surface-container-highest text-[11px] font-bold px-3 py-2 rounded border border-outline-variant transition disabled:opacity-50"
              title="Purges any corrupt legacy records in Firestore and writes authentic PGA player headshot mappings"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-tertiary" />
              Repair Player Directory
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
