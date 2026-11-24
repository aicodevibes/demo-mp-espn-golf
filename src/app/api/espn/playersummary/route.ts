import { NextRequest, NextResponse } from 'next/server';
import { ESPNEventStatus } from '@/types/espn';
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
  isStatusActive,
  extractEventStatus,
  createUpstreamFetchOptions,
  buildStaleFallbackResponse,
  buildUpstreamErrorResponse,
} from '../proxyUtils';

const CORE_EVENT_REVALIDATE_SECONDS = 3600;

interface CoreCourseHole {
  shotsToPar?: number;
}

interface CoreCourse {
  name?: string;
  shotsToPar?: number;
  holes?: CoreCourseHole[];
}

interface CoreEventPayload {
  status?: ESPNEventStatus;
  competitions?: Array<{ status?: ESPNEventStatus }>;
  events?: Array<{ status?: ESPNEventStatus }>;
  courses?: CoreCourse[];
}

interface PlayerSummaryRound {
  status?: ESPNEventStatus;
}

interface PlayerSummaryPayload {
  status?: ESPNEventStatus;
  events?: Array<{ status?: ESPNEventStatus }>;
  rounds?: PlayerSummaryRound[];
  courseHoles?: Array<number | undefined>;
  courseName?: string;
  shotsToPar?: number;
  [key: string]: unknown;
}

function determinePlayerSummaryLiveState(
  summaryData: PlayerSummaryPayload,
  coreEventData?: CoreEventPayload
): boolean | undefined {
  const coreStatus = extractEventStatus(coreEventData);
  if (coreStatus) {
    return isStatusActive(coreStatus);
  }

  const summaryStatus = extractEventStatus(summaryData);
  if (summaryStatus) {
    return isStatusActive(summaryStatus);
  }

  if (Array.isArray(summaryData.rounds) && summaryData.rounds.length > 0) {
    if (summaryData.rounds.some((round) => isStatusActive(round?.status))) {
      return true;
    }
    if (
      summaryData.rounds.length >= 4 &&
      summaryData.rounds.every(
        (round) =>
          round?.status?.type?.state === 'post' || round?.status?.type?.completed === true
      )
    ) {
      return false;
    }
  }

  return undefined;
}

function resolvePlayerSummaryMaxAgeMs(data: unknown, isLive?: boolean): number {
  if (isLive !== undefined) {
    return isLive ? LIVE_MAX_STALE_MS : RELAXED_MAX_STALE_MS;
  }
  const status = extractEventStatus(data);
  if (status) {
    return isStatusActive(status) ? LIVE_MAX_STALE_MS : RELAXED_MAX_STALE_MS;
  }
  return LIVE_MAX_STALE_MS;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const validationError = validateEspnQueryParams(searchParams, {
    requireEventIdAndPlayerId: true,
  });
  if (validationError) return validationError;

  const eventId = searchParams.get('eventId') as string;
  const playerId = searchParams.get('playerId') as string;
  const season = searchParams.get('season') || new Date().getFullYear().toString();
  const isForce = searchParams.get('force') === 'true';

  const cacheKey = `playersummary:${eventId}:${playerId}:${season}`;

  try {
    const playerSummaryUrl = new URL(
      `https://site.web.api.espn.com/apis/site/v2/sports/golf/pga/leaderboard/${encodeURIComponent(eventId)}/playersummary`
    );
    playerSummaryUrl.searchParams.set('season', season);
    playerSummaryUrl.searchParams.set('player', playerId);

    const coreEventUrl = new URL(
      `https://sports.core.api.espn.com/v2/sports/golf/leagues/pga/events/${encodeURIComponent(eventId)}`
    );

    const priorLive = peekMemorySnapshotLiveState(cacheKey);
    const summaryRevalidate =
      priorLive === false ? RELAXED_REVALIDATE_SECONDS : LIVE_REVALIDATE_SECONDS;

    const playerSummaryFetchOptions = createUpstreamFetchOptions({
      isForce,
      revalidate: summaryRevalidate,
      tags: ['espn-playersummary'],
    });

    const coreEventFetchOptions = createUpstreamFetchOptions({
      isForce,
      revalidate: CORE_EVENT_REVALIDATE_SECONDS,
      tags: ['espn-core-event'],
    });

    // Parallel fetch of player summary and event core course details
    const [res, eventRes] = await Promise.all([
      fetch(playerSummaryUrl.toString(), playerSummaryFetchOptions),
      fetch(coreEventUrl.toString(), coreEventFetchOptions).catch(() => null),
    ]);

    if (!res.ok) {
      const staleSnapshot = getMemorySnapshot(cacheKey, resolvePlayerSummaryMaxAgeMs);
      if (staleSnapshot) {
        return buildStaleFallbackResponse(staleSnapshot);
      }

      return NextResponse.json(
        { error: `ESPN PlayerSummary API returned status ${res.status}` },
        { status: res.status }
      );
    }

    const data = (await res.json()) as PlayerSummaryPayload;
    let parsedCoreEventData: CoreEventPayload | undefined;

    // Extract course hole pars from core event API if available
    if (eventRes && eventRes.ok) {
      try {
        parsedCoreEventData = (await eventRes.json()) as CoreEventPayload;
        const course = parsedCoreEventData.courses?.[0];
        if (course && Array.isArray(course.holes) && course.holes.length > 0) {
          data.courseHoles = course.holes.map((h) => h.shotsToPar);
          data.courseName = course.name;
          data.shotsToPar = course.shotsToPar;
        }
      } catch (err) {
        console.error('Failed to parse core event course info:', err);
      }
    }

    const isLive = determinePlayerSummaryLiveState(data, parsedCoreEventData);
    setMemorySnapshot(cacheKey, data, isLive !== undefined ? { isLive } : undefined);

    const cacheControl = isForce
      ? NO_STORE_CACHE_CONTROL
      : isLive === false
        ? RELAXED_CACHE_CONTROL
        : LIVE_CACHE_CONTROL;

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': cacheControl,
      },
    });
  } catch (error: unknown) {
    const staleSnapshot = getMemorySnapshot(cacheKey, resolvePlayerSummaryMaxAgeMs);
    if (staleSnapshot) {
      return buildStaleFallbackResponse(staleSnapshot);
    }

    return buildUpstreamErrorResponse(error, 'Failed to fetch ESPN Player Summary');
  }
}
