// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventContextProvider, useEventContext } from '../EventContext';

// Mock Firebase Firestore methods
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  collection: vi.fn(),
  onSnapshot: vi.fn((ref, callback) => {
    // Return empty unsubscribe function
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
  beforeEach(() => {
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
});
