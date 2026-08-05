Title: Comma-Delimited Participant Roster Management in Admin
Type: task
Status: resolved
Blocked by: 

## Question

How to update Admin roster management so admins can add/remove participants and edit drafted golfers using a comma-delimited text field (e.g. "Scottie Scheffler, Rory McIlroy, Xander Schauffele"), support cut replacements (adding a 4th golfer for Days 3 & 4), and resolve typed golfer names to ESPN athlete IDs?

## Answer

1. Created `src/lib/espn/golferMatcher.ts` providing diacritic-insensitive normalization (`Åberg` -> `aberg`), multi-tier matching (exact ID, display name, shortName, initial+last name, last name), and `parseCommaDelimitedGolfers`.
2. Re-exported matcher utilities from `src/lib/espn/index.ts`.
3. Updated Admin Management Dashboard in `src/app/admin/page.tsx`:
   - Added comma-delimited drafted golfers input field supporting 3 or 4 golfers (enabling 4th golfer cut replacement additions for Days 3 & 4).
   - Added real-time live golfer resolution preview chips showing matched vs unrecognized names with visual status badges.
   - Added a **Batch Paste Rosters** tool (`📋 Batch Paste Rosters`) allowing bulk pasting of multiple participant rosters in 1 click (e.g. `Pat: Scottie Scheffler, Rory McIlroy, Xander Schauffele`).
