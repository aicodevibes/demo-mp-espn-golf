'use client';

import React from 'react';
import Link from 'next/link';
import { Trash2, RefreshCw, ShieldCheck, Eye, UserPlus, Save } from 'lucide-react';

export interface AdminPlayerDirectoryToolsProps {
  syncing: boolean;
  customGolferId: string;
  customGolferName: string;
  customGolferHeadshot: string;
  onChangeCustomGolferId: (id: string) => void;
  onChangeCustomGolferName: (name: string) => void;
  onChangeCustomGolferHeadshot: (url: string) => void;
  onClearPlayersDatabase: () => void;
  onImportPgaCatalog: () => void;
  onRepairPlayerDirectory: () => void;
  onSaveCustomGolfer: (e: React.FormEvent) => void;
}

export function AdminPlayerDirectoryTools({
  syncing,
  customGolferId,
  customGolferName,
  customGolferHeadshot,
  onChangeCustomGolferId,
  onChangeCustomGolferName,
  onChangeCustomGolferHeadshot,
  onClearPlayersDatabase,
  onImportPgaCatalog,
  onRepairPlayerDirectory,
  onSaveCustomGolfer,
}: AdminPlayerDirectoryToolsProps) {
  return (
    <section className="bg-surface-container-low border border-outline-variant rounded-xl p-6 space-y-4 shadow-xs">
      <h2 className="text-sm font-black uppercase tracking-widest text-on-surface border-b border-outline-variant/60 pb-3 flex justify-between items-center">
        <span>Player Directory & Headshots Database</span>
        <span className="text-xs text-tertiary font-bold normal-case">
          Database Control
        </span>
      </h2>

      <div className="p-4 rounded-lg bg-surface-container-lowest border border-outline-variant/60 space-y-4">
        <p className="text-xs text-on-surface-variant leading-relaxed">
          Clear out stored golfer records from Firestore and reload fresh authentic ESPN PGA player catalog entries with headshot URLs.
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onClearPlayersDatabase}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 text-[11px] font-bold px-3.5 py-2 rounded transition disabled:opacity-50"
            title="Deletes all stored player documents in the Firestore players collection"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Players Database
          </button>

          <button
            onClick={onImportPgaCatalog}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 bg-tertiary text-on-tertiary hover:bg-tertiary/95 text-[11px] font-bold px-3.5 py-2 rounded transition disabled:opacity-50"
            title="Populates fresh authentic PGA Tour players catalog with correct ESPN athlete IDs and headshots"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            Load Fresh PGA Player Catalog
          </button>

          <button
            onClick={onRepairPlayerDirectory}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 bg-surface-container-high text-on-surface hover:bg-surface-container-highest text-[11px] font-bold px-3 py-2 rounded border border-outline-variant transition disabled:opacity-50"
            title="Purges any corrupt legacy records in Firestore and updates canonical entries"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-tertiary" />
            Repair Player Directory
          </button>

          <Link
            href="/admin/gallery"
            className="inline-flex items-center gap-1.5 bg-tertiary/10 text-tertiary hover:bg-tertiary/20 text-[11px] font-bold px-3.5 py-2 rounded border border-tertiary/30 transition"
            title="Open reference gallery displaying all player headshots and IDs side-by-side"
          >
            <Eye className="w-3.5 h-3.5" />
            View Player Gallery
          </Link>
        </div>

        {/* Add / Update Single Custom Golfer Form */}
        <form onSubmit={onSaveCustomGolfer} className="pt-3 border-t border-outline-variant/40 space-y-3">
          <h3 className="text-xs font-bold text-on-surface flex items-center gap-1">
            <UserPlus className="w-3.5 h-3.5 text-tertiary" />
            Add or Edit Specific Golfer Document
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">
                Player ESPN ID (e.g. 3470)
              </label>
              <input
                type="text"
                value={customGolferId}
                onChange={(e) => onChangeCustomGolferId(e.target.value)}
                placeholder="e.g. 3470"
                className="w-full bg-surface-container-high text-on-surface text-xs px-3 py-2 rounded border border-outline-variant focus:outline-hidden focus:border-tertiary"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">
                Player Name
              </label>
              <input
                type="text"
                value={customGolferName}
                onChange={(e) => onChangeCustomGolferName(e.target.value)}
                placeholder="e.g. Scottie Scheffler"
                className="w-full bg-surface-container-high text-on-surface text-xs px-3 py-2 rounded border border-outline-variant focus:outline-hidden focus:border-tertiary"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">
                Headshot Image URL (Optional)
              </label>
              <input
                type="url"
                value={customGolferHeadshot}
                onChange={(e) => onChangeCustomGolferHeadshot(e.target.value)}
                placeholder="https://a.espncdn.com/i/headshots..."
                className="w-full bg-surface-container-high text-on-surface text-xs px-3 py-2 rounded border border-outline-variant focus:outline-hidden focus:border-tertiary"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={syncing}
              className="inline-flex items-center gap-1 bg-secondary text-on-secondary hover:bg-secondary/95 text-[11px] font-bold px-3.5 py-1.5 rounded transition disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              Save Golfer Document
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
