export type AttendanceAction = "check_in" | "break_start" | "break_end" | "check_out";

export function attendanceStatus(lastAction?: string) {
  if (lastAction === "check_in" || lastAction === "break_end") return "working";
  if (lastAction === "break_start") return "break";
  return "out";
}

export function canRecordAttendance(action: AttendanceAction, lastAction?: string) {
  const status = attendanceStatus(lastAction);
  return (action === "check_in" && status === "out")
    || (action === "break_start" && status === "working")
    || (action === "break_end" && status === "break")
    || (action === "check_out" && status === "working");
}

function riyadhDay(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}-${parts.find((part) => part.type === "day")?.value}`;
}

export function presentDaysInMonth(
  events: { action: string; occurred_at: Date }[],
  previousAction: string | undefined,
  start: Date,
  end: Date,
  now = new Date(),
) {
  const days = new Set<string>();
  const endTime = Math.min(end.getTime(), now.getTime());
  let working = attendanceStatus(previousAction) === "working";
  let cursor = start.getTime();
  const addWorkingDays = (until: number) => {
    for (let day = start.getTime(); day < endTime; day += 24 * 60 * 60 * 1000) {
      const dayEnd = Math.min(day + 24 * 60 * 60 * 1000, endTime);
      if (cursor < dayEnd && until > day) days.add(riyadhDay(new Date(day)));
    }
  };
  for (const event of events) {
    const time = event.occurred_at.getTime();
    if (working) addWorkingDays(time);
    working = attendanceStatus(event.action) === "working";
    cursor = time;
  }
  if (working) addWorkingDays(endTime);
  return days.size;
}