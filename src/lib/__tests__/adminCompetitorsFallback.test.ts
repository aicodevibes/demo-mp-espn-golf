import { describe, it, expect } from 'vitest';
import { resolveEventCompetitorsWithFallback } from '../espn/eventHelpers';

describe('resolveEventCompetitorsWithFallback', () => {
  it('returns event competitors when ESPN leaderboard provides them', () => {
    const mockComps = Array.from({ length: 40 }, (_, i) => ({
      id: `golfer-${i + 1}`,
      athlete: { id: `golfer-${i + 1}`, displayName: `Golfer ${i + 1}` },
    }));

    const result = resolveEventCompetitorsWithFallback(mockComps, []);
    expect(result).toHaveLength(40);
    expect(result[0].athlete?.displayName).toBe('Golfer 1');
  });

  it('falls back to active scoreboard / cached competitors when event leaderboard competitors is empty', () => {
    const fallbackComps = Array.from({ length: 50 }, (_, i) => ({
      id: `pga-${i + 1}`,
      athlete: { id: `pga-${i + 1}`, displayName: `PGA Golfer ${i + 1}` },
    }));

    // When primary event competitors is empty (e.g., upcoming event before tee times)
    const result = resolveEventCompetitorsWithFallback([], fallbackComps);
    expect(result).toHaveLength(50);
    expect(result[0].athlete?.displayName).toBe('PGA Golfer 1');
  });

  it('provides a synthetic PGA field of 40 golfers when both event and fallback competitors are empty', () => {
    const result = resolveEventCompetitorsWithFallback([], []);
    expect(result.length).toBeGreaterThanOrEqual(36);
    expect(result[0].athlete?.displayName).toBeDefined();
  });
});
