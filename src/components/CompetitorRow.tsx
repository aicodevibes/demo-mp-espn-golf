import React from 'react';
import { NormalizedCompetitor } from '@/lib/espn';
import { ESPNEventStatus } from '@/types/espn';
import { GolferHeadshot } from './GolferHeadshot';

export const EMPTY_DRAFTED_BY: string[] = [];

export interface CompetitorRowProps {
  competitor: NormalizedCompetitor;
  draftedBy?: string[];
  rankDisplay?: string | number;
  isSelected?: boolean;
  eventStatus?: ESPNEventStatus;
  priorityHeadshot?: boolean;
  isFourthGolfer?: boolean;
  onSelectPlayer?: (playerId: string) => void;
}

export function CompetitorRowComponent({
  competitor,
  draftedBy = EMPTY_DRAFTED_BY,
  rankDisplay,
  isSelected = false,
  priorityHeadshot = false,
  isFourthGolfer = false,
  onSelectPlayer,
}: CompetitorRowProps) {
  if (!competitor) return null;

  const playerId = competitor.athlete?.id || competitor.id || '';
  const displayName = competitor.athlete?.displayName || 'Golfer';
  const headshotUrl = competitor.headshotUrls?.[0] || competitor.athlete?.headshot?.href;

  const score = competitor.scoreDisplay ?? '-';
  const isUnderPar = Boolean(competitor.scoreMeta?.isUnderPar);
  const isOverPar = Boolean(competitor.scoreMeta?.isOverPar);
  const thru = competitor.thruDisplay ?? '-';

  const isDrafted = draftedBy.length > 0;
  const statusInfo = competitor.statusInfo || {
    isCut: false,
    isWD: false,
    isDQ: false,
    isInactive: false,
    isWinner: false,
    isPlayoff: false,
    badgeLabel: '',
    statusBadge: '',
  };

  const displayRank = rankDisplay !== undefined
    ? rankDisplay
    : competitor.status?.position?.displayName || competitor.order || '-';

  return (
    <div
      onClick={() => playerId && onSelectPlayer?.(playerId)}
      className={`group flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
        statusInfo.isCut || statusInfo.isWD
          ? 'bg-surface-container-high border-outline-variant/60 text-on-surface-variant opacity-75'
          : isSelected
          ? 'bg-surface-container-lowest border-tertiary shadow-xs ring-2 ring-tertiary/20'
          : 'bg-surface-container-lowest hover:bg-surface-container-high border-outline-variant/60 hover:border-outline'
      }`}
    >
      {/* Left: Position + Headshot + Name + Drafted/Status Badges */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Rank Badge */}
        <span className="w-7 h-7 rounded-full bg-surface-container-high text-on-surface-variant border border-outline-variant/60 font-bold text-xs flex items-center justify-center shrink-0">
          {displayRank}
        </span>

        {/* Golfer Headshot */}
        <GolferHeadshot
          name={displayName}
          src={headshotUrl}
          playerId={playerId}
          size={36}
          priority={priorityHeadshot}
        />

        {/* Golfer Details & Badges */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-on-surface group-hover:text-tertiary transition truncate max-w-40 sm:max-w-xs">
              {displayName}
            </span>

            {/* Participant Drafted Badge */}
            {isDrafted && (
              <span className="inline-flex items-center text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-tertiary/15 text-tertiary border border-tertiary/40">
                Drafted by {draftedBy.join(', ')}
              </span>
            )}

            {/* 4th Golfer Badge */}
            {isFourthGolfer && (
              <span className="text-[9px] font-black uppercase text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                4th · Post-Cut
              </span>
            )}

            {/* CUT Badge */}
            {statusInfo.isCut && (
              <span className="text-[9px] font-black uppercase text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                Missed Cut
              </span>
            )}

            {/* WD Badge */}
            {statusInfo.isWD && (
              <span className="text-[9px] font-black uppercase text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">
                Withdrawn
              </span>
            )}
          </div>

          <span className="text-[10px] text-on-surface-variant">
            Thru: <strong className="text-on-surface">{thru}</strong>
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
}

export const CompetitorRow = React.memo(CompetitorRowComponent);
CompetitorRow.displayName = 'CompetitorRow';
