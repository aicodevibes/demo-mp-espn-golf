// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DashboardPage from '../page';

const mockCompA = {
  id: 'player-a',
  score: '-5',
  scoreDisplay: '-5',
  scoreToPar: -5,
  scoreMeta: { formattedScore: '-5', isUnderPar: true, isOverPar: false },
  thruDisplay: 'F',
  initials: 'GA',
  headshotUrls: [],
  linescores: [
    { period: 1, displayValue: '67', value: 67 },
  ],
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
    id: 'player-a',
    displayName: 'Golfer A',
  },
};

const mockCompB = {
  id: 'player-b',
  score: '-2',
  scoreDisplay: '-2',
  scoreToPar: -2,
  scoreMeta: { formattedScore: '-2', isUnderPar: true, isOverPar: false },
  thruDisplay: '14',
  initials: 'GB',
  headshotUrls: [],
  linescores: [
    { period: 1, displayValue: '70', value: 70 },
  ],
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
    id: 'player-b',
    displayName: 'Golfer B',
  },
};

const mockCompMap = new Map([
  ['player-a', mockCompA],
  ['player-b', mockCompB],
]);

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
    activeEventId: '401705663',
    activeSeason: 2026,
    activeConfig: null,
    contestConfig: null,
    participants: [],
    firestorePlayerMap: {},
    selectedEventId: '401705663',
    isHistoricalView: false,
    setEventOverride: vi.fn(),
    events: [],
    activeEvent: {
      id: '401705663',
      name: 'Masters Tournament',
      status: { type: { state: 'in' } },
    },
    competitors: [mockCompA, mockCompB],
    tournament: {
      id: '401705663',
      name: 'Masters Tournament',
      datesFormatted: 'Apr 9 - 12, 2026',
      statusState: 'in',
      statusDetail: 'Round 1',
      period: 1,
      isCompleted: false,
      isPlayoff: false,
      rawEvent: null,
      competitors: [mockCompA, mockCompB],
      competitorMap: mockCompMap,
    },
    fieldEvaluation: {
      top10Leaders: [mockCompA, mockCompB],
      activeField: [mockCompA, mockCompB],
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
    lastRefreshedAt: new Date(),
    error: null,
    refreshLeaderboard: vi.fn(),
  }),
}));

describe('Dashboard Golfer Selection & Scorecard Updates', () => {
  it('updates scorecard matrix when clicking a different golfer card in the hero grid', async () => {
    render(<DashboardPage />);

    // Initial golfer should be Golfer A
    expect(screen.getByText("Golfer A's Scorecard")).toBeInTheDocument();

    // Click Golfer B card in the grid/top 10
    const golferBCard = screen.getAllByText('Golfer B')[0];
    fireEvent.click(golferBCard);

    // Scorecard title must update to Golfer B
    expect(screen.getByText("Golfer B's Scorecard")).toBeInTheDocument();
  });
});
