import { describe, it, expect } from 'vitest';
import { formatEventDates, getWinnerStatus } from '../eventHelpers';

describe('formatEventDates', () => {
  it('formats start and end dates into human readable range', () => {
    const formatted = formatEventDates('2026-07-30T04:00Z', '2026-08-02T04:00Z');
    expect(formatted).toBe('Jul 30 – Aug 2, 2026');
  });

  it('handles empty dates gracefully', () => {
    expect(formatEventDates('', '')).toBe('');
  });
});

describe('getWinnerStatus', () => {
  const mockRegulationCompetitors = [
    {
      id: '3470',
      order: 1,
      score: '-18',
      status: { position: { displayName: '1' } },
      athlete: { displayName: 'Scottie Scheffler' },
    },
    {
      id: '1810',
      order: 2,
      score: '-17',
      status: { position: { displayName: '2' } },
      athlete: { displayName: 'Rory McIlroy' },
    },
  ];

  const mockPlayoffCompetitors = [
    {
      id: '3470',
      order: 1,
      score: '-18',
      status: { position: { displayName: '1' } },
      athlete: { displayName: 'Scottie Scheffler' },
    },
    {
      id: '1810',
      order: 2,
      score: '-18',
      status: { position: { displayName: 'P2' } },
      athlete: { displayName: 'Rory McIlroy' },
    },
  ];

  it('identifies regulation winner when event is Final', () => {
    const status = { type: { state: 'post', completed: true, detail: 'Final' } };
    const winnerInfo = getWinnerStatus(mockRegulationCompetitors[0] as any, status, mockRegulationCompetitors as any);

    expect(winnerInfo.isWinner).toBe(true);
    expect(winnerInfo.isPlayoff).toBe(false);
    expect(winnerInfo.badgeLabel).toBe('🏆 Champion');
  });

  it('identifies playoff winner and runner-up when playoff detail is present', () => {
    const status = { type: { state: 'post', completed: true, detail: 'Final - Won playoff' } };
    
    const winnerInfo = getWinnerStatus(mockPlayoffCompetitors[0] as any, status, mockPlayoffCompetitors as any);
    expect(winnerInfo.isWinner).toBe(true);
    expect(winnerInfo.isPlayoff).toBe(true);
    expect(winnerInfo.badgeLabel).toBe('🏆 Champion (Playoff)');

    const runnerUpInfo = getWinnerStatus(mockPlayoffCompetitors[1] as any, status, mockPlayoffCompetitors as any);
    expect(runnerUpInfo.isWinner).toBe(false);
    expect(runnerUpInfo.isPlayoff).toBe(true);
    expect(runnerUpInfo.badgeLabel).toBe('2nd (Playoff)');
  });
});
