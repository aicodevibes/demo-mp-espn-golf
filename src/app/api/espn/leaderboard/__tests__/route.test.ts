import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';

describe('/api/espn/leaderboard Route Handler', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('sets revalidate: 15 and s-maxage=15, stale-while-revalidate=30 for active tournament events', async () => {
    const mockData = {
      id: '401580384',
      name: 'Masters Tournament',
      events: [
        {
          id: '401580384',
          status: {
            type: {
              state: 'in',
              name: 'STATUS_IN_PROGRESS',
              detail: 'Round 2 - In Progress',
            },
          },
          competitions: [{ competitors: [] }],
        },
      ],
    };

    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    global.fetch = fetchSpy;

    const req = new NextRequest('http://localhost:3000/api/espn/leaderboard?event=401580384');
    const res = await GET(req);

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://site.web.api.espn.com/apis/site/v2/sports/golf/leaderboard?event=401580384',
      expect.objectContaining({
        next: { revalidate: 15 },
      })
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=15, stale-while-revalidate=30');
    const json = await res.json();
    expect(json.id).toBe('401580384');
  });

  it('sets relaxed 300s cache window for scheduled or completed tournaments', async () => {
    const mockCompletedData = {
      id: '401580384',
      events: [
        {
          id: '401580384',
          status: {
            type: {
              state: 'post',
              name: 'STATUS_FINAL',
              detail: 'Final',
            },
          },
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockCompletedData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const req = new NextRequest('http://localhost:3000/api/espn/leaderboard?event=401580384');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=300, stale-while-revalidate=600');
  });

  it('sets relaxed 300s cache window for scheduled pre-tournament events', async () => {
    const mockPreData = {
      id: '401580384',
      events: [
        {
          id: '401580384',
          status: {
            type: {
              state: 'pre',
              name: 'STATUS_SCHEDULED',
              detail: 'Scheduled',
            },
          },
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockPreData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const req = new NextRequest('http://localhost:3000/api/espn/leaderboard?event=401580384');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=300, stale-while-revalidate=600');
  });

  it('bypasses server and CDN cache when force=true is provided', async () => {
    const mockData = {
      id: '401580384',
      events: [
        {
          id: '401580384',
          status: {
            type: {
              state: 'in',
              name: 'STATUS_IN_PROGRESS',
            },
          },
        },
      ],
    };

    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    global.fetch = fetchSpy;

    const req = new NextRequest('http://localhost:3000/api/espn/leaderboard?event=401580384&force=true');
    const res = await GET(req);

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://site.web.api.espn.com/apis/site/v2/sports/golf/leaderboard?event=401580384',
      expect.objectContaining({
        cache: 'no-store',
      })
    );
    const callArgs = fetchSpy.mock.calls[0][1];
    expect(callArgs.next).toBeUndefined();

    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('fetches default scoreboard endpoint when event parameter is omitted', async () => {
    const mockScoreboardData = {
      events: [
        {
          id: '401580384',
          status: {
            type: {
              state: 'in',
              name: 'STATUS_IN_PROGRESS',
            },
          },
        },
      ],
    };

    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockScoreboardData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    global.fetch = fetchSpy;

    const req = new NextRequest('http://localhost:3000/api/espn/leaderboard');
    const res = await GET(req);

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard',
      expect.any(Object)
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=15, stale-while-revalidate=30');
  });

  it('gracefully handles upstream 429 rate limit error with structured JSON', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Rate limit exceeded' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const req = new NextRequest('http://localhost:3000/api/espn/leaderboard?event=401580384');
    const res = await GET(req);

    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toBe('Rate limit exceeded');
  });

  it('gracefully handles upstream 500 error with structured JSON', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response('Internal Server Error', {
        status: 500,
      })
    );

    const req = new NextRequest('http://localhost:3000/api/espn/leaderboard?event=401580384');
    const res = await GET(req);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('ESPN Leaderboard API returned status 500');
  });

  it('gracefully handles network fetch exceptions with 500 status', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network connectivity lost'));

    const req = new NextRequest('http://localhost:3000/api/espn/leaderboard?event=401580384');
    const res = await GET(req);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Network connectivity lost');
  });
});
