# ESPN Caching, SWR Revalidation, and Adaptive Polling Strategy

## Status
Accepted

## Context
When users first opened the web app or stayed on the dashboard, live golf score updates suffered from a combination of long server-side stale-while-revalidate windows (60s), a 5-minute background polling interval mismatch (despite comments referencing 45s), and sequential cold-start state initialization waterfalls. Users experienced stale data or delays up to a minute when loading the app.

## Decision
1. **Adaptive Route Handler Caching**:
   - For live tournaments (`in progress`), server and edge SWR cache headers are reduced to `revalidate: 15` and `s-maxage=15, stale-while-revalidate=30`.
   - Pre-tournament and completed tournaments retain a relaxed cache TTL of 300 seconds (`revalidate: 300`).
2. **On-Demand Cache-Bypass (`force=true`)**:
   - Manual user refresh triggers pass a `force=true` parameter to `/api/espn/leaderboard` which fetches from upstream ESPN with `{ cache: 'no-store' }`, guaranteeing instantaneous fresh data.
3. **Adaptive Client-Side Polling in EventContext**:
   - Background polling cadence adapts dynamically based on tournament status:
     - **In-Progress (`in`)**: Polls every 30–45 seconds while the document is visible.
     - **Pre/Post (`pre` / `post`)**: Polls every 5 minutes while the document is visible.
   - Initial load always fires immediately on mount regardless of state.
4. **Cold-Start Parallel Event Bootstrapping**:
   - The last active event ID is cached alongside scoreboard events in `localStorage`, enabling `EventContextProvider` to fire the initial leaderboard fetch immediately on mount in parallel with Firestore and Scoreboard subscriptions.
5. **Optimistic Error Retention**:
   - If ESPN returns a 429 rate limit or network error, the app optimistically retains the last valid competitor and standings state, presenting a non-destructive alert rather than clearing state.

## Consequences
- Initial cold-start and manual refresh latency is reduced to sub-second / immediate upstream response time.
- Battery and network consumption is conserved when events are complete, while active rounds remain highly responsive.
- UI components maintain consistent state even during upstream network hiccups.
