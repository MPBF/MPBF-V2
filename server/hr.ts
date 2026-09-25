import { shift_definitions, user_shift_assignments, users } from "@shared/schema";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";

import { requireAnyPermission } from "./auth";
import { db } from "./db";

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
      assignment_id: user_shift_assignments.id,
      shift_id: user_shift_assignments.shift_id,
      assigned_at: user_shift_assignments.assigned_at,
    }).from(users)
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
