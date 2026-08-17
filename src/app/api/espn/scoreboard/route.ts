import { NextRequest, NextResponse } from 'next/server';
import { parseESPNScoreboardResponse } from '@/lib/espn';
import { getMemorySnapshot, setMemorySnapshot } from '../serverCache';

const SCOREBOARD_CACHE_KEY = 'scoreboard:default';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const isForce = searchParams.get('force') === 'true';

  try {
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
          next: {
            revalidate: 60,
            tags: ['espn-scoreboard'],
          },
          headers,
        } as RequestInit);

    const res = await fetch(
      'https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard',
      fetchOptions
    );

    if (!res.ok) {
      const staleSnapshot = getMemorySnapshot(SCOREBOARD_CACHE_KEY);
      if (staleSnapshot) {
        return NextResponse.json(staleSnapshot.data, {
          headers: {
            'Cache-Control': 'no-store',
            'X-Cache-Stale': 'true',
          },
        });
      }

      return NextResponse.json(
        { error: `ESPN API returned status ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const events = parseESPNScoreboardResponse(data);
    const result = { events };

    setMemorySnapshot(SCOREBOARD_CACHE_KEY, result);

    const cacheControl = isForce
      ? 'no-store'
      : 'public, s-maxage=60, stale-while-revalidate=120';

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': cacheControl,
      },
    });
  } catch (error: unknown) {
    const staleSnapshot = getMemorySnapshot(SCOREBOARD_CACHE_KEY);
    if (staleSnapshot) {
      return NextResponse.json(staleSnapshot.data, {
        headers: {
          'Cache-Control': 'no-store',
          'X-Cache-Stale': 'true',
        },
      });
    }

    const message = error instanceof Error ? error.message : 'Failed to fetch ESPN Scoreboard';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

