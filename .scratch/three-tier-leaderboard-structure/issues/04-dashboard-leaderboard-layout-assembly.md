# Ticket 04: Dashboard Leaderboard Layout Assembly

Type: task
Status: resolved
Blocked by: 01, 02, 03

## Question

How should `src/app/page.tsx` assemble the three leaderboard components (`Top10Leaderboard`, `DraftedPlayersLeaderboard`, `FullFieldLeaderboard`) into the main dashboard grid?

## Answer

Updated `src/app/page.tsx` grid layout: `Top10Leaderboard` & `DraftedPlayersLeaderboard` stack alongside `ScorecardMatrix` in Section 3, and `FullFieldLeaderboard` is rendered full-width in Section 4 above `DayMoneyWinners`.

