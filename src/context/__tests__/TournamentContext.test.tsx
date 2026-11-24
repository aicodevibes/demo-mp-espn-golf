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
});
