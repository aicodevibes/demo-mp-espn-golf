# 02 — Migrate WagerSettlementLedger and greedy/page.tsx to evaluateContest

**What to build:** Update `WagerSettlementLedger.tsx` component to accept pre-computed `wagerLedger: WagerSettlementSummary` prop. Pass `wagerLedger={contestEvaluation.wagerLedger}` in `src/app/page.tsx`. Migrate `src/app/greedy/page.tsx` to use `evaluateContest()`.

**Blocked by:** 01 — Strongly type ContestEngine eventStatus and expand unit tests

**Status:** resolved

- [x] Update `WagerSettlementLedger.tsx` props interface and implementation
- [x] Pass `wagerLedger` in `src/app/page.tsx`
- [x] Migrate `src/app/greedy/page.tsx` to `evaluateContest()`

