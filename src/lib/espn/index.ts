// Deep Module: ESPN Domain Adapter & Data Normalizer
// Hides all ESPN JSON API structural complexity behind a clean, unified interface.

export { formatPlayerSummaryFromCompetitor } from './summary';
export { formatEventDates, getWinnerStatus, type WinnerStatusInfo } from './eventHelpers';
