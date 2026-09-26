import { describe, expect, it } from "@jest/globals";

import { dayRange, monthRange, riyadhDayKey, summarizeAttendance } from "../server/hr-report";

describe("HR attendance reports", () => {
  it("uses Riyadh calendar boundaries", () => {
    const range = dayRange("2026-09-01");
    expect(range.start.toISOString()).toBe("2026-08-31T21:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-09-01T21:00:00.000Z");
    expect(riyadhDayKey(range.start)).toBe("2026-09-01");
  });

  it("calculates work, breaks, overtime, and absence", () => {
    const range = monthRange("2026-09");
    const assignment = {
      id: 7,
      userId: 1,
      assignedAt: new Date("2026-08-31T21:00:00.000Z"),
      unassignedAt: null,
      startTime: "08:00",
      endTime: "16:00",
      breakMinutes: 30,
    };
    const events = [
      [1, "check_in", "2026-09-01T05:00:00.000Z"],
      [2, "break_start", "2026-09-01T09:00:00.000Z"],
      [3, "break_end", "2026-09-01T09:30:00.000Z"],
      [4, "check_out", "2026-09-01T14:00:00.000Z"],
    ].map(([id, action, occurredAt]) => ({
      id: Number(id), userId: 1, assignmentId: 7, action: String(action), occurredAt: new Date(String(occurredAt)),
    }));
    const totals = summarizeAttendance(1, events, [assignment], range, new Date("2026-09-03T12:00:00.000Z"));
    expect(totals.workedMinutes).toBe(510);
    expect(totals.overtimeMinutes).toBe(60);
    expect(totals.daysWorked).toBe(1);
    expect(totals.absentDays).toBe(2);
  });

  it("does not count Friday and Saturday as absence", () => {
    const range = monthRange("2026-09");
    const assignment = {
      id: 1,
      userId: 2,
      assignedAt: range.start,
      unassignedAt: null,
      startTime: "08:00",
      endTime: "16:00",
      breakMinutes: 0,
    };
    const totals = summarizeAttendance(2, [], [assignment], range, new Date("2026-09-06T08:00:00.000Z"));
    expect(totals.absentDays).toBe(4);
  });
});
