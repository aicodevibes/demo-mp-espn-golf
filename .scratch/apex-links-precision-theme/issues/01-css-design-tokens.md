# Ticket 01: CSS Design Tokens Setup

Type: task
Status: resolved

## Question

How do we configure `@theme` in `src/app/globals.css` with the full Apex Links Precision color palette, spacing, and padding tokens so they are available natively across Tailwind v4 utility classes?

## Answer

Configured `@theme` block in `src/app/globals.css` with all specified surface colors (`surface`, `surface-container-*`, `on-surface-*`), primary (`#000e24`), secondary (`#535f70`), tertiary (`#006d3a`), error (`#ba1a1a`), outline variants, and spacing/padding tokens (`page-margin`, `gutter`, `stack-*`, `card`).

