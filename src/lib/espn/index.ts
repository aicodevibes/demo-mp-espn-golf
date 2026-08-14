// Deep Module: ESPN Domain Adapter & Data Normalizer
// Hides all ESPN JSON API structural complexity behind a clean, unified interface.

export {
  EspnTournamentAdapter,
  normalizeTournamentSnapshot,
  normalizePlayerSummary,
  getGolferCardViewModel,
  normalizeCompetitor,
  resolveGolferHeadshotUrls,
  formatRankDisplay,
  type NormalizedTournament,
  type NormalizedCompetitor,
  type NormalizedStatusInfo,
  type NormalizedPlayerSummary,
  type NormalizedRoundLinescore,
  type NormalizedHoleScore,
  type NormalizedPlayerProfile,
  type GolferCardViewModel,
  type NormalizeTournamentOptions,
} from './adapter';
export {
  formatEventDates,
  parseESPNScoreboardResponse,
  resolveActiveEvent,
  resolveEventCompetitorsWithFallback,
  SYNTHETIC_PGA_FIELD,
  DEFAULT_PLAYER_DIRECTORY_MAP,
  type WinnerStatusInfo,
  type PlayerStatusInfo,
  type ScoreMeta,
} from './eventHelpers';
export {
  normalizeGolferName,
  searchGolferCompetitors,
  matchGolferInputToId,
  findCompetitorByQuery,
  parseCommaDelimitedGolfers,
} from './golferMatcher';
export { readScoreboardCache, writeScoreboardCache, SCOREBOARD_CACHE_KEY } from './scoreboardCache';
