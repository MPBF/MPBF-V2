import { attendance_events, sections, shift_definitions, user_shift_assignments, user_violations, users } from "@shared/schema";
import { and, desc, eq, gt, gte, inArray, isNull, lt, lte, or, sql, type SQL } from "drizzle-orm";
import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";

import { requireAnyPermission } from "./auth";
import { db } from "./db";
import { dayRange, monthRange, summarizeAttendance } from "./hr-report";

const router = Router();
const hrAdmin = requireAnyPermission("manage_hr", "manage_attendance", "admin");
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const shiftFields = z.object({
  id: z.string().trim().min(1).max(80),
  name_ar: z.string().trim().min(1).max(120),
  name_en: z.string().trim().max(120).nullable().optional(),
  start_time: z.string().regex(timePattern, "وقت بداية الوردية غير صالح"),
  end_time: z.string().regex(timePattern, "وقت نهاية الوردية غير صالح"),
  next_day_checkin_time: z.string().regex(timePattern, "وقت دخول اليوم التالي غير صالح").default("06:00"),
  early_checkin_minutes: z.number().int().min(0).max(240).default(15),
  late_checkout_minutes: z.number().int().min(0).max(240).default(15),
  break_minutes: z.number().int().min(0).max(240).default(30),
  geofence_enabled: z.boolean().default(true),
  geofence_center_lat: z.number().finite().min(-90).max(90).nullable().optional(),
  geofence_center_lng: z.number().finite().min(-180).max(180).nullable().optional(),
  geofence_radius_meters: z.number().int().min(20).max(5000).default(200),
  is_active: z.boolean().default(true),
}).strict();
const validateGeofence = (value: { geofence_enabled: boolean; geofence_center_lat?: number | null; geofence_center_lng?: number | null }, context: z.RefinementCtx) => {
  if (value.geofence_enabled && (value.geofence_center_lat == null || value.geofence_center_lng == null)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["geofence_center_lat"], message: "حدد مركز النطاق الجغرافي للوردية" });
  }
};
const shiftInput = shiftFields.superRefine(validateGeofence);
const shiftUpdateInput = shiftFields.omit({ id: true }).superRefine(validateGeofence);

const assignmentsInput = z.object({
  user_ids: z.array(z.number().int().positive()).min(1).max(500),
  shift_id: z.string().trim().min(1).max(80).nullable(),
}).strict();
const attendanceAction = z.enum(["check_in", "break_start", "break_end", "check_out"]);
const attendanceEventInput = z.object({
  user_id: z.number().int().positive(),
  action: attendanceAction,
  occurred_at: z.string().datetime(),
}).strict();
const violationInput = z.object({
  user_id: z.number().int().positive(),
  title: z.string().trim().min(1).max(200),
  details: z.string().trim().min(1).max(5000),
}).strict();

function positiveId(value: unknown, label: string) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw Object.assign(new Error(`${label} غير صالح`), { status: 400 });
  return parsed;
}

function textFilter(value: unknown, max = 80) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function handle(fn: (req: Request, res: Response) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res)).catch(next);
}

router.use(hrAdmin);

router.get("/data", handle(async (_req, res) => {
  const [shifts, employeeRows, history] = await Promise.all([
    db.select().from(shift_definitions).orderBy(shift_definitions.start_time, shift_definitions.name_ar),
    db.select({
      id: users.id,
      username: users.username,
      display_name: users.display_name,
      display_name_ar: users.display_name_ar,
      section_id: users.section_id,
      section_name: sql<string | null>`COALESCE(${sections.name_ar}, ${sections.name})`,
      assignment_id: user_shift_assignments.id,
      shift_id: user_shift_assignments.shift_id,
      assigned_at: user_shift_assignments.assigned_at,
    }).from(users)
      .leftJoin(sections, eq(users.section_id, sections.id))
      .leftJoin(user_shift_assignments, and(
        eq(user_shift_assignments.user_id, users.id),
        isNull(user_shift_assignments.unassigned_at),
      ))
      .where(and(eq(users.status, "active"), eq(users.include_in_attendance, true)))
      .orderBy(users.display_name_ar, users.display_name, users.username),
    db.select({
      id: user_shift_assignments.id,
      user_id: user_shift_assignments.user_id,
      shift_id: user_shift_assignments.shift_id,
      assigned_at: user_shift_assignments.assigned_at,
      unassigned_at: user_shift_assignments.unassigned_at,
      assigned_by: user_shift_assignments.assigned_by,
    }).from(user_shift_assignments)
      .orderBy(desc(user_shift_assignments.assigned_at), desc(user_shift_assignments.id))
      .limit(300),
  ]);
  const counts = new Map<string, number>();
  employeeRows.forEach((employee) => {
    if (employee.shift_id) counts.set(employee.shift_id, (counts.get(employee.shift_id) ?? 0) + 1);
  });
  res.json({
    shifts: shifts.map((shift) => ({
      ...shift,
      geofence_center_lat: shift.geofence_center_lat == null ? null : Number(shift.geofence_center_lat),
      geofence_center_lng: shift.geofence_center_lng == null ? null : Number(shift.geofence_center_lng),
      assigned_users: counts.get(shift.id) ?? 0,
    })),
    users: employeeRows,
    history,
  });
}));

router.get("/attendance-events", handle(async (req, res) => {
  const day = textFilter(req.query.day, 10) || new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { start, end } = dayRange(day);
  const userId = positiveId(req.query.user_id, "الموظف");
  const sectionId = textFilter(req.query.section_id, 20);
  const conditions: SQL[] = [gte(attendance_events.occurred_at, start), lt(attendance_events.occurred_at, end)];
  if (userId) conditions.push(eq(attendance_events.user_id, userId));
  if (sectionId) conditions.push(eq(users.section_id, sectionId));
  const rows = await db.select({
    id: attendance_events.id,
    user_id: attendance_events.user_id,
    username: users.username,
    display_name: users.display_name,
    display_name_ar: users.display_name_ar,
    section_id: users.section_id,
    section_name: sql<string | null>`COALESCE(${sections.name_ar}, ${sections.name})`,
    action: attendance_events.action,
    occurred_at: attendance_events.occurred_at,
    source: attendance_events.source,
    created_by: attendance_events.created_by,
    updated_by: attendance_events.updated_by,
    updated_at: attendance_events.updated_at,
  }).from(attendance_events)
    .innerJoin(users, eq(attendance_events.user_id, users.id))
    .leftJoin(sections, eq(users.section_id, sections.id))
    .where(and(...conditions))
    .orderBy(desc(attendance_events.occurred_at), desc(attendance_events.id));
  res.json(rows);
}));

router.post("/attendance-events", handle(async (req, res) => {
  const input = attendanceEventInput.parse(req.body);
  const occurredAt = new Date(input.occurred_at);
  const eligible = await db.select({ id: users.id }).from(users).where(and(
    eq(users.id, input.user_id), eq(users.status, "active"), eq(users.include_in_attendance, true),
  )).limit(1);
  if (!eligible[0]) return res.status(404).json({ message: "الموظف غير موجود أو غير مشمول بالحضور" });
  const assignment = await db.select({ id: user_shift_assignments.id }).from(user_shift_assignments).where(and(
    eq(user_shift_assignments.user_id, input.user_id),
    lte(user_shift_assignments.assigned_at, occurredAt),
    or(isNull(user_shift_assignments.unassigned_at), gt(user_shift_assignments.unassigned_at, occurredAt)),
  )).orderBy(desc(user_shift_assignments.assigned_at)).limit(1);
  const [created] = await db.insert(attendance_events).values({
    user_id: input.user_id,
    shift_assignment_id: assignment[0]?.id ?? null,
    action: input.action,
    occurred_at: occurredAt,
    latitude: "0",
    longitude: "0",
    accuracy: "0",
    source: "manual",
    created_by: req.user!.id,
    updated_by: req.user!.id,
  }).returning();
  res.status(201).json(created);
}));

router.put("/attendance-events/:id", handle(async (req, res) => {
  const id = positiveId(req.params.id, "السجل");
  const input = attendanceEventInput.parse(req.body);
  const occurredAt = new Date(input.occurred_at);
  const employee = await db.select({ id: users.id }).from(users).where(eq(users.id, input.user_id)).limit(1);
  if (!employee[0]) return res.status(404).json({ message: "الموظف غير موجود" });
  const assignment = await db.select({ id: user_shift_assignments.id }).from(user_shift_assignments).where(and(
    eq(user_shift_assignments.user_id, input.user_id),
    lte(user_shift_assignments.assigned_at, occurredAt),
    or(isNull(user_shift_assignments.unassigned_at), gt(user_shift_assignments.unassigned_at, occurredAt)),
  )).orderBy(desc(user_shift_assignments.assigned_at)).limit(1);
  const [updated] = await db.update(attendance_events).set({
    user_id: input.user_id,
    shift_assignment_id: assignment[0]?.id ?? null,
    action: input.action,
    occurred_at: occurredAt,
    updated_by: req.user!.id,
    updated_at: new Date(),
  }).where(eq(attendance_events.id, id!)).returning();
  if (!updated) return res.status(404).json({ message: "سجل الحضور غير موجود" });
  res.json(updated);
}));

router.delete("/attendance-events/:id", handle(async (req, res) => {
  const id = positiveId(req.params.id, "السجل");
  const [removed] = await db.delete(attendance_events)
    .where(eq(attendance_events.id, id!))
    .returning({ id: attendance_events.id });
  if (!removed) return res.status(404).json({ message: "سجل الحضور غير موجود" });
  res.json({ success: true, id: removed.id });
}));

router.get("/attendance-summary", handle(async (req, res) => {
  const month = textFilter(req.query.month, 7) || new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().slice(0, 7);
  const range = monthRange(month);
  const userId = positiveId(req.query.user_id, "الموظف");
  const sectionId = textFilter(req.query.section_id, 20);
  const userConditions: SQL[] = [eq(users.status, "active"), eq(users.include_in_attendance, true)];
  if (userId) userConditions.push(eq(users.id, userId));
  if (sectionId) userConditions.push(eq(users.section_id, sectionId));
  const [employeeRows, eventRows, assignmentRows] = await Promise.all([
    db.select({
      id: users.id,
      username: users.username,
      display_name: users.display_name,
      display_name_ar: users.display_name_ar,
      section_id: users.section_id,
      section_name: sql<string | null>`COALESCE(${sections.name_ar}, ${sections.name})`,
    }).from(users).leftJoin(sections, eq(users.section_id, sections.id)).where(and(...userConditions))
      .orderBy(users.display_name_ar, users.display_name, users.username),
    db.select({
      id: attendance_events.id,
      userId: attendance_events.user_id,
      assignmentId: attendance_events.shift_assignment_id,
      action: attendance_events.action,
      occurredAt: attendance_events.occurred_at,
    }).from(attendance_events).innerJoin(users, eq(attendance_events.user_id, users.id)).where(and(
      ...userConditions,
      gte(attendance_events.occurred_at, range.start),
      lt(attendance_events.occurred_at, range.end),
    )).orderBy(attendance_events.occurred_at, attendance_events.id),
    db.select({
      id: user_shift_assignments.id,
      userId: user_shift_assignments.user_id,
      assignedAt: user_shift_assignments.assigned_at,
      unassignedAt: user_shift_assignments.unassigned_at,
      startTime: shift_definitions.start_time,
      endTime: shift_definitions.end_time,
      breakMinutes: shift_definitions.break_minutes,
    }).from(user_shift_assignments)
      .innerJoin(shift_definitions, eq(user_shift_assignments.shift_id, shift_definitions.id))
      .innerJoin(users, eq(user_shift_assignments.user_id, users.id))
      .where(and(...userConditions, lt(user_shift_assignments.assigned_at, range.end), or(
        isNull(user_shift_assignments.unassigned_at), gt(user_shift_assignments.unassigned_at, range.start),
      ))),
  ]);
  const rows = employeeRows.map((employee) => ({
    ...employee,
    ...summarizeAttendance(employee.id, eventRows, assignmentRows, range),
  }));
  res.json({ month, rows });
}));

router.get("/violations", handle(async (req, res) => {
  const userId = positiveId(req.query.user_id, "الموظف");
  const sectionId = textFilter(req.query.section_id, 20);
  const conditions: SQL[] = [];
  if (userId) conditions.push(eq(user_violations.user_id, userId));
  if (sectionId) conditions.push(eq(users.section_id, sectionId));
  const rows = await db.select({
    id: user_violations.id,
    user_id: user_violations.user_id,
    username: users.username,
    display_name: users.display_name,
    display_name_ar: users.display_name_ar,
    section_id: users.section_id,
    section_name: sql<string | null>`COALESCE(${sections.name_ar}, ${sections.name})`,
    title: user_violations.title,
    details: user_violations.details,
    created_at: user_violations.created_at,
    acknowledged_at: user_violations.acknowledged_at,
  }).from(user_violations)
    .innerJoin(users, eq(user_violations.user_id, users.id))
    .leftJoin(sections, eq(users.section_id, sections.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(user_violations.created_at), desc(user_violations.id));
  res.json(rows);
}));

router.post("/violations", handle(async (req, res) => {
  const input = violationInput.parse(req.body);
  const employee = await db.select({ id: users.id }).from(users).where(eq(users.id, input.user_id)).limit(1);
  if (!employee[0]) return res.status(404).json({ message: "الموظف غير موجود" });
  const [created] = await db.insert(user_violations).values(input).returning();
  res.status(201).json(created);
}));

router.post("/shifts", handle(async (req, res) => {
  const input = shiftInput.parse(req.body);
  const [created] = await db.insert(shift_definitions).values({
    ...input,
    name_en: input.name_en || null,
    geofence_center_lat: input.geofence_center_lat == null ? null : String(input.geofence_center_lat),
    geofence_center_lng: input.geofence_center_lng == null ? null : String(input.geofence_center_lng),
  }).returning();
  res.status(201).json(created);
}));

router.put("/shifts/:id", handle(async (req, res) => {
  const id = String(req.params.id);
  const { id: _bodyId, assigned_users: _assignedUsers, created_at: _createdAt, updated_at: _updatedAt, ...editable } = req.body ?? {};
  const input = shiftUpdateInput.parse(editable);
  const [updated] = await db.update(shift_definitions).set({
    ...input,
    name_en: input.name_en || null,
    geofence_center_lat: input.geofence_center_lat == null ? null : String(input.geofence_center_lat),
    geofence_center_lng: input.geofence_center_lng == null ? null : String(input.geofence_center_lng),
    updated_at: new Date(),
  }).where(eq(shift_definitions.id, id)).returning();
  if (!updated) return res.status(404).json({ message: "الوردية غير موجودة" });
  res.json(updated);
}));

router.delete("/shifts/:id", handle(async (req, res) => {
  const id = String(req.params.id);
  const active = await db.select({ id: user_shift_assignments.id }).from(user_shift_assignments)
    .where(and(eq(user_shift_assignments.shift_id, id), isNull(user_shift_assignments.unassigned_at))).limit(1);
  if (active[0]) return res.status(409).json({ message: "انقل المستخدمين من الوردية قبل حذفها" });
  const [removed] = await db.delete(shift_definitions).where(eq(shift_definitions.id, id)).returning({ id: shift_definitions.id });
  if (!removed) return res.status(404).json({ message: "الوردية غير موجودة" });
  res.json({ success: true, id: removed.id });
}));

router.post("/assignments", handle(async (req, res) => {
  const input = assignmentsInput.parse(req.body);
  const userIds = Array.from(new Set(input.user_ids));
  const validUsers = await db.select({ id: users.id }).from(users).where(and(
    inArray(users.id, userIds),
    eq(users.status, "active"),
    eq(users.include_in_attendance, true),
  ));
  if (validUsers.length !== userIds.length) return res.status(400).json({ message: "تتضمن القائمة مستخدمًا غير نشط أو غير مخصص للحضور" });
  if (input.shift_id) {
    const shift = await db.select({ id: shift_definitions.id }).from(shift_definitions)
      .where(and(eq(shift_definitions.id, input.shift_id), eq(shift_definitions.is_active, true))).limit(1);
    if (!shift[0]) return res.status(404).json({ message: "الوردية المحددة غير موجودة أو غير نشطة" });
  }

  const changed = await db.transaction(async (tx) => {
    let count = 0;
    for (const userId of userIds) {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${29831}, ${userId})`);
      const current = await tx.select({ id: user_shift_assignments.id, shift_id: user_shift_assignments.shift_id })
        .from(user_shift_assignments)
        .where(and(eq(user_shift_assignments.user_id, userId), isNull(user_shift_assignments.unassigned_at)))
        .limit(1);
      if (current[0]?.shift_id === input.shift_id) continue;
      if (current[0]) {
        await tx.update(user_shift_assignments).set({ unassigned_at: new Date() })
          .where(eq(user_shift_assignments.id, current[0].id));
      }
      if (input.shift_id) {
        await tx.insert(user_shift_assignments).values({
          user_id: userId,
          shift_id: input.shift_id,
          assigned_by: req.user!.id,
        });
      }
      count += 1;
    }
    return count;
  });
  res.json({ success: true, changed });
}));

export default router;
