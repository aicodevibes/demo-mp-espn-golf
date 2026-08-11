# Spec: Tournament Dashboard UI & Visual Cleanups

## Problem Statement

The current tournament dashboard contains redundant badge indicators, unnecessary dollar amount pills, cluttering icons, inconsistent color themes on secondary views (Greedy Bet page), and financial calculations in the Wager Settlement table that lack explicit entry fee breakdown context.

## Solution

Streamline the user interface across the top header, scorecard matrix, overall standings, live activity feed, wager settlement ledger, and greedy bet page. Eliminate visual clutter, align theme colors with the primary design system, adjust component layouts to emphasize readability, and add an entry fee column so financial net balances are clearly explained.

## User Stories

1. As a tournament participant, I want a clean top header without distracting icon boxes, so that navigation is clear and unobstructed.
2. As a tournament participant, I want the scorecard section header to clearly state "[Player Name]'s Scorecard", so that I know which golfer's round matrix I am viewing.
3. As a tournament spectator, I want the Overall Standings table to focus on positions and scores without cluttering dollar badges or redundant payout columns, so that tournament standings are easier to read.
4. As a live spectator, I want the Live Activity Feed to have a clean header without redundant "Live Feed" badges, so that the feed controls and event items stand out.
5. As a participant checking wager settlements, I want the "Final Winnings Calculation Locked" notice positioned at the bottom of the ledger component, so that the settlement table takes primary visual priority.
6. As a participant checking wager settlements, I want an Entry Fee column in the settlement table, so that I can easily verify how Total Earnings minus Entry Fee equals Net Profit/Loss.
7. As a tournament participant visiting the Greedy Side-Bet page, I want top-right navigation buttons and page styling to align with the rest of the application's clean design system without aggressive gradients or yellow/amber themes, so that the visual theme feels cohesive.

## Implementation Decisions

- **Header Component**:
  - Remove the brand trophy icon container from the title area.
  - Re-style the Greedy Bet navigation button from amber/yellow to the project's standard `tertiary` accent token (`bg-tertiary/10 hover:bg-tertiary/20 text-tertiary border border-tertiary/30`).
- **Scorecard Matrix Component**:
  - Update title template to `{playerName}'s Scorecard`.
- **Participant Standings Component**:
  - Remove the top 4 position payout pills from the overall standings section header.
  - Remove the `PAYOUT` table header and corresponding table body cells.
  - Update the cut line table row span (`colSpan`) to match the reduced column count.
- **Live Activity Feed Component**:
  - Remove the "Live Feed" badge pill from the card header right slot.
- **Wager Settlement Ledger Component**:
  - Move the pre-final notice container ("Final Winnings Calculation Locked") to the bottom of the ledger layout, below the settlement table.
  - Insert an `Entry Fee` column between `Participant` and `Main Prize` in the settlement table header and body.
- **Greedy Bet Page**:
  - Replace the gradient hero banner background with standard solid surface container styling (`bg-surface-container-low border border-outline-variant`).
  - Replace amber/yellow badges and accent highlights with standard theme tokens (`tertiary`, `surface-container-high`).

## Testing Decisions

- **Testing Philosophy**: Tests focus strictly on visible component output, table structure, and header text contracts.
- **Seams Tested**:
  - Component-level render tests via Vitest & React Testing Library (`src/components/__tests__/`).
  - Assertions will verify presence/absence of UI elements (no trophy icon, no "Live Feed" badge, updated scorecard title, Entry Fee column presence, correct row counts and colSpans).
- **Prior Art**: Existing component test suites `Header.test.tsx`, `LiveActivityFeed.test.tsx`, and `ParticipantStandings` logic in `scoring.test.ts` / `settlement.test.ts`.

## Out of Scope

- Changes to underlying scoring, tiebreaking, 4th golfer replacement logic, or settlement calculation algorithms in `lib/scoring.ts` or `lib/settlement.ts`.
- Backend or API changes to ESPN endpoints or Firestore schema.

## Further Notes

- All color updates use existing Tailwind v4 CSS design tokens (`surface-container-low`, `tertiary`, `on-surface`, `outline-variant`).
