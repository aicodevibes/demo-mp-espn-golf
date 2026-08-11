import { describe, it, expect } from 'vitest';
import { DEFAULT_PLAYER_DIRECTORY_MAP } from '@/lib/espn';

describe('Player Directory Corruption Repair & Protection', () => {
  it('protects against legacy corrupt records where document ID conflicts with canonical golfer names', () => {
    // Legacy corrupt record from prior sync
    const legacyCorruptFirestoreData: Record<string, { id: string; name: string; headshotUrl?: string }> = {
      '3470': { id: '3470', name: 'Scottie Scheffler', headshotUrl: 'https://a.espncdn.com/i/headshots/golf/players/full/3470.png' },
      '9478': { id: '9478', name: 'Scottie Scheffler', headshotUrl: 'https://a.espncdn.com/i/headshots/golf/players/full/9478.png' },
    };

    const resolvedMap: Record<string, { id: string; name: string; headshotUrl?: string }> = {
      ...DEFAULT_PLAYER_DIRECTORY_MAP,
    };

    Object.entries(legacyCorruptFirestoreData).forEach(([docId, data]) => {
      const canonical = DEFAULT_PLAYER_DIRECTORY_MAP[docId];
      // Ignore legacy corrupt entry where name conflicts with canonical mapping
      if (canonical && data.name !== canonical.name) {
        return;
      }
      resolvedMap[docId] = data;
    });

    // ID 3470 must remain Rory McIlroy (NOT Scottie Scheffler)
    expect(resolvedMap['3470'].name).toBe('Rory McIlroy');
    expect(resolvedMap['3470'].name).not.toBe('Scottie Scheffler');

    // ID 9478 must remain Scottie Scheffler
    expect(resolvedMap['9478'].name).toBe('Scottie Scheffler');
    expect(resolvedMap['9478'].headshotUrl).toBe('https://a.espncdn.com/i/headshots/golf/players/full/9478.png');
  });
});
