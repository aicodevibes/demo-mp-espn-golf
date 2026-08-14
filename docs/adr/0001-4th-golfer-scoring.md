# Post-Cut 4th Golfer Assignment & Scoring Rules

## Status
Accepted

## Context
In our US Open draft contest, each participant drafts 3 golfers prior to Round 1. Following the Round 2 cut line, if a participant loses exactly 2 players (due to Missed Cut or WD), an Admin manually assigns a 4th golfer to their roster for the weekend rounds.

## Decision
1. **Roster Structure**: The participant's `draftedPlayerIds` array holds up to 4 player IDs, with index 3 designating the mid-tournament replacement player.
2. **Per-Round Score Calculations**: 
   - **Rounds 1 & 2**: The 4th golfer's scores are completely ignored for participant daily team scores and Day Money eligibility.
   - **Rounds 3 & 4**: Both active players' scores count towards the participant's daily score.
3. **Day Money Eligibility**: The 4th golfer is eligible for Day Money exclusively in Rounds 3 and 4.
4. **Elimination**: If a participant loses all 3 drafted golfers after R2, no 4th player is assigned and the participant is eliminated (`isCut: true`).
