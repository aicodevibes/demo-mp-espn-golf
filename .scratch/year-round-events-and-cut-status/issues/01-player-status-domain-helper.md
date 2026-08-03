# 01 — Player Status Domain Helper (CUT / WD / DQ Detection)

**What to build:** Add `getPlayerStatusInfo(comp)` to `@/lib/espn` to parse competitor status objects and identify CUT, WD, DQ, and MDF states.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] `getPlayerStatusInfo` identifies `isCut`, `isWD`, `isDQ`, `isMDF`.
- [ ] Returns appropriate badge labels (`CUT`, `WD`, `DQ`, `MDF`).
- [ ] Vitest unit tests verify status detection across ESPN payload variations.
