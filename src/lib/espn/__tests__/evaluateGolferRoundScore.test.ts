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

  it('handles DQ player with no round strokes as inactive DQ', () => {
    const comp: ESPNCompetitor = {
      id: '5',
      score: 'DQ',
      status: { position: { displayName: 'DQ' }, type: { name: 'STATUS_DQ' } },
      linescores: [
        { period: 1, value: 71 },
      ],
      athlete: { id: '5', displayName: 'DQ Player' },
    };

    const res = evaluateGolferRoundScore(comp, 2);
    expect(res.roundStrokes).toBeNull();
    expect(res.scoreToPar).toBeNull();
    expect(res.formattedScore).toBe('DQ');
    expect(res.isInactive).toBe(true);
    expect(res.statusDetail).toBe('Disqualified');
  });

  it('respects eventStatus and hasCut when evaluating Round 3 score for 2-round players', () => {
    const comp: ESPNCompetitor = {
      id: '6',
      score: '+2',
      status: { period: 4, position: { displayName: 'T50' }, type: { name: 'STATUS_FINAL' } },
      linescores: [
        { period: 1, value: 73 },
        { period: 2, value: 73 },
      ],
      athlete: { id: '6', displayName: 'Two Round Player' },
    };
    const postEventStatus = { period: 4, type: { state: 'post', completed: true } };

    const cutRes = evaluateGolferRoundScore(comp, 3, 72, undefined, postEventStatus, true);
    expect(cutRes.formattedScore).toBe('CUT');
    expect(cutRes.isInactive).toBe(true);

    const noCutRes = evaluateGolferRoundScore(comp, 3, 72, undefined, postEventStatus, false);
    expect(noCutRes.formattedScore).toBe('-');
    expect(noCutRes.isInactive).toBe(false);
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

  it('enforces strict par precedence: Admin coursePar > ESPN eventCourses/holes > displayValue > 72 fallback', () => {
    const par71Holes = [4, 4, 3, 5, 4, 4, 3, 4, 4, 4, 4, 3, 5, 4, 4, 3, 4, 5]; // sum = 71
    const multiCourses = [
      { id: 'north', name: 'North', shotsToPar: 72 },
      { id: 'south', name: 'South', shotsToPar: 70 },
    ];

    // 1. Admin coursePar override (70) beats ESPN courses (72), eventCourseHoles (71), and displayValue (-4)
    const compWithWrongDisplay = {
      id: '10',
      status: { period: 1, thru: 18, type: { state: 'post', completed: true } },
      linescores: [{ period: 1, value: 68, displayValue: '-4', courseId: 'north' }],
    } as ESPNCompetitor;

    const adminOverrideRes = evaluateGolferRoundScore(
      compWithWrongDisplay,
      1,
      70,
      par71Holes,
      { eventCourses: multiCourses }
    );
    expect(adminOverrideRes.scoreToPar).toBe(-2); // 68 - 70
    expect(adminOverrideRes.formattedScore).toBe('-2');

    // 2. Without Admin coursePar, matched ESPN eventCourses courseId ('south' -> 70) beats displayValue (-4)
    const southRoundComp = {
      id: '11',
      status: { period: 1, thru: 18, type: { state: 'post', completed: true } },
      linescores: [{ period: 1, value: 68, displayValue: '-4', courseId: 'south' }],
    } as ESPNCompetitor;

    const espnCourseRes = evaluateGolferRoundScore(
      southRoundComp,
      1,
      null,
      undefined,
      { eventCourses: multiCourses }
    );
    expect(espnCourseRes.scoreToPar).toBe(-2); // 68 - 70
    expect(espnCourseRes.formattedScore).toBe('-2');

    // 3. Without Admin coursePar or ESPN courses/holes, direct displayValue (-2 for 68 on Par 70) beats 72 fallback
    const directDisplayComp = {
      id: '12',
      linescores: [{ period: 1, value: 68, displayValue: '-2' }],
    } as ESPNCompetitor;

    const directDisplayRes = evaluateGolferRoundScore(directDisplayComp, 1, null);
    expect(directDisplayRes.scoreToPar).toBe(-2);
    expect(directDisplayRes.formattedScore).toBe('-2');

    // 4. Without Admin coursePar, ESPN courses, or displayValue, falls back to 72 as last resort
    const fallbackComp = {
      id: '13',
      linescores: [{ period: 1, value: 68 }],
    } as ESPNCompetitor;

    const fallbackRes = evaluateGolferRoundScore(fallbackComp, 1, null);
    expect(fallbackRes.scoreToPar).toBe(-4); // 68 - 72
    expect(fallbackRes.formattedScore).toBe('-4');
  });
});
