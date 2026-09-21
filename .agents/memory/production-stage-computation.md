---
name: Production order stage computation
description: How production_orders.production_stage is auto-derived from roll stages, and the inline-printing pitfall.
---

# Rule

`production_stage` is recomputed (in `updateProductionOrderCompletionPercentages`,
and mirrored in the startup `backfillProductionOrderStages`) from the aggregate of
a PO's rolls. A PO must NOT advance past `film` until film is actually complete:
`film_completed = true` (operator created the final roll) OR produced weight has
reached the target (`final_quantity_kg`, falling back to `quantity_kg`).

**Why:** Inline-printed rolls are created directly at `stage='printing'` (they skip
the film roll stage). So "no rolls currently in `film` stage" (`filmRolls === 0`) is
NOT a reliable signal that film production finished. The old logic used
`filmRolls === 0 -> 'cutting'` unconditionally, so a single inline-printed roll on
an unfinished order pushed it to `cutting` and dropped it off the film operator
board before the required quantity was produced. The same hazard exists in any
concurrent flow where the printing operator empties the film stage before the film
operator finishes creating rolls.

**How to apply:** Any time you touch stage derivation, keep the `filmRolls === 0`
→ `cutting` branch gated behind a `filmDone` check, and keep the runtime function
and the backfill SQL in lockstep (same target definition, same CASE ordering).
The film operator board (`getActiveProductionOrdersForOperator`) filters
`film_completed=false AND is_final_roll_created=false AND production_stage='film'`.
The printing/cutting boards filter by `roll.stage` + `po.status`, NOT by
`production_stage` — so correcting `production_stage` never hides in-progress rolls.
