import { ESPNEvent } from '@/types/espn';

export interface CachedScoreboardData {
  timestamp: number;
  events: ESPNEvent[];
  lastActiveEventId?: string;
}

export interface CachedScoreboardResult {
  events: ESPNEvent[];
  lastActiveEventId?: string;
}

export const SCOREBOARD_CACHE_KEY = 'mp_espn_scoreboard_cache';
export const SCOREBOARD_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function readScoreboardCache(now: number = Date.now()): CachedScoreboardResult | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SCOREBOARD_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedScoreboardData;
    if (!parsed || !Array.isArray(parsed.events)) return null;
    if (now - parsed.timestamp > SCOREBOARD_CACHE_TTL_MS) {
      localStorage.removeItem(SCOREBOARD_CACHE_KEY);
      return null;
    }
    return {
      events: parsed.events,
      lastActiveEventId: parsed.lastActiveEventId,
    };
  } catch {
    return null;
  }
}

export function readCachedActiveEventId(now: number = Date.now()): string | null {
  const cached = readScoreboardCache(now);
  return cached?.lastActiveEventId || null;
}

export function writeScoreboardCache(
  events: ESPNEvent[],
  lastActiveEventId?: string,
  now: number = Date.now()
): void {
  if (typeof window === 'undefined' || !Array.isArray(events) || events.length === 0) return;
  try {
    let resolvedActiveId = lastActiveEventId;
    if (!resolvedActiveId) {
      const existing = readScoreboardCache(now);
      if (existing?.lastActiveEventId) {
        resolvedActiveId = existing.lastActiveEventId;
      }
    }

    const data: CachedScoreboardData = {
      timestamp: now,
      events,
      ...(resolvedActiveId ? { lastActiveEventId: resolvedActiveId } : {}),
    };
    localStorage.setItem(SCOREBOARD_CACHE_KEY, JSON.stringify(data));
  } catch {
    // Ignore quota or storage errors
  }
}

export function writeCachedActiveEventId(
  lastActiveEventId: string,
  now: number = Date.now()
): void {
  if (typeof window === 'undefined' || !lastActiveEventId) return;
  try {
    const existing = readScoreboardCache(now);
    const data: CachedScoreboardData = {
      timestamp: now,
      events: existing?.events || [],
      lastActiveEventId,
    };
    localStorage.setItem(SCOREBOARD_CACHE_KEY, JSON.stringify(data));
  } catch {
    // Ignore quota or storage errors
  }
}
