// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TournamentProvider, useTournament } from '../TournamentContext';
import { syncPlayersToFirestore } from '@/lib/firebase/firestore';

vi.mock('@/lib/firebase/firestore', () => ({
  syncPlayersToFirestore: vi.fn(),
}));

describe('TournamentContext public polling isolation', () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    vi.clearAllMocks();
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
    const target = globalThis as unknown as {
      window?: { localStorage: Storage };
      localStorage?: Storage;
    };
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

  it('fetchLeaderboard updates competitors without calling syncPlayersToFirestore', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TournamentProvider initialEventId="401705663">{children}</TournamentProvider>
    );

    const { result } = renderHook(() => useTournament(), { wrapper });

    await waitFor(
      () => {
        expect(result.current.competitors).toHaveLength(1);
      },
      { container: document.body }
    );

    let refreshed = false;
    await act(async () => {
      refreshed = await result.current.fetchLeaderboard(true);
    });

    expect(refreshed).toBe(true);
    expect(syncPlayersToFirestore).not.toHaveBeenCalled();
  });

  it('aborts prior leaderboard fetch and discards stale Event A response after switching to Event B', async () => {
    let resolveEventA!: (value: unknown) => void;
    let eventASignal: AbortSignal | null | undefined;
    const abortSpy = vi.fn();

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/api/espn/scoreboard')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              events: [
                { id: 'event-A', name: 'Tournament A', status: { type: { state: 'in' } } },
                { id: 'event-B', name: 'Tournament B', status: { type: { state: 'post' } } },
              ],
            }),
          });
        }

        if (url.includes('/api/espn/leaderboard?event=event-A')) {
          eventASignal = options?.signal;
          eventASignal?.addEventListener('abort', abortSpy);
          return new Promise((resolve) => {
            resolveEventA = resolve;
          });
        }

        if (url.includes('/api/espn/leaderboard?event=event-B')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              events: [
                {
                  id: 'event-B',
                  name: 'Tournament B',
                  status: { type: { state: 'post', completed: true } },
                  competitions: [
                    {
                      id: 'event-B',
                      competitors: [
                        {
                          id: '3470',
                          athlete: { id: '3470', displayName: 'Rory McIlroy' },
                          score: '-12',
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

        return Promise.resolve({ ok: true, json: async () => ({}) });
      })
    );

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TournamentProvider initialEventId="event-A">{children}</TournamentProvider>
    );

    const { result } = renderHook(() => useTournament(), { wrapper });

    await waitFor(
      () => {
        expect(resolveEventA).toBeDefined();
      },
      { container: document.body }
    );

    // Switch rapidly from event-A to event-B while event-A is still pending
    act(() => {
      result.current.setEventOverride('event-B');
    });

    expect(eventASignal).toBeDefined();
    expect(abortSpy).toHaveBeenCalledTimes(1);

    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
        expect(result.current.competitors).toHaveLength(1);
        expect(result.current.competitors[0].athlete?.displayName).toBe('Rory McIlroy');
        expect(result.current.activeEvent?.id).toBe('event-B');
      },
      { container: document.body }
    );

    // Now the stale event-A response resolves late (simulating a mock/network ignoring abort)
    await act(async () => {
      resolveEventA({
        ok: true,
        json: async () => ({
          events: [
            {
              id: 'event-A',
              name: 'Tournament A',
              status: { type: { state: 'in' } },
              competitions: [
                {
                  id: 'event-A',
                  competitors: [
                    {
                      id: '9478',
                      athlete: { id: '9478', displayName: 'Scottie Scheffler' },
                      score: '-5',
                      status: { thru: 9, position: { displayName: '1' } },
                    },
                  ],
                },
              ],
            },
          ],
        }),
      });
      await Promise.resolve();
    });

    // Event B state must remain intact and never be overwritten by Event A
    expect(result.current.selectedEventId).toBe('event-B');
    expect(result.current.activeEvent?.id).toBe('event-B');
    expect(result.current.competitors).toHaveLength(1);
    expect(result.current.competitors[0].athlete?.displayName).toBe('Rory McIlroy');
    expect(result.current.error).toBeNull();
  });
});
