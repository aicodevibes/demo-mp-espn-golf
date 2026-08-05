# Ticket 03: Scoring Engine — Event-Agnostic, Remove approxPar

Type: task
Status: resolved
Blocked by: 01

## What

Remove the `approxPar = 70` hardcode from `scoring.ts`. Replace it with per-round score-to-par derived from ESPN's own cumulative `score` deltas. Update both `calculateParticipantStandings` and `calculateDayMoneyWinners` to accept a `ContestConfig` parameter so payout amounts come from config, not constants.

## The Core Insight

ESPN's `score` field on each competitor (e.g. `"-7"`, `"E"`, `"+3"`) IS the cumulative score-to-par — not raw strokes. We don't need par at all to display relative scores.

Per-round score-to-par display string:
```
Round N relative = cumulative_after_N - cumulative_after_(N-1)
```

Example: If a golfer is `-2` after R1 and `-5` after R2, their R2 score-to-par = `-5 - (-2)` = `-3`.

ESPN provides this via `competitor.score` at the end of each round. For rounds not yet played, this field is omitted or `"E"`.

The `linescores[].value` is raw strokes — **only needed for the participant team daily sum** (best 2 of 3). The *display string* for each golfer uses cumulative score deltas, not strokes.

## Acceptance Criteria

1. `approxPar = 70` removed from `scoring.ts`
2. New helper `getGolferRoundScoreToPar(comp, round): number | null` — computes score-to-par for round N as delta of cumulative scores (requires round N and round N-1 linescores with `value` fields or the cumulative `score` string)
3. `roundScoreDisplayStr` computed from score-to-par deltas, showing `"C"` for cut rounds, `"E"` for even, `"+n"`/`"-n"` for relative score
4. `calculateParticipantStandings(participants, competitors, contestConfig, eventStatus?)` — `mainPayouts` sourced from `contestConfig.mainPayouts`
5. `calculateDayMoneyWinners(participants, competitors, contestConfig, eventStatus?)` — `dayMoneyPool` sourced from `contestConfig.dayMoneyPool`
6. Default `ContestConfig` fallback values (`[600, 320, 180, 100]` and `75`) used when `contestConfig` is null — so page renders correctly before Firestore loads
7. All existing unit tests in `scoring.test.ts` still pass (update test to pass a mock `ContestConfig`)
8. New unit test: `getGolferRoundScoreToPar` returns correct per-round delta given cumulative scores

## Files Touched

- `src/lib/scoring.ts` — MODIFY
- `src/lib/__tests__/scoring.test.ts` — MODIFY (add config param, add new test)
