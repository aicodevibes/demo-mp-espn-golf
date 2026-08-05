'use client';

import React, { useState, useMemo } from 'react';
import { ESPNCompetitor, ESPNEvent } from '@/types/espn';
import { Search, Scissors } from 'lucide-react';
import { Participant } from '@/types/contest';
import { getPlayerStatusInfo } from '@/lib/espn';
import { createPlayerDraftedByMap } from '@/lib/scoring';
import { CompetitorRow } from './CompetitorRow';

interface FullFieldLeaderboardProps {
  competitors: ESPNCompetitor[];
  participants: Participant[];
  eventObj?: ESPNEvent;
  selectedPlayerId?: string;
  onSelectPlayer?: (playerId: string) => void;
}

export function FullFieldLeaderboard({
  competitors,
  participants,
  eventObj,
  selectedPlayerId,
  onSelectPlayer,
}: FullFieldLeaderboardProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');

  const playerDraftedByMap = useMemo(() => {
    return createPlayerDraftedByMap(participants);
  }, [participants]);

  const filteredCompetitors = useMemo(() => {
    if (!searchQuery.trim()) return competitors;
    const q = searchQuery.toLowerCase().trim();
    return competitors.filter((c) =>
      c.athlete?.displayName?.toLowerCase().includes(q)
    );
  }, [competitors, searchQuery]);

  const { activeCompetitors, cutCompetitors } = useMemo(() => {
    const active: ESPNCompetitor[] = [];
    const cut: ESPNCompetitor[] = [];

    filteredCompetitors.forEach((comp) => {
      const status = getPlayerStatusInfo(comp, eventObj?.status);
      if (status.isInactive) {
        cut.push(comp);
      } else {
        active.push(comp);
      }
    });

    return { activeCompetitors: active, cutCompetitors: cut };
  }, [filteredCompetitors, eventObj]);

  return (
    <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 sm:p-5 space-y-4 shadow-xs">
      {/* Header & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/60 pb-3">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-on-surface">
            Full PGA Tournament Field
          </h3>
          <p className="text-[11px] text-on-surface-variant">
            Complete tournament field standings ({competitors.length} competitors)
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search golfer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg pl-9 pr-3 py-1.5 text-xs text-on-surface outline-none focus:border-tertiary shadow-xs"
          />
        </div>
      </div>

      {/* Active Competitors List */}
      <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
        {activeCompetitors.map((comp, idx) => {
          const playerId = comp.athlete?.id || comp.id || `active-${idx}`;
          const isSelected = selectedPlayerId === playerId;
          const draftedBy = playerDraftedByMap.get(playerId) || [];

          return (
            <CompetitorRow
              key={`field-active-${playerId}-${idx}`}
              competitor={comp}
              draftedBy={draftedBy}
              rankDisplay={comp.status?.position?.displayName || idx + 1}
              isSelected={isSelected}
              eventStatus={eventObj?.status}
              onSelectPlayer={onSelectPlayer}
            />
          );
        })}

        {/* Cut Line Divider */}
        {cutCompetitors.length > 0 && (
          <div className="pt-4 pb-2">
            <div className="flex items-center gap-3">
              <div className="h-px bg-error/30 flex-1" />
              <span className="text-[11px] font-black uppercase tracking-wider text-error bg-error/10 border border-error/30 px-3 py-1 rounded-full flex items-center gap-1.5">
                <Scissors className="w-3.5 h-3.5" /> Project Cut Line ({cutCompetitors.length} Golfers Cut / WD)
              </span>
              <div className="h-px bg-error/30 flex-1" />
            </div>
          </div>
        )}

        {/* Cut / Inactive Competitors */}
        {cutCompetitors.map((comp, idx) => {
          const playerId = comp.athlete?.id || comp.id || `cut-${idx}`;
          const isSelected = selectedPlayerId === playerId;
          const draftedBy = playerDraftedByMap.get(playerId) || [];

          return (
            <CompetitorRow
              key={`field-cut-${playerId}-${idx}`}
              competitor={comp}
              draftedBy={draftedBy}
              rankDisplay={comp.status?.position?.displayName || activeCompetitors.length + idx + 1}
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
