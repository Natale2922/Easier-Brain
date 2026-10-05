---
name: SII credential boundary
description: Credential handling and transport constraints for the UTXJ SII integration.
---

SII credentials are a separate account from Moodle and must never be substituted from the Campus Virtual login. On native devices, persist them only with Expo SecureStore; browser development keeps them in memory only. Never log passwords or expose developer credential helpers in the UI.

**Why:** The user requested an independent SII sign-in, and the university SII endpoint responds over HTTP while HTTPS times out. Device encryption does not encrypt the server-to-SII connection.

**How to apply:** Keep the warning about the SII's unencrypted HTTP transport visible before sign-in. Do not claim the full SII connection is secure, and do not reuse Moodle credentials.
