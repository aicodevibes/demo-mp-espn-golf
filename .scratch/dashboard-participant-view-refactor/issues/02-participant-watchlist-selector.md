# Ticket 02: Participant Watchlist Selector

Type: grilling
Status: resolved

## Question

How should the dashboard UI allow any of the 12 participants to select their view, and how will their 3 drafted golfers populate the `TrackedPlayerHeroGrid` instead of the global admin-tracked golfers?

## Answer

Added `selectedParticipantId` state and a Participant View dropdown selector to Section 1 of `src/app/page.tsx`. `displayCompetitors` now dynamically maps the selected participant's 3 drafted golfers from the live ESPN tournament field.

