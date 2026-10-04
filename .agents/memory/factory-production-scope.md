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

Order release is a focused transition to ready for production, not a general
status editor or automatic manufacturing start.

**Why:** the user selected «زر تحويل للإنتاج في القائمة والتفاصيل» rather than
adding a status selector to the order-edit form, after approving a readiness-only
transition.

**How to apply:** keep both entry points and preserve explicit production start;
do not broaden the action into arbitrary historical-order reopening.
لا تحذف تاريخاً أو تغير قاعدة الإنتاج المنشورة دون موافقة مستقلة.

**Why:** the user explicitly required this boundary when approving archive
performance work; optimization is not permission to discard factory history
or migrate the published database.

**How to apply:** use disposable local databases for volume benchmarks.
Any published-database change needs separate approval.
