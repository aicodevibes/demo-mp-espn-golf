import { describe, it, expect } from 'vitest';

describe('Tracked Competitors Matching Logic', () => {
  it('correctly matches tracked player IDs against competitor athlete.id or competitor.id', () => {
    const mockTrackedPlayers = [
      { playerId: '10548', name: 'Matt Wallace' },
      { playerId: '3470', name: 'Scottie Scheffler' },
    ];

    const mockCompetitors = [
      { id: '10548', athlete: { displayName: 'Matt Wallace' } }, // athlete.id is missing, id is on comp.id
      { id: '3470', athlete: { id: '3470', displayName: 'Scottie Scheffler' } },
      { id: '1810', athlete: { id: '1810', displayName: 'Rory McIlroy' } },
    ];

    const matchedCompetitors = mockCompetitors.filter((c) =>
      mockTrackedPlayers.some((p) => p.playerId === (c.athlete?.id || c.id))
    );

    expect(matchedCompetitors.length).toBe(2);
    expect(matchedCompetitors[0].id).toBe('10548');
    expect(matchedCompetitors[1].id).toBe('3470');
  });
});
