# Ticket 04: Dehardcode Display Components

Type: task
Status: resolved
Blocked by: 01, 03

## What

Remove all hardcoded event-specific strings and dollar amounts from `DayMoneyWinners.tsx` and `ParticipantStandings.tsx`. These values should either come from `ContestConfig` props or be derived dynamically from the data.

## Hardcoded Strings to Remove

### DayMoneyWinners.tsx
| Current | Replace With |
|---|---|
| `"Day Money Winners ($75.00 / Day)"` | `"Day Money Winners (${config.dayMoneyPool.toFixed(2)} / Day)"` |
| `"$300 total purse"` | `"$${(config.dayMoneyPool * 4).toFixed(0)} total purse"` (4 rounds × pool) |

### ParticipantStandings.tsx
| Current | Replace With |
|---|---|
| `"12-Participant US Open Pool"` | `"{standings.length}-Participant Pool"` |
| `"Best 2 daily drafted scores"` | keep (it's rule description, not event-specific) |
| `$600`, `$320`, `$180`, `$100` hardcoded prize labels | derive from `contestConfig.mainPayouts[0..3]` |

## Props Changes

### DayMoneyWinners
```ts
interface DayMoneyWinnersProps {
  dayMoneyResults: DayMoneyRoundResult[];
  contestConfig: ContestConfig | null;   // ← NEW
  loading?: boolean;
}
```

### ParticipantStandings
```ts
interface ParticipantStandingsProps {
  standings: ParticipantStanding[];
  contestConfig: ContestConfig | null;   // ← NEW
  loading?: boolean;
}
```

## Acceptance Criteria

1. No literal dollar amounts or "US Open" / "12-Participant" strings remain in either component
2. Prize allocation pills in `ParticipantStandings` render correctly from `contestConfig.mainPayouts` (or sensible defaults when null)
3. When `contestConfig` is null (loading), components degrade gracefully — show dashes or loading state, not broken layout
4. `npx tsc --noEmit` clean
5. Existing snapshot/render tests still pass (update props to pass mock `contestConfig`)

## Files Touched

- `src/components/DayMoneyWinners.tsx` — MODIFY
- `src/components/ParticipantStandings.tsx` — MODIFY
