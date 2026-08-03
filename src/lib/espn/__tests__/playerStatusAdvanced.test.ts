import { describe, it, expect } from 'vitest';
import { getPlayerStatusInfo } from '../eventHelpers';

describe('Advanced CUT / WD Detection', () => {
  it('identifies CUT players by linescore count in round 3/4 even if position displayName is pos rank', () => {
    const benSilvermanMock = {
      id: '5360550',
      status: { period: 4, position: { displayName: 'T82' }, type: { name: 'STATUS_FINAL', detail: 'Final' } },
      linescores: [{ value: 71 }, { value: 72 }], // Only 2 rounds played in a 4-round event
      athlete: { displayName: 'Ben Silverman' },
    };

    const eventStatus = { period: 4, type: { state: 'post', completed: true, detail: 'Final' } };

    const info = getPlayerStatusInfo(benSilvermanMock as any, eventStatus);
    expect(info.isCut).toBe(true);
    expect(info.isInactive).toBe(true);
    expect(info.badgeLabel).toBe('CUT');
  });

  it('identifies MC position displayName as CUT', () => {
    const mcPlayer = {
      status: { position: { displayName: 'MC' }, displayValue: 'MC' },
      linescores: [{ value: 73 }, { value: 74 }],
    };

    const info = getPlayerStatusInfo(mcPlayer as any);
    expect(info.isCut).toBe(true);
    expect(info.badgeLabel).toBe('CUT');
  });

  it('identifies WD shortDetail or description as WD', () => {
    const wdPlayer = {
      status: { type: { shortDetail: 'WD', description: 'Withdrawn' } },
    };

    const info = getPlayerStatusInfo(wdPlayer as any);
    expect(info.isWD).toBe(true);
    expect(info.badgeLabel).toBe('WD');
  });
});
