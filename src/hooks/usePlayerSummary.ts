import { useState, useEffect, useMemo } from 'react';
import { ESPNCompetitor, ESPNPlayerSummary } from '@/types/espn';
import { EspnTournamentAdapter, NormalizedPlayerSummary } from '@/lib/espn';

// Global in-memory cache for player summaries during the browser session
const playerSummaryCache = new Map<string, NormalizedPlayerSummary | ESPNPlayerSummary>();

export function clearPlayerSummaryCache() {
  playerSummaryCache.clear();
}

export interface UsePlayerSummaryOptions {
  eventId: string | undefined;
  competitor: ESPNCompetitor | null | undefined;
}

export interface UsePlayerSummaryResult {
  summary: NormalizedPlayerSummary | ESPNPlayerSummary | null;
  /** True ONLY during initial cold-start before any player summary or fallback exists. */
  isLoading: boolean;
  /** True during background network requests to fetch detailed hole-by-hole linescores. */
  isFetching: boolean;
}

/**
 * Custom hook to fetch, cache, and fallback-hydrate hole-by-hole ESPN player summaries.
 * Provides 0ms instant cache retrieval and synchronous competitor fallback hydration.
 */
export function usePlayerSummary({ eventId, competitor }: UsePlayerSummaryOptions): UsePlayerSummaryResult {
  const competitorId = competitor?.athlete?.id || competitor?.id;
  const cacheKey = eventId && competitorId ? `${eventId}_${competitorId}` : '';

  // Synchronously compute cached summary or fallback summary during render to prevent 1-frame stale state tearing
  const currentSummary = useMemo(() => {
    if (!cacheKey || !competitor) return null;
    return playerSummaryCache.get(cacheKey) || EspnTournamentAdapter.normalizePlayerSummary(null, competitor);
  }, [cacheKey, competitor]);

  const [fetchedSummary, setFetchedSummary] = useState<NormalizedPlayerSummary | null>(null);
  const [fetchedCacheKey, setFetchedCacheKey] = useState<string>('');
  const [isFetching, setIsFetching] = useState<boolean>(false);

  // Use fetched summary if it matches current cacheKey, otherwise use currentSummary
  const summary = (fetchedCacheKey === cacheKey && fetchedSummary) ? fetchedSummary : currentSummary;

  useEffect(() => {
    if (!eventId || !competitorId || !competitor || !cacheKey) {
      setIsFetching(false);
      return;
    }

    let isMounted = true;

    // If already in memory cache, no background fetch needed
    if (playerSummaryCache.has(cacheKey)) {
      setIsFetching(false);
      return;
    }

    setIsFetching(true);

    async function fetchSummary() {
      try {
        const season = new Date().getFullYear();
        const res = await fetch(
          `/api/espn/playersummary?eventId=${eventId}&playerId=${competitorId}&season=${season}`
        );
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            const formatted = EspnTournamentAdapter.normalizePlayerSummary(data, competitor);
            playerSummaryCache.set(cacheKey, formatted);
            setFetchedCacheKey(cacheKey);
            setFetchedSummary(formatted);
          }
        } else {
          console.warn(`[usePlayerSummary] HTTP ${res.status} fetching summary for player ${competitorId}`);
        }
      } catch (err) {
        console.error('[usePlayerSummary] Failed to fetch player summary from ESPN API:', err);
      } finally {
        if (isMounted) {
          setIsFetching(false);
        }
      }
    }

    fetchSummary();

    return () => {
      isMounted = false;
    };
  }, [eventId, competitorId, competitor, cacheKey]);

  // isLoading is true on cold-start when no player summary exists yet
  const isLoading = summary === null;

  return {
    summary,
    isLoading,
    isFetching,
  };
}

