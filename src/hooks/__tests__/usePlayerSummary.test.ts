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
});
