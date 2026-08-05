# 01 — Next.js Core & ESPN API Proxy Route Handlers

**What to build:** Next.js API Proxy routes (`/api/espn/scoreboard`, `/api/espn/leaderboard`, `/api/espn/playersummary`) with 60-second SWR caching (`next: { revalidate: 60 }`) and TypeScript interfaces for ESPN event/scorecard schemas.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] Proxy route `/api/espn/scoreboard` returning active/upcoming PGA Tour event list
- [x] Proxy route `/api/espn/leaderboard` returning tournament leaderboard & player headshots
- [x] Proxy route `/api/espn/playersummary` returning per-round hole-by-hole linescores
- [x] SWR cache header (`next: { revalidate: 60 }`) configured on API responses
- [x] Type definitions for ESPN Scoreboard, Leaderboard, and Linescore data structures

