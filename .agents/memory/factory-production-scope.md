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

Released, untouched production plans appear as ready in film operation, but
the worker starts execution explicitly.

**Why:** the user selected «يظهر جاهزاً في الفيلم، والعامل يبدأه».

**How to apply:** do not hide eligible pending work just because execution
has not started; do not auto-start on release or create rolls or receipts
when starting. Historical, stopped and cancelled work is not new ready work.

Automatic film duration is one aggregate per production order and machine:
the time between its first and last recorded rolls, not a duration per roll.

**Why:** the user explicitly corrected «لا اريد حساب مدة كل رول اريد حساب
المدة فقط من اول رول الى اخر رول فقط» and selected «لكل أمر إنتاج على كل
ماكينة».

**How to apply:** do not substitute adjacent-roll durations, sum manual minutes,
or combine different orders/machines. Remove manual duration entry without
rewriting historical records.

لا تحذف تاريخاً أو تغير قاعدة الإنتاج المنشورة دون موافقة مستقلة.

**Why:** the user explicitly required this boundary when approving archive
performance work; optimization is not permission to discard factory history
or migrate the published database.

**How to apply:** use disposable local databases for volume benchmarks.
Any published-database change needs separate approval.
