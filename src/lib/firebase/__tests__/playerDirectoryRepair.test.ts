import { describe, it, expect } from 'vitest';
import { DEFAULT_PLAYER_DIRECTORY_MAP } from '@/lib/espn';

describe('Player Directory Corruption Repair & Protection', () => {
  it('protects against legacy corrupt records where document ID conflicts with canonical golfer names', () => {
    // Legacy corrupt record from prior sync
    const legacyCorruptFirestoreData: Record<string, { id: string; name: string; headshotUrl?: string }> = {
      '3471': { id: '3471', name: 'Rory McIlroy', headshotUrl: 'https://a.espncdn.com/i/headshots/golf/players/full/3471.png' },
      '1097': { id: '1097', name: 'Rory McIlroy', headshotUrl: 'https://a.espncdn.com/i/headshots/golf/players/full/1097.png' },
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

    // ID 3471 must remain Keegan Bradley (NOT Rory McIlroy)
    expect(resolvedMap['3471'].name).toBe('Keegan Bradley');
    expect(resolvedMap['3471'].name).not.toBe('Rory McIlroy');

    // ID 1097 must remain Rory McIlroy
    expect(resolvedMap['1097'].name).toBe('Rory McIlroy');
    expect(resolvedMap['1097'].headshotUrl).toBe('https://a.espncdn.com/i/headshots/golf/players/full/1097.png');
  });
});
