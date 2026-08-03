import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch(
      'https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard',
      {
        next: { revalidate: 60 },
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `ESPN API returned status ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const events = data.events || [];

    return NextResponse.json({ events }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch ESPN Scoreboard' },
      { status: 500 }
    );
  }
}
