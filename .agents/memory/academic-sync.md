---
name: Academic data and change notifications
description: Persistence strategy for stable campus information and Moodle task changes
---

The mobile app keeps stable academic records locally (subjects, teachers, rooms, and schedule) and only adds newly observed subject names. Moodle does not provide push events in this campus setup, so task changes are detected during foreground/polling syncs and recorded in a per-account in-app notification history; device alerts are optional.

**Why:** The campus has web services disabled and does not expose a push channel, while students still need offline access to their semester structure and prompt awareness of task changes.

**How to apply:** Preserve the local academic store when syncing variable tasks. Treat teacher/room fields as authoritative only when supplied by Moodle or entered/digitized by the student; never fabricate campus metadata. A failed re-login can only be reported as a session/credential issue—the campus does not expose a direct password-change event.