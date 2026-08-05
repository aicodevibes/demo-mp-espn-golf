// Deep Module: ESPN Domain Adapter & Data Normalizer
// Hides all ESPN JSON API structural complexity behind a clean, unified interface.

export { formatPlayerSummaryFromCompetitor, createSyntheticCompetitor } from './summary';
export {
  formatEventDates,
  getWinnerStatus,
  getPlayerStatusInfo,
  getTop10WithTies,
  type WinnerStatusInfo,
  type PlayerStatusInfo,
} from './eventHelpers';
export {
  normalizeGolferName,
  searchGolferCompetitors,
  matchGolferInputToId,
  findCompetitorByQuery,
  parseCommaDelimitedGolfers,
} from './golferMatcher';
