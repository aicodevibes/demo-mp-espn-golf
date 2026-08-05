Title: Research ESPN Player Fuzzy Name & ID Matching
Type: research
Status: resolved
Blocked by: 

## Question

How to map user-entered golfer strings (e.g., "Scottie Scheffler", "Scheffler", "S. Scheffler") to ESPN Competitor athlete IDs reliably, handling alternate spellings, last name fallbacks, and ID normalization?

## Answer

Created normalization & multi-tier matching strategy in `src/lib/espn/golferMatcher.ts`:
1. Strips diacritics & punctuation (e.g. `Åberg` -> `aberg`, `S. Scheffler` -> `s scheffler`).
2. Priority scoring: Exact ID -> Exact Display Name -> Short Name -> Initial + Last Name -> Last Name -> Substring.
3. Provides `matchGolferInputToId` and `findCompetitorByQuery`.
