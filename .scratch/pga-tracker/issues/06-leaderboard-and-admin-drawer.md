# 06 — Live Event Leaderboard & Admin Management Drawer

**What to build:** Live tournament leaderboard sidebar and an admin management drawer (rendered only when `isAdmin` is true) allowing `aicodevibes@gmail.com` to search/select active PGA events and add/remove tracked golfers.

**Blocked by:** 03 — Firestore Configuration Store & Security Rules, 04 — Tracked Players Summary Hero Cards Component

**Status:** ready-for-agent

- [x] `LiveLeaderboard` sidebar table displaying Position, Player Name, Today's Score, Thru Status, and Total Score
- [x] Active tournament header banner with event name, course location, and status badge
- [x] `AdminManagementDrawer` component gated strictly to `isAdmin === true`
- [x] Tournament selector dropdown allowing the admin to switch active PGA tournaments
- [x] Player search & add/remove toggle control for custom tracking roster

