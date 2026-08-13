// Deep Module: ESPN Domain Adapter & Data Normalizer
// Hides all ESPN JSON API structural complexity behind a clean, unified interface.

export {
  EspnTournamentAdapter,
  normalizeTournamentSnapshot,
  getGolferCardViewModel,
  normalizeCompetitor,
  resolveGolferHeadshotUrls,
  formatRankDisplay,
  type NormalizedTournament,
  type NormalizedCompetitor,
  type NormalizedStatusInfo,
  type GolferCardViewModel,
  type NormalizeTournamentOptions,
} from './adapter';

export { formatPlayerSummaryFromCompetitor, formatPlayerSummaryFromESPNData, createSyntheticCompetitor } from './summary';
export {
  formatEventDates,
  formatScoreDisplay,
  getScoreMeta,
  formatThruDisplay,
  getGolferCumulativeScoreToPar,
  parseESPNScoreboardResponse,
  resolveActiveEvent,
  getWinnerStatus,
  getPlayerStatusInfo,
  evaluateGolferRoundScore,
  isRoundCompleted,
  resolveEventCompetitorsWithFallback,
  SYNTHETIC_PGA_FIELD,
  DEFAULT_PLAYER_DIRECTORY_MAP,
  type WinnerStatusInfo,
  type PlayerStatusInfo,
  type ScoreMeta,
  type GolferRoundScoreResult,
} from './eventHelpers';
export {
  normalizeGolferName,
  searchGolferCompetitors,
  matchGolferInputToId,
  findCompetitorByQuery,
  parseCommaDelimitedGolfers,
} from './golferMatcher';
export { readScoreboardCache, writeScoreboardCache, SCOREBOARD_CACHE_KEY } from './scoreboardCache';
