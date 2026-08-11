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
    // Mock API fetch to return delayed response
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => new Promise(() => {})) // Never resolves immediately
    );

    const { result } = renderHook(() =>
      usePlayerSummary({ eventId: '401234', competitor: mockCompetitor })
    );

    // Synchronous fallback should populate immediately
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
      expect.stringContaining('/api/espn/playersummary?eventId=401234&playerId=12345')
    );
  });

  it('returns cached summary instantly (0ms latency, isFetching: false) on subsequent calls', async () => {
    const mockApiData = {
      profile: { id: '12345', displayName: 'Tiger Woods' },
      rounds: [{ period: 1, displayValue: '70', linescores: [] }],
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockApiData,
    });
    vi.stubGlobal('fetch', fetchMock);

    // First render - populates cache
    const { result, unmount } = renderHook(() =>
      usePlayerSummary({ eventId: '401234', competitor: mockCompetitor })
    );

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    unmount();
    fetchMock.mockClear();

    // Second render with same competitor - should hit cache
    const { result: result2 } = renderHook(() =>
      usePlayerSummary({ eventId: '401234', competitor: mockCompetitor })
    );

    expect(result2.current.summary).not.toBeNull();
    expect(result2.current.isLoading).toBe(false);
    expect(result2.current.isFetching).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
