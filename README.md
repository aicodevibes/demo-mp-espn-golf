## Texas-Florida Golf Majors Showdown (demo-mp-espn-golf)

A **Next.js** (App Router) application that visualizes live PGA Tour data via the **ESPN public API**. It includes:

- Real‑time leaderboard with cut detection badges (✂️ Missed Cut) and withdrawal indicators.
- Player‑by‑player hole‑by‑hole scorecards.
- Firestore‑backed watchlist for tracking favorite golfers.
- Admin drawer for selecting events and managing tracked players.
- Rich UI built with **Tailwind CSS v4**, **shadcn/ui**, and **lucide‑react** icons.

The project demonstrates handling of several ESPN API quirks:
- `status` objects are `null` for cut players – detection relies on `linescores.length`.
- The `/playersummary` endpoint never returns a `competitor` object – we thread the leaderboard competitor instead.
- Headshot images must be fetched with `unoptimized={true}` to avoid upstream 404s.

For a full reference on the ESPN endpoints, payload structures and known gotchas, see the [ESPN API Documentation](docs/espnapi.md).

---

### Getting Started

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

Open http://localhost:3000 in your browser.

---

### Deploy

The app can be deployed to **Vercel** (recommended) or **Firebase App Hosting**.

---

### License

MIT © 2026
