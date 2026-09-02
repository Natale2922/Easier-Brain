---
name: OpenAPI generation
description: Durable guidance for keeping the workspace OpenAPI-to-client generation reliable.
---

OpenAPI schema errors may be reported by Orval as an input-resolution failure rather than a useful YAML location.

**Why:** The generator can clean its output before failing, leaving runtime consumers with missing generated modules and misleading Metro errors.

**How to apply:** Validate the complete YAML structure and regenerate both API clients before running mobile or server checks; restart Metro after generated files are recreated.