# ESPN PGA Golf API Reference & Integration Guide

This guide documents the official endpoints, payload schemas, and data extraction patterns for integrating live PGA Tour golf data via the ESPN public API.

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

## 🏌️ Competitor Data Schema

Each competitor object in `data.events[0].competitions[0].competitors` contains:

```typescript
{
  id: "3470",
  score: "-18",
  status: {
    period: 4,               // Current round number (1-4)
    thru: "F",                // Holes completed ("F" = Finished, 1-17 = In progress)
    position: {
      displayName: "1"        // Leaderboard position ("1", "T2", "CUT")
    }
  },
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
  linescores: [ ... ]        // 18-hole scorecards for Rounds 1-4
}
```

---

## ⛳ 18-Hole Round Scorecard Matrix (`linescores`)

The `competitor.linescores` array contains objects for **Round 1, Round 2, Round 3, and Round 4**:

```typescript
competitor.linescores = [
  {
    period: 1,               // Round 1
    value: 68,               // Total Round Strokes (e.g., 68)
    displayValue: "-4",      // Score to par for this round
    linescores: [            // 18-Hole Array
      {
        period: 1,           // Hole #1
        value: 3,            // Strokes taken on this hole
        scoreType: {
          displayValue: "-1" // Score relative to par ("-1" = Birdie, "E" = Par, "+1" = Bogey, "-2" = Eagle)
        }
      },
      // ... Holes 2 through 18
    ]
  }
]
```

### Calculating Hole Par & Score Badges
Since ESPN returns the hole strokes (`value`) and score relative to par (`scoreType.displayValue`), calculate the hole par with:

$$\text{Hole Par} = \text{Strokes} - \text{scoreType.displayValue}$$

* **Example 1**: 3 strokes with `displayValue: "-1"` $\rightarrow$ Par = $3 - (-1) = 4$ (Birdie).
* **Example 2**: 3 strokes with `displayValue: "-2"` $\rightarrow$ Par = $3 - (-2) = 5$ (Eagle).
* **Example 3**: 5 strokes with `displayValue: "+1"` $\rightarrow$ Par = $5 - 1 = 4$ (Bogey).

#### Score Badge Rules:
- **Eagle or Better**: `diff <= -2` $\rightarrow$ Gold Double-Circle Badge
- **Birdie**: `diff === -1` $\rightarrow$ Green Circle Badge
- **Par**: `diff === 0` $\rightarrow$ Standard Text
- **Bogey**: `diff === 1` $\rightarrow$ Light Red Square Badge
- **Double Bogey+**: `diff >= 2` $\rightarrow$ Dark Maroon Square Badge

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
