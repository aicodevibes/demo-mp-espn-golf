# Master Specification: Year-Round Event Selector, Empty Field State & CUT/WD Badges

> *This spec was synthesized via `/to-spec` following user alignment.*

## Problem Statement

Currently, event switching in Admin Controls is basic and does not categorize events into Past, Live, and Upcoming. Additionally, future events with empty competitor arrays (`competitors = []`) show blank states. Lastly, golfers who miss the 36-hole cut (CUT) or withdraw (WD) are not visually distinguished with status badges or card treatment across the dashboard.

## Solution

1. **Year-Round Event Selector**: Group all current season PGA Tour events in `AdminManagementDrawer.tsx` into 3 categorized optgroups (**🟢 Live Event**, **🏁 Past Events**, **📅 Upcoming Events**) with formatted date ranges.
2. **Empty Field Handling**: Handle future events (`competitors = []`) with a clean empty state card across the Hero Grid & Leaderboard: **"⚪ Tournament Scheduled (Field Not Yet Released)"**.
3. **CUT / WD Status Logic & Badges**:
   - Update `@/lib/espn` (`getPlayerStatusInfo`) to identify CUT, WD, DQ, and MDF states.
   - Update `LiveLeaderboard.tsx` position column to render **`CUT`** / **`WD`** status badges.
   - Update `TrackedPlayerHeroGrid.tsx` to render muted card styling and **`✂️ Missed Cut`** / **`🚪 Withdrawn`** badges.
   - Update `ScorecardMatrix.tsx` to display status subheaders for cut/withdrawn players.

## User Stories

1. As an admin, I want to navigate backward to past events and forward to future events in the current season using a categorized dropdown with dates, so that I can inspect any tournament in the calendar.
2. As a site visitor, I want future events with empty player fields to display an informative "Field Not Yet Released" message, so that I know why player cards are not yet populated.
3. As a site visitor, I want golfers who missed the cut or withdrew to display clear status badges (CUT / WD) and muted card styling, so that non-finishing players are immediately distinguished.

## Implementation Decisions

- **Domain Helper**: Add `getPlayerStatusInfo(comp)` to `@/lib/espn` returning `{ isCut: boolean, isWD: boolean, isDQ: boolean, badgeLabel: string }`.
- **UI Components**:
  - `AdminManagementDrawer.tsx`: Categorized dropdown optgroups.
  - `TrackedPlayerHeroGrid.tsx`: Empty state card + CUT/WD card styling.
  - `LiveLeaderboard.tsx`: Empty state card + CUT/WD position pills.
  - `ScorecardMatrix.tsx`: CUT/WD header status text.

## Testing Decisions

- **Seam**: Public interface of `@/lib/espn` (`getPlayerStatusInfo`).
- **Automated Tests**: Vitest suite verifying CUT, WD, DQ status detection and empty competitor field handling.

---
*Triage Label*: `ready-for-agent`
