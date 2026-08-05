# Wayfinder Map: Admin Auth, Comma-Delimited Rosters, Greedy Page & Wager Features

## Destination

A unified Golf Tournament Wager App featuring:
1. Google Sign-In auth portal on `/admin` with role-based access.
2. Comma-delimited drafted player roster management in Admin (supporting 4th golfer cut replacements for Days 3 & 4).
3. Dedicated `/greedy` page for the Greedy side bet.
4. End-of-tournament Wager Settlement Ledger with payment checkmarks (unlocked on finalization).
5. Automated Live Social Activity Feed for tournament events.

## Notes

- Primary Framework: Next.js App Router (`src/app/`)
- Database & Auth: Firebase Auth & Cloud Firestore
- Styling: Tailwind CSS v4 & Lucide icons
- Relevant Skills: `domain-modeling`, `firebase-firestore`, `firebase-auth-basics`

## Decisions so far

- [Research ESPN Player Fuzzy Name & ID Matching](file:///c:/Dev/demo-mp/.scratch/admin-and-wager-social/issues/06-research-espn-player-name-matching.md) — Multi-tier name normalization (diacritics, shortName, last name, exact ID) in `src/lib/espn/golferMatcher.ts`.
- [Admin Google Auth Portal & Protected Route](file:///c:/Dev/demo-mp/.scratch/admin-and-wager-social/issues/01-admin-google-auth-portal.md) — Integrated inline Google Sign-In portal on `/admin` with dev fallback toggle and Access Denied UI for non-admin accounts.
- [Comma-Delimited Participant Roster Management in Admin](file:///c:/Dev/demo-mp/.scratch/admin-and-wager-social/issues/02-admin-comma-delimited-roster-management.md) — Implemented `golferMatcher.ts` fuzzy player matching, comma-delimited roster text inputs with live preview chips, 4th-golfer cut replacement support, and 1-click batch roster paste modal in `src/app/admin/page.tsx`.
- [Dedicated /greedy Page for Greedy Side Bet](file:///c:/Dev/demo-mp/.scratch/admin-and-wager-social/issues/03-greedy-side-bet-dedicated-page.md) — Built `calculateGreedyStandings` scoring adapter and dedicated [`src/app/greedy/page.tsx`](file:///c:/Dev/demo-mp/src/app/greedy/page.tsx) with participant access verification, gold/silver/bronze badges, independent cut tracking, and header link.
- [Wager Settlement Ledger & Pot Settings](file:///c:/Dev/demo-mp/.scratch/admin-and-wager-social/issues/04-wager-settlement-ledger.md) — Entry fee pot configuration, payment checkmarks, and end-of-tournament wager settlement view in `src/components/WagerSettlementLedger.tsx`.
- [Automated Live Social Activity Feed](file:///c:/Dev/demo-mp/.scratch/admin-and-wager-social/issues/05-automated-live-activity-feed.md) — Built `generateTournamentActivityEvents` in `src/lib/activityFeed.ts` and `src/components/LiveActivityFeed.tsx` for live tournament moments.

## Not yet specified

- Historical Tournament Archives & Season Standings across multiple events.
- Push/Mobile notifications for live score shifts during weekend play.

## Out of scope

- Interactive Draft Board / Snake Draft Room (admin roster text input preferred).
- Public chat / user message board (automated event feed only).
- Venmo/Zelle payment integration links on settlement ledger.
