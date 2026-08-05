# Ticket 03: Data Model & Caching Strategy in Firestore

Type: grilling
Status: resolved
Blocked by: 01, 02

## Question

How should tracked events, selected players, player stats, and hole-by-hole scorecard data be modeled in Firestore collections vs. fetched dynamically from ESPN APIs?

## Answer

### 1. Firestore Collections (Admin Config & State)
Firestore stores only configuration data managed by `aicodevibes@gmail.com`:

* **`config/app`** (Single Document):
  ```json
  {
    "activeEventId": "401580345",
    "activeSeason": 2026,
    "updatedAt": "2026-08-03T14:30:00Z",
    "updatedBy": "aicodevibes@gmail.com"
  }
  ```

* **`trackedPlayers/{playerId}`** (Collection):
  ```json
  {
    "playerId": "3470",
    "name": "Scottie Scheffler",
    "headshotUrl": "https://a.espncdn.com/i/headshots/golf/players/full/3470.png",
    "country": "USA",
    "addedAt": "2026-08-03T14:30:00Z",
    "displayOrder": 1
  }
  ```

### 2. Live ESPN API Fetching & Caching Strategy
- **Next.js Proxy API Routes**: `app/api/espn/[...path]/route.ts` proxies requests to ESPN API to prevent CORS issues.
- **Caching Layer**: Route Handlers implement `next: { revalidate: 60 }` (60-second SWR caching) so live scoring updates automatically during active rounds without exhausting ESPN API rate limits.
- **Client Synchronization**: The dashboard listens to Firestore `config/app` and `trackedPlayers` via `onSnapshot` for instant updates whenever `aicodevibes@gmail.com` selects a new event or player.

