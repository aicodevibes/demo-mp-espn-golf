# Wayfinder Map: US Open Contest Components (Day Money & Overall Standings)

## Destination

Build two new Apex Links Precision-styled components—[DayMoneyWinners.tsx](file:///c:/Dev/demo-mp/src/components/DayMoneyWinners.tsx) (4-day daily low score prize tracker with $75 pool tie-splitting) and [ParticipantStandings.tsx](file:///c:/Dev/demo-mp/src/components/ParticipantStandings.tsx) (12-participant contest leaderboard tracking best 2 of 3 drafted golfer daily scores, cut handling, and $600/$320/$180/$100 payout allocations)—supported by a clean scoring engine in [lib/scoring.ts](file:///c:/Dev/demo-mp/src/lib/scoring.ts), Firestore participant schema & rules, and seed data matching `theopen.losinger.net` (Pat, Greg, Dereck, Robbie, Clay, Billy Fred, Roby, Garis, Bruce, Jim, Cole, Scott).

## Notes

- **Domain:** Contest Standings / Payout Rules / Day Money Tracker
- **Rules Doc:** [rulesdescriptions.md](file:///c:/Dev/demo-mp/rulesdescriptions.md)
- **Reference Site:** https://theopen.losinger.net/
- **Participants (12):** Pat, Greg, Dereck, Robbie, Clay, Billy Fred, Roby, Garis, Bruce, Jim, Cole, Scott
- **Prize Allocation:**
  - 1st: $600.00 | 2nd: $320.00 | 3rd: $180.00 | 4th: $100.00
  - Day Money: $75.00 / day (Days 1–4, split equally on ties among drafted player owners)

## Decisions so far

- [01-contest-types-scoring-engine.md](file:///c:/Dev/demo-mp/.scratch/us-open-contest-components/issues/01-contest-types-scoring-engine.md) — Implemented `types/contest.ts` & `lib/scoring.ts` for best 2 of 3 daily scoring, Day Money $75 tie splits, and payout allocations.
- [02-participants-seed-data-firestore.md](file:///c:/Dev/demo-mp/.scratch/us-open-contest-components/issues/02-participants-seed-data-firestore.md) — Configured Firestore rules for `/participants` and created `seedData.ts` matching `theopen.losinger.net`.
- [03-day-money-winners-component.md](file:///c:/Dev/demo-mp/.scratch/us-open-contest-components/issues/03-day-money-winners-component.md) — Built `DayMoneyWinners.tsx` 4-day prize card grid with tie-split payout calculations.
- [04-overall-standings-component.md](file:///c:/Dev/demo-mp/.scratch/us-open-contest-components/issues/04-overall-standings-component.md) — Built `ParticipantStandings.tsx` 12-participant standings table with CUT badges, R1–R4 daily scores, and Top 4 payout badges.
- [05-dashboard-integration.md](file:///c:/Dev/demo-mp/.scratch/us-open-contest-components/issues/05-dashboard-integration.md) — Integrated `DayMoneyWinners` and `ParticipantStandings` into `src/app/page.tsx`.






## Not yet specified

- Greedy Side-Game standalone dashboard component (future phase)
- Finalize Scorecard Playoff Server Action UI button (future phase)

## Out of scope

- Modifying core ESPN live score fetching API endpoints
