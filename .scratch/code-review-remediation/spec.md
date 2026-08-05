# Spec: Code Review Remediation & Deep Seam Completion

## Problem Statement

The code review identified 5 Standards issues and 4 Spec issues in the initial `ContestEngine` refactor:
1. Explicit `any` type usage on `eventStatus` parameter in `src/lib/contestEngine.ts`.
2. Unmigrated UI callers (`src/app/greedy/page.tsx` and `<WagerSettlementLedger />` component in `src/app/page.tsx`).
3. Missing unit test assertions for R3/R4 cut penalty scores (999 strokes) and main payout tie-splitting.
4. Delegation loop overhead where `evaluateContest` delegates to four separate functions instead of unifying calculation passes.

## Solution

Remediate all code review findings across both Standards and Spec axes:
- Strongly type `eventStatus` using `ESPNEvent['status']` or `ESPNEventStatus`.
- Complete the migration of `<WagerSettlementLedger />` and `src/app/greedy/page.tsx` to consume pre-computed `evaluateContest()` state.
- Expand unit tests in `src/lib/__tests__/contestEngine.test.ts` with explicit cut penalty (999) and tie-split assertions.
- Extract repeated synthetic competitor fallback creation into a clean helper function in `src/lib/espn/summary.ts`.

## User Stories

1. As a contest participant viewing the Greedy Side Bet or Wager Settlement Ledger, I want calculations to be powered by the unified `ContestEngine` seam so that score, tie-break, and payout data never mismatch main standings.
2. As a developer maintaining the codebase, I want strict TypeScript typing on all `ContestEngine` parameters (`eventStatus`) so that type-checking catches invalid event statuses at compile time.
3. As a developer writing tests, I want comprehensive unit tests covering 999 cut penalties and tie-split payouts directly at the `evaluateContest` seam.

## Implementation Decisions

- **Parameter Typing**: Replace `eventStatus?: any` with `eventStatus?: ESPNEventStatus | null` in `src/lib/contestEngine.ts`.
- **WagerSettlementLedger Component Prop Seam**: Update `WagerSettlementLedger` props to accept pre-computed `wagerLedger: WagerSettlementSummary` instead of re-calculating from raw `participants` and `competitors`.
- **Greedy Page Seam**: Update `src/app/greedy/page.tsx` to call `evaluateContest()` and consume `contestEvaluation.greedyStandings`.
- **Synthetic Competitor Helper**: Extract `createSyntheticCompetitor(playerId, displayName)` helper function to eliminate duplicated fallback object creation in `src/app/page.tsx`.

## Testing Decisions

- **Test Seam**: `evaluateContest` in `src/lib/__tests__/contestEngine.test.ts`.
- **New Test Cases**:
  1. Verify cut golfers receive `999` penalty strokes on R3 and R4 in `draftedGolferDetails`.
  2. Verify 2-way tie for 2nd place splits 2nd ($320) and 3rd ($180) payouts evenly ($250 each).
- Prior art: existing tests in `src/lib/__tests__/contestEngine.test.ts` and `src/lib/__tests__/scoring.test.ts`.

## Out of Scope

- Changing Firestore database security rules.
- Redesigning visual themes or Tailwind CSS colors.

## Further Notes

- All changes will be verified with `npx tsc --noEmit`, `npx vitest run`, and `npm run build`.
