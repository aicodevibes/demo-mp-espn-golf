# Product Requirements Document (PRD)
**US Open Draft Dashboard & Greedy Side-Game**

---

## 1. Overview & Context

This project provides a tournament-tracking dashboard for a **12-participant US Open draft contest**. It aggregates live professional golf leaderboard data from ESPN to display participant standings, calculate payouts, track a daily "Day Money" prize, and host a separate "Greedy" side-game.

The system is designed to run automatically during the tournament and allows administrators to manually update data, seed rosters, manage participants, and configure contest settings.

---

## 2. Roster Rules & Draft Format

### A. Main Tournament
* **Participants**: Exactly 12 participants.
* **Roster Size**: Each participant drafts a roster of **3 players** before the tournament starts.
* **Lineup Constraints**: 
  * On Day 1 and Day 2, all drafted players are active.
  * After the Day 2 cut line, if any players are cut, they are deactivated. If a participant has active players remaining, they continue competing.

### B. Greedy Side-Game
* **Participants**: A subset of participants flagged as `isGreedyParticipant` in Firestore (e.g., 7 participants).
* **Format**: Each participant is assigned a single `greedyPlayerId` golfer.
* **Prizing**: Winner-takes-all. Total purse is computed dynamically from the `greedyEntryFee` (default `$50` per player) times the number of Greedy participants. The purse amount is displayed live on the `/greedy` page.

---

## 3. Scoring & Leaderboard Rules

### A. Daily Score Calculation
* For each day (1 to 4), a participant's score is computed by taking the **sum of the two best (lowest) scores-to-par** from their drafted players on that specific round.
* **4th Golfer (index 3) Rules**:
  * **Day 1 & Day 2**: The 4th golfer's scores do **NOT** count toward the participant's daily score or Day Money eligibility (`roundScoresToPar[rd] = null`).
  * **Day 3 & Day 4**: The 4th golfer is active for R3 and R4 and contributes their score-to-par to the participant's daily score normally.
* **Day 3 & Day 4 (Cut Handling)**: 
  * Any player who has been cut or withdrawn (WD) receives `roundScoresToPar[rd] = null` for Day 3 and Day 4, effectively excluding them from the "lowest two" calculation.
  * Cut/WD status is determined dynamically by `getPlayerStatusInfo()` in `lib/espn` based on ESPN competitor status.
* **Participant Cut Status**: 
  * A participant is marked as `isCut: true` when **all drafted players** (across any roster index) are cut or WD (`activeGolfersCount === 0`).
  * Cut participants are automatically sorted to the bottom of the standings.

### B. Overall Score
* The total participant score is the cumulative sum of the calculated daily scores across all 4 days.
* Standing positions are sorted with active participants first (ranked by total score ascending), and cut participants at the bottom.
* Standard competition tie handling is used (e.g., ranks 1, 2, 2, 4).

### C. Day Money
* **Eligibility**: Only drafted golfers are eligible to win Day Money. Undrafted golfers' scores do not count.
* **Winner Selection**: The participant who owns the golfer with the **lowest stroke count** for that specific day is awarded Day Money ($75.00 total pool per day, configurable via `contestConfig.dayMoneyPool`).
* **Tie Splitting**: If multiple drafted golfers tie for the lowest score of the day, the $75.00 pool is split equally among the participants who own those golfers.
* **Cut Handling**: Cut or WD golfers are ineligible for Day Money on Day 3 and Day 4.
* **4th Golfer**: The 4th golfer (index 3) is excluded from Day Money on Day 1 and Day 2, but is eligible on Day 3 and Day 4.

---

## 4. Payouts & Tie-Breakers

### A. Main Tournament Payouts
* **Prize Pool**: 1st ($600), 2nd ($320), 3rd ($180), and 4th ($100). Configurable via `contestConfig.mainPayouts`.
* **Purse Splitting**: If participants tie for a payout position, the prize pools for the occupied ranks are combined and divided equally. (e.g., a two-way tie for 2nd splits 2nd and 3rd place prizes: `($320 + $180) / 2 = $250` each).

### B. Scorecard Playoff Finalization
* To resolve ties in the Top 4 and establish final standings, finalization can be triggered via the Admin panel.
* Playoff/finalization state is tracked via `contestConfig.isFinalized` in Firestore.

---

## 5. System Features & Control Panel

* **Google Authentication**: Admin access is gated using `AuthContext` (`src/context/AuthContext.tsx`) which exposes a `useAuth()` hook. Admin status is determined by comparing the signed-in user's email against `NEXT_PUBLIC_ADMIN_EMAIL`.
* **Client-Side Operations**: All database reads use Firestore real-time subscriptions (`onSnapshot`) via custom hooks in `lib/firebase/firestore.ts` (`useActiveConfig`, `useContestConfig`, `useParticipants`, `useTrackedPlayers`).
* **Admin Panel (`/admin`)**: A full-featured admin client page (`src/app/admin/page.tsx`) handles Firestore mutations directly using the Firebase client SDK (no Server Actions). Capabilities include:
  * Setting the active event, configuring contest settings.
  * Adding/removing participants and managing their drafted player IDs.
  * Assigning Greedy golfers and toggling `isGreedyParticipant` flags.
  * Managing tracked watchlist players.
* **Greedy Side-Game (`/greedy`)**: A dedicated page (`src/app/greedy/page.tsx`) displays Greedy side-bet standings and the dynamic total purse.
* **ESPN Proxy API Routes**: Three ESPN data proxy endpoints under `src/app/api/espn/`:
  * `/api/espn/scoreboard` — fetches available tournament events.
  * `/api/espn/leaderboard` — fetches competitors and linescores for a given event.
  * `/api/espn/playersummary` — fetches a single player's detailed round data.
* **Manual Override**: Admin can set contest configuration values in Firestore (including cut overrides) via the Admin panel.

---

## 6. Technical Stack

* **Frontend Framework**: Next.js 16 (`16.2.12`) & React 19.
* **State & Data Flow**: 
  * `useAuth()` hook from `AuthContext` for auth state.
  * Custom Firestore hooks (`useActiveConfig`, `useContestConfig`, `useParticipants`, `useTrackedPlayers`) for real-time data.
  * `useMemo` extensively used in `page.tsx`, `greedy/page.tsx`, and components to memoize standings calculations, field evaluations, and day money lookups.
* **Core Domain Modules (centralized in `src/lib/`)**:
  * `scoring.ts` — `calculateParticipantStandings`, `calculateDayMoneyWinners`, `calculateGreedyStandings`, `calculateWagerSettlement`.
  * `settlement.ts` — `calculateWagerSettlement` deep module for wager ledger logic.
  * `contestEngine.ts` — `evaluateContest` orchestrates all scoring in a single atomic pass.
  * `fieldLeaderboard.ts` — `evaluateFieldLeaderboard` categorizes competitors into Top 10, other drafted, active field, and cut field in a single pass.
  * `activityFeed.ts` — live activity event generation.
  * `espn/` — ESPN data fetching, golfer status helpers, and golfer matcher utilities.
* **Components (in `src/components/`)**:
  * `Header.tsx`, `TrackedPlayerHeroGrid.tsx`, `ScorecardMatrix.tsx`
  * `Top10Leaderboard.tsx`, `DraftedPlayersLeaderboard.tsx`, `FullFieldLeaderboard.tsx`
  * `ParticipantStandings.tsx`, `DayMoneyWinners.tsx`, `WagerSettlementLedger.tsx`
  * `LiveLeaderboard.tsx`, `LiveActivityFeed.tsx`, `CompetitorRow.tsx`, `GolferHeadshot.tsx`
* **Database**: Cloud Firestore (real-time subscriptions via `onSnapshot` client-side; direct client SDK writes in the Admin panel).
* **Deployment**: Firebase App Hosting (`apphosting.yaml`).

---

## 7. Security & Architecture Notes

### A. Access Control (Current State)
* **Admin email** is hardcoded in both `firestore.rules` (as `aicodevibes@gmail.com`) and `src/app/admin/page.tsx` (`ADMIN_EMAILS` array). It is also configurable via the `NEXT_PUBLIC_ADMIN_EMAIL` environment variable in `apphosting.yaml`.
* **No `finalize-standings` API route** exists. There is no `/api/finalize-standings` endpoint. Final standings state is managed via Firestore (`isFinalized` flag) through the Admin panel.
* **No `CRON_SECRET`** or `/api/sync` cron endpoint is present in the current codebase. Score synchronization is performed manually via admin-triggered fetches from the ESPN proxy API routes.

### B. Future Security Recommendations
* **Dynamic Role-Based Access Control**: Remove hardcoded personal email addresses from `firestore.rules`. Rely exclusively on a query check against a secure `/usopen_users/{userId}` user roles collection.
* **Centralize Environment Secrets**: Migrate any future secrets (e.g., cron keys) from plaintext configuration files (`apphosting.yaml`) to Google Cloud Secret Manager.

### C. Architecture (Implemented)
* **Scoring Logic Centralized**: Player cut calculations, daily scores, and payouts are fully centralized in `lib/scoring.ts` and `lib/settlement.ts`. These are imported by `lib/contestEngine.ts`, `app/page.tsx`, `app/greedy/page.tsx`, and `app/admin/page.tsx`.
* **Render Memoization Implemented**: Standings calculations, standings sorting, field evaluations, and day money winner lookups are wrapped in `useMemo` blocks in `app/page.tsx`, `app/greedy/page.tsx`, and individual components (`Top10Leaderboard`, `DraftedPlayersLeaderboard`, `FullFieldLeaderboard`, `LiveLeaderboard`).
