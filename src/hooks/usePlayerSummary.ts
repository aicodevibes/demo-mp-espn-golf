import { useState, useEffect, useMemo, useRef } from 'react';
import { ESPNCompetitor, ESPNEvent } from '@/types/espn';
import { EspnTournamentAdapter, NormalizedPlayerSummary } from '@/lib/espn';

const MIN_VALID_SEASON_YEAR = 1900;
const MAX_VALID_SEASON_YEAR = 9999;

function normalizeSeason(season?: number): number {
  if (
    typeof season === 'number' &&
    Number.isInteger(season) &&
    season >= MIN_VALID_SEASON_YEAR &&
    season <= MAX_VALID_SEASON_YEAR
  ) {
    return season;
  }
  return new Date().getFullYear();
}

/**
 * Resolve the 4-digit PGA Tour season year from an ESPN event, falling back to
 * UTC year of `event.date` and finally the current calendar year.
 */
export function resolveEventSeason(
  event?: Pick<ESPNEvent, 'season' | 'date'> | null
): number {
  const explicitYear = event?.season?.year;
  if (
    typeof explicitYear === 'number' &&
    Number.isInteger(explicitYear) &&
    explicitYear >= MIN_VALID_SEASON_YEAR &&
    explicitYear <= MAX_VALID_SEASON_YEAR
  ) {
    return explicitYear;
  }

  if (event?.date) {
    const parsed = new Date(event.date);
    if (!Number.isNaN(parsed.getTime())) {
      const utcYear = parsed.getUTCFullYear();
      if (utcYear >= MIN_VALID_SEASON_YEAR && utcYear <= MAX_VALID_SEASON_YEAR) {
        return utcYear;
      }
    }
  }

  return new Date().getFullYear();
}

export interface CacheEntry {
  summary: NormalizedPlayerSummary;
  fingerprint: string;
  timestamp: number;
}

// Global in-memory cache for player summaries during the browser session
const playerSummaryCache = new Map<string, CacheEntry>();

// Track in-flight promises to deduplicate concurrent pre-fetches for the same player
const inFlightRequests = new Map<string, Promise<NormalizedPlayerSummary | null>>();

// Track consumed manual refresh nonces so each forced refresh triggers &force=true at most once
const consumedForceRefreshKeys = new Set<number | string>();

export function clearPlayerSummaryCache() {
  playerSummaryCache.clear();
  inFlightRequests.clear();
  consumedForceRefreshKeys.clear();
}

export function getCachedPlayerSummary(cacheKey: string): CacheEntry | undefined {
  return playerSummaryCache.get(cacheKey);
}

export function buildPlayerSummaryCacheKey(
  eventId: string | undefined,
  competitorId: string | undefined,
  season?: number
): string {
  if (!eventId || !competitorId) return '';
  return `${eventId}_${competitorId}_${normalizeSeason(season)}`;
}

export function buildPlayerFingerprint(
  eventId: string | undefined,
  competitor: (ESPNCompetitor & { scoreDisplay?: string; thruDisplay?: string }) | null | undefined,
  season?: number
): string {
  const competitorId = competitor?.athlete?.id || competitor?.id;
  const cacheKey = buildPlayerSummaryCacheKey(eventId, competitorId, season);
  if (!cacheKey) return '';

  const period = competitor?.status?.period ?? 1;
  const thru = competitor?.status?.thru ?? competitor?.thruDisplay ?? 0;
  
  // Prefer pre-evaluated scoreDisplay (e.g. "-3", "+1", "E") over raw score object
  const rawScore = competitor?.scoreDisplay || competitor?.score;
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
  competitor: ESPNCompetitor | null | undefined,
  season?: number
): Promise<NormalizedPlayerSummary | null> {
  const competitorId = competitor?.athlete?.id || competitor?.id;
  const resolvedSeason = normalizeSeason(season);
  const cacheKey = buildPlayerSummaryCacheKey(eventId, competitorId, resolvedSeason);
  if (!cacheKey || !competitor) return null;

  const fingerprint = buildPlayerFingerprint(eventId, competitor, resolvedSeason);
  const cached = playerSummaryCache.get(cacheKey);
  const rawThru = competitor?.status?.thru !== undefined ? Number(competitor.status.thru) : NaN;
  const isLive =
    competitor?.status?.type?.state === 'in' ||
    (!isNaN(rawThru) && rawThru > 0 && rawThru < 18);
  const now = Date.now();
  const isFresh = cached && cached.fingerprint === fingerprint && now - cached.timestamp < (isLive ? 15000 : 300000);

  if (isFresh && cached) {
    return cached.summary;
  }

  // Deduplicate ongoing network requests
  const inFlight = inFlightRequests.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  const promise = (async () => {
    try {
      const res = await fetch(
        `/api/espn/playersummary?eventId=${eventId}&playerId=${competitorId}&season=${resolvedSeason}`
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
    } catch {
      // Background prefetch should fail silently without crashing
      return null;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, promise);
  return promise;
}

export const PREFETCH_MAX_CONCURRENCY = 3;

/**
 * Concurrently pre-fetch player summaries for a list of competitors (e.g. drafted golfers),
 * bounded to at most 3 concurrent network requests.
 */
export async function prefetchPlayerSummaries(
  eventId: string,
  competitors: Array<ESPNCompetitor | null | undefined>,
  season?: number
): Promise<void> {
  if (!eventId || !competitors.length) return;

  const seenIds = new Set<string>();
  const uniqueCompetitors: ESPNCompetitor[] = [];
  for (const comp of competitors) {
    const id = comp?.athlete?.id || comp?.id;
    if (comp && id && !seenIds.has(id)) {
      seenIds.add(id);
      uniqueCompetitors.push(comp);
    }
  }

  if (uniqueCompetitors.length === 0) return;

  let nextIndex = 0;
  const workerCount = Math.min(PREFETCH_MAX_CONCURRENCY, uniqueCompetitors.length);
  const workers = Array.from({ length: workerCount }, async () => {
    while (nextIndex < uniqueCompetitors.length) {
      const currentIndex = nextIndex++;
      await prefetchPlayerSummary(eventId, uniqueCompetitors[currentIndex], season);
    }
  });

  await Promise.allSettled(workers);
}

export interface UsePlayerSummaryOptions {
  eventId: string | undefined;
  competitor: (ESPNCompetitor & { scoreDisplay?: string; thruDisplay?: string }) | null | undefined;
  season?: number;
  forceRefreshKey?: number | string;
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
export function usePlayerSummary({
  eventId,
  competitor,
  season,
  forceRefreshKey,
}: UsePlayerSummaryOptions): UsePlayerSummaryResult {
  const competitorId = competitor?.athlete?.id || competitor?.id;
  const resolvedSeason = normalizeSeason(season);
  const rawThru = competitor?.status?.thru !== undefined ? Number(competitor.status.thru) : NaN;
  const isLive =
    competitor?.status?.type?.state === 'in' ||
    (!isNaN(rawThru) && rawThru > 0 && rawThru < 18);

  const cacheKey = buildPlayerSummaryCacheKey(eventId, competitorId, resolvedSeason);
  const fingerprint = buildPlayerFingerprint(eventId, competitor, resolvedSeason);

  // Keep ref to latest competitor to avoid unstable object references in useEffect
  const competitorRef = useRef(competitor);
  useEffect(() => {
    competitorRef.current = competitor;
  }, [competitor]);

  // Synchronously compute cached summary or fallback summary during render to prevent 1-frame stale state tearing
  const currentSummary = useMemo(() => {
    if (!cacheKey || !competitor) return null;
    const cached = playerSummaryCache.get(cacheKey);
    if (cached) return cached.summary;
    return EspnTournamentAdapter.normalizePlayerSummary(null, competitor);
  }, [cacheKey, competitor]);

  const [fetchedSummary, setFetchedSummary] = useState<NormalizedPlayerSummary | null>(null);
  const [fetchedFingerprint, setFetchedFingerprint] = useState<string>('');
  const [fetchingTarget, setFetchingTarget] = useState<string | null>(null);

  // Use fetched summary if it matches current fingerprint, otherwise use currentSummary
  const summary = (fetchedFingerprint === fingerprint && fetchedSummary) ? fetchedSummary : currentSummary;

  const hasValidTarget = Boolean(eventId && competitorId && cacheKey);
  const currentTarget = hasValidTarget ? `${cacheKey}:${fingerprint}` : null;

  useEffect(() => {
    if (!eventId || !competitorId || !cacheKey || !currentTarget) {
      return;
    }

    const shouldForceFetch =
      Boolean(forceRefreshKey) &&
      !consumedForceRefreshKeys.has(forceRefreshKey as number | string);

    const cached = playerSummaryCache.get(cacheKey);
    const now = Date.now();
    const isFresh =
      !shouldForceFetch &&
      cached &&
      cached.fingerprint === fingerprint &&
      now - cached.timestamp < (isLive ? 15000 : 300000);

    // If cache is fresh and fingerprint matches, skip background network fetch
    if (isFresh) {
      return;
    }

    if (shouldForceFetch && forceRefreshKey !== undefined) {
      consumedForceRefreshKeys.add(forceRefreshKey);
    }

    const controller = new AbortController();
    let isMounted = true;
    const activeTarget = currentTarget;

    async function fetchSummary() {
      setFetchingTarget(activeTarget);
      try {
        const existingInFlight = !shouldForceFetch ? inFlightRequests.get(cacheKey) : undefined;
        if (existingInFlight) {
          const awaitedSummary = await existingInFlight;
          if (isMounted && awaitedSummary) {
            setFetchedFingerprint(fingerprint);
            setFetchedSummary(awaitedSummary);
          }
          return;
        }

        const forceParam = shouldForceFetch ? '&force=true' : '';
        const res = await fetch(
          `/api/espn/playersummary?eventId=${eventId}&playerId=${competitorId}&season=${resolvedSeason}${forceParam}`,
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
          setFetchingTarget((prev) => (prev === activeTarget ? null : prev));
        }
      }
    }

    fetchSummary();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [eventId, competitorId, resolvedSeason, cacheKey, fingerprint, currentTarget, isLive, forceRefreshKey]);

  // isLoading is true on cold-start when no player summary exists yet
  const isLoading = summary === null;
  const isFetching = Boolean(currentTarget && fetchingTarget === currentTarget);

  return {
    summary,
    isLoading,
    isFetching,
  };
}

