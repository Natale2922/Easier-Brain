---
name: Session expiry auto-relogin
description: How the app handles expired Moodle sessions silently without prompting the user to log in again.
---

## Rule
Moodle session recovery may use only credentials the user explicitly chose to save. Store native credentials in SecureStore; never silently fall back to plaintext AsyncStorage or persist passwords on web. Legacy plaintext credentials require a migration prompt and must be deleted if the user declines.

**Why:** the user asked to be asked before saving campus login information and to keep account switching opt-in.

**How to apply:**
- If no consented campus credential exists, require a normal sign-in instead of saving one automatically.
- When an old plaintext credential is found, offer encrypted migration or deletion before using it.
- Keep SII credentials separate from Moodle account switching.
- After a session-expired response, retry the requested sync only once.
