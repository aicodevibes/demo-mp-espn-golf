# Decoupled Domain Contexts and Composable State Architecture

## Status
Accepted

## Context
Previously, `EventContext.tsx` served as a single monolithic provider maintaining 20+ state properties across 4 Firestore real-time listeners (`/config/app`, `/players`, `/events/{id}/participants`, `/events/{id}/contestConfig/default`), 2 ESPN REST endpoints, an adaptive polling interval, and full domain evaluation calculations. Because `useEventContext()` was consumed globally, any minor update (e.g. 35s polling ticks, timestamp updates, or a single participant modification) caused the entire dashboard tree and all 8 child visual components to re-render.

## Decision
1. **Separation of Concerns across 3 Pure Contexts**:
   - **`TournamentContext`**: Encapsulates ESPN scoreboard, selected tournament event metadata, raw competitors, normalized tournament snapshots (`tournament`), and historical archive viewer overrides.
   - **`ContestContext`**: Encapsulates Firestore contest subscriptions (`participants`, `contestConfig`, `firestorePlayerMap`).
   - **`LiveSyncContext`**: Encapsulates polling cadence, network latency flags (`isRefreshing`, `isStaleData`, `lastRefreshedAt`, `error`), and manual refresh triggers.
2. **Domain Evaluation Composition**:
   - Composite domain models (`fieldEvaluation` and `contestEvaluation`) are decoupled from context storage and calculated via pure custom hooks (`useFieldEvaluation`, `useContestEvaluation`) or memoized seams in consuming components.
3. **Compatibility Facade**:
   - A unified `useEventContext()` compatibility hook is retained to compose the three granular contexts, guaranteeing zero regressions for admin tools and secondary pages during migration.
4. **Render-Derived Defaults**:
   - Replace cascading `useEffect` state synchronization in `DashboardPage` with render-derived fallback selections for active participant and active player.

## Consequences
- State updates in polling and refresh timers are strictly isolated to `LiveSyncContext` consumers (e.g., `Header`), eliminating unnecessary re-renders in leaderboard, scorecard, and standings components.
- Context stores become lightweight, highly cohesive, and easily unit-tested without complex multi-system mocking.
- Preserves full backward compatibility for existing admin pages.
