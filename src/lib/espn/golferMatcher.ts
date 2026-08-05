import { ESPNCompetitor } from '@/types/espn';

/**
 * Normalizes a name string: lowercases, strips diacritics/accents, removes punctuation except spaces.
 */
export function normalizeGolferName(name: string): string {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')  // replace non-alphanumeric with spaces
    .replace(/\s+/g, ' ')           // collapse whitespace
    .trim();
}

/**
 * Extracts normalized word tokens from a name string.
 */
export function getGolferNameTokens(name: string): string[] {
  const norm = normalizeGolferName(name);
  return norm ? norm.split(' ') : [];
}

/**
 * Helper to derive golfer's last name from athlete object or displayName.
 */
export function getGolferLastName(comp: ESPNCompetitor): string {
  if (comp.athlete?.lastName) {
    return normalizeGolferName(comp.athlete.lastName);
  }
  if (comp.athlete?.lastNames) {
    return normalizeGolferName(comp.athlete.lastNames);
  }
  const tokens = getGolferNameTokens(comp.athlete?.displayName || '');
  return tokens.length > 0 ? tokens[tokens.length - 1] : '';
}

export interface GolferMatchResult {
  competitor: ESPNCompetitor;
  athleteId: string;
  confidenceTier: 'exact-id' | 'exact-display' | 'exact-short' | 'initial-last' | 'last-name' | 'partial';
  score: number;
}

/**
 * Finds all competitor matches for a given query string, ordered by match confidence.
 */
export function searchGolferCompetitors(
  competitors: ESPNCompetitor[] = [],
  query: string
): GolferMatchResult[] {
  if (!query || !query.trim() || !competitors || competitors.length === 0) {
    return [];
  }

  const rawQuery = query.trim();
  const normQuery = normalizeGolferName(rawQuery);
  const queryTokens = getGolferNameTokens(rawQuery);

  const results: GolferMatchResult[] = [];

  for (const comp of competitors) {
    const athleteId = comp.athlete?.id || comp.id;
    if (!athleteId) continue;

    const displayName = comp.athlete?.displayName || '';
    const normDisplay = normalizeGolferName(displayName);
    const displayTokens = getGolferNameTokens(displayName);

    const shortName = comp.athlete?.shortName || '';
    const normShort = normalizeGolferName(shortName);

    const lastName = getGolferLastName(comp);
    const firstName = comp.athlete?.firstName
      ? normalizeGolferName(comp.athlete.firstName)
      : displayTokens[0] || '';

    // Tier 1: Direct ID Match
    if (athleteId === rawQuery) {
      results.push({ competitor: comp, athleteId, confidenceTier: 'exact-id', score: 100 });
      continue;
    }

    // Tier 2: Exact Display Name / Full Name Match
    if (normDisplay === normQuery) {
      results.push({ competitor: comp, athleteId, confidenceTier: 'exact-display', score: 95 });
      continue;
    }

    // Tier 3: Exact Short Name Match (e.g. "S. Scheffler")
    if (normShort && normShort === normQuery) {
      results.push({ competitor: comp, athleteId, confidenceTier: 'exact-short', score: 90 });
      continue;
    }

    // Tier 4: First Initial + Last Name Match (e.g., "S. Scheffler" or "S Scheffler")
    if (queryTokens.length === 2 && displayTokens.length >= 2) {
      const qInitial = queryTokens[0].charAt(0);
      const qLastName = queryTokens[1];
      const dInitial = firstName.charAt(0);

      if (qInitial === dInitial && qLastName === lastName) {
        results.push({ competitor: comp, athleteId, confidenceTier: 'initial-last', score: 85 });
        continue;
      }
    }

    // Tier 5: Last Name Match (e.g., "Scheffler")
    if (queryTokens.length === 1 && normQuery === lastName) {
      results.push({ competitor: comp, athleteId, confidenceTier: 'last-name', score: 75 });
      continue;
    }

    // Tier 6: Partial Substring Match
    if (normDisplay.includes(normQuery) || (normShort && normShort.includes(normQuery))) {
      results.push({ competitor: comp, athleteId, confidenceTier: 'partial', score: 50 });
      continue;
    }
  }

  // Sort by match score descending
  return results.sort((a, b) => b.score - a.score);
}

/**
 * Utility to map a single user-typed golfer string directly to an ESPN Athlete ID.
 * Returns null if no match is found.
 */
export function matchGolferInputToId(
  competitors: ESPNCompetitor[] = [],
  query: string
): string | null {
  const matches = searchGolferCompetitors(competitors, query);
  return matches.length > 0 ? matches[0].athleteId : null;
}

/**
 * Utility to map a single user-typed golfer string to an ESPNCompetitor object.
 */
export function findCompetitorByQuery(
  competitors: ESPNCompetitor[] = [],
  query: string
): ESPNCompetitor | null {
  const matches = searchGolferCompetitors(competitors, query);
  return matches.length > 0 ? matches[0].competitor : null;
}

/**
 * Parses a comma-delimited string of golfer names, resolving each to ESPNCompetitors and athlete IDs.
 */
export function parseCommaDelimitedGolfers(
  input: string,
  competitors: ESPNCompetitor[] = []
): Array<{
  rawInput: string;
  matchedId: string | null;
  competitor: ESPNCompetitor | null;
}> {
  if (!input) return [];
  const parts = input.split(',').map((p) => p.trim()).filter(Boolean);
  return parts.map((rawInput) => {
    const comp = findCompetitorByQuery(competitors, rawInput);
    return {
      rawInput,
      matchedId: comp?.athlete?.id || comp?.id || null,
      competitor: comp,
    };
  });
}
