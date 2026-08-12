import { describe, it, expect } from 'vitest';
import { evaluateLeaderboard } from '../fieldLeaderboard';
import { ESPNCompetitor } from '@/types/espn';
import { Participant } from '@/types/contest';

describe('FieldLeaderboard Evaluator Domain Seam', () => {
  const sampleCompetitors: ESPNCompetitor[] = [
    {
      id: '3470',
      order: 1,
      score: '-10',
      status: { position: { displayName: '1', id: '1' } },
      athlete: { id: '3470', displayName: 'Scottie Scheffler' },
    },
    {
      id: '4587',
      order: 2,
      score: '-8',
      status: { position: { displayName: '2', id: '2' } },
      athlete: { id: '4587', displayName: 'Jon Rahm' },
    },
    {
      id: '1234',
      order: 3,
      score: '+5',
      status: { position: { displayName: 'CUT', id: 'CUT' } },
      athlete: { id: '1234', displayName: 'Rory McIlroy' },
    },
  ];

  const sampleParticipants: Participant[] = [
    { id: 'p1', name: 'Texas', draftedPlayerIds: ['3470'] },
    { id: 'p2', name: 'Florida', draftedPlayerIds: ['1234'] },
  ];

  it('evaluates leaderboard into categorized, enriched lists in a single pass', () => {
    const evaluation = evaluateLeaderboard(sampleCompetitors, { participants: sampleParticipants });

    expect(evaluation.top10Leaders.length).toBe(2);
    expect(evaluation.top10Leaders[0].profile.name).toBe('Scottie Scheffler');
    expect(evaluation.top10Leaders[0].profile.draftedBy).toEqual(['Texas']);
    expect(evaluation.top10Leaders[0].formattedRank).toBe('1');

    expect(evaluation.cutField.length).toBe(1);
    expect(evaluation.cutField[0].profile.name).toBe('Rory McIlroy');
    expect(evaluation.cutField[0].profile.draftedBy).toEqual(['Florida']);
  });

  it('includes all competitors tied at position T10 or higher in top10Leaders', () => {
    const tiedCompetitors: ESPNCompetitor[] = Array.from({ length: 12 }, (_, i) => ({
      id: `player-${i}`,
      order: i < 9 ? i + 1 : 10,
      score: i < 9 ? `-${15 - i}` : '-5',
      status: { position: { displayName: i < 9 ? `${i + 1}` : 'T10', id: i < 9 ? `${i + 1}` : 'T10' } },
      athlete: { id: `player-${i}`, displayName: `Golfer ${i}` },
    }));

    const evalResult = evaluateLeaderboard(tiedCompetitors);
    // 9 players in top 9 + 3 players tied at T10 = 12 total in top10Leaders
    expect(evalResult.top10Leaders.length).toBe(12);
  });

  it('filters active and cut fields by searchQuery parameter', () => {
    const evalResult = evaluateLeaderboard(sampleCompetitors, { searchQuery: 'Scheffler' });
    expect(evalResult.top10Leaders.length).toBe(1);
    expect(evalResult.top10Leaders[0].profile.name).toBe('Scottie Scheffler');
  });
});
