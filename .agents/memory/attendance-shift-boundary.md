---
name: attendance shift-day boundary
description: Rules for carrying previous-day attendance into the current day without blocking a new day-shift check-in.
---

# Attendance shift boundary

**Rule:** Shift definitions are fixed in Riyadh time. Day is 07:00–19:00
(base 07:00–15:00, overtime afterward). Night is 19:00–07:00 next day
(base 19:00–03:00, overtime afterward). Flexible work is grouped by each
calendar day 00:00–24:00 and cross-midnight sessions are split between days.
For fixed shifts, `grace_minutes` also admits check-in before the scheduled
start, but paid work remains clipped to the official shift start.

Previous-day night attendance stays attached to its 19:00 start date. Its open
session must remain available for checkout the following morning even after
the daily status view advances to a new calendar date.

Night-shift attendance uses the shift-start date as its business date. A
checkout at or after 07:00 may close that finished session until (but not
including) the next 19:00 shift start; it must never affect the next evening
session. Before 07:00 at a month boundary, use the prior shift-start month's
assignment exclusively, not the new month's future roster.

**Why:** The user confirmed these fixed schedules and requested a third
calendar-day flexible shift. They also confirmed that a 30-minute grace on a
19:00 shift must admit check-in from 18:30. Self-attendance stores actions as separate rows, so a check-in row
retains a null checkout even after a later checkout row is inserted. Treating
any such row from the last 24 hours as open caused yesterday's day session to
block today's 07:00 check-in and could surface yesterday's final status.

**How to apply:** Use the factory's Riyadh date, captured assignment snapshot,
and formal shift windows rather
than UTC dates or a rolling 24-hour test. An open-session lookup must also
check for a later checkout action on the same attendance date. Filter
action-per-row status by action timestamp: check-ins stay inside `[19:00,
07:00)`, while late checkouts remain attached to the finished session only
until the next 19:00 boundary. Flexible reporting pairs each session and
intersects work, break, and withdrawal intervals with each calendar day.