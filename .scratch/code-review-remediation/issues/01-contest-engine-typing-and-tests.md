# 01 — Strongly type ContestEngine eventStatus and expand unit tests

**What to build:** Replace `eventStatus?: any` with `eventStatus?: ESPNEventStatus | null` in `src/lib/contestEngine.ts`. Expand `src/lib/__tests__/contestEngine.test.ts` to assert 999 penalty strokes for cut golfers on R3/R4 and payout tie-splitting.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] Import `ESPNEventStatus` or `ESPNEvent['status']` in `src/lib/contestEngine.ts`
- [ ] Add test for R3/R4 cut penalty (999 strokes) in `src/lib/__tests__/contestEngine.test.ts`
- [ ] Add test for main payout tie-splitting in `src/lib/__tests__/contestEngine.test.ts`
