---
name: Schema drift migrations
description: Safely applying a narrow additive schema change when the project's drizzle push is non-interactive.
---

When `drizzle-kit push` requests interactive schema-conflict resolution in a non-interactive session, do not use `--force` merely to apply one reviewed additive change.

**Why:** Existing schema drift can make a forced whole-schema diff apply unrelated, potentially destructive changes.

**How to apply:** Keep a checked-in idempotent migration for the specific change, execute only that reviewed statement through the configured database connection, then verify the resulting column constraints and that existing rows retain the intended default.