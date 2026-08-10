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
        position: { id: String(i + 1), displayName: `${i + 1}` },
        thru: 'F',
      } as any,
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
    // Set 11th competitor score to match 10th competitor ('+4' score to par)
    competitorsWithTies[10] = {
      ...competitorsWithTies[10],
      score: competitorsWithTies[9].score,
      status: { position: { id: '10', displayName: 'T10' } } as any,
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
      status: { type: { name: 'STATUS_CUT', description: 'Cut', detail: 'CUT', state: 'post' }, position: { displayName: 'CUT' } } as any,
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

  it('correctly sorts unsorted competitor inputs by score to par', () => {
    const unsortedCompetitors: ESPNCompetitor[] = [
      { id: 'g3', athlete: { id: 'g3', displayName: 'Third' }, score: '+2', status: { position: { displayName: '3' } } },
      { id: 'g1', athlete: { id: 'g1', displayName: 'Leader' }, score: '-5', status: { position: { displayName: '1' } } },
      { id: 'g2', athlete: { id: 'g2', displayName: 'Second' }, score: '-2', status: { position: { displayName: '2' } } },
    ];

    const res = evaluateFieldLeaderboard({
      competitors: unsortedCompetitors,
      participants: sampleParticipants,
    });

    expect(res.top10Competitors[0].id).toBe('g1');
    expect(res.top10Competitors[1].id).toBe('g2');
    expect(res.top10Competitors[2].id).toBe('g3');
  });

  it('prioritizes live score to par over stale ESPN order or position strings', () => {
    const staleOrderCompetitors: ESPNCompetitor[] = [
      { id: 'finau', athlete: { id: 'finau', displayName: 'Tony Finau' }, order: 94, score: '+1', status: { position: { displayName: 'T94' } } },
      { id: 'svensson', athlete: { id: 'svensson', displayName: 'Adam Svensson' }, order: 108, score: '-1', status: { position: { displayName: 'T108' } } },
      { id: 'mcgreevy', athlete: { id: 'mcgreevy', displayName: 'Max McGreevy' }, order: 94, score: 'E', status: { position: { displayName: 'T94' } } },
      { id: 'stevens', athlete: { id: 'stevens', displayName: 'Sam Stevens' }, order: 94, score: '+2', status: { position: { displayName: 'T94' } } },
    ];

    const res = evaluateFieldLeaderboard({
      competitors: staleOrderCompetitors,
      participants: [],
    });

    const activeIds = res.activeFieldCompetitors.map((c) => c.id);
    expect(activeIds).toEqual(['svensson', 'mcgreevy', 'finau', 'stevens']);

    // Check rankDisplayMap correctly dynamically labels positions based on live score
    expect(res.rankDisplayMap.get('svensson')).toBe('1');
    expect(res.rankDisplayMap.get('mcgreevy')).toBe('2');
    expect(res.rankDisplayMap.get('finau')).toBe('3');
    expect(res.rankDisplayMap.get('stevens')).toBe('4');

    // Top 4 from top10Competitors matching live score
    const top4Ids = res.top10Competitors.slice(0, 4).map((c) => c.id);
    expect(top4Ids).toEqual(['svensson', 'mcgreevy', 'finau', 'stevens']);
  });
});
