import { NextResponse } from 'next/server';
import { ESPNEventStatus } from '@/types/espn';
import { SnapshotResult } from './serverCache';

export const ESPN_ID_REGEX = /^\d{1,12}$/;
export const SEASON_REGEX = /^\d{4}$/;

export const UPSTREAM_TIMEOUT_MS = 8000;
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

/**
 * Build a JSON response from a stale cached snapshot with X-Cache-Stale and X-Cache-Age headers.
 */
export function buildStaleFallbackResponse<T>(snapshot: SnapshotResult<T>): NextResponse {
  return NextResponse.json(snapshot.data, {
    headers: {
      'Cache-Control': NO_STORE_CACHE_CONTROL,
      'X-Cache-Stale': 'true',
      'X-Cache-Age': String(snapshot.ageSeconds),
    },
  });
}

/**
 * Build a structured JSON error response for caught upstream fetch failures (504 on timeout, 500 otherwise).
 */
export function buildUpstreamErrorResponse(error: unknown, fallbackMessage: string): NextResponse {
  const isTimeout = error instanceof Error && error.name === 'TimeoutError';
  const message = error instanceof Error ? error.message : fallbackMessage;
  return NextResponse.json(
    { error: message },
    { status: isTimeout ? 504 : 500 }
  );
}
