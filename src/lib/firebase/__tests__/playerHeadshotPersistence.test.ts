import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSet = vi.fn();
const mockCommit = vi.fn().mockResolvedValue(undefined);

vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual<any>('firebase/firestore');
  return {
    ...actual,
    writeBatch: vi.fn(() => ({
      set: mockSet,
      commit: mockCommit,
      delete: vi.fn(),
      update: vi.fn(),
    })),
    doc: vi.fn((_db, _col, id) => ({ id })),
    serverTimestamp: vi.fn(() => 'MOCK_TIMESTAMP'),
  };
});

import { syncPlayersToFirestore } from '../firestore';

describe('Player Headshot Persistence & Sync Protection', () => {
  beforeEach(() => {
    mockSet.mockClear();
    mockCommit.mockClear();
  });

  it('skips writing synthetic competitor payloads to Firestore', async () => {
    const syntheticComps = [
      {
        id: '3470',
        athlete: {
          id: '3470',
          displayName: 'Scottie Scheffler',
          isSynthetic: true,
          headshot: { href: 'https://a.espncdn.com/i/headshots/golf/players/full/3470.png' },
        },
      },
    ];

    await syncPlayersToFirestore(syntheticComps);

    // Should NOT issue any batch set or commit operations for synthetic competitors
    expect(mockSet).not.toHaveBeenCalled();
    expect(mockCommit).not.toHaveBeenCalled();
  });

  it('includes headshotUrl only when authentic non-synthetic ESPN headshot href is provided', async () => {
    const authenticEspnComps = [
      {
        id: '3470',
        athlete: {
          id: '3470',
          displayName: 'Scottie Scheffler',
          headshot: { href: 'https://a.espncdn.com/combiner/i?img=/i/headshots/golf/players/full/3470.png' },
          country: { abbreviation: 'USA' },
        },
      },
    ];

    await syncPlayersToFirestore(authenticEspnComps);

    expect(mockSet).toHaveBeenCalledTimes(1);
    const setArgs = mockSet.mock.calls[0];
    expect(setArgs[1]).toMatchObject({
      id: '3470',
      name: 'Scottie Scheffler',
      headshotUrl: 'https://a.espncdn.com/combiner/i?img=/i/headshots/golf/players/full/3470.png',
      country: 'USA',
    });
    expect(setArgs[2]).toEqual({ merge: true });
    expect(mockCommit).toHaveBeenCalledTimes(1);
  });

  it('does not include headshotUrl in update payload if ESPN competitor headshot href is omitted', async () => {
    const compWithoutHeadshot = [
      {
        id: '1097',
        athlete: {
          id: '1097',
          displayName: 'Rory McIlroy',
          country: { abbreviation: 'NIR' },
        },
      },
    ];

    await syncPlayersToFirestore(compWithoutHeadshot);

    expect(mockSet).toHaveBeenCalledTimes(1);
    const setArgs = mockSet.mock.calls[0];
    // headshotUrl should be undefined in set payload so merge: true leaves existing Firestore headshots intact
    expect(setArgs[1].headshotUrl).toBeUndefined();
  });
});
