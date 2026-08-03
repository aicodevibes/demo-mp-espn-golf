# 03 — Web-Optimized Image Rendering Across UI Components

**What to build:** Replace HTML `<img>` elements in `TrackedPlayerHeroGrid.tsx`, `ScorecardMatrix.tsx`, `LiveLeaderboard.tsx`, and `AdminManagementDrawer.tsx` with the optimized `<GolferHeadshot />` component, passing `priority` loading to hero cards.

**Blocked by:** 02 — Firestore Player Directory Auto-Sync Engine.

**Status:** ready-for-agent

- [ ] All player headshots across the application render using `<GolferHeadshot />`.
- [ ] Hero cards use priority image loading to optimize LCP.
- [ ] `npm run build` compiles with 0 TypeScript or lint errors.
