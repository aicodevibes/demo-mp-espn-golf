# ESPN PGA Golf API Reference & Integration Guide

This guide documents the official endpoints, payload schemas, data extraction patterns, and **known gotchas** for integrating live PGA Tour golf data via the ESPN public API.

---

## 📍 Primary Endpoints

### 1. Scoreboard & Full Tournament Field
* **Endpoint**: `GET https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard`
* **Query Parameters**:
  - `event={eventId}` (Optional: Fetches specific tournament scoreboard. Defaults to current active PGA Tour event).
* **Cache Header Recommendation**: `Cache-Control: public, s-maxage=60, stale-while-revalidate=120`

#### Key Payload Paths:
- **Event Info**: `data.events[0].name`, `data.events[0].id`, `data.events[0].status.type.detail`
- **Full Tournament Calendar**: `data.leagues[0].calendar` (Array of all PGA Tour events with `id`, `label`, `startDate`, `endDate`)
- **Full Field Competitors (140+ Golfers)**: `data.events[0].competitions[0].competitors`

---

### 2. Player Summary (Hole-by-Hole Scorecard)
* **Endpoint**: `GET https://site.web.api.espn.com/apis/site/v2/sports/golf/pga/leaderboard/{eventId}/playersummary`
* **Query Parameters**:
  - `season={year}` (e.g., `2026`)
  - `player={playerId}`

#### Key Payload Paths:
- `data.rounds` — Array of round objects (see schema below)
- `data.profile` — Basic player bio
- `data.stats` — Tournament stats

> [!CAUTION]
> **`data.competitor` is NOT present in this response.** The player summary API returns only `{ profile, rounds, stats }`. Do NOT attempt to read `playerSummary.competitor` for status/CUT detection — it will always be `null`. Instead, pass the `ESPNCompetitor` from the scoreboard/leaderboard API as a separate prop to any component that needs it.

---

## 🏌️ Competitor Data Schema

Each competitor object in `data.events[0].competitions[0].competitors` contains:

```typescript
{
  id: "3470",
  order: 1,              // Leaderboard rank order (1 = leader)
  score: "-18",          // Total score to par (string)
  status: { ... },       // ⚠️ See "CUT Detection" section — this is NULL for cut players
  athlete: {
    id: "3470",
    displayName: "Scottie Scheffler",
    headshot: {
      href: "https://a.espncdn.com/i/headshots/golf/players/full/3470.png"
    },
    // Note: If athlete.headshot is omitted by ESPN for certain players (e.g. Matt Wallace id: 10548),
    // construct the canonical CDN URL: https://a.espncdn.com/i/headshots/golf/players/full/${playerId}.png

    flag: {
      href: "https://a.espncdn.com/i/teamlogos/countries/500/usa.png",
      alt: "USA"
    },
    country: {
      abbreviation: "USA"
    }
  },
  linescores: [ ... ]    // Round-level objects (see schema below)
}
```

---

## ✂️ CUT Detection — Critical Gotcha

> [!CAUTION]
> **ESPN sends a `null` / empty `status` object for ALL players who miss the 36-hole cut.** String-based checks on `status.position.displayName` (e.g., looking for `"CUT"` or `"MC"`) will **never fire** for these players.

### Correct Detection: `linescores.length`

The definitive signal is the **number of round-level linescores**:

| `linescores.length` | Meaning |
|---|---|
| `2` | Missed the 36-hole cut (played Rounds 1 & 2 only) |
| `4` | Made the cut and played all 4 rounds |

**Confirmed from live Rocket Mortgage Classic data (STATUS_FINAL):**
- 74 players had `linescores.length === 2` → cut
- 73 players had `linescores.length === 4` → made cut

### Implementation Rules

```typescript
// ✅ CORRECT — linescore check runs regardless of status being null
export function getPlayerStatusInfo(comp: ESPNCompetitor, eventStatus?: any): PlayerStatusInfo {
  if (!comp) return { ... }; // Guard only on missing competitor, NOT on !comp.status

  const isFinalOrLateRound =
    eventStatus?.type?.state === 'post' ||
    eventStatus?.type?.completed === true ||
    (eventStatus?.period ?? 0) >= 3;

  const missedCutByRounds =
    isFinalOrLateRound &&
    Array.isArray(comp.linescores) &&
    comp.linescores.length === 2;

  // String checks on comp.status fields are supplementary (for WD, DQ, MDF)
  // but will never catch the standard CUT case.
  ...
}
```

> [!WARNING]
> **Never add an early return on `!comp.status`.** This silences the linescore-based detection, which is the only working signal for missed cuts.

### `eventStatus` Must Be Threaded Explicitly

Every component that calls `getPlayerStatusInfo(comp, eventStatus)` **must receive `eventStatus` as a prop and pass it through**. Missing this argument makes `isFinalOrLateRound` always `false`, silencing cut detection entirely.

```typescript
// ✅ CORRECT
const statusInfo = getPlayerStatusInfo(comp, eventStatus); // eventStatus from prop

// ❌ WRONG — cuts never detected
const statusInfo = getPlayerStatusInfo(comp);
```

**Components that require `eventStatus` as a prop:**
- `TrackedPlayerHeroGrid` → receives from `activeEvent?.status`
- `ScorecardMatrix` → receives from `activeEvent?.status` (wired in `page.tsx`)
- `LiveLeaderboard` → receives as part of `eventObj`, accessed via `eventObj?.status`

---

## 🖼️ Headshot Images — Next.js `unoptimized` Flag

> [!WARNING]
> Do **NOT** use Next.js `<Image>` optimization for ESPN headshot URLs without `unoptimized={true}`. Next.js will attempt to proxy the image server-side, which triggers `⨯ upstream image response failed for https://a.espncdn.com/...` 404 errors for players whose ESPN headshot CDN URLs return 404.

```tsx
// ✅ CORRECT — browser fetches directly from ESPN CDN
<Image
  src={headshotUrl}
  unoptimized={true}
  alt={name}
  width={size}
  height={size}
/>

// ❌ WRONG — Next.js server proxies it, causes 404 upstream errors
<Image src={headshotUrl} alt={name} width={size} height={size} />
```

**Fallback pattern**: If `athlete.headshot?.href` is missing, construct the canonical URL:
```
https://a.espncdn.com/i/headshots/golf/players/full/{playerId}.png
```
Then render a text-avatar fallback (player initials) if the direct CDN URL also 404s.

---

## ⛳ 18-Hole Round Scorecard Matrix (`linescores`)

The `competitor.linescores` array contains **one object per round played**:

```typescript
competitor.linescores = [
  {
    period: 1,               // Round number (1–4)
    value: 68,               // Total Round Strokes (e.g., 68)
    displayValue: "-4",      // Score to par for this round
    linescores: [            // 18-Hole array
      {
        period: 1,           // Hole #1
        value: 3,            // Strokes taken on this hole
        scoreType: {
          displayValue: "-1" // Score relative to par ("-1"=Birdie, "E"=Par, "+1"=Bogey, "-2"=Eagle)
        }
      },
      // ... Holes 2 through 18
    ]
  }
]
```

> [!NOTE]
> `linescores.length` is the authoritative signal for CUT detection — not any status string. A player with 2 round objects in a completed event missed the cut.

### Calculating Hole Par & Score Badges
Since ESPN returns hole strokes (`value`) and score relative to par (`scoreType.displayValue`), calculate hole par with:

$$\text{Hole Par} = \text{Strokes} - \text{scoreType.displayValue}$$

* **Example 1**: 3 strokes with `displayValue: "-1"` → Par = $3 - (-1) = 4$ (Birdie).
* **Example 2**: 3 strokes with `displayValue: "-2"` → Par = $3 - (-2) = 5$ (Eagle).
* **Example 3**: 5 strokes with `displayValue: "+1"` → Par = $5 - 1 = 4$ (Bogey).

#### Score Badge Rules:
- **Eagle or Better**: `diff <= -2` → Gold Double-Circle Badge
- **Birdie**: `diff === -1` → Green Circle Badge
- **Par**: `diff === 0` → Standard Text
- **Bogey**: `diff === 1` → Light Red Square Badge
- **Double Bogey+**: `diff >= 2` → Dark Maroon Square Badge

---

## 🚀 Caching & SWR Best Practices

To avoid hitting ESPN rate limits and provide instant load times for users:

1. **Proxy ESPN Requests via Next.js Route Handlers**:
   - Create proxy routes under `src/app/api/espn/scoreboard/route.ts` and `src/app/api/espn/leaderboard/route.ts`.
2. **Apply Shared CDN Headers (`s-maxage=60`)**:
   ```typescript
   return NextResponse.json(data, {
     headers: {
       'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
     },
   });
   ```
3. **Result**:
   - First user request caches the live scores for 60 seconds on the server.
   - All subsequent users receive instant (< 10ms) pre-cached responses.
   - Next.js revalidates ESPN data in the background every 60 seconds.

---

## 📇 PGA Tour Authentic Player Directory & Headshots Architecture

### 1. The Scheduled Event Gap & Catalog Resolution
* **Completed / Active Events**: ESPN's `/api/espn/leaderboard?event={eventId}` endpoint returns the full field of ~150 competitors with their exact ESPN IDs and `athlete.headshot.href` URLs.
* **Scheduled / Upcoming Events**: Until pairing tee times are officially posted by the PGA Tour, ESPN's leaderboard endpoint returns `0` competitors.
* **Solution (`espnPlayerDirectory.json`)**: We extracted all **279 authentic PGA Tour golfers** directly from ESPN's live PGA scoreboard and leaderboard API endpoints across all 2025/2026 tour events. This catalog maps each golfer's exact ESPN athlete ID to their official display name and CDN headshot:
  - **Scottie Scheffler**: ID `9478` (`https://a.espncdn.com/i/headshots/golf/players/full/9478.png`)
  - **Rory McIlroy**: ID `3470` (`https://a.espncdn.com/i/headshots/golf/players/full/3470.png`)
  - **Xander Schauffele**: ID `10140` (`https://a.espncdn.com/i/headshots/golf/players/full/10140.png`)
  - **Collin Morikawa**: ID `10592` (`https://a.espncdn.com/i/headshots/golf/players/full/10592.png`)
  - **Jon Rahm**: ID `9780` (`https://a.espncdn.com/i/headshots/golf/players/full/9780.png`)
  - **Aaron Rai**: ID `10906` (`https://a.espncdn.com/i/headshots/golf/players/full/10906.png`)
  - **Cameron Young**: ID `4425906` (`https://a.espncdn.com/i/headshots/golf/players/full/4425906.png`)
  - **Denny McCarthy**: ID `10054` (`https://a.espncdn.com/i/headshots/golf/players/full/10054.png`)
  - **Eric Cole**: ID `10522` (`https://a.espncdn.com/i/headshots/golf/players/full/10522.png`)

### 2. 2-Stage Headshot Image Failover Pipeline (`GolferHeadshot.tsx`)
Certain direct PNG CDN links on ESPN's server trigger 404 responses depending on browser cache state. `<GolferHeadshot>` implements a 3-tier loading strategy:
- **Stage 1 (Primary Direct CDN)**: `https://a.espncdn.com/i/headshots/golf/players/full/${playerId}.png`
- **Stage 2 (ESPN Combiner Endpoint)**: If Stage 1 triggers `onError`, it automatically retries via `https://a.espncdn.com/combiner/i?img=/i/headshots/golf/players/full/${playerId}.png&w=120&h=120&scale=crop`.
- **Stage 3 (Initials Fallback)**: Renders a styled initials avatar (`AR`, `BA`, `CY`) only if both Stage 1 and Stage 2 fail.

### 3. Database Protection & Admin Tools
- **Synthetic Overwrite Protection**: In `syncPlayersToFirestore()`, competitors with `comp.athlete?.isSynthetic === true` are blocked from overwriting stored Firestore `players` documents.
- **Admin Control Tools (`/admin`)**:
  - `Clear Players Database`: Purges legacy corrupted documents from Firestore `players`.
  - `Load Fresh PGA Player Catalog`: Imports the 279 authentic ESPN golfer profiles into Firestore.
  - `Repair Player Directory`: Audits stored records and resolves conflicting legacy entries.
  - `View Player Gallery`: Interactive gallery at `/admin/gallery` and static reference file at `public/player-directory-preview.html` to visually inspect all 279 golfer headshots.

