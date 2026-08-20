// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePlayerSummary, clearPlayerSummaryCache } from '../usePlayerSummary';
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
});

