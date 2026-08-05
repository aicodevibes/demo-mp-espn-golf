'use client';

import React, { useMemo } from 'react';
import { ESPNCompetitor, ESPNEvent } from '@/types/espn';
import { Trophy, Award, User } from 'lucide-react';
import { GolferHeadshot } from './GolferHeadshot';
import { Participant } from '@/types/contest';
import { getWinnerStatus, getPlayerStatusInfo, getTop10WithTies } from '@/lib/espn';

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

  // Top 10 field competitors (ranks 1 to 10)
  const top10Competitors = useMemo(() => {
    return competitors.slice(0, 10);
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

      {/* Leaderboard Table / Cards (Scrollable Viewport capped to 10 rows) */}
      <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
        {top10Competitors.map((comp, idx) => {
          const playerId = comp.athlete?.id || comp.id || `top10-${idx}`;
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
              key={`top10-${playerId}-${idx}`}
              onClick={() => onSelectPlayer?.(playerId)}
              className={`group flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                isSelected
                  ? 'bg-surface-container-lowest border-tertiary shadow-xs ring-2 ring-tertiary/20'
                  : 'bg-surface-container-lowest hover:bg-surface-container-high border-outline-variant/60 hover:border-outline'
              }`}
            >
              {/* Left: Position + Headshot + Name + Drafted Badge */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Rank Badge */}
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                    idx === 0
                      ? 'bg-amber-400 text-amber-950 shadow-xs'
                      : idx === 1
                      ? 'bg-slate-300 text-slate-900'
                      : idx === 2
                      ? 'bg-amber-700 text-white'
                      : 'bg-surface-container-high text-on-surface-variant border border-outline-variant/60'
                  }`}
                >
                  {comp.status?.position?.displayName || idx + 1}
                </span>

                {/* Headshot */}
                <GolferHeadshot
                  name={comp.athlete?.displayName || 'Golfer'}
                  src={comp.athlete?.headshot?.href}
                  playerId={playerId}
                  size={36}
                  priority={idx < 5}
                />

                {/* Bio & Drafted Badge */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-on-surface group-hover:text-tertiary transition truncate max-w-40 sm:max-w-xs">
                      {comp.athlete?.displayName || 'Golfer'}
                    </span>

                    {/* Participant Drafted Badge */}
                    {isDrafted ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-tertiary/15 text-tertiary border border-tertiary/40">
                        <User className="w-3 h-3" /> Drafted by {draftedBy.join(', ')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant border border-outline-variant/40 opacity-70">
                        Undrafted
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
