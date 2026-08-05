'use client';

import React, { useMemo } from 'react';
import { ESPNCompetitor, ESPNEvent } from '@/types/espn';
import { Users, User, Scissors } from 'lucide-react';
import { GolferHeadshot } from './GolferHeadshot';
import { Participant } from '@/types/contest';
import { getPlayerStatusInfo, getTop10WithTies } from '@/lib/espn';

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

  // Set of all drafted player IDs
  const allDraftedPlayerIdsSet = useMemo(() => {
    const set = new Set<string>();
    participants.forEach((p) => {
      p.draftedPlayerIds?.forEach((pid) => set.add(pid));
    });
    return set;
  }, [participants]);

  // Drafted golfers OUTSIDE top 10 (field rank index >= 10)
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

      {/* Leaderboard Grid / Rows (Scrollable Viewport capped to 10 rows) */}
      <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
        {outsideTop10DraftedCompetitors.map((comp, idx) => {
          const playerId = comp.athlete?.id || comp.id || `drafted-${idx}`;
          const isSelected = selectedPlayerId === playerId;
          const score = comp.score || 'E';
          const isUnderPar = score.startsWith('-');
          const isOverPar = score.startsWith('+');

          const draftedBy = playerDraftedByMap.get(playerId) || [];
          const statusInfo = getPlayerStatusInfo(comp, eventObj?.status);

          return (
            <div
              key={`drafted-${playerId}-${idx}`}
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
                  {comp.status?.position?.displayName || idx + 11}
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

                    {draftedBy.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-tertiary/15 text-tertiary border border-tertiary/40">
                        <User className="w-3 h-3" /> Drafted by {draftedBy.join(', ')}
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
        })}
      </div>
    </div>
  );
}
