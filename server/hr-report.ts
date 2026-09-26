export type ReportEvent = {
  id: number;
  userId: number;
  assignmentId: number | null;
  action: string;
  occurredAt: Date;
};

export type ReportAssignment = {
  id: number;
  userId: number;
  assignedAt: Date;
  unassignedAt: Date | null;
  startTime: string;
  endTime: string;
  breakMinutes: number;
};

export type AttendanceTotals = {
  workedMinutes: number;
  daysWorked: number;
  absentDays: number;
  overtimeMinutes: number;
};

const RIYADH_OFFSET = 3 * 60 * 60 * 1000;

export function riyadhDayKey(value: Date) {
  return new Date(value.getTime() + RIYADH_OFFSET).toISOString().slice(0, 10);
}

export function monthRange(month: string) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  if (!match) throw Object.assign(new Error("صيغة الشهر غير صالحة"), { status: 400 });
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const start = new Date(Date.UTC(year, monthIndex, 1) - RIYADH_OFFSET);
  const end = new Date(Date.UTC(year, monthIndex + 1, 1) - RIYADH_OFFSET);
  return { start, end };
}

export function dayRange(day: string) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.exec(day);
  if (!match) throw Object.assign(new Error("صيغة اليوم غير صالحة"), { status: 400 });
  const start = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) - RIYADH_OFFSET);
  if (riyadhDayKey(start) !== day) throw Object.assign(new Error("اليوم المحدد غير صالح"), { status: 400 });
  return { start, end: new Date(start.getTime() + 86_400_000) };
}

function shiftMinutes(assignment: ReportAssignment) {
  const [startHour, startMinute] = assignment.startTime.split(":").map(Number);
  const [endHour, endMinute] = assignment.endTime.split(":").map(Number);
  let minutes = endHour * 60 + endMinute - startHour * 60 - startMinute;
  if (minutes <= 0) minutes += 1440;
  return Math.max(0, minutes - assignment.breakMinutes);
}

function workingDay(day: string) {
  const weekday = new Date(`${day}T12:00:00+03:00`).getUTCDay();
  return weekday !== 5 && weekday !== 6;
}

function dateKeys(start: Date, end: Date, cutoff: Date) {
  const keys: string[] = [];
  for (let cursor = new Date(start); cursor < end && cursor < cutoff; cursor = new Date(cursor.getTime() + 86_400_000)) {
    keys.push(riyadhDayKey(cursor));
  }
  return keys;
}

export function summarizeAttendance(
  userId: number,
  events: ReportEvent[],
  assignments: ReportAssignment[],
  range: { start: Date; end: Date },
  now = new Date(),
): AttendanceTotals {
  const userEvents = events.filter((event) => event.userId === userId).sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime() || a.id - b.id);
  const userAssignments = assignments.filter((assignment) => assignment.userId === userId);
  const perDay = new Map<string, { worked: number; expected: number }>();
  let workingSince: Date | null = null;
  let activeDay = "";
  let activeAssignment: ReportAssignment | undefined;

  const closeInterval = (at: Date) => {
    if (!workingSince || !activeDay) return;
    const safeEnd = Math.min(at.getTime(), workingSince.getTime() + 24 * 60 * 60 * 1000, range.end.getTime(), now.getTime());
    const duration = Math.max(0, safeEnd - Math.max(workingSince.getTime(), range.start.getTime()));
    const row = perDay.get(activeDay) ?? { worked: 0, expected: activeAssignment ? shiftMinutes(activeAssignment) : 0 };
    row.worked += Math.round(duration / 60000);
    perDay.set(activeDay, row);
    workingSince = null;
  };

  for (const event of userEvents) {
    if (event.action === "check_in") {
      closeInterval(event.occurredAt);
      activeDay = riyadhDayKey(event.occurredAt);
      activeAssignment = userAssignments.find((assignment) => assignment.id === event.assignmentId)
        ?? userAssignments.find((assignment) => assignment.assignedAt <= event.occurredAt && (!assignment.unassignedAt || assignment.unassignedAt > event.occurredAt));
      const row = perDay.get(activeDay) ?? { worked: 0, expected: activeAssignment ? shiftMinutes(activeAssignment) : 0 };
      perDay.set(activeDay, row);
      workingSince = event.occurredAt;
    } else if (event.action === "break_start" || event.action === "check_out") {
      closeInterval(event.occurredAt);
    } else if (event.action === "break_end" && activeDay) {
      workingSince = event.occurredAt;
    }
  }
  if (workingSince) closeInterval(now < range.end ? now : range.end);

  const cutoff = now < range.end ? now : range.end;
  let absentDays = 0;
  for (const day of dateKeys(range.start, range.end, cutoff)) {
    if (!workingDay(day) || perDay.has(day)) continue;
    const noon = new Date(`${day}T12:00:00+03:00`);
    if (userAssignments.some((assignment) => assignment.assignedAt <= noon && (!assignment.unassignedAt || assignment.unassignedAt > noon))) absentDays += 1;
  }

  let workedMinutes = 0;
  let overtimeMinutes = 0;
  for (const row of perDay.values()) {
    workedMinutes += row.worked;
    if (row.expected > 0) overtimeMinutes += Math.max(0, row.worked - row.expected);
  }
  return { workedMinutes, daysWorked: perDay.size, absentDays, overtimeMinutes };
}
