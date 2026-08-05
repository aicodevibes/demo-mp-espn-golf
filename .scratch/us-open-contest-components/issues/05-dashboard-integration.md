# Ticket 05: Dashboard Integration & Page Layout Update

Type: prototype
Status: resolved
Blocked by: 02, 03, 04

## Question

How should `src/app/page.tsx` be updated to integrate `DayMoneyWinners` and `ParticipantStandings` alongside the existing Live Leaderboard and Hero Watchlist, wired up to live Firestore/ESPN data with fallback seed defaults?

## Answer

Integrated `DayMoneyWinners` and `ParticipantStandings` onto the main dashboard page (`src/app/page.tsx`), wired up to live Firestore `useParticipants` hook and `lib/scoring.ts` calculation engine.

