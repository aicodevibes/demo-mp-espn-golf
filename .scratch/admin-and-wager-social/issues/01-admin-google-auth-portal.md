Title: Admin Google Auth Portal & Protected Route
Type: task
Status: resolved
Blocked by: 

## Question

How should `/admin` be updated so unauthenticated visitors see a dedicated Google Sign-In portal (with local dev fallback toggle) and non-admin users see an Access Denied view, while authenticated admins unlock the full management dashboard?

## Answer

Updated `src/app/admin/page.tsx`:
1. Removed automatic `router.push('/')` redirect so visitors landing on `/admin` remain on page.
2. Rendered an inline **Admin Access Portal** card for unauthenticated visitors (`!user`) featuring Google Sign-In button, dev quick login fallback, and dashboard back-link.
3. Rendered an **Access Denied** card for logged-in non-admin users (`user && !isAdmin`) featuring current account email, sign out / switch account button, and dashboard back-link.
4. Unlocked full Admin Dashboard UI for authenticated admins (`user && isAdmin`).
