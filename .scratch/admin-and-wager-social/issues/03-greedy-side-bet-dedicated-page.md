Title: Dedicated /greedy Page for Greedy Side Bet
Type: task
Status: resolved
Blocked by: 

## Question

How to construct a dedicated `/greedy` route and component for the Greedy side bet that displays greedy participant selections, greedy golfer performance, side-bet standings, and restricts view access to authorized participants?

## Answer

1. Created `calculateGreedyStandings` in `src/lib/scoring.ts` & `GreedyStanding` interface in `src/types/contest.ts`, evaluating each participant's designated 1 Greedy Golfer independently of main contest cut status. Added TDD unit test in `src/lib/__tests__/scoring.test.ts`.
2. Created dedicated route page [`src/app/greedy/page.tsx`](file:///c:/Dev/demo-mp/src/app/greedy/page.tsx):
   - Participant access gate with selection verification.
   - Live Greedy Leaderboard featuring golfer headshots, R1–R4 round scores, cumulative score-to-par, and 🥇/🥈/🥉 rank badges.
3. Updated `src/components/Header.tsx` to feature a direct "Greedy Bet" navigation button.
