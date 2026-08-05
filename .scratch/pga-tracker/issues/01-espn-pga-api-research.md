# Ticket 01: ESPN PGA Tour API Endpoints & Hole-by-Hole Schema

Type: research
Status: resolved
Blocked by: none

## Question

What are the exact ESPN API endpoints for PGA Tour events, tournament schedules, leaderboards, player profiles/headshots, and hole-by-hole scorecards, and what is their data structure and availability?

## Answer

ESPN exposes public/unofficial JSON endpoints for PGA Tour golf data:

1. **Scoreboard & Events**: `GET https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard`
   - Returns array of active/upcoming events with `id`, tournament name, dates, location, and course info.
2. **Event Leaderboard & Roster**: `GET https://site.web.api.espn.com/apis/site/v2/sports/golf/pga/leaderboard?event={eventId}`
   - Returns full leaderboard, player IDs, positions, total score (`toPar`), status, and player headshot image URLs (`headshot.href`).
3. **Hole-by-Hole Player Detail**: `GET https://site.web.api.espn.com/apis/site/v2/sports/golf/pga/leaderboard/{eventId}/playersummary?season={year}&player={playerId}`
   - Returns detailed per-round arrays (`rounds`). Within each round, `linescores` array contains individual hole data: hole number, par, strokes, score type (birdie, bogey, eagle, etc.), and cumulative position.

