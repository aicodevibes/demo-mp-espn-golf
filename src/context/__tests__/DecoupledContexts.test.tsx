// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TournamentProvider, useTournament } from '../TournamentContext';
import { ContestProvider, useContest } from '../ContestContext';
import { LiveSyncProvider, useLiveSync } from '../LiveSyncContext';
import { SCOREBOARD_CACHE_KEY } from '@/lib/espn';

// Mock Firebase Firestore methods
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  collection: vi.fn(),
  onSnapshot: vi.fn(() => vi.fn()),
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

vi.mock('@/lib/firebase/config', () => ({
  db: {},
}));

describe('Decoupled Domain Contexts', () => {
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

  it('TournamentProvider resolves events and competitors independently', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TournamentProvider initialEventId="401705663">{children}</TournamentProvider>
    );

    const { result } = renderHook(() => useTournament(), { wrapper });

    expect(result.current).toBeDefined();
    expect(result.current.selectedEventId).toBe('401705663');
    expect(result.current.isHistoricalView).toBe(false);

    await waitFor(
      () => {
        expect(result.current.events).toHaveLength(1);
      },
      { container: document.body }
    );

    act(() => {
      result.current.setEventOverride('401580340');
    });

    expect(result.current.selectedEventId).toBe('401580340');
    expect(result.current.isHistoricalView).toBe(true);
  });

  it('LiveSyncProvider isolates refresh and polling state', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(undefined);
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LiveSyncProvider onFetchLeaderboard={fetchSpy} isLive={true}>
        {children}
      </LiveSyncProvider>
    );

    const { result } = renderHook(() => useLiveSync(), { wrapper });

    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.isStaleData).toBe(false);

    await act(async () => {
      await result.current.refreshLeaderboard({ force: true });
    });

    expect(fetchSpy).toHaveBeenCalledWith(true);
  });

  it('ContestProvider manages participants and contest configurations', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ContestProvider eventId="401705663">{children}</ContestProvider>
    );

    const { result } = renderHook(() => useContest(), { wrapper });

    expect(result.current.participants).toBeDefined();
    expect(result.current.contestConfig).toBeNull();
    expect(result.current.firestorePlayerMap).toBeDefined();
  });
});
