# Wayfinder Map: Mock Testing & Payout Locking Rules

## Destination

Support mock roster auto-assignment from the active ESPN field, and restrict payout/day money visibility rules (hide overall payouts/badges until finalized, lock Day Money per completed round).

## Notes

- **Domain:** Contest Payout Locking / Roster Mocking
- **Rules Doc:** [rulesdescriptions.md](file:///c:/Dev/demo-mp/rulesdescriptions.md)

## Decisions so far

_(none yet — tickets are open)_

## Tickets

- [01-auto-assign-rosters.md](file:///c:/Dev/demo-mp/.scratch/mock-and-locking-rules/issues/01-auto-assign-rosters.md) — Add "Auto-Assign Field Golfers" button in Admin UI to assign 3 unique field golfers to all 12 participants.
- [02-config-finalization-flag.md](file:///c:/Dev/demo-mp/.scratch/mock-and-locking-rules/issues/02-config-finalization-flag.md) — Extend `ContestConfig` type and database structure with `isFinalized: boolean`, and add admin toggle.
- [03-hide-main-payouts.md](file:///c:/Dev/demo-mp/.scratch/mock-and-locking-rules/issues/03-hide-main-payouts.md) — Hide payout columns and badges from client view unless `contestConfig.isFinalized` is true.
- [04-lock-day-money-per-round.md](file:///c:/Dev/demo-mp/.scratch/mock-and-locking-rules/issues/04-lock-day-money-per-round.md) — Hide Day Money details (winners and split payouts) in the UI for a round until that round is completed.

## Not yet specified

- Playoff scorecard calculations finalization (future phase)

## Out of scope

- Mocking/faking ESPN leaderboard response payloads directly
