# 03 — Deduplicate synthetic competitor creation and run full verification

**What to build:** Extract `createSyntheticCompetitor` helper to remove duplicated fallback competitor creation logic in `src/app/page.tsx`. Run full test suite, typecheck, and build validation.

**Blocked by:** 02 — Migrate WagerSettlementLedger and greedy/page.tsx to evaluateContest

**Status:** resolved

- [x] Extract synthetic competitor creation helper
- [x] Run `npx tsc --noEmit`
- [x] Run `npx vitest run`
- [x] Run `npm run build`

