# Map: PGA Tour Event & Player Tracking Web App

## Destination

A custom Next.js + Firebase web application for tracking PGA Tour events and selected players with a personal dashboard featuring live leaderboards, hole-by-hole scoring, and player headshots/media via ESPN API, with Google Authentication restricted exclusively to `aicodevibes@gmail.com` for configuring events/players, hosted on Firebase App Hosting.

## Notes

- **Framework**: Next.js App Router (TypeScript, Tailwind CSS v4, shadcn/ui, Lucide React)
- **Backend Services**: Firebase Auth (Google Provider), Cloud Firestore (DB), Firebase Storage (Assets/Media), Firebase App Hosting (Hosting/Deployment)
- **Security Constraint**: Only Google user `aicodevibes@gmail.com` is permitted to change tracked PGA events and selected players
- **Data Integration**: Unofficial ESPN Golf API endpoints for PGA scoreboard, leaderboard, player bios, headshots, and hole-by-hole linescores
- **Issue Tracker**: Local markdown files under `.scratch/pga-tracker/`

## Decisions so far

- [Ticket 01: ESPN PGA Tour API Endpoints & Hole-by-Hole Schema](file:///c:/Dev/demo-mp/.scratch/pga-tracker/issues/01-espn-pga-api-research.md) — Endpoint URLs confirmed for scoreboard, event leaderboards with photos, and hole-by-hole player summary linescores.
- [Ticket 02: Firebase Auth & Google Account Admin Whitelisting](file:///c:/Dev/demo-mp/.scratch/pga-tracker/issues/02-auth-and-access-control.md) — Firebase Auth Google provider with strict email validation (`aicodevibes@gmail.com`) in `AuthContext` and enforced at database layer via `firestore.rules`.
- [Ticket 03: Data Model & Caching Strategy in Firestore](file:///c:/Dev/demo-mp/.scratch/pga-tracker/issues/03-data-modeling-and-caching.md) — Config/tracked players stored in Firestore (`config/app` & `trackedPlayers`); live scores fetched via Next.js ESPN API proxy with 60-second SWR caching.
- [Ticket 04: Dashboard UI & Hole-by-Hole Hole Card Layout Prototype](file:///c:/Dev/demo-mp/.scratch/pga-tracker/issues/04-dashboard-and-hole-by-hole-ui.md) — Hero summary grid cards for tracked golfers, 2-column layout with 18-hole scorecards (Out/In/Total, Eagle/Birdie/Bogey color badges), live leaderboard, and admin drawer.
- [Ticket 05: Firebase App Hosting Deployment Pipeline](file:///c:/Dev/demo-mp/.scratch/pga-tracker/issues/05-firebase-app-hosting-setup.md) — `apphosting.yaml` configured for `fir-demo-mp` (us-east4) with build & runtime environment variable definitions.

## Not yet specified

- Real-time live scoring polling/caching strategy during active tournament rounds
- Mobile responsive layout for 18-hole scorecard matrix
- Historical PGA Tour tournament archiving and multi-season player performance comparison

## Out of scope

- Multi-user public registration, social feeds, or shared league management
- Paid commercial data providers (Sportradar, DataGolf, SportsDataIO) — rely exclusively on ESPN API endpoints
