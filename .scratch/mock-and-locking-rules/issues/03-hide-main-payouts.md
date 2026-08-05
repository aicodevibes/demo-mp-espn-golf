# Ticket 03: Hide Main Payouts Until Finalized

Type: task
Status: resolved
Blocked by: 02

## What

In the client-facing standings views, hide payout amounts and prize badges until `contestConfig.isFinalized` is true.

## Acceptance Criteria

1. In [ParticipantStandings.tsx](file:///c:/Dev/demo-mp/src/components/ParticipantStandings.tsx):
   - In the Payout column, show `—` instead of the payout amount if `contestConfig.isFinalized` is false/missing.
   - Hide the inline projected prize badge (`$X prize`) next to participant names if `contestConfig.isFinalized` is false/missing.
2. Ensure standings rankings and calculations are still performed and displayed, just the projected payout amounts are hidden.
