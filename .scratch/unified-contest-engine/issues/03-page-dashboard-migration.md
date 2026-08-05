# 03 — Migrate page.tsx and greedy/page.tsx dashboard callers to evaluateContest

**What to build:** Simplify dashboard page state in `src/app/page.tsx` and `src/app/greedy/page.tsx` by using a single call to `evaluateContest()`, replacing separate calls to `calculateParticipantStandings`, `calculateDayMoneyWinners`, `createPlayerDraftedByMap`, and `calculateWagerSettlement`.

**Blocked by:** 02 — Refactor scoring.ts and settlement.ts to delegate to ContestEngine

**Status:** resolved

- [x] Update `src/app/page.tsx` to call `evaluateContest()` inside a single memoized calculation
- [x] Pass `contestEvaluation.standings`, `contestEvaluation.dayMoneyResults`, `contestEvaluation.wagerLedger`, and `contestEvaluation.playerDraftedByMap` to dashboard components
- [x] Update `src/app/greedy/page.tsx` to use `evaluateContest()` if applicable

