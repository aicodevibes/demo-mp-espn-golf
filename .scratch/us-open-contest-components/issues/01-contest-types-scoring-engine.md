# Ticket 01: Contest Types & Centralized Scoring Engine

Type: task
Status: resolved

## Question

How should we structure `src/types/contest.ts` and `src/lib/scoring.ts` to implement the rules from `rulesdescriptions.md` (calculating best 2 of 3 daily golfer scores, 999 cut penalties for Day 3 & 4, Day Money $75 tie-splitting, and overall standings sorting)?

## Answer

Created `src/types/contest.ts` with `Participant`, `ParticipantStanding`, `DayMoneyRoundResult` interfaces. Implemented `calculateParticipantStandings` and `calculateDayMoneyWinners` in `src/lib/scoring.ts` following all rules from `rulesdescriptions.md`.

