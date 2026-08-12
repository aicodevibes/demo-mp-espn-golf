'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { DEFAULT_PLAYER_DIRECTORY_MAP } from '@/lib/espn';
import { getGolferInitials, GolferProfile } from '@/lib/domain';

export { getGolferInitials };

interface GolferHeadshotProps {
  name: string;
  src?: string;
  playerId?: string;
  profile?: GolferProfile;
  headshotUrls?: string[];
  size?: number; // width & height in px
  priority?: boolean;
  className?: string;
}

export function GolferHeadshot({
  name,
  src,
  playerId,
  profile,
  headshotUrls: customHeadshotUrls,
  size = 40,
  priority = false,
  className = '',
}: GolferHeadshotProps) {
  const [urlIndex, setUrlIndex] = useState<number>(0);
  const initials = getGolferInitials(name || profile?.name || '');

  // Determine candidate URLs
  let urls: string[] = [];
  if (customHeadshotUrls && customHeadshotUrls.length > 0) {
    urls = customHeadshotUrls;
  } else if (profile?.headshotUrls && profile.headshotUrls.length > 0) {
    urls = profile.headshotUrls;
  } else {
    const directoryEntry = playerId ? DEFAULT_PLAYER_DIRECTORY_MAP[playerId] : null;
    if (src && src.startsWith('http')) urls.push(src);
    if (directoryEntry?.headshotUrl) urls.push(directoryEntry.headshotUrl);
    if (playerId && /^\d+$/.test(playerId)) {
      urls.push(`https://a.espncdn.com/i/headshots/golf/players/full/${playerId}.png`);
      urls.push(`https://a.espncdn.com/combiner/i?img=/i/headshots/golf/players/full/${playerId}.png&w=120&h=120&scale=crop`);
    }
  }

  const effectiveSrc = urls[urlIndex] || '';
  const isValidUrl = effectiveSrc && effectiveSrc.startsWith('http') && urlIndex < urls.length;

  if (!isValidUrl) {
    return (
      <div
        style={{ width: `${size}px`, height: `${size}px` }}
        className={`flex items-center justify-center rounded-full bg-slate-800 border border-slate-700 font-bold text-emerald-400 select-none shadow-sm ${
          size >= 48 ? 'text-xs' : 'text-[10px]'
        } ${className}`}
        title={name || profile?.name}
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
        alt={name || profile?.name || 'Golfer Headshot'}
        width={size}
        height={size}
        priority={priority}
        onError={() => {
          setUrlIndex((prev) => prev + 1);
        }}
        className="w-full h-full object-cover"
        unoptimized={true}
      />
    </div>
  );
}

