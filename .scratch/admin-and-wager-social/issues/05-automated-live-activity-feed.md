Title: Automated Live Social Activity Feed
Type: task
Status: resolved
Blocked by: 

## Question

How to implement an automated live social activity feed on the main dashboard to broadcast key tournament contest moments (Day Money low-round winners, score moves, participant cut status changes)?

## Answer

1. Created `generateTournamentActivityEvents` in `src/lib/activityFeed.ts` to compute live tournament moments (Day Money winners, PGA Top 5 leaders, cut line alerts, fully active roster status).
2. Built `src/components/LiveActivityFeed.tsx` featuring an interactive filter bar (All, Day Money, Top Moves) and event cards with status badges.
3. Integrated `LiveActivityFeed` into main dashboard [`src/app/page.tsx`](file:///c:/Dev/demo-mp/src/app/page.tsx).
