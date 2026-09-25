import assert from "node:assert/strict";
import { test } from "node:test";
import { attendanceStatus, canRecordAttendance, presentDaysInMonth, type AttendanceAction } from "./self-service-rules";

test("attendance requires check-in, permits repeated breaks, and forbids exit during a break", () => {
  const sequence: AttendanceAction[] = ["check_in", "break_start", "break_end", "break_start", "break_end", "check_out"];
  let previous: AttendanceAction | undefined;
  for (const action of sequence) {
    assert.equal(canRecordAttendance(action, previous), true);
    previous = action;
  }
  assert.equal(attendanceStatus(previous), "out");
  assert.equal(canRecordAttendance("break_end", previous), false);
  assert.equal(canRecordAttendance("check_out", "break_start"), false);
  assert.equal(canRecordAttendance("check_in", "check_in"), false);
  assert.equal(canRecordAttendance("break_start"), false);
});

test("Riyadh monthly presence includes overnight work crossing month boundary", () => {
  const start = new Date("2026-08-31T21:00:00Z"); // September 1, 00:00 Riyadh
  const end = new Date("2026-09-30T21:00:00Z");
  const events = [
    { action: "check_out", occurred_at: new Date("2026-08-31T23:00:00Z") },
    { action: "check_in", occurred_at: new Date("2026-09-01T19:00:00Z") },
    { action: "break_start", occurred_at: new Date("2026-09-01T22:00:00Z") },
    { action: "break_end", occurred_at: new Date("2026-09-01T23:00:00Z") },
    { action: "check_out", occurred_at: new Date("2026-09-02T03:00:00Z") },
  ];
  assert.equal(presentDaysInMonth(events, "check_in", start, end, new Date("2026-09-03T00:00:00Z")), 2);
  assert.equal(presentDaysInMonth([], "check_out", start, end, new Date("2026-09-03T00:00:00Z")), 0);
});