# ESPN Proxy Resilience, Cache Hardening & Admin Authorization

## Status
Accepted (supersedes ADR-0003)

## Context
Public ESPN API proxying and client polling previously lacked input sanitization, bounded server-side snapshot retention, upstream timeouts, and manual refresh throttling, while `forceRefreshKey` inadvertently bypassed client and CDN player-summary caches on every click. At the same time, Firestore rules treated any authenticated user as an admin and public polling triggered unnecessary Firestore writes.

## Decision
1. **Strict Proxy Input Validation & URL Construction**:
   - All `/api/espn/*` route handlers validate `eventId` and `playerId` against `/^\d{1,12}$/` and `season` against `/^\d{4}$/`, returning `400` on invalid input, and construct upstream URLs via `URL` / `URLSearchParams` to prevent SSRF and path/query injection.
2. **Bounded Server Cache, Timeouts & Staleness Caps**:
   - Server memory snapshots use a bounded LRU cache (max 250 entries), an 8-second upstream timeout (`AbortSignal.timeout(8000)`), and max staleness caps (**30 minutes** for live events, **24 hours** for pre/post events) before returning an upstream error rather than misleading stale scores. Responses served from stale snapshots include `X-Cache-Stale: true` and `X-Cache-Age: <seconds>`.
3. **Throttled `Instant Cache-Bust Refresh` & Coalescing**:
   - Public `force=true` refreshes are guarded by a 10-second per-key server cooldown and in-flight request coalescing. Requests inside the cooldown return `200 OK` with the `<10s` snapshot, `X-Force-Coalesced: true`, and `X-Cache-Age`.
   - `force=true` on `/api/espn/playersummary` never busts the 1-hour `sports.core.api.espn.com` course-hole par cache.
4. **Client Nonce Refresh & Bounded Watchlist Pre-Fetch**:
   - Client manual refresh passes a monotonic refresh nonce (never `lastRefreshedAt` or render-time `Date.now()`) consumed once per manual-refresh nonce, keeping normal golfer switches on client and CDN caches.
   - Client polling enforces `visibilitychange` cooldowns (15s live / 60s pre/post), `AbortController` / request-sequence guards on event switching, real event `season` propagation, and bounded Hero Watchlist pre-fetching (up to 4 visible golfers, max 3 concurrent).
5. **Admin Authorization & Firestore Write Isolation**:
   - Public leaderboard polling never writes to Firestore; `/players` directory sync is strictly an explicit admin action.
   - Firestore rules enforce allowlisted verified admin email (`aicodevibes@gmail.com`) plus schema validation instead of `request.auth != null`, `/admin/gallery` is admin-gated, and dev mock auth fallback is removed or gated behind `NEXT_PUBLIC_ENABLE_DEV_MOCK_AUTH=true`.

## Consequences
- Normal golfer switches and public viewers hit client and edge caches cleanly while manual refreshes remain responsive and rate-limit safe.
- Unauthenticated or non-admin Firebase sessions cannot mutate pool config, rosters, or player directory documents, and public page views emit zero Firestore write errors.
