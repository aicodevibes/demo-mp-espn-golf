import { NextRequest, NextResponse } from 'next/server';
import { getMemorySnapshot, setMemorySnapshot } from '../serverCache';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get('eventId');
  const playerId = searchParams.get('playerId');
  const season = searchParams.get('season') || new Date().getFullYear().toString();
  const isForce = searchParams.get('force') === 'true';

  if (!eventId || !playerId) {
    return NextResponse.json(
      { error: 'Parameters eventId and playerId are required' },
      { status: 400 }
    );
  }

  const cacheKey = `playersummary:${eventId}:${playerId}:${season}`;

  try {
    const playerSummaryUrl = `https://site.web.api.espn.com/apis/site/v2/sports/golf/pga/leaderboard/${eventId}/playersummary?season=${season}&player=${playerId}`;
    const coreEventUrl = `https://sports.core.api.espn.com/v2/sports/golf/leagues/pga/events/${eventId}`;

    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

    const playerSummaryFetchOptions: RequestInit = isForce
      ? {
          cache: 'no-store',
          headers,
        }
      : ({
          next: {
            revalidate: 60,
            tags: ['espn-playersummary'],
          },
          headers,
        } as RequestInit);

    const coreEventFetchOptions: RequestInit = isForce
      ? {
          cache: 'no-store',
          headers,
        }
      : ({
          next: {
            revalidate: 3600,
            tags: ['espn-core-event'],
          },
          headers,
        } as RequestInit);

    // Parallel fetch of player summary and event core course details
    const [res, eventRes] = await Promise.all([
      fetch(playerSummaryUrl, playerSummaryFetchOptions),
      fetch(coreEventUrl, coreEventFetchOptions).catch(() => null),
    ]);

    if (!res.ok) {
      const staleSnapshot = getMemorySnapshot(cacheKey);
      if (staleSnapshot) {
        return NextResponse.json(staleSnapshot.data, {
          headers: {
            'Cache-Control': 'no-store',
            'X-Cache-Stale': 'true',
          },
        });
      }

      return NextResponse.json(
        { error: `ESPN PlayerSummary API returned status ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();

    // Extract course hole pars from core event API if available
    if (eventRes && eventRes.ok) {
      try {
        const eventData = await eventRes.json();
        const course = eventData.courses?.[0];
        if (course && Array.isArray(course.holes) && course.holes.length > 0) {
          data.courseHoles = course.holes.map((h: any) => h.shotsToPar);
          data.courseName = course.name;
          data.shotsToPar = course.shotsToPar;
        }
      } catch (err) {
        console.error('Failed to parse core event course info:', err);
      }
    }

    setMemorySnapshot(cacheKey, data);

    const cacheControl = isForce
      ? 'no-store'
      : 'public, s-maxage=60, stale-while-revalidate=120';

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': cacheControl,
      },
    });
  } catch (error: unknown) {
    const staleSnapshot = getMemorySnapshot(cacheKey);
    if (staleSnapshot) {
      return NextResponse.json(staleSnapshot.data, {
        headers: {
          'Cache-Control': 'no-store',
          'X-Cache-Stale': 'true',
        },
      });
    }

    const message = error instanceof Error ? error.message : 'Failed to fetch ESPN Player Summary';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

