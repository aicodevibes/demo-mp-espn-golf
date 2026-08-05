# Three-Tier Leaderboard Refactor

## Destination

Restructure the live tournament leaderboards on the main dashboard into three dedicated components/views:
1. **Top 10 Leaderboard**: Displays the top 10 tournament leaders, highlighting which participant drafted each player (if any).
2. **Drafted Players Leaderboard**: Displays all remaining drafted golfers across the 12 participants who are outside the top 10.
3. **Full Field Leaderboard**: Displays the rest of the tournament field at the bottom of the page.

## Notes

- **Domain**: Golf Tournament Leaderboard & Participant Roster Tagging
- **Key Skills**: `/domain-modeling`, `/codebase-design`
- **Primary Files**:
  - `src/components/Top10Leaderboard.tsx` (or enhanced `LiveLeaderboard.tsx`)
  - `src/components/DraftedPlayersLeaderboard.tsx`
  - `src/components/FullFieldLeaderboard.tsx`
  - `src/app/page.tsx`

## Decisions so far

- [Ticket 01: Top 10 Leaderboard Component](file:///c:/Dev/demo-mp/.scratch/three-tier-leaderboard-structure/issues/01-top-10-leaderboard-component.md) — Built `Top10Leaderboard` displaying top 10 tournament leaders with participant drafting badges (e.g. `Drafted by Pat`).
- [Ticket 02: Drafted Players Leaderboard Component](file:///c:/Dev/demo-mp/.scratch/three-tier-leaderboard-structure/issues/02-drafted-players-leaderboard-component.md) — Built `DraftedPlayersLeaderboard` showing all other drafted golfers outside the top 10.
- [Ticket 03: Full Field Leaderboard Component](file:///c:/Dev/demo-mp/.scratch/three-tier-leaderboard-structure/issues/03-full-field-leaderboard-component.md) — Built `FullFieldLeaderboard` rendering complete searchable tournament field with cut line.
- [Ticket 04: Dashboard Leaderboard Layout Assembly](file:///c:/Dev/demo-mp/.scratch/three-tier-leaderboard-structure/issues/04-dashboard-leaderboard-layout-assembly.md) — Assembled 3 leaderboard components into `src/app/page.tsx`.

- **Participant Badge Layout**: How the drafted participant's name (e.g., "Pat", "Greg") is styled alongside golfer names in the Top 10 row.
- **Ties & Top 10 Boundary**: Handling ties at rank #10 (whether Top 10 strictly cuts at 10 rows or includes ties).

## Out of scope

- Changing how ESPN leaderboard API fetches or parses data.
- Modifying participant standing calculations or day money rules.
