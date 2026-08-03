# Master Specification: Tournament Dates, Status Badges & Champion Playoff Trophy Logic

> *This spec was synthesized via `/to-spec` following user alignment.*

## Problem Statement

Currently, tournament dates and live status (Scheduled, In Progress, Final) are not displayed clearly across the UI. Furthermore, completed tournaments do not distinguish the single official PGA Tour Champion (including sudden-death playoff winners vs. runner-ups) with trophy iconography or gold hero card styling.

## Solution

1. **Tournament Dates & Status Badges**: Parse `startDate`, `endDate`, and `status.type.state` from ESPN API to render human-readable dates (e.g. "Jul 30 – Aug 2, 2026") and live status badges (**🟢 Live - Round 4**, **⚪ Scheduled**, **🏆 Final**) in the Header and Leaderboard.
2. **PGA Playoff & Winner Tie-Handling**: Identify single champion (`order === 1`, position `1`) and detect playoff scenarios. Display **🏆 Champion (Playoff)** for playoff winners and **2nd (Playoff)** for runners-up.
3. **Gold Champion Hero Card**: Apply gold crown border & gradient (`border-amber-400 bg-linear-to-b from-amber-950/60 to-slate-900`) and trophy badge to the champion's Hero Card.

## User Stories

1. As a site visitor, I want to see human-readable tournament dates (e.g. "Jul 30 – Aug 2, 2026") and live status badges in the header and leaderboard, so that I know the event timeframe and active state.
2. As a site visitor, I want the single tournament champion to display a gold 🏆 Champion trophy icon on the leaderboard when a tournament is Final, so that the winner is immediately clear.
3. As a site visitor, I want playoff victories to display **🏆 Champion (Playoff)** and runner-ups to display **2nd (Playoff)**, so that sudden-death playoff outcomes are accurately reflected.
4. As a site visitor, I want a tracked golfer who wins the tournament to display a Gold Crown Border & Gradient card on the Hero Grid, so that their victory is celebrated with premium visual styling.

## Implementation Decisions

- **Date Formatting Helper**: Create `formatEventDates(startDate, endDate)` returning e.g. "Jul 30 – Aug 2, 2026".
- **Playoff & Winner Detection**: Create `getWinnerStatus(comp, eventStatus, competitors)` helper evaluating position, order, and playoff indicators.
- **UI Components**:
  - Update `Header.tsx` to render dates and status badge.
  - Update `LiveLeaderboard.tsx` to render header status badge, trophy icon, and playoff badges.
  - Update `TrackedPlayerHeroGrid.tsx` to apply gold gradient styling and champion badge to winner.

## Testing Decisions

- **Seam**: Public interface of `formatEventDates` and `getWinnerStatus` helpers.
- **Automated Tests**: Vitest suite verifying date formatting, playoff winner identification, and runner-up tie handling.

## Out of Scope

- Historical tournament winner archives from past PGA seasons (focusing on active & selected tournament).

---
*Triage Label*: `ready-for-agent`
