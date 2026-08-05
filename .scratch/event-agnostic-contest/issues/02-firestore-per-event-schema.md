# Ticket 02: Firestore Per-Event Schema — ContestConfig + Participants Subcollection

Type: task
Status: resolved
Blocked by: 01

## What

Restructure Firestore so participants and contest configuration are scoped **per event** under `events/{espnEventId}/`. Update `firestore.ts` with CRUD functions and real-time hooks for both. Update Firestore security rules to allow authenticated admin writes.

## Firestore Schema

```
events/
  {espnEventId}/
    contestConfig          ← single document
      espnEventId: string
      eventName: string
      season: number
      mainPayouts: number[]      — [600, 320, 180, 100]
      dayMoneyPool: number       — 75
      coursePar: number | null
      updatedAt: Timestamp
      updatedBy: string
    participants/          ← subcollection
      {participantId}/
        name: string
        draftedPlayerIds: string[]
        greedyPlayerId?: string
```

**Note:** The existing global `/participants` collection remains as a legacy fallback during transition but is no longer the primary source.

## Acceptance Criteria

1. `getContestConfig(eventId): Promise<ContestConfig | null>`
2. `setContestConfig(eventId, config): Promise<void>` — creates or merges
3. `useContestConfig(eventId: string | null)` — real-time hook, returns `{ config, loading }`
4. `getParticipantsForEvent(eventId): Promise<Participant[]>`
5. `setParticipantsForEvent(eventId, participants[]): Promise<void>` — batch write, replaces all
6. `addParticipantToEvent(eventId, participant): Promise<void>`
7. `removeParticipantFromEvent(eventId, participantId): Promise<void>`
8. `useParticipants(eventId: string | null)` — updated signature; reads from `events/{id}/participants/` when `eventId` provided, falls back to `MOCK_LOSINGER_PARTICIPANTS` seed when null/empty
9. `setActiveEvent` — updated to also create a default `ContestConfig` doc for the event if one doesn't exist yet (using the standard payout/pool values)
10. Firestore security rules updated for `events/{eventId}/contestConfig` and `events/{eventId}/participants/{id}`
11. `npx tsc --noEmit` clean; existing unit tests still pass

## TDD Note

Write a unit test for `useParticipants` fallback behavior: when `eventId` is null, should return seed participants. When `eventId` is provided but Firestore is empty, should also return seed participants. (Mock Firestore — do not require a live Firestore connection in unit tests.)

## Files Touched

- `src/lib/firebase/firestore.ts` — MODIFY (add new functions + update `useParticipants`)
- `firestore.rules` — MODIFY (add `events` collection rules)
- `src/lib/firebase/seedData.ts` — MODIFY (rename `MOCK_LOSINGER_PARTICIPANTS` export to `DEFAULT_CONTEST_PARTICIPANTS` for clarity; keep same data)
