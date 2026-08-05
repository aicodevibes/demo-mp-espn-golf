Title: Wager Settlement Ledger & Pot Settings
Type: task
Status: resolved
Blocked by: 

## Question

How to configure entry fees, main payouts, day money pools, and payment status checkmarks in Admin, and present a final Wager Settlement Ledger on the dashboard that remains locked until the tournament is marked final?

## Answer

1. Implemented `calculateWagerSettlement` in `src/lib/scoring.ts` & `ParticipantSettlement`, `WagerSettlementSummary` interfaces in `src/types/contest.ts`.
2. Updated Admin event config form in `src/app/admin/page.tsx` with Entry Fee ($), Day Money Pool ($), Main Payout Breakdown, and participant `Paid ✅` / `Unpaid ⏳` toggle checkmarks.
3. Created `src/components/WagerSettlementLedger.tsx` displaying entry fee totals, total main payouts distributed, day money distributed, and individual participant net earnings/loss ledgers. Enforced domain lock rule (locks final net calculations until tournament is marked final).
