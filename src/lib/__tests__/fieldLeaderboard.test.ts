import { describe, it, expect } from 'vitest';
import { evaluateFieldLeaderboard } from '../fieldLeaderboard';
import { ESPNCompetitor } from '@/types/espn';
import { Participant } from '@/types/contest';

describe('evaluateFieldLeaderboard domain module', () => {
  const sampleParticipants: Participant[] = [
    { id: 'p1', name: 'Alice', draftedPlayerIds: ['g1', 'g12', 'g15'] },
    { id: 'p2', name: 'Bob', draftedPlayerIds: ['g2', 'g11'] },
  ];

  const sampleCompetitors: ESPNCompetitor[] = Array.from({ length: 15 }, (_, i) => {
    const id = `g${i + 1}`;
    return {
      id,
      athlete: { id, displayName: `Golfer ${i + 1}` },
      status: {
        position: { id: i + 1, displayName: `${i + 1}` },
        thru: 'F',
      },
      score: `${i - 5}`,
    };
  });

  it('correctly extracts Top 10 leaders', () => {
    const res = evaluateFieldLeaderboard({
      competitors: sampleCompetitors,
      participants: sampleParticipants,
    });

    expect(res.top10Competitors.length).toBe(10);
    expect(res.top10Competitors[0].id).toBe('g1');
    expect(res.top10Competitors[9].id).toBe('g10');
  });

  it('includes ties at position 10 in Top 10 leaders', () => {
    const competitorsWithTies = [...sampleCompetitors];
    // Set 11th competitor to T10 tie
    competitorsWithTies[10] = {
      ...competitorsWithTies[10],
      status: { position: { id: 10, displayName: 'T10' } },
    };

    const res = evaluateFieldLeaderboard({
      competitors: competitorsWithTies,
      participants: sampleParticipants,
    });

    expect(res.top10Competitors.length).toBe(11);
    expect(res.top10Competitors[10].id).toBe('g11');
  });

  it('correctly filters drafted golfers who are outside Top 10', () => {
    const res = evaluateFieldLeaderboard({
      competitors: sampleCompetitors,
      participants: sampleParticipants,
    });

    // g11, g12, g15 are drafted and outside top 10
    const otherIds = res.otherDraftedCompetitors.map((c) => c.id);
    expect(otherIds).toContain('g11');
    expect(otherIds).toContain('g12');
    expect(otherIds).toContain('g15');
    expect(otherIds).not.toContain('g1'); // inside top 10
    expect(otherIds).not.toContain('g2'); // inside top 10
  });

  it('filters active vs cut field based on search query', () => {
    const competitorsWithCut = [...sampleCompetitors];
    // Mark 14th golfer as CUT
    competitorsWithCut[13] = {
      ...competitorsWithCut[13],
      status: { type: { name: 'STATUS_CUT' }, position: { displayName: 'CUT' } },
    };

    const res = evaluateFieldLeaderboard({
      competitors: competitorsWithCut,
      participants: sampleParticipants,
      searchQuery: 'Golfer 14',
    });

    expect(res.activeFieldCompetitors.length).toBe(0);
    expect(res.cutFieldCompetitors.length).toBe(1);
    expect(res.cutFieldCompetitors[0].id).toBe('g14');
  });
});
