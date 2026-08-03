import { describe, it, expect } from 'vitest';
import { addTrackedPlayer, removeTrackedPlayer } from '../firestore';

describe('Firestore Tracked Player Helpers', () => {
  it('throws a friendly error if player or playerId is undefined', async () => {
    await expect(addTrackedPlayer({} as any)).rejects.toThrow('Player ID is required');
    await expect(removeTrackedPlayer('')).rejects.toThrow('Player ID is required');
  });
});
