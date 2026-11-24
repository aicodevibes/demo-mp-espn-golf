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

  it('matches multi-course event courses by round or payload courseId (Torrey Pines North vs South) and falls back to courses[0]', async () => {
    const mockCoreEvent = {
      courses: [
        {
          id: '101',
          name: 'Torrey Pines (North Course)',
          shotsToPar: 72,
          holes: Array.from({ length: 18 }, () => ({ shotsToPar: 4 })),
        },
        {
          id: '102',
          name: 'Torrey Pines (South Course)',
          shotsToPar: 71,
          holes: [4, 4, 3, 4, 4, 5, 4, 3, 4, 4, 3, 4, 5, 4, 4, 3, 4, 5].map((p) => ({ shotsToPar: p })),
        },
      ],
    };

    const summarySouthRound = {
      profile: { id: '9478', displayName: 'Scottie Scheffler' },
      rounds: [
        { period: 1, courseId: '101', value: 68 },
        { period: 2, courseId: '102', value: 70 },
      ],
    };

    const summaryUnknownCourse = {
      profile: { id: '3470', displayName: 'Rory McIlroy' },
      courseId: '999',
      rounds: [{ period: 1, value: 69 }],
    };

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('player=9478')) {
        return Promise.resolve(new Response(JSON.stringify(summarySouthRound), { status: 200 }));
      }
      if (url.includes('player=3470')) {
        return Promise.resolve(new Response(JSON.stringify(summaryUnknownCourse), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify(mockCoreEvent), { status: 200 }));
    });

    // 1. Matches round courseId '102' (Torrey Pines South)
    const southRes = await GET(
      new NextRequest('http://localhost:3000/api/espn/playersummary?eventId=401580390&playerId=9478&season=2026')
    );
    expect(southRes.status).toBe(200);
    const southJson = await southRes.json();
    expect(southJson.courseName).toBe('Torrey Pines (South Course)');
    expect(southJson.shotsToPar).toBe(71);
    expect(southJson.courseHoles).toEqual([4, 4, 3, 4, 4, 5, 4, 3, 4, 4, 3, 4, 5, 4, 4, 3, 4, 5]);

    // 2. Query param courseId overrides when explicitly provided
    const northByQueryRes = await GET(
      new NextRequest('http://localhost:3000/api/espn/playersummary?eventId=401580390&playerId=9478&season=2026&courseId=101')
    );
    expect(northByQueryRes.status).toBe(200);
    const northByQueryJson = await northByQueryRes.json();
    expect(northByQueryJson.courseName).toBe('Torrey Pines (North Course)');
    expect(northByQueryJson.shotsToPar).toBe(72);

    // 3. Unknown courseId falls back cleanly to courses[0]
    const fallbackRes = await GET(
      new NextRequest('http://localhost:3000/api/espn/playersummary?eventId=401580390&playerId=3470&season=2026')
    );
    expect(fallbackRes.status).toBe(200);
    const fallbackJson = await fallbackRes.json();
    expect(fallbackJson.courseName).toBe('Torrey Pines (North Course)');
    expect(fallbackJson.shotsToPar).toBe(72);
  });

  it('handles non-JSON core event body cleanly without crashing or reading body twice', async () => {
    const mockSummary = { profile: { id: '12345', displayName: 'Tiger Woods' }, rounds: [] };
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('playersummary')) {
        return Promise.resolve(
          new Response(JSON.stringify(mockSummary), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }
      return Promise.resolve(
        new Response('<html>Bad Gateway</html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        })
      );
    });

    const res = await GET(
      new NextRequest('http://localhost:3000/api/espn/playersummary?eventId=401580391&playerId=12345&season=2026')
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.profile.displayName).toBe('Tiger Woods');
    expect(json.courseHoles).toBeUndefined();
  });

  it('keeps 1-hour coreEventUrl cache when force=true bypasses only player summary fetch', async () => {
    const fetchSpy = vi.fn().mockImplementation((url: string) => {
      if (url.includes('playersummary')) {
        return Promise.resolve(
          new Response(JSON.stringify({ profile: { id: '12345' }, rounds: [] }), { status: 200 })
        );
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            courses: [{ name: 'Augusta National', shotsToPar: 72, holes: [{ shotsToPar: 4 }] }],
          }),
          { status: 200 }
        )
      );
    });
    global.fetch = fetchSpy;

    const req = new NextRequest(
      'http://localhost:3000/api/espn/playersummary?eventId=401580384&playerId=12345&season=2026&force=true'
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');

    const summaryCall = fetchSpy.mock.calls.find(([url]) => String(url).includes('playersummary'));
    const coreEventCall = fetchSpy.mock.calls.find(([url]) => String(url).includes('sports.core.api.espn.com'));

    expect(summaryCall?.[1]).toEqual(expect.objectContaining({ cache: 'no-store' }));
    expect(summaryCall?.[1]?.next).toBeUndefined();
    expect(coreEventCall?.[1]).toEqual(
      expect.objectContaining({
        next: { revalidate: 3600, tags: ['espn-core-event'] },
      })
    );
    expect(coreEventCall?.[1]?.cache).toBeUndefined();
  });

  it('enforces 10s force=true cooldown and in-flight coalescing per player summary key', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-10T12:00:00Z'));

    try {
      let resolveSummary!: (res: Response) => void;
      const pendingSummary = new Promise<Response>((resolve) => {
        resolveSummary = resolve;
      });

      const fetchSpy = vi.fn().mockImplementation((url: string) => {
        if (url.includes('playersummary')) {
          return pendingSummary;
        }
        return Promise.resolve(
          new Response(JSON.stringify({ courses: [{ name: 'Augusta', shotsToPar: 72, holes: [] }] }), {
            status: 200,
          })
        );
      });
      global.fetch = fetchSpy;

      // Concurrent force=true requests coalesce onto a single upstream fetch pair
      const p1 = GET(
        new NextRequest(
          'http://localhost:3000/api/espn/playersummary?eventId=401580384&playerId=12345&season=2026&force=true'
        )
      );
      const p2 = GET(
        new NextRequest(
          'http://localhost:3000/api/espn/playersummary?eventId=401580384&playerId=12345&season=2026&force=true'
        )
      );

      expect(fetchSpy).toHaveBeenCalledTimes(2); // 1 playersummary + 1 coreEvent

      resolveSummary(
        new Response(
          JSON.stringify({
            profile: { id: '12345', displayName: 'Tiger Woods' },
            status: { type: { state: 'in', name: 'STATUS_IN_PROGRESS' } },
          }),
          { status: 200 }
        )
      );

      const [res1, res2] = await Promise.all([p1, p2]);
      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(res1.headers.get('X-Force-Coalesced')).toBeNull();
      expect(res2.headers.get('X-Force-Coalesced')).toBe('true');
      expect((await res1.json()).profile.displayName).toBe('Tiger Woods');
      expect((await res2.json()).profile.displayName).toBe('Tiger Woods');

      // Second sequential request 5s later hits 10s cooldown without calling fetch again
      vi.advanceTimersByTime(5_000);
      const res3 = await GET(
        new NextRequest(
          'http://localhost:3000/api/espn/playersummary?eventId=401580384&playerId=12345&season=2026&force=true'
        )
      );
      expect(res3.status).toBe(200);
      expect(res3.headers.get('Cache-Control')).toBe('no-store');
      expect(res3.headers.get('X-Force-Coalesced')).toBe('true');
      expect(res3.headers.get('X-Cache-Age')).toBe('5');
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
