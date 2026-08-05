# Spec: Unified Contest Evaluation Engine

## Problem Statement

Currently, contest scoring calculation is split across multiple functions in `src/lib/scoring.ts` (`calculateParticipantStandings`, `calculateDayMoneyWinners`, `createPlayerDraftedByMap`) and `src/lib/settlement.ts` (`calculateWagerSettlement`). 

Callers like `src/app/page.tsx` must independently invoke 3 separate functions, stitch together intermediate maps, and pass disjointed data structures down to components like `ParticipantStandings`, `DayMoneyWinners`, and `WagerSettlementLedger`. 

This leads to shallow module interfaces, duplicate loops over participants/competitors, and scattered scoring rules with low locality.

## Solution

Build a deep `ContestEngine` module (`src/lib/contestEngine.ts`) with a single primary entry point seam: `evaluateContest(participants, competitors, contestConfig, eventStatus)`. 

This function encapsulates participant round score calculation, cut penalty enforcement, rank determination, top-4 prize pool tie-splitting, Day Money R1–R4 winner determination, and net wager ledger balance calculations in one atomic pass.

## User Stories

1. As a contest administrator or participant, I want participant standings, day money winners, and net wager balances to stay 100% in sync across all dashboard views without calculation mismatches.
2. As a dashboard viewer, I want participant standings to correctly apply penalty scores for cut golfers on rounds 3 and 4, sort active participants ahead of cut participants, and accurately split prize money on ties.
3. As a wager manager, I want the net settlement ledger to automatically aggregate main tournament payouts, day money winnings, and entry fees into net balances per participant whenever leaderboard scores update.
4. As a developer, I want a single function seam `evaluateContest` so that testing complex contest scenarios (e.g. 3-way ties, cut field, partial round data) requires zero UI component mounting or manual state stitching.

## Implementation Decisions

- **Single Seam Module**: Create `src/lib/contestEngine.ts` exposing `evaluateContest(participants, competitors, contestConfig, eventStatus)`.
- **Unified Return Interface**: Define `ContestEvaluationResult` containing:
  - `standings`: `ParticipantStanding[]`
  - `dayMoneyResults`: `DayMoneyRoundResult[]`
  - `wagerLedger`: `WagerSettlementSummary`
  - `playerDraftedByMap`: `Map<string, string[]>`
- **Internal Seams & Refactoring**: Refactor existing `calculateParticipantStandings`, `calculateDayMoneyWinners`, and `calculateWagerSettlement` to delegate to or compose within `ContestEngine`, maintaining backwards compatibility while migrating UI callers (`src/app/page.tsx`, `src/app/greedy/page.tsx`) to `evaluateContest`.

```typescript
export interface ContestEvaluationResult {
  standings: ParticipantStanding[];
  dayMoneyResults: DayMoneyRoundResult[];
  wagerLedger: WagerSettlementSummary;
  playerDraftedByMap: Map<string, string[]>;
}

export function evaluateContest(
  participants: Participant[],
  competitors: ESPNCompetitor[],
  contestConfig?: ContestConfig | null,
  eventStatus?: any
): ContestEvaluationResult;
```

## Testing Decisions

- Tests will target the external seam `evaluateContest` directly in `src/lib/__tests__/contestEngine.test.ts`.
- **Test Scenarios**:
  1. Full tournament scoring with active vs cut participants and penalty 999 score application.
  2. Tie-splitting on main payouts (e.g. 2-way tie for 2nd place splitting 2nd and 3rd payouts evenly).
  3. Day Money winner calculation across rounds 1–4 with low-round tie splitting.
  4. Wager settlement summary matching entry fees against total payouts distributed.
- Prior art: existing tests in `src/lib/__tests__/` and `src/components/__tests__/`.

## Out of Scope

- Changing UI visual themes or layout of leaderboards.
- Modifying Firestore document schemas.

## Further Notes

- Retain `createPlayerDraftedByMap`, `getGolferRoundStrokes`, and `getGolferRoundScoreToPar` as pure helper functions inside `src/lib/scoring.ts` or export them for isolated utility use.
