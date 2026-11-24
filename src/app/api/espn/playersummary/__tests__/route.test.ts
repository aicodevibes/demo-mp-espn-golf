import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';
import { clearMemorySnapshots, setMemorySnapshot } from '../../serverCache';

describe('/api/espn/playersummary Route Handler', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    clearMemorySnapshots();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    clearMemorySnapshots();
  });

  it('validates required parameters', async () => {
    const req = new NextRequest('http://localhost:3000/api/espn/playersummary');
    const res = await GET(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Parameters eventId and playerId are required');
  });

  it('fetches player summary and core event data with cache headers and tags', async () => {
    const mockSummary = {
      player: { id: '12345', displayName: 'Tiger Woods' },
    };
    const mockCoreEvent = {
      courses: [
        {
          name: 'Augusta National Golf Club',
          shotsToPar: 72,
          holes: [{ shotsToPar: 4 }, { shotsToPar: 5 }],
        },
      ],
    };

    const fetchSpy = vi.fn().mockImplementation((url: string) => {
      if (url.includes('playersummary')) {
        return Promise.resolve(
          new Response(JSON.stringify(mockSummary), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify(mockCoreEvent), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
    global.fetch = fetchSpy;

    const req = new NextRequest(
      'http://localhost:3000/api/espn/playersummary?eventId=401580384&playerId=12345&season=2026'
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=15, stale-while-revalidate=30');

    const json = await res.json();
    expect(json.player.displayName).toBe('Tiger Woods');
    expect(json.courseName).toBe('Augusta National Golf Club');
    expect(json.shotsToPar).toBe(72);
    expect(json.courseHoles).toEqual([4, 5]);

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('playersummary?season=2026&player=12345'),
      expect.objectContaining({
        next: { revalidate: 15, tags: ['espn-playersummary'] },
      })
    );
  });

  it('handles force=true query param to bypass cache', async () => {
    const mockSummary = { player: { id: '12345' } };
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockSummary), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    global.fetch = fetchSpy;

    const req = new NextRequest(
      'http://localhost:3000/api/espn/playersummary?eventId=401580384&playerId=12345&force=true'
    );
    const res = await GET(req);

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('playersummary'),
      expect.objectContaining({ cache: 'no-store' })
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('returns stale snapshot when upstream fails with 500', async () => {
    setMemorySnapshot('playersummary:401580384:12345:2026', {
      player: { id: '12345', displayName: 'Cached Tiger' },
    });

    global.fetch = vi.fn().mockResolvedValue(
      new Response('Upstream Crash', { status: 500 })
    );

    const req = new NextRequest(
      'http://localhost:3000/api/espn/playersummary?eventId=401580384&playerId=12345&season=2026'
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('X-Cache-Stale')).toBe('true');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    const json = await res.json();
    expect(json.player.displayName).toBe('Cached Tiger');
  });

  it('returns stale snapshot when upstream throws a network error', async () => {
    setMemorySnapshot('playersummary:401580384:12345:2026', {
      player: { id: '12345', displayName: 'Cached Tiger' },
    });

    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const req = new NextRequest(
      'http://localhost:3000/api/espn/playersummary?eventId=401580384&playerId=12345&season=2026'
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('X-Cache-Stale')).toBe('true');
    const json = await res.json();
    expect(json.player.displayName).toBe('Cached Tiger');
  });

  it('returns 500 error when upstream fails and no cached snapshot exists', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const req = new NextRequest(
      'http://localhost:3000/api/espn/playersummary?eventId=401580384&playerId=12345'
    );
    const res = await GET(req);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Network error');
  });

  it('rejects malformed eventId, playerId, or season query parameters with 400', async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy;

    const badCases = [
      'eventId=401580384/../../etc&playerId=12345',
      'eventId=401580384&playerId=abc',
      'eventId=401580384&playerId=12345&season=202',
      'eventId=401580384&playerId=12345&season=2026a',
      'eventId=1234567890123&playerId=12345',
    ];

    for (const qs of badCases) {
      const req = new NextRequest(`http://localhost:3000/api/espn/playersummary?${qs}`);
      const res = await GET(req);
      expect(res.status).toBe(400);
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('enforces 8-second AbortSignal timeout on both upstream fetches and emits X-Cache-Age on stale fallback', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-10T12:00:00Z'));

    try {
      const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');
      setMemorySnapshot('playersummary:401580384:12345:2026', {
        player: { id: '12345', displayName: 'Cached Tiger' },
      });

      vi.advanceTimersByTime(90_000);

      const fetchSpy = vi.fn().mockRejectedValue(new DOMException('Timed out', 'TimeoutError'));
      global.fetch = fetchSpy;

      const req = new NextRequest(
        'http://localhost:3000/api/espn/playersummary?eventId=401580384&playerId=12345&season=2026'
      );
      const res = await GET(req);

      expect(timeoutSpy).toHaveBeenCalledWith(8000);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      for (const call of fetchSpy.mock.calls) {
        expect(call[1]).toEqual(expect.objectContaining({ signal: expect.any(AbortSignal) }));
      }
      expect(res.status).toBe(200);
      expect(res.headers.get('X-Cache-Stale')).toBe('true');
      expect(res.headers.get('X-Cache-Age')).toBe('90');
    } finally {
      vi.useRealTimers();
    }
  });

  it('uses adaptive 300s Cache-Control and 24h staleness cap for completed/pre events vs 30m cap for live events', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-10T12:00:00Z'));

    try {
      const mockSummary = { profile: { id: '12345' }, rounds: [] };
      const mockCompletedCoreEvent = {
        status: { type: { state: 'post', name: 'STATUS_FINAL', completed: true } },
        courses: [{ name: 'Augusta', shotsToPar: 72, holes: [{ shotsToPar: 4 }] }],
      };
      const mockLiveCoreEvent = {
        status: { type: { state: 'in', name: 'STATUS_IN_PROGRESS', completed: false } },
        courses: [{ name: 'Augusta', shotsToPar: 72, holes: [{ shotsToPar: 4 }] }],
      };

      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('playersummary')) {
          return Promise.resolve(new Response(JSON.stringify(mockSummary), { status: 200 }));
        }
        const corePayload = url.includes('401580385') ? mockCompletedCoreEvent : mockLiveCoreEvent;
        return Promise.resolve(new Response(JSON.stringify(corePayload), { status: 200 }));
      });

      const postRes = await GET(
        new NextRequest('http://localhost:3000/api/espn/playersummary?eventId=401580385&playerId=12345&season=2026')
      );
      expect(postRes.status).toBe(200);
      expect(postRes.headers.get('Cache-Control')).toBe('public, s-maxage=300, stale-while-revalidate=600');

      const liveRes = await GET(
        new NextRequest('http://localhost:3000/api/espn/playersummary?eventId=401580384&playerId=12345&season=2026')
      );
      expect(liveRes.status).toBe(200);
      expect(liveRes.headers.get('Cache-Control')).toBe('public, s-maxage=15, stale-while-revalidate=30');

      // Subsequent request for completed event should also align fetch revalidate: 300
      const fetchSpy = global.fetch as ReturnType<typeof vi.fn>;
      fetchSpy.mockClear();
      await GET(
        new NextRequest('http://localhost:3000/api/espn/playersummary?eventId=401580385&playerId=12345&season=2026')
      );
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('playersummary'),
        expect.objectContaining({ next: { revalidate: 300, tags: ['espn-playersummary'] } })
      );

      // Advance 31 minutes: live event expires, completed event stays cached up to 24h
      vi.advanceTimersByTime(31 * 60 * 1000);
      global.fetch = vi.fn().mockResolvedValue(new Response('Down', { status: 503 }));

      const expiredLive = await GET(
        new NextRequest('http://localhost:3000/api/espn/playersummary?eventId=401580384&playerId=12345&season=2026')
      );
      expect(expiredLive.status).toBe(503);

      const validPost = await GET(
        new NextRequest('http://localhost:3000/api/espn/playersummary?eventId=401580385&playerId=12345&season=2026')
      );
      expect(validPost.status).toBe(200);
      expect(validPost.headers.get('X-Cache-Stale')).toBe('true');
      expect(validPost.headers.get('X-Cache-Age')).toBe(String(31 * 60));
    } finally {
      vi.useRealTimers();
    }
  });
});
