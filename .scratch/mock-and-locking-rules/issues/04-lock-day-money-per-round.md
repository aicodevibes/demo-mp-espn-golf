# Ticket 04: Lock Day Money Per Completed Round

Type: task
Status: resolved
Blocked by: —

## What

In the client-facing Day Money list, show day money results only for rounds that are fully completed.

## Acceptance Criteria

1. A round `rd` is considered completed if the tournament is finished (`eventStatus.type.state === 'post'`) OR if the current round has advanced past `rd` (`eventStatus.period > rd`).
2. Pass `eventStatus` (which is `activeEvent?.status`) to [DayMoneyWinners.tsx](file:///c:/Dev/demo-mp/src/components/DayMoneyWinners.tsx) as a prop.
3. In `DayMoneyWinners`, if the round is not complete:
   - Hide the names of winners and their split payout amounts.
   - Render the pending state (`"Round in progress / pending"`).
