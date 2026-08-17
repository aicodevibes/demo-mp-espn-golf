import { useState, useEffect, useMemo, useRef } from 'react';
import { ESPNCompetitor } from '@/types/espn';
import { EspnTournamentAdapter, NormalizedPlayerSummary } from '@/lib/espn';

export interface CacheEntry {
  summary: NormalizedPlayerSummary;
  fingerprint: string;
  timestamp: number;
}

// Global in-memory cache for player summaries during the browser session
const playerSummaryCache = new Map<string, CacheEntry>();

// Track in-flight promises to deduplicate concurrent pre-fetches for the same player
const inFlightRequests = new Map<string, Promise<NormalizedPlayerSummary | null>>();

export function clearPlayerSummaryCache() {
  playerSummaryCache.clear();
  inFlightRequests.clear();
}

export function getCachedPlayerSummary(cacheKey: string): CacheEntry | undefined {
  return playerSummaryCache.get(cacheKey);
}

export function buildPlayerSummaryCacheKey(eventId: string | undefined, competitorId: string | undefined): string {
  return eventId && competitorId ? `${eventId}_${competitorId}` : '';
}

export function buildPlayerFingerprint(
  eventId: string | undefined,
  competitor: ESPNCompetitor | null | undefined
): string {
  const competitorId = competitor?.athlete?.id || competitor?.id;
  const cacheKey = buildPlayerSummaryCacheKey(eventId, competitorId);
  if (!cacheKey) return '';

  const period = competitor?.status?.period ?? 1;
  const thru = competitor?.status?.thru ?? 0;
  const rawScore = competitor?.score;
  const scoreDisplay =
    typeof rawScore === 'string' || typeof rawScore === 'number'
      ? String(rawScore)
      : rawScore && typeof rawScore === 'object' && 'displayValue' in rawScore && rawScore.displayValue !== undefined
      ? String(rawScore.displayValue)
      : '';

  return `${cacheKey}_p${period}_t${thru}_s${scoreDisplay}`;
}

/**
 * Pre-fetch a single golfer's player summary in the background and warm the client cache.
 */
export async function prefetchPlayerSummary(
  eventId: string,
  competitor: ESPNCompetitor | null | undefined
): Promise<NormalizedPlayerSummary | null> {
  const competitorId = competitor?.athlete?.id || competitor?.id;
  const cacheKey = buildPlayerSummaryCacheKey(eventId, competitorId);
  if (!cacheKey || !competitor) return null;

  const fingerprint = buildPlayerFingerprint(eventId, competitor);
  const cached = playerSummaryCache.get(cacheKey);
  const isLive = competitor?.status?.type?.state === 'in';
  const now = Date.now();
  const isFresh = cached && cached.fingerprint === fingerprint && now - cached.timestamp < (isLive ? 30000 : 300000);

  if (isFresh && cached) {
    return cached.summary;
  }

  // Deduplicate ongoing network requests
  const inFlight = inFlightRequests.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  const season = new Date().getFullYear();
  const promise = (async () => {
    try {
      const res = await fetch(
        `/api/espn/playersummary?eventId=${eventId}&playerId=${competitorId}&season=${season}`
      );
      if (res.ok) {
        const data = await res.json();
        const formatted = EspnTournamentAdapter.normalizePlayerSummary(data, competitor);
        playerSummaryCache.set(cacheKey, {
          summary: formatted,
          fingerprint,
          timestamp: Date.now(),
        });
        return formatted;
      } else if (res.status === 404) {
        const fallback = EspnTournamentAdapter.normalizePlayerSummary(null, competitor);
        playerSummaryCache.set(cacheKey, {
          summary: fallback,
          fingerprint,
          timestamp: Date.now(),
        });
        return fallback;
      }
      return null;
    } catch (err: unknown) {
      // Background prefetch should fail silently without crashing
      return null;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, promise);
  return promise;
}

/**
 * Concurrently pre-fetch player summaries for a list of competitors (e.g. drafted golfers).
 */
export async function prefetchPlayerSummaries(
  eventId: string,
  competitors: Array<ESPNCompetitor | null | undefined>
): Promise<void> {
  if (!eventId || !competitors.length) return;
  const validCompetitors = competitors.filter(
    (c): c is ESPNCompetitor => Boolean(c && (c.athlete?.id || c.id))
  );

  await Promise.allSettled(
    validCompetitors.map((comp) => prefetchPlayerSummary(eventId, comp))
  );
}

export interface UsePlayerSummaryOptions {
  eventId: string | undefined;
  competitor: ESPNCompetitor | null | undefined;
}

export interface UsePlayerSummaryResult {
  summary: NormalizedPlayerSummary | null;
  /** True ONLY during initial cold-start before any player summary or fallback exists. */
  isLoading: boolean;
  /** True during background network requests to fetch detailed hole-by-hole linescores. */
  isFetching: boolean;
}

/**
 * Custom hook to fetch, cache, and fallback-hydrate hole-by-hole ESPN player summaries.
 * Provides 0ms instant cache retrieval and synchronous competitor fallback hydration,
 * with AbortController cancellation and 404 cooldown caching to prevent network storms.
 */
export function usePlayerSummary({ eventId, competitor }: UsePlayerSummaryOptions): UsePlayerSummaryResult {
  const competitorId = competitor?.athlete?.id || competitor?.id;
  const isLive = competitor?.status?.type?.state === 'in';

  const cacheKey = buildPlayerSummaryCacheKey(eventId, competitorId);
  const fingerprint = buildPlayerFingerprint(eventId, competitor);

  // Keep ref to latest competitor to avoid unstable object references in useEffect
  const competitorRef = useRef(competitor);
  competitorRef.current = competitor;

  // Synchronously compute cached summary or fallback summary during render to prevent 1-frame stale state tearing
  const currentSummary = useMemo(() => {
    if (!cacheKey || !competitor) return null;
    const cached = playerSummaryCache.get(cacheKey);
    if (cached) return cached.summary;
    return EspnTournamentAdapter.normalizePlayerSummary(null, competitor);
  }, [cacheKey, competitor]);

  const [fetchedSummary, setFetchedSummary] = useState<NormalizedPlayerSummary | null>(null);
  const [fetchedFingerprint, setFetchedFingerprint] = useState<string>('');
  const [isFetching, setIsFetching] = useState<boolean>(false);

  // Use fetched summary if it matches current fingerprint, otherwise use currentSummary
  const summary = (fetchedFingerprint === fingerprint && fetchedSummary) ? fetchedSummary : currentSummary;

  useEffect(() => {
    if (!eventId || !competitorId || !cacheKey) {
      setIsFetching(false);
      return;
    }

    const cached = playerSummaryCache.get(cacheKey);
    const now = Date.now();
    const isFresh = cached && cached.fingerprint === fingerprint && (now - cached.timestamp < (isLive ? 30000 : 300000));

    // If cache is fresh and fingerprint matches, skip background network fetch
    if (isFresh) {
      setIsFetching(false);
      return;
    }

    const controller = new AbortController();
    let isMounted = true;
    setIsFetching(true);

    async function fetchSummary() {
      try {
        const season = new Date().getFullYear();
        const res = await fetch(
          `/api/espn/playersummary?eventId=${eventId}&playerId=${competitorId}&season=${season}`,
          { signal: controller.signal }
        );
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            const comp = competitorRef.current;
            const formatted = EspnTournamentAdapter.normalizePlayerSummary(data, comp);
            playerSummaryCache.set(cacheKey, {
              summary: formatted,
              fingerprint,
              timestamp: Date.now(),
            });
            setFetchedFingerprint(fingerprint);
            setFetchedSummary(formatted);
          }
        } else if (res.status === 404) {
          // On 404 (e.g. player not in field or pre-round), cache normalized fallback to prevent spamming
          const comp = competitorRef.current;
          const fallback = EspnTournamentAdapter.normalizePlayerSummary(null, comp);
          playerSummaryCache.set(cacheKey, {
            summary: fallback,
            fingerprint,
            timestamp: Date.now(),
          });
          if (isMounted) {
            setFetchedFingerprint(fingerprint);
            setFetchedSummary(fallback);
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        console.error('[usePlayerSummary] Failed to fetch player summary from ESPN API:', err);
      } finally {
        if (isMounted && !controller.signal.aborted) {
          setIsFetching(false);
        }
      }
    }

    fetchSummary();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [eventId, competitorId, cacheKey, fingerprint, isLive]);

  // isLoading is true on cold-start when no player summary exists yet
  const isLoading = summary === null;

  return {
    summary,
    isLoading,
    isFetching,
  };
}

