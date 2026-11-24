import { NextRequest } from 'next/server';
import { parseESPNScoreboardResponse } from '@/lib/espn';
import { getMemorySnapshot, setMemorySnapshot } from '../serverCache';
import {
  RELAXED_MAX_STALE_MS,
  NO_STORE_CACHE_CONTROL,
  validateEspnQueryParams,
  createUpstreamFetchOptions,
  buildStaleFallbackResult,
  buildUpstreamErrorResult,
  executeWithForceCooldown,
  ProxyJsonResult,
} from '../proxyUtils';

const SCOREBOARD_UPSTREAM_BASE = 'https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard';
const SCOREBOARD_REVALIDATE_SECONDS = 60;
const SCOREBOARD_CACHE_CONTROL = 'public, s-maxage=60, stale-while-revalidate=120';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const validationError = validateEspnQueryParams(searchParams);
  if (validationError) return validationError;

  const eventId = searchParams.get('event');
  const isForce = searchParams.get('force') === 'true';
  const cacheKey = `scoreboard:${eventId || 'default'}`;

  return executeWithForceCooldown({
    cacheKey,
    isForce,
    fetchUpstream: async (): Promise<ProxyJsonResult<unknown>> => {
      try {
        const upstreamUrl = new URL(SCOREBOARD_UPSTREAM_BASE);
        if (eventId) {
          upstreamUrl.searchParams.set('event', eventId);
        }

        const fetchOptions = createUpstreamFetchOptions({
          isForce,
          revalidate: SCOREBOARD_REVALIDATE_SECONDS,
          tags: ['espn-scoreboard'],
        });

        const res = await fetch(upstreamUrl.toString(), fetchOptions);

        if (!res.ok) {
          const staleSnapshot = getMemorySnapshot(cacheKey, RELAXED_MAX_STALE_MS);
          if (staleSnapshot) {
            return buildStaleFallbackResult(staleSnapshot);
          }

          return {
            ok: false,
            status: res.status,
            error: `ESPN API returned status ${res.status}`,
          };
        }

        const data: unknown = await res.json();
        const events = parseESPNScoreboardResponse(data);
        const result = { events };

        setMemorySnapshot(cacheKey, result);

        const cacheControl = isForce ? NO_STORE_CACHE_CONTROL : SCOREBOARD_CACHE_CONTROL;

        return {
          ok: true,
          data: result,
          cacheControl,
        };
      } catch (error: unknown) {
        const staleSnapshot = getMemorySnapshot(cacheKey, RELAXED_MAX_STALE_MS);
        if (staleSnapshot) {
          return buildStaleFallbackResult(staleSnapshot);
        }

        return buildUpstreamErrorResult(error, 'Failed to fetch ESPN Scoreboard');
      }
    },
  });
}
