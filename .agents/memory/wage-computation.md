---
name: Wage computation policy
description: How monthly wages are computed from the attendance engine, and the rule for no-checkout (incomplete) days.
---

# Wage computation (computeAndSaveWage)

Monthly net wage is derived from the Phase 1 attendance engine totals (per-employee, per month):

- basicPay = scheduledDays * BASE_WORK_HOURS * rate (pays for ALL scheduled days up front)
- overtimePay = totalOvertimeHours * rate * overtimeMultiplier
- deductions = absence + **incomplete** + late + earlyLeave + withdrawal, each as (hours)*rate
- penalties = sum of non-cancelled violations' penalty_amount in the month
- rewards = sum of approved rewards in the month
- net = basicPay + overtimePay - deductions - penalties + rewards

## Incomplete-day rule (the non-obvious one)
A day where the employee checked in but never checked out is an "incomplete" day:
the attendance engine sets complete=false, workedHours=0, and does NOT charge
earlyLeave. Because basicPay credits every scheduled day fully, an incomplete day
would otherwise be paid a FULL day with zero offsetting deduction → overpayment.

**Rule:** deduct incomplete days as non-payable: `incompleteDeduction = incompleteDays * BASE_WORK_HOURS * rate`, folded into deductions_amount (and breakdown.incompleteDeduction).

**Why:** without a checkout we cannot verify actual hours, so the conservative,
reversible choice is to not pay the day. Correcting the checkout and recomputing
the wage restores correct pay.

**How to apply:** any change to the wage formula or the attendance totals must keep
incompleteDays accounted for; never pay incomplete days as full days.
