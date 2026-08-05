Title: Dedicated /greedy Page for Greedy Side Bet
Type: task
Status: resolved
Blocked by: 

## Question

How to construct a dedicated `/greedy` route and component for the Greedy side bet that displays greedy participant selections, greedy golfer performance, side-bet standings, and restricts view access to authorized participants?

## Answer

1. Created dedicated `/greedy` App Router page in `src/app/greedy/page.tsx`.
2. Loaded active event config, participant roster, and live ESPN tournament competitors.
3. Computed side-bet standings using `calculateGreedyStandings` from `src/lib/scoring.ts`.
4. Rendered hero stat cards (Total Purse, Current Leader, Contenders), detailed 4-round score matrix per greedy golfer with player headshots, and winner-take-all pot allocation ($50/participant).
5. Added "Greedy Bet" header navigation button in `src/components/Header.tsx`.
