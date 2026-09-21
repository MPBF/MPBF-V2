---
name: HR/schema tables must be in the startup ensure-block, not just schema.ts
description: On existing DBs, drizzle-kit push does not auto-run, so any table only defined in shared/schema.ts but missing from the server/index.ts ensure-block will 500 every query that touches it.
---

# Schema-only tables silently break on existing DBs

`drizzle-kit push --force` only runs on startup for *new/empty* databases (0 tables)
or to add specific critical missing tables. It does **not** reconcile the full schema
on an existing DB. So a table that exists in `shared/schema.ts` but was never added to
the idempotent startup ensure-block in `server/index.ts` can be entirely absent from a
merged/legacy database.

When that happens, every Drizzle query touching the missing table throws, and because
HR list endpoints fan out (e.g. the employee directory query also pulls the monthly
shift roster), a single missing table 500s several unrelated-looking pages — the page
shows "no records" and create forms appear broken, masking the real cause.

**Why:** `shift_assignments` (Phase 1) lived only in `shared/schema.ts`; the ensure-block
covered only the Phase 2 HR tables (rewards/custody/traits/wage_records). On the merged
DB the table was missing, so `getHREmployees`, `getShiftAssignmentsByPeriod`, and
`getAttendanceReportByRange` all 500'd, leaving the HR directory empty and the
per-employee file unreachable.

**How to apply:**
- Any new table added to `shared/schema.ts` must also get an idempotent
  `CREATE TABLE IF NOT EXISTS` (+ matching indexes) in the `server/index.ts` startup
  ensure-block, mirroring column names/nullability/FKs exactly.
- When an HR/list page shows "empty + can't add", first check the *list/directory*
  endpoint for a 500 from a missing table before assuming the create-form is broken —
  dump real columns with `information_schema.columns WHERE table_name='...'` (0 rows = table absent).
- Verify storage functions at the layer, not via ad-hoc Date args: match the function
  signature (several HR storage fns take `from:string,to:string`, not Date objects).
