import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  readScoreboardCache,
  writeScoreboardCache,
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
    const storageMock = {
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
    (global as any).window = { localStorage: storageMock };
    (global as any).localStorage = storageMock;
    vi.restoreAllMocks();
  });

  it('returns null when cache is empty', () => {
    expect(readScoreboardCache()).toBeNull();
  });

  it('writes to localStorage and reads back valid cached events', () => {
    const now = 1000000;
    writeScoreboardCache(mockEvents, now);

    const cached = readScoreboardCache(now + 1000);
    expect(cached).not.toBeNull();
    expect(cached).toHaveLength(1);
    expect(cached?.[0].name).toBe('PGA Championship');
  });

  it('returns null and purges cache when TTL expires (5 minutes)', () => {
    const now = 1000000;
    writeScoreboardCache(mockEvents, now);

    // 5 minutes + 1 ms later
    const expiredTime = now + SCOREBOARD_CACHE_TTL_MS + 1;
    const cached = readScoreboardCache(expiredTime);

    expect(cached).toBeNull();
    expect(localStorage.getItem(SCOREBOARD_CACHE_KEY)).toBeNull();
  });

  it('handles corrupted JSON in localStorage gracefully', () => {
    localStorage.setItem(SCOREBOARD_CACHE_KEY, 'invalid-json-{');
    expect(readScoreboardCache()).toBeNull();
  });
});
