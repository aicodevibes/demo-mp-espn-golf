# Spec: PGA Tour Event & Player Performance Tracking Web App

Status: ready-for-agent

## Problem Statement

Golf fans and analysts want a personalized, live performance dashboard to track specific PGA Tour events and their favorite golfers. Standard sports sites present generic leaderboards with heavy ads and clutter, making it difficult to follow specific players hole-by-hole in real time or monitor customized player rosters across tournament rounds. Additionally, single-user administrative control is needed so that event and player tracking configurations can only be managed by the authorized owner (`aicodevibes@gmail.com`).

## Solution

A high-performance Next.js App Router web application integrated with Firebase Auth, Cloud Firestore, and Firebase App Hosting, powered by live ESPN PGA Tour API endpoints.

Visitors can view a clean, real-time dashboard featuring:
- Hero summary cards for tracked golfers (headshots, position, score to par, round progress).
- A 2-column layout displaying an interactive 18-hole matrix scorecard (Holes 1-9 OUT, 10-18 IN, Total, with Eagle/Birdie/Bogey color badges) alongside full event leaderboards.
- Google Authentication restricting administrative management (selecting active PGA events and adding/removing tracked players) exclusively to `aicodevibes@gmail.com`.

## User Stories

1. As a golf fan, I want to see a live dashboard of tracked PGA Tour players, so that I can immediately view their current position, score to par, and round status at a glance.
2. As a golf fan, I want to view a full 18-hole scorecard matrix for any tracked golfer, so that I can analyze their hole-by-hole performance for any selected round (Round 1 through Round 4).
3. As a golf fan, I want scorecard holes color-coded by score type (Eagle, Birdie, Par, Bogey, Double Bogey+), so that I can quickly spot scoring streaks and mistakes.
4. As a golf fan, I want to view high-resolution player headshots alongside their scores, so that the dashboard feels rich, visual, and personal.
5. As a golf fan, I want to view the full live PGA Tour tournament leaderboard alongside the scorecard view, so that I can see how tracked players compare to the rest of the field.
6. As the site administrator (`aicodevibes@gmail.com`), I want to log in using my Google account, so that I can securely manage active tournament settings and tracked player rosters.
7. As the site administrator, I want to search and select active PGA Tour tournaments from the current season, so that the dashboard updates to reflect the selected event.
8. As the site administrator, I want to add or remove golfers from my custom tracking list, so that the hero cards and scorecard tabs update in real time across all client sessions.
9. As an unauthenticated site visitor, I want to view the live dashboard and scorecards, so that I can enjoy the tracking experience without needing to log in.
10. As an unauthenticated site visitor, I want administrative edit controls hidden or disabled, so that I cannot alter tournament or player tracking settings.
11. As a developer, I want ESPN API requests proxied through Next.js API Route Handlers with a 60-second SWR cache, so that live scores remain fresh without exceeding ESPN rate limits.
12. As a developer, I want Firestore Security Rules enforcing email-based admin access control, so that unauthorized write requests are blocked at the database level.
13. As a developer, I want the web application deployed cleanly to Firebase App Hosting, so that it scales automatically on serverless Cloud Run infrastructure.

## Implementation Decisions

- **Framework & UI Stack**: Next.js App Router (TypeScript, React Server/Client Components, Tailwind CSS v4, `shadcn/ui`, `lucide-react`).
- **Authentication**: Firebase Authentication using Google Auth Provider. React `AuthContext` exposes `user`, `loading`, `signInWithGoogle()`, `signOut()`, and `isAdmin` flag (`user?.email === 'aicodevibes@gmail.com'`).
- **Database & Security Rules**: Cloud Firestore storing admin configuration in `config/app` document and tracked golfers in `trackedPlayers` collection. Security rules enforce `request.auth.token.email == 'aicodevibes@gmail.com'` for all mutations; public read enabled for configuration.
- **ESPN API Integration & Proxying**:
  - `GET /api/espn/scoreboard` -> Proxies `site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard`.
  - `GET /api/espn/leaderboard?event={eventId}` -> Proxies `site.web.api.espn.com/apis/site/v2/sports/golf/pga/leaderboard`.
  - `GET /api/espn/playersummary?eventId={eventId}&playerId={playerId}&season={year}` -> Proxies `playersummary` endpoint for hole-by-hole `linescores`.
  - Route Handlers implement `next: { revalidate: 60 }` (60-second SWR cache).
- **Dashboard Layout & Components**:
  - `TrackedPlayerHeroGrid`: Grid of summary cards displaying player headshots, score to par, position badge, and thru status.
  - `ScorecardMatrix`: Tabbed 18-hole traditional golf scorecard (Holes 1-9 OUT, 10-18 IN, Total score) with golf badge styling (Gold double circle for Eagle, Emerald circle for Birdie, Rose square for Bogey).
  - `LiveLeaderboard`: Leaderboard table with live position, name, today's score, thru status, and total score.
  - `AdminDrawerModal`: Admin control drawer rendered only when `isAdmin` is true.
- **Deployment**: Firebase App Hosting configured via `apphosting.yaml` for backend `fir-demo-mp` (us-east4).

## Testing Decisions

- **Testing Seams**:
  - Primary Testing Seam: Next.js API Proxy Route Handlers & Client React Components (mocking ESPN API network calls via `msw` / `fetchMock` and Firebase Auth context).
  - Database Security Rules Seam: `@firebase/rules-unit-testing` suite validating `firestore.rules` (verifying allowed reads for all, allowed writes only for `aicodevibes@gmail.com`, and denied writes for anonymous/other users).
- **Test Quality Principles**: Test external behavior and data contracts (e.g., correct score calculations, color badge assignments, admin state rendering) rather than internal component state.

## Out of Scope

- Multi-tenant user registration or individual personal accounts.
- Paid commercial golf data APIs (Sportradar, DataGolf, SportsDataIO).
- Social sharing, fantasy golf leagues, or bet tracking.

## Further Notes

- All ESPN API endpoints used are public/unofficial endpoints reverse-engineered from ESPN web client services.
- The app uses standard v10+ Firebase modular SDK imports.
