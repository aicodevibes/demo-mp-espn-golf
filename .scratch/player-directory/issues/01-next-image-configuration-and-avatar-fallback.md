# 01 — Next.js Image Optimization Configuration & Avatar Fallback Component

**What to build:** Configure Next.js `next.config.ts` to authorize external ESPN image domain `a.espncdn.com` for WebP/AVIF transformation on the edge CDN. Create a reusable `<GolferHeadshot />` component that renders Next.js `<Image />` with fixed aspect ratios and an initial avatar fallback badge (e.g. "SS" for Scottie Scheffler) if the image fails to load.

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] `next.config.ts` includes `images.remotePatterns` for `a.espncdn.com`.
- [x] `<GolferHeadshot />` component handles `priority` loading and initial avatar fallback if the headshot URL fails to load.
- [x] Vitest test verifies initial avatar extraction (e.g., "Scottie Scheffler" -> "SS").

