'use client';

import React, { useState, useMemo } from 'react';
import { ESPNCompetitor, ESPNEvent } from '@/types/espn';
import { Search, Trophy, User, Scissors } from 'lucide-react';
import { GolferHeadshot } from './GolferHeadshot';
import { Participant } from '@/types/contest';
import { getPlayerStatusInfo, getWinnerStatus } from '@/lib/espn';

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

  // Map of playerId -> participant names who drafted this golfer
  const playerDraftedByMap = useMemo(() => {
    const map = new Map<string, string[]>();
    participants.forEach((p) => {
      p.draftedPlayerIds?.forEach((pid) => {
        const existing = map.get(pid) || [];
        existing.push(p.name);
        map.set(pid, existing);
      });
    });
    return map;
  }, [participants]);

  // Filtered by search query
  const filteredCompetitors = useMemo(() => {
    if (!searchQuery.trim()) return competitors;
    const q = searchQuery.toLowerCase().trim();
    return competitors.filter((c) =>
      c.athlete?.displayName?.toLowerCase().includes(q)
    );
  }, [competitors, searchQuery]);

  // Separate active vs cut/WD players
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

  const renderRow = (comp: ESPNCompetitor, idx: number) => {
    const playerId = comp.athlete?.id || comp.id || `field-${idx}`;
    const isSelected = selectedPlayerId === playerId;
    const score = comp.score || 'E';
    const isUnderPar = score.startsWith('-');
    const isOverPar = score.startsWith('+');

    const draftedBy = playerDraftedByMap.get(playerId) || [];
    const isDrafted = draftedBy.length > 0;

    const winnerInfo = getWinnerStatus(comp, eventObj?.status, competitors);
    const statusInfo = getPlayerStatusInfo(comp, eventObj?.status);

    return (
      <div
        key={`fullfield-${playerId}-${idx}`}
        onClick={() => onSelectPlayer?.(playerId)}
        className={`group flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
          statusInfo.isCut || statusInfo.isWD
            ? 'bg-surface-container-high border-outline-variant/60 text-on-surface-variant opacity-75'
            : isSelected
            ? 'bg-surface-container-lowest border-tertiary shadow-xs ring-2 ring-tertiary/20'
            : 'bg-surface-container-lowest hover:bg-surface-container-high border-outline-variant/60 hover:border-outline'
        }`}
      >
        {/* Left: Position + Headshot + Name + Drafted Badge */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="w-7 h-7 rounded-full bg-surface-container-high text-on-surface-variant border border-outline-variant/60 font-bold text-xs flex items-center justify-center shrink-0">
            {comp.status?.position?.displayName || idx + 1}
          </span>

          <GolferHeadshot
            name={comp.athlete?.displayName || 'Golfer'}
            src={comp.athlete?.headshot?.href}
            playerId={playerId}
            size={36}
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-on-surface group-hover:text-tertiary transition truncate max-w-40 sm:max-w-xs">
                {comp.athlete?.displayName || 'Golfer'}
              </span>

              {isDrafted ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-tertiary/15 text-tertiary border border-tertiary/40">
                  <User className="w-3 h-3" /> Drafted by {draftedBy.join(', ')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant border border-outline-variant/40 opacity-60">
                  Free Agent
                </span>
              )}

              {statusInfo.isCut && (
                <span className="text-[9px] font-black uppercase text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                  ✂️ Missed Cut
                </span>
              )}

              {statusInfo.isWD && (
                <span className="text-[9px] font-black uppercase text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">
                  Withdrawn
                </span>
              )}
            </div>

            <span className="text-[10px] text-on-surface-variant">
              Thru: <strong className="text-on-surface">{comp.status?.thru || 'F'}</strong>
            </span>
          </div>
        </div>

        {/* Right: Score */}
        <div className="text-right shrink-0 ml-3">
          <span
            className={`text-base font-black ${
              isUnderPar
                ? 'text-tertiary'
                : isOverPar
                ? 'text-error'
                : 'text-on-surface-variant'
            }`}
          >
            {score}
          </span>
        </div>
      </div>
    );
  };

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
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {activeCompetitors.map((comp, idx) => renderRow(comp, idx))}

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
        {cutCompetitors.map((comp, idx) => renderRow(comp, activeCompetitors.length + idx))}
      </div>
    </div>
  );
}
