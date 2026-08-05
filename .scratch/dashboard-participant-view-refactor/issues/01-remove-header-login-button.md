# Ticket 01: Header Auth Cleanup

Type: task
Status: resolved

## Question

How should the main page `Header` component handle authentication links so that the main header is clean of Google Sign-in while still allowing administrators to access `/admin`?

## Answer

Removed Google Sign-In button from `src/components/Header.tsx` for unauthenticated visitors, replaced with a subtle `Admin` link to `/admin`. For authenticated admin users, an `Admin Panel` button is rendered.

## Context

Currently `Header.tsx` renders a prominent Google Sign-In button for non-authenticated users. The user requested removing the login button from the main header, keeping admin authentication focused on `/admin`.
