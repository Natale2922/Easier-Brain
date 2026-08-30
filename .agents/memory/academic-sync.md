---
name: Academic data and change notifications
description: Persistence strategy for stable campus information and Moodle task changes
---

The mobile app keeps stable academic records locally (subjects, teachers, rooms, and schedule) and merges new subject names from Moodle tasks. Moodle does not provide push events in this campus setup, so the app compares a local task snapshot during foreground/polling syncs and sends device notifications for new or changed university tasks.

**Why:** The campus has web services disabled and does not expose a push channel, while students still need offline access to their semester structure and prompt awareness of task changes.

**How to apply:** Preserve the local academic store when syncing variable tasks. Treat teacher/room fields as authoritative only when supplied by Moodle or entered/digitized by the student; never fabricate campus metadata.