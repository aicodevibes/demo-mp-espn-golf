import { describe, it, expect } from 'vitest';
import {
  evaluateFieldLeaderboard,
  evaluateLeaderboard,
  sortCompetitorsByLeaderboard,
  parsePositionNumber,
  parseCompetitorScoreToPar,
  computeLeaderboardRankDisplays,
} from '../fieldLeaderboard';
import { ESPNCompetitor } from '@/types/espn';
import { Participant } from '@/types/contest';
import { normalizeTournamentSnapshot } from '@/lib/espn';

describe('FieldLeaderboard Evaluator Domain Seam', () => {
  const sampleParticipants: Participant[] = [
    { id: 'p1', name: 'Alice', draftedPlayerIds: ['g1', 'g12', 'g15'] },
    { id: 'p2', name: 'Bob', draftedPlayerIds: ['g2', 'g11'] },
  ];

  const sampleCompetitors: ESPNCompetitor[] = Array.from({ length: 15 }, (_, i) => {
    const id = `g${i + 1}`;
    return {
      id,
      athlete: {
        id,
        displayName: `Golfer ${i + 1}`,
        firstName: 'Golfer',
        lastName: `${i + 1}`,
      },
      status: {
        position: { id: String(i + 1), displayName: `${i + 1}` },
        thru: 'F',
      } as any,
      score: `${i - 5}`,
    };
  });

  describe('Single-pass field partitioning', () => {
    it('evaluates leaderboard into top10Leaders, draftedGolfers, activeField, and cutField in a single pass', () => {
      const evaluation = evaluateFieldLeaderboard({
        competitors: sampleCompetitors,
        participants: sampleParticipants,
      });

      // Top 10 Leaders
      expect(evaluation.top10Leaders.length).toBe(10);
      expect(evaluation.top10Leaders[0].id).toBe('g1');
      expect(evaluation.top10Leaders[0].profile.name).toBe('Golfer 1');
      expect(evaluation.top10Leaders[0].profile.draftedBy).toEqual(['Alice']);
      expect(evaluation.top10Leaders[0].formattedRank).toBe('1');
      expect(evaluation.top10Leaders[9].id).toBe('g10');

      // Drafted golfers outside Top 10 (g11, g12, g15)
      expect(evaluation.draftedGolfers.length).toBe(3);
      const draftedIds = evaluation.draftedGolfers.map((c) => c.id);
      expect(draftedIds).toContain('g11');
      expect(draftedIds).toContain('g12');
      expect(draftedIds).toContain('g15');
      expect(draftedIds).not.toContain('g1'); // in top 10
      expect(draftedIds).not.toContain('g2'); // in top 10

      // Active field & cut field
      expect(evaluation.activeField.length).toBe(15);
      expect(evaluation.cutField.length).toBe(0);
      expect(evaluation.projectedCutIndex).toBe(15);

      // playerDraftedByMap
      expect(evaluation.playerDraftedByMap.get('g1')).toEqual(['Alice']);
      expect(evaluation.playerDraftedByMap.get('g2')).toEqual(['Bob']);
    });

    it('handles NormalizedTournament input directly', () => {
      const rawPayload = {
        events: [
          {
            id: '401580340',
            name: 'Masters Tournament',
            status: { type: { state: 'in', detail: 'Round 2' }, period: 2 },
            competitions: [{ id: '401580340', competitors: sampleCompetitors }],
          },
        ],
      };

      const tournament = normalizeTournamentSnapshot(rawPayload);
      const evaluation = evaluateFieldLeaderboard({
        tournament,
        participants: sampleParticipants,
      });

      expect(evaluation.top10Leaders.length).toBe(10);
      expect(evaluation.top10Leaders[0].id).toBe('g1');
      expect(evaluation.draftedGolfers.length).toBe(3);
      expect(evaluation.activeField.length).toBe(15);
    });

    it('includes all competitors tied at position T10 in top10Leaders', () => {
      const competitorsWithTies = [...sampleCompetitors];
      // Set 11th competitor score to match 10th competitor
      competitorsWithTies[10] = {
        ...competitorsWithTies[10],
        score: competitorsWithTies[9].score,
        status: { position: { id: '10', displayName: 'T10' } } as any,
      };

      const res = evaluateFieldLeaderboard({
        competitors: competitorsWithTies,
        participants: sampleParticipants,
      });

      expect(res.top10Leaders.length).toBe(11);
      expect(res.top10Leaders[10].id).toBe('g11');
    });

    it('filters active and cut fields by search query', () => {
      const competitorsWithCut = [...sampleCompetitors];
      competitorsWithCut[13] = {
        ...competitorsWithCut[13],
        status: {
          type: { name: 'STATUS_CUT', description: 'Cut', detail: 'CUT', state: 'post' },
          position: { displayName: 'CUT' },
        } as any,
      };

      const res = evaluateFieldLeaderboard({
        competitors: competitorsWithCut,
        participants: sampleParticipants,
        searchQuery: 'Golfer 14',
      });

      expect(res.activeField.length).toBe(0);
      expect(res.cutField.length).toBe(1);
      expect(res.cutField[0].id).toBe('g14');
    });
  });

  describe('Sorting & Ranking Seams', () => {
    it('sorts active competitors by score to par ascending and puts cut/WD last', () => {
      const unsorted: ESPNCompetitor[] = [
        { id: 'c3', athlete: { id: 'c3', displayName: 'Third' }, score: '+2' },
        { id: 'cut1', athlete: { id: 'cut1', displayName: 'Cut Guy' }, score: '+10', status: { position: { displayName: 'CUT' } } },
        { id: 'c1', athlete: { id: 'c1', displayName: 'Leader' }, score: '-5' },
        { id: 'c2', athlete: { id: 'c2', displayName: 'Second' }, score: '-2' },
      ];

      const sorted = sortCompetitorsByLeaderboard(unsorted);
      const sortedIds = sorted.map((c) => c.id);
      expect(sortedIds).toEqual(['c1', 'c2', 'c3', 'cut1']);
    });

    it('computes dynamic leaderboard rank display with T prefixes for ties', () => {
      const competitors: ESPNCompetitor[] = [
        { id: 'c1', score: '-5', athlete: { id: 'c1', displayName: 'Leader' } },
        { id: 'c2', score: '-3', athlete: { id: 'c2', displayName: 'Tied 2' } },
        { id: 'c3', score: '-3', athlete: { id: 'c3', displayName: 'Tied 2' } },
        { id: 'c4', score: 'E', athlete: { id: 'c4', displayName: 'Fourth' } },
      ];

      const ranks = computeLeaderboardRankDisplays(competitors);
      expect(ranks.get('c1')).toBe('1');
      expect(ranks.get('c2')).toBe('T2');
      expect(ranks.get('c3')).toBe('T2');
      expect(ranks.get('c4')).toBe('4');
    });

    it('parses position numbers and scores safely', () => {
      expect(parsePositionNumber({ order: 5 } as any)).toBe(5);
      expect(parsePositionNumber({ status: { position: { displayName: 'T12' } } } as any)).toBe(12);
      expect(parsePositionNumber(null)).toBe(999);

      expect(parseCompetitorScoreToPar({ score: '-4' } as any)).toBe(-4);
      expect(parseCompetitorScoreToPar({ score: 'E' } as any)).toBe(0);
      expect(parseCompetitorScoreToPar({ score: 'CUT' } as any)).toBe(999);
    });
  });
});
