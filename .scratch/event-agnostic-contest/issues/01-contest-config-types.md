# Ticket 01: ContestConfig Type + Participant Greedy Extension

Type: task
Status: resolved
Blocked by: —

## What

Add the `ContestConfig` TypeScript interface to `src/types/contest.ts` and extend `Participant` with the Greedy Game fields. This is the type foundation everything else depends on — no Firestore reads or scoring changes, just the shape.

## Seam

`src/types/contest.ts` — public exported interfaces consumed by `firestore.ts`, `scoring.ts`, and components.

## Acceptance Criteria

1. `ContestConfig` interface exists with:
   - `espnEventId: string`
   - `eventName: string`
   - `season: number`
   - `mainPayouts: number[]` — e.g. `[600, 320, 180, 100]`
   - `dayMoneyPool: number` — e.g. `75`
   - `coursePar: number | null` — nullable until extracted from ESPN
   - `createdAt?: any`
   - `updatedAt?: any`
   - `updatedBy?: string`

2. `Participant` interface gains (if not already present):
   - `greedyPlayerId?: string` — ESPN athlete ID of the participant's greedy game golfer

3. `DraftedGolferStatus` retains all existing fields (no removals)

4. `npx tsc --noEmit` passes clean

## Files Touched

- `src/types/contest.ts` — MODIFY

## TDD Note

Types-only ticket — no runtime behavior to test. Verify via `tsc --noEmit` only.
