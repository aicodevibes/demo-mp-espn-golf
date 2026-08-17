// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventContextProvider, useEventContext } from '../EventContext';
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

    // Synchronously hydrated from local storage
    expect(result.current.activeEventId).toBe('401580384');
    expect(result.current.selectedEventId).toBe('401580384');
    expect(result.current.events).toHaveLength(1);

    // Immediately fired leaderboard fetch for cached event in parallel
    await waitFor(
      () => {
        expect(fetchSpy).toHaveBeenCalledWith(
          expect.stringContaining('/api/espn/leaderboard?event=401580384')
        );
      },
      { container: document.body }
    );
  });
});
