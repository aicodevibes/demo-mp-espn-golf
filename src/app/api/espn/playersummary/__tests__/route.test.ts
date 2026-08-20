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
});
