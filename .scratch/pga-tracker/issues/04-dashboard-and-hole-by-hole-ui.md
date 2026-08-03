# Ticket 04: Dashboard UI & Hole-by-Hole Hole Card Layout Prototype

Type: prototype
Status: resolved
Blocked by: 03

## Question

How should the personal dashboard display live leaderboards, player comparison cards, player headshots, and detailed 18-hole scorecard breakdowns for selected players?

## Answer

### 1. Dashboard Layout Structure

```
+-----------------------------------------------------------------------------------+
|  [PGA Logo] PGA Performance Pulse   Active: Augusta National GC    [Google Auth]  |
+-----------------------------------------------------------------------------------+
|  TRACKED PLAYERS SUMMARY (Hero Grid Cards)                                        |
|  +--------------------+  +--------------------+  +--------------------+           |
|  | [Headshot]         |  | [Headshot]         |  | [Headshot]         |           |
|  | S. Scheffler  -12  |  | R. McIlroy   -9    |  | C. Morikawa  -7    |           |
|  | Pos: 1st  Thru: F  |  | Pos: 2nd  Thru: 15 |  | Pos: T4   Thru: F  |           |
|  +--------------------+  +--------------------+  +--------------------+           |
+-----------------------------------------------------------------------------------+
|  MAIN DASHBOARD VIEW                                                              |
|                                                                                   |
|  LEFT (60%): 18-Hole Interactive Scorecard    RIGHT (40%): Live Leaderboard       |
|  [Player Tabs: Scheffler | McIlroy]          +----------------------------------+ |
|  [Round Selector: R1 | R2 | R3 | R4]         | Pos  Player         Score  Thru  | |
|  +-----------------------------------+       | 1    S. Scheffler   -12    F     | |
|  | Hole  1 2 3 4 5 6 7 8 9 OUT 10..  |       | 2    R. McIlroy     -9     15    | |
|  | Par   4 5 4 3 4 4 3 4 5 36  4..   |       | 3    V. Hovland     -8     F     | |
|  | Score 3 4 4 3 5 4 2 4 4 33  4..   |       +----------------------------------+ |
|  +-----------------------------------+       | ADMIN CONTROLS (if signed in)    | |
|  Legend: (Gold) Eagle | (Green) Birdie       | [Select Event] [Add Player]      | |
|          (Red) Bogey                         +----------------------------------+ |
+-----------------------------------------------------------------------------------+
```

### 2. Key Component Specifications
- **Tracked Player Hero Cards**: Displays photo thumbnail (`headshot.href`), position badge, colored `toPar` score, and round status.
- **18-Hole Matrix Scorecard**:
  - Out (Holes 1-9), In (Holes 10-18), and Total score summaries.
  - Golf scoring styling: Gold double-circle (Eagle/Better), Emerald circle (Birdie), Rose square (Bogey), Maroon filled square (Double Bogey+).
- **Admin Event & Player Drawer**: Modal/Sidebar available only when `isAdmin` is `true` for adding golfers or changing active PGA tournaments.

