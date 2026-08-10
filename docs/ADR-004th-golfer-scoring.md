# Architecture Decision Record (ADR): Post-Cut 4th Golfer Assignment & Scoring Rules

## Status
Accepted

## Context
In our US Open draft contest, each participant drafts 3 golfers prior to Round 1. 
Following the Round 2 cut line:
- If a participant has 0 active players remaining, they are Cut (`isCut: true`) and eliminated.
- If a participant loses **exactly 2 players** (due to Missed Cut or WD), an Admin manually assigns a **4th golfer** to their roster for the weekend rounds.

We need precise rules defining how this 4th golfer contributes to daily participant scores and Day Money calculations across all 4 rounds.

## Decision

1. **Roster Structure & 4th Golfer Identification**:
   - The participant's `draftedPlayerIds` array can hold up to 4 player IDs.
   - Any golfer at index 3 (the 4th player) is designated as the **mid-tournament replacement player**.

2. **Per-Round Score Calculations**:
   - **Rounds 1 & 2**: The 4th golfer's scores are **completely ignored** for participant daily team scores and Day Money eligibility. Only golfers in indices `[0, 1, 2]` contribute to R1 and R2.
   - **Rounds 3 & 4**: The 4th golfer becomes active for R3 and R4. Because the participant lost 2 players, their active roster consists of **1 remaining original golfer + 1 assigned 4th golfer = 2 active golfers total**. Therefore, **both active players' scores count** towards the participant's daily score for R3 and R4.

3. **Day Money Eligibility**:
   - The 4th golfer cannot win Day Money for R1 or R2.
   - The 4th golfer **is eligible** to win Day Money on R3 and R4 for the participant who owns them.

4. **Elimination Rules**:
   - If a participant loses all 3 drafted golfers after R2, no 4th player is assigned and the participant is marked as Cut (`isCut: true`).

5. **Admin Workflow**:
   - The Admin Control Panel will provide an interface allowing admins to manually assign a 4th golfer to any participant who has 2 Cut/WD players after R2.

## Consequences
- `lib/scoring.ts` will explicitly check golfer position index and round number during daily score aggregation and day money calculations.
- Display components (`ParticipantStandings`, `CompetitorRow`, `ScorecardMatrix`) will present the 4th golfer clearly, indicating that their R1/R2 scores are excluded (`N/A` or `-`).
- Fully consistent domain logic documented in `rulesdescriptions.md`.
