---
name: Factory production scope
description: Approved business boundaries for per-roll execution, partial receipts, and future extensions.
---

Manufacturing completion and warehouse receipt are separate business events.
Receiving all currently ready output must not close film or finish manufacturing.
Film can close below the planned target; it must close explicitly, with real
rolls, before the finished manufacturing order can be considered complete.

**Why:** the user approved per-roll progression and partial receiving during
ongoing film production, not a sequential whole-order pipeline.

**How to apply:** preserve these distinctions when adding labels, reports,
scheduling, or warehouse extensions.

The approved warehouse scope is finished goods received from production with
storage locations, not purchasing, transfers, raw materials, or customer
delivery. Industrial hardware integration, automatic scheduling and public
roll sharing need separate approval.

**Why:** these extensions were explicitly outside the user's approved scope.

**How to apply:** do not infer permission to add them from the presence of
production inventory or QR traceability.