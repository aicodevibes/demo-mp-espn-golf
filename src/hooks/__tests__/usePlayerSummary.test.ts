// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import {
  usePlayerSummary,
  clearPlayerSummaryCache,
  prefetchPlayerSummary,
  prefetchPlayerSummaries,
  buildPlayerSummaryCacheKey,
  getCachedPlayerSummary,
  resolveEventSeason,
} from '../usePlayerSummary';
import { ESPNCompetitor } from '@/types/espn';

const mockCompetitor: ESPNCompetitor = {
  id: '12345',
  score: '-2',
  athlete: {
    id: '12345',
    displayName: 'Tiger Woods',
    headshot: { href: 'https://example.com/headshot.png' },
    country: { abbreviation: 'USA' },
  },
  linescores: [
    { period: 1, value: 70, displayValue: '70' },
  ],
} as ESPNCompetitor;

describe('usePlayerSummary Hook', () => {
  beforeEach(() => {
    clearPlayerSummaryCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns isLoading: true when eventId or competitor is not provided', () => {
    const { result } = renderHook(() =>
      usePlayerSummary({ eventId: undefined, competitor: null })
    );

    expect(result.current.summary).toBeNull();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isFetching).toBe(false);
  });

  it('populates initial fallback summary synchronously from competitor', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => new Promise(() => {}))
    );

    const { result } = renderHook(() =>
      usePlayerSummary({ eventId: '401234', competitor: mockCompetitor })
    );

    expect(result.current.summary).not.toBeNull();
    expect(result.current.summary?.player.displayName).toBe('Tiger Woods');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isFetching).toBe(true);
  });

  it('fetches full summary from ESPN API, updates state, and populates cache', async () => {
    const mockApiData = {
      profile: { id: '12345', displayName: 'Tiger Woods' },
      rounds: [
        {
          period: 1,
          displayValue: '70',
          linescores: [
            { period: 1, value: 4, par: 4, scoreType: { displayValue: 'E' } },
          ],
        },
      ],
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockApiData,
      })
    );

    const { result } = renderHook(() =>
      usePlayerSummary({ eventId: '401234', competitor: mockCompetitor })
    );

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    expect(result.current.summary).not.toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/espn/playersummary?eventId=401234&playerId=12345'),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it('returns cached summary instantly on subsequent calls', async () => {
    const mockApiData = {
      profile: { id: '12345', displayName: 'Tiger Woods' },
      rounds: [{ period: 1, displayValue: '70', linescores: [] }],
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockApiData,
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result, unmount } = renderHook(() =>
      usePlayerSummary({ eventId: '401234', competitor: mockCompetitor })
    );

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    unmount();
    fetchMock.mockClear();

    const { result: result2 } = renderHook(() =>
      usePlayerSummary({ eventId: '401234', competitor: mockCompetitor })
    );

    expect(result2.current.summary).not.toBeNull();
    expect(result2.current.isLoading).toBe(false);
    expect(result2.current.isFetching).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('caches fallback summary on 404 response to prevent retry loops and suppress error storms', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Not found' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result, rerender } = renderHook(() =>
      usePlayerSummary({ eventId: '401234', competitor: mockCompetitor })
    );

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    // Fallback summary is active
    expect(result.current.summary).not.toBeNull();
    expect(result.current.summary?.player.displayName).toBe('Tiger Woods');

    fetchMock.mockClear();

    // Rerender - should NOT trigger another fetch because 404 fallback is cached
    rerender();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.isFetching).toBe(false);
  });

  it('aborts previous in-flight fetch when competitor changes', async () => {
    const abortSpy = vi.fn();
    let currentSignal: AbortSignal | null = null;

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url, options) => {
        currentSignal = options?.signal;
        currentSignal?.addEventListener('abort', abortSpy);
        return new Promise(() => {}); // Never resolves
      })
    );

    let comp = mockCompetitor;
    const { rerender, unmount } = renderHook(() =>
      usePlayerSummary({ eventId: '401234', competitor: comp })
    );

    expect(currentSignal).not.toBeNull();
    expect(abortSpy).not.toHaveBeenCalled();

    // Switch to another golfer
    comp = { ...mockCompetitor, id: '99999', athlete: { id: '99999', displayName: 'Rory' } } as any;
    rerender();

    // Previous request should be aborted
    expect(abortSpy).toHaveBeenCalledTimes(1);

    unmount();
  });

  it('updates summary immediately when switching competitors', async () => {
    const compA = { id: '111', athlete: { id: '111', displayName: 'Golfer A' }, score: '-1' } as any;
    const compB = { id: '222', athlete: { id: '222', displayName: 'Golfer B' }, score: '-5' } as any;

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        const id = url.includes('111') ? '111' : '222';
        const name = id === '111' ? 'Golfer A' : 'Golfer B';
        return Promise.resolve({
          ok: true,
          json: async () => ({
            profile: { id, displayName: name },
            rounds: [{ period: 1, displayValue: id === '111' ? '71' : '67', linescores: [] }],
          }),
        });
      })
    );

    let comp = compA;
    const { result, rerender } = renderHook(() =>
      usePlayerSummary({ eventId: '401234', competitor: comp })
    );

    await waitFor(() => {
      expect(result.current.summary?.player.displayName).toBe('Golfer A');
    });

    // Switch to Golfer B
    comp = compB;
    rerender();

    // Immediately shows Golfer B fallback/summary
    expect(result.current.summary?.player.displayName).toBe('Golfer B');

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    expect(result.current.summary?.player.displayName).toBe('Golfer B');
  });

  it('pre-fetches golfer scorecards in background and warms cache for instantaneous zero-delay loading', async () => {
    const { prefetchPlayerSummaries, prefetchPlayerSummary, getCachedPlayerSummary, buildPlayerSummaryCacheKey } = await import('../usePlayerSummary');

    const golfer1: ESPNCompetitor = {
      id: 'g1',
      athlete: { id: 'g1', displayName: 'Scottie Scheffler' },
      score: '-10',
    } as ESPNCompetitor;

    const golfer2: ESPNCompetitor = {
      id: 'g2',
      athlete: { id: 'g2', displayName: 'Rory McIlroy' },
      score: '-8',
    } as ESPNCompetitor;

    const fetchSpy = vi.fn().mockImplementation((url: string) => {
      const id = url.includes('g1') ? 'g1' : 'g2';
      const name = id === 'g1' ? 'Scottie Scheffler' : 'Rory McIlroy';
      return Promise.resolve({
        ok: true,
        json: async () => ({
          profile: { id, displayName: name },
          rounds: [{ period: 1, displayValue: '66', linescores: [] }],
        }),
      });
    });
    vi.stubGlobal('fetch', fetchSpy);

    // Eager batch prefetch for drafted golfers
    await prefetchPlayerSummaries('401580384', [golfer1, golfer2]);

    expect(fetchSpy).toHaveBeenCalledTimes(2);

    const cacheKey1 = buildPlayerSummaryCacheKey('401580384', 'g1');
    const cached1 = getCachedPlayerSummary(cacheKey1);
    expect(cached1).toBeDefined();
    expect(cached1?.summary.player.displayName).toBe('Scottie Scheffler');

    // When the user clicks or selects golfer1, hook returns cached summary immediately without initiating a fetch
    fetchSpy.mockClear();
    const { result } = renderHook(() =>
      usePlayerSummary({ eventId: '401580384', competitor: golfer1 })
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isFetching).toBe(false);
    expect(result.current.summary?.player.displayName).toBe('Scottie Scheffler');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('invalidates cache immediately when golfer live score or thru updates', async () => {
    const compHole7: ESPNCompetitor = {
      id: '5409',
      score: 'E',
      athlete: { id: '5409', displayName: 'Russell Henley' },
      status: { period: 1, thru: 7, type: { state: 'in' } },
    } as any;

    const fetchSpy = vi.fn().mockImplementation((url: string) => {
      const isHole17 = url.includes('&force=true') || fetchSpy.mock.calls.length > 1;
      return Promise.resolve({
        ok: true,
        json: async () => ({
          profile: { id: '5409', displayName: 'Russell Henley' },
          rounds: [
            {
              period: 1,
              displayValue: isHole17 ? '-3' : 'E',
              linescores: Array.from({ length: isHole17 ? 17 : 7 }, (_, i) => ({
                period: i + 1,
                value: 4,
                scoreType: { displayValue: 'E' },
              })),
            },
          ],
        }),
      });
    });
    vi.stubGlobal('fetch', fetchSpy);

    const { result, rerender } = renderHook(
      ({ comp }) => usePlayerSummary({ eventId: '401811963', competitor: comp }),
      { initialProps: { comp: compHole7 } }
    );

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    expect(result.current.summary?.rounds[0]?.holes.filter((h) => h.isPlayed).length).toBe(7);

    // Henley finishes hole 17 and is now -3 thru 17
    const compHole17: ESPNCompetitor = {
      id: '5409',
      score: 'E',
      scoreDisplay: '-3',
      thruDisplay: '17',
      athlete: { id: '5409', displayName: 'Russell Henley' },
      status: { period: 1, thru: 17, type: { state: 'in' } },
    } as any;

    rerender({ comp: compHole17 });

    // Triggers network fetch because fingerprint changed with updated thru/scoreDisplay
    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    expect(result.current.summary?.rounds[0]?.holes.filter((h) => h.isPlayed).length).toBe(17);
  });

  it('bypasses cache when forceRefreshKey is passed', async () => {
    const mockApiData = {
      profile: { id: '12345', displayName: 'Tiger Woods' },
      rounds: [{ period: 1, displayValue: '70', linescores: [] }],
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockApiData,
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result, rerender } = renderHook(
      ({ key }) =>
        usePlayerSummary({
          eventId: '401234',
          competitor: mockCompetitor,
          forceRefreshKey: key,
        }),
      { initialProps: { key: undefined as number | undefined } }
    );

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Re-render with forceRefreshKey
    rerender({ key: Date.now() });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('&force=true'),
        expect.anything()
      );
    });
  });

  it('consumes each forceRefreshKey nonce at most once so golfer switches and re-clicks hit client/CDN caches without &force=true', async () => {
    const compA: ESPNCompetitor = {
      id: '111',
      score: '-2',
      athlete: { id: '111', displayName: 'Golfer A' },
      status: { period: 1, thru: 9, type: { state: 'in' } },
    } as ESPNCompetitor;

    const compB: ESPNCompetitor = {
      id: '222',
      score: '-4',
      athlete: { id: '222', displayName: 'Golfer B' },
      status: { period: 1, thru: 9, type: { state: 'in' } },
    } as ESPNCompetitor;

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      const id = url.includes('playerId=111') ? '111' : '222';
      const name = id === '111' ? 'Golfer A' : 'Golfer B';
      return Promise.resolve({
        ok: true,
        json: async () => ({
          profile: { id, displayName: name },
          rounds: [{ period: 1, displayValue: '68', linescores: [] }],
        }),
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result, rerender } = renderHook(
      ({ comp, nonce }: { comp: ESPNCompetitor; nonce: number }) =>
        usePlayerSummary({
          eventId: '401234',
          competitor: comp,
          forceRefreshKey: nonce || undefined,
        }),
      { initialProps: { comp: compA, nonce: 0 } }
    );

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).not.toContain('&force=true');

    // Manual forced refresh increments nonce -> 1: Golfer A fetches ONCE with &force=true
    fetchMock.mockClear();
    rerender({ comp: compA, nonce: 1 });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    expect(String(fetchMock.mock.calls[0][0])).toContain('&force=true');
    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    // Switch to Golfer B while nonce stays 1 -> must NOT send &force=true
    fetchMock.mockClear();
    rerender({ comp: compB, nonce: 1 });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    expect(String(fetchMock.mock.calls[0][0])).toContain('playerId=222');
    expect(String(fetchMock.mock.calls[0][0])).not.toContain('&force=true');
    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    // Switch back to Golfer A while nonce stays 1 -> hits client cache (0 fetches)
    fetchMock.mockClear();
    rerender({ comp: compA, nonce: 1 });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.isFetching).toBe(false);

    // Switch back to Golfer B while nonce stays 1 -> hits client cache (0 fetches)
    rerender({ comp: compB, nonce: 1 });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.isFetching).toBe(false);

    // New forced refresh (nonce -> 2) -> fetches Golfer B WITH &force=true
    rerender({ comp: compB, nonce: 2 });
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    expect(String(fetchMock.mock.calls[0][0])).toContain('playerId=222');
    expect(String(fetchMock.mock.calls[0][0])).toContain('&force=true');
  });

  it('resolves historical season from event.season.year or event.date and falls back to current year', () => {
    const currentYear = new Date().getFullYear();

    expect(resolveEventSeason({ season: { year: 2024 }, date: '2025-01-01T00:00:00Z' })).toBe(2024);
    expect(resolveEventSeason({ date: '2023-04-06T12:00:00Z' })).toBe(2023);
    expect(resolveEventSeason({ date: '2024-01-01T02:00:00Z' })).toBe(2024);
    expect(resolveEventSeason({ date: 'not-a-date' })).toBe(currentYear);
    expect(resolveEventSeason(null)).toBe(currentYear);
    expect(resolveEventSeason(undefined)).toBe(currentYear);
  });

  it('propagates historical season into usePlayerSummary, prefetchPlayerSummaries, and isolates cache keys by season', async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          profile: { id: '12345', displayName: 'Tiger Woods' },
          rounds: [{ period: 1, displayValue: '70', linescores: [] }],
        }),
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() =>
      usePlayerSummary({ eventId: '401580340', competitor: mockCompetitor, season: 2024 })
    );

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/espn/playersummary?eventId=401580340&playerId=12345&season=2024',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );

    const key2024 = buildPlayerSummaryCacheKey('401580340', '12345', 2024);
    const key2026 = buildPlayerSummaryCacheKey('401580340', '12345', 2026);
    expect(key2024).not.toBe(key2026);
    expect(getCachedPlayerSummary(key2024)).toBeDefined();
    expect(getCachedPlayerSummary(key2026)).toBeUndefined();

    // Prefetch with season=2023 should hit season=2023 and warm its own cache entry
    fetchMock.mockClear();
    const otherGolfer: ESPNCompetitor = {
      id: '9478',
      athlete: { id: '9478', displayName: 'Scottie Scheffler' },
      score: '-10',
    } as ESPNCompetitor;

    await prefetchPlayerSummaries('401465508', [otherGolfer], 2023);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/espn/playersummary?eventId=401465508&playerId=9478&season=2023'
    );
    expect(getCachedPlayerSummary(buildPlayerSummaryCacheKey('401465508', '9478', 2023))).toBeDefined();
  });

  it('deduplicates in-flight prefetchPlayerSummary with usePlayerSummary for the same golfer and season', async () => {
    let resolveFetch!: (val: unknown) => void;
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
    );
    vi.stubGlobal('fetch', fetchMock);

    const prefetchPromise = prefetchPlayerSummary('401580340', mockCompetitor, 2024);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const { result } = renderHook(() =>
      usePlayerSummary({ eventId: '401580340', competitor: mockCompetitor, season: 2024 })
    );

    // Must reuse the in-flight prefetch instead of issuing a second fetch
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.isFetching).toBe(true);

    await act(async () => {
      resolveFetch({
        ok: true,
        json: async () => ({
          profile: { id: '12345', displayName: 'Tiger Woods' },
          rounds: [
            {
              period: 1,
              displayValue: '69',
              linescores: [{ period: 1, value: 3, par: 4, scoreType: { displayValue: '-1' } }],
            },
          ],
        }),
      });
      await prefetchPromise;
    });

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.summary?.rounds[0]?.holes[0]?.strokes).toBe(3);
  });

  it('bounds prefetchPlayerSummaries to at most 3 concurrent fetches even when more than 3 competitors are passed', async () => {
    const competitors: ESPNCompetitor[] = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'].map(
      (id, idx) =>
        ({
          id,
          athlete: { id, displayName: `Golfer ${idx + 1}` },
          score: '-2',
        }) as ESPNCompetitor
    );

    let activeFetches = 0;
    let peakConcurrency = 0;
    const resolvers: Array<() => void> = [];

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      activeFetches += 1;
      peakConcurrency = Math.max(peakConcurrency, activeFetches);
      const match = /playerId=([^&]+)/.exec(url);
      const id = match?.[1] ?? 'unknown';

      return new Promise((resolve) => {
        resolvers.push(() => {
          activeFetches -= 1;
          resolve({
            ok: true,
            json: async () => ({
              profile: { id, displayName: `Golfer ${id}` },
              rounds: [{ period: 1, displayValue: '70', linescores: [] }],
            }),
          });
        });
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    let completed = false;
    const batchPromise = prefetchPlayerSummaries('401580340', competitors, 2024).then(() => {
      completed = true;
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });
    expect(peakConcurrency).toBe(3);

    // Drain queued fetches wave by wave until all 6 finish
    while (!completed) {
      if (resolvers.length > 0) {
        const batch = resolvers.splice(0, resolvers.length);
        batch.forEach((fn) => fn());
      }
      await new Promise((r) => setTimeout(r, 0));
    }

    await batchPromise;

    expect(fetchMock).toHaveBeenCalledTimes(6);
    expect(peakConcurrency).toBe(3);
    for (const comp of competitors) {
      expect(
        getCachedPlayerSummary(buildPlayerSummaryCacheKey('401580340', comp.id, 2024))
      ).toBeDefined();
    }
  });
});

