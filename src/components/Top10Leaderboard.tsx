'use client';

import React, { useMemo } from 'react';
import { ESPNCompetitor, ESPNEvent } from '@/types/espn';
import { Trophy } from 'lucide-react';
import { Participant } from '@/types/contest';
import { evaluateLeaderboard, EnrichedCompetitor } from '@/lib/domain';
import { CompetitorRow } from './CompetitorRow';

interface Top10LeaderboardProps {
  competitors: ESPNCompetitor[];
  participants: Participant[];
  eventObj?: ESPNEvent;
  top10Leaders?: EnrichedCompetitor[];
  playerDraftedByMap?: Map<string, string[]>;
  selectedPlayerId?: string;
  onSelectPlayer?: (playerId: string) => void;
}

export function Top10Leaderboard({
  competitors,
  participants,
  eventObj,
  top10Leaders: propTop10Leaders,
  playerDraftedByMap: propPlayerDraftedByMap,
  selectedPlayerId,
  onSelectPlayer,
}: Top10LeaderboardProps) {
  const evaluated = useMemo(() => {
    if (propTop10Leaders) {
      return {
        top10Leaders: propTop10Leaders,
        playerDraftedByMap: propPlayerDraftedByMap || new Map<string, string[]>(),
      };
    }
    return evaluateLeaderboard(competitors, {
      participants,
      eventStatus: eventObj?.status,
    });
  }, [competitors, participants, eventObj, propTop10Leaders, propPlayerDraftedByMap]);

  const top10Leaders = evaluated.top10Leaders;
  const playerDraftedByMap = evaluated.playerDraftedByMap;


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
        <h3 className="text-sm font-black uppercase tracking-wider text-on-surface">
          Top 10 Tournament Leaders
        </h3>
        <span className="text-xs font-bold text-on-surface-variant bg-surface-container-high px-2.5 py-1 rounded-full border border-outline-variant/60">
          Top 10
        </span>
      </div>

      {/* Leaderboard Table / Cards */}
      <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
        {top10Leaders.map((comp, idx) => {
          const playerId = comp.athlete?.id || comp.id || `top10-${idx}`;
          const isSelected = selectedPlayerId === playerId;
          const draftedBy = playerDraftedByMap.get(playerId) || comp.profile.draftedBy || [];

          return (
            <CompetitorRow
              key={`top10-${playerId}-${idx}`}
              competitor={comp}
              draftedBy={draftedBy}
              rankDisplay={comp.formattedRank}
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
