import { describe, it, expect } from 'vitest';
import { ESPNCompetitor } from '@/types/espn';
import { evaluateGolferRoundScore } from '../eventHelpers';

describe('evaluateGolferRoundScore', () => {
  it('evaluates relative score from linescore displayValue directly', () => {
    const comp: ESPNCompetitor = {
      id: '1',
      score: '-2',
      linescores: [
        { period: 1, value: 70, displayValue: '-2' },
      ],
    } as ESPNCompetitor;

    const res = evaluateGolferRoundScore(comp, 1);
    expect(res.roundStrokes).toBe(70);
    expect(res.scoreToPar).toBe(-2);
    expect(res.formattedScore).toBe('-2');
    expect(res.isUnderPar).toBe(true);
    expect(res.isOverPar).toBe(false);
    expect(res.isEven).toBe(false);
    expect(res.isInactive).toBe(false);
  });

  it('handles WD player with no round strokes as inactive WD', () => {
    const comp: ESPNCompetitor = {
      id: '2',
      score: 'WD',
      status: { position: { displayName: 'WD' }, type: { name: 'STATUS_WITHDRAWN' } },
      linescores: [],
    } as any;

    const res = evaluateGolferRoundScore(comp, 1);
    expect(res.roundStrokes).toBeNull();
    expect(res.scoreToPar).toBeNull();
    expect(res.formattedScore).toBe('WD');
    expect(res.isInactive).toBe(true);
    expect(res.statusDetail).toBe('Withdrawn');
  });

  it('handles CUT player with no round 3 strokes as inactive CUT', () => {
    const comp: ESPNCompetitor = {
      id: '3',
      score: '+4',
      status: { position: { displayName: 'CUT' }, type: { name: 'STATUS_CUT' } },
      linescores: [
        { period: 1, value: 74 },
        { period: 2, value: 72 },
      ],
    } as any;

    const res = evaluateGolferRoundScore(comp, 3);
    expect(res.roundStrokes).toBeNull();
    expect(res.scoreToPar).toBeNull();
    expect(res.formattedScore).toBe('CUT');
    expect(res.isInactive).toBe(true);
    expect(res.statusDetail).toBe('Missed Cut');
  });

  it('uses 18-hole event course holes array sum to compute exact course par', () => {
    const comp: ESPNCompetitor = {
      id: '4',
      score: '-1',
      linescores: [{ period: 1, value: 70 }],
    } as ESPNCompetitor;

    // Course with par 71
    const courseHoles = [4, 4, 3, 5, 4, 4, 3, 4, 4, 4, 4, 3, 5, 4, 4, 3, 4, 5];
    const res = evaluateGolferRoundScore(comp, 1, null, courseHoles);

    expect(res.roundStrokes).toBe(70);
    expect(res.scoreToPar).toBe(-1); // 70 - 71 = -1
    expect(res.formattedScore).toBe('-1');
  });
});
