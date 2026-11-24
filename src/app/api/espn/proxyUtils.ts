import { NextResponse } from 'next/server';
import { ESPNEventStatus } from '@/types/espn';
import {
  SnapshotResult,
  getRecentMemorySnapshot,
  getInFlightForceRequest,
  setInFlightForceRequest,
  deleteInFlightForceRequest,
} from './serverCache';

export const ESPN_ID_REGEX = /^\d{1,12}$/;
export const SEASON_REGEX = /^\d{4}$/;

export const UPSTREAM_TIMEOUT_MS = 8000;
export const FORCE_COOLDOWN_MS = 10 * 1000;
export const LIVE_MAX_STALE_MS = 30 * 60 * 1000;
export const RELAXED_MAX_STALE_MS = 24 * 60 * 60 * 1000;

export const LIVE_REVALIDATE_SECONDS = 15;
export const RELAXED_REVALIDATE_SECONDS = 300;

export const LIVE_CACHE_CONTROL = 'public, s-maxage=15, stale-while-revalidate=30';
export const RELAXED_CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=600';
export const NO_STORE_CACHE_CONTROL = 'no-store';

export const ESPN_USER_AGENT_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

interface StatusCarrierPayload {
  status?: ESPNEventStatus;
  events?: Array<{ status?: ESPNEventStatus }>;
  competitions?: Array<{ status?: ESPNEventStatus }>;
}

/**
 * Validate ESPN proxy query parameters (`event`, `eventId`, `playerId`, `season`).
 * Returns a 400 NextResponse if validation fails, or null when valid.
 */
export function validateEspnQueryParams(
  searchParams: URLSearchParams,
  options?: { requireEventIdAndPlayerId?: boolean }
): NextResponse | null {
  if (options?.requireEventIdAndPlayerId) {
    const eventId = searchParams.get('eventId');
    const playerId = searchParams.get('playerId');
    if (!eventId || !playerId) {
      return NextResponse.json(
        { error: 'Parameters eventId and playerId are required' },
        { status: 400 }
      );
    }
  }

  for (const idParam of ['event', 'eventId', 'playerId'] as const) {
    if (searchParams.has(idParam)) {
      const value = searchParams.get(idParam) ?? '';
      if (!ESPN_ID_REGEX.test(value)) {
        return NextResponse.json(
          { error: `Invalid ${idParam} parameter` },
          { status: 400 }
        );
      }
    }
  }

  if (searchParams.has('season')) {
    const season = searchParams.get('season') ?? '';
    if (!SEASON_REGEX.test(season)) {
      return NextResponse.json(
        { error: 'Invalid season parameter' },
        { status: 400 }
      );
    }
  }

  return null;
}

/**
 * Determine whether an ESPNEventStatus represents an active in-progress tournament.
 */
export function isStatusActive(status?: ESPNEventStatus): boolean {
  if (!status) return false;

  const state = status.type?.state;
  const name = status.type?.name;
  if (state === 'in' || name === 'STATUS_IN_PROGRESS' || name === 'STATUS_PLAYOFF') {
    return true;
  }

  const detail = (status.type?.detail || status.type?.description || '').toLowerCase();
  return detail.includes('in progress') || detail.includes('playoff');
}

/**
 * Extract the primary ESPNEventStatus from a scoreboard, leaderboard, or core event payload.
 */
export function extractEventStatus(data: unknown): ESPNEventStatus | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const payload = data as StatusCarrierPayload;

  if (payload.status) return payload.status;
  if (Array.isArray(payload.events) && payload.events[0]?.status) {
    return payload.events[0].status;
  }
  if (Array.isArray(payload.competitions) && payload.competitions[0]?.status) {
    return payload.competitions[0].status;
  }
  return undefined;
}

/**
 * Check if any event in a leaderboard/scoreboard payload is actively in progress.
 */
export function isEventActive(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const payload = data as StatusCarrierPayload;

  if (isStatusActive(payload.status)) {
    return true;
  }
  if (Array.isArray(payload.events) && payload.events.length > 0) {
    return payload.events.some((event) => isStatusActive(event?.status));
  }
  if (Array.isArray(payload.competitions) && payload.competitions.length > 0) {
    return payload.competitions.some((comp) => isStatusActive(comp?.status));
  }
  return false;
}

/**
 * Build fetch options enforcing the 8-second upstream timeout and Next.js caching tags.
 */
export function createUpstreamFetchOptions(options: {
  isForce: boolean;
  revalidate: number;
  tags: string[];
}): RequestInit {
  const signal = AbortSignal.timeout(UPSTREAM_TIMEOUT_MS);

  if (options.isForce) {
    return {
      cache: 'no-store',
      headers: ESPN_USER_AGENT_HEADERS,
      signal,
    };
  }

  return {
    next: {
      revalidate: options.revalidate,
      tags: options.tags,
    },
    headers: ESPN_USER_AGENT_HEADERS,
    signal,
  } as RequestInit;
}

export type ProxyJsonResult<T = unknown> =
  | {
      ok: true;
      data: T;
      cacheControl: string;
      isStale?: false;
    }
  | {
      ok: true;
      data: T;
      cacheControl: string;
      isStale: true;
      ageSeconds: number;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

export function buildUpstreamErrorResult(error: unknown, fallbackMessage: string): ProxyJsonResult<never> {
  const isTimeout = error instanceof Error && error.name === 'TimeoutError';
  const message = error instanceof Error ? error.message : fallbackMessage;
  return {
    ok: false,
    status: isTimeout ? 504 : 500,
    error: message,
  };
}

export function buildStaleFallbackResult<T>(snapshot: SnapshotResult<T>): ProxyJsonResult<T> {
  return {
    ok: true,
    data: snapshot.data,
    cacheControl: NO_STORE_CACHE_CONTROL,
    isStale: true,
    ageSeconds: snapshot.ageSeconds,
  };
}

function proxyResultToResponse<T>(
  result: ProxyJsonResult<T>,
  options: { coalesced: boolean }
): NextResponse {
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  if (result.isStale) {
    const headers: Record<string, string> = {
      'Cache-Control': NO_STORE_CACHE_CONTROL,
      'X-Cache-Stale': 'true',
      'X-Cache-Age': String(result.ageSeconds),
    };
    if (options.coalesced) {
      headers['X-Force-Coalesced'] = 'true';
    }
    return NextResponse.json(result.data, { headers });
  }

  const headers: Record<string, string> = {
    'Cache-Control': options.coalesced ? NO_STORE_CACHE_CONTROL : result.cacheControl,
  };
  if (options.coalesced) {
    headers['X-Force-Coalesced'] = 'true';
    headers['X-Cache-Age'] = '0';
  }
  return NextResponse.json(result.data, { headers });
}

/**
 * Execute an ESPN proxy fetch with 10-second per-key force=true cooldown and in-flight coalescing.
 */
export async function executeWithForceCooldown<T>(options: {
  cacheKey: string;
  isForce: boolean;
  fetchUpstream: () => Promise<ProxyJsonResult<T>>;
}): Promise<NextResponse> {
  if (!options.isForce) {
    const result = await options.fetchUpstream();
    return proxyResultToResponse(result, { coalesced: false });
  }

  const existing = getInFlightForceRequest<ProxyJsonResult<T>>(options.cacheKey);
  if (existing) {
    const result = await existing;
    return proxyResultToResponse(result, { coalesced: true });
  }

  const recentSnapshot = getRecentMemorySnapshot<T>(options.cacheKey, FORCE_COOLDOWN_MS);
  if (recentSnapshot) {
    return NextResponse.json(recentSnapshot.data, {
      headers: {
        'Cache-Control': NO_STORE_CACHE_CONTROL,
        'X-Force-Coalesced': 'true',
        'X-Cache-Age': String(recentSnapshot.ageSeconds),
      },
    });
  }

  const promise = options.fetchUpstream().finally(() => {
    deleteInFlightForceRequest(options.cacheKey);
  });
  setInFlightForceRequest(options.cacheKey, promise);

  const result = await promise;
  return proxyResultToResponse(result, { coalesced: false });
}
