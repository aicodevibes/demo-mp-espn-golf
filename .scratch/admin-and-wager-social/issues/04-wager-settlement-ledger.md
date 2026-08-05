Title: Wager Settlement Ledger & Pot Settings
Type: task
Status: resolved
Blocked by: 

## Question

How to configure entry fees, main payouts, day money pools, and payment status checkmarks in Admin, and present a final Wager Settlement Ledger on the dashboard that remains locked until the tournament is marked final?

## Answer

1. Extended `ContestConfig` and `Participant` types in `src/types/contest.ts` with `entryFee`, `hasPaidEntry`, `hasPaidGreedy`, and defined `ParticipantSettlement` and `WagerSettlementSummary` interfaces.
2. Created Wager Settlement Engine in `src/lib/settlement.ts` with complete TDD unit tests in `src/lib/__tests__/settlement.test.ts`. Calculates participant net profit/loss (`totalWinnings - entryFee`), pot audit balancing ($ collected vs $ distributed), and payment statuses.
3. Updated Admin Management Dashboard in `src/app/admin/page.tsx`:
   - Added Entry Fee ($), Day Money Pool ($/rd), and Main Payout Breakdown form inputs.
   - Added interactive `Paid ✅` / `Unpaid ⏳` payment checkmark toggles for each participant roster row.
4. Created `src/components/WagerSettlementLedger.tsx` and integrated onto the main tournament dashboard (`src/app/page.tsx`):
   - Renders a sleek amber 🔒 locked glassmorphic card when `!isFinalized`.
   - Unlocks full settlement table with summary metrics (Total Collected, Main Payouts, Day Money, Net Pool Balance audit, Participant Net Profit/Loss) when `isFinalized === true`.

