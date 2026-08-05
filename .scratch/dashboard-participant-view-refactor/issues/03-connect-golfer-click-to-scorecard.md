# Ticket 03: Golfer Click-to-Scorecard Integration

Type: task
Status: resolved
Blocked by: 02

## Question

When a participant clicks on one of their 3 drafted golfers in the hero Watchlist grid, how does `selectedPlayerId` update so that `ScorecardMatrix` displays their 18-hole round scores and linescores?

## Answer

Connected golfer selection state across `TrackedPlayerHeroGrid`, `ParticipantStandings`, and `ScorecardMatrix`. Clicking any golfer card in the hero grid or golfer name in standings table updates `selectedPlayerId`, computing their live 18-hole linescores and displaying their scorecard matrix.

