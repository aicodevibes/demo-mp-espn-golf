import { useState, useEffect, useMemo, useRef } from 'react';
import { ESPNCompetitor } from '@/types/espn';
import { EspnTournamentAdapter, NormalizedPlayerSummary } from '@/lib/espn';

interface CacheEntry {
  summary: NormalizedPlayerSummary;
  fingerprint: string;
  timestamp: number;
}

// Global in-memory cache for player summaries during the browser session
const playerSummaryCache = new Map<string, CacheEntry>();

export function clearPlayerSummaryCache() {
  playerSummaryCache.clear();
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
  const period = competitor?.status?.period ?? 1;
  const thru = competitor?.status?.thru ?? 0;
  const rawScore = competitor?.score;
  const scoreDisplay = typeof rawScore === 'string' || typeof rawScore === 'number'
    ? String(rawScore)
    : (rawScore && typeof rawScore === 'object' && 'displayValue' in rawScore && rawScore.displayValue !== undefined
        ? String(rawScore.displayValue)
        : '');
  const isLive = competitor?.status?.type?.state === 'in';

  const cacheKey = eventId && competitorId ? `${eventId}_${competitorId}` : '';
  const fingerprint = `${cacheKey}_p${period}_t${thru}_s${scoreDisplay}`;

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
      } catch (err: any) {
        if (err?.name === 'AbortError') {
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
