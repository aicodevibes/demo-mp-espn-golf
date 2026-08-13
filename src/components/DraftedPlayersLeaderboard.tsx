'use client';

import React, { useMemo } from 'react';
import { ESPNCompetitor, ESPNEvent } from '@/types/espn';
import { Users } from 'lucide-react';
import { Participant } from '@/types/contest';
import { evaluateLeaderboard, EnrichedCompetitor } from '@/lib/domain';
import { CompetitorRow } from './CompetitorRow';

interface DraftedPlayersLeaderboardProps {
  competitors: ESPNCompetitor[];
  participants: Participant[];
  eventObj?: ESPNEvent;
  otherDrafted?: EnrichedCompetitor[];
  playerDraftedByMap?: Map<string, string[]>;
  selectedPlayerId?: string;
  onSelectPlayer?: (playerId: string) => void;
}

export function DraftedPlayersLeaderboard({
  competitors,
  participants,
  eventObj,
  otherDrafted: propOtherDrafted,
  playerDraftedByMap: propPlayerDraftedByMap,
  selectedPlayerId,
  onSelectPlayer,
}: DraftedPlayersLeaderboardProps) {
  const evaluated = useMemo(() => {
    if (propOtherDrafted) {
      return {
        otherDrafted: propOtherDrafted,
        playerDraftedByMap: propPlayerDraftedByMap || new Map<string, string[]>(),
      };
    }
    return evaluateLeaderboard(competitors, {
      participants,
      eventStatus: eventObj?.status,
    });
  }, [competitors, participants, eventObj, propOtherDrafted, propPlayerDraftedByMap]);

  const otherDrafted = evaluated.otherDrafted;
  const playerDraftedByMap = evaluated.playerDraftedByMap;

  if (otherDrafted.length === 0) {
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
          {otherDrafted.length} Golfer{otherDrafted.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Leaderboard Grid / Rows */}
      <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
        {otherDrafted.map((comp, idx) => {
          const playerId = comp.athlete?.id || comp.id || `drafted-${idx}`;
          const isSelected = selectedPlayerId === playerId;
          const draftedBy = playerDraftedByMap.get(playerId) || comp.profile.draftedBy || [];

          const isFourthGolfer = participants.some(p => p.draftedPlayerIds && p.draftedPlayerIds[3] === playerId);

          return (
            <CompetitorRow
              key={`drafted-${playerId}-${idx}`}
              competitor={comp}
              draftedBy={draftedBy}
              rankDisplay={comp.formattedRank}
              isSelected={isSelected}
              eventStatus={eventObj?.status}
              isFourthGolfer={isFourthGolfer}
              onSelectPlayer={onSelectPlayer}
            />
          );
        })}
      </div>
    </div>
  );
}

