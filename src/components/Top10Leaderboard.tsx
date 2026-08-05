'use client';

import React, { useMemo } from 'react';
import { ESPNCompetitor, ESPNEvent } from '@/types/espn';
import { Trophy } from 'lucide-react';
import { Participant } from '@/types/contest';
import { createPlayerDraftedByMap } from '@/lib/scoring';
import { CompetitorRow } from './CompetitorRow';

interface Top10LeaderboardProps {
  competitors: ESPNCompetitor[];
  participants: Participant[];
  eventObj?: ESPNEvent;
  selectedPlayerId?: string;
  onSelectPlayer?: (playerId: string) => void;
}

export function Top10Leaderboard({
  competitors,
  participants,
  eventObj,
  selectedPlayerId,
  onSelectPlayer,
}: Top10LeaderboardProps) {
  const playerDraftedByMap = useMemo(() => {
    return createPlayerDraftedByMap(participants);
  }, [participants]);

  const top10Competitors = useMemo(() => {
    const safeCompetitors = Array.isArray(competitors) ? competitors : [];
    return safeCompetitors.slice(0, 10);
  }, [competitors]);

  if (!competitors || competitors.length === 0) {
    return (
      <div className="rounded-xl bg-surface-container-low border border-outline-variant p-6 text-center space-y-2">
        <Trophy className="w-8 h-8 text-secondary mx-auto" />
        <h4 className="text-sm font-bold text-on-surface">Top 10 Leaderboard</h4>
        <p className="text-xs text-on-surface-variant">
          Field data loading from ESPN...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 sm:p-5 space-y-4 shadow-xs">
      {/* Header Title */}
      <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-on-surface">
              Top 10 Tournament Leaders
            </h3>
            <p className="text-[11px] text-on-surface-variant">
              Live PGA field leaders & contest participant drafting badges
            </p>
          </div>
        </div>
        <span className="text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-300 dark:border-amber-700">
          Top 10
        </span>
      </div>

      {/* Leaderboard Table / Cards */}
      <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
        {top10Competitors.map((comp, idx) => {
          const playerId = comp.athlete?.id || comp.id || `top10-${idx}`;
          const isSelected = selectedPlayerId === playerId;
          const draftedBy = playerDraftedByMap.get(playerId) || [];

          return (
            <CompetitorRow
              key={`top10-${playerId}-${idx}`}
              competitor={comp}
              draftedBy={draftedBy}
              rankDisplay={comp.status?.position?.displayName || idx + 1}
              isSelected={isSelected}
              eventStatus={eventObj?.status}
              priorityHeadshot={idx < 5}
              onSelectPlayer={onSelectPlayer}
            />
          );
        })}
      </div>
    </div>
  );
}
