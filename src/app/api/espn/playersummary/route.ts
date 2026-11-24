import { NextRequest } from 'next/server';
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
  buildStaleFallbackResult,
  buildUpstreamErrorResult,
  executeWithForceCooldown,
  ProxyJsonResult,
} from '../proxyUtils';

const CORE_EVENT_REVALIDATE_SECONDS = 3600;

interface CoreCourseHole {
  number?: number;
  shotsToPar?: number;
}

interface CoreCourse {
  id?: string | number;
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
  period?: number;
  value?: number;
  status?: ESPNEventStatus;
  courseId?: string | number;
  course?: { id?: string | number };
  courseHoles?: Array<number | undefined>;
  courseName?: string;
  shotsToPar?: number;
}

interface PlayerSummaryPayload {
  status?: ESPNEventStatus;
  events?: Array<{ status?: ESPNEventStatus }>;
  courseId?: string | number;
  course?: { id?: string | number };
  competitor?: {
    courseId?: string | number;
    course?: { id?: string | number };
  };
  rounds?: PlayerSummaryRound[];
  courseHoles?: Array<number | undefined>;
  courseName?: string;
  shotsToPar?: number;
  [key: string]: unknown;
}

function extractSummaryCourseId(
  data: PlayerSummaryPayload,
  queryCourseId?: string
): string | number | undefined {
  if (queryCourseId) return queryCourseId;

  const topLevelId = data.courseId ?? data.course?.id;
  if (topLevelId !== undefined && topLevelId !== null && String(topLevelId).trim() !== '') {
    return topLevelId;
  }

  const competitorCourseId = data.competitor?.courseId ?? data.competitor?.course?.id;
  if (
    competitorCourseId !== undefined &&
    competitorCourseId !== null &&
    String(competitorCourseId).trim() !== ''
  ) {
    return competitorCourseId;
  }

  if (Array.isArray(data.rounds) && data.rounds.length > 0) {
    for (let i = data.rounds.length - 1; i >= 0; i--) {
      const round = data.rounds[i];
      const roundCourseId = round?.courseId ?? round?.course?.id;
      if (
        roundCourseId !== undefined &&
        roundCourseId !== null &&
        String(roundCourseId).trim() !== ''
      ) {
        return roundCourseId;
      }
    }
  }

  return undefined;
}

function resolveCourseFromEvent(
  courses: CoreCourse[] | undefined,
  courseId?: string | number
): CoreCourse | undefined {
  if (!Array.isArray(courses) || courses.length === 0) return undefined;

  if (courseId !== undefined && courseId !== null && String(courseId).trim() !== '') {
    const matched = courses.find(
      (c) => c?.id !== undefined && c?.id !== null && String(c.id) === String(courseId)
    );
    if (matched) return matched;
  }

  return courses[0];
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
  const requestedCourseId = searchParams.get('courseId')?.trim() || '';
  const isForce = searchParams.get('force') === 'true';

  const cacheKey = requestedCourseId
    ? `playersummary:${eventId}:${playerId}:${season}:${requestedCourseId}`
    : `playersummary:${eventId}:${playerId}:${season}`;

  return executeWithForceCooldown({
    cacheKey,
    isForce,
    fetchUpstream: async (): Promise<ProxyJsonResult<PlayerSummaryPayload>> => {
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

        // Core course-hole par metadata stays on the 1-hour cache even during manual force=true refresh
        const coreEventFetchOptions = createUpstreamFetchOptions({
          isForce: false,
          revalidate: CORE_EVENT_REVALIDATE_SECONDS,
          tags: ['espn-core-event'],
        });

        // Parallel fetch of player summary and event core course details
        const [res, eventRes] = await Promise.all([
          fetch(playerSummaryUrl.toString(), playerSummaryFetchOptions),
          fetch(coreEventUrl.toString(), coreEventFetchOptions).catch(() => null),
        ]);

        if (!res.ok) {
          const staleSnapshot = getMemorySnapshot<PlayerSummaryPayload>(
            cacheKey,
            resolvePlayerSummaryMaxAgeMs
          );
          if (staleSnapshot) {
            return buildStaleFallbackResult(staleSnapshot);
          }

          return {
            ok: false,
            status: res.status,
            error: `ESPN PlayerSummary API returned status ${res.status}`,
          };
        }

        const data = (await res.json()) as PlayerSummaryPayload;
        let parsedCoreEventData: CoreEventPayload | undefined;

        // Extract course hole pars from core event API if available (guarded against shared/used/non-JSON bodies)
        if (eventRes && eventRes.ok && eventRes !== res && !eventRes.bodyUsed) {
          try {
            const rawCoreText = await eventRes.text();
            if (rawCoreText && rawCoreText.trim().length > 0) {
              parsedCoreEventData = JSON.parse(rawCoreText) as CoreEventPayload;
            }
          } catch {
            // Ignore non-JSON or unreadable core event bodies cleanly
          }
        }

        if (parsedCoreEventData?.courses && parsedCoreEventData.courses.length > 0) {
          const targetCourseId = extractSummaryCourseId(data, requestedCourseId || undefined);
          const course = resolveCourseFromEvent(parsedCoreEventData.courses, targetCourseId);
          if (course) {
            if (course.name !== undefined) {
              data.courseName = course.name;
            }
            if (course.shotsToPar !== undefined) {
              data.shotsToPar = course.shotsToPar;
            }
            if (Array.isArray(course.holes) && course.holes.length > 0) {
              data.courseHoles = course.holes.map((h) => h.shotsToPar);
            }
          }

          // Attach per-round course metadata for multi-course rounds when round carries courseId
          if (Array.isArray(data.rounds)) {
            data.rounds.forEach((round) => {
              const roundCourseId = round?.courseId ?? round?.course?.id;
              if (roundCourseId !== undefined && roundCourseId !== null && String(roundCourseId).trim() !== '') {
                const matchedRoundCourse = resolveCourseFromEvent(parsedCoreEventData?.courses, roundCourseId);
                if (matchedRoundCourse && Array.isArray(matchedRoundCourse.holes) && matchedRoundCourse.holes.length > 0) {
                  round.courseHoles = matchedRoundCourse.holes.map((h) => h.shotsToPar);
                  if (matchedRoundCourse.name !== undefined) round.courseName = matchedRoundCourse.name;
                  if (matchedRoundCourse.shotsToPar !== undefined) round.shotsToPar = matchedRoundCourse.shotsToPar;
                }
              }
            });
          }
        }

        const isLive = determinePlayerSummaryLiveState(data, parsedCoreEventData);
        setMemorySnapshot(cacheKey, data, isLive !== undefined ? { isLive } : undefined);

        const cacheControl = isForce
          ? NO_STORE_CACHE_CONTROL
          : isLive === false
            ? RELAXED_CACHE_CONTROL
            : LIVE_CACHE_CONTROL;

        return {
          ok: true,
          data,
          cacheControl,
        };
      } catch (error: unknown) {
        const staleSnapshot = getMemorySnapshot<PlayerSummaryPayload>(
          cacheKey,
          resolvePlayerSummaryMaxAgeMs
        );
        if (staleSnapshot) {
          return buildStaleFallbackResult(staleSnapshot);
        }

        return buildUpstreamErrorResult(error, 'Failed to fetch ESPN Player Summary');
      }
    },
  });
}
