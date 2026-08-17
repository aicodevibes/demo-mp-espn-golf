// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DashboardPage from '../page';

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
    participants: [
      {
        id: 'p1',
        name: 'Jim',
        draftedPlayerIds: ['4604625'],
        color: '#ff0000',
        payouts: {},
        totalPayout: 0,
      },
    ],
    firestorePlayerMap: {},
    selectedEventId: '401705663',
    isHistoricalView: false,
    setEventOverride: vi.fn(),
    events: [],
    activeEvent: {
      id: '401705663',
      name: 'Masters Tournament',
    },
    competitors: [],
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
      competitors: [],
      competitorMap: new Map(),
    },
    fieldEvaluation: {
      top10Leaders: [],
      activeField: [],
      cutField: [],
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

describe('Dashboard Accessibility Semantics', () => {
  it('renders participant selector dropdown with explicit id, name, and aria-label', () => {
    render(<DashboardPage />);

    const select = screen.getByRole('combobox', { name: /select pool participant/i });
    expect(select).toBeInTheDocument();
    expect(select).toHaveAttribute('id', 'participant-selector');
    expect(select).toHaveAttribute('name', 'selectedParticipant');
    expect(select).toHaveAttribute('aria-label', 'Select pool participant');
  });
});
