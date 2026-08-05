'use client';

import React, { useMemo } from 'react';
import { ESPNCompetitor, ESPNEvent } from '@/types/espn';
import { Users } from 'lucide-react';
import { Participant } from '@/types/contest';
import { createPlayerDraftedByMap } from '@/lib/scoring';
import { CompetitorRow } from './CompetitorRow';

interface DraftedPlayersLeaderboardProps {
  competitors: ESPNCompetitor[];
  participants: Participant[];
  eventObj?: ESPNEvent;
  selectedPlayerId?: string;
  onSelectPlayer?: (playerId: string) => void;
}

export function DraftedPlayersLeaderboard({
  competitors,
  participants,
  eventObj,
  selectedPlayerId,
  onSelectPlayer,
}: DraftedPlayersLeaderboardProps) {
  const playerDraftedByMap = useMemo(() => {
    return createPlayerDraftedByMap(participants);
  }, [participants]);

  const allDraftedPlayerIdsSet = useMemo(() => {
    const set = new Set<string>();
    participants.forEach((p) => {
      p.draftedPlayerIds?.forEach((pid) => set.add(pid));
    });
    return set;
  }, [participants]);

  const outsideTop10DraftedCompetitors = useMemo(() => {
    const safeCompetitors = Array.isArray(competitors) ? competitors : [];
    const top10Ids = new Set(safeCompetitors.slice(0, 10).map((c) => c?.athlete?.id || c?.id));

    return safeCompetitors.filter((comp) => {
      if (!comp) return false;
      const pid = comp.athlete?.id || comp.id;
      return pid && allDraftedPlayerIdsSet.has(pid) && !top10Ids.has(pid);
    });
  }, [competitors, allDraftedPlayerIdsSet]);

  if (outsideTop10DraftedCompetitors.length === 0) {
    return (
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5 text-center space-y-2">
        <Users className="w-8 h-8 text-tertiary mx-auto opacity-70" />
        <h4 className="text-sm font-bold text-on-surface">Other Drafted Golfers</h4>
        <p className="text-xs text-on-surface-variant">
          All drafted pool golfers are currently inside the Top 10!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 sm:p-5 space-y-4 shadow-xs">
      {/* Header Title */}
      <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
        <h3 className="text-sm font-black uppercase tracking-wider text-on-surface">
          Other Drafted Golfers (Outside Top 10)
        </h3>
        <span className="text-xs font-bold text-on-surface-variant bg-surface-container-high px-2.5 py-1 rounded-full border border-outline-variant/60">
          {outsideTop10DraftedCompetitors.length} Golfer{outsideTop10DraftedCompetitors.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Leaderboard Grid / Rows */}
      <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
        {outsideTop10DraftedCompetitors.map((comp, idx) => {
          const playerId = comp.athlete?.id || comp.id || `drafted-${idx}`;
          const isSelected = selectedPlayerId === playerId;
          const draftedBy = playerDraftedByMap.get(playerId) || [];

          return (
            <CompetitorRow
              key={`drafted-${playerId}-${idx}`}
              competitor={comp}
              draftedBy={draftedBy}
              rankDisplay={comp.status?.position?.displayName || idx + 11}
              isSelected={isSelected}
              eventStatus={eventObj?.status}
              onSelectPlayer={onSelectPlayer}
            />
          );
        })}
      </div>
    </div>
  );
}
