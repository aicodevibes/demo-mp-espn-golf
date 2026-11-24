import { NextRequest } from 'next/server';
import {
  getMemorySnapshot,
  peekMemorySnapshotLiveState,
  setMemorySnapshot,
} from '../serverCache';
import {
  LIVE_CACHE_CONTROL,
  RELAXED_CACHE_CONTROL,
  NO_STORE_CACHE_CONTROL,
  LIVE_MAX_STALE_MS,
  RELAXED_MAX_STALE_MS,
  LIVE_REVALIDATE_SECONDS,
  RELAXED_REVALIDATE_SECONDS,
  validateEspnQueryParams,
  isEventActive,
  createUpstreamFetchOptions,
  buildStaleFallbackResult,
  buildUpstreamErrorResult,
  executeWithForceCooldown,
  ProxyJsonResult,
} from '../proxyUtils';

const LEADERBOARD_UPSTREAM_BASE = 'https://site.web.api.espn.com/apis/site/v2/sports/golf/leaderboard';
const SCOREBOARD_UPSTREAM_BASE = 'https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard';

interface UpstreamErrorPayload {
  message?: string;
  error?: string;
}

function resolveLeaderboardMaxAgeMs(data: unknown, isLive?: boolean): number {
  const active = isLive ?? isEventActive(data);
  return active ? LIVE_MAX_STALE_MS : RELAXED_MAX_STALE_MS;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const validationError = validateEspnQueryParams(searchParams);
  if (validationError) return validationError;

  const eventId = searchParams.get('event');
  const isForce = searchParams.get('force') === 'true';
  const cacheKey = `leaderboard:${eventId || 'default'}`;

  return executeWithForceCooldown({
    cacheKey,
    isForce,
    fetchUpstream: async (): Promise<ProxyJsonResult<unknown>> => {
      try {
        const upstreamUrl = eventId
          ? new URL(LEADERBOARD_UPSTREAM_BASE)
          : new URL(SCOREBOARD_UPSTREAM_BASE);
        if (eventId) {
          upstreamUrl.searchParams.set('event', eventId);
        }

        const priorLive = peekMemorySnapshotLiveState(cacheKey);
        const revalidate =
          priorLive === false ? RELAXED_REVALIDATE_SECONDS : LIVE_REVALIDATE_SECONDS;

        const fetchOptions = createUpstreamFetchOptions({
          isForce,
          revalidate,
          tags: ['espn-leaderboard'],
        });

        const res = await fetch(upstreamUrl.toString(), fetchOptions);

        if (!res.ok) {
          const staleSnapshot = getMemorySnapshot(cacheKey, resolveLeaderboardMaxAgeMs);
          if (staleSnapshot) {
            return buildStaleFallbackResult(staleSnapshot);
          }

          let errorMessage = `ESPN Leaderboard API returned status ${res.status}`;
          try {
            const errorData = (await res.json()) as UpstreamErrorPayload;
            if (errorData && (errorData.message || errorData.error)) {
              errorMessage = errorData.message || errorData.error || errorMessage;
            }
          } catch {
            // Fall back to default status string on non-JSON body
          }
          return {
            ok: false,
            status: res.status,
            error: errorMessage,
          };
        }

        const data: unknown = await res.json();
        const active = isEventActive(data);
        setMemorySnapshot(cacheKey, data, { isLive: active });

        const cacheControl = isForce
          ? NO_STORE_CACHE_CONTROL
          : active
            ? LIVE_CACHE_CONTROL
            : RELAXED_CACHE_CONTROL;

        return {
          ok: true,
          data,
          cacheControl,
        };
      } catch (error: unknown) {
        const staleSnapshot = getMemorySnapshot(cacheKey, resolveLeaderboardMaxAgeMs);
        if (staleSnapshot) {
          return buildStaleFallbackResult(staleSnapshot);
        }

        return buildUpstreamErrorResult(error, 'Failed to fetch ESPN Leaderboard');
      }
    },
  });
}
