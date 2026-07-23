---
name: API caching fix for university tasks
description: Why the university/tasks Express route must disable all caching.
---

## Rule
Always set these headers on `GET /university/tasks`:
```typescript
res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
res.setHeader("Pragma", "no-cache");
res.removeHeader("ETag");
```

**Why:** Express auto-generates ETags. When Moodle returns an empty `{"tasks":[]}` (e.g. after session expiry or scrape fallback), the ETag matches the cached version and the client receives HTTP 304. The mobile app treats 304 as "no change" and never retries — leaving the task list permanently empty with no visible error.

**How to apply:** These headers are already in `artifacts/api-server/src/routes/university.ts` GET handler. Any new university routes that return task data should also include them.
