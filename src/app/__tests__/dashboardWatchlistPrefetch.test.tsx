// @vitest-environment jsdom
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import DashboardPage from '../page';
import { clearPlayerSummaryCache } from '@/hooks/usePlayerSummary';

function makeCompetitor(id: string, name: string, score: string) {
  return {
    id,
    score,
    scoreDisplay: score,
    scoreToPar: Number(score) || 0,
    scoreMeta: { formattedScore: score, isUnderPar: score.startsWith('-'), isOverPar: score.startsWith('+') },
    thruDisplay: 'F',
    initials: name.slice(0, 2).toUpperCase(),
    headshotUrls: [],
    linescores: [{ period: 1, displayValue: '68', value: 68 }],
    statusInfo: {
      isCut: false,
      isWD: false,
      isDQ: false,
      isInactive: false,
      isWinner: false,
      isPlayoff: false,
      badgeLabel: '',
      statusBadge: '',
    },
    athlete: {
      id,
      displayName: name,
    },
  };
}

const mockWatchlist = [
  makeCompetitor('p1', 'Golfer One', '-8'),
  makeCompetitor('p2', 'Golfer Two', '-7'),
  makeCompetitor('p3', 'Golfer Three', '-6'),
  makeCompetitor('p4', 'Golfer Four', '-5'),
  makeCompetitor('p5', 'Golfer Five', '-4'),
  makeCompetitor('p6', 'Golfer Six', '-3'),
];

const mockCompMap = new Map(mockWatchlist.map((c) => [c.id, c]));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    isAdmin: false,
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
  }),
}));

vi.mock('@/context/EventContext', () => ({
  useEventContext: () => ({
    activeEventId: '401580340',
    activeSeason: 2024,
    activeConfig: null,
    contestConfig: null,
    participants: [
      {
        id: 'part-1',
        name: 'Jim',
        draftedPlayerIds: mockWatchlist.map((c) => c.id),
        color: '#2563eb',
        payouts: {},
        totalPayout: 0,
      },
    ],
    firestorePlayerMap: {},
    selectedEventId: '401580340',
    isHistoricalView: true,
    setEventOverride: vi.fn(),
    events: [],
    activeEvent: {
      id: '401580340',
      name: '2024 Masters Tournament',
      date: '2024-04-11T04:00:00Z',
      season: { year: 2024 },
      status: { type: { state: 'post', completed: true } },
    },
    competitors: mockWatchlist,
    tournament: {
      id: '401580340',
      name: '2024 Masters Tournament',
      datesFormatted: 'Apr 11 – 14, 2024',
      statusState: 'post',
      statusDetail: 'Final',
      period: 4,
      isCompleted: true,
      isPlayoff: false,
      rawEvent: null,
      competitors: mockWatchlist,
      competitorMap: mockCompMap,
    },
    fieldEvaluation: {
      top10Leaders: mockWatchlist,
      activeField: mockWatchlist,
      cutField: [],
      draftedGolfers: [],
      rankDisplayMap: new Map(),
      playerDraftedByMap: new Map(),
    },
    contestEvaluation: {
      standings: [],
      dayMoneyWinners: [],
      dayMoneyResults: [],
      greedyStandings: [],
      wagerLedger: [],
    },
    loading: false,
    isRefreshing: false,
    lastRefreshedAt: new Date('2024-04-14T22:00:00Z'),
    manualRefreshNonce: 0,
    error: null,
    refreshLeaderboard: vi.fn(),
  }),
}));

describe('Dashboard Watchlist Scorecard Pre-fetch & Historical Season Propagation', () => {
  beforeEach(() => {
    clearPlayerSummaryCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('propagates historical event season and pre-fetches only the first 4 Hero Watchlist golfers without duplicating the selected golfer', async () => {
    const requestedUrls: string[] = [];
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      requestedUrls.push(String(url));
      const playerMatch = /playerId=([^&]+)/.exec(String(url));
      const playerId = playerMatch?.[1] ?? 'p1';
      return Promise.resolve({
        ok: true,
        json: async () => ({
          profile: { id: playerId, displayName: `Golfer ${playerId}` },
          rounds: [{ period: 1, displayValue: '68', linescores: [] }],
        }),
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(requestedUrls.length).toBe(4);
    });

    const requestedPlayerIds = requestedUrls.map((u) => /playerId=([^&]+)/.exec(u)?.[1]);
    expect(new Set(requestedPlayerIds)).toEqual(new Set(['p1', 'p2', 'p3', 'p4']));
    expect(requestedPlayerIds).not.toContain('p5');
    expect(requestedPlayerIds).not.toContain('p6');
    for (const url of requestedUrls) {
      expect(url).toContain('eventId=401580340');
      expect(url).toContain('season=2024');
    }
  });
});
