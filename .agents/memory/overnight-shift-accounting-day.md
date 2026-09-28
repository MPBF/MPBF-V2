---
name: Overnight shift accounting day
description: Confirmed rule for attributing cross-midnight shift work and wages.
---

All worked hours and wages for a shift that crosses midnight belong to the local Riyadh date on which the shift starts. Preserve the real timestamp of each attendance event: a 19:00 check-in on January 1 and a 03:00 checkout on January 2 remain those exact dates, while the entire session is accounted for on January 1. The same rule applies across month boundaries.

**Why:** The project owner explicitly chose start-date accounting over splitting hours at midnight. A configurable "next-day check-in" clock should not be used to rewrite event dates or determine payroll attribution.

**How to apply:** Associate attendance actions with one shift session and its start-date business key; group daily/monthly payroll and attendance by that key, fetch boundary-crossing events, and avoid double counting. A separate permissible check-in/checkout window may still be needed for operational access, but it is not the accounting date.