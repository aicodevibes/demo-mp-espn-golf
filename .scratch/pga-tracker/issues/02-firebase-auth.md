# 02 — Firebase Authentication & Admin Auth Context

**What to build:** Firebase Authentication integration using GoogleAuthProvider, a React AuthContext provider exposing `user`, `loading`, `signInWithGoogle()`, `signOut()`, and `isAdmin` flag (`user?.email === 'aicodevibes@gmail.com'`), and a header Auth status component.

**Blocked by:** None — can start immediately.

**Status:** resolved


- [x] Firebase Client App initialization module (`src/lib/firebase/config.ts`)
- [x] React `AuthContext` provider & custom `useAuth()` hook
- [x] `isAdmin` check evaluating `user?.email === 'aicodevibes@gmail.com'`
- [x] Header Navigation user profile component with Google Sign-In & Sign-Out buttons

