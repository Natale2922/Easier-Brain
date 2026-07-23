---
name: Session expiry auto-relogin
description: How the app handles expired Moodle sessions silently without prompting the user to log in again.
---

## Rule
When `syncUniversityTasks` detects `sessionExpired: true` in the API response, it calls the optional `reloginFn` callback to silently re-authenticate, then retries the sync once.

**Why:** Moodle sessions expire after inactivity (~2 hours). Without auto-relogin, the app shows 0 tasks with no error and the user has no idea why. Storing credentials in AsyncStorage (`@university_creds_v1`) allows transparent re-auth.

**How to apply:**
- `AuthContext.reloginSilently()` reads from `@university_creds_v1`, calls `universityLogin`, updates session in `@university_auth_v1` and state, returns `{sessionToken, sesskey}` or null.
- `TasksContext.syncUniversityTasks(token, sesskey, reloginFn?)` accepts the callback and calls it if the server returns `{sessionExpired: true}`.
- In `index.tsx` doSync: `syncUniversityTasks(sessionToken, sesskey, reloginSilently)`.
- Credentials are also stored on successful login so future silent re-logins work.
- The moodle.ts AJAX parser throws `new Error('SESSION_EXPIRED')` when the Moodle AJAX response contains `requireslogin` or `servicerequireslogin` keywords.
- The `university.ts` route catches SESSION_EXPIRED and returns `{tasks: [], sessionExpired: true}` with HTTP 200 (not 401) so generated clients don't throw.
