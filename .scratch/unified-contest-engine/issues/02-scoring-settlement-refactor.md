# 02 — Refactor scoring.ts and settlement.ts to delegate to ContestEngine

**What to build:** Refactor `src/lib/scoring.ts` and `src/lib/settlement.ts` so they delegate to `evaluateContest()` in `src/lib/contestEngine.ts` for top-level contest calculations while preserving standalone utility exports.

**Blocked by:** 01 — Build ContestEngine module seam and evaluateContest() with unit tests

**Status:** resolved

- [x] Update `calculateParticipantStandings` and `calculateDayMoneyWinners` in `src/lib/scoring.ts` to delegate to `evaluateContest`
- [x] Update `calculateWagerSettlement` in `src/lib/settlement.ts` to delegate to `evaluateContest`
- [x] Ensure all pre-existing tests in `src/lib/__tests__/` pass cleanly

