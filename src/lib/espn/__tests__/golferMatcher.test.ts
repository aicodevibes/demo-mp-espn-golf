import { describe, it, expect } from 'vitest';
import {
  normalizeGolferName,
  matchGolferInputToId,
  parseCommaDelimitedGolfers,
  findCompetitorByQuery,
} from '../golferMatcher';
import { ESPNCompetitor } from '@/types/espn';

const mockCompetitors: ESPNCompetitor[] = [
  {
    id: '4604625',
    athlete: {
      id: '4604625',
      displayName: 'Scottie Scheffler',
      shortName: 'S. Scheffler',
    },
  },
  {
    id: '3470',
    athlete: {
      id: '3470',
      displayName: 'Rory McIlroy',
      shortName: 'R. McIlroy',
    },
  },
  {
    id: '10577',
    athlete: {
      id: '10577',
      displayName: 'Ludvig Åberg',
      shortName: 'L. Aberg',
    },
  },
  {
    id: '9478',
    athlete: {
      id: '9478',
      displayName: 'Xander Schauffele',
      shortName: 'X. Schauffele',
    },
  },
];

describe('golferMatcher', () => {
  describe('normalizeGolferName', () => {
    it('normalizes diacritics and casing', () => {
      expect(normalizeGolferName('Ludvig Åberg')).toBe('ludvig aberg');
      expect(normalizeGolferName('S. Scheffler')).toBe('s scheffler');
    });
  });

  describe('matchGolferInputToId', () => {
    it('matches exact athlete ID', () => {
      expect(matchGolferInputToId(mockCompetitors, '4604625')).toBe('4604625');
    });

    it('matches exact display name', () => {
      expect(matchGolferInputToId(mockCompetitors, 'Rory McIlroy')).toBe('3470');
    });

    it('matches name with diacritics (Ludvig Aberg -> Ludvig Åberg)', () => {
      expect(matchGolferInputToId(mockCompetitors, 'Ludvig Aberg')).toBe('10577');
    });

    it('matches short name (S. Scheffler)', () => {
      expect(matchGolferInputToId(mockCompetitors, 'S. Scheffler')).toBe('4604625');
    });

    it('matches single unique last name (Schauffele)', () => {
      expect(matchGolferInputToId(mockCompetitors, 'Schauffele')).toBe('9478');
    });

    it('returns null if no match is found', () => {
      expect(matchGolferInputToId(mockCompetitors, 'Unknown Golfer')).toBeNull();
    });
  });

  describe('parseCommaDelimitedGolfers', () => {
    it('parses comma-delimited golfers', () => {
      const input = 'Scottie Scheffler, 3470, Ludvig Aberg, X. Schauffele';
      const results = parseCommaDelimitedGolfers(input, mockCompetitors);

      expect(results).toHaveLength(4);
      expect(results[0].matchedId).toBe('4604625');
      expect(results[0].competitor?.athlete?.displayName).toBe('Scottie Scheffler');
      expect(results[1].matchedId).toBe('3470');
      expect(results[1].competitor?.athlete?.displayName).toBe('Rory McIlroy');
      expect(results[2].matchedId).toBe('10577');
      expect(results[2].competitor?.athlete?.displayName).toBe('Ludvig Åberg');
      expect(results[3].matchedId).toBe('9478');
      expect(results[3].competitor?.athlete?.displayName).toBe('Xander Schauffele');
    });
  });
});
