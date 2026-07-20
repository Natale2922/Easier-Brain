---
name: University Moodle sync
description: How the app integrates with the UTXicotepec campus virtual (Moodle) to sync tasks
---

## Setup
- University platform: http://campusvirtual.utxicotepec.edu.mx/
- Moodle Web Services API is **disabled** on this server (returns enablewsdescription error)
- Integration works via form-POST login + Moodle's internal AJAX endpoint

## Auth flow
1. GET /login/index.php → extract initial MoodleSession cookie + logintoken (CSRF)
2. POST /login/index.php with credentials → extract new MoodleSession from Set-Cookie (redirect=manual)
3. GET /my/ with new session → extract sesskey (needed for AJAX) + userFullname
4. Store {sessionToken, sesskey, userFullname} in AsyncStorage @university_auth_v1

**Why:** Node fetch doesn't auto-carry cookies through redirects. Must use `redirect: 'manual'` and extract Set-Cookie from the 303 response.

## Task fetching
- Primary: POST /lib/ajax/service.php?sesskey=...&info=core_calendar_get_action_events_by_timesort
  - Uses session cookie + sesskey (bypasses disabled web services)
  - Returns events 0–90 days ahead as JSON
- Fallback: HTML scrape /calendar/view.php?view=upcoming with cheerio

## Sync strategy
- Sync on app mount, on AppState 'active' (foreground), every 30 min interval
- Deduplication by externalId (Moodle event ID) — preserves completion status
- University tasks have source:'university', manual tasks have source:'manual'
- Storage key: @tasks_v1 (same key, extended Task type)

## Backend route
- POST /api/university/login → moodleLogin() in src/lib/moodle.ts
- GET /api/university/tasks?sessionToken=...&sesskey=... → getMoodleTasks()
- cheerio installed on @workspace/api-server for HTML fallback parsing
