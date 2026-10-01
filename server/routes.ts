import { Router, type Request, type Response } from "express";
import { and, asc, count, desc, eq, getTableColumns, ilike, inArray, or, aliasedTable, sql } from "drizzle-orm";
import bcrypt from "bcrypt";
import { z } from "zod";
import {
  categories,
  company_profile,
  customer_products,
  customers,
  insertCategorySchema,
  insertCompanyProfileSchema,
  insertCustomerProductSchema,
  insertCustomerSchema,
  insertItemSchema,
  insertMachineSchema,
  insertMaintenanceComponentCatalogSchema,
  insertMasterBatchColorSchema,
  insertNewOrderSchema,
  insertProductionOrderSchema,
  insertRoleSchema,
  insertSectionSchema,
  insertSystemSettingSchema,
  insertUserSchema,
  items,
  machines,
  maintenance_component_catalog,
  master_batch_colors,
  orders,
  production_orders,
  roles,
  sections,
  system_settings,
  users,
} from "@shared/schema";
import { db } from "./db";
import { nextCategoryId } from "./category-id";
import { nextItemId } from "./item-id";
import { nextOrderNumber } from "./order-number";
import { deliveryDateFromDays, orderDateInRiyadh } from "./order-delivery";
import { deriveCustomerProductFields, PRINTING_CYLINDERS } from "@shared/customer-product-fields";
import { authenticate, hashPassword, requireAnyPermission, requireAuth, requirePermission, resolveUser } from "./auth";
import hr from "./hr";
import selfService from "./self-service";

const router = Router();
const admin = requirePermission("admin");
const usersRead = requireAnyPermission("manage_users", "admin");
const rolesRead = requireAnyPermission("manage_users", "manage_roles", "admin");
const rolesWrite = requireAnyPermission("manage_roles", "admin");
const sectionsRead = requireAnyPermission("manage_users", "manage_sections", "manage_machines", "manage_maintenance", "admin");
const sectionsWrite = requireAnyPermission("manage_sections", "admin");
const settingsRead = requireAnyPermission("manage_settings", "admin");
const businessRead = requireAnyPermission("manage_customers", "manage_orders", "view_orders", "admin");
const customerProductsRead = requireAnyPermission("manage_customers", "manage_orders", "view_orders", "manage_production", "admin");
const ordersRead = requireAnyPermission("view_orders", "manage_orders", "manage_production", "admin");
const productionRead = requireAnyPermission("view_production", "manage_production", "admin");
const machinesRead = requireAnyPermission("view_production", "manage_machines", "view_maintenance", "manage_maintenance", "admin");
const maintenanceRead = requireAnyPermission("view_maintenance", "manage_maintenance", "admin");
const businessWrite = requireAnyPermission("manage_customers", "manage_orders", "admin");
const ordersWrite = requireAnyPermission("manage_orders", "admin");
const productionWrite = requireAnyPermission("manage_production", "admin");
const machinesWrite = requireAnyPermission("manage_machines", "manage_maintenance", "admin");
const maintenanceWrite = requireAnyPermission("manage_maintenance", "admin");
const categoriesRead = requireAnyPermission("manage_categories", "manage_definitions", "manage_customers", "manage_orders", "view_orders", "admin");
const itemsRead = requireAnyPermission("manage_items", "manage_definitions", "manage_customers", "manage_orders", "view_orders", "admin");
const masterBatchRead = requireAnyPermission("manage_master_batch", "manage_definitions", "manage_customers", "manage_orders", "view_orders", "admin");
const categoriesWrite = requireAnyPermission("manage_categories", "manage_definitions", "manage_customers", "manage_orders", "admin");
const itemsWrite = requireAnyPermission("manage_items", "manage_definitions", "manage_customers", "manage_orders", "admin");
const masterBatchWrite = requireAnyPermission("manage_master_batch", "manage_definitions", "manage_customers", "manage_orders", "admin");

const positiveWhole = z.string().regex(/^\d+$/, "يجب إدخال عدد صحيح دون كسور")
  .refine((value) => Number(value) > 0, "يجب أن تكون القيمة أكبر من صفر").nullish();
const nonnegativeWhole = z.string().regex(/^\d+$/, "يجب إدخال عدد صحيح دون كسور").nullish();
const positiveDecimalString = (maxIntegerDigits: number, maxDecimalDigits: number) => z.string()
  .regex(new RegExp(`^\\d{1,${maxIntegerDigits}}(?:\\.\\d{1,${maxDecimalDigits}})?$`))
  .refine((value) => Number(value) > 0, "يجب أن تكون القيمة أكبر من صفر").nullish();
const positiveIntegerValue = z.union([
  z.number().int().positive(),
  z.string().regex(/^\d+$/).refine((value) => Number(value) > 0),
]).nullish();
const productColor = z.string().trim().min(1).max(40)
  .refine((color) => /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(color) ||
    /^[\p{L}\p{N} _-]+$/u.test(color), "لون الطباعة غير صالح");
const productColors = z.array(productColor).max(12).nullish();
const customerProductInputSchema = insertCustomerProductSchema.strict().extend({
  width: positiveWhole,
  left_facing: nonnegativeWhole,
  right_facing: nonnegativeWhole,
  thickness: positiveWhole,
  cutting_length_cm: positiveIntegerValue,
  density: z.union([positiveDecimalString(3, 3), z.literal("")]).nullish(),
  unit_weight_kg: positiveDecimalString(5, 3),
  unit_quantity: positiveIntegerValue,
  front_print_colors: productColors,
  back_print_colors: productColors,
});

const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;
const productImageMimeTypes = new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "image/bmp", "image/avif"]);

function invalidProduct(message: string, status = 400) {
  return Object.assign(new Error(message), { status });
}

function isExistingImageUrl(value: string) {
  return /^https?:\/\/[^\s]+$/i.test(value) ||
    /^(?:\/(?!\/)|\.{1,2}\/)[A-Za-z0-9_./%?=&-]+$/u.test(value) ||
    /^[A-Za-z0-9_-]+\/[A-Za-z0-9_./%?=&-]+$/u.test(value);
}

function validateProductImage(value: unknown, previousValue?: unknown) {
  if (value === null || value === undefined || value === "") return;
  if (typeof value !== "string") throw invalidProduct("صورة التصميم غير صالحة");
  if (value === previousValue && isExistingImageUrl(value)) return;
  const match = value.match(/^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/]*={0,2})$/i);
  if (!match || !productImageMimeTypes.has(match[1].toLowerCase())) {
    throw invalidProduct("يجب استخدام صورة PNG أو JPEG أو GIF أو WebP أو BMP أو AVIF");
  }
  const encoded = match[2];
  const bytes = Buffer.from(encoded, "base64");
  if (bytes.length > MAX_PRODUCT_IMAGE_BYTES || bytes.toString("base64") !== encoded) {
    throw invalidProduct("يجب ألا يتجاوز حجم الصورة 5 ميجابايت وأن تكون بياناتها صالحة");
  }
  const mime = match[1].toLowerCase();
  const starts = (signature: number[]) => signature.every((byte, index) => bytes[index] === byte);
  const validSignature =
    (mime === "image/png" && starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ||
    (mime === "image/jpeg" && starts([0xff, 0xd8, 0xff])) ||
    (mime === "image/gif" && ["GIF87a", "GIF89a"].some((signature) => bytes.subarray(0, 6).toString("ascii") === signature)) ||
    (mime === "image/webp" && bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
      bytes.subarray(8, 12).toString("ascii") === "WEBP") ||
    (mime === "image/bmp" && bytes.subarray(0, 2).toString("ascii") === "BM") ||
    (mime === "image/avif" && bytes.length >= 16 && bytes.subarray(4, 8).toString("ascii") === "ftyp" &&
      ["avif", "avis"].some((brand) => {
        for (let offset = 8; offset + 4 <= Math.min(bytes.length, 32); offset += 4) {
          if (bytes.subarray(offset, offset + 4).toString("ascii") === brand) return true;
        }
        return false;
      }));
  if (!validSignature) throw invalidProduct("نوع الصورة لا يطابق بيانات الملف");
}

function normalizeCustomerProductInput(input: Record<string, any>) {
  const normalized = { ...input };
  if (normalized.density === null || normalized.density === "") normalized.density = "0.95";
  for (const field of ["category_id", "item_id", "master_batch_id"] as const) {
    if (normalized[field] === "") normalized[field] = null;
  }
  for (const field of ["density", "unit_weight_kg"] as const) {
    if (normalized[field] !== null && normalized[field] !== undefined) normalized[field] = String(normalized[field]);
  }
  for (const field of ["cutting_length_cm", "unit_quantity"] as const) {
    if (typeof normalized[field] === "string") normalized[field] = Number(normalized[field]);
  }
  return normalized;
}

async function validateCustomerProductReferences(tx: any, input: Record<string, any>, oldBatchId?: string | null) {
  if (!input.customer_id) throw invalidProduct("يجب اختيار عميل صالح");
  const [customer] = await tx.select({ id: customers.id }).from(customers)
    .where(eq(customers.id, input.customer_id)).limit(1);
  const [category] = input.category_id
    ? await tx.select({ id: categories.id, name: categories.name, name_ar: categories.name_ar })
      .from(categories).where(eq(categories.id, input.category_id)).limit(1)
    : [null];
  const [item] = input.item_id
    ? await tx.select({ id: items.id, category_id: items.category_id })
      .from(items).where(eq(items.id, input.item_id)).limit(1)
    : [null];
  if (!customer) throw invalidProduct("العميل المحدد غير موجود");
  if (input.category_id && !category) throw invalidProduct("التصنيف المحدد غير موجود");
  if (input.item_id && !item) throw invalidProduct("الصنف المحدد غير موجود");
  if (item && category && item.category_id !== input.category_id) {
    throw invalidProduct("الصنف لا ينتمي إلى التصنيف المحدد");
  }
  if (input.master_batch_id) {
    const [batch] = await tx.select({ id: master_batch_colors.id, is_active: master_batch_colors.is_active })
      .from(master_batch_colors).where(eq(master_batch_colors.id, input.master_batch_id)).limit(1);
    if (!batch) throw invalidProduct("لون الخامة المحدد غير موجود");
    if (!batch.is_active && input.master_batch_id !== oldBatchId) {
      throw invalidProduct("لا يمكن اختيار لون خامة غير نشط");
    }
  }
  return category ?? null;
}

const positiveKg = z.string().regex(/^\d{1,8}(?:\.\d{1,2})?$/, "الكمية يجب أن تكون بالكيلو وحتى منزلتين عشريتين")
  .refine((value) => Number(value) > 0, "الكمية يجب أن تكون أكبر من صفر");
const optionalMeasure = (maxDigits: number) => z.string()
  .regex(new RegExp(`^\\d{1,${maxDigits}}$`), "المقاس يجب أن يكون عددًا صحيحًا")
  .refine((value) => Number(value) > 0, "قيمة المقاس يجب أن تكون أكبر من صفر")
  .optional();
const orderLineSchema = z.object({
  customer_product_id: z.number().int().positive().optional(),
  new_product: z.object({
    item_id: z.string().min(1).max(20),
    category_id: z.string().max(20).optional(),
    size_caption: z.string().trim().min(1).max(50),
    width: optionalMeasure(6),
    thickness: optionalMeasure(5),
    raw_material: z.string().trim().max(20).optional(),
  }).strict().optional(),
  quantity_kg: positiveKg,
}).strict();
const validOrderLine = <T extends { customer_product_id?: number; new_product?: unknown }>(line: T) =>
  Boolean(line.customer_product_id) !== Boolean(line.new_product);
const orderWithItemsSchema = z.object({
  customer_id: z.string().trim().min(1).max(20),
  delivery_days: z.number().int().min(1).max(3650),
  notes: z.string().trim().max(5000).optional(),
  items: z.array(orderLineSchema.refine(validOrderLine,
    "اختر منتجًا مسجلًا أو أنشئ منتجًا جديدًا لكل سطر")).min(1).max(25),
}).strict();

const orderEditSchema = orderWithItemsSchema.omit({ customer_id: true }).extend({
  status: z.enum(["waiting", "on_hold", "in_production", "for_production", "paused", "cancelled", "completed", "delivered", "archived"]),
  original_items: z.array(z.object({
    id: z.number().int().positive(),
    customer_product_id: z.number().int().positive().nullable(),
    quantity_kg: positiveKg,
  }).strict()).max(25),
  // Existing lines carry their production-order ID. New lines have no ID.
  items: orderLineSchema.extend({ id: z.number().int().positive().optional() }).refine(validOrderLine,
    "اختر منتجًا مسجلًا أو أنشئ منتجًا جديدًا لكل سطر").array().min(1).max(25),
}).strict();

function orderError(message: string, status = 409) {
  return Object.assign(new Error(message), { status });
}

function page(req: Request) {
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  return { limit, offset, search };
}

function parsed(schema: { parse: (value: unknown) => any }, body: unknown) {
  return schema.parse(body);
}

function userId(raw: string) {
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1) {
    const error = new Error("المعرّف الرقمي غير صالح");
    (error as Error & { status?: number }).status = 400;
    throw error;
  }
  return value;
}

router.get("/health", (_req, res) => res.json({ status: "ok" }));
router.use("/self", selfService);
router.use("/hr", hr);
router.get("/public-branding", async (_req, res, next) => {
  try {
    const profile = (await db.select().from(company_profile).limit(1))[0] ?? null;
    const settings = await db
      .select({ setting_key: system_settings.setting_key, setting_value: system_settings.setting_value })
      .from(system_settings)
      .where(eq(system_settings.setting_key, "company_logo_data_url"))
      .limit(1);

    const logoSetting = settings[0]?.setting_value;
    const logoSrc = typeof logoSetting === "string" && logoSetting.trim()
      ? logoSetting.trim()
      : typeof profile?.logo_url === "string" && profile.logo_url.trim()
        ? profile.logo_url.trim()
        : "";

    res.json({
      companyNameAr: profile?.name_ar || profile?.name || "MPBF",
      companyNameEn: profile?.name || profile?.name_ar || "PLASTIC MANUFACTURING",
      logoSrc,
    });
  } catch (error) {
    next(error);
  }
});
router.get("/me", (req, res) => {
  if (!req.user) return res.status(401).json({ success: false, message: "تسجيل الدخول مطلوب" });
  return res.json({ success: true, user: req.user });
});

const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LIMIT = 10;

function loginKey(req: Request, identifier: string) {
  return `${req.ip}:${identifier.toLowerCase()}`;
}

router.post("/login", async (req, res, next) => {
  try {
    const identifier = String(req.body?.username ?? req.body?.national_id ?? "").trim();
    const password = String(req.body?.password ?? "");
    if (!identifier || password.length < 1) return res.status(400).json({ message: "اسم المستخدم وكلمة المرور مطلوبان" });
    const key = loginKey(req, identifier);
    const now = Date.now();
    for (const [attemptKey, value] of loginAttempts) {
      if (value.resetAt <= now) loginAttempts.delete(attemptKey);
    }
    const attempt = loginAttempts.get(key);
    if (attempt && attempt.resetAt > now && attempt.count >= LOGIN_LIMIT) {
      return res.status(429).json({ message: "محاولات دخول كثيرة، حاول لاحقاً" });
    }
    const user = await authenticate(identifier, password);
    if (!user) {
      const current = attempt && attempt.resetAt > now ? attempt : { count: 0, resetAt: now + LOGIN_WINDOW_MS };
      current.count += 1;
      loginAttempts.set(key, current);
      return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
    }
    loginAttempts.delete(key);
    req.session.userId = user.id;
    await new Promise<void>((resolve, reject) => req.session.save((error: Error | null) => (error ? reject(error) : resolve())));
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", (req, res, next) => {
  (req.session.destroy as any)((error: Error | null) => {
    if (error) return next(error);
    res.clearCookie("plastic-bag-session");
    res.json({ success: true });
  });
});

router.post("/change-password", requireAuth, async (req, res, next) => {
  try {
    const password = String(req.body?.password ?? "");
    if (password.length < 8) return res.status(400).json({ message: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" });
    await db.update(users).set({ password: await hashPassword(password), must_change_password: false }).where(eq(users.id, req.user!.id));
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.get("/dashboard", admin, async (_req, res, next) => {
  try {
    const names = [
      ["customers", customers],
      ["orders", orders],
      ["production_orders", production_orders],
      ["machines", machines],
      ["users", users],
    ] as const;
    const entries = await Promise.all(names.map(async ([name, table]) => [name, Number((await db.select({ value: count() }).from(table))[0]?.value ?? 0)] as const));
    res.json(Object.fromEntries(entries));
  } catch (error) {
    next(error);
  }
});

router.get("/users", usersRead, async (req, res, next) => {
  try {
    const { limit, offset, search } = page(req);
    const where = search
      ? or(
        ilike(users.username, `%${search}%`),
        ilike(users.display_name, `%${search}%`),
        ilike(users.display_name_ar, `%${search}%`),
        ilike(users.full_name, `%${search}%`),
        ilike(users.email, `%${search}%`),
        ilike(users.phone, `%${search}%`),
        ilike(users.national_id, `%${search}%`),
      )
      : undefined;
    const rows = await db
      .select({
        id: users.id,
        username: users.username,
        display_name: users.display_name,
        display_name_ar: users.display_name_ar,
        full_name: users.full_name,
        phone: users.phone,
        email: users.email,
        role_id: users.role_id,
        role_name: roles.name,
        role_name_ar: roles.name_ar,
        section_id: users.section_id,
        section_name: sections.name,
        section_name_ar: sections.name_ar,
        status: users.status,
        must_change_password: users.must_change_password,
        is_system_user: users.is_system_user,
        include_in_attendance: users.include_in_attendance,
        national_id: users.national_id,
        nationality: users.nationality,
        birth_date: users.birth_date,
        service_start_date: users.service_start_date,
        profession: users.profession,
        first_name: users.first_name,
        last_name: users.last_name,
        created_at: users.created_at,
        updated_at: users.updated_at,
      })
      .from(users)
      .leftJoin(roles, eq(users.role_id, roles.id))
      .leftJoin(sections, eq(users.section_id, sections.id))
      .where(where)
      .orderBy(desc(users.id))
      .limit(limit)
      .offset(offset);
    res.json(rows);
  } catch (error) { next(error); }
});
router.post("/users", usersRead, async (req, res, next) => {
  try {
    const raw = req.body ?? {};
    const username = typeof raw.username === "string" ? raw.username.trim() : "";
    const password = typeof raw.password === "string" ? raw.password : "";
    if (!username) return res.status(400).json({ message: "اسم المستخدم مطلوب" });
    if (password.length < 8) return res.status(400).json({ message: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" });
    const body = parsed(insertUserSchema.strict(), { ...raw, username, password });
    const inserted = await db.insert(users).values({ ...body, password: await bcrypt.hash(password, 12) }).returning({ id: users.id });
    res.status(201).json({ id: inserted[0].id });
  } catch (error) { next(error); }
});
router.put("/users/:id", usersRead, async (req, res, next) => {
  try {
    const id = userId(req.params.id);
    const raw = { ...(req.body ?? {}) };
    if ("password" in raw) {
      if (typeof raw.password !== "string" || raw.password.length < 8) {
        return res.status(400).json({ message: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" });
      }
      raw.password = await bcrypt.hash(raw.password, 12);
    }
    const body = parsed(insertUserSchema.strict().partial(), raw);
    const row: any[] = (await db.update(users).set(body).where(eq(users.id, id)).returning({ id: users.id, username: users.username, status: users.status })) as any;
    if (!row[0]) return res.status(404).json({ message: "المستخدم غير موجود" });
    res.json(row[0]);
  } catch (error) { next(error); }
});
router.delete("/users/:id", admin, async (req, res, next) => {
  try {
    const id = userId(req.params.id);
    if (id === req.user!.id) return res.status(409).json({ message: "لا يمكن حذف المستخدم الحالي" });
    const target = (await db
      .select({ id: users.id, is_system_user: users.is_system_user })
      .from(users)
      .where(eq(users.id, id))
      .limit(1))[0];
    if (!target) return res.status(404).json({ message: "المستخدم غير موجود" });
    if (target.is_system_user) return res.status(409).json({ message: "لا يمكن حذف مستخدم النظام" });

    const row = await db.transaction(async (tx) => {
      // These are historical/assignment references and should survive deleting
      // the login account. Clear them explicitly because the live database uses
      // NO ACTION/RESTRICT for these nullable foreign keys.
      await tx.update(customers).set({ sales_rep_id: null }).where(eq(customers.sales_rep_id, id));
      // Compatibility for databases not yet migrated: old rolls.created_by
      // restricts user deletion. The development database no longer has rolls.
      const legacyRolls = await tx.execute<{ table_name: string | null }>(
        sql`SELECT to_regclass('public.rolls')::text AS table_name`,
      );
      if (legacyRolls.rows[0]?.table_name) {
        await tx.execute(sql`UPDATE public.rolls SET created_by = NULL WHERE created_by = ${id}`);
      }
      await tx.update(system_settings).set({ updated_by: null }).where(eq(system_settings.updated_by, id));
      return (await tx.delete(users).where(eq(users.id, id)).returning({ id: users.id }))[0];
    });
    if (!row) return res.status(404).json({ message: "المستخدم غير موجود" });
    res.json({ success: true, id: row.id });
  } catch (error) { next(error); }
});

router.get("/roles", rolesRead, async (_req, res, next) => { try { res.json(await db.select().from(roles).orderBy(roles.id)); } catch (e) { next(e); } });
router.get("/sections", sectionsRead, async (_req, res, next) => { try { res.json(await db.select().from(sections).orderBy(sections.id)); } catch (e) { next(e); } });
router.post("/roles", rolesWrite, async (req, res, next) => { try { const row = await db.insert(roles).values(parsed(insertRoleSchema.strict(), req.body)).returning(); res.status(201).json(row[0]); } catch (e) { next(e); } });
router.post("/sections", sectionsWrite, async (req, res, next) => { try { const row = await db.insert(sections).values(parsed(insertSectionSchema.strict(), req.body)).returning(); res.status(201).json(row[0]); } catch (e) { next(e); } });
router.put("/roles/:id", rolesWrite, async (req, res, next) => { try { const id = Number(req.params.id); if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ message: "المعرّف الرقمي غير صالح" }); const row = await db.update(roles).set(parsed(insertRoleSchema.strict().partial(), req.body)).where(eq(roles.id, id)).returning(); if (!row[0]) return res.status(404).json({ message: "الدور غير موجود" }); res.json(row[0]); } catch (e) { next(e); } });
router.put("/sections/:id", sectionsWrite, async (req, res, next) => { try { const row = await db.update(sections).set(parsed(insertSectionSchema.strict().partial(), req.body)).where(eq(sections.id, req.params.id)).returning(); if (!row[0]) return res.status(404).json({ message: "القسم غير موجود" }); res.json(row[0]); } catch (e) { next(e); } });
router.delete("/roles/:id", admin, async (req, res, next) => { try { const id = Number(req.params.id); if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ message: "المعرّف الرقمي غير صالح" }); const row = await db.delete(roles).where(eq(roles.id, id)).returning({ id: roles.id }); if (!row[0]) return res.status(404).json({ message: "الدور غير موجود" }); res.json({ success: true, id: row[0].id }); } catch (e) { next(e); } });
router.delete("/sections/:id", admin, async (req, res, next) => { try { const row = await db.delete(sections).where(eq(sections.id, req.params.id)).returning({ id: sections.id }); if (!row[0]) return res.status(404).json({ message: "القسم غير موجود" }); res.json({ success: true, id: row[0].id }); } catch (e) { next(e); } });

// Save the order and every planned line in one transaction. An invalid item
// or conflicting number leaves no partial order behind.
router.post("/orders/with-items", ordersWrite, async (req, res, next) => {
  try {
    const input = orderWithItemsSchema.parse(req.body);

    const result = await db.transaction(async (tx) => {
      // Serialize number allocation with the insert, so concurrent requests
      // cannot both claim the same number and a rolled-back order leaves no gap.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${29832}, ${1})`);
      const numericOrders = await tx.execute<{ max_number: string | null }>(sql`
        SELECT MAX(order_number::numeric)::text AS max_number
        FROM orders
        WHERE order_number ~ '^[0-9]+$'
      `);
      const orderNumber = nextOrderNumber(numericOrders.rows[0]?.max_number ?? null);
      const customer = await tx.select({ id: customers.id }).from(customers)
        .where(eq(customers.id, input.customer_id)).limit(1);
      if (!customer.length) {
        const error = new Error("العميل المحدد غير موجود");
        (error as Error & { status: number }).status = 400;
        throw error;
      }
      const createdAt = new Date();
      const deliveryDate = deliveryDateFromDays(orderDateInRiyadh(createdAt), input.delivery_days);
      const [order] = await tx.insert(orders).values({
        order_number: orderNumber,
        customer_id: input.customer_id,
        created_at: createdAt,
        delivery_days: input.delivery_days,
        delivery_date: deliveryDate,
        notes: input.notes,
        status: "waiting",
        created_by: req.user!.id,
      }).returning();
      const createdLines = [];
      for (const [index, line] of input.items.entries()) {
        let productId = line.customer_product_id;
        if (line.new_product) {
          const product = line.new_product;
          const [item] = await tx.select({ id: items.id, category_id: items.category_id })
            .from(items).where(eq(items.id, product.item_id)).limit(1);
          if (!item || (product.category_id && item.category_id && item.category_id !== product.category_id)) {
            const error = new Error(`الصنف المحدد غير صالح في السطر ${index + 1}`);
            (error as Error & { status: number }).status = 400;
            throw error;
          }
          if (product.category_id && !(await tx.select({ id: categories.id }).from(categories)
            .where(eq(categories.id, product.category_id)).limit(1)).length) {
            const error = new Error(`التصنيف المحدد غير موجود في السطر ${index + 1}`);
            (error as Error & { status: number }).status = 400;
            throw error;
          }
          const [created] = await tx.insert(customer_products).values({
            ...product,
            ...deriveCustomerProductFields(product),
            category_id: product.category_id || item.category_id || null,
            customer_id: input.customer_id,
            status: "active",
          }).returning({ id: customer_products.id });
          productId = created.id;
        } else {
          const [existing] = await tx.select({ id: customer_products.id }).from(customer_products)
            .where(and(eq(customer_products.id, productId!), eq(customer_products.customer_id, input.customer_id)))
            .limit(1);
          if (!existing) {
            const error = new Error(`منتج السطر ${index + 1} غير تابع للعميل المحدد`);
            (error as Error & { status: number }).status = 400;
            throw error;
          }
        }
        const [productionOrder] = await tx.insert(production_orders).values({
          production_order_number: `${orderNumber}-${String(index + 1).padStart(2, "0")}`,
          order_id: order.id,
          customer_product_id: productId,
          quantity_kg: line.quantity_kg,
          final_quantity_kg: line.quantity_kg,
          overrun_percentage: "0",
          status: "pending",
        }).returning();
        createdLines.push(productionOrder);
      }
      return { order, production_orders: createdLines };
    });
    res.status(201).json(result);
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return res.status(409).json({ message: "رقم الطلب أو رقم أمر الإنتاج مستخدم مسبقًا" });
    }
    next(error);
  }
});

router.get("/orders/:id/with-items", ordersRead, async (req, res, next) => {
  try {
    const id = entityId("orders", req.params.id);
    const [order] = await db.select().from(orders).where(eq(orders.id, id as number)).limit(1);
    if (!order) return res.status(404).json({ message: "الطلب غير موجود" });
    const lines = await db.select({
      id: production_orders.id,
      production_order_number: production_orders.production_order_number,
      customer_product_id: production_orders.customer_product_id,
      quantity_kg: production_orders.quantity_kg,
      status: production_orders.status,
      batch_number: production_orders.batch_number,
    }).from(production_orders).where(eq(production_orders.order_id, order.id)).orderBy(production_orders.id);
    res.json({ order, items: lines });
  } catch (error) { next(error); }
});

// Reconcile by ID rather than deleting/recreating every production order: existing
// references and production history must survive an edit, including a failed edit.
router.put("/orders/:id/with-items", ordersWrite, async (req, res, next) => {
  try {
    const id = entityId("orders", req.params.id) as number;
    const input = orderEditSchema.parse(req.body);
    const result = await db.transaction(async (tx) => {
      const [order] = await tx.select().from(orders).where(eq(orders.id, id)).for("update");
      if (!order) throw orderError("الطلب غير موجود", 404);
      const deliveryDate = deliveryDateFromDays(orderDateInRiyadh(new Date(order.created_at)), input.delivery_days);
      const existing = await tx.select().from(production_orders)
        .where(eq(production_orders.order_id, id)).orderBy(production_orders.id).for("update");
      const byId = new Map(existing.map((line) => [line.id, line]));
      const submittedIds = input.items.flatMap((line) => line.id ? [line.id] : []);
      if (new Set(submittedIds).size !== submittedIds.length || submittedIds.some((lineId) => !byId.has(lineId))) {
        throw orderError("تغيرت بنود الطلب؛ أعد فتح الطلب قبل التعديل");
      }
      const remaining = new Set(submittedIds);
      for (const line of existing) {
        const unchanged = input.items.find((item) => item.id === line.id);
        if ((line.status !== "pending" || line.batch_number) &&
          (!unchanged || unchanged.new_product || unchanged.customer_product_id !== line.customer_product_id ||
            Number(unchanged.quantity_kg) !== Number(line.quantity_kg))) {
          throw orderError(`بدأ العمل على أمر الإنتاج ${line.production_order_number}؛ لا يمكن تغيير منتجه أو كميته أو حذفه`);
        }
      }
      // An unchanged existing line still has to match the version the editor saw.
      // The client sends a snapshot separately so concurrent edits cannot be lost.
      if (existing.length !== input.original_items.length ||
        existing.some((line) => !input.original_items.some((snapshot) =>
          snapshot.id === line.id && snapshot.customer_product_id === line.customer_product_id &&
          Number(snapshot.quantity_kg) === Number(line.quantity_kg)))) {
        throw orderError("تغيرت بنود الطلب منذ فتحها؛ أعد فتح الطلب قبل الحفظ");
      }
      let nextSuffix = existing.reduce((max, line) => {
        const suffix = line.production_order_number.startsWith(`${order.order_number}-`)
          ? Number(line.production_order_number.slice(order.order_number.length + 1)) : NaN;
        return Number.isSafeInteger(suffix) && suffix > max ? suffix : max;
      }, 0);
      const [updatedOrder] = await tx.update(orders).set({
        notes: input.notes ?? null,
        delivery_days: input.delivery_days,
        delivery_date: deliveryDate,
        status: input.status,
      }).where(eq(orders.id, id)).returning();
      const resultLines = [];
      for (const line of input.items) {
        let productId = line.customer_product_id;
        if (line.new_product) {
          const product = line.new_product;
          const [item] = await tx.select({ id: items.id, category_id: items.category_id })
            .from(items).where(eq(items.id, product.item_id)).limit(1);
          if (!item || (product.category_id && item.category_id && item.category_id !== product.category_id)) {
            throw orderError("نوع المنتج أو تصنيفه غير صالح", 400);
          }
          if (product.category_id && !(await tx.select({ id: categories.id }).from(categories)
            .where(eq(categories.id, product.category_id)).limit(1)).length) {
            throw orderError("تصنيف المنتج غير موجود", 400);
          }
          const [created] = await tx.insert(customer_products).values({
            ...product, ...deriveCustomerProductFields(product),
            category_id: product.category_id || item.category_id || null,
            customer_id: order.customer_id, status: "active",
          }).returning({ id: customer_products.id });
          productId = created.id;
        } else {
          const [product] = await tx.select({ id: customer_products.id }).from(customer_products)
            .where(and(eq(customer_products.id, productId!), eq(customer_products.customer_id, order.customer_id))).limit(1);
          if (!product) throw orderError("المنتج غير تابع لعميل الطلب", 400);
        }
        if (line.id) {
          const previous = byId.get(line.id)!;
          if (previous.customer_product_id === productId && Number(previous.quantity_kg) === Number(line.quantity_kg)) {
            resultLines.push(previous);
          } else {
            const [updated] = await tx.update(production_orders).set({
              customer_product_id: productId, quantity_kg: line.quantity_kg, final_quantity_kg: line.quantity_kg,
            }).where(eq(production_orders.id, line.id)).returning();
            resultLines.push(updated);
          }
        } else {
          nextSuffix += 1;
          const [created] = await tx.insert(production_orders).values({
            production_order_number: `${order.order_number}-${String(nextSuffix).padStart(2, "0")}`,
            order_id: id, customer_product_id: productId, quantity_kg: line.quantity_kg,
            final_quantity_kg: line.quantity_kg, overrun_percentage: "0", status: "pending",
          }).returning();
          resultLines.push(created);
        }
      }
      for (const line of existing) {
        if (!remaining.has(line.id)) await tx.delete(production_orders).where(eq(production_orders.id, line.id));
      }
      return { order: updatedOrder, production_orders: resultLines };
    });
    res.json(result);
  } catch (error) {
    if ((error as { code?: string }).code === "23505") return res.status(409).json({ message: "رقم أمر الإنتاج مستخدم مسبقًا؛ أعد فتح الطلب" });
    if ((error as { code?: string }).code === "23503") return res.status(409).json({ message: "أمر الإنتاج مرتبط ببيانات أخرى ولا يمكن حذفه" });
    next(error);
  }
});

type Entity = "customers" | "categories" | "items" | "master-batch-colors" | "customer-products" | "machines" | "orders" | "production-orders" | "maintenance-component-catalog" | "system-settings";
const entities: Record<Entity, any> = { customers, categories, items, "master-batch-colors": master_batch_colors, "customer-products": customer_products, machines, orders, "production-orders": production_orders, "maintenance-component-catalog": maintenance_component_catalog, "system-settings": system_settings };
const schemas: Record<Entity, any> = { customers: insertCustomerSchema, categories: insertCategorySchema, items: insertItemSchema, "master-batch-colors": insertMasterBatchColorSchema, "customer-products": insertCustomerProductSchema, machines: insertMachineSchema, orders: insertNewOrderSchema, "production-orders": insertProductionOrderSchema, "maintenance-component-catalog": insertMaintenanceComponentCatalogSchema, "system-settings": insertSystemSettingSchema };
const numericEntityIds = new Set<Entity>(["customer-products", "orders", "production-orders", "maintenance-component-catalog", "system-settings"]);

function entityId(path: Entity, raw: string) {
  if (!numericEntityIds.has(path)) return raw;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1) {
    const error = new Error("المعرّف الرقمي غير صالح");
    (error as Error & { status?: number }).status = 400;
    throw error;
  }
  return value;
}

const entityRead: Record<Entity, any> = {
  customers: businessRead, categories: categoriesRead, items: itemsRead,
  "master-batch-colors": masterBatchRead, "customer-products": customerProductsRead,
  machines: machinesRead, orders: ordersRead, "production-orders": productionRead,
  "maintenance-component-catalog": maintenanceRead,
  "system-settings": settingsRead,
};
const entityWrite: Record<Entity, any> = {
  customers: businessWrite, categories: categoriesWrite, items: itemsWrite,
  "master-batch-colors": masterBatchWrite, "customer-products": businessWrite,
  machines: machinesWrite, orders: ordersWrite, "production-orders": productionWrite,
  "maintenance-component-catalog": maintenanceWrite,
  "system-settings": settingsRead,
};
const entitySearch: Record<Entity, any[]> = {
  customers: [customers.name, customers.name_ar, customers.code, customers.plate_drawer_code, customers.city, customers.phone],
  categories: [categories.name, categories.name_ar, categories.code],
  items: [items.name, items.name_ar, items.code],
  "master-batch-colors": [master_batch_colors.name, master_batch_colors.name_ar, master_batch_colors.brand, master_batch_colors.aliases],
  "customer-products": [customer_products.size_caption, customer_products.raw_material, customer_products.printing_cylinder, customer_products.master_batch_id, customer_products.cutting_unit, customer_products.punching, customer_products.notes, customer_products.status],
  machines: [machines.name, machines.name_ar, machines.type, machines.status, machines.manufacturer, machines.serial_number],
  orders: [orders.order_number, orders.status, orders.previous_status, orders.notes, orders.share_token],
  "production-orders": [production_orders.production_order_number, production_orders.status, production_orders.previous_status, production_orders.batch_number],
  "maintenance-component-catalog": [maintenance_component_catalog.machine_type, maintenance_component_catalog.name_ar, maintenance_component_catalog.name_en],
  "system-settings": [system_settings.setting_key, system_settings.setting_value, system_settings.setting_type, system_settings.description],
};

const categoryParent = aliasedTable(categories, "category_parent");
const itemCategory = aliasedTable(categories, "item_category");
const customerSalesRep = aliasedTable(users, "customer_sales_rep");

router.get("/customer-products/form-options", customerProductsRead, async (_req, res, next) => {
  try {
    const rows = await db.selectDistinct({ printing_cylinder: customer_products.printing_cylinder })
      .from(customer_products);
    const seen = new Set(PRINTING_CYLINDERS);
    const printing_cylinders = [...PRINTING_CYLINDERS];
    for (const row of rows) {
      const value = row.printing_cylinder;
      if (value?.trim() && !seen.has(value)) {
        seen.add(value);
        printing_cylinders.push(value);
      }
    }
    res.json({ printing_cylinders });
  } catch (error) { next(error); }
});

for (const [path, table] of Object.entries(entities) as [Entity, any][]) {
  const mutationGuard = entityWrite[path];
  router.get(`/${path}`, entityRead[path], async (req, res, next) => {
    try {
      const { limit, offset, search } = page(req);
      const term = `%${search}%`;
      let rows: any[];
      if (path === "customers") {
        const conditions = [
          ...entitySearch[path],
          customerSalesRep.display_name,
          customerSalesRep.display_name_ar,
        ].map((column) => ilike(column, term));
        rows = await db.select({
          ...getTableColumns(customers),
          sales_rep_name: customerSalesRep.display_name,
          sales_rep_name_ar: customerSalesRep.display_name_ar,
        }).from(customers)
          .leftJoin(customerSalesRep, eq(customers.sales_rep_id, customerSalesRep.id))
          .where(search ? or(...conditions) : undefined)
          .orderBy(desc(customers.id)).limit(limit).offset(offset);
      } else if (path === "customer-products") {
        const conditions = [
          ...entitySearch[path],
          customers.name, customers.name_ar, categories.name, categories.name_ar,
          items.name, items.name_ar, master_batch_colors.name, master_batch_colors.name_ar,
        ].map((column) => ilike(column, term));
        rows = await db.select({
          ...getTableColumns(customer_products),
          customer_name: customers.name,
          customer_name_ar: customers.name_ar,
          category_name: categories.name,
          category_name_ar: categories.name_ar,
          item_name: items.name,
          item_name_ar: items.name_ar,
          master_batch_name: master_batch_colors.name,
          master_batch_name_ar: master_batch_colors.name_ar,
          master_batch_color_hex: master_batch_colors.color_hex,
        }).from(customer_products)
          .leftJoin(customers, eq(customer_products.customer_id, customers.id))
          .leftJoin(categories, eq(customer_products.category_id, categories.id))
          .leftJoin(items, eq(customer_products.item_id, items.id))
          .leftJoin(master_batch_colors, eq(customer_products.master_batch_id, master_batch_colors.id))
          .where(search ? or(...conditions) : undefined)
          .orderBy(desc(customer_products.id)).limit(limit).offset(offset);
      } else if (path === "orders") {
        const conditions = [...entitySearch[path], customers.name, customers.name_ar].map((column) => ilike(column, term));
        rows = await db.select({
          ...getTableColumns(orders),
          customer_name: customers.name,
          customer_name_ar: customers.name_ar,
        }).from(orders)
          .leftJoin(customers, eq(orders.customer_id, customers.id))
          .where(search ? or(...conditions) : undefined)
          .orderBy(desc(orders.id)).limit(limit).offset(offset);
        if (rows.length) {
          const linked = await db.select({
            id: production_orders.id,
            order_id: production_orders.order_id,
            production_order_number: production_orders.production_order_number,
            quantity_kg: production_orders.quantity_kg,
            item_name: items.name,
            item_name_ar: items.name_ar,
            item_id: customer_products.item_id,
          }).from(production_orders)
            .leftJoin(customer_products, eq(production_orders.customer_product_id, customer_products.id))
            .leftJoin(items, eq(customer_products.item_id, items.id))
            .where(inArray(production_orders.order_id, rows.map((row) => row.id)))
            .orderBy(production_orders.id);
          const byOrder = new Map<number, typeof linked>();
          for (const production of linked) {
            const entries = byOrder.get(production.order_id) ?? [];
            entries.push(production);
            byOrder.set(production.order_id, entries);
          }
          rows = rows.map((order) => ({ ...order, production_orders_summary: byOrder.get(order.id) ?? [] }));
        }
      } else if (path === "production-orders") {
        const conditions = [
          ...entitySearch[path], orders.order_number, customer_products.size_caption,
          customers.name, customers.name_ar,
        ].map((column) => ilike(column, term));
        rows = await db.select({
          ...getTableColumns(production_orders),
          order_number: orders.order_number,
          product_size_caption: customer_products.size_caption,
          customer_name: customers.name,
          customer_name_ar: customers.name_ar,
        }).from(production_orders)
          .leftJoin(orders, eq(production_orders.order_id, orders.id))
          .leftJoin(customer_products, eq(production_orders.customer_product_id, customer_products.id))
          .leftJoin(customers, eq(customer_products.customer_id, customers.id))
          .where(search ? or(...conditions) : undefined)
          .orderBy(desc(production_orders.id)).limit(limit).offset(offset);
      } else if (path === "machines") {
        const conditions = [...entitySearch[path], sections.name, sections.name_ar].map((column) => ilike(column, term));
        rows = await db.select({
          ...getTableColumns(machines),
          section_name: sections.name,
          section_name_ar: sections.name_ar,
        }).from(machines)
          .leftJoin(sections, eq(machines.section_id, sections.id))
          .where(search ? or(...conditions) : undefined)
          .orderBy(desc(machines.id)).limit(limit).offset(offset);
      } else if (path === "categories") {
        const conditions = [...entitySearch[path], categoryParent.name, categoryParent.name_ar].map((column) => ilike(column, term));
        rows = await db.select({
          ...getTableColumns(categories),
          parent_name: categoryParent.name,
          parent_name_ar: categoryParent.name_ar,
        }).from(categories)
          .leftJoin(categoryParent, eq(categories.parent_id, categoryParent.id))
          .where(search ? or(...conditions) : undefined)
           .orderBy(
             sql`regexp_replace(${categories.id}, '[0-9]+$', '')`,
             sql`substring(${categories.id} from '[0-9]+$')::numeric ASC NULLS LAST`,
             asc(categories.id),
           ).limit(limit).offset(offset);
      } else if (path === "items") {
        const conditions = [...entitySearch[path], itemCategory.name, itemCategory.name_ar].map((column) => ilike(column, term));
        rows = await db.select({
          ...getTableColumns(items),
          category_name: itemCategory.name,
          category_name_ar: itemCategory.name_ar,
        }).from(items)
          .leftJoin(itemCategory, eq(items.category_id, itemCategory.id))
          .where(search ? or(...conditions) : undefined)
           .orderBy(
             sql`regexp_replace(${items.id}, '[0-9]+$', '')`,
             sql`substring(${items.id} from '[0-9]+$')::numeric ASC NULLS LAST`,
             asc(items.id),
           ).limit(limit).offset(offset);
      } else {
        const conditions = entitySearch[path].map((column) => ilike(column, term));
        rows = await db.select().from(table)
          .where(search ? or(...conditions) : undefined)
          .orderBy(desc(table.id)).limit(limit).offset(offset);
      }
      res.json(rows);
    } catch (error) { next(error); }
  });
  router.post(`/${path}`, mutationGuard, async (req, res, next) => {
    try {
      const input = { ...(req.body ?? {}) };
      if (path === "customer-products") {
        const cloneSourceId = z.number().int().positive().optional().parse(input.clone_source_id);
        const { clone_source_id: _cloneSourceMetadata, ...productInput } = input;
        const body = normalizeCustomerProductInput(parsed(customerProductInputSchema, productInput));
        const row = await db.transaction(async (tx) => {
          let cloneSource: Record<string, any> | null = null;
          if (cloneSourceId !== undefined) {
            [cloneSource] = await tx.select({
              id: customer_products.id,
              master_batch_id: customer_products.master_batch_id,
              cliche_front_design: customer_products.cliche_front_design,
              cliche_back_design: customer_products.cliche_back_design,
            }).from(customer_products).where(eq(customer_products.id, cloneSourceId)).limit(1);
            if (!cloneSource) throw invalidProduct("المنتج المصدر للنسخ غير موجود");
          }
          const category = await validateCustomerProductReferences(tx, body, cloneSource?.master_batch_id);
          validateProductImage(body.cliche_front_design, cloneSource?.cliche_front_design);
          validateProductImage(body.cliche_back_design, cloneSource?.cliche_back_design);
          const fields = deriveCustomerProductFields(
            { ...body, density: body.density === undefined ? "0.95" : body.density },
            `${category?.name_ar ?? ""} ${category?.name ?? ""}`,
          );
          return tx.insert(customer_products).values({ ...body, ...fields }).returning();
        });
        return res.status(201).json(row[0]);
      }
      if (path === "categories") {
        // The ID must come from the server, never from a submitted form.
        const body = parsed(insertCategorySchema.strict().omit({ id: true }), input);
        const row = await db.transaction(async (tx) => {
          await tx.execute(sql`SELECT pg_advisory_xact_lock(${29832}, ${2})`);
          const sequence = await tx.execute<{ max_number: string | null; suffix_width: number | null }>(sql`
            SELECT MAX(substring(id from 4)::numeric)::text AS max_number,
                   MAX(length(id) - 3)::int AS suffix_width
            FROM categories
            WHERE id ~ '^CAT[0-9]+$'
          `);
          const id = nextCategoryId(sequence.rows[0]?.max_number ?? null, sequence.rows[0]?.suffix_width ?? null);
          return tx.insert(categories).values({ ...body, id }).returning();
        });
        return res.status(201).json(row[0]);
      }
      if (path === "items") {
        const body = parsed(insertItemSchema.strict().omit({ id: true }), input);
        const row = await db.transaction(async (tx) => {
          await tx.execute(sql`SELECT pg_advisory_xact_lock(${29832}, ${3})`);
          const sequence = await tx.execute<{ max_number: string | null; suffix_width: number | null }>(sql`
            SELECT MAX(substring(id from 4)::numeric)::text AS max_number,
                   MAX(length(id) - 3)::int AS suffix_width
            FROM items
            WHERE id ~ '^ITM[0-9]+$'
          `);
          const id = nextItemId(sequence.rows[0]?.max_number ?? null, sequence.rows[0]?.suffix_width ?? null);
          return tx.insert(items).values({ ...body, id }).returning();
        });
        return res.status(201).json(row[0]);
      }
      if (path === "orders" && !input.status) input.status = "waiting";
      if (path === "system-settings") input.updated_by = req.user!.id;
      const body = parsed(schemas[path].strict(), input);
      const row: any[] = (await db.insert(table).values(body).returning()) as any;
      res.status(201).json(row[0]);
    } catch (error) { next(error); }
  });
  router.put(`/${path}/:id`, mutationGuard, async (req, res, next) => {
    try {
      const key = entityId(path, req.params.id);
      if (path === "system-settings") {
        const input = req.body ?? {};
        if (Object.keys(input).some((field) => field !== "setting_value")) {
          return res.status(400).json({ message: "يمكن تعديل قيمة الإعداد فقط" });
        }
        if (typeof input.setting_value !== "string" && input.setting_value !== null) {
          return res.status(400).json({ message: "قيمة الإعداد غير صالحة" });
        }
        const current = await db
          .select({ is_editable: system_settings.is_editable })
          .from(system_settings)
          .where(eq(system_settings.id, key as number))
          .limit(1);
        if (!current[0]) return res.status(404).json({ message: "الإعداد غير موجود" });
        if (current[0].is_editable === false) {
          return res.status(403).json({ message: "هذا الإعداد غير قابل للتعديل" });
        }
        const updated = await db
          .update(system_settings)
          .set({ setting_value: input.setting_value, updated_at: new Date(), updated_by: req.user!.id })
          .where(eq(system_settings.id, key as number))
          .returning();
        return res.json(updated[0]);
      }
      if (path === "customer-products") {
        const input = normalizeCustomerProductInput(parsed(customerProductInputSchema.partial(), req.body ?? {}));
        const row = await db.transaction(async (tx) => {
          const [current] = await tx.select().from(customer_products)
            .where(eq(customer_products.id, key as number)).for("update").limit(1);
          if (!current) return null;
          const merged = { ...current, ...input };
          const category = await validateCustomerProductReferences(tx, merged, current.master_batch_id);
          validateProductImage(merged.cliche_front_design, current.cliche_front_design);
          validateProductImage(merged.cliche_back_design, current.cliche_back_design);

          const sizeSourcesChanged = ["width", "left_facing", "right_facing", "printing_cylinder", "cutting_length_cm", "category_id"]
            .some((field) => Object.prototype.hasOwnProperty.call(input, field) && input[field] !== (current as any)[field]);
          const bagSourcesChanged = ["width", "left_facing", "right_facing", "thickness", "density", "printing_cylinder", "cutting_length_cm", "category_id"]
            .some((field) => Object.prototype.hasOwnProperty.call(input, field) && input[field] !== (current as any)[field]);
          const packageSourcesChanged = ["unit_weight_kg", "unit_quantity"]
            .some((field) => Object.prototype.hasOwnProperty.call(input, field) && input[field] !== (current as any)[field]);
          const cylinderUnchanged = merged.printing_cylinder === current.printing_cylinder;
          const categoryUnchanged = merged.category_id === current.category_id;
          const fields = deriveCustomerProductFields(
            {
              ...merged,
              density: merged.density === undefined ? "0.95" : merged.density,
              size_caption: sizeSourcesChanged ? null : current.size_caption,
            },
            `${category?.name_ar ?? ""} ${category?.name ?? ""}`,
            cylinderUnchanged && categoryUnchanged,
          );
          if (!bagSourcesChanged && fields.bag_weight_grams === null && fields.bags_per_kilo === null) {
            fields.bag_weight_grams = current.bag_weight_grams;
            fields.bags_per_kilo = current.bags_per_kilo;
          }
          if (!packageSourcesChanged && fields.package_weight_kg === null) fields.package_weight_kg = current.package_weight_kg;
          return tx.update(customer_products).set({ ...input, ...fields })
            .where(eq(customer_products.id, key as number)).returning();
        });
        if (!row) return res.status(404).json({ message: "المنتج غير موجود" });
        return res.json(row[0]);
      }
      const readOnly = new Set(["id", "created_at", "updated_at", "universal_thickness"]);
      const input = Object.fromEntries(Object.entries(req.body ?? {}).filter(([key]) => !readOnly.has(key)));
      if (path === "orders" && ("order_number" in input || "customer_id" in input)) {
        return res.status(400).json({ message: "رقم الطلب والعميل ثابتان بعد الإنشاء؛ استخدم تعديل الطلب لتغيير بنوده" });
      }
      const body = parsed(schemas[path].strict().partial(), input);
      const row: any[] = (await db.update(table).set(body).where(eq(table.id, key)).returning()) as any;
      if (!row[0]) return res.status(404).json({ message: "العنصر غير موجود" });
      res.json(row[0]);
    } catch (error) { next(error); }
  });
  router.delete(`/${path}/:id`, admin, async (req, res, next) => {
    try {
      const key = entityId(path, req.params.id);
      const row: any[] = (await db.delete(table).where(eq(table.id, key)).returning({ id: table.id })) as any;
      if (!row[0]) return res.status(404).json({ message: "العنصر غير موجود" });
      res.json({ success: true, id: row[0].id });
    } catch (error) { next(error); }
  });
}

router.get("/customers/:id/detail", businessRead, async (req, res, next) => {
  try {
    const customerId = req.params.id;
    const customer = await db.select({
      ...getTableColumns(customers),
      sales_rep_name: customerSalesRep.display_name,
      sales_rep_name_ar: customerSalesRep.display_name_ar,
    }).from(customers)
      .leftJoin(customerSalesRep, eq(customers.sales_rep_id, customerSalesRep.id))
      .where(eq(customers.id, customerId))
      .limit(1);
    if (!customer[0]) return res.status(404).json({ message: "العميل غير موجود" });
    const products = await db.select({
      ...getTableColumns(customer_products),
      customer_name: customers.name,
      customer_name_ar: customers.name_ar,
      category_name: categories.name,
      category_name_ar: categories.name_ar,
      item_name: items.name,
      item_name_ar: items.name_ar,
      master_batch_name: master_batch_colors.name,
      master_batch_name_ar: master_batch_colors.name_ar,
    }).from(customer_products)
      .leftJoin(customers, eq(customer_products.customer_id, customers.id))
      .leftJoin(categories, eq(customer_products.category_id, categories.id))
      .leftJoin(items, eq(customer_products.item_id, items.id))
      .leftJoin(master_batch_colors, eq(customer_products.master_batch_id, master_batch_colors.id))
      .where(eq(customer_products.customer_id, customerId))
      .orderBy(desc(customer_products.id));
    return res.json({ customer: customer[0], products });
  } catch (error) { next(error); }
});

router.get("/company-profile", settingsRead, async (_req, res, next) => { try { res.json((await db.select().from(company_profile).limit(1))[0] ?? null); } catch (e) { next(e); } });
router.put("/company-profile", settingsRead, async (req, res, next) => { try { const body = parsed(insertCompanyProfileSchema.strict(), req.body); const existing = (await db.select({ id: company_profile.id }).from(company_profile).limit(1))[0]; const row = existing ? await db.update(company_profile).set(body).where(eq(company_profile.id, existing.id)).returning() : await db.insert(company_profile).values(body).returning(); res.json(row[0]); } catch (e) { next(e); } });

export default router;
