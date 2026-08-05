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
    const top10Ids = new Set(competitors.slice(0, 10).map((c) => c.athlete?.id || c.id));

    return competitors.filter((comp) => {
      const pid = comp.athlete?.id || comp.id;
      return allDraftedPlayerIdsSet.has(pid) && !top10Ids.has(pid);
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
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-tertiary/10 border border-tertiary/30 flex items-center justify-center">
            <Users className="w-4 h-4 text-tertiary" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-on-surface">
              Other Drafted Golfers (Outside Top 10)
            </h3>
            <p className="text-[11px] text-on-surface-variant">
              In-field drafted golfers competing outside the top 10
            </p>
          </div>
        </div>
        <span className="text-xs font-bold text-tertiary bg-tertiary/10 px-2.5 py-1 rounded-full border border-tertiary/30">
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
