import { describe, it, expect } from 'vitest';
import { addTrackedPlayer, removeTrackedPlayer, syncPlayersToFirestore, TrackedPlayer, resolveParticipantsFromSnapshot, resetParticipantRoster } from '../firestore';

describe('Firestore Data Persistence & Validation', () => {
  it('throws a friendly error if player or playerId is undefined', async () => {
    await expect(addTrackedPlayer({} as any)).rejects.toThrow('Player ID is required');
    await expect(removeTrackedPlayer('')).rejects.toThrow('Player ID is required');
  });

  it('handles empty competitor array gracefully in syncPlayersToFirestore', async () => {
    await expect(syncPlayersToFirestore([])).resolves.not.toThrow();
  });

  it('constructs a valid TrackedPlayer payload for Firestore persistence', () => {
    const samplePlayer: TrackedPlayer = {
      playerId: '3470',
      name: 'Scottie Scheffler',
      headshotUrl: 'https://a.espncdn.com/i/headshots/golf/players/full/3470.png',
      country: 'USA',
      displayOrder: 1,
    };

    expect(samplePlayer.playerId).toBe('3470');
    expect(samplePlayer.name).toBe('Scottie Scheffler');
  });

  describe('resolveParticipantsFromSnapshot', () => {
    it('returns document list when docs array is non-empty regardless of eventId', () => {
      const sampleParticipant = { id: 'p1', name: 'Alice', draftedPlayerIds: [] };
      expect(resolveParticipantsFromSnapshot([sampleParticipant], '401580354')).toEqual([sampleParticipant]);
      expect(resolveParticipantsFromSnapshot([sampleParticipant], null)).toEqual([sampleParticipant]);
    });

    it('returns empty array [] when docs array is empty and eventId is explicitly provided (including empty string)', () => {
      expect(resolveParticipantsFromSnapshot([], '401580354')).toEqual([]);
      expect(resolveParticipantsFromSnapshot([], 'new_event_123')).toEqual([]);
      expect(resolveParticipantsFromSnapshot([], '')).toEqual([]);
    });

    it('returns DEFAULT_CONTEST_PARTICIPANTS seed data when docs array is empty and eventId is null or undefined', () => {
      const resultNull = resolveParticipantsFromSnapshot([], null);
      const resultUndefined = resolveParticipantsFromSnapshot([], undefined);
      expect(resultNull.length).toBeGreaterThan(0);
      expect(resultNull).toEqual(resultUndefined);
    });
  });

  describe('resetParticipantRoster', () => {
    it('copies participant names and IDs while clearing drafted golfers, greedy pick, and payments', () => {
      const sourceList = [
        {
          id: 'p1',
          name: 'John Doe',
          draftedPlayerIds: ['3470', '1234'],
          isGreedyParticipant: true,
          greedyPlayerId: '3470',
          hasPaidEntry: true,
          hasPaidGreedy: true,
        },
      ];

      const resetResult = resetParticipantRoster(sourceList);
      expect(resetResult).toHaveLength(1);
      expect(resetResult[0].id).toBe('p1');
      expect(resetResult[0].name).toBe('John Doe');
      expect(resetResult[0].draftedPlayerIds).toEqual([]);
      expect(resetResult[0].isGreedyParticipant).toBe(false);
      expect(resetResult[0].greedyPlayerId).toBeNull();
      expect(resetResult[0].hasPaidEntry).toBe(false);

      expect(resetResult[0].hasPaidGreedy).toBe(false);
    });
  });
});



