# 01 — Build ContestEngine module seam and evaluateContest() with unit tests

**What to build:** Create `src/lib/contestEngine.ts` exposing `evaluateContest(participants, competitors, contestConfig, eventStatus)`. It computes participant standings, Day Money winners, drafted player lookup maps, and wager settlement summaries in a single pass. Back it with unit tests in `src/lib/__tests__/contestEngine.test.ts`.

**Blocked by:** None — can start immediately

**Status:** resolved

- [x] Create `ContestEvaluationResult` interface and `evaluateContest` export in `src/lib/contestEngine.ts`
- [x] Implement atomic computation of standings, day money, player maps, and net wager balances
- [x] Write Vitest unit test suite covering ties, cut penalty scores, day money splitting, and net pool balances

