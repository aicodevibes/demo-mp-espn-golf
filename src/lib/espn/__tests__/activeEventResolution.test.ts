import { describe, it, expect } from 'vitest';
import { resolveActiveEvent } from '../eventHelpers';
import { ESPNEvent } from '@/types/espn';

describe('resolveActiveEvent', () => {
  const mockScoreboardEvent: ESPNEvent = {
    id: '401580384',
    name: 'PGA Championship',
    shortName: 'PGA Champ',
    date: '2026-05-14T12:00Z',
    endDate: '2026-05-17T23:00Z',
    status: {
      type: {
        name: 'STATUS_IN_PROGRESS',
        description: 'In Progress',
        detail: 'Round 3 - In Progress',
        state: 'in',
      },
    },
  };

  const mockLeaderboardEvent: ESPNEvent = {
    ...mockScoreboardEvent,
    competitions: [
      {
        id: '401580384',
        competitors: [
          {
            id: '3470',
            athlete: { displayName: 'Scottie Scheffler' },
          } as any,
        ],
      },
    ],
  };

  it('returns scoreboard event metadata immediately when leaderboard is still loading', () => {
    const result = resolveActiveEvent([mockScoreboardEvent], null, '401580384');
    expect(result).not.toBeNull();
    expect(result?.name).toBe('PGA Championship');
    expect(result?.status?.type?.state).toBe('in');
    expect(result?.status?.type?.detail).toBe('Round 3 - In Progress');
  });

  it('returns detailed leaderboard event once loaded', () => {
    const result = resolveActiveEvent([mockScoreboardEvent], mockLeaderboardEvent, '401580384');
    expect(result).not.toBeNull();
    expect(result?.competitions?.[0]?.competitors).toHaveLength(1);
  });

  it('defaults to first scoreboard event if activeEventId is not yet set', () => {
    const result = resolveActiveEvent([mockScoreboardEvent], null, undefined);
    expect(result).not.toBeNull();
    expect(result?.id).toBe('401580384');
    expect(result?.name).toBe('PGA Championship');
  });

  it('returns null if no events available and no active object', () => {
    const result = resolveActiveEvent([], null, undefined);
    expect(result).toBeNull();
  });
});
