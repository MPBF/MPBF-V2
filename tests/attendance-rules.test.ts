import { describe, expect, test } from "@jest/globals";

import { attendanceSessionSummary, attendanceStatus, canRecordAttendance } from "../server/self-service-rules";

const at = (minute: number) => new Date(Date.UTC(2026, 8, 25, 8, minute, 0));

describe("attendance state and live-work timer", () => {
  test("allows only the next valid action", () => {
    expect(canRecordAttendance("check_in")).toBe(true);
    expect(canRecordAttendance("break_start", "check_in")).toBe(true);
    expect(canRecordAttendance("break_end", "break_start")).toBe(true);
    expect(canRecordAttendance("check_out", "break_end")).toBe(true);
    expect(canRecordAttendance("check_out", "break_start")).toBe(false);
  });

  test("pauses during break and resumes after return", () => {
    const summary = attendanceSessionSummary([
      { action: "check_in", occurred_at: at(0) },
      { action: "break_start", occurred_at: at(20) },
      { action: "break_end", occurred_at: at(30) },
    ], at(50));

    expect(summary.workedSeconds).toBe(40 * 60);
    expect(summary.actionTimes.break_start).toEqual(at(20));
    expect(attendanceStatus("break_end")).toBe("working");
  });

  test("stops permanently after checkout", () => {
    const events = [
      { action: "check_in", occurred_at: at(0) },
      { action: "check_out", occurred_at: at(45) },
    ];
    expect(attendanceSessionSummary(events, at(59)).workedSeconds).toBe(45 * 60);
    expect(attendanceSessionSummary(events, at(59)).actionTimes.check_out).toEqual(at(45));
  });
});
