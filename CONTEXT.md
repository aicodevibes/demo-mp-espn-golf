# Texas-Florida Golf Majors Showdown - Domain Glossary

## Contest & Leaderboard Terms

### Participant Views & Watchlists
- **Top View**: The default hero watchlist view on the dashboard displaying the 1st through 4th field leaders in the live tournament leaderboard.
- **Participant Roster Watchlist**: A participant-specific hero view displaying the drafted golfers assigned to a selected contest participant.
- **Participant View Selector**: Top-level selector allowing users to switch between the default Top View and individual participant roster watchlists.
- **Overall Standings**: The primary contest leaderboard ranking pool participants by their cumulative team daily scores (best drafted golfer scores per round), displaying rank badges (1st–4th), prize payouts, per-round totals, and a 36-hole cut divider.
- **Top 10 Tournament Leaders**: Live PGA tournament field leaders, including all competitors tied at position T10 or higher.
- **Other Drafted Golfers**: In-field drafted pool golfers who are currently competing outside the top 10 positions.
- **Full PGA Field**: Comprehensive tournament field leaderboard with player search and a project cut line divider.
- **Field Leaderboard Evaluator**: Pure domain evaluation seam that categorizes competitors into Top 10 leaders (including ties), other drafted golfers, active field, and cut field lists in a single pass.

### Scoring & Financial Terms
- **Daily Score**: Sum of the top drafted golfer stroke scores for a participant in a single round.
- **Day Money**: Side pool prize awarded per round to the participant holding the lowest drafted golfer round score.
- **Wager Settlement Ledger**: Payout breakdown tracking entry fees collected, main prize distributions, day money earnings, and net balance settlements.

## Design & UI Theme System

### Surface Hierarchy
The layered surface structure establishing visual depth and theme consistency:
- **Surface**: Primary application page backdrop (`#f7f9fb`).
- **Surface Container (Lowest / Low / High)**: Soft grey and white containers (`#ffffff` / `#f2f4f6` / `#e8eaec`) establishing container hierarchy for tables, scorecards, and cards.
- **Primary Accent / Golf Green**: Reserved for under-par scores (`-5`, birdies, eagles), active leader indicators, and primary interactive elements.
- **Error Color**: Warning red (`#ba1a1a`) used for over-par score indicators (`+3`) and missed-cut dividers.

### Rank Badging & Clean Header System
- **Rank Badges**: High-contrast, solid badge styling for top positions (1st Gold, 2nd Silver, 3rd Bronze, 4th Green).
- **Clean Component Headers**: Uppercase, icon-free section headers without sub-header text for a crisp presentation.
- **Global Player Selection Sync**: Selecting any golfer updates the global player state, updating visual selection highlights across components. Scorecard Matrix updates in-place seamlessly using synchronous competitor fallback data and client-side summary caching, eliminating component unmounting, layout shifting, or skeleton flashes when switching watchlist player cards.
- **Fixed 18-Hole Scorecard Matrix**: Scorecard view mapping all 18 holes (1–9 front nine and 10–18 back nine), locking `OUT`, `IN`, and `TOT` summary columns to their table headers with unplayed holes rendering as `-`.
