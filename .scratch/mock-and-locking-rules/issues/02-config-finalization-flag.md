# Ticket 02: ContestConfig isFinalized Toggle

Type: task
Status: resolved
Blocked by: —

## What

Add `isFinalized?: boolean` to the `ContestConfig` type interface in `src/types/contest.ts`.
In `/admin` Event Selector & Config panel:
1. Add a checkbox: "Finalize Standings & Payouts".
2. Bind this checkbox to a local state.
3. Include it in the `Save Configuration` action, which writes to `events/{eventId}/contestConfig`.
4. Ensure the default event configuration created by `setActiveEvent` initializes `isFinalized: false`.
