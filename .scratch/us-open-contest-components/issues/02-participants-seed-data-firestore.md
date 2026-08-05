# Ticket 02: Participants Firestore Schema & Seed Data

Type: task
Status: resolved
Blocked by: 01

## Question

How should we update `firestore.rules` for `/participants/{id}` and create seed data in `src/lib/firebase/seedData.ts` matching the 12 participants from `theopen.losinger.net` (Pat, Greg, Dereck, Robbie, Clay, Billy Fred, Roby, Garis, Bruce, Jim, Cole, Scott)?

## Answer

Configured `/participants/{participantId}` security rules in `firestore.rules`. Created `src/lib/firebase/seedData.ts` with the 12 participants from `theopen.losinger.net`, and added the `useParticipants` real-time hook with automatic seed fallback.

