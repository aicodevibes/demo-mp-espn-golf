import { ESPNCompetitor } from '@/types/espn';
import { Participant } from '@/types/contest';
import {
  DEFAULT_PLAYER_DIRECTORY_MAP,
  searchGolferCompetitors,
  findCompetitorByQuery,
} from '@/lib/espn';

export function normalizeGolferName(name: string): string {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getGolferNameTokens(name: string): string[] {
  const norm = normalizeGolferName(name);
  return norm ? norm.split(' ') : [];
}

export function getGolferLastName(comp: ESPNCompetitor): string {
  if (comp?.athlete?.lastName) {
    return normalizeGolferName(comp.athlete.lastName);
  }
  if (comp?.athlete?.lastNames) {
    return normalizeGolferName(comp.athlete.lastNames);
  }
  const tokens = getGolferNameTokens(comp?.athlete?.displayName || '');
  return tokens.length > 0 ? tokens[tokens.length - 1] : '';
}



export interface GolferProfile {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  shortName?: string;
  headshotUrls: string[]; // [ESPN CDN / Custom, ESPN Combiner Fallback, Directory Fallback]
  draftedBy: string[]; // Participant names who drafted this golfer
  initials: string;
}

export interface GolferDirectoryOptions {
  competitors?: ESPNCompetitor[];
  participants?: Participant[];
  playerDirectoryMap?: Record<string, { id: string; name: string; headshotUrl?: string }>;
}

export function getGolferInitials(name: string): string {
  if (!name || !name.trim()) return 'PGA';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
  * Resolves a golfer profile synchronously using available competitors payload,
  * directory fallback maps, and participant draft ownerships.
  */
export function getGolferProfile(
  golferIdOrQuery: string,
  options: GolferDirectoryOptions = {}
): GolferProfile {
  const { competitors = [], participants = [], playerDirectoryMap } = options;
  const rawIdOrQuery = (golferIdOrQuery || '').trim();

  // Try finding in competitors payload
  let comp = competitors.find((c) => (c.athlete?.id || c.id) === rawIdOrQuery) || null;
  if (!comp && rawIdOrQuery) {
    comp = findCompetitorByQuery(competitors, rawIdOrQuery);
  }

  const athleteId = comp?.athlete?.id || comp?.id || rawIdOrQuery;

  // Directory fallback map lookup
  const dirMap = playerDirectoryMap || DEFAULT_PLAYER_DIRECTORY_MAP;
  const directoryPlayer = dirMap[athleteId] || dirMap[rawIdOrQuery];

  // Derive canonical name
  const name =
    comp?.athlete?.displayName ||
    directoryPlayer?.name ||
    (rawIdOrQuery ? `Golfer (${rawIdOrQuery})` : 'Unknown Golfer');

  const firstName = comp?.athlete?.firstName || getGolferNameTokens(name)[0] || '';
  const lastName = comp?.athlete?.lastName || getGolferLastName(comp || ({ athlete: { displayName: name } } as ESPNCompetitor));
  const shortName = comp?.athlete?.shortName || `${firstName ? firstName.charAt(0) + '.' : ''} ${lastName}`.trim();

  // Derive pre-ordered headshot fallback URLs
  const headshotUrls: string[] = [];
  
  // 1. Direct ESPN Athlete headshot href if present
  if (comp?.athlete?.headshot?.href && comp.athlete.headshot.href.startsWith('http')) {
    headshotUrls.push(comp.athlete.headshot.href);
  }
  
  // 2. Directory custom URL if present
  if (directoryPlayer?.headshotUrl && directoryPlayer.headshotUrl.startsWith('http')) {
    if (!headshotUrls.includes(directoryPlayer.headshotUrl)) {
      headshotUrls.push(directoryPlayer.headshotUrl);
    }
  }

  // 3. Direct ESPN CDN full headshot URL
  if (athleteId && /^\d+$/.test(athleteId)) {
    const espnDirectUrl = `https://a.espncdn.com/i/headshots/golf/players/full/${athleteId}.png`;
    if (!headshotUrls.includes(espnDirectUrl)) {
      headshotUrls.push(espnDirectUrl);
    }

    // 4. ESPN Combiner fallback URL
    const espnCombinerUrl = `https://a.espncdn.com/combiner/i?img=/i/headshots/golf/players/full/${athleteId}.png&w=120&h=120&scale=crop`;
    if (!headshotUrls.includes(espnCombinerUrl)) {
      headshotUrls.push(espnCombinerUrl);
    }
  }

  // Determine draftedBy participants
  const draftedBy: string[] = [];
  if (athleteId && Array.isArray(participants)) {
    participants.forEach((p) => {
      if (p?.draftedPlayerIds?.includes(athleteId)) {
        draftedBy.push(p.name || 'Participant');
      }
    });
  }

  return {
    id: athleteId,
    name,
    firstName,
    lastName,
    shortName,
    headshotUrls,
    draftedBy,
    initials: getGolferInitials(name),
  };
}

/**
  * Searches competitors by query and returns GolferProfiles enriched with match scores.
  */
export function searchGolferProfiles(
  query: string,
  options: GolferDirectoryOptions = {}
): Array<{ profile: GolferProfile; confidenceTier: string; score: number }> {
  const { competitors = [] } = options;
  const matches = searchGolferCompetitors(competitors, query);

  return matches.map((m) => {
    const profile = getGolferProfile(m.athleteId, options);
    return {
      profile,
      confidenceTier: m.confidenceTier,
      score: m.score,
    };
  });
}
