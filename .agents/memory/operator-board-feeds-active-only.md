---
name: Operator board feeds are active-only
description: Film/Cutting operator dashboards only ever show in-progress orders, so completed-state UI gating on them is dead code.
---

# Operator dashboard feeds only return active/in-progress orders

The film and cutting operator dashboards are fed by endpoints that filter to
work still in progress:

- Cutting board (`/api/rolls/active-for-cutting`): returns only *uncut* rolls of
  orders with `po.status IN ('pending','active')`. An order's rolls disappear as
  they are cut, so `completedRolls === total_rolls` is effectively never true on
  this board.
- Film board (`/api/production-orders/active-for-operator`): filters
  `po.status IN ('pending','active')`, `film_completed = false`,
  `is_final_roll_created = false`. Completed/finalized orders are excluded before
  reaching the UI.

**Why:** these boards are "work to do now" queues, not history. Completed-order
review happens on the **Today's Production** board (`/api/production/today`,
last-24h roll-stage events), which *does* include completed orders.

**How to apply:** never gate an operator-board UI element on a "this order is
completed/final" condition — it will be unreachable. If a worker needs to act on
an order while it is still on his board (e.g. print batch/packaging labels while
packing), show the control on active orders and let the worker decide when to
use it. Put completion-dependent UI on Today's Production (or
ProductionOrdersManagement) instead.
