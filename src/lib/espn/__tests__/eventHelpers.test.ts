import { describe, it, expect } from 'vitest';
import { formatEventDates, getWinnerStatus, getTop10WithTies, formatScoreDisplay, getScoreMeta } from '../eventHelpers';

describe('formatEventDates', () => {
  it('formats start and end dates into human readable range', () => {
    const formatted = formatEventDates('2026-07-30T04:00Z', '2026-08-02T04:00Z');
    expect(formatted).toBe('Jul 30 – Aug 2, 2026');
  });

  it('handles empty dates gracefully', () => {
    expect(formatEventDates('', '')).toBe('');
  });
});

describe('formatScoreDisplay & getScoreMeta', () => {
  it('normalizes string, number, and object score inputs correctly', () => {
    expect(formatScoreDisplay('-7')).toBe('-7');
    expect(formatScoreDisplay('+3')).toBe('+3');
    expect(formatScoreDisplay(0)).toBe('E');
    expect(formatScoreDisplay(-4)).toBe('-4');
    expect(formatScoreDisplay(2)).toBe('+2');
    expect(formatScoreDisplay({ displayValue: '-5', value: 135 })).toBe('-5');
    expect(formatScoreDisplay({ displayValue: '0', value: 140 })).toBe('E');
    expect(formatScoreDisplay({ displayValue: 'EVEN', value: 140 })).toBe('E');
    expect(formatScoreDisplay(null)).toBe('E');
  });

  it('formats unstarted pre-event scores as "-" and active event even scores as "E"', () => {
    const preEventStatus = { type: { state: 'pre', completed: false } };
    const activeEventStatus = { type: { state: 'in', completed: false } };

    expect(formatScoreDisplay(null, preEventStatus)).toBe('-');
    expect(formatScoreDisplay('E', preEventStatus)).toBe('-');
    expect(formatScoreDisplay(0, preEventStatus)).toBe('-');

    expect(formatScoreDisplay(null, activeEventStatus)).toBe('E');
    expect(formatScoreDisplay('E', activeEventStatus)).toBe('E');
    expect(formatScoreDisplay(0, activeEventStatus)).toBe('E');
    expect(formatScoreDisplay('-3', preEventStatus)).toBe('-3');
  });

  it('returns expected ScoreMeta par flags', () => {
    const under = getScoreMeta('-5');
    expect(under.formattedScore).toBe('-5');
    expect(under.isUnderPar).toBe(true);
    expect(under.isOverPar).toBe(false);

    const over = getScoreMeta('+2');
    expect(over.formattedScore).toBe('+2');
    expect(over.isUnderPar).toBe(false);
    expect(over.isOverPar).toBe(true);

    const even = getScoreMeta(0);
    expect(even.formattedScore).toBe('E');
    expect(even.isUnderPar).toBe(false);
    expect(even.isOverPar).toBe(false);
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

describe('getTop10WithTies', () => {
  it('returns all competitors when list has 10 or fewer items', () => {
    const list = Array.from({ length: 8 }, (_, i) => ({ id: `p-${i}`, score: `-${i}` })) as any[];
    expect(getTop10WithTies(list)).toHaveLength(8);
  });

  it('includes competitors tied for 10th place beyond index 9', () => {
    const list = [
      ...Array.from({ length: 9 }, (_, i) => ({ id: `p-${i}`, score: `-${20 - i}`, status: { position: { displayName: `${i + 1}` } } })),
      { id: 'p-9', score: '-10', status: { position: { displayName: 'T10' } } },
      { id: 'p-10', score: '-10', status: { position: { displayName: 'T10' } } },
      { id: 'p-11', score: '-10', status: { position: { displayName: 'T10' } } },
      { id: 'p-12', score: '-9', status: { position: { displayName: 'T13' } } },
    ] as any[];

    const result = getTop10WithTies(list);
    expect(result).toHaveLength(12);
    expect(result.map((c) => c.id)).toContain('p-10');
    expect(result.map((c) => c.id)).toContain('p-11');
    expect(result.map((c) => c.id)).not.toContain('p-12');
  });
});
