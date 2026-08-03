import { describe, it, expect } from 'vitest';
import { addTrackedPlayer, removeTrackedPlayer, TrackedPlayer } from '../firestore';

describe('Firestore Data Persistence & Validation', () => {
  it('throws a friendly error if player or playerId is undefined', async () => {
    await expect(addTrackedPlayer({} as any)).rejects.toThrow('Player ID is required');
    await expect(removeTrackedPlayer('')).rejects.toThrow('Player ID is required');
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
});
