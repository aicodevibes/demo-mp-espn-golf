# Ticket 02: Firebase Auth & Google Account Admin Whitelisting

Type: task
Status: resolved
Blocked by: 01

## Question

How will Firebase Auth Google Sign-In be integrated, and how will access control be enforced at both Firestore Security Rules and Next.js App Router levels to ensure only `aicodevibes@gmail.com` can configure events and tracked players?

## Answer

### 1. Authentication Layer (Firebase Auth)
- **Provider**: `GoogleAuthProvider` via `signInWithPopup` / `signInWithRedirect` in client components using Firebase Auth SDK v10 modular syntax.
- **Context & Hook**: React `AuthContext` provides `user`, `loading`, `signInWithGoogle()`, `signOut()`, and `isAdmin` flag (`user?.email === 'aicodevibes@gmail.com'`).

### 2. Database Security Layer (Firestore Security Rules)
Update `firestore.rules` to enforce strict email-based admin whitelisting for mutation operations:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null && 
             request.auth.token.email_verified == true && 
             request.auth.token.email == 'aicodevibes@gmail.com';
    }

    // Public read for tournament & player configuration
    match /config/{docId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /trackedEvents/{eventId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /trackedPlayers/{playerId} {
      allow read: if true;
      allow write: if isAdmin();
    }
  }
}
```

### 3. Client UI & Route Protection
- **Read Access**: Open to all users (anyone can view the PGA dashboard and leaderboards).
- **Admin Configuration (Event & Player Picker)**: Interactive controls (add/remove tracked players, select active tournament) are conditionally rendered only when `isAdmin` is `true`.

