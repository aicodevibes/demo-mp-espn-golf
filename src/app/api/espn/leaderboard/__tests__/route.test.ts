import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';
import { clearMemorySnapshots, setMemorySnapshot } from '../../serverCache';

describe('/api/espn/leaderboard Route Handler', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    clearMemorySnapshots();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    clearMemorySnapshots();
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
        next: { revalidate: 15, tags: ['espn-leaderboard'] },
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

  it('gracefully handles upstream 429 rate limit error with structured JSON when no stale data exists', async () => {
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

  it('returns stale snapshot when upstream fails with 500 error', async () => {
    setMemorySnapshot('leaderboard:401580384', {
      id: '401580384',
      name: 'Cached Masters',
    });

    global.fetch = vi.fn().mockResolvedValue(
      new Response('Internal Server Error', {
        status: 500,
      })
    );

    const req = new NextRequest('http://localhost:3000/api/espn/leaderboard?event=401580384');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('X-Cache-Stale')).toBe('true');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    const json = await res.json();
    expect(json.name).toBe('Cached Masters');
  });

  it('returns stale snapshot when upstream throws a network error', async () => {
    setMemorySnapshot('leaderboard:401580384', {
      id: '401580384',
      name: 'Cached Masters',
    });

    global.fetch = vi.fn().mockRejectedValue(new Error('Network connectivity lost'));

    const req = new NextRequest('http://localhost:3000/api/espn/leaderboard?event=401580384');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('X-Cache-Stale')).toBe('true');
    const json = await res.json();
    expect(json.name).toBe('Cached Masters');
  });

  it('gracefully handles upstream 500 error with structured JSON when no stale snapshot exists', async () => {
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

  it('gracefully handles network fetch exceptions with 500 status when no stale snapshot exists', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network connectivity lost'));

    const req = new NextRequest('http://localhost:3000/api/espn/leaderboard?event=401580384');
    const res = await GET(req);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Network connectivity lost');
  });

  it('rejects invalid event query parameter with 400 without calling upstream fetch', async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy;

    for (const badParam of ['', 'abc', '401580384&foo=bar', '1234567890123']) {
      const req = new NextRequest(
        `http://localhost:3000/api/espn/leaderboard?event=${encodeURIComponent(badParam)}`
      );
      const res = await GET(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBeTruthy();
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('enforces 8-second AbortSignal timeout and emits X-Cache-Age on stale fallback', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-10T12:00:00Z'));

    try {
      const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');
      setMemorySnapshot('leaderboard:401580384', {
        id: '401580384',
        events: [{ id: '401580384', status: { type: { state: 'in', name: 'STATUS_IN_PROGRESS' } } }],
      });

      vi.advanceTimersByTime(240_000); // 4 minutes

      global.fetch = vi.fn().mockRejectedValue(new DOMException('Timed out', 'TimeoutError'));

      const req = new NextRequest('http://localhost:3000/api/espn/leaderboard?event=401580384');
      const res = await GET(req);

      expect(timeoutSpy).toHaveBeenCalledWith(8000);
      expect(res.status).toBe(200);
      expect(res.headers.get('X-Cache-Stale')).toBe('true');
      expect(res.headers.get('X-Cache-Age')).toBe('240');
    } finally {
      vi.useRealTimers();
    }
  });

  it('expires live leaderboard stale snapshot after 30 minutes but retains post snapshot up to 24 hours', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-10T12:00:00Z'));

    try {
      setMemorySnapshot('leaderboard:401580384', {
        id: '401580384',
        events: [{ id: '401580384', status: { type: { state: 'in', name: 'STATUS_IN_PROGRESS' } } }],
      });
      setMemorySnapshot('leaderboard:401580385', {
        id: '401580385',
        events: [{ id: '401580385', status: { type: { state: 'post', name: 'STATUS_FINAL' } } }],
      });

      vi.advanceTimersByTime(31 * 60 * 1000); // 31 minutes

      global.fetch = vi.fn().mockImplementation(() => Promise.resolve(new Response('Down', { status: 502 })));

      const liveRes = await GET(new NextRequest('http://localhost:3000/api/espn/leaderboard?event=401580384'));
      expect(liveRes.status).toBe(502);
      expect(liveRes.headers.get('X-Cache-Stale')).toBeNull();

      const postRes = await GET(new NextRequest('http://localhost:3000/api/espn/leaderboard?event=401580385'));
      expect(postRes.status).toBe(200);
      expect(postRes.headers.get('X-Cache-Stale')).toBe('true');
      expect(postRes.headers.get('X-Cache-Age')).toBe(String(31 * 60));

      // Advance past 24 hours total (31m + 23h 30m = 24h 01m)
      vi.advanceTimersByTime(23 * 60 * 60 * 1000 + 30 * 60 * 1000);
      const expiredPostRes = await GET(new NextRequest('http://localhost:3000/api/espn/leaderboard?event=401580385'));
      expect(expiredPostRes.status).toBe(502);
    } finally {
      vi.useRealTimers();
    }
  });
});

