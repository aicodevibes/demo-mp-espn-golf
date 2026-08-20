/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminPage from '../page';

// Mock Auth
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'admin@demo-mp.com' },
    loading: false,
    isAdmin: true,
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
  }),
}));

// Mock Firestore hooks & functions
vi.mock('@/lib/firebase/firestore', () => ({
  useActiveConfig: () => ({
    config: { activeEventId: 'event-active-1', activeSeason: 2026 },
    loading: false,
  }),
  useContestConfig: (eventId: string) => ({
    config: {
      espnEventId: eventId,
      eventName: `Contest for ${eventId}`,
      entryFee: 50,
      mainPayouts: [600, 320, 180, 100],
      dayMoneyPool: 75,
      coursePar: 72,
      isFinalized: false,
    },
    loading: false,
  }),
  useParticipants: (eventId: string) => ({
    participants: [],
    loading: false,
  }),
  setActiveEvent: vi.fn(),
  setContestConfig: vi.fn(),
  addParticipantToEvent: vi.fn(),
  removeParticipantFromEvent: vi.fn(),
  setParticipantsForEvent: vi.fn(),
  copyRosterFromEvent: vi.fn(),
  syncPlayersToFirestore: vi.fn(),
  repairAndSeedPlayerDirectory: vi.fn(),
  clearAllPlayersInFirestore: vi.fn(),
  importAuthenticPgaCatalogToFirestore: vi.fn(),
  saveSinglePlayerToFirestore: vi.fn(),
  deleteEventSubtree: vi.fn(),
}));

describe('AdminPage Event Selection', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/api/espn/scoreboard')) {
          return {
            ok: true,
            json: async () => ({
              events: [
                { id: 'event-active-1', name: 'Active Tournament 1', date: '2026-08-15T00:00Z' },
                { id: 'event-new-2', name: 'New Scheduled Tournament 2', date: '2026-08-22T00:00Z' },
              ],
            }),
          };
        }
        if (url.includes('/api/espn/leaderboard')) {
          return {
            ok: true,
            json: async () => ({
              events: [{ competitions: [{ competitors: [] }] }],
            }),
          };
        }
        return { ok: false };
      })
    );
  });

  it('allows user to switch selected event without rebounding back to activeEventId', async () => {
    render(<AdminPage />);

    // Wait for events to load and default to active event
    await waitFor(() => {
      expect(screen.getByRole('option', { name: /Active Tournament 1/i })).toBeInTheDocument();
    });

    // Locate the event select dropdown
    const select = screen.getByRole('combobox', { name: /Select Calendar Event/i }) as HTMLSelectElement;
    expect(select.value).toBe('event-active-1');

    // Change the selection to event-new-2
    fireEvent.change(select, { target: { value: 'event-new-2' } });

    // The select should retain event-new-2 and NOT rebound back to event-active-1
    expect(select.value).toBe('event-new-2');
  });
});
