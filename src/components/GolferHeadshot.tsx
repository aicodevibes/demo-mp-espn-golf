'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { DEFAULT_PLAYER_DIRECTORY_MAP } from '@/lib/espn';

export function getGolferInitials(name: string): string {
  if (!name || !name.trim()) return 'PGA';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

interface GolferHeadshotProps {
  name: string;
  src?: string;
  playerId?: string;
  size?: number; // width & height in px
  priority?: boolean;
  className?: string;
}

export function GolferHeadshot({
  name,
  src,
  playerId,
  size = 40,
  priority = false,
  className = '',
}: GolferHeadshotProps) {
  const [imageError, setImageError] = useState<boolean>(false);
  const [useCombinerFallback, setUseCombinerFallback] = useState<boolean>(false);
  const initials = getGolferInitials(name);

  const directoryEntry = playerId ? DEFAULT_PLAYER_DIRECTORY_MAP[playerId] : null;

  let effectiveSrc =
    src && src.startsWith('http')
      ? src
      : directoryEntry?.headshotUrl ||
        (playerId ? `https://a.espncdn.com/i/headshots/golf/players/full/${playerId}.png` : '');

  if (useCombinerFallback && playerId) {
    effectiveSrc = `https://a.espncdn.com/combiner/i?img=/i/headshots/golf/players/full/${playerId}.png&w=120&h=120&scale=crop`;
  }

  const isValidUrl = effectiveSrc && effectiveSrc.startsWith('http') && !imageError;

  if (!isValidUrl) {
    return (
      <div
        style={{ width: `${size}px`, height: `${size}px` }}
        className={`flex items-center justify-center rounded-full bg-slate-800 border border-slate-700 font-bold text-emerald-400 select-none shadow-sm ${
          size >= 48 ? 'text-xs' : 'text-[10px]'
        } ${className}`}
        title={name}
      >
        {initials}
      </div>
    );
  }

  return (
    <div
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`relative overflow-hidden rounded-full bg-slate-800 border border-slate-700/80 shrink-0 ${className}`}
    >
      <Image
        src={effectiveSrc}
        alt={name}
        width={size}
        height={size}
        priority={priority}
        onError={() => {
          if (!useCombinerFallback && playerId) {
            setUseCombinerFallback(true);
          } else {
            setImageError(true);
          }
        }}
        className="w-full h-full object-cover"
        unoptimized={true}
      />
    </div>
  );
}
