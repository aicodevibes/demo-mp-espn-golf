'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { DEFAULT_PLAYER_DIRECTORY_MAP } from '@/lib/espn';
import { GolferHeadshot } from '@/components/GolferHeadshot';
import { useAllPlayers } from '@/lib/firebase/firestore';

export default function AdminPlayerGalleryPage() {
  const { playerMap, loading: loadingDirectory } = useAllPlayers();

  const allPlayerEntries = Object.values(DEFAULT_PLAYER_DIRECTORY_MAP);

  return (
    <div className="min-h-screen bg-surface text-on-surface p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-outline-variant/60 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-xs font-bold text-tertiary hover:underline bg-surface-container-high px-3 py-1.5 rounded-lg border border-outline-variant"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Admin Panel
          </Link>
          <h1 className="text-xl font-black uppercase tracking-wider text-on-surface">
            PGA Golfer Directory & Headshots Reference Gallery
          </h1>
        </div>
        <span className="text-xs font-bold bg-surface-container-high text-tertiary px-3 py-1 rounded-full border border-tertiary/30">
          {allPlayerEntries.length} PGA Golfers Cataloged
        </span>
      </div>

      <p className="text-xs text-on-surface-variant max-w-3xl leading-relaxed">
        This reference gallery displays all cataloged PGA Tour players in the application database alongside their exact ESPN athlete IDs, names, and live headshots.
      </p>

      {/* Grid of Golfers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {allPlayerEntries.map((p) => {
          const stored = playerMap[p.id];
          const displayName = stored?.name || p.name;
          const headshotUrl = stored?.headshotUrl || p.headshotUrl;

          return (
            <div
              key={p.id}
              className="bg-surface-container-low border border-outline-variant/60 hover:border-tertiary/60 p-4 rounded-xl flex items-center gap-3 transition shadow-xs"
            >
              <GolferHeadshot
                name={displayName}
                src={headshotUrl}
                playerId={p.id}
                size={56}
                priority={true}
              />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm text-on-surface truncate" title={displayName}>
                  {displayName}
                </div>
                <div className="text-[11px] font-mono text-on-surface-variant">
                  ID: <code className="bg-surface-container-high px-1 rounded">{p.id}</code>
                </div>
                <div className="text-[10px] text-tertiary font-medium mt-0.5">
                  Verified PGA Player
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
