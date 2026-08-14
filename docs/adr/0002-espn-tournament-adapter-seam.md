# Deep ESPN Tournament Adapter Seam

All third-party ESPN scoreboard, leaderboard, and player summary ingestion is encapsulated behind `EspnTournamentAdapter`. Procedural helper functions (`formatScoreDisplay`, `formatThruDisplay`, `getPlayerStatusInfo`, `getWinnerStatus`, etc.) are internal implementation details and are not exported.

## Context
Raw ESPN tournament responses contain inconsistent formats across pre-tournament, live in-progress, and post-cut states. Previously, 20+ loose procedural functions leaked raw JSON parsing and status checks across multiple UI components.

## Decision
1. **Single External Seam**: `EspnTournamentAdapter` is the sole entry point for ESPN data transformations via `normalizeTournamentSnapshot()` and `normalizePlayerSummary()`.
2. **Normalized Domain Models**: Callers and UI components exclusively consume pre-evaluated `NormalizedTournament` and `NormalizedCompetitor` snapshots containing pre-calculated scores to par, status badges, cut flags, and resolved multi-stage CDN headshots.
3. **Ingestion Fallback**: When an event is scheduled or competitors are missing from live feeds, the adapter automatically synthesizes `NormalizedCompetitor` entries from the local player directory.

## Consequences
- UI components contain zero score formatting math or status parsing logic.
- Testing focuses on the single transformation seam, eliminating duplicate assertions across components.
