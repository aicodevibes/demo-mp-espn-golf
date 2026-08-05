# 03 — Firestore Configuration Store & Security Rules

**What to build:** Firestore document setup for active tournament config (`config/app`) and tracked golfers (`trackedPlayers`), real-time `onSnapshot` client hooks (`useTrackedPlayers`, `useActiveEvent`), and strict `firestore.rules` enforcing email whitelisting for write operations.

**Blocked by:** 02 — Firebase Authentication & Admin Auth Context

**Status:** ready-for-agent

- [x] Firestore Security Rules updated to restrict write access to `aicodevibes@gmail.com`
- [x] Firestore client helpers for reading and updating active tournament configuration
- [x] Firestore client helpers for adding, removing, and listing tracked players
- [x] Real-time `onSnapshot` custom hooks for live synchronization across sessions

