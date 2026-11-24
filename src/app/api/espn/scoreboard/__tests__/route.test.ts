import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';
import { clearMemorySnapshots, setMemorySnapshot } from '../../serverCache';

describe('/api/espn/scoreboard Route Handler', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    clearMemorySnapshots();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    clearMemorySnapshots();
  });

  it('fetches scoreboard and returns cache-control headers with tags and revalidate', async () => {
    const mockScoreboardData = {
      events: [
        {
          id: '401580384',
          name: 'Masters Tournament',
          status: { type: { state: 'in', name: 'STATUS_IN_PROGRESS' } },
          competitions: [{ competitors: [] }],
        },
      ],
      leagues: [
        {
          events: [
            {
              id: '401580384',
              name: 'Masters Tournament',
            },
          ],
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

    const req = new NextRequest('http://localhost:3000/api/espn/scoreboard');
    const res = await GET(req);

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard',
      expect.objectContaining({
        next: { revalidate: 60, tags: ['espn-scoreboard'] },
      })
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=60, stale-while-revalidate=120');
    const json = await res.json();
    expect(json.events).toBeDefined();
    expect(json.events.length).toBe(1);
    expect(json.events[0].id).toBe('401580384');
  });

  it('handles force=true query param to bypass cache', async () => {
    const mockData = { leagues: [{ events: [] }] };
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    global.fetch = fetchSpy;

    const req = new NextRequest('http://localhost:3000/api/espn/scoreboard?force=true');
    const res = await GET(req);

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard',
      expect.objectContaining({
        cache: 'no-store',
      })
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('returns stale snapshot with X-Cache-Stale header when upstream fails with 500', async () => {
    setMemorySnapshot('scoreboard:default', { events: [{ id: 'cached-event', name: 'Cached Event' }] });

    global.fetch = vi.fn().mockResolvedValue(
      new Response('Server Error', { status: 500 })
    );

    const req = new NextRequest('http://localhost:3000/api/espn/scoreboard');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('X-Cache-Stale')).toBe('true');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    const json = await res.json();
    expect(json.events[0].id).toBe('cached-event');
  });

  it('returns stale snapshot when upstream throws a network error', async () => {
    setMemorySnapshot('scoreboard:default', { events: [{ id: 'cached-event', name: 'Cached Event' }] });

    global.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

    const req = new NextRequest('http://localhost:3000/api/espn/scoreboard');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('X-Cache-Stale')).toBe('true');
    const json = await res.json();
    expect(json.events[0].id).toBe('cached-event');
  });

  it('returns 500 error when upstream fails and no cached snapshot exists', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

    const req = new NextRequest('http://localhost:3000/api/espn/scoreboard');
    const res = await GET(req);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Network offline');
  });

  it('rejects invalid event or season query parameters with 400 and constructs URL safely', async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy;

    const badEventReq = new NextRequest('http://localhost:3000/api/espn/scoreboard?event=123../admin');
    const badEventRes = await GET(badEventReq);
    expect(badEventRes.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();

    const badSeasonReq = new NextRequest('http://localhost:3000/api/espn/scoreboard?season=26');
    const badSeasonRes = await GET(badSeasonReq);
    expect(badSeasonRes.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ events: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const validEventReq = new NextRequest('http://localhost:3000/api/espn/scoreboard?event=401580384');
    const validEventRes = await GET(validEventReq);
    expect(validEventRes.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard?event=401580384',
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      })
    );
  });

  it('enforces 8-second AbortSignal timeout on upstream fetch and emits X-Cache-Age on stale fallback', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-10T12:00:00Z'));

    try {
      const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');
      setMemorySnapshot('scoreboard:default', { events: [{ id: 'cached-event', name: 'Cached Event' }] });

      vi.advanceTimersByTime(125_000); // 125 seconds old

      global.fetch = vi.fn().mockRejectedValue(new DOMException('Timed out', 'TimeoutError'));

      const req = new NextRequest('http://localhost:3000/api/espn/scoreboard');
      const res = await GET(req);

      expect(timeoutSpy).toHaveBeenCalledWith(8000);
      expect(res.status).toBe(200);
      expect(res.headers.get('X-Cache-Stale')).toBe('true');
      expect(res.headers.get('X-Cache-Age')).toBe('125');
    } finally {
      vi.useRealTimers();
    }
  });

  it('expires scoreboard stale snapshot after 24 hours and returns upstream error', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-10T12:00:00Z'));

    try {
      setMemorySnapshot('scoreboard:default', { events: [{ id: 'old-event', name: 'Old Event' }] });
      vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1000); // 24h + 1s

      global.fetch = vi.fn().mockResolvedValue(new Response('Upstream down', { status: 503 }));

      const req = new NextRequest('http://localhost:3000/api/espn/scoreboard');
      const res = await GET(req);

      expect(res.status).toBe(503);
      expect(res.headers.get('X-Cache-Stale')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('enforces 10-second cooldown for force=true scoreboard requests', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-10T12:00:00Z'));

    try {
      const fetchSpy = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ events: [{ id: '401580384', name: 'Masters' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
      global.fetch = fetchSpy;

      const res1 = await GET(new NextRequest('http://localhost:3000/api/espn/scoreboard?force=true'));
      expect(res1.status).toBe(200);
      expect(res1.headers.get('X-Force-Coalesced')).toBeNull();
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(3_000);
      const res2 = await GET(new NextRequest('http://localhost:3000/api/espn/scoreboard?force=true'));
      expect(res2.status).toBe(200);
      expect(res2.headers.get('Cache-Control')).toBe('no-store');
      expect(res2.headers.get('X-Force-Coalesced')).toBe('true');
      expect(res2.headers.get('X-Cache-Age')).toBe('3');
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
