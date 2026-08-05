# Master Specification: Golfer Directory & Web-Optimized Headshots

> *This spec was synthesized via `/to-spec` following user alignment.*

## Problem Statement

Currently, player headshot images are loaded directly from external CDN links without centralized Firestore database persistence or Next.js WebP/AVIF edge optimization. This can lead to unoptimized image payloads, potential Cumulative Layout Shifts (CLS), and missing central player directory records in Firestore.

## Solution

Build a central **Firestore `players` Collection & Auto-Sync Engine** paired with **Next.js `<Image />` Edge CDN Optimization**.
- Automatically upsert all 147+ PGA Tour golfers into a central Firestore `players` collection whenever scoreboards are fetched.
- Authorize `a.espncdn.com` in `next.config.ts` and use Next.js `<Image />` for automatic WebP conversion, priority hero card rendering, and initial fallback badges.

## User Stories

1. As a site visitor, I want player headshot pictures to render in crisp, compressed WebP format, so that pages load instantly with zero layout shifts.
2. As an admin, I want all 147+ tournament golfers automatically stored in a central `players` collection in Firestore, so that player metadata is accessible across the database.
3. As a site visitor, I want top tracked hero cards to load headshots with priority, so that Largest Contentful Paint (LCP) performance is optimized.
4. As a site visitor, I want a graceful initials avatar fallback badge (e.g. "SS" for Scottie Scheffler) to display if a headshot URL ever fails to load, so that broken image icons never appear.
5. As an admin, I want Firestore security rules to allow public reading of the `players` collection while restricting automated sync writes to authenticated admin sessions, so that database security is strictly preserved.

## Implementation Decisions

- **Firestore `players` Collection**: Path `players/{playerId}` with fields: `id`, `name`, `headshotUrl`, `country`, `countryFlag`, `lastUpdated`.
- **Background Auto-Sync**: Background utility `syncPlayersToFirestore(competitors)` runs when scoreboards are fetched.
- **Next.js Image Configuration**: Configure `next.config.ts` with `images.remotePatterns` for domain `a.espncdn.com`.
- **UI Components**: Replace standard `<img>` with Next.js `<Image />` in `TrackedPlayerHeroGrid.tsx`, `ScorecardMatrix.tsx`, and `LiveLeaderboard.tsx`.

## Testing Decisions

- **Seam**: Public interface of `syncPlayersToFirestore` and `next.config.ts` remote pattern authorization.
- **Automated Tests**: Vitest suite verifying player payload mapping and initial avatar fallback generator.

## Out of Scope

- Self-hosting binary image files on Firebase Cloud Storage (using Next.js edge CDN optimization instead).
- Manual CRUD forms for editing PGA Tour player headshots.

---
*Triage Label*: `ready-for-agent`
