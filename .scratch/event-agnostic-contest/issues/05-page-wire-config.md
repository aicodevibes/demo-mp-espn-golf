# Ticket 05: Wire ContestConfig + Per-Event Participants into page.tsx

Type: task
Status: resolved
Blocked by: 02, 03, 04

## What

Update `src/app/page.tsx` to:
1. Subscribe to `useContestConfig(activeEventId)` — replaces the hardcoded constants in score calculations
2. Pass `activeEventId` to `useParticipants(activeEventId)` — switches to the per-event subcollection
3. Pass `contestConfig` to `calculateParticipantStandings`, `calculateDayMoneyWinners`, and both display components

## Acceptance Criteria

1. `useContestConfig(activeEventId)` wired — when `activeEventId` is null/undefined, `contestConfig` is null and components show loading/default state
2. `useParticipants(activeEventId)` receives the active event ID — golfer names resolve from ESPN field for that specific event's roster
3. `calculateParticipantStandings(participants, competitors, contestConfig, eventStatus)` called with live `contestConfig`
4. `calculateDayMoneyWinners(participants, competitors, contestConfig, eventStatus)` called with live `contestConfig`
5. `<DayMoneyWinners contestConfig={contestConfig} ... />` prop threaded through
6. `<ParticipantStandings contestConfig={contestConfig} ... />` prop threaded through
7. No `approxPar`, no hardcoded `$600`, no `"US Open"` strings anywhere in `page.tsx`
8. `npx tsc --noEmit` clean; all unit tests pass
9. Dev server loads without errors — standings and day money sections render (may show seed fallback names if no Firestore data)

## Files Touched

- `src/app/page.tsx` — MODIFY
