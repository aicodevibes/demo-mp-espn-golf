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
});
