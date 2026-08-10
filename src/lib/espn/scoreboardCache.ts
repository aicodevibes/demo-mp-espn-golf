import { ESPNEvent } from '@/types/espn';

export interface CachedScoreboardData {
  timestamp: number;
  events: ESPNEvent[];
}

export const SCOREBOARD_CACHE_KEY = 'mp_espn_scoreboard_cache';
export const SCOREBOARD_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function readScoreboardCache(now: number = Date.now()): ESPNEvent[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SCOREBOARD_CACHE_KEY);
    if (!raw) return null;
    const parsed: CachedScoreboardData = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.events)) return null;
    if (now - parsed.timestamp > SCOREBOARD_CACHE_TTL_MS) {
      localStorage.removeItem(SCOREBOARD_CACHE_KEY);
      return null;
    }
    return parsed.events;
  } catch (err) {
    return null;
  }
}

export function writeScoreboardCache(events: ESPNEvent[], now: number = Date.now()): void {
  if (typeof window === 'undefined' || !Array.isArray(events) || events.length === 0) return;
  try {
    const data: CachedScoreboardData = {
      timestamp: now,
      events,
    };
    localStorage.setItem(SCOREBOARD_CACHE_KEY, JSON.stringify(data));
  } catch (err) {
    // Ignore quota or storage error
  }
}
