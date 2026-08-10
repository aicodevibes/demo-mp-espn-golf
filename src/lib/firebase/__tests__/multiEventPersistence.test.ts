import { describe, it, expect, vi } from 'vitest';
import { resolveParticipantsFromSnapshot, resetParticipantRoster, copyRosterFromEvent } from '../firestore';
import { evaluateContest } from '../../contestEngine';
import { resolveActiveEvent } from '../../espn';
import { Participant, ContestConfig } from '@/types/contest';
import { ESPNEvent, ESPNCompetitor } from '@/types/espn';

vi.mock('firebase/firestore', () => {
  const mockDocs = [
    {
      id: 'p1',
      data: () => ({
        id: 'p1',
        name: 'Alice',
        draftedPlayerIds: ['3470', '1234'],
        isGreedyParticipant: true,
        greedyPlayerId: '3470',
        hasPaidEntry: true,
        hasPaidGreedy: true,
      }),
    },
  ];

  return {
    getFirestore: vi.fn(),
    collection: vi.fn(),
    doc: vi.fn(),
    getDocs: vi.fn().mockImplementation(async () => {
      return {
        docs: mockDocs,
        forEach: (cb: any) => mockDocs.forEach(cb),
        empty: false,
      };
    }),
    writeBatch: vi.fn().mockReturnValue({
      delete: vi.fn(),
      set: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    }),
  };
});

describe('Multi-Event Data Isolation & Persistence Integration Suite', () => {
  const sampleEventAConfig: ContestConfig = {
    espnEventId: '401580384',
    eventName: 'PGA Championship',
    season: 2026,
    mainPayouts: [600, 320, 180, 100],
    dayMoneyPool: 75,
    coursePar: 72,
    isFinalized: true,
  };

  const sampleEventBConfig: ContestConfig = {
    espnEventId: '401580354',
    eventName: 'Masters Tournament',
    season: 2026,
    mainPayouts: [500, 250, 150, 100],
    dayMoneyPool: 50,
    coursePar: 72,
    isFinalized: false,
  };

  const participantsEventA: Participant[] = [
    {
      id: 'p1',
      name: 'Alice',
      draftedPlayerIds: ['3470', '1234'],
      isGreedyParticipant: true,
      greedyPlayerId: '3470',
      hasPaidEntry: true,
      hasPaidGreedy: true,
    },
    {
      id: 'p2',
      name: 'Bob',
      draftedPlayerIds: ['5678', '9012'],
      isGreedyParticipant: false,
      greedyPlayerId: null,
      hasPaidEntry: false,
      hasPaidGreedy: false,
    },
  ];

  const competitorsEventA: ESPNCompetitor[] = [
    { id: '3470', athlete: { id: '3470', displayName: 'Scottie Scheffler' }, score: '-10', linescores: [{ period: 1, value: 68 }, { period: 2, value: 66 }] },
    { id: '1234', athlete: { id: '1234', displayName: 'Rory McIlroy' }, score: '-8', linescores: [{ period: 1, value: 69 }, { period: 2, value: 67 }] },
    { id: '5678', athlete: { id: '5678', displayName: 'Jon Rahm' }, score: '-4', linescores: [{ period: 1, value: 71 }, { period: 2, value: 69 }] },
    { id: '9012', athlete: { id: '9012', displayName: 'Viktor Hovland' }, score: '-2', linescores: [{ period: 1, value: 72 }, { period: 2, value: 70 }] },
  ];

  describe('1. Subcollection Data Isolation & Empty Fallback', () => {
    it('maintains complete isolation between Event A participants and empty Event B', () => {
      const eventAResult = resolveParticipantsFromSnapshot(participantsEventA, '401580384');
      const eventBResult = resolveParticipantsFromSnapshot([], '401580354');

      expect(eventAResult).toHaveLength(2);
      expect(eventAResult[0].name).toBe('Alice');

      // Unconfigured Event B returns clean empty [] without inheriting Event A or default seed
      expect(eventBResult).toEqual([]);
      expect(eventBResult).not.toEqual(eventAResult);
    });
  });

  describe('2. Roster Reset & Copy Workflow', () => {
    it('clones participant names and IDs from Event A while clearing picks and payment flags for Event B', () => {
      const resetForEventB = resetParticipantRoster(participantsEventA);

      expect(resetForEventB).toHaveLength(2);

      // Verify names and IDs carried over
      expect(resetForEventB[0].id).toBe('p1');
      expect(resetForEventB[0].name).toBe('Alice');
      expect(resetForEventB[1].id).toBe('p2');
      expect(resetForEventB[1].name).toBe('Bob');

      // Verify picks and payment flags are reset cleanly
      resetForEventB.forEach((p) => {
        expect(p.draftedPlayerIds).toEqual([]);
        expect(p.isGreedyParticipant).toBe(false);
        expect(p.greedyPlayerId).toBeNull();
        expect(p.hasPaidEntry).toBe(false);
        expect(p.hasPaidGreedy).toBe(false);
      });
    });

    it('executes copyRosterFromEvent transferring participant names to target event with fresh defaults', async () => {
      const result = await copyRosterFromEvent('401580384', '401580354');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Alice');
      expect(result[0].draftedPlayerIds).toEqual([]);
      expect(result[0].hasPaidEntry).toBe(false);
    });
  });

  describe('3. Event Finalization & Read-Only Locks', () => {
    it('evaluates finalized state correctly in contest engine for completed vs active events', () => {
      const contestAResult = evaluateContest(participantsEventA, competitorsEventA, sampleEventAConfig);
      const contestBResult = evaluateContest([], [], sampleEventBConfig);

      expect(contestAResult.wagerLedger.isFinalized).toBe(true);
      expect(contestBResult.wagerLedger.isFinalized).toBe(false);
    });
  });

  describe('4. Viewer Event Selection Resolution', () => {
    it('resolves explicit viewer selected event ID without mutating global config state', () => {
      const availableEvents: ESPNEvent[] = [
        { id: '401580384', name: 'PGA Championship' },
        { id: '401580354', name: 'Masters Tournament' },
      ];

      const resolved = resolveActiveEvent(availableEvents, null, '401580354');
      expect(resolved?.id).toBe('401580354');
      expect(resolved?.name).toBe('Masters Tournament');
    });
  });
});
