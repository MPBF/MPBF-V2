---
name: Category production overrun scope
description: Distinguish category percentage configuration from changes to production calculations.
---

The user requested category percentage configuration with choices 0%, 5%, 10%, and 20%, and explicitly approved 0% as the default for existing and new categories.

**Why:** This request was for a category form field and database persistence, not replacement of the existing production calculation rules.

**How to apply:** Treat the category percentage as configuration metadata until the user requests its use in production calculations. Do not retroactively change existing orders' percentages or planned quantities when a category percentage changes.