# Wayfinder Map: Apex Links Precision Theme

## Destination

A complete visual redesign and theme update applying the **Apex Links Precision** design guide (Tailwind v4 theme tokens for surface hierarchy, primary `#000e24`, secondary `#535f70`, tertiary `#006d3a`, spacing, and card/cell paddings) across all core components ([globals.css](file:///c:/Dev/demo-mp/src/app/globals.css), [Header.tsx](file:///c:/Dev/demo-mp/src/components/Header.tsx), [LiveLeaderboard.tsx](file:///c:/Dev/demo-mp/src/components/LiveLeaderboard.tsx), [ScorecardMatrix.tsx](file:///c:/Dev/demo-mp/src/components/ScorecardMatrix.tsx), [TrackedPlayerHeroGrid.tsx](file:///c:/Dev/demo-mp/src/components/TrackedPlayerHeroGrid.tsx), and [AdminManagementDrawer.tsx](file:///c:/Dev/demo-mp/src/components/AdminManagementDrawer.tsx)), strictly preserving all existing functionality, props, and data structures.

## Notes

- **Domain:** Web UI / Tailwind CSS v4 Theme Redesign
- **Skills to consult:** `modern-web-guidance`, `codebase-design`, `prototype`
- **Design Tokens:**
  - `surface`: `#f7f9fb`
  - `surface-dim`: `#d8dadc`
  - `surface-bright`: `#f7f9fb`
  - `surface-container-lowest`: `#ffffff`
  - `surface-container-low`: `#f2f4f6`
  - `surface-container`: `#eef1f3`
  - `surface-container-high`: `#e8eaec`
  - `surface-container-highest`: `#e2e4e6`
  - `on-surface`: `#000e24`
  - `on-surface-variant`: `#42474e`
  - `outline`: `#72777f`
  - `outline-variant`: `#c2c7cf`
  - `primary`: `#000e24`
  - `on-primary`: `#ffffff`
  - `primary-container`: `#d6e3ff`
  - `on-primary-container`: `#001b3e`
  - `secondary`: `#535f70`
  - `on-secondary`: `#ffffff`
  - `secondary-container`: `#d7e3f8`
  - `on-secondary-container`: `#101c2b`
  - `tertiary`: `#006d3a`
  - `on-tertiary`: `#ffffff`
  - `error`: `#ba1a1a`
  - `on-error`: `#ffffff`

## Decisions so far

- [01-css-design-tokens.md](file:///c:/Dev/demo-mp/.scratch/apex-links-precision-theme/issues/01-css-design-tokens.md) — Configured Tailwind v4 `@theme` design tokens in `globals.css`.
- [02-header-theme-update.md](file:///c:/Dev/demo-mp/.scratch/apex-links-precision-theme/issues/02-header-theme-update.md) — Updated `Header.tsx` to use midnight primary header, tertiary green accents, and theme badges.
- [03-tracked-player-hero-grid-theme-update.md](file:///c:/Dev/demo-mp/.scratch/apex-links-precision-theme/issues/03-tracked-player-hero-grid-theme-update.md) — Restyled hero grid cards with surface containers, `tertiary` golf green under-par scores, and `error` over-par colors.
- [04-live-leaderboard-matrix-theme-update.md](file:///c:/Dev/demo-mp/.scratch/apex-links-precision-theme/issues/04-live-leaderboard-matrix-theme-update.md) — Updated `LiveLeaderboard.tsx` and `ScorecardMatrix.tsx` tables with light surface containers and golf green under-par score badges.
- [05-admin-management-drawer-theme-update.md](file:///c:/Dev/demo-mp/.scratch/apex-links-precision-theme/issues/05-admin-management-drawer-theme-update.md) — Styled `AdminManagementDrawer.tsx` with light `surface-container` background and `tertiary` action buttons.






## Not yet specified

*(Fog of war fully mapped for initial scope)*

## Out of scope

- Modifying underlying ESPN golf data structures or API fetching logic
- Adding new functional pages or user authentication flows
