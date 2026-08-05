# 02 — Year-Round Event Selector & Empty Field Handling

**What to build:** Group current season PGA Tour events in `AdminManagementDrawer.tsx` into 3 categorized optgroups (**🟢 Live Event**, **🏁 Past Events**, **📅 Upcoming Events**) with dates. Render informative empty state cards across the Hero Grid & Leaderboard when future events have empty competitor arrays (`competitors = []`).

**Blocked by:** 01 — Player Status Domain Helper.

**Status:** resolved

- [x] `AdminManagementDrawer.tsx` renders categorized event dropdown optgroups.
- [x] Future events with `competitors = []` display "⚪ Tournament Scheduled (Field Not Yet Released)" empty state.
- [x] No JavaScript runtime errors when selecting future events without players.

