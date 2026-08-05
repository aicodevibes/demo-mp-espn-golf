# Event-Agnostic Contest Engine

## Destination

Make the contest engine work for any PGA Tour event the admin activates — no hardcoded event names, par values, payout amounts, or rosters in source code. All contest configuration lives in Firestore under `events/{espnEventId}/`, participants are scoped per-event, and par is derived from ESPN's own cumulative score data.

## Confirmed Rules

- Contest rules are the same every event: `mainPayouts = [600, 320, 180, 100]`, `dayMoneyPool = 75`
- Par must come from ESPN (derived from cumulative score deltas — no hardcoded `approxPar`)
- Rosters change per event (participants subcollection scoped to `events/{id}/participants/`)
- Greedy Game is in scope: each participant may have an optional single "greedy" golfer assignment
- Cut detection: rely on ESPN status only (no manual override field)
- Admin route must be auth-protected (admin email only)

## Reference

- Spec: [implementation_plan.md](file:///C:/Users/jl479/.gemini/antigravity-ide/brain/84372579-24ee-486a-bc7c-8a52e6a1d437/implementation_plan.md)
- Old admin reference: https://theopen.losinger.net/admin
- Rules doc: [rulesdescriptions.md](file:///c:/Dev/demo-mp/rulesdescriptions.md)

## Tickets

- [x] [01-contest-config-types.md](file:///c:/Dev/demo-mp/.scratch/event-agnostic-contest/issues/01-contest-config-types.md) — `ContestConfig` type + extend `Participant` with `greedyPlayerId`
- [x] [02-firestore-per-event-schema.md](file:///c:/Dev/demo-mp/.scratch/event-agnostic-contest/issues/02-firestore-per-event-schema.md) — Firestore hooks, rules, and CRUD for `events/{id}/contestConfig` + `events/{id}/participants/`
- [x] [03-scoring-engine-event-agnostic.md](file:///c:/Dev/demo-mp/.scratch/event-agnostic-contest/issues/03-scoring-engine-event-agnostic.md) — Remove `approxPar`, accept `ContestConfig`, fix round score display strings
- [x] [04-display-components-dehardcode.md](file:///c:/Dev/demo-mp/.scratch/event-agnostic-contest/issues/04-display-components-dehardcode.md) — Remove all hardcoded event strings from `DayMoneyWinners` + `ParticipantStandings`
- [x] [05-page-wire-config.md](file:///c:/Dev/demo-mp/.scratch/event-agnostic-contest/issues/05-page-wire-config.md) — Wire `contestConfig` + per-event `participants` into `page.tsx`
- [x] [06-admin-page.md](file:///c:/Dev/demo-mp/.scratch/event-agnostic-contest/issues/06-admin-page.md) — Build `/admin` page: event selector, roster management, Greedy Game, ESPN score sync

## Decisions so far

- Implemented full Event-Agnostic Engine. Scoped all configuration and rosters under Firestore `events/{espnEventId}/`.
- Removed `approxPar = 70` hardcoding and dynamically derive par via ESPN linescore values or fallback calculations.
- Dehardcoded all prize amount strings in `ParticipantStandings` and `DayMoneyWinners`.
- Added protected admin controls page `/admin` for configuring calendar events, seeding names, manual sync with ESPN API, and inline participant roster/greedy edits.
