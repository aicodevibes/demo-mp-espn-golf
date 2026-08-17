// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  EventContextProvider,
  useEventContext,
  LIVE_POLL_INTERVAL_MS,
  RELAXED_POLL_INTERVAL_MS,
} from '../EventContext';
import { SCOREBOARD_CACHE_KEY } from '@/lib/espn';

// Mock Firebase Firestore methods
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  collection: vi.fn(),
  onSnapshot: vi.fn(() => {
    return vi.fn();
  }),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  deleteDoc: vi.fn(),
  writeBatch: vi.fn(() => ({
    set: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  })),
  serverTimestamp: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
}));

// Mock Firebase Config
vi.mock('@/lib/firebase/config', () => ({
  db: {},
}));

describe('EventContextProvider Deep Domain Seam', () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    const storageMock: Storage = {
      getItem: (k: string) => mockStorage[k] ?? null,
      setItem: (k: string, v: string) => {
        mockStorage[k] = String(v);
      },
      removeItem: (k: string) => {
        delete mockStorage[k];
      },
      clear: () => {
        mockStorage = {};
      },
      length: 0,
      key: () => null,
    };
    const target = globalThis as unknown as { window?: { localStorage: Storage }; localStorage?: Storage };
    target.window = { localStorage: storageMock };
    target.localStorage = storageMock;

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/espn/scoreboard')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              events: [
                {
                  id: '401705663',
                  name: 'Masters Tournament',
                  status: { type: { state: 'in', description: 'In Progress' } },
                },
              ],
            }),
          });
        }
        if (url.includes('/api/espn/leaderboard')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              events: [
                {
                  id: '401705663',
                  name: 'Masters Tournament',
                  status: { type: { state: 'in', description: 'In Progress' } },
                  competitions: [
                    {
                      id: '401705663',
                      competitors: [
                        {
                          id: '4397140',
                          athlete: { id: '4397140', displayName: 'Scottie Scheffler' },
                          score: '-9',
                          status: { thru: 18, position: { displayName: '1' } },
                        },
                      ],
                    },
                  ],
                },
              ],
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({}),
        });
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports expected poll interval constants (35s live, 5m relaxed)', () => {
    expect(LIVE_POLL_INTERVAL_MS).toBe(35000);
    expect(RELAXED_POLL_INTERVAL_MS).toBe(300000);
  });

  it('provides comprehensive context state and handles viewer event overrides', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <EventContextProvider initialEventId="401705663">{children}</EventContextProvider>
    );

    const { result } = renderHook(() => useEventContext(), { wrapper });

    expect(result.current).toBeDefined();
    expect(result.current.activeEventId).toBe('401705663');
    expect(result.current.selectedEventId).toBe('401705663');
    expect(result.current.isHistoricalView).toBe(false);
    expect(result.current.tournament).toBeDefined();
    expect(result.current.fieldEvaluation).toBeDefined();
    expect(result.current.contestEvaluation).toBeDefined();

    // Verify viewer override switches selected event and flags historical view
    act(() => {
      result.current.setEventOverride('401580340');
    });

    expect(result.current.selectedEventId).toBe('401580340');
    expect(result.current.isHistoricalView).toBe(true);

    // Reset override
    act(() => {
      result.current.setEventOverride('');
    });

    expect(result.current.selectedEventId).toBe('401705663');
    expect(result.current.isHistoricalView).toBe(false);
  });

  it('hydrates initial active event ID from local storage cache for zero-waterfall bootstrapping', async () => {
    const cachedData = {
      timestamp: Date.now(),
      events: [
        {
          id: '401580384',
          name: 'PGA Championship',
          status: { type: { state: 'in', description: 'In Progress' } },
        },
      ],
      lastActiveEventId: '401580384',
    };
    mockStorage[SCOREBOARD_CACHE_KEY] = JSON.stringify(cachedData);

    const fetchSpy = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/espn/leaderboard')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            events: [
              {
                id: '401580384',
                name: 'PGA Championship',
                status: { type: { state: 'in', description: 'In Progress' } },
                competitions: [{ competitors: [] }],
              },
            ],
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ events: cachedData.events }),
      });
    });
    vi.stubGlobal('fetch', fetchSpy);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <EventContextProvider>{children}</EventContextProvider>
    );

    const { result } = renderHook(() => useEventContext(), { wrapper });

    expect(result.current.activeEventId).toBe('401580384');
    expect(result.current.selectedEventId).toBe('401580384');
    expect(result.current.events).toHaveLength(1);

    await waitFor(
      () => {
        expect(fetchSpy).toHaveBeenCalledWith(
          expect.stringContaining('/api/espn/leaderboard?event=401580384')
        );
      },
      { container: document.body }
    );
  });

  it('optimistically retains competitor state and sets error when leaderboard fetch encounters 429 error', async () => {
    let callCount = 0;
    const fetchSpy = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/espn/leaderboard')) {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              events: [
                {
                  id: '401705663',
                  name: 'Masters Tournament',
                  status: { type: { state: 'in', description: 'In Progress' } },
                  competitions: [
                    {
                      id: '401705663',
                      competitors: [
                        {
                          id: '4397140',
                          athlete: { id: '4397140', displayName: 'Scottie Scheffler' },
                          score: '-9',
                          status: { thru: 18, position: { displayName: '1' } },
                        },
                      ],
                    },
                  ],
                },
              ],
            }),
          });
        }
        // Second call fails with 429 Rate Limit
        return Promise.resolve({
          ok: false,
          status: 429,
          json: async () => ({ error: 'Too many requests' }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ events: [] }),
      });
    });
    vi.stubGlobal('fetch', fetchSpy);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <EventContextProvider initialEventId="401705663">{children}</EventContextProvider>
    );

    const { result } = renderHook(() => useEventContext(), { wrapper });

    // Wait for initial successful load
    await waitFor(
      () => {
        expect(result.current.competitors).toHaveLength(1);
        expect(result.current.competitors[0].athlete?.displayName).toBe('Scottie Scheffler');
        expect(result.current.error).toBeNull();
      },
      { container: document.body }
    );

    // Trigger refresh that returns 429
    await act(async () => {
      await result.current.refreshLeaderboard();
    });

    // Verify error is set but competitors state is optimistically retained
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toBe('Too many requests');
    expect(result.current.competitors).toHaveLength(1);
    expect(result.current.competitors[0].athlete?.displayName).toBe('Scottie Scheffler');
  });

  it('triggers immediate fetch when browser tab transitions from hidden to visible', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        events: [
          {
            id: '401705663',
            name: 'Masters Tournament',
            status: { type: { state: 'in', description: 'In Progress' } },
            competitions: [{ competitors: [] }],
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <EventContextProvider initialEventId="401705663">{children}</EventContextProvider>
    );

    renderHook(() => useEventContext(), { wrapper });

    await waitFor(
      () => {
        expect(fetchSpy).toHaveBeenCalled();
      },
      { container: document.body }
    );

    const initialFetchCount = fetchSpy.mock.calls.filter((c: any) =>
      c[0].includes('/api/espn/leaderboard')
    ).length;

    // Simulate tab becoming visible
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(
      () => {
        const afterCount = fetchSpy.mock.calls.filter((c: any) =>
          c[0].includes('/api/espn/leaderboard')
        ).length;
        expect(afterCount).toBeGreaterThan(initialFetchCount);
      },
      { container: document.body }
    );
  });
});
