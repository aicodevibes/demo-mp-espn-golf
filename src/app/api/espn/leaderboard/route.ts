import { NextRequest, NextResponse } from 'next/server';
import { ESPNEventStatus } from '@/types/espn';

interface LeaderboardPayload {
  status?: ESPNEventStatus;
  events?: Array<{
    status?: ESPNEventStatus;
  }>;
}

interface UpstreamErrorPayload {
  message?: string;
  error?: string;
}

function isEventActive(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;

  const payload = data as LeaderboardPayload;

  // 1. Direct status object on payload
  const directStatus = payload.status;
  if (directStatus) {
    const state = directStatus.type?.state;
    const name = directStatus.type?.name;
    if (state === 'in' || name === 'STATUS_IN_PROGRESS' || name === 'STATUS_PLAYOFF') {
      return true;
    }
    const detail = (directStatus.type?.detail || directStatus.type?.description || '').toLowerCase();
    if (detail.includes('in progress') || detail.includes('playoff')) {
      return true;
    }
  }

  // 2. Events array
  if (Array.isArray(payload.events) && payload.events.length > 0) {
    return payload.events.some((event) => {
      const status = event?.status;
      if (!status) return false;
      const state = status.type?.state;
      const name = status.type?.name;
      if (state === 'in' || name === 'STATUS_IN_PROGRESS' || name === 'STATUS_PLAYOFF') {
        return true;
      }
      const detail = (status.type?.detail || status.type?.description || '').toLowerCase();
      return detail.includes('in progress') || detail.includes('playoff');
    });
  }

  return false;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('event');
    const isForce = searchParams.get('force') === 'true';

    const url = eventId
      ? `https://site.web.api.espn.com/apis/site/v2/sports/golf/leaderboard?event=${eventId}`
      : 'https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard';

    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

    const fetchOptions: RequestInit = isForce
      ? {
          cache: 'no-store',
          headers,
        }
      : ({
          next: { revalidate: 15 },
          headers,
        } as RequestInit);

    const res = await fetch(url, fetchOptions);

    if (!res.ok) {
      let errorMessage = `ESPN Leaderboard API returned status ${res.status}`;
      try {
        const errorData = (await res.json()) as UpstreamErrorPayload;
        if (errorData && (errorData.message || errorData.error)) {
          errorMessage = errorData.message || errorData.error || errorMessage;
        }
      } catch {
        // Fall back to default status string on non-JSON body
      }
      return NextResponse.json(
        { error: errorMessage },
        { status: res.status }
      );
    }

    const data: unknown = await res.json();

    let cacheControl = 'no-store';
    if (!isForce) {
      const active = isEventActive(data);
      cacheControl = active
        ? 'public, s-maxage=15, stale-while-revalidate=30'
        : 'public, s-maxage=300, stale-while-revalidate=600';
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': cacheControl,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch ESPN Leaderboard';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
