---
name: Shift roster consistency
description: Concurrency and historical-session rules for configurable monthly shift templates.
---

Monthly roster replacement must acquire the month advisory transaction lock, then recompute and validate both the roster revision and active employee set inside that same transaction before writing.

**Why:** Validating before the lock lets two editors pass with the same revision and silently overwrite each other.

**How to apply:** Any complete-month roster save must return a stale-revision conflict when assignments or eligible employees changed after the editor loaded the page.

Attendance checkout, break, and return stamps belong to the server-authoritative open attendance session date and its captured shift snapshot, even when timestamps fall beyond a generic scheduled-window margin.

**Why:** A legitimately late checkout must close and appear in the same historical session rather than being dropped from computed reports.

**How to apply:** Use timestamp-window matching only as a legacy fallback; prefer the persisted attendance date and snapshot for rows created through the open-session flow.