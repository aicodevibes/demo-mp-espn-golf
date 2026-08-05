# Ticket 06: Admin Page — Event Selector, Roster Management, Greedy Game, ESPN Sync

Type: task
Status: resolved
Blocked by: 02

## What

Build `src/app/admin/page.tsx` — a protected admin page (redirect non-admins to `/`) for managing contest configuration and per-event rosters. Modeled on `theopen.losinger.net/admin`.

## Reference

Screenshots: `C:\Users\jl479\.gemini\antigravity-ide\brain\84372579-24ee-486a-bc7c-8a52e6a1d437\admin_page_top_1785864141141.png` and `admin_page_middle_*.png`

## Sections

### Section 1: Event Selector & Configuration
- Dropdown of PGA calendar events loaded from ESPN scoreboard API (shows event name + date)
- Currently active event marked with `★ (Active)` badge
- On selecting an event: load its `ContestConfig` from Firestore
- Editable fields: Event Name, ESPN Event ID, Start Date, End Date
- Non-editable (auto-derived): mainPayouts `[600, 320, 180, 100]`, dayMoneyPool `75`
- **"Set as Active"** button → calls `setActiveEvent(eventId, season)`
- **"Save Event Details"** button → calls `setContestConfig(eventId, ...)`
- **"Delete Event"** button (with confirmation) → deletes `events/{id}` subtree
- Right sidebar: PGA calendar loaded from ESPN (event list for quick selection)

### Section 2: Roster & Seeding Controls
- "Seed Default Names" button — writes the 12 Losinger participant names with empty `draftedPlayerIds: []` to `events/{activeEventId}/participants/`
- "Reset Rosters & Config" button (with confirmation) — deletes all participants for the event
- "Sync Draft Names" button — re-reads participant names from Firestore and refreshes display

### Section 3: ESPN Live Score Sync
- "Fetch Latest Scores" button — triggers a manual call to the ESPN leaderboard API for the active event ID
- Shows "Syncs scores for ESPN tournament ID: {activeEventId}"

### Section 4: Main Participants List
- Table: Name | Players (comma-separated golfer names) | Edit | Delete
- **"Add Participant"** button → inline form or modal: Name field + 3 golfer picker (search ESPN field for this event)
- Edit row → inline edit of name and draftedPlayerIds (as comma-separated ESPN athlete IDs with name lookup)
- Golfer name display: resolves from `/players/{id}` Firestore directory (synced via `syncPlayersToFirestore`)

### Section 5: Greedy Game Participants
- Table: Name | Assigned Player (greedy golfer name)
- Shows only participants where `isGreedyParticipant: true`
- Each row: dropdown of field golfers for this event to assign as greedy pick
- Auto-saves on selection change

### Section 6: Live Player Scores
- Full table of all competitors from ESPN for the active event
- Columns: Player Name | R1 | R2 | R3 | R4 (score-to-par per round)
- 157 rows for a typical PGA Tour field

## Auth Guard

```tsx
// At top of component
const { user } = useAuth();
if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) redirect('/');
```

## Acceptance Criteria

1. Non-admin users are redirected to `/` on load
2. PGA calendar dropdown populates from ESPN scoreboard API
3. Saving `ContestConfig` writes to `events/{espnEventId}/contestConfig`
4. "Set as Active" writes `activeEventId` to `config/app`
5. Add / Edit / Delete participant writes to `events/{espnEventId}/participants/{id}`
6. Greedy game assignment saves `greedyPlayerId` + `isGreedyParticipant: true` on participant doc
7. "Fetch Latest Scores" triggers ESPN leaderboard call and `syncPlayersToFirestore` with result
8. All golfer names resolve from `/players/{id}` directory (from previous ESPN sync)
9. `npx tsc --noEmit` clean
10. Page loads and renders without errors at `/admin`

## Files Touched

- `src/app/admin/page.tsx` — NEW (client component with `'use client'`)
- `src/app/admin/loading.tsx` — NEW (simple skeleton)
- `src/lib/firebase/firestore.ts` — may need minor additions for new write ops discovered during build
