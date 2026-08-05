# Ticket 01: Auto-Assign Field Golfers

Type: task
Status: resolved
Blocked by: —

## What

Add a button in the Admin UI under "Roster & Seeding Controls" called "Auto-Assign Field Golfers".
It should:
1. Confirm with the admin before proceeding.
2. Ensure there are enough competitors in the ESPN field (at least 36).
3. Shuffle the active tournament competitors and assign 3 unique golfers to each of the 12 participants.
4. Save the updated participants list to Firestore using `setParticipantsForEvent(eventId, participants)`.
