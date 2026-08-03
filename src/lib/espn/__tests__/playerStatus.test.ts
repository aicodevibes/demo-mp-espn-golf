import { describe, it, expect } from 'vitest';
import { getPlayerStatusInfo } from '../eventHelpers';

describe('getPlayerStatusInfo', () => {
  it('correctly identifies CUT players', () => {
    const cutPlayer = {
      status: { position: { displayName: 'CUT' }, type: { name: 'STATUS_CUT' } },
    };
    const info = getPlayerStatusInfo(cutPlayer as any);

    expect(info.isCut).toBe(true);
    expect(info.isInactive).toBe(true);
    expect(info.badgeLabel).toBe('CUT');
  });

  it('correctly identifies Withdrawn (WD) players', () => {
    const wdPlayer = {
      status: { position: { displayName: 'WD' }, type: { name: 'STATUS_WITHDRAWN' } },
    };
    const info = getPlayerStatusInfo(wdPlayer as any);

    expect(info.isWD).toBe(true);
    expect(info.isInactive).toBe(true);
    expect(info.badgeLabel).toBe('WD');
  });

  it('returns non-inactive state for active players', () => {
    const activePlayer = {
      status: { position: { displayName: 'T14' }, type: { name: 'STATUS_IN_PROGRESS' } },
    };
    const info = getPlayerStatusInfo(activePlayer as any);

    expect(info.isCut).toBe(false);
    expect(info.isWD).toBe(false);
    expect(info.isInactive).toBe(false);
    expect(info.badgeLabel).toBe('');
  });
});
