import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('event');

    const url = eventId
      ? `https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard?event=${eventId}`
      : 'https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard';


    const res = await fetch(url, {
      next: { revalidate: 60 },
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `ESPN Leaderboard API returned status ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch ESPN Leaderboard' },
      { status: 500 }
    );
  }
}
