# Dashboard Participant View & Auth Refactor

## Destination

Clean up main page auth (restrict admin login strictly to `/admin`), introduce a 12-Participant view selector to filter the hero Watchlist grid to the selected participant's 3 drafted golfers (with click-to-view round scorecard integration), and move the Day Money section to the bottom of the main dashboard.

## Notes

- **Domain**: Golf Contest Dashboard & Participant Watchlists
- **Key Skills**: `/domain-modeling`, `/codebase-design`
- **Primary Code Locations**:
  - `src/components/Header.tsx`
  - `src/app/page.tsx`
  - `src/components/TrackedPlayerHeroGrid.tsx`
  - `src/components/ScorecardMatrix.tsx`

## Decisions so far

- [Ticket 01: Header Auth Cleanup](file:///c:/Dev/demo-mp/.scratch/dashboard-participant-view-refactor/issues/01-remove-header-login-button.md) — Removed Google Sign-In button from main header; added clean `/admin` link.
- [Ticket 02: Participant Watchlist Selector](file:///c:/Dev/demo-mp/.scratch/dashboard-participant-view-refactor/issues/02-participant-watchlist-selector.md) — Added Participant View dropdown to Section 1 so viewers can select any of the 12 participants and see their 3 drafted golfers.
- [Ticket 03: Golfer Click-to-Scorecard Integration](file:///c:/Dev/demo-mp/.scratch/dashboard-participant-view-refactor/issues/03-connect-golfer-click-to-scorecard.md) — Connected golfer selection across Hero Watchlist Grid and Standings table directly to `ScorecardMatrix`.
- [Ticket 04: Move Day Money Winners to Bottom](file:///c:/Dev/demo-mp/.scratch/dashboard-participant-view-refactor/issues/04-reorder-day-money-to-bottom.md) — Relocated `DayMoneyWinners` section to the bottom of `src/app/page.tsx`.

- **Selection Persistence**: Whether to persist selected participant in `localStorage` or URL query param (`?participant=pat`).
- **Default Participant State**: Auto-selecting the 1st participant vs showing "Select Participant" prompt when empty.

## Out of scope

- Individual participant password/OAuth logins (participants simply pick their name from a dropdown; auth is for pool Admin only).
- Altering Firestore data structure for `Participant` or `ContestConfig`.
