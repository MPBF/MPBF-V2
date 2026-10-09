---
name: Report loading compatibility
description: Preserve exporter compatibility while reducing initial downloads.
---

Optimize when report engines download before replacing them with reduced builds.
A warning about a deferred exporter is not evidence that it slows initial login.

**Why:** The optimization request required unchanged report functionality.
Keeping the existing complete SheetJS build avoids an unreviewed format-support
change merely to suppress its size warning.

**How to apply:** Verify production-build network requests before and after the
export action, and compare the generated report data in both languages. Treat
changing export engines or supported formats as a separate compatibility change.
