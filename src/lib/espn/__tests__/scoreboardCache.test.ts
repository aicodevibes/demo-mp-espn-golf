import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  readScoreboardCache,
  writeScoreboardCache,
  readCachedActiveEventId,
  writeCachedActiveEventId,
  SCOREBOARD_CACHE_KEY,
  SCOREBOARD_CACHE_TTL_MS,
} from '../scoreboardCache';
import { ESPNEvent } from '@/types/espn';

describe('scoreboardCache', () => {
  const mockEvents: ESPNEvent[] = [
    {
      id: '401580384',
      name: 'PGA Championship',
      shortName: 'PGA Champ',
      date: '2026-05-14T12:00Z',
      status: {
        type: {
          name: 'STATUS_IN_PROGRESS',
          description: 'In Progress',
          detail: 'Round 3',
          state: 'in',
        },
      },
    },
  ];

  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    const storageMock: Storage = {
      getItem: (k: string) => mockStorage[k] ?? null,
      setItem: (k: string, v: string) => {
        mockStorage[k] = String(v);
      },
      removeItem: (k: string) => {
        delete mockStorage[k];
      },
      clear: () => {
        mockStorage = {};
      },
      length: 0,
      key: () => null,
    };
    const target = globalThis as unknown as { window?: { localStorage: Storage }; localStorage?: Storage };
    target.window = { localStorage: storageMock };
    target.localStorage = storageMock;
    vi.restoreAllMocks();
  });

  it('returns null when cache is empty', () => {
    expect(readScoreboardCache()).toBeNull();
    expect(readCachedActiveEventId()).toBeNull();
  });

  it('writes to localStorage and reads back valid cached events and lastActiveEventId', () => {
    const now = 1000000;
    writeScoreboardCache(mockEvents, '401580384', now);

    const cached = readScoreboardCache(now + 1000);
    expect(cached).not.toBeNull();
    expect(cached?.events).toHaveLength(1);
    expect(cached?.events[0].name).toBe('PGA Championship');
    expect(cached?.lastActiveEventId).toBe('401580384');
    expect(readCachedActiveEventId(now + 1000)).toBe('401580384');
  });

  it('preserves existing lastActiveEventId when updating cache without explicit event ID', () => {
    const now = 1000000;
    writeScoreboardCache(mockEvents, '401580384', now);

    // Write updated events without passing active event ID
    writeScoreboardCache(mockEvents, undefined, now + 1000);

    const cached = readScoreboardCache(now + 2000);
    expect(cached?.lastActiveEventId).toBe('401580384');
  });

  it('allows updating cached active event ID independently', () => {
    const now = 1000000;
    writeScoreboardCache(mockEvents, '401580384', now);

    writeCachedActiveEventId('401705663', now + 500);

    const cached = readScoreboardCache(now + 1000);
    expect(cached?.lastActiveEventId).toBe('401705663');
    expect(cached?.events).toHaveLength(1);
  });

  it('returns null and purges cache when TTL expires (5 minutes)', () => {
    const now = 1000000;
    writeScoreboardCache(mockEvents, '401580384', now);

    // 5 minutes + 1 ms later
    const expiredTime = now + SCOREBOARD_CACHE_TTL_MS + 1;
    const cached = readScoreboardCache(expiredTime);

    expect(cached).toBeNull();
    expect(readCachedActiveEventId(expiredTime)).toBeNull();
    expect(localStorage.getItem(SCOREBOARD_CACHE_KEY)).toBeNull();
  });

  it('handles corrupted JSON in localStorage gracefully', () => {
    localStorage.setItem(SCOREBOARD_CACHE_KEY, 'invalid-json-{');
    expect(readScoreboardCache()).toBeNull();
    expect(readCachedActiveEventId()).toBeNull();
  });
});
