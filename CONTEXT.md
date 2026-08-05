# Apex Links Precision - Domain Glossary

## UI & Theme Terms

### Surface Hierarchy
The layered surface structure used to build visual depth across cards, tables, and drawers:
- **Surface**: Primary application page backdrop (`#f7f9fb`).
- **Surface Container (Lowest / Low / High)**: Clean white or soft grey containers (`#ffffff` / `#f2f4f6` / `#e8eaec`) used for leaderboard tables, scorecards, and hero grid cards.
- **Primary Color**: Deep midnight navy (`#000e24`) used for high-contrast titles and structural anchors.
- **Tertiary Color**: Vibrant golf green (`#006d3a`) reserved for under-par performance scores (`-5`, birdies, eagles), active leader indicators, and primary action controls.
- **Error Color**: Warning red (`#ba1a1a`) used for over-par score indicators (`+3`) and missed-cut dividers.

### Component Layout Patterns
- **Scrollable Leaderboard Viewport**: Fixed-height container (`max-h-[520px] overflow-y-auto`) designed to display approximately 10 player rows at a time while enabling smooth internal scrolling for longer field lists without increasing page scroll length.
- **Top 10 Tie Inclusion**: The Top 10 Tournament Leaders component dynamically expands its dataset to include all competitors sharing position T10 or higher. All ties within the top 10 positions are accessible via the scrollable viewport. The "Other Drafted Golfers" component excludes all competitors present in the Top 10 list.
- **Global Player Selection Sync**: Clicking any golfer across leaderboards updates the globally selected player state, updating visual selection highlights across components and loading the golfer's round performance (R1–R4) in the Scorecard Matrix.
- **Standardized Surface Hierarchy**: Every primary dashboard component utilizes `bg-surface-container-low` (`#f2f4f6`) for its outer container card shell, with `bg-surface-container-lowest` (`#ffffff`) for inner table headers and row items, establishing visual depth and theme consistency.
- **Fixed 18-Hole Matrix Grid**: The Scorecard Matrix component always maps all 18 holes (1–9 front nine and 10–18 back nine). Unplayed holes render a clean, unhighlighted `-` cell, ensuring `OUT`, `IN`, and `TOT` summary columns remain locked to their table headers.
