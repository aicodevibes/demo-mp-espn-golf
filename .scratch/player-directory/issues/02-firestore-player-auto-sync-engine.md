# 02 — Firestore Player Directory Auto-Sync Engine

**What to build:** Create a Firestore sync helper in `src/lib/firebase/firestore.ts` that automatically upserts all 147+ competitors fetched from ESPN scoreboards into the central Firestore `players/{playerId}` collection.

**Blocked by:** 01 — Next.js Image Optimization Configuration & Avatar Fallback Component.

**Status:** ready-for-agent

- [ ] `syncPlayersToFirestore(competitors)` function performs a batch write/setDoc to `players/{playerId}`.
- [ ] Firestore collection `players` allows public read access for site visitors.
- [ ] Vitest unit test verifies payload mapping for the `players` collection.
