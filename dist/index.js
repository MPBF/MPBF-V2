var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import http from "node:http";
import connectPgSimple from "connect-pg-simple";
import express2 from "express";
import session from "express-session";

// server/auth.ts
import bcrypt from "bcrypt";
import { eq, or } from "drizzle-orm";

// server/db.ts
import { existsSync, readFileSync } from "node:fs";
import { Pool, neonConfig } from "@neondatabase/serverless";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  adminCategoryIdSequence: () => adminCategoryIdSequence,
  adminItemIdSequence: () => adminItemIdSequence,
  adminMachineIdSequence: () => adminMachineIdSequence,
  adminMasterBatchColorIdSequence: () => adminMasterBatchColorIdSequence,
  adminSectionIdSequence: () => adminSectionIdSequence,
  administrative_requests: () => administrative_requests,
  attendance_events: () => attendance_events,
  attendance_sessions: () => attendance_sessions,
  categories: () => categories,
  categoriesRelations: () => categoriesRelations,
  company_profile: () => company_profile,
  customerProductsRelations: () => customerProductsRelations,
  customer_products: () => customer_products,
  customers: () => customers,
  customersRelations: () => customersRelations,
  factory_execution: () => factory_execution,
  factory_inventory: () => factory_inventory,
  factory_locations: () => factory_locations,
  factory_movements: () => factory_movements,
  factory_operations: () => factory_operations,
  factory_queues: () => factory_queues,
  factory_receipt_items: () => factory_receipt_items,
  factory_receipts: () => factory_receipts,
  factory_rolls: () => factory_rolls,
  insertCategorySchema: () => insertCategorySchema,
  insertCompanyProfileSchema: () => insertCompanyProfileSchema,
  insertCustomerProductSchema: () => insertCustomerProductSchema,
  insertCustomerSchema: () => insertCustomerSchema,
  insertItemSchema: () => insertItemSchema,
  insertMachineSchema: () => insertMachineSchema,
  insertMaintenanceComponentCatalogSchema: () => insertMaintenanceComponentCatalogSchema,
  insertMasterBatchColorSchema: () => insertMasterBatchColorSchema,
  insertNewOrderSchema: () => insertNewOrderSchema,
  insertProductionOrderSchema: () => insertProductionOrderSchema,
  insertRoleSchema: () => insertRoleSchema,
  insertSectionSchema: () => insertSectionSchema,
  insertShiftDefinitionSchema: () => insertShiftDefinitionSchema,
  insertSystemSettingSchema: () => insertSystemSettingSchema,
  insertUserSchema: () => insertUserSchema,
  internal_messages: () => internal_messages,
  items: () => items,
  itemsRelations: () => itemsRelations,
  machines: () => machines,
  machinesRelations: () => machinesRelations,
  maintenance_component_catalog: () => maintenance_component_catalog,
  master_batch_colors: () => master_batch_colors,
  order_display_folder_assignments: () => order_display_folder_assignments,
  order_number_allocations: () => order_number_allocations,
  orders: () => orders,
  ordersRelations: () => ordersRelations,
  productionOrdersRelations: () => productionOrdersRelations,
  production_orders: () => production_orders,
  roles: () => roles,
  rolesRelations: () => rolesRelations,
  sections: () => sections,
  sectionsRelations: () => sectionsRelations,
  sessions: () => sessions,
  shiftDefinitionsRelations: () => shiftDefinitionsRelations,
  shift_definitions: () => shift_definitions,
  system_settings: () => system_settings,
  updateCustomerSchema: () => updateCustomerSchema,
  updateMachineSchema: () => updateMachineSchema,
  updateOrderSchema: () => updateOrderSchema,
  updateProductionOrderSchema: () => updateProductionOrderSchema,
  updateSystemSettingSchema: () => updateSystemSettingSchema,
  updateUserSchema: () => updateUserSchema,
  userShiftAssignmentsRelations: () => userShiftAssignmentsRelations,
  user_shift_assignments: () => user_shift_assignments,
  user_violations: () => user_violations,
  users: () => users,
  usersRelations: () => usersRelations
});
import { relations, sql as sql2 } from "drizzle-orm";

// shared/production-schema.ts
import { sql } from "drizzle-orm";
import { pgTable, serial, integer, varchar, text, boolean, timestamp, decimal, jsonb, unique, index, check, foreignKey, uuid } from "drizzle-orm/pg-core";
var factory_execution = pgTable("factory_execution", {
  production_order_id: integer("production_order_id").primaryKey().references(() => production_orders.id, { onDelete: "restrict" }),
  customer_product_id: integer("customer_product_id").notNull().references(() => customer_products.id, { onDelete: "restrict" }),
  item_id: varchar("item_id", { length: 20 }).notNull().references(() => items.id, { onDelete: "restrict" }),
  product: jsonb("product").$type().notNull(),
  is_printed: boolean("is_printed").notNull(),
  is_roll_product: boolean("is_roll_product").notNull(),
  started_by: integer("started_by").references(() => users.id, { onDelete: "set null" }),
  started_at: timestamp("started_at", { withTimezone: true }).default(sql`clock_timestamp()`).notNull(),
  film_closed_at: timestamp("film_closed_at", { withTimezone: true }),
  film_closed_by: integer("film_closed_by").references(() => users.id, { onDelete: "set null" }),
  completed_at: timestamp("completed_at", { withTimezone: true }),
  batch_number: varchar("batch_number", { length: 50 }).unique(),
  stage: varchar("stage", { length: 20 }).default("film").notNull()
}, (t) => [
  unique().on(t.production_order_id, t.customer_product_id, t.item_id),
  check("factory_execution_stage_check", sql`${t.stage} IN ('film','printing','cutting','completed')`),
  check("factory_execution_completion_check", sql`${t.completed_at} IS NULL OR ${t.film_closed_at} IS NOT NULL`)
]);
var factory_rolls = pgTable("factory_rolls", {
  id: serial("id").primaryKey(),
  production_order_id: integer("production_order_id").notNull().references(() => factory_execution.production_order_id, { onDelete: "restrict" }),
  sequence: integer("sequence").notNull(),
  roll_number: varchar("roll_number", { length: 100 }).unique().notNull(),
  weight_kg: decimal("weight_kg", { precision: 14, scale: 2 }).notNull(),
  stage: varchar("stage", { length: 20 }).notNull(),
  film_machine_id: varchar("film_machine_id", { length: 20 }).notNull().references(() => machines.id, { onDelete: "restrict" }),
  created_by: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  created_at: timestamp("created_at", { withTimezone: true }).default(sql`clock_timestamp()`).notNull(),
  production_minutes: integer("production_minutes"),
  is_last_roll: boolean("is_last_roll").default(false).notNull(),
  printing_machine_id: varchar("printing_machine_id", { length: 20 }).references(() => machines.id, { onDelete: "restrict" }),
  printed_by: integer("printed_by").references(() => users.id, { onDelete: "set null" }),
  printed_at: timestamp("printed_at", { withTimezone: true }),
  cutting_machine_id: varchar("cutting_machine_id", { length: 20 }).references(() => machines.id, { onDelete: "restrict" }),
  cut_by: integer("cut_by").references(() => users.id, { onDelete: "set null" }),
  cut_completed_at: timestamp("cut_completed_at", { withTimezone: true }),
  net_weight_kg: decimal("net_weight_kg", { precision: 14, scale: 2 }),
  waste_kg: decimal("waste_kg", { precision: 14, scale: 2 }).default("0").notNull()
}, (t) => [
  unique().on(t.production_order_id, t.sequence),
  index("factory_rolls_order_stage").on(t.production_order_id, t.stage),
  check("factory_rolls_sequence_check", sql`${t.sequence} > 0`),
  check("factory_rolls_weight_kg_check", sql`${t.weight_kg} > 0`),
  check("factory_rolls_stage_check", sql`${t.stage} IN ('film','printing','done')`),
  check("factory_rolls_net_check", sql`${t.net_weight_kg} IS NULL OR ${t.net_weight_kg} > 0 AND ${t.net_weight_kg} <= ${t.weight_kg}`),
  check("factory_rolls_waste_check", sql`${t.waste_kg} >= 0 AND ${t.waste_kg} <= ${t.weight_kg}`),
  check("factory_rolls_balance_check", sql`${t.net_weight_kg} IS NULL AND ${t.waste_kg} = 0 OR ${t.net_weight_kg} + ${t.waste_kg} = ${t.weight_kg}`)
]);
var factory_queues = pgTable("factory_queues", {
  id: serial("id").primaryKey(),
  production_order_id: integer("production_order_id").notNull().references(() => production_orders.id, { onDelete: "cascade" }),
  stage: varchar("stage", { length: 20 }).notNull(),
  machine_id: varchar("machine_id", { length: 20 }).notNull().references(() => machines.id, { onDelete: "restrict" }),
  position: integer("position").notNull(),
  updated_by: integer("updated_by").references(() => users.id, { onDelete: "set null" }),
  updated_at: timestamp("updated_at", { withTimezone: true }).default(sql`clock_timestamp()`).notNull()
}, (t) => [
  unique().on(t.production_order_id, t.stage),
  index("factory_queues_machine_position").on(t.stage, t.machine_id, t.position, t.id),
  check("factory_queues_stage_check", sql`${t.stage} IN ('film','printing','cutting')`),
  check("factory_queues_position_check", sql`${t.position} > 0`)
]);
var factory_locations = pgTable("factory_locations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  name_ar: varchar("name_ar", { length: 100 }).notNull().unique(),
  is_active: boolean("is_active").default(true).notNull()
});
var factory_receipts = pgTable("factory_receipts", {
  id: serial("id").primaryKey(),
  voucher_number: varchar("voucher_number", { length: 50 }).notNull().unique(),
  created_at: timestamp("created_at", { withTimezone: true }).default(sql`clock_timestamp()`).notNull(),
  created_by: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  notes: text("notes")
});
var factory_receipt_items = pgTable("factory_receipt_items", {
  id: serial("id").primaryKey(),
  receipt_id: integer("receipt_id").notNull().references(() => factory_receipts.id, { onDelete: "restrict" }),
  production_order_id: integer("production_order_id").notNull(),
  customer_product_id: integer("customer_product_id").notNull(),
  item_id: varchar("item_id", { length: 20 }).notNull(),
  location_id: integer("location_id").notNull().references(() => factory_locations.id, { onDelete: "restrict" }),
  quantity_kg: decimal("quantity_kg", { precision: 14, scale: 2 }).notNull(),
  packaging: jsonb("packaging").$type()
}, (t) => [
  foreignKey({ columns: [t.production_order_id, t.customer_product_id, t.item_id], foreignColumns: [factory_execution.production_order_id, factory_execution.customer_product_id, factory_execution.item_id] }).onDelete("restrict"),
  unique().on(t.receipt_id, t.production_order_id, t.location_id),
  unique().on(t.id, t.receipt_id),
  index("factory_receipt_items_order").on(t.production_order_id),
  check("factory_receipt_items_quantity_kg_check", sql`${t.quantity_kg} > 0`)
]);
var factory_inventory = pgTable("factory_inventory", {
  id: serial("id").primaryKey(),
  production_order_id: integer("production_order_id").notNull(),
  customer_product_id: integer("customer_product_id").notNull(),
  item_id: varchar("item_id", { length: 20 }).notNull(),
  location_id: integer("location_id").notNull().references(() => factory_locations.id, { onDelete: "restrict" }),
  quantity_kg: decimal("quantity_kg", { precision: 14, scale: 2 }).notNull()
}, (t) => [
  foreignKey({ columns: [t.production_order_id, t.customer_product_id, t.item_id], foreignColumns: [factory_execution.production_order_id, factory_execution.customer_product_id, factory_execution.item_id] }).onDelete("restrict"),
  unique().on(t.customer_product_id, t.production_order_id, t.location_id),
  check("factory_inventory_quantity_kg_check", sql`${t.quantity_kg} >= 0`)
]);
var factory_movements = pgTable("factory_movements", {
  id: serial("id").primaryKey(),
  receipt_id: integer("receipt_id").notNull(),
  receipt_item_id: integer("receipt_item_id").notNull().unique(),
  quantity_kg: decimal("quantity_kg", { precision: 14, scale: 2 }).notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).default(sql`clock_timestamp()`).notNull()
}, (t) => [
  foreignKey({ columns: [t.receipt_item_id, t.receipt_id], foreignColumns: [factory_receipt_items.id, factory_receipt_items.receipt_id] }).onDelete("restrict"),
  check("factory_movements_quantity_kg_check", sql`${t.quantity_kg} > 0`)
]);
var factory_operations = pgTable("factory_operations", {
  id: serial("id").primaryKey(),
  actor_id: integer("actor_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  request_id: uuid("request_id").notNull(),
  operation: text("operation").notNull(),
  fingerprint: text("fingerprint").notNull(),
  result: jsonb("result").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).default(sql`clock_timestamp()`).notNull()
}, (t) => [unique().on(t.actor_id, t.request_id)]);

// shared/schema.ts
import {
  boolean as boolean2,
  check as check2,
  date,
  decimal as decimal2,
  index as index2,
  integer as integer2,
  json,
  jsonb as jsonb2,
  pgSequence,
  pgTable as pgTable2,
  serial as serial2,
  text as text2,
  timestamp as timestamp2,
  uniqueIndex,
  varchar as varchar2
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var adminSectionIdSequence = pgSequence("admin_section_id_seq");
var adminCategoryIdSequence = pgSequence("admin_category_id_seq");
var adminItemIdSequence = pgSequence("admin_item_id_seq");
var adminMasterBatchColorIdSequence = pgSequence("admin_master_batch_color_id_seq");
var adminMachineIdSequence = pgSequence("admin_machine_id_seq");
var roles = pgTable2("roles", {
  id: serial2("id").primaryKey(),
  name: varchar2("name", { length: 50 }).notNull(),
  name_ar: varchar2("name_ar", { length: 100 }),
  permissions: json("permissions").$type()
});
var sections = pgTable2("sections", {
  id: varchar2("id", { length: 20 }).primaryKey(),
  name: varchar2("name", { length: 100 }).notNull(),
  name_ar: varchar2("name_ar", { length: 100 }),
  description: text2("description")
});
var sessions = pgTable2(
  "sessions",
  {
    sid: varchar2("sid").primaryKey(),
    sess: jsonb2("sess").notNull(),
    expire: timestamp2("expire").notNull()
  },
  (table) => [index2("IDX_session_expire").on(table.expire)]
);
var users = pgTable2(
  "users",
  {
    id: serial2("id").primaryKey(),
    username: varchar2("username", { length: 50 }).unique(),
    password: varchar2("password", { length: 100 }),
    display_name: varchar2("display_name", { length: 100 }),
    display_name_ar: varchar2("display_name_ar", { length: 100 }),
    full_name: varchar2("full_name", { length: 200 }),
    phone: varchar2("phone", { length: 20 }),
    email: varchar2("email", { length: 100 }),
    role_id: integer2("role_id").references(() => roles.id),
    // Section IDs are varchar codes (for example, SEC01).
    section_id: varchar2("section_id", { length: 20 }),
    status: varchar2("status", { length: 20 }).default("active"),
    must_change_password: boolean2("must_change_password").default(false),
    is_system_user: boolean2("is_system_user").notNull().default(false),
    include_in_attendance: boolean2("include_in_attendance").notNull().default(true),
    created_at: timestamp2("created_at").defaultNow(),
    national_id: varchar2("national_id", { length: 20 }),
    nationality: varchar2("nationality", { length: 30 }),
    birth_date: date("birth_date"),
    service_start_date: date("service_start_date"),
    profession: varchar2("profession", { length: 100 }),
    replit_user_id: varchar2("replit_user_id", { length: 255 }).unique(),
    preferred_language: varchar2("preferred_language", { length: 10 }),
    first_name: varchar2("first_name", { length: 100 }),
    last_name: varchar2("last_name", { length: 100 }),
    profile_image_url: varchar2("profile_image_url", { length: 500 }),
    updated_at: timestamp2("updated_at").defaultNow()
  },
  (table) => [
    index2("idx_users_role_id").on(table.role_id),
    index2("idx_users_status").on(table.status)
  ]
);
var shift_definitions = pgTable2(
  "shift_definitions",
  {
    id: varchar2("id", { length: 80 }).primaryKey(),
    name_ar: varchar2("name_ar", { length: 120 }).notNull(),
    name_en: varchar2("name_en", { length: 120 }),
    start_time: varchar2("start_time", { length: 5 }).notNull(),
    end_time: varchar2("end_time", { length: 5 }).notNull(),
    next_day_checkin_time: varchar2("next_day_checkin_time", { length: 5 }).notNull().default("06:00"),
    early_checkin_minutes: integer2("early_checkin_minutes").notNull().default(15),
    late_checkout_minutes: integer2("late_checkout_minutes").notNull().default(15),
    break_minutes: integer2("break_minutes").notNull().default(30),
    geofence_enabled: boolean2("geofence_enabled").notNull().default(true),
    geofence_center_lat: decimal2("geofence_center_lat", { precision: 9, scale: 6 }),
    geofence_center_lng: decimal2("geofence_center_lng", { precision: 9, scale: 6 }),
    geofence_radius_meters: integer2("geofence_radius_meters").notNull().default(200),
    is_active: boolean2("is_active").notNull().default(true),
    created_at: timestamp2("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp2("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index2("idx_shift_definitions_active").on(table.is_active)]
);
var user_shift_assignments = pgTable2(
  "user_shift_assignments",
  {
    id: serial2("id").primaryKey(),
    user_id: integer2("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    shift_id: varchar2("shift_id", { length: 80 }).notNull().references(() => shift_definitions.id, { onDelete: "restrict" }),
    assigned_at: timestamp2("assigned_at", { withTimezone: true }).notNull().defaultNow(),
    unassigned_at: timestamp2("unassigned_at", { withTimezone: true }),
    assigned_by: integer2("assigned_by").references(() => users.id, { onDelete: "set null" })
  },
  (table) => [
    index2("idx_user_shift_assignments_user_history").on(table.user_id, table.assigned_at),
    index2("idx_user_shift_assignments_shift_active").on(table.shift_id, table.unassigned_at),
    uniqueIndex("uniq_user_active_shift").on(table.user_id).where(sql2`${table.unassigned_at} IS NULL`)
  ]
);
var attendance_sessions = pgTable2(
  "attendance_sessions",
  {
    id: serial2("id").primaryKey(),
    user_id: integer2("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    shift_assignment_id: integer2("shift_assignment_id").references(() => user_shift_assignments.id, { onDelete: "set null" }),
    shift_id: varchar2("shift_id", { length: 80 }).notNull(),
    shift_date: date("shift_date").notNull(),
    shift_start_at: timestamp2("shift_start_at", { withTimezone: true }).notNull(),
    shift_end_at: timestamp2("shift_end_at", { withTimezone: true }).notNull(),
    window_start_at: timestamp2("window_start_at", { withTimezone: true }).notNull(),
    window_end_at: timestamp2("window_end_at", { withTimezone: true }).notNull(),
    expected_minutes: integer2("expected_minutes").notNull(),
    check_in_at: timestamp2("check_in_at", { withTimezone: true }).notNull(),
    check_out_at: timestamp2("check_out_at", { withTimezone: true }),
    created_at: timestamp2("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("uniq_attendance_session_occurrence").on(table.user_id, table.shift_start_at),
    index2("idx_attendance_sessions_user_date").on(table.user_id, table.shift_date),
    check2("attendance_session_time_check", sql2`${table.shift_start_at} < ${table.shift_end_at} AND ${table.window_start_at} <= ${table.shift_start_at} AND ${table.window_end_at} >= ${table.shift_end_at}`),
    check2("attendance_session_checkout_check", sql2`${table.check_out_at} IS NULL OR ${table.check_out_at} >= ${table.check_in_at}`)
  ]
);
var attendance_events = pgTable2(
  "attendance_events",
  {
    id: serial2("id").primaryKey(),
    user_id: integer2("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    shift_assignment_id: integer2("shift_assignment_id").references(() => user_shift_assignments.id, { onDelete: "set null" }),
    session_id: integer2("session_id").references(() => attendance_sessions.id, { onDelete: "set null" }),
    action: varchar2("action", { length: 20 }).notNull(),
    occurred_at: timestamp2("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    latitude: decimal2("latitude", { precision: 9, scale: 6 }).notNull(),
    longitude: decimal2("longitude", { precision: 9, scale: 6 }).notNull(),
    accuracy: decimal2("accuracy", { precision: 10, scale: 2 }).notNull(),
    source: varchar2("source", { length: 20 }).notNull().default("employee"),
    created_by: integer2("created_by").references(() => users.id, { onDelete: "set null" }),
    updated_by: integer2("updated_by").references(() => users.id, { onDelete: "set null" }),
    updated_at: timestamp2("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index2("idx_attendance_events_user_time").on(table.user_id, table.occurred_at),
    index2("idx_attendance_events_session").on(table.session_id, table.id),
    check2("attendance_events_action_check", sql2`${table.action} IN ('check_in', 'break_start', 'break_end', 'check_out')`),
    check2("attendance_events_latitude_check", sql2`${table.latitude} BETWEEN -90 AND 90`),
    check2("attendance_events_longitude_check", sql2`${table.longitude} BETWEEN -180 AND 180`),
    check2("attendance_events_accuracy_check", sql2`${table.accuracy} BETWEEN 0 AND 10000`),
    check2("attendance_events_source_check", sql2`${table.source} IN ('employee', 'manual')`)
  ]
);
var internal_messages = pgTable2(
  "internal_messages",
  {
    id: serial2("id").primaryKey(),
    sender_id: integer2("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    recipient_id: integer2("recipient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    body: text2("body").notNull(),
    reply_to_id: integer2("reply_to_id").references(() => internal_messages.id, { onDelete: "set null" }),
    created_at: timestamp2("created_at", { withTimezone: true }).notNull().defaultNow(),
    read_at: timestamp2("read_at", { withTimezone: true })
  },
  (table) => [
    index2("idx_internal_messages_sender_created").on(table.sender_id, table.created_at),
    index2("idx_internal_messages_recipient_created").on(table.recipient_id, table.created_at),
    check2("internal_messages_check", sql2`${table.sender_id} <> ${table.recipient_id}`)
  ]
);
var administrative_requests = pgTable2(
  "administrative_requests",
  {
    id: serial2("id").primaryKey(),
    user_id: integer2("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: varchar2("type", { length: 20 }).notNull(),
    title: varchar2("title", { length: 200 }).notNull(),
    details: text2("details").notNull(),
    status: varchar2("status", { length: 20 }).notNull().default("pending"),
    response: text2("response"),
    created_at: timestamp2("created_at", { withTimezone: true }).notNull().defaultNow(),
    responded_at: timestamp2("responded_at", { withTimezone: true })
  },
  (table) => [
    index2("idx_administrative_requests_user_created").on(table.user_id, table.created_at),
    index2("idx_administrative_requests_status_created").on(table.status, table.created_at),
    check2("administrative_requests_type_check", sql2`${table.type} IN ('leave', 'permission', 'other')`),
    check2("administrative_requests_status_check", sql2`${table.status} IN ('pending', 'approved', 'rejected')`)
  ]
);
var user_violations = pgTable2(
  "user_violations",
  {
    id: serial2("id").primaryKey(),
    user_id: integer2("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: varchar2("title", { length: 200 }).notNull(),
    details: text2("details").notNull(),
    created_at: timestamp2("created_at", { withTimezone: true }).notNull().defaultNow(),
    acknowledged_at: timestamp2("acknowledged_at", { withTimezone: true })
  },
  (table) => [index2("idx_user_violations_user_created").on(table.user_id, table.created_at)]
);
var customers = pgTable2(
  "customers",
  {
    id: varchar2("id", { length: 20 }).primaryKey(),
    name: varchar2("name", { length: 200 }).notNull(),
    name_ar: varchar2("name_ar", { length: 200 }),
    code: varchar2("code", { length: 20 }),
    user_id: varchar2("user_id", { length: 10 }),
    plate_drawer_code: varchar2("plate_drawer_code", { length: 20 }),
    city: varchar2("city", { length: 50 }),
    address: text2("address"),
    tax_number: varchar2("tax_number", { length: 20 }),
    commercial_name: varchar2("commercial_name", { length: 200 }),
    unified_number: varchar2("unified_number", { length: 10 }),
    unique_customer_number: varchar2("unique_customer_number", { length: 20 }),
    is_active: boolean2("is_active").default(true),
    phone: varchar2("phone", { length: 20 }),
    sales_rep_id: integer2("sales_rep_id").references(() => users.id),
    created_at: timestamp2("created_at").defaultNow()
  },
  (table) => ({
    unifiedNumberFormat: check2(
      "unified_number_format",
      sql2`${table.unified_number} IS NULL OR ${table.unified_number} ~ '^7[0-9]{9}$'`
    ),
    taxNumberLength: check2(
      "tax_number_length",
      sql2`${table.tax_number} IS NULL OR (${table.tax_number} ~ '^[0-9]+$' AND LENGTH(${table.tax_number}) BETWEEN 10 AND 20)`
    ),
    idx_customers_created_at: index2("idx_customers_created_at").on(table.created_at)
  })
);
var categories = pgTable2("categories", {
  id: varchar2("id", { length: 20 }).primaryKey(),
  name: varchar2("name", { length: 100 }).notNull(),
  name_ar: varchar2("name_ar", { length: 100 }),
  code: varchar2("code", { length: 20 }),
  parent_id: varchar2("parent_id", { length: 20 }),
  overrun_percentage: integer2("overrun_percentage").notNull().default(0)
}, (table) => [
  check2("categories_overrun_percentage_allowed", sql2`${table.overrun_percentage} IN (0, 5, 10, 20)`)
]);
var items = pgTable2("items", {
  id: varchar2("id", { length: 20 }).primaryKey(),
  category_id: varchar2("category_id", { length: 20 }),
  name: varchar2("name", { length: 100 }),
  name_ar: varchar2("name_ar", { length: 100 }),
  code: varchar2("code", { length: 50 }),
  status: varchar2("status", { length: 20 }).default("active")
});
var master_batch_colors = pgTable2("master_batch_colors", {
  id: varchar2("id", { length: 20 }).primaryKey(),
  name: varchar2("name", { length: 100 }).notNull(),
  name_ar: varchar2("name_ar", { length: 100 }).notNull(),
  color_hex: varchar2("color_hex", { length: 20 }).notNull().default("#FFFFFF"),
  text_color: varchar2("text_color", { length: 20 }).notNull().default("#000000"),
  brand: varchar2("brand", { length: 100 }),
  aliases: text2("aliases"),
  is_active: boolean2("is_active").default(true).notNull(),
  sort_order: integer2("sort_order").default(0),
  created_at: timestamp2("created_at").default(sql2`CURRENT_TIMESTAMP`).notNull(),
  updated_at: timestamp2("updated_at").default(sql2`CURRENT_TIMESTAMP`).notNull()
});
var customer_products = pgTable2(
  "customer_products",
  {
    id: serial2("id").primaryKey(),
    customer_id: varchar2("customer_id", { length: 20 }).references(() => customers.id, { onDelete: "restrict" }),
    category_id: varchar2("category_id", { length: 20 }).references(() => categories.id),
    item_id: varchar2("item_id", { length: 20 }).references(() => items.id),
    size_caption: varchar2("size_caption", { length: 50 }),
    // Unscaled numeric plus CHECK constraints reject fractional SQL writes.
    // PostgreSQL integer and numeric(p, 0) would silently round them instead.
    width: decimal2("width"),
    left_facing: decimal2("left_facing"),
    right_facing: decimal2("right_facing"),
    thickness: decimal2("thickness"),
    universal_thickness: decimal2("universal_thickness").generatedAlwaysAs(
      sql2`CEIL(CASE WHEN (COALESCE(left_facing, 0) = 0 AND COALESCE(right_facing, 0) = 0) THEN thickness / 2 * 10 WHEN (left_facing > 0 AND right_facing > 0) THEN thickness / 4 * 10 ELSE thickness / 2 * 10 END)`
    ),
    density: decimal2("density", { precision: 6, scale: 3 }).default("0.95"),
    bag_weight_grams: decimal2("bag_weight_grams", { precision: 12, scale: 4 }),
    bags_per_kilo: decimal2("bags_per_kilo"),
    printing_cylinder: varchar2("printing_cylinder", { length: 10 }),
    cutting_length_cm: integer2("cutting_length_cm"),
    raw_material: varchar2("raw_material", { length: 20 }),
    master_batch_id: varchar2("master_batch_id", { length: 20 }),
    is_printed: boolean2("is_printed").default(false),
    cutting_unit: varchar2("cutting_unit", { length: 20 }),
    punching: varchar2("punching", { length: 20 }),
    unit_weight_kg: decimal2("unit_weight_kg", { precision: 8, scale: 3 }),
    unit_quantity: integer2("unit_quantity"),
    package_weight_kg: decimal2("package_weight_kg", { precision: 8, scale: 2 }),
    cliche_front_design: text2("cliche_front_design"),
    cliche_back_design: text2("cliche_back_design"),
    front_print_colors: text2("front_print_colors").array(),
    back_print_colors: text2("back_print_colors").array(),
    notes: text2("notes"),
    status: varchar2("status", { length: 20 }).default("active"),
    created_at: timestamp2("created_at").defaultNow()
  },
  (table) => [
    index2("idx_customer_products_customer_id").on(table.customer_id),
    index2("idx_customer_products_status").on(table.status),
    index2("idx_customer_products_created_at").on(table.created_at),
    check2("customer_products_width_whole", sql2`${table.width} IS NULL OR ${table.width} = trunc(${table.width})`),
    check2("customer_products_left_facing_whole", sql2`${table.left_facing} IS NULL OR ${table.left_facing} = trunc(${table.left_facing})`),
    check2("customer_products_right_facing_whole", sql2`${table.right_facing} IS NULL OR ${table.right_facing} = trunc(${table.right_facing})`),
    check2("customer_products_thickness_whole", sql2`${table.thickness} IS NULL OR ${table.thickness} = trunc(${table.thickness})`),
    check2("customer_products_universal_thickness_whole", sql2`${table.universal_thickness} IS NULL OR ${table.universal_thickness} = trunc(${table.universal_thickness})`),
    check2("customer_products_bags_per_kilo_whole", sql2`${table.bags_per_kilo} IS NULL OR ${table.bags_per_kilo} = trunc(${table.bags_per_kilo})`)
  ]
);
var machines = pgTable2(
  "machines",
  {
    id: varchar2("id", { length: 20 }).primaryKey(),
    name: varchar2("name", { length: 100 }).notNull(),
    name_ar: varchar2("name_ar", { length: 100 }),
    type: varchar2("type", { length: 50 }),
    section_id: varchar2("section_id", { length: 20 }).references(() => sections.id, { onDelete: "restrict" }),
    status: varchar2("status", { length: 20 }).notNull().default("active"),
    capacity_small_kg_per_hour: decimal2("capacity_small_kg_per_hour", { precision: 8, scale: 2 }),
    capacity_medium_kg_per_hour: decimal2("capacity_medium_kg_per_hour", { precision: 8, scale: 2 }),
    capacity_large_kg_per_hour: decimal2("capacity_large_kg_per_hour", { precision: 8, scale: 2 }),
    screw_type: varchar2("screw_type", { length: 10 }).default("A"),
    raw_material_type: varchar2("raw_material_type", { length: 20 }),
    min_thickness: decimal2("min_thickness", { precision: 8, scale: 3 }),
    max_thickness: decimal2("max_thickness", { precision: 8, scale: 3 }),
    inline_printer_id: varchar2("inline_printer_id", { length: 20 }).references(() => machines.id, { onDelete: "set null" }),
    min_width_cm: decimal2("min_width_cm", { precision: 8, scale: 2 }),
    max_width_cm: decimal2("max_width_cm", { precision: 8, scale: 2 }),
    max_print_colors: integer2("max_print_colors"),
    min_cylinder_inch: decimal2("min_cylinder_inch", { precision: 8, scale: 2 }),
    max_cylinder_inch: decimal2("max_cylinder_inch", { precision: 8, scale: 2 }),
    min_length_cm: decimal2("min_length_cm", { precision: 8, scale: 2 }),
    max_length_cm: decimal2("max_length_cm", { precision: 8, scale: 2 }),
    width_cm: decimal2("width_cm", { precision: 10, scale: 2 }),
    length_cm: decimal2("length_cm", { precision: 10, scale: 2 }),
    height_cm: decimal2("height_cm", { precision: 10, scale: 2 }),
    weight_kg: decimal2("weight_kg", { precision: 10, scale: 2 }),
    manufacturer: varchar2("manufacturer", { length: 100 }),
    metal_plate: text2("metal_plate"),
    manufacture_date: date("manufacture_date"),
    serial_number: varchar2("serial_number", { length: 100 })
  },
  (table) => ({
    machineIdFormat: check2("machine_id_format", sql2`${table.id} ~ '^(M[0-9]{3}|MAC[0-9]{2,3})$'`),
    // Keep existing imported labels valid in the schema model. API writes
    // normalize these aliases only when a machine type is actually changed.
    typeValid: check2("type_valid", sql2`${table.type} IN ('extruder', 'printer', 'cutter', 'quality_check', 'printing', 'cutting', 'Printer', 'Cutter')`),
    statusValid: check2("status_valid", sql2`${table.status} IN ('active', 'maintenance', 'down')`),
    nameNotEmpty: check2("name_not_empty", sql2`LENGTH(TRIM(${table.name})) > 0`),
    screwTypeValid: check2("screw_type_valid", sql2`${table.screw_type} IS NULL OR ${table.screw_type} IN ('A', 'ABA')`)
  })
);
var orders = pgTable2(
  "orders",
  {
    id: serial2("id").primaryKey(),
    order_number: varchar2("order_number", { length: 50 }).notNull().unique(),
    customer_id: varchar2("customer_id", { length: 20 }).notNull().references(() => customers.id, { onDelete: "restrict" }),
    delivery_days: integer2("delivery_days"),
    status: varchar2("status", { length: 30 }).default("pending"),
    previous_status: varchar2("previous_status", { length: 30 }),
    notes: text2("notes"),
    share_token: varchar2("share_token", { length: 64 }).unique(),
    created_by: integer2("created_by").references(() => users.id, { onDelete: "set null" }),
    created_at: timestamp2("created_at").notNull().defaultNow(),
    delivery_date: date("delivery_date")
  },
  (table) => ({
    deliveryDaysPositive: check2("delivery_days_positive", sql2`${table.delivery_days} IS NULL OR ${table.delivery_days} > 0`),
    statusValid: check2("status_valid", sql2`${table.status} IN ('waiting', 'on_hold', 'in_production', 'for_production', 'paused', 'cancelled', 'completed', 'delivered', 'archived')`),
    idx_orders_customer_id: index2("idx_orders_customer_id").on(table.customer_id),
    idx_orders_created_at: index2("idx_orders_created_at").on(table.created_at)
  })
);
var order_number_allocations = pgTable2("order_number_allocations", {
  sequence: decimal2("sequence", { precision: 44, scale: 0 }).primaryKey(),
  order_number: varchar2("order_number", { length: 45 }).notNull().unique()
}, (table) => ({
  sequencePositive: check2("order_number_allocation_positive", sql2`${table.sequence} > 0`)
}));
var order_display_folder_assignments = pgTable2("order_display_folder_assignments", {
  order_id: integer2("order_id").primaryKey().references(() => orders.id, { onDelete: "cascade" }),
  folder: varchar2("folder", { length: 20 }).notNull(),
  updated_by: integer2("updated_by").references(() => users.id, { onDelete: "set null" }),
  updated_at: timestamp2("updated_at").notNull().defaultNow()
}, (table) => ({
  folderValid: check2("order_display_folder_valid", sql2`${table.folder} IN ('new','production','urgent','archive')`),
  folderOrderIndex: index2("idx_order_display_folder_order").on(table.folder, table.order_id)
}));
var production_orders = pgTable2(
  "production_orders",
  {
    id: serial2("id").primaryKey(),
    production_order_number: varchar2("production_order_number", { length: 50 }).notNull().unique(),
    order_id: integer2("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    customer_product_id: integer2("customer_product_id").references(() => customer_products.id, { onDelete: "restrict" }),
    quantity_kg: decimal2("quantity_kg", { precision: 10, scale: 2 }).notNull(),
    overrun_percentage: decimal2("overrun_percentage", { precision: 5, scale: 2 }).notNull().default("5.00"),
    final_quantity_kg: decimal2("final_quantity_kg", { precision: 10, scale: 2 }).notNull(),
    status: varchar2("status", { length: 30 }).notNull().default("pending"),
    previous_status: varchar2("previous_status", { length: 30 }),
    batch_number: varchar2("batch_number", { length: 50 }).unique(),
    created_at: timestamp2("created_at").notNull().defaultNow()
  },
  (table) => ({
    quantityPositive: check2("quantity_kg_positive", sql2`${table.quantity_kg} > 0`),
    overrunPercentageValid: check2("overrun_percentage_valid", sql2`${table.overrun_percentage} >= 0 AND ${table.overrun_percentage} <= 50`),
    finalQuantityPositive: check2("final_quantity_kg_positive", sql2`${table.final_quantity_kg} > 0`),
    statusValid: check2("production_status_valid", sql2`${table.status} IN ('pending', 'active', 'completed', 'cancelled', 'archived')`),
    idx_production_orders_order_id: index2("idx_production_orders_order_id").on(table.order_id),
    idx_production_orders_status: index2("idx_production_orders_status").on(table.status),
    idx_production_orders_created_at: index2("idx_production_orders_created_at").on(table.created_at)
  })
);
var maintenance_component_catalog = pgTable2(
  "maintenance_component_catalog",
  {
    id: serial2("id").primaryKey(),
    machine_type: varchar2("machine_type", { length: 30 }).notNull(),
    name_ar: varchar2("name_ar", { length: 200 }).notNull(),
    name_en: varchar2("name_en", { length: 200 }).notNull(),
    sort_order: integer2("sort_order").notNull().default(0),
    enabled: boolean2("enabled").notNull().default(true),
    created_at: timestamp2("created_at").defaultNow()
  },
  (table) => [
    uniqueIndex("uniq_component_catalog_type_name").on(table.machine_type, table.name_en),
    index2("idx_component_catalog_type").on(table.machine_type)
  ]
);
var company_profile = pgTable2("company_profile", {
  id: serial2("id").primaryKey(),
  name: varchar2("name", { length: 100 }).notNull(),
  name_ar: varchar2("name_ar", { length: 100 }),
  address: text2("address"),
  tax_number: varchar2("tax_number", { length: 20 }),
  phone: varchar2("phone", { length: 20 }),
  email: varchar2("email", { length: 100 }),
  logo_url: varchar2("logo_url", { length: 255 }),
  working_hours_per_day: integer2("working_hours_per_day").default(8),
  default_language: varchar2("default_language", { length: 10 }).default("ar"),
  letter_header_image_url: varchar2("letter_header_image_url", { length: 255 }),
  letter_footer_image_url: varchar2("letter_footer_image_url", { length: 255 }),
  letter_footer_text: text2("letter_footer_text"),
  letter_default_signatures: jsonb2("letter_default_signatures")
});
var system_settings = pgTable2("system_settings", {
  id: serial2("id").primaryKey(),
  setting_key: varchar2("setting_key", { length: 100 }).notNull().unique(),
  setting_value: text2("setting_value"),
  setting_type: varchar2("setting_type", { length: 20 }).default("string"),
  description: text2("description"),
  is_editable: boolean2("is_editable").default(true),
  updated_at: timestamp2("updated_at").defaultNow(),
  updated_by: integer2("updated_by").references(() => users.id)
});
var rolesRelations = relations(roles, ({ many }) => ({ users: many(users) }));
var sectionsRelations = relations(sections, ({ many }) => ({ users: many(users), machines: many(machines) }));
var usersRelations = relations(users, ({ one: one2, many }) => ({
  role: one2(roles, { fields: [users.role_id], references: [roles.id] }),
  salesCustomers: many(customers),
  createdOrders: many(orders),
  shiftAssignments: many(user_shift_assignments, { relationName: "shift_assignee" })
}));
var shiftDefinitionsRelations = relations(shift_definitions, ({ many }) => ({
  assignments: many(user_shift_assignments)
}));
var userShiftAssignmentsRelations = relations(user_shift_assignments, ({ one: one2, many }) => ({
  user: one2(users, { fields: [user_shift_assignments.user_id], references: [users.id], relationName: "shift_assignee" }),
  assignedBy: one2(users, { fields: [user_shift_assignments.assigned_by], references: [users.id], relationName: "shift_assigner" }),
  shift: one2(shift_definitions, { fields: [user_shift_assignments.shift_id], references: [shift_definitions.id] }),
  attendanceEvents: many(attendance_events)
}));
var customersRelations = relations(customers, ({ one: one2, many }) => ({
  salesRep: one2(users, { fields: [customers.sales_rep_id], references: [users.id] }),
  orders: many(orders),
  products: many(customer_products)
}));
var categoriesRelations = relations(categories, ({ one: one2, many }) => ({
  parent: one2(categories, { fields: [categories.parent_id], references: [categories.id], relationName: "parent_category" }),
  children: many(categories, { relationName: "parent_category" }),
  products: many(customer_products)
}));
var itemsRelations = relations(items, ({ many }) => ({ products: many(customer_products) }));
var customerProductsRelations = relations(customer_products, ({ one: one2, many }) => ({
  customer: one2(customers, { fields: [customer_products.customer_id], references: [customers.id] }),
  category: one2(categories, { fields: [customer_products.category_id], references: [categories.id] }),
  item: one2(items, { fields: [customer_products.item_id], references: [items.id] }),
  productionOrders: many(production_orders)
}));
var machinesRelations = relations(machines, ({ one: one2, many }) => ({
  section: one2(sections, { fields: [machines.section_id], references: [sections.id] })
}));
var ordersRelations = relations(orders, ({ one: one2, many }) => ({
  customer: one2(customers, { fields: [orders.customer_id], references: [customers.id] }),
  productionOrders: many(production_orders)
}));
var productionOrdersRelations = relations(production_orders, ({ one: one2 }) => ({
  order: one2(orders, { fields: [production_orders.order_id], references: [orders.id] }),
  customerProduct: one2(customer_products, { fields: [production_orders.customer_product_id], references: [customer_products.id] })
}));
var omitGenerated = { id: true, created_at: true, updated_at: true };
var insertRoleSchema = createInsertSchema(roles).omit({ id: true });
var insertSectionSchema = createInsertSchema(sections).omit({ id: true });
var insertUserSchema = createInsertSchema(users).omit({ id: true, created_at: true, updated_at: true });
var insertShiftDefinitionSchema = createInsertSchema(shift_definitions).omit({ created_at: true, updated_at: true });
var insertCustomerSchema = createInsertSchema(customers).omit({ created_at: true });
var insertCategorySchema = createInsertSchema(categories).omit({ id: true }).extend({
  overrun_percentage: z.union([z.literal(0), z.literal(5), z.literal(10), z.literal(20)]).optional()
});
var insertItemSchema = createInsertSchema(items).omit({ id: true });
var insertMasterBatchColorSchema = createInsertSchema(master_batch_colors).omit(omitGenerated);
var wholeProductNumber = z.string().regex(/^-?\d+$/, "\u064A\u062C\u0628 \u0625\u062F\u062E\u0627\u0644 \u0639\u062F\u062F \u0635\u062D\u064A\u062D \u062F\u0648\u0646 \u0643\u0633\u0648\u0631").nullish();
var insertCustomerProductSchema = createInsertSchema(customer_products, {
  width: wholeProductNumber,
  left_facing: wholeProductNumber,
  right_facing: wholeProductNumber,
  thickness: wholeProductNumber,
  bags_per_kilo: wholeProductNumber
}).omit({
  id: true,
  created_at: true,
  size_caption: true,
  bag_weight_grams: true,
  bags_per_kilo: true,
  package_weight_kg: true,
  is_printed: true
});
var insertMachineSchema = createInsertSchema(machines).omit({ id: true });
var insertNewOrderSchema = createInsertSchema(orders).omit({ id: true, created_at: true });
var insertProductionOrderSchema = createInsertSchema(production_orders).omit({ id: true, created_at: true });
var insertMaintenanceComponentCatalogSchema = createInsertSchema(maintenance_component_catalog).omit({ id: true, created_at: true });
var insertCompanyProfileSchema = createInsertSchema(company_profile).omit({ id: true });
var insertSystemSettingSchema = createInsertSchema(system_settings).omit({ id: true, updated_at: true });
var updateUserSchema = insertUserSchema.partial();
var updateCustomerSchema = insertCustomerSchema.partial();
var updateMachineSchema = insertMachineSchema.partial();
var updateOrderSchema = insertNewOrderSchema.partial();
var updateProductionOrderSchema = insertProductionOrderSchema.partial();
var updateSystemSettingSchema = insertSystemSettingSchema.partial();

// server/db.ts
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
function loadDotEnvFile() {
  const envPath = ".env";
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = line.slice(0, eqIndex).trim();
    if (!key || process.env[key] !== void 0) continue;
    let value = line.slice(eqIndex + 1).trim();
    if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}
loadDotEnvFile();
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "\u0645\u062A\u063A\u064A\u0631 DATABASE_URL \u063A\u064A\u0631 \u0645\u0636\u0628\u0648\u0637. \u0623\u0646\u0634\u0626 \u0645\u0644\u0641 .env \u0645\u0646 .env.example \u062B\u0645 \u0623\u0636\u0641 \u0631\u0627\u0628\u0637 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A."
  );
}
var MAIN_POOL_MAX = Number(process.env.DB_POOL_MAX ?? 10);
var SESSION_POOL_MAX = Number(process.env.DB_SESSION_POOL_MAX ?? 3);
var pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: MAIN_POOL_MAX,
  idleTimeoutMillis: 3e4,
  connectionTimeoutMillis: 1e4
});
var TRANSIENT_CODES = /* @__PURE__ */ new Set(["57P01", "ECONNRESET", "ETIMEDOUT", "08006", "08003"]);
var TRANSIENT_MESSAGE_RE = /socket hang up|terminating connection|Connection terminated|ECONNRESET|ECONNREFUSED/i;
function isTransientDbError(err) {
  const code = err?.code;
  const msg = String(err?.message ?? "");
  return typeof code === "string" && TRANSIENT_CODES.has(code) || TRANSIENT_MESSAGE_RE.test(msg);
}
pool.on("error", (err) => {
  if (isTransientDbError(err)) {
    console.warn("\u26A0\uFE0F Transient DB pool error (will reconnect):", err.message);
    return;
  }
  console.error("\u{1F534} Database pool error (non-fatal):", err.message);
  console.error("\u{1F4CD} Error code:", err.code || "Unknown");
});
var sessionPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: SESSION_POOL_MAX,
  idleTimeoutMillis: 3e4,
  connectionTimeoutMillis: 1e4
});
sessionPool.on("error", (err) => {
  if (isTransientDbError(err)) {
    return;
  }
  console.error("\u{1F534} Session pool error (non-fatal):", err.message);
});
var db = drizzle({ client: pool, schema: schema_exports });

// server/auth.ts
async function resolveUser(userId2) {
  const rows2 = await db.select({ user: users, role: roles }).from(users).leftJoin(roles, eq(users.role_id, roles.id)).where(eq(users.id, userId2)).limit(1);
  const row = rows2[0];
  if (!row || row.user.status !== "active") return null;
  return {
    id: row.user.id,
    username: row.user.username,
    display_name: row.user.display_name,
    display_name_ar: row.user.display_name_ar,
    role_id: row.user.role_id,
    role_name: row.role?.name ?? null,
    role_name_ar: row.role?.name_ar ?? null,
    section_id: row.user.section_id,
    preferred_language: row.user.preferred_language === "ar" || row.user.preferred_language === "en" ? row.user.preferred_language : null,
    permissions: Array.isArray(row.role?.permissions) ? row.role.permissions : [],
    must_change_password: Boolean(row.user.must_change_password)
  };
}
async function populateUser(req, _res, next) {
  if (req.session.userId) {
    try {
      const user = await resolveUser(req.session.userId);
      if (user) req.user = user;
    } catch (error) {
      return next(error);
    }
  }
  next();
}
var passwordChangeEndpoints = /* @__PURE__ */ new Set([
  "GET /me",
  "HEAD /me",
  "GET /public-branding",
  "HEAD /public-branding",
  "PUT /me/language",
  "POST /login",
  "POST /logout",
  "POST /change-password"
]);
function enforcePasswordChange(req, res, next) {
  if (!req.user?.must_change_password) return next();
  const path2 = req.path.replace(/\/+$/, "") || "/";
  if (passwordChangeEndpoints.has(`${req.method} ${path2}`)) return next();
  return res.status(403).json({
    code: "PASSWORD_CHANGE_REQUIRED",
    message: "\u064A\u062C\u0628 \u062A\u062D\u062F\u064A\u062B \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0642\u0628\u0644 \u0645\u062A\u0627\u0628\u0639\u0629 \u0627\u0644\u0639\u0645\u0644."
  });
}
function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ message: "\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0645\u0637\u0644\u0648\u0628" });
  next();
}
function requirePermission(...required) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0645\u0637\u0644\u0648\u0628" });
    const permissions = req.user.permissions ?? [];
    if (required.some((item) => permissions.includes(item) || item !== "admin" && permissions.includes("*"))) {
      return next();
    }
    return res.status(403).json({ message: "\u0644\u0627 \u062A\u0645\u0644\u0643 \u0635\u0644\u0627\u062D\u064A\u0629 \u062A\u0646\u0641\u064A\u0630 \u0647\u0630\u0627 \u0627\u0644\u0625\u062C\u0631\u0627\u0621" });
  };
}
var requireAnyPermission = (...permissions) => requirePermission(...permissions);
async function authenticate(identifier, password) {
  const result = await db.select({ user: users, role: roles }).from(users).leftJoin(roles, eq(users.role_id, roles.id)).where(or(eq(users.username, identifier), eq(users.national_id, identifier))).limit(1);
  const row = result[0];
  if (!row?.user.password || row.user.status !== "active") return null;
  if (!await bcrypt.compare(password, row.user.password)) return null;
  return resolveUser(row.user.id);
}
async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

// server/routes.ts
import { Router as Router5 } from "express";

// shared/order-production-release.ts
var ORDER_PRODUCTION_RELEASE_STATUSES = ["waiting", "on_hold", "paused"];
function canReleaseOrderToProduction(status) {
  return typeof status === "string" && ORDER_PRODUCTION_RELEASE_STATUSES.some((value) => value === status);
}

// server/order-production-release.ts
function releaseError(message, status = 409) {
  return Object.assign(new Error(message), { status });
}
async function releaseOrderToProduction(id2, expectedStatus, connectionPool = pool) {
  const client = await connectionPool.connect();
  try {
    await client.query("BEGIN");
    const { rows: [order] } = await client.query("SELECT id,status,previous_status FROM orders WHERE id=$1 FOR UPDATE", [id2]);
    if (!order) throw releaseError("\u0627\u0644\u0637\u0644\u0628 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F", 404);
    if (!await validateOrderRelease(client, order, expectedStatus)) {
      await client.query("COMMIT");
      return { order };
    }
    const { rows: [updated] } = await client.query(
      "UPDATE orders SET previous_status=status,status='for_production' WHERE id=$1 RETURNING id,status,previous_status",
      [id2]
    );
    await client.query("COMMIT");
    return { order: updated };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
async function validateOrderRelease(client, order, expectedStatus) {
  if (order.status === "for_production" || order.status === "in_production") return false;
  if (!canReleaseOrderToProduction(order.status)) throw releaseError("\u0644\u0627 \u064A\u0645\u0643\u0646 \u062A\u062D\u0648\u064A\u0644 \u0637\u0644\u0628 \u0645\u0644\u063A\u064A \u0623\u0648 \u0645\u0643\u062A\u0645\u0644 \u0623\u0648 \u0645\u0633\u0644\u0651\u0645 \u0623\u0648 \u0645\u0624\u0631\u0634\u0641 \u0625\u0644\u0649 \u0627\u0644\u0625\u0646\u062A\u0627\u062C.");
  if (order.status !== expectedStatus) throw releaseError("\u062A\u063A\u064A\u0631\u062A \u062D\u0627\u0644\u0629 \u0627\u0644\u0637\u0644\u0628\u061B \u062D\u062F\u0651\u062B \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0642\u0628\u0644 \u062A\u062D\u0648\u064A\u0644\u0647 \u0625\u0644\u0649 \u0627\u0644\u0625\u0646\u062A\u0627\u062C.");
  const { rows: lines } = await client.query(
    `SELECT p.id,p.status,e.production_order_id execution_id
     FROM production_orders p LEFT JOIN factory_execution e ON e.production_order_id=p.id
     WHERE p.order_id=$1 ORDER BY p.id FOR UPDATE OF p`,
    [order.id]
  );
  if (!lines.some((line) => line.status === "pending" || line.status === "active" && line.execution_id != null)) {
    throw releaseError("\u0644\u0627 \u064A\u062D\u062A\u0648\u064A \u0627\u0644\u0637\u0644\u0628 \u0639\u0644\u0649 \u0623\u0648\u0627\u0645\u0631 \u0625\u0646\u062A\u0627\u062C \u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u062A\u0646\u0641\u064A\u0630.");
  }
  return true;
}

// server/order-production-delete.ts
import { sql as sql3 } from "drizzle-orm";
async function lockOrderProductionDeletion(tx) {
  for (const stage of ["film", "printing", "cutting"]) {
    await tx.execute(sql3`SELECT pg_advisory_xact_lock(hashtextextended(${`factory-queue:${stage}`},0))`);
  }
}
async function deleteOrderProduction(tx, orderId) {
  const ids = sql3`SELECT id FROM production_orders WHERE order_id=${orderId}`;
  await tx.execute(sql3`SELECT id FROM production_orders WHERE order_id=${orderId} ORDER BY id FOR UPDATE`);
  await tx.execute(sql3`SELECT id FROM factory_receipts WHERE id IN (
    SELECT receipt_id FROM factory_receipt_items WHERE production_order_id IN (${ids})
  ) ORDER BY id FOR UPDATE`);
  await tx.execute(sql3`DELETE FROM factory_movements WHERE receipt_item_id IN (
    SELECT id FROM factory_receipt_items WHERE production_order_id IN (${ids})
  )`);
  await tx.execute(sql3`DELETE FROM factory_inventory WHERE production_order_id IN (${ids})`);
  await tx.execute(sql3`WITH removed AS (
    DELETE FROM factory_receipt_items WHERE production_order_id IN (${ids}) RETURNING receipt_id
  ) DELETE FROM factory_receipts r WHERE r.id IN (SELECT receipt_id FROM removed)
    AND NOT EXISTS (SELECT 1 FROM factory_receipt_items ri WHERE ri.receipt_id=r.id
      AND ri.production_order_id NOT IN (${ids}))`);
  await tx.execute(sql3`DELETE FROM factory_rolls WHERE production_order_id IN (${ids})`);
  await tx.execute(sql3`DELETE FROM factory_queues WHERE production_order_id IN (${ids})`);
  await tx.execute(sql3`DELETE FROM factory_execution WHERE production_order_id IN (${ids})`);
  await tx.execute(sql3`DELETE FROM production_orders WHERE order_id=${orderId}`);
}

// server/order-bulk-delete.ts
import { asc, eq as eq2, inArray } from "drizzle-orm";
function deletionError(message, message_en, status) {
  return Object.assign(new Error(message), { message_en, status });
}
async function deleteOrdersAtomically(items2, source = db) {
  const ids = items2.map((item) => item.id).sort((a, b) => a - b);
  if (!ids.length || ids.length > 100 || new Set(ids).size !== ids.length || ids.some((id2) => !Number.isInteger(id2) || id2 <= 0 || id2 > 2147483647)) {
    throw deletionError("\u062D\u062F\u062F \u0645\u0646 \u0637\u0644\u0628 \u0648\u0627\u062D\u062F \u0625\u0644\u0649 100 \u0637\u0644\u0628 \u062F\u0648\u0646 \u062A\u0643\u0631\u0627\u0631.", "Select 1\u2013100 distinct orders.", 400);
  }
  return source.transaction(async (tx) => {
    await lockOrderProductionDeletion(tx);
    const records = await tx.select({ id: orders.id, status: orders.status }).from(orders).where(inArray(orders.id, ids)).orderBy(asc(orders.id)).for("update");
    if (records.length !== ids.length) {
      throw deletionError("\u0623\u062D\u062F \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u061B \u0644\u0645 \u064A\u064F\u062D\u0630\u0641 \u0623\u064A \u0637\u0644\u0628.", "An order was not found; no orders were deleted.", 404);
    }
    const expected = new Map(items2.map((item) => [item.id, item.expected_status]));
    if (records.some((record2) => record2.status !== expected.get(record2.id))) {
      throw deletionError(
        "\u062A\u063A\u064A\u0631\u062A \u062D\u0627\u0644\u0629 \u0623\u062D\u062F \u0627\u0644\u0637\u0644\u0628\u0627\u062A\u061B \u0644\u0645 \u064A\u064F\u062D\u0630\u0641 \u0623\u064A \u0637\u0644\u0628. \u062D\u062F\u0651\u062B \u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u062B\u0645 \u0623\u0639\u062F \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629.",
        "An order's status changed; no orders were deleted. Refresh the list and try again.",
        409
      );
    }
    for (const id2 of ids) {
      await deleteOrderProduction(tx, id2);
      await tx.delete(orders).where(eq2(orders.id, id2));
    }
    return { success: true, ids };
  });
}

// shared/order-workspace.ts
var ORDER_DISPLAY_FOLDERS = ["new", "production", "urgent", "archive"];
var ORDER_WORKSPACE_ACTIONS = ["release", "pause", "cancel"];
var ORDER_WORKSPACE_STATUSES = ["waiting", "on_hold", "for_production", "in_production", "paused", "cancelled", "completed", "delivered", "archived"];
function canApplyOrderAction(status, action) {
  if (action === "release") return ["waiting", "on_hold", "paused"].includes(String(status));
  if (action === "pause") return ["waiting", "on_hold", "for_production", "in_production"].includes(String(status));
  return ["waiting", "on_hold", "for_production", "in_production", "paused"].includes(String(status));
}

// server/order-workspace.ts
var WorkspaceError = class extends Error {
  constructor(message, message_en, status = 409) {
    super(message);
    this.message_en = message_en;
    this.status = status;
  }
};
function idsFor(items2) {
  const ids = items2.map((item) => item.id);
  if (!ids.length || ids.length > 100 || ids.some((id2) => !Number.isInteger(id2) || id2 <= 0 || id2 > 2147483647) || new Set(ids).size !== ids.length) {
    throw new WorkspaceError("\u062D\u062F\u062F \u0645\u0646 \u0637\u0644\u0628 \u0648\u0627\u062D\u062F \u0625\u0644\u0649 100 \u0637\u0644\u0628 \u062F\u0648\u0646 \u062A\u0643\u0631\u0627\u0631.", "Select 1\u2013100 distinct orders.", 400);
  }
  return ids.sort((a, b) => a - b);
}
async function transaction(source, action) {
  const client = await source.connect();
  try {
    await client.query("BEGIN");
    const result = await action(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
async function lockOrders(client, ids) {
  const { rows: rows2 } = await client.query("SELECT id,status,previous_status FROM orders WHERE id=ANY($1::int[]) ORDER BY id FOR UPDATE", [ids]);
  if (rows2.length !== ids.length) throw new WorkspaceError("\u0623\u062D\u062F \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u061B \u0644\u0645 \u064A\u064F\u0646\u0641\u0630 \u0627\u0644\u0625\u062C\u0631\u0627\u0621.", "An order was not found; no changes were made.", 404);
  return rows2;
}
async function applyOrderActions(action, items2, source = pool) {
  if (!ORDER_WORKSPACE_ACTIONS.includes(action)) throw new WorkspaceError("\u0625\u062C\u0631\u0627\u0621 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D.", "Invalid action.", 400);
  const ids = idsFor(items2);
  const expected = new Map(items2.map((item) => [item.id, item.expected_status]));
  return transaction(source, async (client) => {
    const records = await lockOrders(client, ids);
    const changed = [];
    const target = action === "release" ? "for_production" : action === "pause" ? "paused" : "cancelled";
    for (const order of records) {
      try {
        if (action === "release") {
          if (await validateOrderRelease(client, order, expected.get(order.id))) changed.push(order);
        } else if (order.status !== target) {
          if (order.status !== expected.get(order.id) || !canApplyOrderAction(order.status, action)) {
            throw new WorkspaceError("\u0627\u0644\u0637\u0644\u0628 \u0644\u0627 \u064A\u0642\u0628\u0644 \u0627\u0644\u0625\u062C\u0631\u0627\u0621.", "The order is ineligible.");
          }
          changed.push(order);
        }
      } catch (error) {
        if (!(error instanceof WorkspaceError) && !(error instanceof Error && error.status === 409)) throw error;
        throw new WorkspaceError(
          `\u0627\u0644\u0637\u0644\u0628 ${order.id} \u062A\u063A\u064A\u0631\u062A \u062D\u0627\u0644\u062A\u0647 \u0623\u0648 \u0644\u0627 \u064A\u0642\u0628\u0644 \u0627\u0644\u0625\u062C\u0631\u0627\u0621\u061B \u0644\u0645 \u062A\u062A\u063A\u064A\u0631 \u0623\u064A \u0637\u0644\u0628\u0627\u062A.`,
          `Order ${order.id} changed or is ineligible; no orders were changed.`
        );
      }
    }
    if (changed.length) {
      await client.query("UPDATE orders SET previous_status=status,status=$2 WHERE id=ANY($1::int[])", [changed.map((order) => order.id), target]);
    }
    const changedIds = new Set(changed.map((order) => order.id));
    return { orders: records.map((order) => changedIds.has(order.id) ? { ...order, previous_status: order.status, status: target } : order) };
  });
}
async function moveOrderFolders(folder, items2, actorId, source = pool) {
  if (!ORDER_DISPLAY_FOLDERS.includes(folder) || !Number.isInteger(actorId) || actorId <= 0) {
    throw new WorkspaceError("\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0646\u0642\u0644 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629.", "Invalid folder move.", 400);
  }
  const ids = idsFor(items2);
  return transaction(source, async (client) => {
    await lockOrders(client, ids);
    const { rows: rows2 } = await client.query("SELECT order_id,folder FROM order_display_folder_assignments WHERE order_id=ANY($1::int[])", [ids]);
    const folders = new Map(rows2.map((row) => [row.order_id, row.folder]));
    const changed = items2.filter((item) => {
      const current = folders.get(item.id) ?? "new";
      if (current === folder) return false;
      if (current !== item.expected_folder) throw new WorkspaceError(
        "\u0646\u064F\u0642\u0644 \u0623\u062D\u062F \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0628\u0648\u0627\u0633\u0637\u0629 \u0645\u0633\u062A\u062E\u062F\u0645 \u0622\u062E\u0631\u061B \u0644\u0645 \u064A\u064F\u0646\u0642\u0644 \u0623\u064A \u0637\u0644\u0628.",
        "Another user moved an order; no orders were moved."
      );
      return true;
    });
    if (changed.length) await client.query(
      `INSERT INTO order_display_folder_assignments(order_id,folder,updated_by,updated_at)
       SELECT id,$2,$3,now() FROM unnest($1::int[]) AS ids(id)
       ON CONFLICT(order_id) DO UPDATE SET folder=EXCLUDED.folder,updated_by=EXCLUDED.updated_by,updated_at=EXCLUDED.updated_at`,
      [changed.map((item) => item.id), folder, actorId]
    );
    return { moved: changed.length, folder };
  });
}
async function orderFolderCounts(source = pool) {
  const client = await source.connect();
  try {
    const { rows: rows2 } = await client.query(`SELECT COALESCE(f.folder,'new') folder,count(*)::int count
      FROM orders o LEFT JOIN order_display_folder_assignments f ON f.order_id=o.id GROUP BY COALESCE(f.folder,'new')`);
    const counts = Object.fromEntries(ORDER_DISPLAY_FOLDERS.map((folder) => [folder, 0]));
    for (const row of rows2) counts[row.folder] = row.count;
    return { counts, total: Object.values(counts).reduce((sum, count2) => sum + count2, 0) };
  } finally {
    client.release();
  }
}

// server/routes.ts
import { and as and4, asc as asc2, count, desc as desc3, eq as eq8, getTableColumns as getTableColumns2, ilike, inArray as inArray4, isNull as isNull3, or as or5, aliasedTable as aliasedTable3, sql as sql9 } from "drizzle-orm";
import bcrypt2 from "bcrypt";
import { z as z6 } from "zod";

// server/category-id.ts
function nextCategoryId(lastNumber, suffixWidth) {
  if (lastNumber !== null && !/^\d+$/.test(lastNumber)) {
    throw new Error("\u0622\u062E\u0631 \u0631\u0645\u0632 \u062A\u0635\u0646\u064A\u0641 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D");
  }
  const number = (BigInt(lastNumber ?? "0") + 1n).toString();
  const width = Math.max(2, suffixWidth ?? 2);
  if (Math.max(number.length, width) > 17) {
    throw new Error("\u062A\u0639\u0630\u0631 \u0625\u0646\u0634\u0627\u0621 \u0631\u0645\u0632 \u062A\u0635\u0646\u064A\u0641 \u062C\u062F\u064A\u062F: \u0628\u0644\u063A \u0627\u0644\u062A\u0633\u0644\u0633\u0644 \u0627\u0644\u062D\u062F \u0627\u0644\u0623\u0642\u0635\u0649");
  }
  return `CAT${number.padStart(width, "0")}`;
}

// server/item-id.ts
function nextItemId(lastNumber, suffixWidth) {
  if (lastNumber !== null && !/^\d+$/.test(lastNumber)) {
    throw new Error("\u0622\u062E\u0631 \u0631\u0645\u0632 \u0635\u0646\u0641 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D");
  }
  const number = (BigInt(lastNumber ?? "0") + 1n).toString();
  const width = Math.max(2, suffixWidth ?? 2);
  if (Math.max(number.length, width) > 17) {
    throw new Error("\u062A\u0639\u0630\u0631 \u0625\u0646\u0634\u0627\u0621 \u0631\u0645\u0632 \u0635\u0646\u0641 \u062C\u062F\u064A\u062F: \u0628\u0644\u063A \u0627\u0644\u062A\u0633\u0644\u0633\u0644 \u0627\u0644\u062D\u062F \u0627\u0644\u0623\u0642\u0635\u0649");
  }
  return `ITM${number.padStart(width, "0")}`;
}

// server/section-id.ts
function nextSectionId(number, suffixWidth = null) {
  if (number !== null && !/^\d+$/.test(number)) throw new Error("\u0622\u062E\u0631 \u0631\u0645\u0632 \u0642\u0633\u0645 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D");
  const next = (BigInt(number ?? "0") + 1n).toString();
  const width = Math.max(2, suffixWidth ?? 2);
  if (Math.max(next.length, width) > 17) throw new Error("\u062A\u0639\u0630\u0631 \u0625\u0646\u0634\u0627\u0621 \u0631\u0645\u0632 \u0642\u0633\u0645 \u062C\u062F\u064A\u062F: \u0628\u0644\u063A \u0627\u0644\u062A\u0633\u0644\u0633\u0644 \u0627\u0644\u062D\u062F \u0627\u0644\u0623\u0642\u0635\u0649");
  return `SEC${next.padStart(width, "0")}`;
}

// server/machine-id.ts
function nextMachineId(number) {
  if (number !== null && !/^\d+$/.test(number)) throw new Error("\u0622\u062E\u0631 \u0631\u0645\u0632 \u0645\u0627\u0643\u064A\u0646\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D");
  const next = BigInt(number ?? "0") + 1n;
  if (next > 999n) throw new Error("\u062A\u0639\u0630\u0631 \u0625\u0646\u0634\u0627\u0621 \u0645\u0627\u0643\u064A\u0646\u0629 \u062C\u062F\u064A\u062F\u0629: \u0628\u0644\u063A \u0627\u0644\u062A\u0633\u0644\u0633\u0644 \u0627\u0644\u062D\u062F \u0627\u0644\u0623\u0642\u0635\u0649 MAC999");
  return `MAC${next.toString().padStart(2, "0")}`;
}

// server/master-batch-id.ts
function nextMasterBatchColorId(number, suffixWidth = null) {
  if (number !== null && !/^\d+$/.test(number)) throw new Error("\u0622\u062E\u0631 \u0631\u0645\u0632 \u0644\u0648\u0646 \u062E\u0627\u0645\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D");
  const next = (BigInt(number ?? "0") + 1n).toString();
  const width = Math.max(2, suffixWidth ?? 2);
  if (Math.max(next.length, width) > 17) throw new Error("\u062A\u0639\u0630\u0631 \u0625\u0646\u0634\u0627\u0621 \u0631\u0645\u0632 \u0644\u0648\u0646 \u062E\u0627\u0645\u0629 \u062C\u062F\u064A\u062F: \u0628\u0644\u063A \u0627\u0644\u062A\u0633\u0644\u0633\u0644 \u0627\u0644\u062D\u062F \u0627\u0644\u0623\u0642\u0635\u0649");
  return `MB${next.padStart(width, "0")}`;
}

// server/admin-id-sequence.ts
import { sql as sql4 } from "drizzle-orm";
var ADMIN_ID_SEQUENCES = {
  sections: "admin_section_id_seq",
  categories: "admin_category_id_seq",
  items: "admin_item_id_seq",
  masterBatchColors: "admin_master_batch_color_id_seq",
  machines: "admin_machine_id_seq"
};
async function nextAdminIdNumber(tx, sequenceKey, observedMaximum) {
  const sequenceName = ADMIN_ID_SEQUENCES[sequenceKey];
  const sequence = sql4.raw(`'public.${sequenceName}'::regclass`);
  let result = await tx.execute(sql4`SELECT nextval(${sequence})::text AS value`);
  let value = BigInt(result.rows[0]?.value ?? "0");
  const maximum = BigInt(observedMaximum ?? "0");
  if (value <= maximum) {
    await tx.execute(sql4`SELECT setval(${sequence}, ${maximum.toString()}::bigint, true)`);
    result = await tx.execute(sql4`SELECT nextval(${sequence})::text AS value`);
    value = BigInt(result.rows[0]?.value ?? "0");
  }
  if (value <= maximum) throw new Error(`\u062A\u0639\u0630\u0631 \u062A\u062E\u0635\u064A\u0635 \u0631\u0642\u0645 \u062C\u062F\u064A\u062F \u0645\u0646 \u0627\u0644\u062A\u0633\u0644\u0633\u0644 ${sequenceName}`);
  return value.toString();
}

// server/customer-form.ts
import { and, eq as eq3, inArray as inArray2, or as or2, sql as sql5 } from "drizzle-orm";
import { z as z2 } from "zod";
var customerFormSchema = insertCustomerSchema.omit({ id: true }).extend({
  name: z2.string().trim().min(1, "\u0627\u0644\u0627\u0633\u0645 \u0628\u0627\u0644\u0625\u0646\u062C\u0644\u064A\u0632\u064A\u0629 \u0645\u0637\u0644\u0648\u0628").max(200),
  name_ar: z2.string().trim().max(200).nullable().optional(),
  sales_rep_id: z2.number().int().positive().nullable().optional()
}).strict();
var salesRepresentativeRoleCondition = or2(
  inArray2(
    sql5`lower(trim(regexp_replace(${roles.name}, '[_-]+', ' ', 'g')))`,
    ["sales representative", "sales rep"]
  ),
  inArray2(roles.name_ar, ["\u0645\u0646\u062F\u0648\u0628 \u0645\u0628\u064A\u0639\u0627\u062A", "\u0645\u0646\u062F\u0648\u0628"])
);
async function validateCustomerSalesRepresentative(tx, id2) {
  if (id2 == null) return;
  const [representative2] = await tx.select({ id: users.id }).from(users).innerJoin(roles, eq3(users.role_id, roles.id)).where(and(eq3(users.id, id2), salesRepresentativeRoleCondition)).for("share").limit(1);
  if (!representative2) {
    throw Object.assign(new Error("\u0627\u0644\u0645\u0646\u062F\u0648\u0628 \u0627\u0644\u0645\u062D\u062F\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0623\u0648 \u0644\u064A\u0633 \u0645\u0646\u062F\u0648\u0628 \u0645\u0628\u064A\u0639\u0627\u062A"), { status: 400 });
  }
}
function nextCustomerId(lastNumber, suffixWidth) {
  if (lastNumber !== null && !/^\d+$/.test(lastNumber)) {
    throw new Error("\u0622\u062E\u0631 \u0631\u0645\u0632 \u0639\u0645\u064A\u0644 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D");
  }
  const number = (BigInt(lastNumber ?? "0") + 1n).toString();
  const width = Math.max(3, suffixWidth ?? 3);
  if (Math.max(number.length, width) > 17) {
    throw new Error("\u062A\u0639\u0630\u0631 \u0625\u0646\u0634\u0627\u0621 \u0631\u0645\u0632 \u0639\u0645\u064A\u0644 \u062C\u062F\u064A\u062F: \u0628\u0644\u063A \u0627\u0644\u062A\u0633\u0644\u0633\u0644 \u0627\u0644\u062D\u062F \u0627\u0644\u0623\u0642\u0635\u0649");
  }
  return `CID${number.padStart(width, "0")}`;
}

// server/order-number.ts
import { sql as sql6 } from "drizzle-orm";
var MAX_ORDER_NUMBER_LENGTH = 45;
var ORDER_NUMBER_MAX_SQL = `
  SELECT MAX(sequence)::text AS max_number FROM order_number_allocations
`;
function nextOrderNumber(lastNumericOrderNumber) {
  if (lastNumericOrderNumber !== null && !/^\d+$/.test(lastNumericOrderNumber)) {
    throw new Error("\u0622\u062E\u0631 \u0631\u0642\u0645 \u0637\u0644\u0628 \u0631\u0642\u0645\u064A \u063A\u064A\u0631 \u0635\u0627\u0644\u062D");
  }
  const number = `O${(BigInt(lastNumericOrderNumber ?? "0") + 1n).toString().padStart(4, "0")}`;
  if (number.length > MAX_ORDER_NUMBER_LENGTH) {
    throw new Error("\u062A\u0639\u0630\u0631 \u0625\u0646\u0634\u0627\u0621 \u0631\u0642\u0645 \u0637\u0644\u0628 \u062C\u062F\u064A\u062F: \u0628\u0644\u063A \u0627\u0644\u062A\u0633\u0644\u0633\u0644 \u0627\u0644\u062D\u062F \u0627\u0644\u0623\u0642\u0635\u0649");
  }
  return number;
}
async function previewOrderNumber(tx) {
  const result = await tx.execute(sql6.raw(ORDER_NUMBER_MAX_SQL));
  let number = nextOrderNumber(result.rows[0]?.max_number ?? null);
  while ((await tx.execute(sql6`SELECT EXISTS(
    SELECT 1 FROM orders WHERE order_number=${number}
  ) AS used`)).rows[0]?.used) {
    number = nextOrderNumber(number.slice(1));
  }
  return number;
}
async function allocateOrderNumber(tx) {
  await tx.execute(sql6`SELECT pg_advisory_xact_lock(${29832}, ${1})`);
  const number = await previewOrderNumber(tx);
  await tx.execute(sql6`INSERT INTO order_number_allocations(sequence,order_number)
    VALUES(${number.slice(1)}::numeric,${number})`);
  return number;
}
function productionRollNumber(productionNumber, sequence, compact) {
  if (!Number.isSafeInteger(sequence) || sequence < 1) throw new Error("\u062A\u0633\u0644\u0633\u0644 \u0627\u0644\u0631\u0648\u0644 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D");
  const number = `${productionNumber}-R${String(sequence).padStart(compact ? 2 : 3, "0")}`;
  if (number.length > 100) throw new Error("\u062A\u0639\u0630\u0631 \u0625\u0646\u0634\u0627\u0621 \u0631\u0642\u0645 \u0631\u0648\u0644: \u0628\u0644\u063A \u0627\u0644\u062A\u0633\u0644\u0633\u0644 \u0627\u0644\u062D\u062F \u0627\u0644\u0623\u0642\u0635\u0649");
  return number;
}
var productionPrefix = (orderNumber) => `${orderNumber}-${/^O[0-9]+$/.test(orderNumber) ? "JO" : ""}`;
function productionOrderNumber(orderNumber, sequence) {
  if (!Number.isSafeInteger(sequence) || sequence < 1) throw new Error("\u062A\u0633\u0644\u0633\u0644 \u0623\u0645\u0631 \u0627\u0644\u0625\u0646\u062A\u0627\u062C \u063A\u064A\u0631 \u0635\u0627\u0644\u062D");
  const number = `${productionPrefix(orderNumber)}${String(sequence).padStart(2, "0")}`;
  if (number.length > 50) throw new Error("\u062A\u0639\u0630\u0631 \u0625\u0646\u0634\u0627\u0621 \u0631\u0642\u0645 \u0623\u0645\u0631 \u0625\u0646\u062A\u0627\u062C: \u0628\u0644\u063A \u0627\u0644\u062A\u0633\u0644\u0633\u0644 \u0627\u0644\u062D\u062F \u0627\u0644\u0623\u0642\u0635\u0649");
  return number;
}
function productionOrderSequence(orderNumber, number) {
  const prefix = productionPrefix(orderNumber);
  if (!number.startsWith(prefix)) return 0;
  const suffix = number.slice(prefix.length);
  if (!/^[0-9]+$/.test(suffix)) return 0;
  const sequence = Number(suffix);
  return Number.isSafeInteger(sequence) && sequence > 0 ? sequence : 0;
}

// server/order-delivery.ts
function orderDateInRiyadh(instant) {
  if (Number.isNaN(instant.getTime())) throw new Error("\u062A\u0627\u0631\u064A\u062E \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0637\u0644\u0628 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D");
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(instant);
  const value = (type) => parts.find((part) => part.type === type).value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}
function deliveryDateFromDays(orderDate, days) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(orderDate) || !Number.isInteger(days) || days < 1 || days > 3650) {
    throw new Error("\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0637\u0644\u0628 \u0623\u0648 \u0639\u062F\u062F \u0623\u064A\u0627\u0645 \u0627\u0644\u062A\u0633\u0644\u064A\u0645 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D");
  }
  const origin = /* @__PURE__ */ new Date(`${orderDate}T00:00:00Z`);
  if (Number.isNaN(origin.getTime()) || origin.toISOString().slice(0, 10) !== orderDate) {
    throw new Error("\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0637\u0644\u0628 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D");
  }
  origin.setUTCDate(origin.getUTCDate() + days);
  return origin.toISOString().slice(0, 10);
}

// server/order-details.ts
import { aliasedTable, eq as eq4, getTableColumns } from "drizzle-orm";

// shared/order-details.ts
function orderProductionTotals(rows2) {
  const hundredths = (value) => {
    if (!/^\d+(?:\.\d{1,2})?$/.test(value)) throw new Error("\u0643\u0645\u064A\u0629 \u0625\u0646\u062A\u0627\u062C \u0645\u062E\u0632\u0646\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629");
    const [whole, fraction = ""] = value.split(".");
    return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  };
  const decimal3 = (value) => `${value / 100n}.${String(value % 100n).padStart(2, "0")}`;
  const by_status = {};
  let requested = 0n;
  let planned = 0n;
  for (const row of rows2) {
    requested += hundredths(row.quantity_kg);
    planned += hundredths(row.final_quantity_kg);
    by_status[row.status] = (by_status[row.status] ?? 0) + 1;
  }
  return { requested_kg: decimal3(requested), planned_kg: decimal3(planned), production_order_count: rows2.length, by_status };
}

// server/order-details.ts
var creator = aliasedTable(users, "order_creator");
var representative = aliasedTable(users, "order_representative");
var personFields = (table) => ({
  id: table.id,
  display_name: table.display_name,
  display_name_ar: table.display_name_ar,
  full_name: table.full_name,
  username: table.username
});
async function getOrderDetails(id2) {
  const { share_token: _shareToken, ...orderFields } = getTableColumns(orders);
  return db.transaction(async (tx) => {
    const [header] = await tx.select({
      order: orderFields,
      customer: getTableColumns(customers),
      creator: personFields(creator),
      sales_representative: personFields(representative)
    }).from(orders).leftJoin(customers, eq4(orders.customer_id, customers.id)).leftJoin(creator, eq4(orders.created_by, creator.id)).leftJoin(representative, eq4(customers.sales_rep_id, representative.id)).where(eq4(orders.id, id2)).limit(1);
    if (!header) return null;
    const lines = await tx.select({
      production_order: getTableColumns(production_orders),
      product: getTableColumns(customer_products),
      category: getTableColumns(categories),
      item: getTableColumns(items),
      color: getTableColumns(master_batch_colors)
    }).from(production_orders).leftJoin(customer_products, eq4(production_orders.customer_product_id, customer_products.id)).leftJoin(categories, eq4(customer_products.category_id, categories.id)).leftJoin(items, eq4(customer_products.item_id, items.id)).leftJoin(master_batch_colors, eq4(customer_products.master_batch_id, master_batch_colors.id)).where(eq4(production_orders.order_id, id2)).orderBy(production_orders.id);
    const production = lines.map(({ production_order, product, category, item, color }) => ({
      ...production_order,
      product: product ? { ...product, category, item, color } : null
    }));
    return {
      ...header,
      production_orders: production,
      totals: orderProductionTotals(production),
      // Order details and its printout remain planned-only. Actual execution
      // belongs to the permission-scoped production module, never this total.
      actual_production: {
        available: false,
        message: "\u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0637\u0644\u0628 \u062A\u0639\u0631\u0636 \u0627\u0644\u0643\u0645\u064A\u0627\u062A \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629 \u0648\u0627\u0644\u0645\u062E\u0637\u0637\u0629 \u0641\u0642\u0637. \u0633\u062C\u0644\u0627\u062A \u0627\u0644\u062A\u0646\u0641\u064A\u0630 \u0627\u0644\u0641\u0639\u0644\u064A \u0645\u062A\u0627\u062D\u0629 \u0641\u064A \u0648\u062D\u062F\u0629 \u0627\u0644\u0625\u0646\u062A\u0627\u062C \u0628\u062D\u0633\u0628 \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0627\u062A."
      }
    };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
}

// server/public-order-print.ts
import { createHmac, timingSafeEqual } from "node:crypto";
import { Router } from "express";
var validId = (id2) => Number.isSafeInteger(id2) && id2 > 0 && id2 <= 2147483647;
function publicOrderPrintKey(id2, secret = process.env.SESSION_SECRET) {
  if (!validId(id2)) throw new Error("Invalid public print order ID");
  if (!secret) throw new Error("SESSION_SECRET is required for public print links");
  return createHmac("sha256", secret).update(`public-order-print:v1:${id2}`).digest("base64url");
}
function publicOrderPrintPath(id2, secret) {
  return `/shared/orders/${id2}/print?key=${publicOrderPrintKey(id2, secret)}`;
}
function validPublicOrderPrintKey(id2, key, secret) {
  if (!validId(id2) || typeof key !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(key)) return false;
  return timingSafeEqual(Buffer.from(key), Buffer.from(publicOrderPrintKey(id2, secret)));
}
var record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
var pick = (value, keys) => record(value) ? Object.fromEntries(keys.filter((key) => Object.hasOwn(value, key)).map((key) => [key, value[key]])) : null;
var personFields2 = ["display_name", "display_name_ar", "full_name", "username"];
function publicPrintProjection(source, path2) {
  if (!record(source) || !record(source.order) || !Array.isArray(source.production_orders))
    throw new Error("Invalid print source");
  return {
    public_print_path: path2,
    order: pick(source.order, ["id", "order_number", "status", "previous_status", "notes", "created_at", "delivery_date", "delivery_days"]),
    customer: pick(source.customer, ["name", "name_ar", "phone", "plate_drawer_code", "code"]),
    creator: pick(source.creator, personFields2),
    sales_representative: pick(source.sales_representative, personFields2),
    production_orders: source.production_orders.map((value) => {
      if (!record(value)) throw new Error("Invalid production print source");
      const product = value.product;
      return {
        ...pick(value, ["id", "quantity_kg", "final_quantity_kg"]),
        product: record(product) ? {
          ...pick(product, [
            "size_caption",
            "width",
            "left_facing",
            "right_facing",
            "cutting_length_cm",
            "universal_thickness",
            "raw_material",
            "printing_cylinder",
            "punching",
            "is_printed",
            "front_print_colors",
            "back_print_colors",
            "notes",
            "cliche_front_design",
            "cliche_back_design"
          ]),
          item: pick(product.item, ["name", "name_ar"]),
          color: pick(product.color, ["id", "name", "name_ar", "color_hex"])
        } : null
      };
    }),
    totals: pick(source.totals, ["planned_kg"]),
    actual_production: { available: false, ...pick(source.actual_production, ["message"]) }
  };
}
function createPublicOrderPrintRouter(loadOrder, secret) {
  const router4 = Router();
  router4.get("/public/orders/:id/print", async (req, res, next) => {
    res.set({
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet"
    });
    try {
      const id2 = Number(req.params.id);
      if (!/^[1-9]\d{0,9}$/.test(req.params.id) || !validPublicOrderPrintKey(id2, req.query.key, secret))
        return res.status(404).json({ message: "\u0627\u0644\u0637\u0644\u0628 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F", message_en: "Order not found." });
      const details = await loadOrder(id2);
      if (!details) return res.status(404).json({ message: "\u0627\u0644\u0637\u0644\u0628 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F", message_en: "Order not found." });
      return res.json(publicPrintProjection(details, publicOrderPrintPath(id2, secret)));
    } catch (error) {
      next(error);
    }
  });
  return router4;
}

// shared/customer-product-fields.ts
var PRINTING_CYLINDERS = [
  '8"',
  '10"',
  '12"',
  '14"',
  '16"',
  '18"',
  '20"',
  '22"',
  '24"',
  '26"',
  '28"',
  '30"',
  '32"',
  '34"',
  '36"',
  '39"',
  "\u0628\u062F\u0648\u0646 \u0637\u0628\u0627\u0639\u0629"
];
function isManualCuttingCategory(name) {
  const normalized = name.trim().toLocaleLowerCase();
  return normalized.includes("\u0633\u0641\u0631\u0629 \u0628\u0644\u0627\u0633\u062A\u064A\u0643\u064A\u0629") || normalized.includes("table cover");
}
function printingCylinderLength(value) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text3 = String(value).trim();
  if (!text3 || text3 === "\u0628\u062F\u0648\u0646 \u0637\u0628\u0627\u0639\u0629") return null;
  const match = text3.match(/^(\d+(?:\.\d+)?)\s*(?:"|in(?:ches?)?)?$/i);
  if (!match) return null;
  const inches = Number(match[1]);
  return Number.isFinite(inches) && inches > 0 ? Math.round(inches * 2.54) : null;
}
function isManualCuttingProduct(input, categoryName = "") {
  const cylinder = input.printing_cylinder;
  return !cylinder || String(cylinder).trim() === "" || String(cylinder).trim() === "\u0628\u062F\u0648\u0646 \u0637\u0628\u0627\u0639\u0629" || printingCylinderLength(cylinder) === null || isManualCuttingCategory(categoryName);
}
function positiveNumber(value) {
  if (value === null || value === void 0 || value === "") return null;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}
function nonnegativeNumber(value) {
  if (value === null || value === void 0 || value === "") return 0;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
}
function customerProductFacingNotice(input) {
  const left = nonnegativeNumber(input.left_facing);
  const right = nonnegativeNumber(input.right_facing);
  if (left === null || right === null) return null;
  const width = positiveNumber(input.width);
  if (width !== null && left + right >= width) {
    return { kind: "blocking", message: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u0627\u0644\u062D\u0641\u0638: \u0645\u062C\u0645\u0648\u0639 \u0627\u0644\u062C\u0627\u0646\u0628 \u0627\u0644\u0623\u064A\u0645\u0646 \u0648\u0627\u0644\u062C\u0627\u0646\u0628 \u0627\u0644\u0623\u064A\u0633\u0631 \u064A\u0633\u0627\u0648\u064A \u0627\u0644\u0639\u0631\u0636 \u0623\u0648 \u064A\u0632\u064A\u062F \u0639\u0644\u064A\u0647. \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0645\u062C\u0645\u0648\u0639 \u0627\u0644\u062C\u0627\u0646\u0628\u064A\u0646 \u0623\u0642\u0644 \u0645\u0646 \u0627\u0644\u0639\u0631\u0636." };
  }
  if (left !== right) {
    return { kind: "warning", message: "\u0627\u0644\u062C\u0627\u0646\u0628 \u0627\u0644\u0623\u064A\u0645\u0646 \u0644\u0627 \u064A\u0633\u0627\u0648\u064A \u0627\u0644\u062C\u0627\u0646\u0628 \u0627\u0644\u0623\u064A\u0633\u0631. \u0647\u0644 \u062A\u0631\u064A\u062F \u0627\u0644\u0627\u0633\u062A\u0645\u0631\u0627\u0631 \u0641\u064A \u0627\u0644\u062D\u0641\u0638 \u0628\u0647\u0630\u0647 \u0627\u0644\u0642\u064A\u0645\u061F" };
  }
  return null;
}
function deriveCustomerProductFields(input, categoryName, preserveCuttingLength = false) {
  const cylinder = input.printing_cylinder;
  const cylinderLength = printingCylinderLength(cylinder);
  const manualCutting = isManualCuttingProduct(input, categoryName);
  const is_printed = cylinderLength !== null;
  let cutting_length_cm;
  if (manualCutting || preserveCuttingLength) {
    const length = positiveNumber(input.cutting_length_cm);
    cutting_length_cm = length !== null && Number.isInteger(length) ? length : null;
  } else {
    cutting_length_cm = cylinderLength;
  }
  const width = positiveNumber(input.width);
  const leftValue = nonnegativeNumber(input.left_facing);
  const rightValue = nonnegativeNumber(input.right_facing);
  const left = leftValue ?? 0;
  const right = rightValue ?? 0;
  let size_caption = input.size_caption == null || input.size_caption === "" ? null : String(input.size_caption);
  if (width !== null && leftValue !== null && rightValue !== null && cutting_length_cm !== null && cutting_length_cm > 0) {
    const flatWidths = [input.width, left > 0 ? input.left_facing : null, right > 0 ? input.right_facing : null].filter((part) => part !== null && part !== void 0 && part !== "");
    size_caption = `${flatWidths.join("+")}X${cutting_length_cm}`;
  }
  const thickness = positiveNumber(input.thickness);
  const density = input.density === void 0 || input.density === null || input.density === "" ? 0.95 : positiveNumber(input.density);
  let bag_weight_grams = null;
  let bags_per_kilo = null;
  if (width !== null && leftValue !== null && rightValue !== null && thickness !== null && cutting_length_cm !== null && density !== null) {
    const universalMicrons = Math.ceil(
      (left > 0 && right > 0 ? thickness / 4 : thickness / 2) * 10
    );
    const rawGrams = (width + left + right) * cutting_length_cm * 2 * (universalMicrons * 1e-4) * density;
    if (Number.isFinite(rawGrams) && rawGrams > 0) {
      bag_weight_grams = String(Math.ceil(rawGrams));
      bags_per_kilo = String(Math.ceil(1e3 / rawGrams));
    }
  }
  const unitWeight = positiveNumber(input.unit_weight_kg);
  const unitQuantity = positiveNumber(input.unit_quantity);
  const package_weight_kg = unitWeight !== null && unitQuantity !== null ? (Math.round((unitWeight * unitQuantity + Number.EPSILON) * 100) / 100).toFixed(2) : null;
  return { size_caption, cutting_length_cm, bag_weight_grams, bags_per_kilo, package_weight_kg, is_printed };
}

// server/audit-rules.ts
function isAdministrator(permissions) {
  return Array.isArray(permissions) && permissions.includes("admin");
}
function canGrantPermissions(actorPermissions, grant) {
  if (isAdministrator(actorPermissions)) return true;
  if (!Array.isArray(actorPermissions) || !Array.isArray(grant)) return false;
  return grant.every(
    (permission2) => typeof permission2 === "string" && permission2 !== "admin" && permission2 !== "*" && (actorPermissions.includes("*") || actorPermissions.includes(permission2))
  );
}
function plannedFinalQuantity(quantityKg, overrunPercentage) {
  const planned = Number(quantityKg) * (1 + Number(overrunPercentage) / 100);
  return (Math.round((planned + Number.EPSILON) * 100) / 100).toFixed(2);
}
function isProtectedProductionOrder(status, batchNumber, previousStatus) {
  return status !== "pending" || previousStatus !== null && previousStatus !== void 0 && previousStatus !== "pending" || typeof batchNumber === "string" && batchNumber.trim().length > 0;
}

// server/category-production-plan.ts
import { eq as eq5 } from "drizzle-orm";
async function categoryProductionPlan(tx, productId, quantityKg) {
  let percentage = 0;
  if (productId != null) {
    const [product] = await tx.select({ category_id: customer_products.category_id }).from(customer_products).where(eq5(customer_products.id, productId)).limit(1);
    if (!product) throw Object.assign(new Error("\u0627\u0644\u0645\u0646\u062A\u062C \u0627\u0644\u0645\u062D\u062F\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F"), { status: 400 });
    if (product.category_id != null) {
      const [category] = await tx.select({ overrun_percentage: categories.overrun_percentage }).from(categories).where(eq5(categories.id, product.category_id)).limit(1);
      if (!category) throw Object.assign(new Error("\u062A\u0635\u0646\u064A\u0641 \u0627\u0644\u0645\u0646\u062A\u062C \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F"), { status: 400 });
      percentage = insertCategorySchema.shape.overrun_percentage.unwrap().parse(category.overrun_percentage);
    }
  }
  const finalQuantity = plannedFinalQuantity(quantityKg, String(percentage));
  if (!/^\d{1,8}\.\d{2}$/.test(finalQuantity) || Number(finalQuantity) <= 0) {
    throw Object.assign(new Error("\u0627\u0644\u0643\u0645\u064A\u0629 \u0627\u0644\u0646\u0647\u0627\u0626\u064A\u0629 \u062A\u062A\u062C\u0627\u0648\u0632 \u0627\u0644\u062D\u062F \u0627\u0644\u0645\u0633\u0645\u0648\u062D"), { status: 400 });
  }
  return {
    overrun_percentage: String(percentage),
    final_quantity_kg: finalQuantity
  };
}

// server/hr.ts
import { and as and2, desc, eq as eq6, gt, gte, inArray as inArray3, isNull, lt, lte, or as or3, sql as sql7 } from "drizzle-orm";
import { Router as Router2 } from "express";
import { z as z3 } from "zod";

// server/hr-report.ts
var RIYADH_OFFSET = 3 * 60 * 60 * 1e3;
function riyadhDayKey(value) {
  return new Date(value.getTime() + RIYADH_OFFSET).toISOString().slice(0, 10);
}
function monthRange(month) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  if (!match) throw Object.assign(new Error("\u0635\u064A\u063A\u0629 \u0627\u0644\u0634\u0647\u0631 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629"), { status: 400 });
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const start2 = new Date(Date.UTC(year, monthIndex, 1) - RIYADH_OFFSET);
  const end = new Date(Date.UTC(year, monthIndex + 1, 1) - RIYADH_OFFSET);
  return { start: start2, end };
}
function dayRange(day) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.exec(day);
  if (!match) throw Object.assign(new Error("\u0635\u064A\u063A\u0629 \u0627\u0644\u064A\u0648\u0645 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629"), { status: 400 });
  const start2 = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) - RIYADH_OFFSET);
  if (riyadhDayKey(start2) !== day) throw Object.assign(new Error("\u0627\u0644\u064A\u0648\u0645 \u0627\u0644\u0645\u062D\u062F\u062F \u063A\u064A\u0631 \u0635\u0627\u0644\u062D"), { status: 400 });
  return { start: start2, end: new Date(start2.getTime() + 864e5) };
}
function shiftMinutes(assignment) {
  const [startHour, startMinute] = assignment.startTime.split(":").map(Number);
  const [endHour, endMinute] = assignment.endTime.split(":").map(Number);
  let minutes = endHour * 60 + endMinute - startHour * 60 - startMinute;
  if (minutes <= 0) minutes += 1440;
  return Math.max(0, minutes - assignment.breakMinutes);
}
function workingDay(day) {
  const weekday = (/* @__PURE__ */ new Date(`${day}T12:00:00+03:00`)).getUTCDay();
  return weekday !== 5 && weekday !== 6;
}
function dateKeys(start2, end, cutoff) {
  const keys = [];
  for (let cursor = new Date(start2); cursor < end && cursor < cutoff; cursor = new Date(cursor.getTime() + 864e5)) {
    keys.push(riyadhDayKey(cursor));
  }
  return keys;
}
function summarizeAttendance(userId2, events, assignments, range, now = /* @__PURE__ */ new Date(), sessions2 = []) {
  const userEvents = events.filter((event) => event.userId === userId2 && event.sessionId == null).sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime() || a.id - b.id);
  const userAssignments = assignments.filter((assignment) => assignment.userId === userId2);
  const inMonth = (day) => {
    const { start: start2, end } = range;
    return day >= riyadhDayKey(start2) && day < riyadhDayKey(end);
  };
  const perDay = /* @__PURE__ */ new Map();
  const presentDays = /* @__PURE__ */ new Set();
  const workedDays = /* @__PURE__ */ new Set();
  const userSessions = sessions2.filter((session2) => session2.userId === userId2 && inMonth(session2.shiftDate));
  const sessionIds = new Set(userSessions.map((session2) => session2.id));
  const sessionEvents = events.filter(
    (event) => event.userId === userId2 && event.sessionId != null && sessionIds.has(event.sessionId)
  );
  for (const session2 of userSessions) {
    presentDays.add(session2.shiftDate);
    const row = perDay.get(session2.shiftDate) ?? { worked: 0, expected: 0 };
    row.expected += Math.max(0, session2.expectedMinutes);
    perDay.set(session2.shiftDate, row);
    if (!session2.checkOutAt) continue;
    const matchingEvents = sessionEvents.filter((event) => event.sessionId === session2.id).sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime() || a.id - b.id);
    let workingSince2 = null;
    let sessionWorked = 0;
    const closeSessionInterval = (at) => {
      if (!workingSince2) return;
      const start2 = Math.max(workingSince2.getTime(), session2.checkInAt.getTime());
      const end = Math.min(at.getTime(), session2.checkOutAt.getTime());
      if (end > start2) sessionWorked += Math.round((end - start2) / 6e4);
      workingSince2 = null;
    };
    for (const event of matchingEvents) {
      if (event.occurredAt < session2.checkInAt || event.occurredAt > session2.checkOutAt) continue;
      if (event.action === "check_in") {
        closeSessionInterval(event.occurredAt);
        workingSince2 = event.occurredAt;
      } else if (event.action === "break_start" || event.action === "check_out") {
        closeSessionInterval(event.occurredAt);
      } else if (event.action === "break_end" && !workingSince2) {
        workingSince2 = event.occurredAt;
      }
      if (event.action === "check_out") break;
    }
    if (workingSince2) closeSessionInterval(session2.checkOutAt);
    if (sessionWorked > 0) {
      row.worked += sessionWorked;
      workedDays.add(session2.shiftDate);
    }
  }
  const incompleteDaysSet = new Set(userSessions.filter((session2) => !session2.checkOutAt).map((session2) => session2.shiftDate));
  let workingSince = null;
  let activeDay = "";
  let activeAssignment;
  let legacyWorked = 0;
  const legacyIncomplete = /* @__PURE__ */ new Set();
  const closeInterval = (at) => {
    if (!workingSince || !activeDay) return;
    const safeEnd = Math.min(at.getTime(), workingSince.getTime() + 24 * 60 * 60 * 1e3, now.getTime());
    legacyWorked += Math.round(Math.max(0, safeEnd - workingSince.getTime()) / 6e4);
    workingSince = null;
  };
  for (const event of userEvents) {
    if (event.action === "check_in") {
      if (activeDay && inMonth(activeDay)) legacyIncomplete.add(activeDay);
      activeDay = riyadhDayKey(event.occurredAt);
      activeAssignment = userAssignments.find((assignment) => assignment.id === event.assignmentId) ?? userAssignments.find((assignment) => assignment.assignedAt <= event.occurredAt && (!assignment.unassignedAt || assignment.unassignedAt > event.occurredAt));
      legacyWorked = 0;
      if (inMonth(activeDay)) presentDays.add(activeDay);
      workingSince = event.occurredAt;
    } else if (event.action === "break_start" || event.action === "check_out") {
      closeInterval(event.occurredAt);
      if (event.action === "check_out" && activeDay) {
        if (inMonth(activeDay) && legacyWorked > 0) {
          const row = perDay.get(activeDay) ?? { worked: 0, expected: activeAssignment ? shiftMinutes(activeAssignment) : 0 };
          row.worked += legacyWorked;
          perDay.set(activeDay, row);
          workedDays.add(activeDay);
        }
        activeDay = "";
        legacyWorked = 0;
      }
    } else if (event.action === "break_end" && activeDay) {
      workingSince = event.occurredAt;
    }
  }
  if (activeDay && inMonth(activeDay)) legacyIncomplete.add(activeDay);
  const cutoff = now < range.end ? now : range.end;
  let absentDays = 0;
  for (const day of dateKeys(range.start, range.end, cutoff)) {
    if (!workingDay(day) || presentDays.has(day)) continue;
    const localMidnight = (/* @__PURE__ */ new Date(`${day}T00:00:00+03:00`)).getTime();
    if (userAssignments.some((assignment) => {
      const [startHour, startMinute] = assignment.startTime.split(":").map(Number);
      const [endHour, endMinute] = assignment.endTime.split(":").map(Number);
      if (![startHour, startMinute, endHour, endMinute].every(Number.isFinite)) return false;
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;
      const shiftStart = localMidnight + startMinutes * 6e4;
      const shiftEnd = localMidnight + (endMinutes + (endMinutes <= startMinutes ? 1440 : 0)) * 6e4;
      return assignment.assignedAt.getTime() <= shiftStart && (!assignment.unassignedAt || assignment.unassignedAt.getTime() > shiftStart) && now.getTime() > shiftEnd + (assignment.lateCheckoutMinutes ?? 0) * 6e4;
    })) absentDays += 1;
  }
  let workedMinutes = 0;
  let overtimeMinutes = 0;
  for (const row of perDay.values()) {
    workedMinutes += row.worked;
    if (row.expected > 0) overtimeMinutes += Math.max(0, row.worked - row.expected);
  }
  return { workedMinutes, daysWorked: workedDays.size, absentDays, overtimeMinutes, incompleteDays: (/* @__PURE__ */ new Set([...incompleteDaysSet, ...legacyIncomplete])).size };
}

// server/hr.ts
var router = Router2();
var hrAdmin = requireAnyPermission("manage_hr", "manage_attendance", "admin");
var timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
var shiftFields = z3.object({
  id: z3.string().trim().min(1).max(80),
  name_ar: z3.string().trim().min(1).max(120),
  name_en: z3.string().trim().max(120).nullable().optional(),
  start_time: z3.string().regex(timePattern, "\u0648\u0642\u062A \u0628\u062F\u0627\u064A\u0629 \u0627\u0644\u0648\u0631\u062F\u064A\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D"),
  end_time: z3.string().regex(timePattern, "\u0648\u0642\u062A \u0646\u0647\u0627\u064A\u0629 \u0627\u0644\u0648\u0631\u062F\u064A\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D"),
  next_day_checkin_time: z3.string().regex(timePattern, "\u0648\u0642\u062A \u062F\u062E\u0648\u0644 \u0627\u0644\u064A\u0648\u0645 \u0627\u0644\u062A\u0627\u0644\u064A \u063A\u064A\u0631 \u0635\u0627\u0644\u062D").default("06:00"),
  early_checkin_minutes: z3.number().int().min(0).max(240).default(15),
  late_checkout_minutes: z3.number().int().min(0).max(240).default(15),
  break_minutes: z3.number().int().min(0).max(240).default(30),
  geofence_enabled: z3.boolean().default(true),
  geofence_center_lat: z3.number().finite().min(-90).max(90).nullable().optional(),
  geofence_center_lng: z3.number().finite().min(-180).max(180).nullable().optional(),
  geofence_radius_meters: z3.number().int().min(20).max(5e3).default(200),
  is_active: z3.boolean().default(true)
}).strict();
var validateGeofence = (value, context) => {
  if (value.start_time === value.end_time) {
    context.addIssue({ code: z3.ZodIssueCode.custom, path: ["end_time"], message: "\u064A\u062C\u0628 \u0623\u0646 \u064A\u062E\u062A\u0644\u0641 \u0648\u0642\u062A \u0646\u0647\u0627\u064A\u0629 \u0627\u0644\u0648\u0631\u062F\u064A\u0629 \u0639\u0646 \u0648\u0642\u062A \u0628\u062F\u0627\u064A\u062A\u0647\u0627" });
  }
  if (value.geofence_center_lat == null !== (value.geofence_center_lng == null)) {
    context.addIssue({ code: z3.ZodIssueCode.custom, path: ["geofence_center_lng"], message: "\u064A\u062C\u0628 \u062A\u062D\u062F\u064A\u062F \u0625\u062D\u062F\u0627\u062B\u064A\u064A \u0645\u0631\u0643\u0632 \u0627\u0644\u0646\u0637\u0627\u0642 \u0627\u0644\u062C\u063A\u0631\u0627\u0641\u064A \u0645\u0639\u064B\u0627" });
  }
  if (value.geofence_enabled && (value.geofence_center_lat == null || value.geofence_center_lng == null)) {
    context.addIssue({ code: z3.ZodIssueCode.custom, path: ["geofence_center_lat"], message: "\u062D\u062F\u062F \u0645\u0631\u0643\u0632 \u0627\u0644\u0646\u0637\u0627\u0642 \u0627\u0644\u062C\u063A\u0631\u0627\u0641\u064A \u0644\u0644\u0648\u0631\u062F\u064A\u0629" });
  }
};
var shiftInput = shiftFields.superRefine(validateGeofence);
var shiftUpdateInput = shiftFields.omit({ id: true }).superRefine(validateGeofence);
var assignmentsInput = z3.object({
  user_ids: z3.array(z3.number().int().positive()).min(1).max(500),
  shift_id: z3.string().trim().min(1).max(80).nullable()
}).strict();
var attendanceAction = z3.enum(["check_in", "break_start", "break_end", "check_out"]);
var attendanceEventInput = z3.object({
  user_id: z3.number().int().positive(),
  action: attendanceAction,
  occurred_at: z3.string().datetime()
}).strict();
var checkoutInput = z3.object({ occurred_at: z3.string().datetime(), break_end_at: z3.string().datetime().optional() }).strict();
var violationInput = z3.object({
  user_id: z3.number().int().positive(),
  title: z3.string().trim().min(1).max(200),
  details: z3.string().trim().min(1).max(5e3)
}).strict();
function positiveId(value, label) {
  if (value == null || value === "") return null;
  const parsed2 = Number(value);
  if (!Number.isSafeInteger(parsed2) || parsed2 < 1) throw Object.assign(new Error(`${label} \u063A\u064A\u0631 \u0635\u0627\u0644\u062D`), { status: 400 });
  return parsed2;
}
function textFilter(value, max = 80) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function handle(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
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
      section_name: sql7`COALESCE(${sections.name_ar}, ${sections.name})`,
      assignment_id: user_shift_assignments.id,
      shift_id: user_shift_assignments.shift_id,
      assigned_at: user_shift_assignments.assigned_at
    }).from(users).leftJoin(sections, eq6(users.section_id, sections.id)).leftJoin(user_shift_assignments, and2(
      eq6(user_shift_assignments.user_id, users.id),
      isNull(user_shift_assignments.unassigned_at)
    )).where(and2(eq6(users.status, "active"), eq6(users.include_in_attendance, true))).orderBy(users.display_name_ar, users.display_name, users.username),
    db.select({
      id: user_shift_assignments.id,
      user_id: user_shift_assignments.user_id,
      shift_id: user_shift_assignments.shift_id,
      assigned_at: user_shift_assignments.assigned_at,
      unassigned_at: user_shift_assignments.unassigned_at,
      assigned_by: user_shift_assignments.assigned_by
    }).from(user_shift_assignments).orderBy(desc(user_shift_assignments.assigned_at), desc(user_shift_assignments.id)).limit(300)
  ]);
  const counts = /* @__PURE__ */ new Map();
  employeeRows.forEach((employee) => {
    if (employee.shift_id) counts.set(employee.shift_id, (counts.get(employee.shift_id) ?? 0) + 1);
  });
  res.json({
    shifts: shifts.map((shift) => ({
      ...shift,
      geofence_center_lat: shift.geofence_center_lat == null ? null : Number(shift.geofence_center_lat),
      geofence_center_lng: shift.geofence_center_lng == null ? null : Number(shift.geofence_center_lng),
      assigned_users: counts.get(shift.id) ?? 0
    })),
    users: employeeRows,
    history
  });
}));
router.get("/attendance-events", handle(async (req, res) => {
  const day = textFilter(req.query.day, 10) || new Date(Date.now() + 3 * 60 * 60 * 1e3).toISOString().slice(0, 10);
  const { start: start2, end } = dayRange(day);
  const userId2 = positiveId(req.query.user_id, "\u0627\u0644\u0645\u0648\u0638\u0641");
  const sectionId = textFilter(req.query.section_id, 20);
  const conditions = [or3(
    and2(isNull(attendance_events.session_id), gte(attendance_events.occurred_at, start2), lt(attendance_events.occurred_at, end)),
    eq6(attendance_sessions.shift_date, day)
  )];
  if (userId2) conditions.push(eq6(attendance_events.user_id, userId2));
  if (sectionId) conditions.push(eq6(users.section_id, sectionId));
  const rows2 = await db.select({
    id: attendance_events.id,
    user_id: attendance_events.user_id,
    username: users.username,
    display_name: users.display_name,
    display_name_ar: users.display_name_ar,
    section_id: users.section_id,
    section_name: sql7`COALESCE(${sections.name_ar}, ${sections.name})`,
    action: attendance_events.action,
    occurred_at: attendance_events.occurred_at,
    shift_date: attendance_sessions.shift_date,
    session_id: attendance_events.session_id,
    source: attendance_events.source,
    created_by: attendance_events.created_by,
    updated_by: attendance_events.updated_by,
    updated_at: attendance_events.updated_at
  }).from(attendance_events).innerJoin(users, eq6(attendance_events.user_id, users.id)).leftJoin(sections, eq6(users.section_id, sections.id)).leftJoin(attendance_sessions, eq6(attendance_events.session_id, attendance_sessions.id)).where(and2(...conditions)).orderBy(desc(attendance_events.occurred_at), desc(attendance_events.id));
  res.json(rows2);
}));
router.post("/attendance-events", handle(async (req, res) => {
  const input = attendanceEventInput.parse(req.body);
  if (input.action !== "break_end") {
    return res.status(409).json({ message: "\u064A\u064F\u0633\u0645\u062D \u064A\u062F\u0648\u064A\u064B\u0627 \u0628\u0625\u0636\u0627\u0641\u0629 \u0646\u0647\u0627\u064A\u0629 \u0627\u0644\u0627\u0633\u062A\u0631\u0627\u062D\u0629 \u0641\u0642\u0637 \u0644\u062C\u0644\u0633\u0629 \u0645\u0641\u062A\u0648\u062D\u0629. \u0627\u0633\u062A\u062E\u062F\u0645 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0627\u0646\u0635\u0631\u0627\u0641 \u0627\u0644\u0645\u062E\u0635\u0635 \u0644\u0625\u063A\u0644\u0627\u0642 \u0627\u0644\u062C\u0644\u0633\u0629." });
  }
  const occurredAt = new Date(input.occurred_at);
  const result = await db.transaction(async (tx) => {
    await tx.execute(sql7`SELECT pg_advisory_xact_lock(${18497}, ${input.user_id})`);
    const sessions2 = await tx.select({
      id: attendance_sessions.id,
      userId: attendance_sessions.user_id,
      assignmentId: attendance_sessions.shift_assignment_id,
      checkInAt: attendance_sessions.check_in_at,
      shiftStartAt: attendance_sessions.shift_start_at
    }).from(attendance_sessions).where(and2(
      eq6(attendance_sessions.user_id, input.user_id),
      isNull(attendance_sessions.check_out_at),
      lte(attendance_sessions.check_in_at, occurredAt)
    )).orderBy(desc(attendance_sessions.shift_start_at)).limit(1);
    const session2 = sessions2[0];
    if (!session2) return { error: { status: 409, message: "\u0644\u0627 \u062A\u0648\u062C\u062F \u062C\u0644\u0633\u0629 \u062D\u0636\u0648\u0631 \u063A\u064A\u0631 \u0645\u0643\u062A\u0645\u0644\u0629 \u0644\u0647\u0630\u0627 \u0627\u0644\u0645\u0648\u0638\u0641 \u0648\u0627\u0644\u0648\u0642\u062A \u0627\u0644\u0645\u062D\u062F\u062F" } };
    if (occurredAt.getTime() > session2.shiftStartAt.getTime() + 24 * 60 * 60 * 1e3) {
      return { error: { status: 409, message: "\u062A\u062C\u0627\u0648\u0632\u062A \u0627\u0644\u062C\u0644\u0633\u0629 \u0645\u0647\u0644\u0629 \u0627\u0644\u062A\u0635\u062D\u064A\u062D \u0627\u0644\u0628\u0627\u0644\u063A\u0629 24 \u0633\u0627\u0639\u0629 \u0645\u0646 \u0628\u062F\u0627\u064A\u0629 \u0627\u0644\u0648\u0631\u062F\u064A\u0629" } };
    }
    if (occurredAt > /* @__PURE__ */ new Date()) {
      return { error: { status: 409, message: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062A\u0633\u062C\u064A\u0644 \u0646\u0647\u0627\u064A\u0629 \u0627\u0644\u0627\u0633\u062A\u0631\u0627\u062D\u0629 \u0628\u062A\u0627\u0631\u064A\u062E \u0645\u0633\u062A\u0642\u0628\u0644\u064A" } };
    }
    const latestRows = await tx.select({
      action: attendance_events.action,
      occurredAt: attendance_events.occurred_at
    }).from(attendance_events).where(eq6(attendance_events.session_id, session2.id)).orderBy(desc(attendance_events.id)).limit(1);
    const latest = latestRows[0];
    if (!latest || latest.action !== "break_start") {
      return { error: { status: 409, message: "\u064A\u0645\u0643\u0646 \u062A\u0633\u062C\u064A\u0644 \u0646\u0647\u0627\u064A\u0629 \u0627\u0644\u0627\u0633\u062A\u0631\u0627\u062D\u0629 \u064A\u062F\u0648\u064A\u064B\u0627 \u0641\u0642\u0637 \u0639\u0646\u062F \u0648\u062C\u0648\u062F \u0627\u0633\u062A\u0631\u0627\u062D\u0629 \u0645\u0641\u062A\u0648\u062D\u0629" } };
    }
    if (occurredAt <= latest.occurredAt) {
      return { error: { status: 409, message: "\u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0648\u0642\u062A \u0646\u0647\u0627\u064A\u0629 \u0627\u0644\u0627\u0633\u062A\u0631\u0627\u062D\u0629 \u0628\u0639\u062F \u0622\u062E\u0631 \u0625\u062C\u0631\u0627\u0621 \u0641\u064A \u0627\u0644\u062C\u0644\u0633\u0629" } };
    }
    const nextSession = await tx.select({ checkInAt: attendance_sessions.check_in_at }).from(attendance_sessions).where(and2(
      eq6(attendance_sessions.user_id, session2.userId),
      gt(attendance_sessions.shift_start_at, session2.shiftStartAt)
    )).orderBy(attendance_sessions.shift_start_at).limit(1);
    if (nextSession[0] && occurredAt >= nextSession[0].checkInAt) {
      return { error: { status: 409, message: "\u0648\u0642\u062A \u0646\u0647\u0627\u064A\u0629 \u0627\u0644\u0627\u0633\u062A\u0631\u0627\u062D\u0629 \u064A\u062A\u062F\u0627\u062E\u0644 \u0645\u0639 \u0648\u0631\u062F\u064A\u0629 \u0644\u0627\u062D\u0642\u0629" } };
    }
    const [event] = await tx.insert(attendance_events).values({
      user_id: session2.userId,
      shift_assignment_id: session2.assignmentId,
      session_id: session2.id,
      action: "break_end",
      occurred_at: occurredAt,
      latitude: "0",
      longitude: "0",
      accuracy: "0",
      source: "manual",
      created_by: req.user.id,
      updated_by: req.user.id
    }).returning();
    return { event };
  });
  if (result.error) return res.status(result.error.status).json({ message: result.error.message });
  res.status(201).json(result.event);
}));
router.put("/attendance-events/:id", handle(async (req, res) => {
  const id2 = positiveId(req.params.id, "\u0627\u0644\u0633\u062C\u0644");
  const input = attendanceEventInput.parse(req.body);
  const occurredAt = new Date(input.occurred_at);
  const existing = await db.select({ id: attendance_events.id, sessionId: attendance_events.session_id }).from(attendance_events).where(eq6(attendance_events.id, id2)).limit(1);
  if (!existing[0]) return res.status(404).json({ message: "\u0633\u062C\u0644 \u0627\u0644\u062D\u0636\u0648\u0631 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  if (existing[0].sessionId != null) {
    return res.status(409).json({ message: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062A\u0639\u062F\u064A\u0644 \u0625\u062C\u0631\u0627\u0621 \u0645\u0631\u062A\u0628\u0637 \u0628\u062C\u0644\u0633\u0629 \u062D\u0636\u0648\u0631\u061B \u0627\u0633\u062A\u062E\u062F\u0645 \u0645\u0633\u0627\u0631 \u062A\u0635\u062D\u064A\u062D \u0627\u0644\u062C\u0644\u0633\u0629 \u0627\u0644\u0645\u062E\u0635\u0635" });
  }
  const employee = await db.select({ id: users.id }).from(users).where(eq6(users.id, input.user_id)).limit(1);
  if (!employee[0]) return res.status(404).json({ message: "\u0627\u0644\u0645\u0648\u0638\u0641 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  const assignment = await db.select({ id: user_shift_assignments.id }).from(user_shift_assignments).where(and2(
    eq6(user_shift_assignments.user_id, input.user_id),
    lte(user_shift_assignments.assigned_at, occurredAt),
    or3(isNull(user_shift_assignments.unassigned_at), gt(user_shift_assignments.unassigned_at, occurredAt))
  )).orderBy(desc(user_shift_assignments.assigned_at)).limit(1);
  const [updated] = await db.update(attendance_events).set({
    user_id: input.user_id,
    shift_assignment_id: assignment[0]?.id ?? null,
    action: input.action,
    occurred_at: occurredAt,
    updated_by: req.user.id,
    updated_at: /* @__PURE__ */ new Date()
  }).where(eq6(attendance_events.id, id2)).returning();
  if (!updated) return res.status(404).json({ message: "\u0633\u062C\u0644 \u0627\u0644\u062D\u0636\u0648\u0631 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  res.json(updated);
}));
router.delete("/attendance-events/:id", handle(async (req, res) => {
  const id2 = positiveId(req.params.id, "\u0627\u0644\u0633\u062C\u0644");
  const existing = await db.select({ id: attendance_events.id, sessionId: attendance_events.session_id }).from(attendance_events).where(eq6(attendance_events.id, id2)).limit(1);
  if (!existing[0]) return res.status(404).json({ message: "\u0633\u062C\u0644 \u0627\u0644\u062D\u0636\u0648\u0631 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  if (existing[0].sessionId != null) {
    return res.status(409).json({ message: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0625\u062C\u0631\u0627\u0621 \u0645\u0631\u062A\u0628\u0637 \u0628\u062C\u0644\u0633\u0629 \u062D\u0636\u0648\u0631" });
  }
  const [removed] = await db.delete(attendance_events).where(eq6(attendance_events.id, id2)).returning({ id: attendance_events.id });
  if (!removed) return res.status(404).json({ message: "\u0633\u062C\u0644 \u0627\u0644\u062D\u0636\u0648\u0631 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  res.json({ success: true, id: removed.id });
}));
router.get("/attendance-sessions/open", handle(async (req, res) => {
  const userId2 = positiveId(req.query.user_id, "\u0627\u0644\u0645\u0648\u0638\u0641");
  const sectionId = textFilter(req.query.section_id, 20);
  const conditions = [isNull(attendance_sessions.check_out_at), lt(attendance_sessions.window_end_at, /* @__PURE__ */ new Date())];
  if (userId2) conditions.push(eq6(attendance_sessions.user_id, userId2));
  if (sectionId) conditions.push(eq6(users.section_id, sectionId));
  const rows2 = await db.select({
    id: attendance_sessions.id,
    user_id: attendance_sessions.user_id,
    shift_date: attendance_sessions.shift_date,
    shift_id: attendance_sessions.shift_id,
    check_in_at: attendance_sessions.check_in_at,
    shift_end_at: attendance_sessions.shift_end_at,
    username: users.username,
    display_name: users.display_name,
    display_name_ar: users.display_name_ar
  }).from(attendance_sessions).innerJoin(users, eq6(attendance_sessions.user_id, users.id)).where(and2(...conditions)).orderBy(desc(attendance_sessions.shift_start_at)).limit(100);
  const actions = rows2.length ? await db.select({
    sessionId: attendance_events.session_id,
    action: attendance_events.action
  }).from(attendance_events).where(inArray3(attendance_events.session_id, rows2.map((row) => row.id))).orderBy(desc(attendance_events.id)) : [];
  const latest = /* @__PURE__ */ new Map();
  for (const event of actions) {
    if (event.sessionId != null && !latest.has(event.sessionId)) latest.set(event.sessionId, event.action);
  }
  res.json(rows2.map((row) => ({ ...row, last_action: latest.get(row.id) ?? null })));
}));
router.post("/attendance-sessions/:id/checkout", handle(async (req, res) => {
  const id2 = positiveId(req.params.id, "\u0627\u0644\u062C\u0644\u0633\u0629");
  const input = checkoutInput.parse(req.body);
  const occurredAt = new Date(input.occurred_at);
  const breakEndAt = input.break_end_at ? new Date(input.break_end_at) : null;
  const created = await db.transaction(async (tx) => {
    const sessionLookup = await tx.select({
      id: attendance_sessions.id,
      userId: attendance_sessions.user_id,
      assignmentId: attendance_sessions.shift_assignment_id,
      checkInAt: attendance_sessions.check_in_at,
      checkOutAt: attendance_sessions.check_out_at,
      shiftStartAt: attendance_sessions.shift_start_at
    }).from(attendance_sessions).where(eq6(attendance_sessions.id, id2)).limit(1);
    const session2 = sessionLookup[0];
    if (!session2) return { error: { status: 404, message: "\u062C\u0644\u0633\u0629 \u0627\u0644\u062D\u0636\u0648\u0631 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" } };
    await tx.execute(sql7`SELECT pg_advisory_xact_lock(${18497}, ${session2.userId})`);
    const locked = await tx.select({
      id: attendance_sessions.id,
      userId: attendance_sessions.user_id,
      assignmentId: attendance_sessions.shift_assignment_id,
      checkInAt: attendance_sessions.check_in_at,
      checkOutAt: attendance_sessions.check_out_at,
      shiftStartAt: attendance_sessions.shift_start_at
    }).from(attendance_sessions).where(eq6(attendance_sessions.id, id2)).limit(1);
    const current = locked[0];
    if (!current) return { error: { status: 404, message: "\u062C\u0644\u0633\u0629 \u0627\u0644\u062D\u0636\u0648\u0631 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" } };
    if (current.checkOutAt) return { error: { status: 409, message: "\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0627\u0646\u0635\u0631\u0627\u0641 \u0644\u0647\u0630\u0647 \u0627\u0644\u062C\u0644\u0633\u0629 \u0645\u0633\u0628\u0642\u064B\u0627" } };
    if (occurredAt > /* @__PURE__ */ new Date()) return { error: { status: 409, message: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062A\u0633\u062C\u064A\u0644 \u0627\u0646\u0635\u0631\u0627\u0641 \u0628\u062A\u0627\u0631\u064A\u062E \u0645\u0633\u062A\u0642\u0628\u0644\u064A" } };
    if (occurredAt <= current.checkInAt) return { error: { status: 409, message: "\u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0648\u0642\u062A \u0627\u0644\u0627\u0646\u0635\u0631\u0627\u0641 \u0628\u0639\u062F \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062D\u0636\u0648\u0631" } };
    if (occurredAt.getTime() > current.shiftStartAt.getTime() + 24 * 60 * 60 * 1e3) {
      return { error: { status: 409, message: "\u062A\u062C\u0627\u0648\u0632\u062A \u0627\u0644\u062C\u0644\u0633\u0629 \u0645\u0647\u0644\u0629 \u0627\u0644\u062A\u0635\u062D\u064A\u062D \u0627\u0644\u0628\u0627\u0644\u063A\u0629 24 \u0633\u0627\u0639\u0629 \u0645\u0646 \u0628\u062F\u0627\u064A\u0629 \u0627\u0644\u0648\u0631\u062F\u064A\u0629" } };
    }
    const latestRows = await tx.select({
      id: attendance_events.id,
      action: attendance_events.action,
      occurredAt: attendance_events.occurred_at
    }).from(attendance_events).where(and2(
      eq6(attendance_events.session_id, current.id),
      eq6(attendance_events.user_id, current.userId)
    )).orderBy(desc(attendance_events.id)).limit(1);
    const latest = latestRows[0];
    if (!latest) return { error: { status: 409, message: "\u0644\u0627 \u064A\u0648\u062C\u062F \u0625\u062C\u0631\u0627\u0621 \u062F\u062E\u0648\u0644 \u0645\u0631\u062A\u0628\u0637 \u0628\u0627\u0644\u062C\u0644\u0633\u0629 \u0644\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u062D\u0627\u0644\u062A\u0647\u0627" } };
    if (latest && occurredAt <= latest.occurredAt) {
      return { error: { status: 409, message: "\u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0648\u0642\u062A \u0627\u0644\u0627\u0646\u0635\u0631\u0627\u0641 \u0628\u0639\u062F \u0622\u062E\u0631 \u0625\u062C\u0631\u0627\u0621 \u0641\u064A \u0627\u0644\u062C\u0644\u0633\u0629" } };
    }
    if (latest.occurredAt < current.checkInAt) {
      return { error: { status: 409, message: "\u0622\u062E\u0631 \u0625\u062C\u0631\u0627\u0621 \u0641\u064A \u0627\u0644\u062C\u0644\u0633\u0629 \u064A\u0633\u0628\u0642 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062D\u0636\u0648\u0631" } };
    }
    if (latest.action !== "check_in" && latest.action !== "break_end" && latest.action !== "break_start") {
      return { error: { status: 409, message: "\u062D\u0627\u0644\u0629 \u0627\u0644\u062C\u0644\u0633\u0629 \u0644\u0627 \u062A\u0633\u0645\u062D \u0628\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0627\u0646\u0635\u0631\u0627\u0641" } };
    }
    if (latest.action === "break_start") {
      if (!breakEndAt || breakEndAt <= latest.occurredAt || breakEndAt >= occurredAt) {
        return { error: { status: 409, message: "\u0623\u062F\u062E\u0644 \u0648\u0642\u062A \u0646\u0647\u0627\u064A\u0629 \u0627\u0644\u0627\u0633\u062A\u0631\u0627\u062D\u0629 \u0628\u0639\u062F \u0628\u062F\u0627\u064A\u062A\u0647\u0627 \u0648\u0642\u0628\u0644 \u0627\u0644\u0627\u0646\u0635\u0631\u0627\u0641" } };
      }
    }
    if (latest.action !== "break_start" && breakEndAt) {
      return { error: { status: 409, message: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0627\u0633\u062A\u0631\u0627\u062D\u0629 \u0645\u0641\u062A\u0648\u062D\u0629 \u0644\u0647\u0630\u0647 \u0627\u0644\u062C\u0644\u0633\u0629" } };
    }
    const nextSession = await tx.select({ checkInAt: attendance_sessions.check_in_at }).from(attendance_sessions).where(and2(
      eq6(attendance_sessions.user_id, current.userId),
      gt(attendance_sessions.shift_start_at, current.shiftStartAt)
    )).orderBy(attendance_sessions.shift_start_at).limit(1);
    if (nextSession[0] && occurredAt >= nextSession[0].checkInAt) {
      return { error: { status: 409, message: "\u0648\u0642\u062A \u0627\u0644\u0627\u0646\u0635\u0631\u0627\u0641 \u064A\u062A\u062F\u0627\u062E\u0644 \u0645\u0639 \u0648\u0631\u062F\u064A\u0629 \u0644\u0627\u062D\u0642\u0629" } };
    }
    if (latest.action === "break_start") {
      await tx.insert(attendance_events).values({
        user_id: current.userId,
        shift_assignment_id: current.assignmentId,
        session_id: current.id,
        action: "break_end",
        occurred_at: breakEndAt,
        latitude: "0",
        longitude: "0",
        accuracy: "0",
        source: "manual",
        created_by: req.user.id,
        updated_by: req.user.id
      });
    }
    const [event] = await tx.insert(attendance_events).values({
      user_id: current.userId,
      shift_assignment_id: current.assignmentId,
      session_id: current.id,
      action: "check_out",
      occurred_at: occurredAt,
      latitude: "0",
      longitude: "0",
      accuracy: "0",
      source: "manual",
      created_by: req.user.id,
      updated_by: req.user.id
    }).returning();
    await tx.update(attendance_sessions).set({ check_out_at: occurredAt }).where(and2(
      eq6(attendance_sessions.id, current.id),
      isNull(attendance_sessions.check_out_at)
    ));
    return { event };
  });
  if (created.error) return res.status(created.error.status).json({ message: created.error.message });
  res.status(201).json(created.event);
}));
router.get("/attendance-summary", handle(async (req, res) => {
  const month = textFilter(req.query.month, 7) || new Date(Date.now() + 3 * 60 * 60 * 1e3).toISOString().slice(0, 7);
  const range = monthRange(month);
  const userId2 = positiveId(req.query.user_id, "\u0627\u0644\u0645\u0648\u0638\u0641");
  const sectionId = textFilter(req.query.section_id, 20);
  const userConditions = [eq6(users.status, "active"), eq6(users.include_in_attendance, true)];
  if (userId2) userConditions.push(eq6(users.id, userId2));
  if (sectionId) userConditions.push(eq6(users.section_id, sectionId));
  const monthStart = new Date(range.start.getTime() + 3 * 60 * 60 * 1e3).toISOString().slice(0, 10);
  const monthEnd = new Date(range.end.getTime() - 1 + 3 * 60 * 60 * 1e3).toISOString().slice(0, 10);
  const [employeeRows, sessionRows, assignmentRows] = await Promise.all([
    db.select({
      id: users.id,
      username: users.username,
      display_name: users.display_name,
      display_name_ar: users.display_name_ar,
      section_id: users.section_id,
      section_name: sql7`COALESCE(${sections.name_ar}, ${sections.name})`
    }).from(users).leftJoin(sections, eq6(users.section_id, sections.id)).where(and2(...userConditions)).orderBy(users.display_name_ar, users.display_name, users.username),
    db.select({
      id: attendance_sessions.id,
      userId: attendance_sessions.user_id,
      shiftDate: attendance_sessions.shift_date,
      shiftStartAt: attendance_sessions.shift_start_at,
      shiftEndAt: attendance_sessions.shift_end_at,
      expectedMinutes: attendance_sessions.expected_minutes,
      checkInAt: attendance_sessions.check_in_at,
      checkOutAt: attendance_sessions.check_out_at
    }).from(attendance_sessions).innerJoin(users, eq6(attendance_sessions.user_id, users.id)).where(and2(
      ...userConditions,
      gte(attendance_sessions.shift_date, monthStart),
      lte(attendance_sessions.shift_date, monthEnd)
    )),
    db.select({
      id: user_shift_assignments.id,
      userId: user_shift_assignments.user_id,
      assignedAt: user_shift_assignments.assigned_at,
      unassignedAt: user_shift_assignments.unassigned_at,
      startTime: shift_definitions.start_time,
      endTime: shift_definitions.end_time,
      breakMinutes: shift_definitions.break_minutes,
      lateCheckoutMinutes: shift_definitions.late_checkout_minutes
    }).from(user_shift_assignments).innerJoin(shift_definitions, eq6(user_shift_assignments.shift_id, shift_definitions.id)).innerJoin(users, eq6(user_shift_assignments.user_id, users.id)).where(and2(...userConditions, lt(user_shift_assignments.assigned_at, range.end), or3(
      isNull(user_shift_assignments.unassigned_at),
      gt(user_shift_assignments.unassigned_at, range.start)
    )))
  ]);
  const eventRows = await db.select({
    id: attendance_events.id,
    userId: attendance_events.user_id,
    assignmentId: attendance_events.shift_assignment_id,
    sessionId: attendance_events.session_id,
    action: attendance_events.action,
    occurredAt: attendance_events.occurred_at
  }).from(attendance_events).innerJoin(users, eq6(attendance_events.user_id, users.id)).where(and2(
    ...userConditions,
    or3(
      and2(
        gte(attendance_events.occurred_at, new Date(range.start.getTime() - 48 * 60 * 60 * 1e3)),
        lt(attendance_events.occurred_at, new Date(range.end.getTime() + 48 * 60 * 60 * 1e3))
      ),
      sessionRows.length ? inArray3(attendance_events.session_id, sessionRows.map((session2) => session2.id)) : sql7`false`
    )
  )).orderBy(attendance_events.occurred_at, attendance_events.id);
  const rows2 = employeeRows.map((employee) => ({
    ...employee,
    ...summarizeAttendance(employee.id, eventRows, assignmentRows, range, /* @__PURE__ */ new Date(), sessionRows)
  }));
  res.json({ month, rows: rows2 });
}));
router.get("/violations", handle(async (req, res) => {
  const userId2 = positiveId(req.query.user_id, "\u0627\u0644\u0645\u0648\u0638\u0641");
  const sectionId = textFilter(req.query.section_id, 20);
  const conditions = [];
  if (userId2) conditions.push(eq6(user_violations.user_id, userId2));
  if (sectionId) conditions.push(eq6(users.section_id, sectionId));
  const rows2 = await db.select({
    id: user_violations.id,
    user_id: user_violations.user_id,
    username: users.username,
    display_name: users.display_name,
    display_name_ar: users.display_name_ar,
    section_id: users.section_id,
    section_name: sql7`COALESCE(${sections.name_ar}, ${sections.name})`,
    title: user_violations.title,
    details: user_violations.details,
    created_at: user_violations.created_at,
    acknowledged_at: user_violations.acknowledged_at
  }).from(user_violations).innerJoin(users, eq6(user_violations.user_id, users.id)).leftJoin(sections, eq6(users.section_id, sections.id)).where(conditions.length ? and2(...conditions) : void 0).orderBy(desc(user_violations.created_at), desc(user_violations.id));
  res.json(rows2);
}));
router.post("/violations", handle(async (req, res) => {
  const input = violationInput.parse(req.body);
  const employee = await db.select({ id: users.id }).from(users).where(eq6(users.id, input.user_id)).limit(1);
  if (!employee[0]) return res.status(404).json({ message: "\u0627\u0644\u0645\u0648\u0638\u0641 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  const [created] = await db.insert(user_violations).values(input).returning();
  res.status(201).json(created);
}));
router.post("/shifts", handle(async (req, res) => {
  const input = shiftInput.parse(req.body);
  const [created] = await db.insert(shift_definitions).values({
    ...input,
    name_en: input.name_en || null,
    geofence_center_lat: input.geofence_center_lat == null ? null : String(input.geofence_center_lat),
    geofence_center_lng: input.geofence_center_lng == null ? null : String(input.geofence_center_lng)
  }).returning();
  res.status(201).json(created);
}));
router.put("/shifts/:id", handle(async (req, res) => {
  const id2 = String(req.params.id);
  const { id: _bodyId, assigned_users: _assignedUsers, created_at: _createdAt, updated_at: _updatedAt, ...editable } = req.body ?? {};
  const input = shiftUpdateInput.parse(editable);
  const result = await db.transaction(async (tx) => {
    const assignedUsers = await tx.select({ userId: user_shift_assignments.user_id }).from(user_shift_assignments).where(and2(eq6(user_shift_assignments.shift_id, id2), isNull(user_shift_assignments.unassigned_at))).orderBy(user_shift_assignments.user_id);
    for (const assigned of assignedUsers) {
      await tx.execute(sql7`SELECT pg_advisory_xact_lock(${18497}, ${assigned.userId})`);
    }
    const openSessions = await tx.select({ id: attendance_sessions.id }).from(attendance_sessions).where(and2(
      eq6(attendance_sessions.shift_id, id2),
      isNull(attendance_sessions.check_out_at),
      gt(attendance_sessions.window_end_at, /* @__PURE__ */ new Date())
    )).limit(1);
    if (openSessions[0]) return { conflict: true };
    const [updated2] = await tx.update(shift_definitions).set({
      ...input,
      name_en: input.name_en || null,
      geofence_center_lat: input.geofence_center_lat == null ? null : String(input.geofence_center_lat),
      geofence_center_lng: input.geofence_center_lng == null ? null : String(input.geofence_center_lng),
      updated_at: /* @__PURE__ */ new Date()
    }).where(eq6(shift_definitions.id, id2)).returning();
    return { updated: updated2 };
  });
  if ("conflict" in result) return res.status(409).json({ message: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062A\u0639\u062F\u064A\u0644 \u0627\u0644\u0648\u0631\u062F\u064A\u0629 \u0645\u0639 \u0648\u062C\u0648\u062F \u062C\u0644\u0633\u0629 \u062D\u0636\u0648\u0631 \u063A\u064A\u0631 \u0645\u0643\u062A\u0645\u0644\u0629 \u0645\u0631\u062A\u0628\u0637\u0629 \u0628\u0647\u0627" });
  const updated = result.updated;
  if (!updated) return res.status(404).json({ message: "\u0627\u0644\u0648\u0631\u062F\u064A\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
  res.json(updated);
}));
router.delete("/shifts/:id", handle(async (req, res) => {
  const id2 = String(req.params.id);
  const openSessions = await db.select({ id: attendance_sessions.id }).from(attendance_sessions).where(and2(
    eq6(attendance_sessions.shift_id, id2),
    isNull(attendance_sessions.check_out_at),
    gt(attendance_sessions.window_end_at, /* @__PURE__ */ new Date())
  )).limit(1);
  if (openSessions[0]) return res.status(409).json({ message: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0627\u0644\u0648\u0631\u062F\u064A\u0629 \u0645\u0639 \u0648\u062C\u0648\u062F \u062C\u0644\u0633\u0629 \u062D\u0636\u0648\u0631 \u063A\u064A\u0631 \u0645\u0643\u062A\u0645\u0644\u0629 \u0645\u0631\u062A\u0628\u0637\u0629 \u0628\u0647\u0627" });
  const active = await db.select({ id: user_shift_assignments.id }).from(user_shift_assignments).where(and2(eq6(user_shift_assignments.shift_id, id2), isNull(user_shift_assignments.unassigned_at))).limit(1);
  if (active[0]) return res.status(409).json({ message: "\u0627\u0646\u0642\u0644 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646 \u0645\u0646 \u0627\u0644\u0648\u0631\u062F\u064A\u0629 \u0642\u0628\u0644 \u062D\u0630\u0641\u0647\u0627" });
  const [removed] = await db.delete(shift_definitions).where(eq6(shift_definitions.id, id2)).returning({ id: shift_definitions.id });
  if (!removed) return res.status(404).json({ message: "\u0627\u0644\u0648\u0631\u062F\u064A\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
  res.json({ success: true, id: removed.id });
}));
router.post("/assignments", handle(async (req, res) => {
  const input = assignmentsInput.parse(req.body);
  const userIds = Array.from(new Set(input.user_ids)).sort((a, b) => a - b);
  const validUsers = await db.select({ id: users.id }).from(users).where(and2(
    inArray3(users.id, userIds),
    eq6(users.status, "active"),
    eq6(users.include_in_attendance, true)
  ));
  if (validUsers.length !== userIds.length) return res.status(400).json({ message: "\u062A\u062A\u0636\u0645\u0646 \u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u0645\u0633\u062A\u062E\u062F\u0645\u064B\u0627 \u063A\u064A\u0631 \u0646\u0634\u0637 \u0623\u0648 \u063A\u064A\u0631 \u0645\u062E\u0635\u0635 \u0644\u0644\u062D\u0636\u0648\u0631" });
  if (input.shift_id) {
    const shift = await db.select({ id: shift_definitions.id }).from(shift_definitions).where(and2(eq6(shift_definitions.id, input.shift_id), eq6(shift_definitions.is_active, true))).limit(1);
    if (!shift[0]) return res.status(404).json({ message: "\u0627\u0644\u0648\u0631\u062F\u064A\u0629 \u0627\u0644\u0645\u062D\u062F\u062F\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629 \u0623\u0648 \u063A\u064A\u0631 \u0646\u0634\u0637\u0629" });
  }
  const changed = await db.transaction(async (tx) => {
    let count2 = 0;
    for (const userId2 of userIds) {
      await tx.execute(sql7`SELECT pg_advisory_xact_lock(${18497}, ${userId2})`);
      await tx.execute(sql7`SELECT pg_advisory_xact_lock(${29831}, ${userId2})`);
      const current = await tx.select({ id: user_shift_assignments.id, shift_id: user_shift_assignments.shift_id }).from(user_shift_assignments).where(and2(eq6(user_shift_assignments.user_id, userId2), isNull(user_shift_assignments.unassigned_at))).limit(1);
      if (current[0]?.shift_id === input.shift_id) continue;
      const openSession = await tx.select({ id: attendance_sessions.id }).from(attendance_sessions).where(and2(
        eq6(attendance_sessions.user_id, userId2),
        isNull(attendance_sessions.check_out_at),
        gt(attendance_sessions.window_end_at, /* @__PURE__ */ new Date())
      )).limit(1);
      if (openSession[0]) {
        throw Object.assign(new Error("\u0644\u0627 \u064A\u0645\u0643\u0646 \u062A\u063A\u064A\u064A\u0631 \u0627\u0644\u0648\u0631\u062F\u064A\u0629 \u0623\u062B\u0646\u0627\u0621 \u0648\u062C\u0648\u062F \u062C\u0644\u0633\u0629 \u062D\u0636\u0648\u0631 \u063A\u064A\u0631 \u0645\u0643\u062A\u0645\u0644\u0629\u061B \u062D\u0627\u0648\u0644 \u0628\u0639\u062F \u0625\u063A\u0644\u0627\u0642 \u0627\u0644\u062C\u0644\u0633\u0629"), { status: 409 });
      }
      if (current[0]) {
        await tx.update(user_shift_assignments).set({ unassigned_at: /* @__PURE__ */ new Date() }).where(eq6(user_shift_assignments.id, current[0].id));
      }
      if (input.shift_id) {
        await tx.insert(user_shift_assignments).values({
          user_id: userId2,
          shift_id: input.shift_id,
          assigned_by: req.user.id
        });
      }
      count2 += 1;
    }
    return count2;
  });
  res.json({ success: true, changed });
}));
var hr_default = router;

// server/self-service.ts
import { aliasedTable as aliasedTable2, and as and3, desc as desc2, eq as eq7, isNull as isNull2, ne, or as or4, sql as sql8 } from "drizzle-orm";
import { Router as Router3 } from "express";
import { z as z4 } from "zod";

// server/self-service-rules.ts
function attendanceStatus(lastAction) {
  if (lastAction === "check_in" || lastAction === "break_end") return "working";
  if (lastAction === "break_start") return "break";
  return "out";
}
function canRecordAttendance(action, lastAction) {
  const status = attendanceStatus(lastAction);
  return action === "check_in" && status === "out" || action === "break_start" && status === "working" || action === "break_end" && status === "break" || action === "check_out" && status === "working";
}
function attendanceSessionSummary(events, now = /* @__PURE__ */ new Date()) {
  const ordered = [...events].sort((a, b) => a.occurred_at.getTime() - b.occurred_at.getTime());
  let sessionStartIndex = -1;
  for (let index3 = ordered.length - 1; index3 >= 0; index3 -= 1) {
    if (ordered[index3].action === "check_in") {
      sessionStartIndex = index3;
      break;
    }
  }
  if (sessionStartIndex < 0) return { startedAt: null, workedSeconds: 0, actionTimes: {} };
  const session2 = ordered.slice(sessionStartIndex);
  let workingSince = null;
  let workedMilliseconds = 0;
  const actionTimes = {};
  for (const event of session2) {
    actionTimes[event.action] = event.occurred_at;
    if (event.action === "check_in" || event.action === "break_end") workingSince = event.occurred_at.getTime();
    if ((event.action === "break_start" || event.action === "check_out") && workingSince !== null) {
      workedMilliseconds += Math.max(0, event.occurred_at.getTime() - workingSince);
      workingSince = null;
    }
  }
  if (workingSince !== null) workedMilliseconds += Math.max(0, now.getTime() - workingSince);
  return {
    startedAt: session2[0].occurred_at,
    workedSeconds: Math.floor(workedMilliseconds / 1e3),
    actionTimes
  };
}
function sessionEventState(events, checkOutAt) {
  if (checkOutAt) return "out";
  const latest = [...events].sort((a, b) => a.occurred_at.getTime() - b.occurred_at.getTime()).at(-1);
  return attendanceStatus(latest?.action);
}
function completedSessionDaysInMonth(sessions2, month) {
  return new Set(
    sessions2.filter((session2) => session2.check_out_at !== null && session2.shift_date.startsWith(`${month}-`)).map((session2) => session2.shift_date)
  ).size;
}
function isPriorIncompleteSession(session2, now = /* @__PURE__ */ new Date()) {
  return session2.check_out_at === null && session2.window_end_at.getTime() < now.getTime();
}

// server/shift-geofence.ts
var TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
function parseTimeMinutes(value) {
  const match = String(value || "").trim().match(TIME_PATTERN);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}
function currentShiftWindow(shift, now = /* @__PURE__ */ new Date()) {
  const occurrence = currentShiftOccurrence(shift, now);
  return occurrence ? { start: occurrence.start, end: occurrence.end } : null;
}
function currentShiftOccurrence(shift, now = /* @__PURE__ */ new Date()) {
  const startMinutes = parseTimeMinutes(shift.startTime);
  const endMinutes = parseTimeMinutes(shift.endTime);
  if (startMinutes === null || endMinutes === null || startMinutes === endMinutes) return null;
  const riyadhOffset = 3 * 60 * 60 * 1e3;
  const localNow = new Date(now.getTime() + riyadhOffset);
  const year = localNow.getUTCFullYear();
  const month = localNow.getUTCMonth();
  const day = localNow.getUTCDate();
  const overnight = endMinutes <= startMinutes;
  for (const dayOffset of [0, -1, 1]) {
    const localMidnightUtc = Date.UTC(year, month, day + dayOffset);
    const shiftStartAt = new Date(localMidnightUtc + startMinutes * 6e4 - riyadhOffset);
    const shiftEndAt = new Date(localMidnightUtc + (endMinutes + (overnight ? 1440 : 0)) * 6e4 - riyadhOffset);
    const start2 = new Date(shiftStartAt.getTime() - shift.earlyCheckinMinutes * 6e4);
    const end = new Date(shiftEndAt.getTime() + shift.lateCheckoutMinutes * 6e4);
    if (now >= start2 && now <= end) {
      const localDate = new Date(localMidnightUtc);
      const shiftDate = `${localDate.getUTCFullYear()}-${String(localDate.getUTCMonth() + 1).padStart(2, "0")}-${String(localDate.getUTCDate()).padStart(2, "0")}`;
      return {
        start: start2,
        end,
        shiftStartAt,
        shiftEndAt,
        shiftDate,
        expectedMinutes: Math.max(0, Math.round((shiftEndAt.getTime() - shiftStartAt.getTime()) / 6e4) - (shift.breakMinutes ?? 0))
      };
    }
  }
  return null;
}
function validGeofence(shift) {
  const { geofenceCenterLat: lat, geofenceCenterLng: lng, geofenceRadiusMeters: radius } = shift;
  if (lat === void 0 || lat < -90 || lat > 90) return null;
  if (lng === void 0 || lng < -180 || lng > 180) return null;
  if (radius === void 0 || radius < 20 || radius > 5e3) return null;
  return { centerLat: lat, centerLng: lng, radiusMeters: radius };
}
function toActiveShift(shift) {
  if (!shift) return null;
  const geofence = shift.geofenceEnabled ? validGeofence(shift) : null;
  return {
    id: shift.id,
    name: shift.nameAr || shift.nameEn || "\u0627\u0644\u0648\u0631\u062F\u064A\u0629 \u0627\u0644\u062D\u0627\u0644\u064A\u0629",
    startTime: shift.startTime,
    endTime: shift.endTime,
    geofenceStatus: !shift.geofenceEnabled ? "disabled" : geofence ? "enabled" : "invalid",
    radiusMeters: geofence ? Math.round(geofence.radiusMeters) : null
  };
}
function distanceMeters(lat1, lng1, lat2, lng2) {
  const toRadians = (value) => value * Math.PI / 180;
  const earthRadius = 6371e3;
  const latitudeDifference = toRadians(lat2 - lat1);
  const longitudeDifference = toRadians(lng2 - lng1);
  const a = Math.sin(latitudeDifference / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(longitudeDifference / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// server/self-service.ts
var router2 = Router3();
var admin = requirePermission("admin");
function httpError(message, status, code) {
  return Object.assign(new Error(message), { status, ...code ? { code } : {} });
}
function handle2(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res)).catch(next);
  };
}
var idParam = z4.string().regex(/^[1-9]\d*$/, "\u0627\u0644\u0645\u0639\u0631\u0651\u0641 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D").transform(Number).refine(Number.isSafeInteger, "\u0627\u0644\u0645\u0639\u0631\u0651\u0641 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D");
var attendanceInput = z4.object({
  action: z4.enum(["check_in", "break_start", "break_end", "check_out"]),
  latitude: z4.number().finite().min(-90).max(90),
  longitude: z4.number().finite().min(-180).max(180),
  accuracy: z4.number().finite().min(0).max(1e4)
}).strict();
var messageInput = z4.object({
  recipient_id: z4.number().int().positive(),
  body: z4.string().trim().min(1, "\u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u0645\u0637\u0644\u0648\u0628").max(4e3, "\u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u0637\u0648\u064A\u0644\u0629 \u062C\u062F\u064B\u0627"),
  reply_to_id: z4.number().int().positive().optional()
}).strict();
var requestInput = z4.object({
  type: z4.enum(["leave", "permission", "other"]),
  title: z4.string().trim().min(1, "\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0637\u0644\u0628 \u0645\u0637\u0644\u0648\u0628").max(200),
  details: z4.string().trim().min(1, "\u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0637\u0644\u0628 \u0645\u0637\u0644\u0648\u0628\u0629").max(1e4)
}).strict();
var reviewInput = z4.object({
  status: z4.enum(["approved", "rejected"]),
  response: z4.string().trim().max(4e3).default("")
}).strict();
var violationInput2 = z4.object({
  user_id: z4.number().int().positive(),
  title: z4.string().trim().min(1).max(200),
  details: z4.string().trim().min(1).max(1e4)
}).strict();
function currentRiyadhMonth() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit"
  }).formatToParts(/* @__PURE__ */ new Date());
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const monthNumber = Number(parts.find((part) => part.type === "month")?.value);
  const month = `${year}-${String(monthNumber).padStart(2, "0")}`;
  const start2 = new Date(Date.UTC(year, monthNumber - 1, 1) - 3 * 60 * 60 * 1e3);
  const end = new Date(Date.UTC(year, monthNumber, 1) - 3 * 60 * 60 * 1e3);
  return { month, start: start2, end };
}
function monthForOffset(month, offset) {
  const [year, monthNumber] = month.split("-").map(Number);
  const target = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
  return `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, "0")}-01`;
}
function shiftDefinition(row) {
  return {
    id: row.id,
    nameAr: row.name_ar,
    nameEn: row.name_en ?? void 0,
    startTime: row.start_time,
    endTime: row.end_time,
    nextDayCheckinTime: row.next_day_checkin_time,
    earlyCheckinMinutes: row.early_checkin_minutes,
    lateCheckoutMinutes: row.late_checkout_minutes,
    breakMinutes: row.break_minutes,
    geofenceEnabled: row.geofence_enabled,
    geofenceCenterLat: row.geofence_center_lat == null ? void 0 : Number(row.geofence_center_lat),
    geofenceCenterLng: row.geofence_center_lng == null ? void 0 : Number(row.geofence_center_lng),
    geofenceRadiusMeters: row.geofence_radius_meters
  };
}
function enforceGeofence(shift, input) {
  if (!shift.geofenceEnabled) return;
  const geofence = validGeofence(shift);
  if (!geofence) throw httpError("\u0625\u0639\u062F\u0627\u062F \u0627\u0644\u0646\u0637\u0627\u0642 \u0627\u0644\u062C\u063A\u0631\u0627\u0641\u064A \u0644\u0644\u0648\u0631\u062F\u064A\u0629 \u063A\u064A\u0631 \u0645\u0643\u062A\u0645\u0644", 409, "INVALID_GEOFENCE");
  const distance = distanceMeters(input.latitude, input.longitude, geofence.centerLat, geofence.centerLng);
  if (distance > geofence.radiusMeters) {
    const shiftName = shift.nameAr || shift.nameEn || "\u0627\u0644\u0648\u0631\u062F\u064A\u0629 \u0627\u0644\u062D\u0627\u0644\u064A\u0629";
    throw httpError(
      `\u0645\u0648\u0642\u0639\u0643 \u062E\u0627\u0631\u062C \u0646\u0637\u0627\u0642 \u0627\u0644\u062D\u0636\u0648\u0631 \u0627\u0644\u0645\u0633\u0645\u0648\u062D \u0644\u0648\u0631\u062F\u064A\u0629 ${shiftName}. \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 \u062F\u0627\u062E\u0644 ${Math.round(geofence.radiusMeters)} \u0645\u062A\u0631.`,
      403,
      "OUTSIDE_GEOFENCE"
    );
  }
}
router2.use(requireAuth);
router2.get("/attendance", handle2(async (req, res) => {
  const userId2 = req.user.id;
  const { month, start: start2, end } = currentRiyadhMonth();
  const serverNow = /* @__PURE__ */ new Date();
  const shiftDateStart = month + "-01";
  const nextMonth = monthForOffset(month, 1);
  const [events, sessionRows, assignmentRows] = await Promise.all([
    db.select({
      id: attendance_events.id,
      session_id: attendance_events.session_id,
      action: attendance_events.action,
      occurred_at: attendance_events.occurred_at,
      latitude: attendance_events.latitude,
      longitude: attendance_events.longitude,
      accuracy: attendance_events.accuracy
    }).from(attendance_events).leftJoin(attendance_sessions, eq7(attendance_events.session_id, attendance_sessions.id)).where(and3(
      eq7(attendance_events.user_id, userId2),
      or4(
        and3(
          isNull2(attendance_events.session_id),
          sql8`${attendance_events.occurred_at} >= ${start2}`,
          sql8`${attendance_events.occurred_at} < ${end}`
        ),
        and3(
          sql8`${attendance_sessions.shift_date} >= ${shiftDateStart}`,
          sql8`${attendance_sessions.shift_date} < ${nextMonth}`
        )
      )
    )).orderBy(attendance_events.occurred_at, attendance_events.id),
    db.select().from(attendance_sessions).where(and3(
      eq7(attendance_sessions.user_id, userId2),
      or4(
        and3(
          sql8`${attendance_sessions.shift_date} >= ${shiftDateStart}`,
          sql8`${attendance_sessions.shift_date} < ${nextMonth}`
        ),
        and3(
          sql8`${attendance_sessions.window_start_at} <= ${serverNow}`,
          sql8`${attendance_sessions.window_end_at} >= ${serverNow}`
        ),
        isNull2(attendance_sessions.check_out_at)
      )
    )).orderBy(desc2(attendance_sessions.shift_start_at)),
    db.select({ assignment_id: user_shift_assignments.id, shift: shift_definitions }).from(user_shift_assignments).innerJoin(shift_definitions, eq7(user_shift_assignments.shift_id, shift_definitions.id)).where(and3(
      eq7(user_shift_assignments.user_id, userId2),
      isNull2(user_shift_assignments.unassigned_at),
      eq7(shift_definitions.is_active, true)
    )).limit(1)
  ]);
  const assignedShift = assignmentRows[0] ? shiftDefinition(assignmentRows[0].shift) : null;
  const shiftWindow = assignedShift ? currentShiftWindow(assignedShift, serverNow) : null;
  const currentSession = sessionRows.find(
    (session3) => session3.window_start_at <= serverNow && session3.window_end_at >= serverNow
  );
  const currentEvents = currentSession ? await db.select({ action: attendance_events.action, occurred_at: attendance_events.occurred_at }).from(attendance_events).where(and3(
    eq7(attendance_events.user_id, userId2),
    eq7(attendance_events.session_id, currentSession.id)
  )).orderBy(attendance_events.occurred_at, attendance_events.id) : [];
  const status = currentSession ? sessionEventState(currentEvents, currentSession.check_out_at) : "out";
  const session2 = attendanceSessionSummary(currentEvents, serverNow);
  const withinShiftWindow = Boolean(shiftWindow);
  const daysPresent = completedSessionDaysInMonth(sessionRows, month);
  const unresolvedIncompleteSession = sessionRows.find((row) => isPriorIncompleteSession(row, serverNow));
  res.json({
    events: events.map((event) => ({
      ...event,
      latitude: Number(event.latitude),
      longitude: Number(event.longitude),
      accuracy: Number(event.accuracy)
    })),
    status,
    month,
    daysPresent,
    activeShift: toActiveShift(assignedShift),
    withinShiftWindow,
    serverNow,
    currentSession: currentSession ? {
      id: currentSession.id,
      shiftId: currentSession.shift_id,
      shiftDate: currentSession.shift_date,
      checkInAt: currentSession.check_in_at,
      checkOutAt: currentSession.check_out_at,
      incomplete: currentSession.check_out_at === null
    } : null,
    unresolvedIncompleteSession: unresolvedIncompleteSession ? {
      id: unresolvedIncompleteSession.id,
      shiftId: unresolvedIncompleteSession.shift_id,
      shiftDate: unresolvedIncompleteSession.shift_date,
      checkInAt: unresolvedIncompleteSession.check_in_at,
      windowEndAt: unresolvedIncompleteSession.window_end_at
    } : null,
    workedSeconds: session2.workedSeconds,
    sessionStartedAt: session2.startedAt,
    actionTimes: Object.fromEntries(Object.entries(session2.actionTimes).map(([action, time]) => [action, time.toISOString()]))
  });
}));
router2.post("/attendance", handle2(async (req, res) => {
  const input = attendanceInput.parse(req.body);
  const userId2 = req.user.id;
  await db.transaction(async (tx) => {
    await tx.execute(sql8`SELECT pg_advisory_xact_lock(${18497}, ${userId2})`);
    const now = /* @__PURE__ */ new Date();
    if (input.action === "check_in") {
      const assignment = await tx.select({ id: user_shift_assignments.id, shift: shift_definitions }).from(user_shift_assignments).innerJoin(shift_definitions, eq7(user_shift_assignments.shift_id, shift_definitions.id)).where(and3(
        eq7(user_shift_assignments.user_id, userId2),
        isNull2(user_shift_assignments.unassigned_at),
        eq7(shift_definitions.is_active, true)
      )).limit(1);
      if (!assignment[0]) throw httpError("\u0644\u0645 \u064A\u062A\u0645 \u062A\u0639\u064A\u064A\u0646 \u0648\u0631\u062F\u064A\u0629 \u0644\u0643. \u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0648\u0627\u0631\u062F \u0627\u0644\u0628\u0634\u0631\u064A\u0629", 409, "NO_SHIFT_ASSIGNMENT");
      const shift = shiftDefinition(assignment[0].shift);
      const occurrence = currentShiftOccurrence(shift, now);
      if (!occurrence) throw httpError("\u0644\u0627 \u064A\u0645\u0643\u0646 \u062A\u0646\u0641\u064A\u0630 \u0627\u0644\u0639\u0645\u0644\u064A\u0629 \u062E\u0627\u0631\u062C \u0627\u0644\u0646\u0637\u0627\u0642 \u0627\u0644\u0632\u0645\u0646\u064A \u0644\u0648\u0631\u062F\u064A\u062A\u0643", 403, "OUTSIDE_SHIFT_WINDOW");
      enforceGeofence(shift, input);
      const existing = await tx.select({ id: attendance_sessions.id }).from(attendance_sessions).where(and3(
        eq7(attendance_sessions.user_id, userId2),
        eq7(attendance_sessions.shift_start_at, occurrence.shiftStartAt)
      )).limit(1);
      if (existing[0]) throw httpError("\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062D\u0636\u0648\u0631 \u0644\u0647\u0630\u0647 \u0627\u0644\u0648\u0631\u062F\u064A\u0629 \u0645\u0633\u0628\u0642\u064B\u0627", 409, "SESSION_ALREADY_EXISTS");
      const [created] = await tx.insert(attendance_sessions).values({
        user_id: userId2,
        shift_assignment_id: assignment[0].id,
        shift_id: shift.id,
        shift_date: occurrence.shiftDate,
        shift_start_at: occurrence.shiftStartAt,
        shift_end_at: occurrence.shiftEndAt,
        window_start_at: occurrence.start,
        window_end_at: occurrence.end,
        expected_minutes: occurrence.expectedMinutes,
        check_in_at: sql8`clock_timestamp()`
      }).returning({ id: attendance_sessions.id, check_in_at: attendance_sessions.check_in_at });
      await tx.insert(attendance_events).values({
        user_id: userId2,
        shift_assignment_id: assignment[0].id,
        session_id: created.id,
        action: "check_in",
        occurred_at: created.check_in_at,
        latitude: String(input.latitude),
        longitude: String(input.longitude),
        accuracy: String(input.accuracy)
      });
      return;
    }
    const openSessions = await tx.select().from(attendance_sessions).where(and3(eq7(attendance_sessions.user_id, userId2), isNull2(attendance_sessions.check_out_at))).orderBy(desc2(attendance_sessions.shift_start_at));
    const eligibleSessions = openSessions.filter(
      (candidate) => candidate.window_start_at <= now && candidate.window_end_at >= now
    );
    if (eligibleSessions.length > 1) {
      throw httpError("\u062A\u0648\u062C\u062F \u0623\u0643\u062B\u0631 \u0645\u0646 \u062C\u0644\u0633\u0629 \u062D\u0636\u0648\u0631 \u0645\u0641\u062A\u0648\u062D\u0629 \u0636\u0645\u0646 \u0627\u0644\u0646\u0627\u0641\u0630\u0629 \u0627\u0644\u062D\u0627\u0644\u064A\u0629", 409, "AMBIGUOUS_OPEN_SESSION");
    }
    const session2 = eligibleSessions[0];
    if (!session2) {
      throw httpError("\u0644\u0627 \u062A\u0648\u062C\u062F \u062C\u0644\u0633\u0629 \u062D\u0636\u0648\u0631 \u0645\u0641\u062A\u0648\u062D\u0629 \u0636\u0645\u0646 \u0646\u0627\u0641\u0630\u062A\u0647\u0627 \u0627\u0644\u0632\u0645\u0646\u064A\u0629", 409, "NO_OPEN_SESSION");
    }
    const originalShiftRows = await tx.select().from(shift_definitions).where(eq7(shift_definitions.id, session2.shift_id)).limit(1);
    if (originalShiftRows[0]) enforceGeofence(shiftDefinition(originalShiftRows[0]), input);
    const sessionEvents = await tx.select({ id: attendance_events.id, action: attendance_events.action }).from(attendance_events).where(and3(
      eq7(attendance_events.user_id, userId2),
      eq7(attendance_events.session_id, session2.id)
    )).orderBy(desc2(attendance_events.id));
    const lastAction = sessionEvents[0]?.action;
    if (!canRecordAttendance(input.action, lastAction)) {
      throw httpError("\u0647\u0630\u0627 \u0627\u0644\u0625\u062C\u0631\u0627\u0621 \u063A\u064A\u0631 \u0645\u062A\u0627\u062D \u062D\u0633\u0628 \u062D\u0627\u0644\u0629 \u062C\u0644\u0633\u0629 \u0627\u0644\u062D\u0636\u0648\u0631 \u0627\u0644\u062D\u0627\u0644\u064A\u0629", 409, "INVALID_SESSION_ACTION");
    }
    if (input.action === "check_out") {
      const [closed] = await tx.update(attendance_sessions).set({ check_out_at: sql8`clock_timestamp()` }).where(and3(
        eq7(attendance_sessions.id, session2.id),
        isNull2(attendance_sessions.check_out_at)
      )).returning({ check_out_at: attendance_sessions.check_out_at });
      if (!closed) throw httpError("\u062A\u0645 \u0625\u063A\u0644\u0627\u0642 \u062C\u0644\u0633\u0629 \u0627\u0644\u062D\u0636\u0648\u0631 \u0628\u0627\u0644\u0641\u0639\u0644", 409, "SESSION_ALREADY_CLOSED");
      await tx.insert(attendance_events).values({
        user_id: userId2,
        shift_assignment_id: session2.shift_assignment_id,
        session_id: session2.id,
        action: input.action,
        occurred_at: closed.check_out_at,
        latitude: String(input.latitude),
        longitude: String(input.longitude),
        accuracy: String(input.accuracy)
      });
      return;
    }
    await tx.insert(attendance_events).values({
      user_id: userId2,
      shift_assignment_id: session2.shift_assignment_id,
      session_id: session2.id,
      action: input.action,
      occurred_at: sql8`clock_timestamp()`,
      latitude: String(input.latitude),
      longitude: String(input.longitude),
      accuracy: String(input.accuracy)
    });
  });
  res.json({ success: true });
}));
router2.get("/recipients", handle2(async (req, res) => {
  const recipients = await db.select({
    id: users.id,
    display_name: users.display_name,
    display_name_ar: users.display_name_ar
  }).from(users).where(and3(eq7(users.status, "active"), ne(users.id, req.user.id))).orderBy(users.display_name_ar, users.display_name, users.id);
  res.json(recipients);
}));
router2.get("/messages", handle2(async (req, res) => {
  const userId2 = req.user.id;
  const sender = aliasedTable2(users, "message_sender");
  const recipient = aliasedTable2(users, "message_recipient");
  const rows2 = await db.select({
    id: internal_messages.id,
    sender_id: internal_messages.sender_id,
    recipient_id: internal_messages.recipient_id,
    sender_name: sql8`COALESCE(${sender.display_name_ar}, ${sender.display_name}, ${sender.username}, 'مستخدم')`,
    recipient_name: sql8`COALESCE(${recipient.display_name_ar}, ${recipient.display_name}, ${recipient.username}, 'مستخدم')`,
    body: internal_messages.body,
    reply_to_id: internal_messages.reply_to_id,
    created_at: internal_messages.created_at,
    read_at: internal_messages.read_at
  }).from(internal_messages).innerJoin(sender, eq7(internal_messages.sender_id, sender.id)).innerJoin(recipient, eq7(internal_messages.recipient_id, recipient.id)).where(or4(
    eq7(internal_messages.sender_id, userId2),
    eq7(internal_messages.recipient_id, userId2)
  )).orderBy(desc2(internal_messages.created_at), desc2(internal_messages.id)).limit(200);
  res.json(rows2);
}));
router2.post("/messages", handle2(async (req, res) => {
  const input = messageInput.parse(req.body);
  const senderId = req.user.id;
  if (input.recipient_id === senderId) {
    throw httpError("\u0644\u0627 \u064A\u0645\u0643\u0646 \u0625\u0631\u0633\u0627\u0644 \u0631\u0633\u0627\u0644\u0629 \u0625\u0644\u0649 \u062D\u0633\u0627\u0628\u0643", 400);
  }
  const recipient = await db.select({ id: users.id }).from(users).where(and3(eq7(users.id, input.recipient_id), eq7(users.status, "active"))).limit(1);
  if (!recipient[0]) throw httpError("\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0645\u0633\u062A\u0644\u0650\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0623\u0648 \u063A\u064A\u0631 \u0646\u0634\u0637", 404);
  if (input.reply_to_id) {
    const parent = await db.select({
      sender_id: internal_messages.sender_id,
      recipient_id: internal_messages.recipient_id
    }).from(internal_messages).where(eq7(internal_messages.id, input.reply_to_id)).limit(1);
    const message = parent[0];
    const samePair = message && (message.sender_id === senderId && message.recipient_id === input.recipient_id || message.sender_id === input.recipient_id && message.recipient_id === senderId);
    if (!samePair) throw httpError("\u0644\u0627 \u064A\u0645\u0643\u0646 \u0627\u0644\u0631\u062F \u0625\u0644\u0627 \u0639\u0644\u0649 \u0631\u0633\u0627\u0644\u0629 \u0628\u064A\u0646 \u0647\u0630\u064A\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646", 400);
  }
  const [created] = await db.insert(internal_messages).values({
    sender_id: senderId,
    recipient_id: input.recipient_id,
    body: input.body,
    reply_to_id: input.reply_to_id ?? null
  }).returning({
    id: internal_messages.id,
    sender_id: internal_messages.sender_id,
    recipient_id: internal_messages.recipient_id,
    body: internal_messages.body,
    reply_to_id: internal_messages.reply_to_id,
    created_at: internal_messages.created_at,
    read_at: internal_messages.read_at
  });
  res.status(201).json(created);
}));
router2.post("/messages/:id/read", handle2(async (req, res) => {
  const id2 = idParam.parse(req.params.id);
  const recipientId = req.user.id;
  const [updated] = await db.update(internal_messages).set({ read_at: /* @__PURE__ */ new Date() }).where(and3(
    eq7(internal_messages.id, id2),
    eq7(internal_messages.recipient_id, recipientId),
    sql8`${internal_messages.read_at} IS NULL`
  )).returning({ id: internal_messages.id });
  if (!updated) {
    const ownMessage = await db.select({ id: internal_messages.id }).from(internal_messages).where(and3(eq7(internal_messages.id, id2), eq7(internal_messages.recipient_id, recipientId))).limit(1);
    if (!ownMessage[0]) throw httpError("\u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629", 404);
  }
  res.json({ success: true });
}));
router2.get("/requests", handle2(async (req, res) => {
  const rows2 = await db.select({
    id: administrative_requests.id,
    type: administrative_requests.type,
    title: administrative_requests.title,
    details: administrative_requests.details,
    status: administrative_requests.status,
    response: administrative_requests.response,
    created_at: administrative_requests.created_at,
    responded_at: administrative_requests.responded_at
  }).from(administrative_requests).where(eq7(administrative_requests.user_id, req.user.id)).orderBy(desc2(administrative_requests.created_at), desc2(administrative_requests.id)).limit(200);
  res.json(rows2);
}));
router2.post("/requests", handle2(async (req, res) => {
  const input = requestInput.parse(req.body);
  const [created] = await db.insert(administrative_requests).values({
    user_id: req.user.id,
    ...input
  }).returning({
    id: administrative_requests.id,
    type: administrative_requests.type,
    title: administrative_requests.title,
    details: administrative_requests.details,
    status: administrative_requests.status,
    response: administrative_requests.response,
    created_at: administrative_requests.created_at,
    responded_at: administrative_requests.responded_at
  });
  res.status(201).json(created);
}));
router2.get("/violations", handle2(async (req, res) => {
  const rows2 = await db.select({
    id: user_violations.id,
    title: user_violations.title,
    details: user_violations.details,
    created_at: user_violations.created_at,
    acknowledged_at: user_violations.acknowledged_at
  }).from(user_violations).where(eq7(user_violations.user_id, req.user.id)).orderBy(desc2(user_violations.created_at), desc2(user_violations.id)).limit(200);
  res.json(rows2);
}));
router2.post("/violations/:id/ack", handle2(async (req, res) => {
  const id2 = idParam.parse(req.params.id);
  const userId2 = req.user.id;
  const [updated] = await db.update(user_violations).set({ acknowledged_at: /* @__PURE__ */ new Date() }).where(and3(
    eq7(user_violations.id, id2),
    eq7(user_violations.user_id, userId2),
    sql8`${user_violations.acknowledged_at} IS NULL`
  )).returning({ id: user_violations.id });
  if (!updated) {
    const ownViolation = await db.select({ id: user_violations.id }).from(user_violations).where(and3(eq7(user_violations.id, id2), eq7(user_violations.user_id, userId2))).limit(1);
    if (!ownViolation[0]) throw httpError("\u0627\u0644\u0645\u062E\u0627\u0644\u0641\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629", 404);
  }
  res.json({ success: true });
}));
router2.get("/admin/requests", admin, handle2(async (_req, res) => {
  const rows2 = await db.select({
    id: administrative_requests.id,
    user_id: administrative_requests.user_id,
    user_name: sql8`COALESCE(${users.display_name_ar}, ${users.display_name}, ${users.username}, 'مستخدم')`,
    type: administrative_requests.type,
    title: administrative_requests.title,
    details: administrative_requests.details,
    status: administrative_requests.status,
    response: administrative_requests.response,
    created_at: administrative_requests.created_at,
    responded_at: administrative_requests.responded_at
  }).from(administrative_requests).innerJoin(users, eq7(administrative_requests.user_id, users.id)).orderBy(desc2(administrative_requests.created_at), desc2(administrative_requests.id)).limit(500);
  res.json(rows2);
}));
router2.patch("/admin/requests/:id", admin, handle2(async (req, res) => {
  const id2 = idParam.parse(req.params.id);
  const input = reviewInput.parse(req.body);
  const [updated] = await db.update(administrative_requests).set({
    status: input.status,
    response: input.response || null,
    responded_at: /* @__PURE__ */ new Date()
  }).where(eq7(administrative_requests.id, id2)).returning({
    id: administrative_requests.id,
    user_id: administrative_requests.user_id,
    status: administrative_requests.status,
    response: administrative_requests.response,
    responded_at: administrative_requests.responded_at
  });
  if (!updated) throw httpError("\u0627\u0644\u0637\u0644\u0628 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F", 404);
  res.json(updated);
}));
router2.get("/admin/violations", admin, handle2(async (_req, res) => {
  const rows2 = await db.select({
    id: user_violations.id,
    user_id: user_violations.user_id,
    user_name: sql8`COALESCE(${users.display_name_ar}, ${users.display_name}, ${users.username}, 'مستخدم')`,
    title: user_violations.title,
    details: user_violations.details,
    created_at: user_violations.created_at,
    acknowledged_at: user_violations.acknowledged_at
  }).from(user_violations).innerJoin(users, eq7(user_violations.user_id, users.id)).orderBy(desc2(user_violations.created_at), desc2(user_violations.id)).limit(500);
  res.json(rows2);
}));
router2.post("/admin/violations", admin, handle2(async (req, res) => {
  const input = violationInput2.parse(req.body);
  const user = await db.select({ id: users.id }).from(users).where(and3(eq7(users.id, input.user_id), eq7(users.status, "active"))).limit(1);
  if (!user[0]) throw httpError("\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0645\u062D\u062F\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0623\u0648 \u063A\u064A\u0631 \u0646\u0634\u0637", 404);
  const [created] = await db.insert(user_violations).values(input).returning({
    id: user_violations.id,
    user_id: user_violations.user_id,
    title: user_violations.title,
    details: user_violations.details,
    created_at: user_violations.created_at,
    acknowledged_at: user_violations.acknowledged_at
  });
  res.status(201).json(created);
}));
var self_service_default = router2;

// server/production/routes.ts
import { Router as Router4 } from "express";
import { z as z5 } from "zod";
import QRCode from "qrcode";

// shared/production.ts
var productionPermissions = [
  "view_production",
  "manage_production",
  "operate_film",
  "operate_printing",
  "operate_cutting",
  "view_production_hall",
  "receive_production",
  "view_finished_inventory",
  "manage_finished_warehouse"
];
var hasProductionPermission = (user, ...keys) => user.permissions.includes("admin") || keys.some((key) => user.permissions.includes(key));
function machineStage(type) {
  const normalized = String(type ?? "").toLowerCase();
  return normalized === "extruder" ? "film" : ["printer", "printing"].includes(normalized) ? "printing" : ["cutter", "cutting"].includes(normalized) ? "cutting" : null;
}
function isPlasticRoll(name, nameAr) {
  return /plastic\s*roll|رولات?\s*(?:بلاستيك|بلاستيكية)|رول\s*بلاستيك/i.test(`${name ?? ""} ${nameAr ?? ""}`);
}
function kgHundredths(value) {
  if (!/^\d{1,12}(?:\.\d{1,2})?$/.test(value)) throw new Error("Invalid quantity");
  const [whole, decimals = ""] = value.split(".");
  return BigInt(whole) * 100n + BigInt(decimals.padEnd(2, "0"));
}
var kgString = (value) => `${value / 100n}.${String(value % 100n).padStart(2, "0")}`;
var stageAfterFilm = (printed, rollProduct, inlinePrinted) => rollProduct && (!printed || inlinePrinted) ? "done" : printed && inlinePrinted ? "printing" : "film";
var stageAfterPrinting = (rollProduct) => rollProduct ? "done" : "printing";
var eligibleForCutting = (roll) => !roll.is_roll_product && roll.stage !== "done" && (!roll.is_printed || !!roll.printed_at);
function packagingMatches(quantityKg, input) {
  if (!/^\d{1,8}(?:\.\d{1,4})?$/.test(input.roll_weight_grams) || !Number.isSafeInteger(input.rolls_per_unit) || input.rolls_per_unit <= 0 || !Number.isSafeInteger(input.units) || input.units <= 0) return false;
  const [whole, fraction = ""] = input.roll_weight_grams.split(".");
  const gramTenThousandths = BigInt(whole) * 10000n + BigInt(fraction.padEnd(4, "0"));
  if (gramTenThousandths <= 0n) return false;
  const expected = gramTenThousandths * BigInt(input.rolls_per_unit) * BigInt(input.units);
  const actual = kgHundredths(quantityKg) * 100000n;
  const difference = expected > actual ? expected - actual : actual - expected;
  return difference * 100n <= expected * 2n + 10000000n;
}

// server/production/core.ts
import { createHash } from "node:crypto";

// server/production/read-queries.ts
var filmMachineGroups = (orderId, machineId) => `SELECT
  fr.film_machine_id machine_id,m.name machine_name,m.name_ar machine_name_ar,
  count(*)::int roll_count,min(fr.created_at) first_roll_at,max(fr.created_at) last_roll_at,
  CASE WHEN count(*)<2 THEN NULL ELSE greatest(0,floor(extract(epoch FROM
    max(fr.created_at)-min(fr.created_at)))) END duration_seconds,
  sum(fr.weight_kg) produced,sum(fr.waste_kg) waste,
  sum(CASE WHEN fr.stage='done' THEN fr.weight_kg ELSE 0 END) ready_roll,
  sum(CASE WHEN fr.stage='done' THEN fr.net_weight_kg ELSE 0 END) ready_net
  FROM factory_rolls fr LEFT JOIN machines m ON m.id=fr.film_machine_id
  WHERE fr.production_order_id=${orderId}${machineId ? ` AND fr.film_machine_id=${machineId}` : ""}
  GROUP BY fr.film_machine_id,m.name,m.name_ar`;
var filmDurationJSON = `jsonb_build_object('machine_id',g.machine_id,
  'machine_name',g.machine_name,'machine_name_ar',g.machine_name_ar,'roll_count',g.roll_count,
  'first_roll_at',g.first_roll_at,'last_roll_at',g.last_roll_at,'duration_seconds',g.duration_seconds)`;
var productionActorJSON = (alias) => `CASE WHEN ${alias}.id IS NULL THEN NULL
  ELSE jsonb_build_object('id',${alias}.id,'display_name',${alias}.display_name,
    'display_name_ar',${alias}.display_name_ar,'full_name',${alias}.full_name,
    'username',${alias}.username) END`;
var masterBatchJSON = `CASE WHEN mb.id IS NULL THEN NULL ELSE jsonb_build_object(
  'id',mb.id,'name',mb.name,'name_ar',mb.name_ar,'color_hex',mb.color_hex) END`;
var liveProduct = `jsonb_build_object('id',cp.id,'item_id',cp.item_id,'name',i.name,'name_ar',i.name_ar,
  'customer_name',c.name,'customer_name_ar',c.name_ar,'width',cp.width::text,
  'left_facing',cp.left_facing::text,'right_facing',cp.right_facing::text,
  'universal_thickness',cp.universal_thickness::text,'cutting_length_cm',cp.cutting_length_cm,
  'raw_material',cp.raw_material,'printing_cylinder',cp.printing_cylinder,'punching',cp.punching,
   'notes',cp.notes,'front_print_colors',cp.front_print_colors,'back_print_colors',cp.back_print_colors,
   'size_caption',cp.size_caption,'plate_drawer_code',c.plate_drawer_code,'master_batch',${masterBatchJSON})`;
var displayedProduct = `e.product ||
  CASE WHEN e.product ? 'size_caption' THEN '{}'::jsonb ELSE jsonb_build_object('size_caption',
    CASE WHEN (e.product->>'width') IS NOT DISTINCT FROM cp.width::text
      AND (e.product->>'left_facing') IS NOT DISTINCT FROM cp.left_facing::text
      AND (e.product->>'right_facing') IS NOT DISTINCT FROM cp.right_facing::text
    THEN cp.size_caption ELSE NULL END) END ||
  CASE WHEN e.product ? 'master_batch' THEN '{}'::jsonb ELSE jsonb_build_object('master_batch',${masterBatchJSON}) END ||
  CASE WHEN e.product ? 'plate_drawer_code' THEN '{}'::jsonb ELSE jsonb_build_object('plate_drawer_code',c.plate_drawer_code) END`;
var orderSelect = `SELECT p.id,p.order_id,p.production_order_number,p.customer_product_id,
  p.quantity_kg,p.final_quantity_kg,p.status,p.previous_status,p.batch_number,o.order_number,o.status order_status,
   CASE WHEN cp.id IS NULL THEN e.product WHEN e.product IS NULL THEN ${liveProduct}
     ELSE ${displayedProduct} END product,
  e.started_at,e.film_closed_at,e.completed_at,e.stage,COALESCE(e.is_printed,cp.is_printed,false) is_printed,
  COALESCE(e.is_roll_product,false) is_roll_product,
  COALESCE(r.produced,0)::text produced_kg,COALESCE(r.ready,0)::text ready_kg,COALESCE(r.waste,0)::text waste_kg,
  COALESCE(r.roll_count,0)::int roll_count,
  COALESCE(r.film_durations,'[]'::jsonb) film_durations,
  COALESCE(received.quantity,0)::text received_kg,(COALESCE(r.ready,0)-COALESCE(received.quantity,0))::text remaining_kg
  FROM selected s JOIN production_orders p ON p.id=s.id JOIN orders o ON o.id=p.order_id
  LEFT JOIN factory_execution e ON e.production_order_id=p.id
  LEFT JOIN customer_products cp ON cp.id=p.customer_product_id LEFT JOIN items i ON i.id=cp.item_id
  LEFT JOIN customers c ON c.id=o.customer_id
   LEFT JOIN master_batch_colors mb ON mb.id=cp.master_batch_id
  LEFT JOIN LATERAL (SELECT sum(g.produced) produced,sum(g.waste) waste,sum(g.roll_count) roll_count,
    sum(CASE WHEN e.is_roll_product THEN g.ready_roll ELSE g.ready_net END) ready,
    jsonb_agg(${filmDurationJSON} ORDER BY g.first_roll_at,g.machine_id) film_durations
    FROM (${filmMachineGroups("p.id")}) g) r ON true
  LEFT JOIN LATERAL (SELECT sum(quantity_kg) quantity FROM factory_receipt_items WHERE production_order_id=p.id) received ON true
  ORDER BY p.id DESC`;
var rollSelect = `SELECT r.*,p.production_order_number,p.batch_number,p.status production_order_status,
  o.order_number,o.status order_status,e.stage production_stage,e.product,e.is_printed,e.is_roll_product,
  ${productionActorJSON("roll_creator")} created_actor
  FROM factory_rolls r JOIN production_orders p ON p.id=r.production_order_id
  JOIN orders o ON o.id=p.order_id JOIN factory_execution e ON e.production_order_id=r.production_order_id
  LEFT JOIN users roll_creator ON roll_creator.id=r.created_by`;
var receiptSelect = `SELECT r.*,COALESCE((SELECT jsonb_agg(to_jsonb(ri)||jsonb_build_object(
  'production_order_number',p.production_order_number,'location_name',l.name,'location_name_ar',l.name_ar) ORDER BY ri.id)
  FROM factory_receipt_items ri JOIN production_orders p ON p.id=ri.production_order_id
  JOIN factory_locations l ON l.id=ri.location_id WHERE ri.receipt_id=r.id),'[]'::jsonb) items
  FROM factory_receipts r`;
var inventorySelect = `SELECT inv.*,p.production_order_number,p.batch_number,p.status production_order_status,e.product,
  l.name location_name,l.name_ar location_name_ar FROM factory_inventory inv
  JOIN factory_execution e ON e.production_order_id=inv.production_order_id
  JOIN production_orders p ON p.id=inv.production_order_id JOIN factory_locations l ON l.id=inv.location_id`;
var movementSelect = `SELECT m.*,r.voucher_number,ri.production_order_id,ri.location_id,p.production_order_number
  FROM factory_movements m JOIN factory_receipts r ON r.id=m.receipt_id
  JOIN factory_receipt_items ri ON ri.id=m.receipt_item_id JOIN production_orders p ON p.id=ri.production_order_id`;

// server/production/core.ts
var ProductionError = class extends Error {
  constructor(message, message_en, status = 409) {
    super(message);
    this.message = message;
    this.message_en = message_en;
    this.status = status;
  }
};
function permission(user, ...keys) {
  if (!hasProductionPermission(user, ...keys)) throw new ProductionError("\u0644\u0627 \u062A\u0645\u0644\u0643 \u0635\u0644\u0627\u062D\u064A\u0629 \u062A\u0646\u0641\u064A\u0630 \u0647\u0630\u0627 \u0627\u0644\u0625\u062C\u0631\u0627\u0621", "You do not have permission for this action.", 403);
}
async function rows(tx, query, params = []) {
  return (await tx.query(query, params)).rows;
}
async function one(tx, query, params = []) {
  const [row] = await rows(tx, query, params);
  if (!row) throw new ProductionError("\u0627\u0644\u0633\u062C\u0644 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F", "The record was not found.", 404);
  return row;
}
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).filter(([key]) => key !== "request_id").sort(([a], [b]) => a.localeCompare(b)).map(([key, val]) => `${JSON.stringify(key)}:${canonical(val)}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
async function mutate(pool2, actor, operation, input, action) {
  const tx = await pool2.connect();
  try {
    await tx.query("BEGIN");
    await tx.query("SET LOCAL lock_timeout = '12s'");
    await tx.query("SET LOCAL statement_timeout = '25s'");
    await tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`factory-request:${actor.id}:${input.request_id}`]);
    const fingerprint = createHash("sha256").update(canonical(input)).digest("hex");
    const [previous] = await rows(
      tx,
      "SELECT operation, fingerprint, result FROM factory_operations WHERE actor_id=$1 AND request_id=$2",
      [actor.id, input.request_id]
    );
    if (previous) {
      if (previous.operation !== operation || previous.fingerprint !== fingerprint)
        throw new ProductionError("\u0645\u0641\u062A\u0627\u062D \u0627\u0644\u0639\u0645\u0644\u064A\u0629 \u0645\u0633\u062A\u062E\u062F\u0645 \u0628\u0628\u064A\u0627\u0646\u0627\u062A \u0645\u062E\u062A\u0644\u0641\u0629", "This operation key was already used with different data.");
      await tx.query("COMMIT");
      return previous.result;
    }
    const result = await action(tx);
    await tx.query(
      "INSERT INTO factory_operations(actor_id,request_id,operation,fingerprint,result) VALUES($1,$2,$3,$4,$5::jsonb)",
      [actor.id, input.request_id, operation, fingerprint, JSON.stringify(result)]
    );
    await tx.query("COMMIT");
    return result;
  } catch (error) {
    await tx.query("ROLLBACK").catch(() => {
    });
    throw error;
  } finally {
    tx.release();
  }
}
async function lockOrders2(tx, ids, running = true) {
  const sorted = [...new Set(ids)].sort((a, b) => a - b);
  const references = await rows(tx, "SELECT id,order_id FROM production_orders WHERE id=ANY($1::int[])", [sorted]);
  if (references.length !== sorted.length) throw new ProductionError("\u0623\u0645\u0631 \u0627\u0644\u0625\u0646\u062A\u0627\u062C \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F", "A production order was not found.", 404);
  const parentIds = [...new Set(references.map((p) => p.order_id))].sort((a, b) => a - b);
  await tx.query("SELECT id FROM orders WHERE id=ANY($1::int[]) ORDER BY id FOR UPDATE", [parentIds]);
  const records = await rows(tx, `SELECT p.*,o.status order_status,o.customer_id,
    EXISTS(SELECT 1 FROM order_number_allocations a WHERE a.order_number=o.order_number) compact_roll_numbering
    FROM production_orders p
    JOIN orders o ON o.id=p.order_id WHERE p.id=ANY($1::int[]) ORDER BY p.id FOR UPDATE OF p`, [sorted]);
  if (records.length !== sorted.length || records.some((p) => p.order_id !== references.find((r) => r.id === p.id)?.order_id))
    throw new ProductionError("\u062A\u063A\u064A\u0631 \u0627\u0644\u0637\u0644\u0628 \u0627\u0644\u0645\u0631\u062A\u0628\u0637\u061B \u0623\u0639\u062F \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0635\u0641\u062D\u0629", "The parent order changed. Reload the page.");
  if (running && records.some((p) => !["for_production", "in_production"].includes(p.order_status) || ["cancelled", "archived", "completed"].includes(p.status)))
    throw new ProductionError("\u0627\u0644\u0637\u0644\u0628 \u0645\u062A\u0648\u0642\u0641 \u0623\u0648 \u063A\u064A\u0631 \u0642\u0627\u0628\u0644 \u0644\u0644\u062A\u0646\u0641\u064A\u0630\u061B \u0631\u0627\u062C\u0639 \u062D\u0627\u0644\u062A\u0647 \u0623\u0648\u0644\u0627\u064B", "The order is paused or not executable. Check its status first.");
  return records;
}
async function execution(tx, id2) {
  return one(tx, "SELECT * FROM factory_execution WHERE production_order_id=$1", [id2]);
}
async function productSnapshot(tx, order) {
  const row = await one(tx, `
    SELECT jsonb_build_object('id',cp.id,'item_id',cp.item_id,'name',i.name,'name_ar',i.name_ar,
      'customer_name',c.name,'customer_name_ar',c.name_ar,'width',cp.width::text,
      'left_facing',cp.left_facing::text,'right_facing',cp.right_facing::text,
      'universal_thickness',cp.universal_thickness::text,'cutting_length_cm',cp.cutting_length_cm,
      'raw_material',cp.raw_material,'printing_cylinder',cp.printing_cylinder,'punching',cp.punching,
      'notes',cp.notes,'plate_drawer_code',c.plate_drawer_code,'front_print_colors',cp.front_print_colors,'back_print_colors',cp.back_print_colors,
      'size_caption',cp.size_caption,'master_batch',${masterBatchJSON}) product,
      COALESCE(cp.is_printed,false) is_printed,cp.status
    FROM customer_products cp JOIN items i ON i.id=cp.item_id JOIN customers c ON c.id=cp.customer_id
    LEFT JOIN master_batch_colors mb ON mb.id=cp.master_batch_id
    WHERE cp.id=$1 AND cp.customer_id=$2 FOR SHARE OF cp,i,c`, [order.customer_product_id, order.customer_id]);
  if (row.status !== "active") throw new ProductionError("\u0645\u0646\u062A\u062C \u0627\u0644\u0639\u0645\u064A\u0644 \u063A\u064A\u0631 \u0646\u0634\u0637", "The customer product is inactive.");
  return row;
}
async function available(tx, id2) {
  return one(tx, `
    SELECT COALESCE(sum(r.weight_kg),0)::text produced,
      COALESCE(sum(CASE WHEN r.stage='done' THEN CASE WHEN e.is_roll_product THEN r.weight_kg ELSE r.net_weight_kg END ELSE 0 END),0)::text ready,
      (SELECT COALESCE(sum(quantity_kg),0)::text FROM factory_receipt_items WHERE production_order_id=$1) received,
      count(r.id)::int count FROM factory_execution e LEFT JOIN factory_rolls r ON r.production_order_id=e.production_order_id
      WHERE e.production_order_id=$1`, [id2]);
}

// server/production/machines.ts
async function machine(tx, id2, stage, product) {
  const selected = await one(tx, "SELECT * FROM machines WHERE id=$1 FOR SHARE", [id2]);
  if (machineStage(selected.type) !== stage || selected.status !== "active")
    throw new ProductionError("\u0627\u062E\u062A\u0631 \u0645\u0627\u0643\u064A\u0646\u0629 \u0646\u0634\u0637\u0629 \u0645\u0646 \u0646\u0648\u0639 \u0627\u0644\u0645\u0631\u062D\u0644\u0629 \u0627\u0644\u0635\u062D\u064A\u062D", "Select an active machine of the correct stage type.");
  const inRange = (value, min, max) => {
    if (min == null && max == null) return true;
    const n = value == null ? NaN : Number(value);
    return Number.isFinite(n) && (min == null || n >= Number(min)) && (max == null || n <= Number(max));
  };
  if (stage !== "cutting" && !inRange(product.width, selected.min_width_cm, selected.max_width_cm) || stage === "film" && !inRange(product.universal_thickness, selected.min_thickness, selected.max_thickness) || stage === "cutting" && !inRange(product.cutting_length_cm, selected.min_length_cm, selected.max_length_cm) || stage === "printing" && !inRange(product.printing_cylinder, selected.min_cylinder_inch, selected.max_cylinder_inch))
    throw new ProductionError("\u0645\u0648\u0627\u0635\u0641\u0627\u062A \u0627\u0644\u0645\u0646\u062A\u062C \u062E\u0627\u0631\u062C \u062D\u062F\u0648\u062F \u0627\u0644\u0645\u0627\u0643\u064A\u0646\u0629 \u0623\u0648 \u063A\u064A\u0631 \u0645\u0643\u062A\u0645\u0644\u0629", "The product specifications are missing or outside the machine limits.");
  if (stage === "film" && selected.raw_material_type && selected.raw_material_type !== "MIX" && selected.raw_material_type !== product.raw_material)
    throw new ProductionError("\u0627\u0644\u0645\u0627\u062F\u0629 \u0627\u0644\u062E\u0627\u0645 \u0644\u0627 \u062A\u0637\u0627\u0628\u0642 \u0627\u0644\u0645\u0627\u0643\u064A\u0646\u0629", "The raw material is incompatible with this machine.");
  if (stage === "printing" && selected.max_print_colors != null && Math.max(product.front_print_colors?.length ?? 0, product.back_print_colors?.length ?? 0) > selected.max_print_colors)
    throw new ProductionError("\u0639\u062F\u062F \u0623\u0644\u0648\u0627\u0646 \u0627\u0644\u0645\u0646\u062A\u062C \u064A\u062A\u062C\u0627\u0648\u0632 \u0633\u0639\u0629 \u0627\u0644\u0637\u0627\u0628\u0639\u0629", "The product has more colors than this printer supports.");
  return selected;
}

// server/production/execution.ts
var ProductionExecutionService = class {
  constructor(pool2) {
    this.pool = pool2;
  }
  start(actor, id2, input) {
    permission(actor, "manage_production", "operate_film");
    return mutate(this.pool, actor, `start:${id2}`, input, async (tx) => {
      const [order] = await lockOrders2(tx, [id2]);
      if (order.status !== "pending" || order.batch_number || order.previous_status && order.previous_status !== "pending" || (await rows(tx, "SELECT 1 FROM factory_execution WHERE production_order_id=$1", [id2])).length)
        throw new ProductionError("\u0623\u0645\u0631 \u0627\u0644\u0625\u0646\u062A\u0627\u062C \u0628\u062F\u0623 \u0633\u0627\u0628\u0642\u0627\u064B \u0623\u0648 \u062A\u0627\u0631\u064A\u062E\u064A \u063A\u064A\u0631 \u0642\u0627\u0628\u0644 \u0644\u0644\u0628\u062F\u0621", "The production order is already started or is a historical record.");
      if (kgHundredths(order.final_quantity_kg) <= 0n) throw new ProductionError("\u0627\u0644\u0647\u062F\u0641 \u0627\u0644\u0645\u062E\u0637\u0637 \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0645\u0648\u062C\u0628\u0627\u064B", "The planned target must be positive.", 400);
      const { product, is_printed } = await productSnapshot(tx, order);
      const rollProduct = isPlasticRoll(product.name, product.name_ar);
      await tx.query(`INSERT INTO factory_execution(production_order_id,customer_product_id,item_id,product,is_printed,is_roll_product,started_by)
        VALUES($1,$2,$3,$4::jsonb,$5,$6,$7)`, [id2, product.id, product.item_id, JSON.stringify(product), is_printed, rollProduct, actor.id]);
      await tx.query("UPDATE production_orders SET status='active' WHERE id=$1", [id2]);
      await tx.query("UPDATE orders SET status='in_production' WHERE id=$1", [order.order_id]);
      return { production_order_id: id2, started: true };
    });
  }
  film(actor, id2, input) {
    permission(actor, "operate_film");
    return mutate(this.pool, actor, `film:${id2}`, input, async (tx) => {
      const [order] = await lockOrders2(tx, [id2]);
      const exec = await execution(tx, id2);
      if (exec.film_closed_at) throw new ProductionError("\u0627\u0644\u0641\u064A\u0644\u0645 \u0645\u063A\u0644\u0642\u061B \u0644\u0627 \u064A\u0645\u0643\u0646 \u0625\u0636\u0627\u0641\u0629 \u0631\u0648\u0644\u0627\u062A", "Film is closed. No more rolls can be added.");
      const filmMachine = await machine(tx, input.machine_id, "film", exec.product);
      const amount = kgHundredths(input.weight_kg);
      const totals = await available(tx, id2);
      if (amount <= 0n || kgHundredths(totals.produced) + amount > kgHundredths(order.final_quantity_kg))
        throw new ProductionError("\u0648\u0632\u0646 \u0627\u0644\u0631\u0648\u0644 \u0645\u0648\u062C\u0628 \u0648\u0644\u0627 \u064A\u062A\u062C\u0627\u0648\u0632 \u0627\u0644\u0645\u062A\u0628\u0642\u064A \u0645\u0646 \u0627\u0644\u0647\u062F\u0641 \u0627\u0644\u0645\u062E\u0637\u0637", "Roll weight must be positive and within the remaining planned target.", 400);
      let printerId = null;
      if (input.inline_printed) {
        if (!exec.is_printed || !filmMachine.inline_printer_id)
          throw new ProductionError("\u0627\u0644\u0625\u0646\u0644\u0627\u064A\u0646 \u064A\u062A\u0637\u0644\u0628 \u0645\u0646\u062A\u062C\u0627\u064B \u0645\u0637\u0628\u0648\u0639\u0627\u064B \u0648\u0637\u0627\u0628\u0639\u0629 \u0645\u0631\u062A\u0628\u0637\u0629", "Inline printing requires a printed product and a linked printer.", 400);
        printerId = (await machine(tx, filmMachine.inline_printer_id, "printing", exec.product)).id;
      }
      const seq = (await one(tx, "SELECT COALESCE(max(sequence),0)+1 next FROM factory_rolls WHERE production_order_id=$1", [id2])).next;
      const { at } = await one(tx, "SELECT clock_timestamp() at");
      const roll = await one(
        tx,
        `INSERT INTO factory_rolls
        (production_order_id,sequence,roll_number,weight_kg,stage,film_machine_id,created_by,is_last_roll,
          printing_machine_id,printed_by,printed_at,created_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::varchar,$10,CASE WHEN $9::varchar IS NULL THEN NULL ELSE $11::timestamptz END,$11) RETURNING *`,
        [
          id2,
          seq,
          productionRollNumber(order.production_order_number, seq, order.compact_roll_numbering === true),
          kgString(amount),
          stageAfterFilm(exec.is_printed, exec.is_roll_product, !!printerId),
          filmMachine.id,
          actor.id,
          input.is_last_roll ?? false,
          printerId,
          printerId ? actor.id : null,
          at
        ]
      );
      if (input.is_last_roll) await this.close(tx, id2, actor.id);
      await recompute(tx, order);
      return roll;
    });
  }
  closeFilm(actor, id2, input) {
    permission(actor, "operate_film");
    return mutate(this.pool, actor, `close-film:${id2}`, input, async (tx) => {
      const [order] = await lockOrders2(tx, [id2]);
      const exec = await execution(tx, id2);
      if (exec.film_closed_at) throw new ProductionError("\u0627\u0644\u0641\u064A\u0644\u0645 \u0645\u063A\u0644\u0642 \u0645\u0633\u0628\u0642\u0627\u064B", "Film is already closed.");
      if (!(await available(tx, id2)).count) throw new ProductionError("\u0644\u0627 \u064A\u0645\u0643\u0646 \u0625\u063A\u0644\u0627\u0642 \u0627\u0644\u0641\u064A\u0644\u0645 \u062F\u0648\u0646 \u0631\u0648\u0644\u0627\u062A \u062D\u0642\u064A\u0642\u064A\u0629", "Film cannot close without real rolls.", 400);
      await this.close(tx, id2, actor.id);
      await recompute(tx, order);
      return { production_order_id: id2, film_closed: true };
    });
  }
  close(tx, id2, actorId) {
    return tx.query("UPDATE factory_execution SET film_closed_at=clock_timestamp(),film_closed_by=$2 WHERE production_order_id=$1", [id2, actorId]);
  }
  print(actor, id2, input) {
    permission(actor, "operate_printing");
    return mutate(this.pool, actor, `print:${id2}`, input, async (tx) => {
      const ref = await one(tx, "SELECT production_order_id FROM factory_rolls WHERE id=$1", [id2]);
      const [order] = await lockOrders2(tx, [ref.production_order_id]);
      const exec = await execution(tx, order.id);
      const roll = await one(tx, "SELECT * FROM factory_rolls WHERE id=$1 FOR UPDATE", [id2]);
      if (!exec.is_printed || roll.printed_at || roll.stage !== "film")
        throw new ProductionError("\u0627\u0644\u0631\u0648\u0644 \u063A\u064A\u0631 \u0645\u0624\u0647\u0644 \u0644\u0644\u0637\u0628\u0627\u0639\u0629 \u0623\u0648 \u0637\u064F\u0628\u0639 \u0633\u0627\u0628\u0642\u0627\u064B", "This roll is not eligible for printing or was already printed.");
      await machine(tx, input.machine_id, "printing", exec.product);
      const updated = await one(tx, `UPDATE factory_rolls SET stage=$2,printing_machine_id=$3,
        printed_by=$4,printed_at=clock_timestamp() WHERE id=$1 RETURNING *`, [id2, stageAfterPrinting(exec.is_roll_product), input.machine_id, actor.id]);
      await recompute(tx, order);
      return updated;
    });
  }
  cut(actor, id2, input) {
    permission(actor, "operate_cutting");
    return mutate(this.pool, actor, `cut:${id2}`, input, async (tx) => {
      const ref = await one(tx, "SELECT production_order_id FROM factory_rolls WHERE id=$1", [id2]);
      const [order] = await lockOrders2(tx, [ref.production_order_id]);
      const exec = await execution(tx, order.id);
      const roll = await one(tx, "SELECT * FROM factory_rolls WHERE id=$1 FOR UPDATE", [id2]);
      if (!eligibleForCutting({ ...roll, is_printed: exec.is_printed, is_roll_product: exec.is_roll_product }) || roll.cut_completed_at)
        throw new ProductionError("\u0627\u0644\u0631\u0648\u0644 \u063A\u064A\u0631 \u0645\u0624\u0647\u0644 \u0644\u0644\u0642\u0635 \u0623\u0648 \u0642\u064F\u0635 \u0633\u0627\u0628\u0642\u0627\u064B", "This roll is not eligible for cutting or was already cut.");
      const net = kgHundredths(input.net_weight_kg), gross = kgHundredths(roll.weight_kg);
      if (net <= 0n || net > gross) throw new ProductionError("\u0627\u0644\u0635\u0627\u0641\u064A \u0645\u0648\u062C\u0628 \u0648\u0644\u0627 \u064A\u062A\u062C\u0627\u0648\u0632 \u0648\u0632\u0646 \u0627\u0644\u0641\u064A\u0644\u0645", "Net weight must be positive and no greater than film weight.", 400);
      await machine(tx, input.machine_id, "cutting", exec.product);
      const updated = await one(
        tx,
        `UPDATE factory_rolls SET stage='done',cutting_machine_id=$2,cut_by=$3,
        cut_completed_at=clock_timestamp(),net_weight_kg=$4,waste_kg=$5 WHERE id=$1 RETURNING *`,
        [id2, input.machine_id, actor.id, kgString(net), kgString(gross - net)]
      );
      await recompute(tx, order);
      return updated;
    });
  }
  queue(actor, input) {
    permission(actor, "manage_production");
    return mutate(this.pool, actor, "queue", input, async (tx) => {
      await tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`factory-queue:${input.stage}`]);
      const [order] = await lockOrders2(tx, [input.production_order_id]);
      const [exec] = await rows(tx, "SELECT * FROM factory_execution WHERE production_order_id=$1", [order.id]);
      const liveProduct2 = exec ? null : await productSnapshot(tx, order);
      const product = exec?.product ?? liveProduct2.product;
      const printed = exec?.is_printed ?? liveProduct2.is_printed;
      const rollProduct = exec?.is_roll_product ?? isPlasticRoll(product.name, product.name_ar);
      if (input.stage === "printing" && !printed || input.stage === "cutting" && rollProduct || input.stage === "film" && exec?.film_closed_at || exec?.completed_at)
        throw new ProductionError("\u0627\u0644\u0645\u0631\u062D\u0644\u0629 \u063A\u064A\u0631 \u0645\u0637\u0644\u0648\u0628\u0629 \u0644\u0647\u0630\u0627 \u0627\u0644\u0645\u0646\u062A\u062C \u0623\u0648 \u0645\u063A\u0644\u0642\u0629", "This stage is not required for this product or is closed.", 400);
      if (exec?.film_closed_at && input.stage !== "film") {
        const rolls = await rows(
          tx,
          "SELECT stage,printed_at,cut_completed_at FROM factory_rolls WHERE production_order_id=$1",
          [order.id]
        );
        const remaining = rolls.some((roll) => input.stage === "printing" ? roll.stage === "film" && !roll.printed_at : eligibleForCutting({ ...roll, is_printed: printed, is_roll_product: rollProduct }) && !roll.cut_completed_at);
        if (!remaining)
          throw new ProductionError("\u0644\u0627 \u064A\u0648\u062C\u062F \u0639\u0645\u0644 \u0645\u0624\u0647\u0644 \u0645\u062A\u0628\u0642\u064D \u0644\u0647\u0630\u0647 \u0627\u0644\u0645\u0631\u062D\u0644\u0629", "There is no eligible work remaining for this stage.", 400);
      }
      await machine(tx, input.machine_id, input.stage, product);
      const saved = await one(
        tx,
        `INSERT INTO factory_queues(production_order_id,stage,machine_id,position,updated_by)
        VALUES($1,$2,$3,$4,$5) ON CONFLICT(production_order_id,stage) DO UPDATE SET
        machine_id=excluded.machine_id,position=excluded.position,updated_by=excluded.updated_by,updated_at=clock_timestamp() RETURNING *`,
        [order.id, input.stage, input.machine_id, input.position, actor.id]
      );
      const siblings = await rows(tx, `SELECT id FROM factory_queues
        WHERE stage=$1 AND machine_id=$2 AND id<>$3 ORDER BY position,id FOR UPDATE`, [input.stage, input.machine_id, saved.id]);
      siblings.splice(Math.min(input.position - 1, siblings.length), 0, saved);
      await normalizeQueue(tx, siblings);
      return one(tx, "SELECT * FROM factory_queues WHERE id=$1", [saved.id]);
    });
  }
  removeQueue(actor, id2, input) {
    permission(actor, "manage_production");
    return mutate(this.pool, actor, `remove-queue:${id2}`, input, async (tx) => {
      const queue = await one(tx, "SELECT production_order_id,stage FROM factory_queues WHERE id=$1", [id2]);
      await tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`factory-queue:${queue.stage}`]);
      await lockOrders2(tx, [queue.production_order_id], false);
      await tx.query("DELETE FROM factory_queues WHERE id=$1", [id2]);
      return { removed: true };
    });
  }
  reorderQueue(actor, input) {
    permission(actor, "manage_production");
    return mutate(this.pool, actor, "reorder-queue", input, async (tx) => {
      if (input.first_id === input.second_id) throw new ProductionError("\u0627\u062E\u062A\u0631 \u0628\u0646\u062F\u064A\u0646 \u0645\u062E\u062A\u0644\u0641\u064A\u0646", "Select two different queue entries.", 400);
      const refs = await rows(
        tx,
        "SELECT * FROM factory_queues WHERE id=ANY($1::int[])",
        [[input.first_id, input.second_id]]
      );
      if (refs.length !== 2 || refs[0].stage !== refs[1].stage || refs[0].machine_id !== refs[1].machine_id)
        throw new ProductionError("\u062A\u063A\u064A\u0631 \u0627\u0644\u0637\u0627\u0628\u0648\u0631\u061B \u0623\u0639\u062F \u062A\u062D\u0645\u064A\u0644\u0647", "The queue changed. Reload it.");
      await tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`factory-queue:${refs[0].stage}`]);
      await lockOrders2(tx, refs.map((r) => r.production_order_id));
      const siblings = await rows(tx, `SELECT id,position FROM factory_queues
        WHERE stage=$1 AND machine_id=$2 ORDER BY position,id FOR UPDATE`, [refs[0].stage, refs[0].machine_id]);
      const a = siblings.findIndex((q) => q.id === input.first_id), b = siblings.findIndex((q) => q.id === input.second_id);
      if (a < 0 || b < 0 || siblings[a].position !== input.first_position || siblings[b].position !== input.second_position)
        throw new ProductionError("\u062A\u063A\u064A\u0631 \u062A\u0631\u062A\u064A\u0628 \u0627\u0644\u0637\u0627\u0628\u0648\u0631\u061B \u0623\u0639\u062F \u062A\u062D\u0645\u064A\u0644\u0647", "The queue positions changed. Reload it.");
      [siblings[a], siblings[b]] = [siblings[b], siblings[a]];
      await normalizeQueue(tx, siblings);
      return { reordered: true };
    });
  }
};
async function normalizeQueue(tx, siblings) {
  if (!siblings.length) return;
  await tx.query(`UPDATE factory_queues q SET position=rank.position FROM unnest($1::int[],$2::int[]) AS rank(id,position)
    WHERE q.id=rank.id`, [siblings.map((q) => q.id), siblings.map((_, index3) => index3 + 1)]);
}
async function recompute(tx, order) {
  const exec = await execution(tx, order.id);
  const rolls = await rows(tx, "SELECT * FROM factory_rolls WHERE production_order_id=$1", [order.id]);
  const completed = !!exec.film_closed_at && rolls.length > 0 && rolls.every((r) => r.stage === "done");
  const stage = !exec.film_closed_at ? "film" : completed ? "completed" : exec.is_printed && rolls.some((r) => !r.printed_at) ? "printing" : "cutting";
  let batch = null;
  if (completed) {
    await tx.query("SELECT pg_advisory_xact_lock(hashtextextended('factory-batch-numbers',0))");
    do {
      batch = `FP-${(await one(tx, "SELECT nextval('factory_batch_number_seq')::text sequence")).sequence.padStart(8, "0")}`;
    } while ((await rows(tx, "SELECT 1 FROM production_orders WHERE batch_number=$1", [batch])).length);
  }
  await tx.query(`UPDATE factory_execution SET stage=$2,completed_at=CASE WHEN $3 THEN COALESCE(completed_at,clock_timestamp()) ELSE NULL END,
    batch_number=CASE WHEN $3 THEN COALESCE(batch_number,$4) ELSE NULL END WHERE production_order_id=$1`, [order.id, stage, completed, batch]);
  await tx.query(`UPDATE production_orders SET status=$2,batch_number=(SELECT batch_number FROM factory_execution WHERE production_order_id=$1)
    WHERE id=$1`, [order.id, completed ? "completed" : "active"]);
  if (exec.film_closed_at) await tx.query("DELETE FROM factory_queues WHERE production_order_id=$1 AND stage='film'", [order.id]);
  if (exec.is_printed && rolls.length && rolls.every((r) => !!r.printed_at) && exec.film_closed_at)
    await tx.query("DELETE FROM factory_queues WHERE production_order_id=$1 AND stage='printing'", [order.id]);
  if (completed) {
    await tx.query("DELETE FROM factory_queues WHERE production_order_id=$1", [order.id]);
    await tx.query(`UPDATE orders SET status='completed' WHERE id=$1 AND status='in_production' AND
      NOT EXISTS(SELECT 1 FROM production_orders WHERE order_id=$1 AND status NOT IN ('completed','cancelled','archived'))`, [order.order_id]);
  }
}

// server/production/warehouse.ts
var ProductionWarehouseService = class {
  constructor(pool2) {
    this.pool = pool2;
  }
  receive(actor, input) {
    permission(actor, "receive_production");
    return mutate(this.pool, actor, "receive", input, async (tx) => {
      const orders2 = await lockOrders2(tx, input.items.map((i) => i.production_order_id), false);
      if (orders2.some((o) => ["cancelled", "archived", "delivered"].includes(o.order_status)))
        throw new ProductionError("\u0644\u0627 \u064A\u0645\u0643\u0646 \u0627\u0644\u0627\u0633\u062A\u0644\u0627\u0645 \u0644\u0637\u0644\u0628 \u0645\u0644\u063A\u064A \u0623\u0648 \u0645\u0624\u0631\u0634\u0641 \u0623\u0648 \u0645\u0633\u0644\u0651\u0645", "Cannot receive for a cancelled, archived or delivered order.");
      const pairs = input.items.map((i) => `${i.production_order_id}:${i.location_id}`);
      if (new Set(pairs).size !== pairs.length) throw new ProductionError("\u0628\u0646\u062F \u0627\u0644\u0627\u0633\u062A\u0644\u0627\u0645 \u0645\u0643\u0631\u0631", "A receipt line is duplicated.", 400);
      const locations = [...new Set(input.items.map((i) => i.location_id))].sort((a, b) => a - b);
      const existingLocations = await rows(
        tx,
        "SELECT id,is_active FROM factory_locations WHERE id=ANY($1::int[]) ORDER BY id FOR SHARE",
        [locations]
      );
      if (existingLocations.length !== locations.length || existingLocations.some((l) => !l.is_active))
        throw new ProductionError("\u0627\u062E\u062A\u0631 \u0645\u0648\u0627\u0642\u0639 \u062A\u062E\u0632\u064A\u0646 \u0646\u0634\u0637\u0629 \u0648\u0635\u062D\u064A\u062D\u0629 \u0644\u0643\u0644 \u0627\u0644\u0628\u0646\u0648\u062F", "Choose valid active storage locations for all lines.", 400);
      for (const order of orders2) {
        await execution(tx, order.id);
        const total = await available(tx, order.id);
        const requested = input.items.filter((i) => i.production_order_id === order.id).reduce((sum, i) => sum + kgHundredths(i.quantity_kg), 0n);
        if (requested > kgHundredths(total.ready) - kgHundredths(total.received))
          throw new ProductionError("\u0643\u0645\u064A\u0629 \u0627\u0644\u0627\u0633\u062A\u0644\u0627\u0645 \u062A\u062A\u062C\u0627\u0648\u0632 \u0627\u0644\u062C\u0627\u0647\u0632 \u0627\u0644\u0645\u062A\u0628\u0642\u064A\u061B \u0623\u0639\u062F \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0635\u0627\u0644\u0629", "Receipt quantity exceeds the remaining ready weight. Reload the hall.");
      }
      for (const item of input.items) {
        if (kgHundredths(item.quantity_kg) <= 0n) throw new ProductionError("\u0643\u0645\u064A\u0629 \u0627\u0644\u0627\u0633\u062A\u0644\u0627\u0645 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 \u0645\u0648\u062C\u0628\u0629", "Receipt weight must be positive.", 400);
        if (item.packaging && !packagingMatches(item.quantity_kg, item.packaging))
          throw new ProductionError("\u0648\u0632\u0646 \u0627\u0644\u062A\u0639\u0628\u0626\u0629 \u0644\u0627 \u064A\u0637\u0627\u0628\u0642 \u0627\u0644\u0627\u0633\u062A\u0644\u0627\u0645 \u0636\u0645\u0646 \xB12% \u0648\u0647\u0627\u0645\u0634 0.01 \u0643\u062C\u0645", "Packaging weight does not match receipt weight within \xB12% plus 0.01 kg.", 400);
      }
      const { id: id2 } = await one(tx, "SELECT nextval(pg_get_serial_sequence('factory_receipts','id'))::int id");
      const receipt = await one(
        tx,
        "INSERT INTO factory_receipts(id,voucher_number,created_by,notes) VALUES($1,$2,$3,$4) RETURNING *",
        [id2, `FR-${String(id2).padStart(8, "0")}`, actor.id, input.notes ?? null]
      );
      const savedItems = [];
      for (const item of input.items) {
        const exec = await execution(tx, item.production_order_id);
        const weight2 = kgString(kgHundredths(item.quantity_kg));
        const saved = await one(
          tx,
          `INSERT INTO factory_receipt_items
          (receipt_id,production_order_id,customer_product_id,item_id,location_id,quantity_kg,packaging)
          VALUES($1,$2,$3,$4,$5,$6,$7::jsonb) RETURNING *`,
          [id2, item.production_order_id, exec.customer_product_id, exec.item_id, item.location_id, weight2, item.packaging ? JSON.stringify(item.packaging) : null]
        );
        await tx.query(
          `INSERT INTO factory_inventory(production_order_id,customer_product_id,item_id,location_id,quantity_kg)
          VALUES($1,$2,$3,$4,$5) ON CONFLICT(customer_product_id,production_order_id,location_id) DO UPDATE
          SET quantity_kg=factory_inventory.quantity_kg+excluded.quantity_kg`,
          [item.production_order_id, exec.customer_product_id, exec.item_id, item.location_id, weight2]
        );
        await tx.query("INSERT INTO factory_movements(receipt_id,receipt_item_id,quantity_kg) VALUES($1,$2,$3)", [id2, saved.id, weight2]);
        savedItems.push(saved);
      }
      return { ...receipt, items: savedItems };
    });
  }
  location(actor, input, id2) {
    permission(actor, "manage_finished_warehouse");
    return mutate(this.pool, actor, `location:${id2 ?? "new"}`, input, (tx) => id2 ? one(tx, "UPDATE factory_locations SET name=$2,name_ar=$3,is_active=$4 WHERE id=$1 RETURNING *", [id2, input.name, input.name_ar, input.is_active ?? true]) : one(tx, "INSERT INTO factory_locations(name,name_ar,is_active) VALUES($1,$2,$3) RETURNING *", [input.name, input.name_ar, input.is_active ?? true]));
  }
};

// server/production/history.ts
async function historyPage(tx, kind, filter) {
  const params = [];
  const bind = (value) => {
    params.push(value);
    return `$${params.length}`;
  };
  const alias = { orders: "p", rolls: "r", receipts: "r", movements: "m", inventory: "inv" }[kind];
  const where = [];
  if (filter.before) where.push(`${alias}.id<${bind(filter.before)}`);
  const search = filter.search ? bind(`%${filter.search.replace(/[\\%_]/g, "\\$&")}%`) : null;
  const orderSearch = search ? `(p.production_order_number ILIKE ${search} OR o.order_number ILIKE ${search}
    OR p.batch_number ILIKE ${search} OR p.customer_product_id::text ILIKE ${search}
    OR COALESCE(e.product->>'name',i.name) ILIKE ${search} OR COALESCE(e.product->>'name_ar',i.name_ar) ILIKE ${search}
    OR COALESCE(e.product->>'customer_name',c.name) ILIKE ${search}
    OR COALESCE(e.product->>'customer_name_ar',c.name_ar) ILIKE ${search})` : "";
  let source;
  let select;
  let timestamp3;
  if (kind === "orders") {
    source = `production_orders p JOIN orders o ON o.id=p.order_id
      LEFT JOIN factory_execution e ON e.production_order_id=p.id
      LEFT JOIN customer_products cp ON cp.id=p.customer_product_id
      LEFT JOIN items i ON i.id=cp.item_id LEFT JOIN customers c ON c.id=o.customer_id`;
    select = orderSelect;
    timestamp3 = "e.started_at";
    if (search) where.push(orderSearch);
    if (filter.status) where.push(`p.status=${bind(filter.status)}`);
    if (filter.order_id) where.push(`p.id=${bind(filter.order_id)}`);
  } else if (kind === "rolls") {
    source = `factory_rolls r JOIN production_orders p ON p.id=r.production_order_id
      JOIN orders o ON o.id=p.order_id JOIN factory_execution e ON e.production_order_id=p.id
      LEFT JOIN customer_products cp ON cp.id=p.customer_product_id
      LEFT JOIN items i ON i.id=cp.item_id LEFT JOIN customers c ON c.id=o.customer_id`;
    select = `${rollSelect} JOIN selected s ON s.id=r.id ORDER BY r.id DESC`;
    timestamp3 = "r.created_at";
    if (search) where.push(`(r.roll_number ILIKE ${search} OR ${orderSearch})`);
    if (filter.status) where.push(`r.stage=${bind(filter.status)}`);
    if (filter.order_id) where.push(`p.id=${bind(filter.order_id)}`);
  } else if (kind === "receipts") {
    source = "factory_receipts r";
    select = `${receiptSelect} JOIN selected s ON s.id=r.id ORDER BY r.id DESC`;
    timestamp3 = "r.created_at";
    if (search) where.push(`(r.voucher_number ILIKE ${search} OR r.notes ILIKE ${search}
      OR EXISTS(SELECT 1 FROM factory_receipt_items ri JOIN production_orders p ON p.id=ri.production_order_id
        JOIN factory_execution e ON e.production_order_id=p.id JOIN orders o ON o.id=p.order_id
        WHERE ri.receipt_id=r.id AND (p.production_order_number ILIKE ${search}
          OR o.order_number ILIKE ${search} OR p.batch_number ILIKE ${search}
          OR e.product->>'name' ILIKE ${search} OR e.product->>'name_ar' ILIKE ${search}
          OR e.product->>'customer_name' ILIKE ${search} OR e.product->>'customer_name_ar' ILIKE ${search}
          OR ri.item_id ILIKE ${search} OR ri.customer_product_id::text ILIKE ${search})))`);
    const lineFilters = [];
    if (filter.order_id) lineFilters.push(`ri.production_order_id=${bind(filter.order_id)}`);
    if (filter.location_id) lineFilters.push(`ri.location_id=${bind(filter.location_id)}`);
    if (lineFilters.length) where.push(`EXISTS(SELECT 1 FROM factory_receipt_items ri WHERE ri.receipt_id=r.id AND ${lineFilters.join(" AND ")})`);
  } else if (kind === "movements") {
    source = `factory_movements m JOIN factory_receipts r ON r.id=m.receipt_id
      JOIN factory_receipt_items ri ON ri.id=m.receipt_item_id JOIN production_orders p ON p.id=ri.production_order_id
      JOIN factory_execution e ON e.production_order_id=p.id JOIN orders o ON o.id=p.order_id`;
    select = `${movementSelect} JOIN selected s ON s.id=m.id ORDER BY m.id DESC`;
    timestamp3 = "m.created_at";
    if (search) where.push(`(r.voucher_number ILIKE ${search} OR p.production_order_number ILIKE ${search}
      OR o.order_number ILIKE ${search} OR p.batch_number ILIKE ${search} OR ri.item_id ILIKE ${search}
      OR e.product->>'name' ILIKE ${search} OR e.product->>'name_ar' ILIKE ${search}
      OR e.product->>'customer_name' ILIKE ${search} OR e.product->>'customer_name_ar' ILIKE ${search})`);
    if (filter.order_id) where.push(`ri.production_order_id=${bind(filter.order_id)}`);
    if (filter.location_id) where.push(`ri.location_id=${bind(filter.location_id)}`);
  } else {
    source = `factory_inventory inv JOIN production_orders p ON p.id=inv.production_order_id
      JOIN factory_execution e ON e.production_order_id=p.id JOIN factory_locations l ON l.id=inv.location_id`;
    select = `${inventorySelect} JOIN selected s ON s.id=inv.id ORDER BY inv.id DESC`;
    timestamp3 = "e.started_at";
    if (search) where.push(`(p.production_order_number ILIKE ${search} OR p.batch_number ILIKE ${search}
      OR e.product->>'name' ILIKE ${search} OR e.product->>'name_ar' ILIKE ${search}
      OR e.product->>'customer_name' ILIKE ${search} OR e.product->>'customer_name_ar' ILIKE ${search}
      OR inv.item_id ILIKE ${search} OR l.name ILIKE ${search} OR l.name_ar ILIKE ${search})`);
    if (filter.order_id) where.push(`inv.production_order_id=${bind(filter.order_id)}`);
    if (filter.location_id) where.push(`inv.location_id=${bind(filter.location_id)}`);
  }
  if (filter.from) where.push(`${timestamp3}>=(${bind(filter.from)}::date::timestamp AT TIME ZONE 'Asia/Riyadh')`);
  if (filter.to) where.push(`${timestamp3}<((${bind(filter.to)}::date+1)::timestamp AT TIME ZONE 'Asia/Riyadh')`);
  const limit = Math.min(Math.max(filter.limit ?? 50, 1), 100);
  const records = await rows(tx, `WITH selected AS MATERIALIZED (
    SELECT ${alias}.id FROM ${source} ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY ${alias}.id DESC LIMIT ${bind(limit + 1)}
  ) ${select}`, params);
  const more = records.length > limit;
  if (more) records.pop();
  if (kind === "orders") records.forEach((order) => {
    if (!order.started_at) order.is_roll_product = isPlasticRoll(order.product?.name ?? null, order.product?.name_ar ?? null);
  });
  return { records, next: more ? records.at(-1).id : null };
}

// server/production/read.ts
var ProductionReadService = class {
  constructor(pool2) {
    this.pool = pool2;
  }
  async state(actor, scope = "management") {
    permission(actor, ...productionPermissions);
    const canProduction = hasProductionPermission(actor, ...productionKeys);
    const production = canProduction && !["hall", "warehouse", "roll"].includes(scope);
    const hall = ["management", "hall"].includes(scope) && hasProductionPermission(actor, "view_production_hall", "receive_production");
    const warehouse = ["management", "hall", "warehouse"].includes(scope) && hasProductionPermission(actor, "view_finished_inventory", "manage_finished_warehouse", "receive_production");
    return this.read(async (tx) => {
      const state = { orders: [], rolls: [], queues: [], machines: [], locations: [], inventory: [], movements: [], receipts: [] };
      if (production || hall) {
        const outstanding = scope === "management" || hall;
        state.orders = await rows(tx, `WITH ${outstanding ? `ready AS (
          SELECT r.production_order_id,sum(CASE WHEN e.is_roll_product THEN r.weight_kg ELSE r.net_weight_kg END) quantity
          FROM factory_rolls r JOIN factory_execution e ON e.production_order_id=r.production_order_id
          WHERE r.stage='done' GROUP BY r.production_order_id
        ), received AS (
          SELECT production_order_id,sum(quantity_kg) quantity FROM factory_receipt_items GROUP BY production_order_id
        ), outstanding AS (
          SELECT ready.production_order_id id FROM ready LEFT JOIN received USING(production_order_id)
          WHERE ready.quantity>COALESCE(received.quantity,0)
        ),` : ""} selected AS MATERIALIZED (
          ${outstanding ? `
          SELECT id FROM outstanding
          ${production ? "UNION" : ""}` : ""}
          ${production ? `SELECT p.id FROM production_orders p JOIN orders o ON o.id=p.order_id
            LEFT JOIN factory_execution e ON e.production_order_id=p.id
            WHERE (e.production_order_id IS NOT NULL AND e.completed_at IS NULL)
              OR (e.production_order_id IS NULL AND p.status NOT IN ('completed','cancelled','archived')
                AND o.status IN ('for_production','in_production'))
            UNION SELECT production_order_id FROM factory_queues` : ""}
        ) ${orderSelect}`);
        identifyRollProducts(state.orders);
      }
      if (production) {
        state.rolls = await rows(tx, `${rollSelect} WHERE ${scope === "film" ? "e.film_closed_at IS NULL AND e.completed_at IS NULL" : "r.stage<>'done'"}
          ${scope === "printing" ? "AND e.is_printed AND r.printed_at IS NULL" : ""}
          ${scope === "cutting" ? "AND NOT e.is_roll_product AND (NOT e.is_printed OR r.printed_at IS NOT NULL)" : ""}
          ORDER BY r.id DESC`);
        state.queues = await rows(tx, "SELECT * FROM factory_queues ORDER BY stage,machine_id,position,id");
      }
      if (production || scope === "roll" && canProduction) state.machines = await rows(tx, `SELECT id,name,name_ar,type,status,inline_printer_id,min_thickness,max_thickness,min_width_cm,max_width_cm FROM machines ORDER BY id`);
      if (warehouse || hall) state.locations = await rows(tx, "SELECT * FROM factory_locations ORDER BY id");
      state.totals = {
        orders: 0,
        rolls: 0,
        receipts: 0,
        movements: 0,
        inventory: 0,
        inventory_kg: "0",
        ...production && scope === "management" ? await one(tx, `SELECT (SELECT count(*)::int FROM production_orders) orders,
          (SELECT count(*)::int FROM factory_rolls) rolls`) : {},
        ...warehouse ? await one(tx, `SELECT (SELECT count(*)::int FROM factory_receipts) receipts,
          (SELECT count(*)::int FROM factory_movements) movements,count(*)::int inventory,
          COALESCE(sum(quantity_kg),0)::text inventory_kg FROM factory_inventory`) : {}
      };
      return state;
    });
  }
  async history(actor, kind, filters) {
    permission(actor, ...kind === "orders" || kind === "rolls" ? productionKeys : ["view_finished_inventory", "manage_finished_warehouse", "receive_production"]);
    return this.read((tx) => historyPage(tx, kind, filters));
  }
  async roll(actor, id2) {
    permission(actor, ...productionPermissions);
    return this.read((tx) => one(tx, `SELECT detail.*,${filmDurationJSON} film_duration,
      ${productionActorJSON("printer")} printed_actor,
      ${productionActorJSON("cutter")} cut_actor
      FROM (${rollSelect} WHERE r.id=$1) detail
      LEFT JOIN users printer ON printer.id=detail.printed_by
      LEFT JOIN users cutter ON cutter.id=detail.cut_by
      JOIN LATERAL (${filmMachineGroups("detail.production_order_id", "detail.film_machine_id")}) g ON true`, [id2]));
  }
  async labelPage(actor, filters) {
    permission(actor, ...productionPermissions);
    return this.read((tx) => historyPage(tx, "rolls", filters));
  }
  async labelRolls(actor, ids) {
    permission(actor, ...productionPermissions);
    return this.read(async (tx) => {
      const rolls = await rows(tx, `${rollSelect} WHERE r.id=ANY($1::integer[])`, [ids]);
      const byId = new Map(rolls.map((roll) => [roll.id, roll]));
      if (ids.some((id2) => !byId.has(id2)))
        throw new ProductionError("\u0623\u062D\u062F \u0627\u0644\u0631\u0648\u0644\u0627\u062A \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u061B \u062D\u062F\u0651\u062B \u0627\u0644\u062A\u062D\u062F\u064A\u062F \u0648\u0623\u0639\u062F \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629", "A selected roll was not found. Refresh your selection and retry.", 404);
      return ids.map((id2) => byId.get(id2));
    });
  }
  async read(action) {
    const tx = await this.pool.connect();
    try {
      await tx.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
      const result = await action(tx);
      await tx.query("COMMIT");
      return result;
    } catch (error) {
      await tx.query("ROLLBACK").catch(() => {
      });
      throw error;
    } finally {
      tx.release();
    }
  }
};
var productionKeys = ["view_production", "manage_production", "operate_film", "operate_printing", "operate_cutting"];
function identifyRollProducts(orders2) {
  orders2.forEach((order) => {
    if (!order.started_at) order.is_roll_product = isPlasticRoll(order.product?.name ?? null, order.product?.name_ar ?? null);
  });
}

// server/production/routes.ts
var request = z5.object({ request_id: z5.string().uuid() }).strict();
var id = z5.coerce.number().int().positive().max(2147483647);
var weightPattern = /^\d{1,12}(?:\.\d{1,2})?$/;
var weight = z5.string().regex(weightPattern).refine((v) => weightPattern.test(v) && kgHundredths(v) > 0n);
var machine2 = z5.string().trim().min(1).max(20);
var safeText = (max) => z5.string().trim().max(max).refine((s) => !s.includes("\0"));
var labelSelection = z5.object({
  roll_ids: z5.array(z5.number().int().positive().max(2147483647)).min(1).max(100).refine((ids) => new Set(ids).size === ids.length)
}).strict();
async function rollQR(req, rollId) {
  const url = `${req.protocol}://${req.get("host")}/production/rolls/${rollId}`;
  const image = await QRCode.toDataURL(url, {
    width: 600,
    margin: 4,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#ffffff" }
  });
  return { url, image };
}
var handler = (callback) => async (req, res, next) => {
  try {
    await callback(req, res, next);
  } catch (error) {
    if (error instanceof ProductionError) return void res.status(error.status).json({ message: error.message, message_en: error.message_en });
    if (error instanceof z5.ZodError) return void res.status(400).json({ message: "\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u062D\u0642\u0648\u0644\u061B \u0627\u0644\u0643\u0645\u064A\u0627\u062A \u0645\u0648\u062C\u0628\u0629 \u0628\u0645\u0646\u0632\u0644\u062A\u064A\u0646 \u0639\u0634\u0631\u064A\u062A\u064A\u0646 \u0641\u0642\u0637", message_en: "Check the fields. Weights must be positive with at most two decimal places." });
    const code = error.code;
    if (["23505", "23503", "P0011", "55P03", "40P01", "57014"].includes(code ?? ""))
      return void res.status(409).json({ message: "\u062A\u0639\u0627\u0631\u0636 \u0641\u064A \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0623\u0648 \u0627\u0646\u0634\u063A\u0627\u0644 \u0627\u0644\u0633\u062C\u0644\u061B \u0623\u0639\u062F \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0623\u0648 \u0623\u0639\u062F \u0645\u062D\u0627\u0648\u0644\u0629 \u0627\u0644\u0639\u0645\u0644\u064A\u0629 \u0646\u0641\u0633\u0647\u0627", message_en: "Conflicting data or a busy record. Reload or retry the same operation." });
    next(error);
  }
};
function createProductionRouter(connectionPool = pool) {
  const router4 = Router4();
  router4.use(requireAuth);
  const execution2 = new ProductionExecutionService(connectionPool);
  const warehouse = new ProductionWarehouseService(connectionPool);
  const read = new ProductionReadService(connectionPool);
  router4.get("/state", handler(async (req, res) => {
    const scope = z5.enum(["management", "film", "printing", "cutting", "hall", "warehouse", "roll"]).default("management").parse(req.query.scope);
    res.setHeader("Cache-Control", "private, no-store");
    res.json(await read.state(req.user, scope));
  }));
  const historyFilters = z5.object({
    before: id.optional(),
    limit: z5.coerce.number().int().min(1).max(100).optional(),
    search: safeText(120).optional(),
    status: z5.enum(["pending", "active", "in_production", "completed", "cancelled", "archived", "film", "printing", "done"]).optional(),
    from: z5.string().date().optional(),
    to: z5.string().date().optional(),
    order_id: id.optional(),
    location_id: id.optional()
  }).strict().refine((value) => !value.from || !value.to || value.from <= value.to);
  router4.get("/history/:kind", handler(async (req, res) => {
    const kind = z5.enum(["orders", "rolls", "receipts", "movements", "inventory"]).parse(req.params.kind);
    const filters = historyFilters.parse(req.query);
    if (filters.status && !["orders", "rolls"].includes(kind)) throw new z5.ZodError([]);
    if (filters.status && !(kind === "rolls" ? ["film", "printing", "done"] : ["pending", "active", "in_production", "completed", "cancelled", "archived"]).includes(filters.status)) throw new z5.ZodError([]);
    if (filters.location_id && ["orders", "rolls"].includes(kind)) throw new z5.ZodError([]);
    res.setHeader("Cache-Control", "private, no-store");
    res.json(await read.history(req.user, kind, filters));
  }));
  router4.get("/rolls/:id", handler(async (req, res) => {
    res.json(await read.roll(req.user, id.parse(req.params.id)));
  }));
  router4.get("/rolls/:id/qr", handler(async (req, res) => {
    const roll = await read.roll(req.user, id.parse(req.params.id));
    res.setHeader("Cache-Control", "private, no-store");
    res.json(await rollQR(req, roll.id));
  }));
  router4.get("/labels", handler(async (req, res) => {
    const filters = z5.object({
      before: id.optional(),
      limit: z5.coerce.number().int().min(1).max(100).optional(),
      search: safeText(120).optional()
    }).strict().parse(req.query);
    res.setHeader("Cache-Control", "private, no-store");
    res.json(await read.labelPage(req.user, filters));
  }));
  router4.post("/labels", handler(async (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    const { roll_ids } = labelSelection.parse(req.body);
    const rolls = await read.labelRolls(req.user, roll_ids);
    const labels = await Promise.all(rolls.map(async (roll) => ({ roll, qr: await rollQR(req, roll.id) })));
    res.json({ labels });
  }));
  router4.post("/orders/:id/start", handler(async (req, res) => {
    res.json(await execution2.start(req.user, id.parse(req.params.id), request.parse(req.body)));
  }));
  router4.post("/orders/:id/rolls", handler(async (req, res) => {
    const input = request.extend({
      machine_id: machine2,
      weight_kg: weight,
      is_last_roll: z5.boolean().default(false),
      inline_printed: z5.boolean().default(false)
    }).strict().parse(req.body);
    res.json(await execution2.film(req.user, id.parse(req.params.id), input));
  }));
  router4.post("/orders/:id/close-film", handler(async (req, res) => {
    res.json(await execution2.closeFilm(req.user, id.parse(req.params.id), request.parse(req.body)));
  }));
  router4.post("/rolls/:id/print", handler(async (req, res) => {
    res.json(await execution2.print(req.user, id.parse(req.params.id), request.extend({ machine_id: machine2 }).parse(req.body)));
  }));
  router4.post("/rolls/:id/cut", handler(async (req, res) => {
    res.json(await execution2.cut(req.user, id.parse(req.params.id), request.extend({ machine_id: machine2, net_weight_kg: weight }).parse(req.body)));
  }));
  router4.post("/queues", handler(async (req, res) => {
    res.json(await execution2.queue(req.user, request.extend({
      production_order_id: id,
      stage: z5.enum(["film", "printing", "cutting"]),
      machine_id: machine2,
      position: z5.number().int().positive().max(1e6)
    }).parse(req.body)));
  }));
  router4.post("/queues/:id/remove", handler(async (req, res) => {
    res.json(await execution2.removeQueue(req.user, id.parse(req.params.id), request.parse(req.body)));
  }));
  router4.post("/queues/reorder", handler(async (req, res) => {
    res.json(await execution2.reorderQueue(req.user, request.extend({
      first_id: id,
      second_id: id,
      first_position: z5.number().int().positive(),
      second_position: z5.number().int().positive()
    }).parse(req.body)));
  }));
  router4.post("/receipts", handler(async (req, res) => {
    const packaging = z5.object({ roll_weight_grams: z5.string().regex(/^\d{1,8}(?:\.\d{1,4})?$/), rolls_per_unit: z5.number().int().min(1).max(1e6), units: z5.number().int().min(1).max(1e6) }).strict();
    const input = request.extend({ notes: safeText(2e3).optional(), items: z5.array(z5.object({
      production_order_id: id,
      location_id: id,
      quantity_kg: weight,
      packaging: packaging.optional()
    }).strict()).min(1).max(100) }).parse(req.body);
    res.json(await warehouse.receive(req.user, input));
  }));
  const locationName = safeText(100).refine((value) => value.length > 0);
  const location = request.extend({ name: locationName, name_ar: locationName, is_active: z5.boolean().optional() });
  router4.post("/locations", handler(async (req, res) => {
    res.json(await warehouse.location(req.user, location.parse(req.body)));
  }));
  router4.post("/locations/:id", handler(async (req, res) => {
    res.json(await warehouse.location(req.user, location.parse(req.body), id.parse(req.params.id)));
  }));
  return router4;
}
var routes_default = createProductionRouter();

// server/routes.ts
var router3 = Router5();
router3.use(createPublicOrderPrintRouter(getOrderDetails));
var admin2 = requirePermission("admin");
var usersRead = requireAnyPermission("manage_users", "admin");
var rolesRead = requireAnyPermission("manage_users", "manage_roles", "admin");
var rolesWrite = requireAnyPermission("manage_roles", "admin");
var sectionsRead = requireAnyPermission("manage_users", "manage_sections", "manage_machines", "manage_maintenance", "admin");
var sectionsWrite = requireAnyPermission("manage_sections", "admin");
var settingsRead = requireAnyPermission("manage_settings", "admin");
var businessRead = requireAnyPermission("manage_customers", "manage_orders", "view_orders", "admin");
var customerProductsRead = requireAnyPermission("manage_customers", "manage_orders", "view_orders", "manage_production", "admin");
var ordersRead = requireAnyPermission("view_orders", "manage_orders", "manage_production", "admin");
var productionRead = requireAnyPermission("view_production", "manage_production", "admin");
var machinesRead = requireAnyPermission("view_production", "manage_machines", "view_maintenance", "manage_maintenance", "admin");
var maintenanceRead = requireAnyPermission("view_maintenance", "manage_maintenance", "admin");
var businessWrite = requireAnyPermission("manage_customers", "manage_orders", "admin");
var ordersWrite = requireAnyPermission("manage_orders", "admin");
var productionWrite = requireAnyPermission("manage_production", "admin");
var machinesWrite = requireAnyPermission("manage_machines", "manage_maintenance", "admin");
var maintenanceWrite = requireAnyPermission("manage_maintenance", "admin");
var categoriesRead = requireAnyPermission("manage_categories", "manage_definitions", "manage_customers", "manage_orders", "view_orders", "admin");
var itemsRead = requireAnyPermission("manage_items", "manage_definitions", "manage_customers", "manage_orders", "view_orders", "admin");
var masterBatchRead = requireAnyPermission("manage_master_batch", "manage_definitions", "manage_customers", "manage_orders", "view_orders", "admin");
var categoriesWrite = requireAnyPermission("manage_categories", "manage_definitions", "manage_customers", "manage_orders", "admin");
var itemsWrite = requireAnyPermission("manage_items", "manage_definitions", "manage_customers", "manage_orders", "admin");
var masterBatchWrite = requireAnyPermission("manage_master_batch", "manage_definitions", "manage_customers", "manage_orders", "admin");
var positiveWhole = z6.string().regex(/^\d+$/, "\u064A\u062C\u0628 \u0625\u062F\u062E\u0627\u0644 \u0639\u062F\u062F \u0635\u062D\u064A\u062D \u062F\u0648\u0646 \u0643\u0633\u0648\u0631").refine((value) => Number(value) > 0, "\u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 \u0627\u0644\u0642\u064A\u0645\u0629 \u0623\u0643\u0628\u0631 \u0645\u0646 \u0635\u0641\u0631").nullish();
var nonnegativeWhole = z6.string().regex(/^\d+$/, "\u064A\u062C\u0628 \u0625\u062F\u062E\u0627\u0644 \u0639\u062F\u062F \u0635\u062D\u064A\u062D \u062F\u0648\u0646 \u0643\u0633\u0648\u0631").nullish();
var positiveDecimalString = (maxIntegerDigits, maxDecimalDigits) => z6.string().regex(new RegExp(`^\\d{1,${maxIntegerDigits}}(?:\\.\\d{1,${maxDecimalDigits}})?$`)).refine((value) => Number(value) > 0, "\u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 \u0627\u0644\u0642\u064A\u0645\u0629 \u0623\u0643\u0628\u0631 \u0645\u0646 \u0635\u0641\u0631").nullish();
var positiveIntegerValue = z6.union([
  z6.number().int().positive(),
  z6.string().regex(/^\d+$/).refine((value) => Number(value) > 0)
]).nullish();
var productColor = z6.string().trim().min(1).max(40).refine((color) => /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(color) || /^[\p{L}\p{N} _-]+$/u.test(color), "\u0644\u0648\u0646 \u0627\u0644\u0637\u0628\u0627\u0639\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D");
var productColors = z6.array(productColor).max(12).nullish();
var requiredAdminText = (max) => z6.string().trim().min(1).max(max);
var optionalAdminText = (max) => z6.string().trim().max(max).nullish();
var optionalAdminRelation = (max) => z6.preprocess(
  (value) => typeof value === "string" && !value.trim() ? null : value,
  z6.string().trim().min(1).max(max).nullable().optional()
);
var adminDate = z6.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date2 = /* @__PURE__ */ new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date2.getTime()) && date2.toISOString().slice(0, 10) === value;
}, "\u0627\u0644\u062A\u0627\u0631\u064A\u062E \u063A\u064A\u0631 \u0635\u0627\u0644\u062D").nullish();
var decimalAdminValue = (maxIntegerDigits, maxDecimalDigits, positive = false) => z6.union([z6.string(), z6.number().finite().transform(String)]).nullish().refine(
  (value) => value == null || new RegExp(`^\\d{1,${maxIntegerDigits}}(?:\\.\\d{1,${maxDecimalDigits}})?$`).test(String(value)),
  "\u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0631\u0642\u0645\u064A\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629"
).refine(
  (value) => value == null || (positive ? Number(value) > 0 : Number(value) >= 0),
  positive ? "\u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 \u0627\u0644\u0642\u064A\u0645\u0629 \u0623\u0643\u0628\u0631 \u0645\u0646 \u0635\u0641\u0631" : "\u0644\u0627 \u064A\u0645\u0643\u0646 \u0623\u0646 \u062A\u0643\u0648\u0646 \u0627\u0644\u0642\u064A\u0645\u0629 \u0633\u0627\u0644\u0628\u0629"
).transform((value) => value == null ? value : String(value));
var positiveAdminInteger = z6.union([
  z6.number().int().positive().transform(String),
  z6.string().trim().regex(/^\d+$/).refine((value) => Number.isSafeInteger(Number(value)) && Number(value) > 0)
]).nullish();
var adminRoleId = z6.preprocess(
  (value) => value === "" ? null : value,
  z6.union([
    z6.number().int().positive(),
    z6.string().trim().regex(/^\d+$/).transform(Number).refine(Number.isSafeInteger)
  ]).nullable().optional()
);
var adminPermissions = z6.array(z6.string().trim().min(1).max(80)).nullable().optional();
var sectionAdminSchema = insertSectionSchema.strict().extend({
  name: requiredAdminText(100),
  name_ar: optionalAdminText(100),
  description: optionalAdminText(5e3)
});
var roleAdminSchema = insertRoleSchema.strict().extend({
  name: requiredAdminText(50),
  name_ar: optionalAdminText(100),
  permissions: adminPermissions
});
var userAdminSchema = insertUserSchema.omit({ preferred_language: true }).strict().extend({
  username: z6.string().trim().min(1).max(50).optional(),
  password: z6.string().refine((value) => value.trim().length >= 8, "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 8 \u0623\u062D\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644").optional(),
  display_name: optionalAdminText(100),
  display_name_ar: optionalAdminText(100),
  full_name: optionalAdminText(200),
  phone: optionalAdminText(20),
  email: optionalAdminText(100),
  role_id: adminRoleId,
  section_id: optionalAdminRelation(20),
  status: z6.string().trim().pipe(z6.enum(["active", "inactive"])).nullish(),
  national_id: optionalAdminText(20),
  nationality: optionalAdminText(30),
  birth_date: adminDate,
  service_start_date: adminDate,
  profession: optionalAdminText(100),
  first_name: optionalAdminText(100),
  last_name: optionalAdminText(100),
  profile_image_url: optionalAdminText(500)
});
var categoryAdminSchema = insertCategorySchema.strict().extend({
  name: requiredAdminText(100),
  name_ar: optionalAdminText(100),
  code: optionalAdminText(20),
  parent_id: optionalAdminRelation(20)
});
var itemAdminSchema = insertItemSchema.strict().extend({
  category_id: optionalAdminRelation(20),
  name: optionalAdminText(100),
  name_ar: optionalAdminText(100),
  code: optionalAdminText(50),
  status: z6.string().trim().pipe(z6.enum(["active", "inactive"])).nullish()
});
var masterBatchTypeId = z6.string().trim().refine(
  (value) => /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(value) || value.toLowerCase() === "transparent",
  "\u064A\u062C\u0628 \u0625\u062F\u062E\u0627\u0644 \u0644\u0648\u0646 HEX \u0635\u0627\u0644\u062D \u0623\u0648 transparent"
);
var masterBatchAdminSchema = insertMasterBatchColorSchema.omit({ sort_order: true }).strict().extend({
  name: requiredAdminText(100),
  name_ar: requiredAdminText(100),
  color_hex: masterBatchTypeId,
  text_color: masterBatchTypeId,
  brand: optionalAdminText(100),
  aliases: optionalAdminText(5e3),
  is_active: z6.boolean().optional()
});
var componentAdminSchema = insertMaintenanceComponentCatalogSchema.omit({ sort_order: true }).strict().extend({
  machine_type: z6.string().trim().pipe(z6.enum(["extruder", "printer", "cutter", "quality_check"])),
  name_ar: requiredAdminText(200),
  name_en: requiredAdminText(200),
  enabled: z6.boolean().optional()
});
var machineTypeInput = z6.string().trim().pipe(z6.enum(["extruder", "printer", "cutter", "quality_check", "printing", "cutting", "Printer", "Cutter"]));
var machineAdminSchema = insertMachineSchema.strict().extend({
  name: requiredAdminText(100),
  name_ar: optionalAdminText(100),
  type: machineTypeInput,
  section_id: optionalAdminRelation(20),
  status: z6.string().trim().pipe(z6.enum(["active", "maintenance", "down"])).optional(),
  capacity_small_kg_per_hour: decimalAdminValue(6, 2, true),
  capacity_medium_kg_per_hour: decimalAdminValue(6, 2, true),
  capacity_large_kg_per_hour: decimalAdminValue(6, 2, true),
  min_thickness: decimalAdminValue(5, 3),
  max_thickness: decimalAdminValue(5, 3),
  min_width_cm: decimalAdminValue(6, 2),
  max_width_cm: decimalAdminValue(6, 2),
  max_print_colors: positiveAdminInteger,
  min_cylinder_inch: decimalAdminValue(6, 2),
  max_cylinder_inch: decimalAdminValue(6, 2),
  min_length_cm: decimalAdminValue(6, 2),
  max_length_cm: decimalAdminValue(6, 2),
  width_cm: decimalAdminValue(8, 2, true),
  length_cm: decimalAdminValue(8, 2, true),
  height_cm: decimalAdminValue(8, 2, true),
  weight_kg: decimalAdminValue(8, 2, true),
  manufacture_date: adminDate,
  screw_type: z6.string().trim().pipe(z6.enum(["A", "ABA"])).nullish(),
  raw_material_type: optionalAdminText(20),
  inline_printer_id: optionalAdminRelation(20),
  manufacturer: optionalAdminText(100),
  serial_number: optionalAdminText(100),
  metal_plate: optionalAdminText(5e3)
});
var customerProductInputSchema = insertCustomerProductSchema.strict().extend({
  width: positiveWhole,
  left_facing: nonnegativeWhole,
  right_facing: nonnegativeWhole,
  thickness: positiveWhole,
  cutting_length_cm: positiveIntegerValue,
  density: z6.union([positiveDecimalString(3, 3), z6.literal("")]).nullish(),
  unit_weight_kg: positiveDecimalString(5, 3),
  unit_quantity: positiveIntegerValue,
  front_print_colors: productColors,
  back_print_colors: productColors
});
var MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;
var productImageMimeTypes = /* @__PURE__ */ new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "image/bmp", "image/avif"]);
function invalidProduct(message, status = 400) {
  return Object.assign(new Error(message), { status });
}
function isExistingImageUrl(value) {
  return /^https?:\/\/[^\s]+$/i.test(value) || /^(?:\/(?!\/)|\.{1,2}\/)[A-Za-z0-9_./%?=&-]+$/u.test(value) || /^[A-Za-z0-9_-]+\/[A-Za-z0-9_./%?=&-]+$/u.test(value);
}
function validateProductImage(value, previousValue) {
  if (value === null || value === void 0 || value === "") return;
  if (typeof value !== "string") throw invalidProduct("\u0635\u0648\u0631\u0629 \u0627\u0644\u062A\u0635\u0645\u064A\u0645 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629");
  if (value === previousValue && isExistingImageUrl(value)) return;
  const match = value.match(/^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/]*={0,2})$/i);
  if (!match || !productImageMimeTypes.has(match[1].toLowerCase())) {
    throw invalidProduct("\u064A\u062C\u0628 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0635\u0648\u0631\u0629 PNG \u0623\u0648 JPEG \u0623\u0648 GIF \u0623\u0648 WebP \u0623\u0648 BMP \u0623\u0648 AVIF");
  }
  const encoded = match[2];
  const bytes = Buffer.from(encoded, "base64");
  if (bytes.length > MAX_PRODUCT_IMAGE_BYTES || bytes.toString("base64") !== encoded) {
    throw invalidProduct("\u064A\u062C\u0628 \u0623\u0644\u0627 \u064A\u062A\u062C\u0627\u0648\u0632 \u062D\u062C\u0645 \u0627\u0644\u0635\u0648\u0631\u0629 5 \u0645\u064A\u062C\u0627\u0628\u0627\u064A\u062A \u0648\u0623\u0646 \u062A\u0643\u0648\u0646 \u0628\u064A\u0627\u0646\u0627\u062A\u0647\u0627 \u0635\u0627\u0644\u062D\u0629");
  }
  const mime = match[1].toLowerCase();
  const starts = (signature) => signature.every((byte, index3) => bytes[index3] === byte);
  const validSignature = mime === "image/png" && starts([137, 80, 78, 71, 13, 10, 26, 10]) || mime === "image/jpeg" && starts([255, 216, 255]) || mime === "image/gif" && ["GIF87a", "GIF89a"].some((signature) => bytes.subarray(0, 6).toString("ascii") === signature) || mime === "image/webp" && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP" || mime === "image/bmp" && bytes.subarray(0, 2).toString("ascii") === "BM" || mime === "image/avif" && bytes.length >= 16 && bytes.subarray(4, 8).toString("ascii") === "ftyp" && ["avif", "avis"].some((brand) => {
    for (let offset = 8; offset + 4 <= Math.min(bytes.length, 32); offset += 4) {
      if (bytes.subarray(offset, offset + 4).toString("ascii") === brand) return true;
    }
    return false;
  });
  if (!validSignature) throw invalidProduct("\u0646\u0648\u0639 \u0627\u0644\u0635\u0648\u0631\u0629 \u0644\u0627 \u064A\u0637\u0627\u0628\u0642 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0644\u0641");
}
function normalizeCustomerProductInput(input) {
  const normalized = { ...input };
  if (normalized.density === null || normalized.density === "") normalized.density = "0.95";
  for (const field of ["category_id", "item_id", "master_batch_id"]) {
    if (normalized[field] === "") normalized[field] = null;
  }
  for (const field of ["density", "unit_weight_kg"]) {
    if (normalized[field] !== null && normalized[field] !== void 0) normalized[field] = String(normalized[field]);
  }
  for (const field of ["cutting_length_cm", "unit_quantity"]) {
    if (typeof normalized[field] === "string") normalized[field] = Number(normalized[field]);
  }
  return normalized;
}
async function validateCustomerProductReferences(tx, input, oldBatchId, oldItemId, oldCategoryId) {
  if (!input.customer_id) throw invalidProduct("\u064A\u062C\u0628 \u0627\u062E\u062A\u064A\u0627\u0631 \u0639\u0645\u064A\u0644 \u0635\u0627\u0644\u062D");
  const [customer] = await tx.select({ id: customers.id }).from(customers).where(eq8(customers.id, input.customer_id)).for("key share").limit(1);
  const [item] = input.item_id ? await tx.select({ id: items.id, category_id: items.category_id, status: items.status }).from(items).where(eq8(items.id, input.item_id)).for("key share").limit(1) : [null];
  const [category] = input.category_id ? await tx.select({ id: categories.id, name: categories.name, name_ar: categories.name_ar }).from(categories).where(eq8(categories.id, input.category_id)).for("key share").limit(1) : [null];
  if (!customer) throw invalidProduct("\u0627\u0644\u0639\u0645\u064A\u0644 \u0627\u0644\u0645\u062D\u062F\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F");
  if (input.category_id && !category) throw invalidProduct("\u0627\u0644\u062A\u0635\u0646\u064A\u0641 \u0627\u0644\u0645\u062D\u062F\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F");
  if (input.item_id && !item) throw invalidProduct("\u0627\u0644\u0635\u0646\u0641 \u0627\u0644\u0645\u062D\u062F\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F");
  if (item && input.category_id && item.category_id !== input.category_id && !(input.item_id === oldItemId && input.category_id === oldCategoryId)) {
    throw invalidProduct("\u0627\u0644\u0635\u0646\u0641 \u0644\u0627 \u064A\u0646\u062A\u0645\u064A \u0625\u0644\u0649 \u0627\u0644\u062A\u0635\u0646\u064A\u0641 \u0627\u0644\u0645\u062D\u062F\u062F");
  }
  if (item && item.status === "inactive" && input.item_id !== oldItemId) {
    throw invalidProduct("\u0644\u0627 \u064A\u0645\u0643\u0646 \u0627\u062E\u062A\u064A\u0627\u0631 \u0635\u0646\u0641 \u063A\u064A\u0631 \u0646\u0634\u0637");
  }
  if (input.master_batch_id) {
    const [batch] = await tx.select({ id: master_batch_colors.id, is_active: master_batch_colors.is_active }).from(master_batch_colors).where(eq8(master_batch_colors.id, input.master_batch_id)).for("key share").limit(1);
    if (!batch) throw invalidProduct("\u0644\u0648\u0646 \u0627\u0644\u062E\u0627\u0645\u0629 \u0627\u0644\u0645\u062D\u062F\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F");
    if (!batch.is_active && input.master_batch_id !== oldBatchId) {
      throw invalidProduct("\u0644\u0627 \u064A\u0645\u0643\u0646 \u0627\u062E\u062A\u064A\u0627\u0631 \u0644\u0648\u0646 \u062E\u0627\u0645\u0629 \u063A\u064A\u0631 \u0646\u0634\u0637");
    }
  }
  return category ?? null;
}
async function createCustomerProductInTransaction(tx, rawProduct, customerId, options = {}) {
  const product = normalizeCustomerProductInput(
    customerProductInputSchema.omit({ customer_id: true }).parse(rawProduct)
  );
  product.customer_id = customerId;
  const facingNotice = customerProductFacingNotice(product);
  if (facingNotice?.kind === "blocking") throw invalidProduct(facingNotice.message);
  const category = await validateCustomerProductReferences(tx, product, options.oldBatchId);
  validateProductImage(product.cliche_front_design, options.previousFrontImage);
  validateProductImage(product.cliche_back_design, options.previousBackImage);
  const fields = deriveCustomerProductFields(
    { ...product, density: product.density === void 0 ? "0.95" : product.density },
    `${category?.name_ar ?? ""} ${category?.name ?? ""}`
  );
  return tx.insert(customer_products).values({
    ...product,
    ...fields,
    status: product.status ?? "active"
  }).returning();
}
var positiveKg = z6.string().regex(/^\d{1,8}(?:\.\d{1,2})?$/, "\u0627\u0644\u0643\u0645\u064A\u0629 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 \u0628\u0627\u0644\u0643\u064A\u0644\u0648 \u0648\u062D\u062A\u0649 \u0645\u0646\u0632\u0644\u062A\u064A\u0646 \u0639\u0634\u0631\u064A\u062A\u064A\u0646").refine((value) => Number(value) > 0, "\u0627\u0644\u0643\u0645\u064A\u0629 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 \u0623\u0643\u0628\u0631 \u0645\u0646 \u0635\u0641\u0631");
var orderLineSchema = z6.object({
  customer_product_id: z6.number().int().positive().optional(),
  new_product: customerProductInputSchema.omit({ customer_id: true }).optional(),
  quantity_kg: positiveKg
}).strict();
var validOrderLine = (line) => Boolean(line.customer_product_id) !== Boolean(line.new_product);
var orderWithItemsSchema = z6.object({
  customer_id: z6.string().trim().min(1).max(20),
  delivery_days: z6.number().int().min(1).max(3650),
  notes: z6.string().trim().max(5e3).optional(),
  items: z6.array(orderLineSchema.refine(
    validOrderLine,
    "\u0627\u062E\u062A\u0631 \u0645\u0646\u062A\u062C\u064B\u0627 \u0645\u0633\u062C\u0644\u064B\u0627 \u0623\u0648 \u0623\u0646\u0634\u0626 \u0645\u0646\u062A\u062C\u064B\u0627 \u062C\u062F\u064A\u062F\u064B\u0627 \u0644\u0643\u0644 \u0633\u0637\u0631"
  )).min(1).max(25)
}).strict();
var orderEditSchema = orderWithItemsSchema.omit({ customer_id: true }).extend({
  // Accept but ignore snapshots from editors opened before this fix.
  // Only dedicated transition actions may update order status.
  status: z6.enum(["waiting", "on_hold", "in_production", "for_production", "paused", "cancelled", "completed", "delivered", "archived"]).optional(),
  original_items: z6.array(z6.object({
    id: z6.number().int().positive(),
    customer_product_id: z6.number().int().positive().nullable(),
    quantity_kg: positiveKg
  }).strict()).max(25),
  // Existing lines carry their production-order ID. New lines have no ID.
  items: orderLineSchema.extend({ id: z6.number().int().positive().optional() }).refine(
    validOrderLine,
    "\u0627\u062E\u062A\u0631 \u0645\u0646\u062A\u062C\u064B\u0627 \u0645\u0633\u062C\u0644\u064B\u0627 \u0623\u0648 \u0623\u0646\u0634\u0626 \u0645\u0646\u062A\u062C\u064B\u0627 \u062C\u062F\u064A\u062F\u064B\u0627 \u0644\u0643\u0644 \u0633\u0637\u0631"
  ).array().min(1).max(25)
}).strict();
var numericIdInput = z6.union([
  z6.number().int().positive(),
  z6.string().regex(/^\d+$/).transform(Number).refine((value) => Number.isSafeInteger(value) && value > 0)
]);
var productionQuantity = z6.union([z6.string(), z6.number().finite().transform(String)]).pipe(positiveKg);
var productionOverrun = z6.union([z6.string(), z6.number().finite().transform(String)]).pipe(z6.string().regex(/^\d{1,3}(?:\.\d{1,2})?$/).refine((value) => Number(value) >= 0 && Number(value) <= 50, "\u0646\u0633\u0628\u0629 \u0627\u0644\u0647\u0627\u0644\u0643 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 \u0628\u064A\u0646 0 \u064850"));
var productionOrderInputSchema = z6.object({
  production_order_number: z6.string().trim().min(1).max(50).optional(),
  order_id: numericIdInput.optional(),
  customer_product_id: numericIdInput.nullable().optional(),
  quantity_kg: productionQuantity.optional(),
  overrun_percentage: productionOverrun.optional(),
  final_quantity_kg: productionQuantity.optional(),
  status: z6.enum(["pending", "active", "completed", "cancelled", "archived"]).optional(),
  previous_status: z6.string().max(30).nullable().optional(),
  batch_number: z6.string().max(50).nullable().optional()
}).strict();
function orderError(message, status = 409) {
  return Object.assign(new Error(message), { status });
}
function page(req) {
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  return { limit, offset, search };
}
function parsed(schema, body) {
  return schema.parse(body);
}
function assertGrantWithinActor(actorPermissions, grant) {
  if (!canGrantPermissions(actorPermissions, Array.isArray(grant) ? grant : [])) {
    throw Object.assign(new Error("\u0644\u0627 \u064A\u0645\u0643\u0646 \u0645\u0646\u062D \u0635\u0644\u0627\u062D\u064A\u0627\u062A \u062A\u062A\u062C\u0627\u0648\u0632 \u0635\u0644\u0627\u062D\u064A\u0627\u062A\u0643 \u0627\u0644\u0641\u0639\u0644\u064A\u0629"), { status: 403 });
  }
}
async function assertProductionProductMatchesOrder(tx, orderId, productId) {
  const [order] = await tx.select({ id: orders.id, customer_id: orders.customer_id }).from(orders).where(eq8(orders.id, orderId)).for("share").limit(1);
  if (!order) throw orderError("\u0627\u0644\u0637\u0644\u0628 \u0627\u0644\u0645\u062D\u062F\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F", 400);
  if (productId == null) return;
  const [product] = await tx.select({ id: customer_products.id, customer_id: customer_products.customer_id }).from(customer_products).where(eq8(customer_products.id, productId)).for("update").limit(1);
  if (!product) throw orderError("\u0627\u0644\u0645\u0646\u062A\u062C \u0627\u0644\u0645\u062D\u062F\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F", 400);
  if (product.customer_id !== order.customer_id) {
    throw orderError("\u0627\u0644\u0645\u0646\u062A\u062C \u063A\u064A\u0631 \u062A\u0627\u0628\u0639 \u0644\u0639\u0645\u064A\u0644 \u0627\u0644\u0637\u0644\u0628", 400);
  }
}
async function assertProductCanTransfer(tx, productId, customerId) {
  const [conflict] = await tx.select({ id: production_orders.id }).from(production_orders).innerJoin(orders, eq8(production_orders.order_id, orders.id)).where(and4(
    eq8(production_orders.customer_product_id, productId),
    sql9`${orders.customer_id} IS DISTINCT FROM ${customerId}`
  )).limit(1);
  if (conflict) throw orderError("\u0644\u0627 \u064A\u0645\u0643\u0646 \u0646\u0642\u0644 \u0627\u0644\u0645\u0646\u062A\u062C\u061B \u0641\u0647\u0648 \u0645\u0631\u062A\u0628\u0637 \u0628\u0637\u0644\u0628 \u0625\u0646\u062A\u0627\u062C \u0644\u0639\u0645\u064A\u0644 \u0622\u062E\u0631", 409);
}
async function validateUserRoleGrant(tx, roleId, actorPermissions, allowMissingUnchangedLegacyRole = false) {
  if (roleId == null) return;
  const [role] = await tx.select({ permissions: roles.permissions }).from(roles).where(eq8(roles.id, roleId)).for("update").limit(1);
  if (!role) {
    if (allowMissingUnchangedLegacyRole) return;
    throw Object.assign(new Error("\u0627\u0644\u062F\u0648\u0631 \u0627\u0644\u0645\u062D\u062F\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F"), { status: 400 });
  }
  assertGrantWithinActor(actorPermissions, role.permissions);
}
function adminValidationError(message, status = 400) {
  return Object.assign(new Error(message), { status });
}
function stripCreateId(input) {
  const { id: _ignoredId, ...body } = input;
  return body;
}
function assertPutIdIsImmutable(input, key) {
  if (!Object.prototype.hasOwnProperty.call(input, "id")) return;
  if (String(input.id) !== String(key)) throw adminValidationError("\u0644\u0627 \u064A\u0645\u0643\u0646 \u062A\u063A\u064A\u064A\u0631 \u0627\u0644\u0645\u0639\u0631\u0651\u0641 \u0628\u0639\u062F \u0627\u0644\u0625\u0646\u0634\u0627\u0621");
  delete input.id;
}
async function validateOptionalReference(tx, table, column, value, oldValue, message) {
  if (value == null || value === "") return;
  const [row] = await tx.select({ id: table.id }).from(table).where(eq8(column, value)).for("key share").limit(1);
  if (!row && value !== oldValue) throw adminValidationError(message);
}
async function validateCategoryParent(tx, parentId, currentId, oldParentId) {
  if (!parentId) return;
  if (currentId && parentId === oldParentId) {
    if (parentId === currentId) return;
    const [parent] = await tx.select({ id: categories.id }).from(categories).where(eq8(categories.id, parentId)).for("key share").limit(1);
    if (!parent) return;
    return;
  }
  if (currentId && parentId === currentId) throw adminValidationError("\u0644\u0627 \u064A\u0645\u0643\u0646 \u062C\u0639\u0644 \u0627\u0644\u062A\u0635\u0646\u064A\u0641 \u0623\u0628\u064B\u0627 \u0644\u0646\u0641\u0633\u0647");
  const rows2 = await tx.select({ id: categories.id, parent_id: categories.parent_id }).from(categories);
  const byId = new Map(rows2.map((row) => [row.id, row.parent_id]));
  if (!byId.has(parentId)) throw adminValidationError("\u0627\u0644\u062A\u0635\u0646\u064A\u0641 \u0627\u0644\u0623\u0628 \u0627\u0644\u0645\u062D\u062F\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F");
  const visited = /* @__PURE__ */ new Set();
  let cursor = parentId;
  while (cursor) {
    if (cursor === currentId) throw adminValidationError("\u0644\u0627 \u064A\u0645\u0643\u0646 \u0625\u0646\u0634\u0627\u0621 \u062F\u0648\u0631\u0629 \u0641\u064A \u0634\u062C\u0631\u0629 \u0627\u0644\u062A\u0635\u0646\u064A\u0641\u0627\u062A");
    if (visited.has(cursor)) throw adminValidationError("\u0633\u0644\u0633\u0644\u0629 \u0627\u0644\u062A\u0635\u0646\u064A\u0641\u0627\u062A \u0627\u0644\u0623\u0628 \u062A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u062F\u0648\u0631\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629");
    visited.add(cursor);
    cursor = byId.get(cursor);
  }
}
function canonicalMachineType(value) {
  if (value === "printing" || value === "Printer") return "printer";
  if (value === "cutting" || value === "Cutter") return "cutter";
  return value;
}
function normalizeChangedMachineType(input, oldType) {
  if (typeof input.type !== "string") return;
  if (oldType !== void 0 && input.type === oldType) return;
  input.type = canonicalMachineType(input.type);
}
async function validateMachineReferences(tx, input, current, revalidateUnchangedInlinePrinter = false) {
  await validateOptionalReference(tx, sections, sections.id, input.section_id, current?.section_id, "\u0627\u0644\u0642\u0633\u0645 \u0627\u0644\u0645\u062D\u062F\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F");
  if (input.inline_printer_id == null || input.inline_printer_id === "") return;
  if (current?.inline_printer_id === input.inline_printer_id && !revalidateUnchangedInlinePrinter) return;
  const machineType = input.type ?? current?.type;
  if (machineType !== "extruder") throw adminValidationError("\u064A\u0645\u0643\u0646 \u0631\u0628\u0637 \u0627\u0644\u0637\u0627\u0628\u0639\u0629 \u0627\u0644\u062F\u0627\u062E\u0644\u064A\u0629 \u0628\u0645\u0627\u0643\u064A\u0646\u0629 \u0628\u062B\u0642 \u0641\u0642\u0637");
  if (input.inline_printer_id === current?.id) throw adminValidationError("\u0644\u0627 \u064A\u0645\u0643\u0646 \u0631\u0628\u0637 \u0627\u0644\u0645\u0627\u0643\u064A\u0646\u0629 \u0628\u0646\u0641\u0633\u0647\u0627 \u0643\u0637\u0627\u0628\u0639\u0629 \u062F\u0627\u062E\u0644\u064A\u0629");
  const [printer] = await tx.select({ id: machines.id, type: machines.type }).from(machines).where(eq8(machines.id, input.inline_printer_id)).for("key share").limit(1);
  if (!printer) throw adminValidationError("\u0627\u0644\u0637\u0627\u0628\u0639\u0629 \u0627\u0644\u062F\u0627\u062E\u0644\u064A\u0629 \u0627\u0644\u0645\u062D\u062F\u062F\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629");
  if (canonicalMachineType(printer.type ?? "") !== "printer") {
    throw adminValidationError("\u064A\u062C\u0628 \u0627\u062E\u062A\u064A\u0627\u0631 \u0645\u0627\u0643\u064A\u0646\u0629 \u0645\u0646 \u0646\u0648\u0639 \u0637\u0627\u0628\u0639\u0629 \u0644\u0644\u0637\u0627\u0628\u0639\u0629 \u0627\u0644\u062F\u0627\u062E\u0644\u064A\u0629");
  }
}
async function hasInlinePrinterDependents(tx, printerId) {
  const [reference] = await tx.select({ id: machines.id }).from(machines).where(eq8(machines.inline_printer_id, printerId)).limit(1);
  return Boolean(reference);
}
async function validateMachineTypeTransition(tx, current, merged, body) {
  if (!Object.prototype.hasOwnProperty.call(body, "type")) return false;
  const previousType = canonicalMachineType(current.type ?? "");
  const nextType = canonicalMachineType(merged.type ?? "");
  if (previousType === nextType) return false;
  const currentInlinePrinter = typeof current.inline_printer_id === "string" && current.inline_printer_id.trim().length > 0;
  const mergedInlinePrinter = typeof merged.inline_printer_id === "string" && merged.inline_printer_id.trim().length > 0;
  if (previousType === "extruder" && currentInlinePrinter && nextType !== "extruder" && mergedInlinePrinter) {
    throw adminValidationError("\u0623\u0632\u0644 \u0627\u0644\u0637\u0627\u0628\u0639\u0629 \u0627\u0644\u062F\u0627\u062E\u0644\u064A\u0629 \u0623\u0648\u0644\u0627\u064B \u0628\u0625\u0631\u0633\u0627\u0644 inline_printer_id \u0641\u0627\u0631\u063A\u064B\u0627 \u0642\u0628\u0644 \u062A\u063A\u064A\u064A\u0631 \u0646\u0648\u0639 \u0645\u0627\u0643\u064A\u0646\u0629 \u0627\u0644\u0628\u062B\u0642");
  }
  if (previousType === "printer" && nextType !== "printer" && await hasInlinePrinterDependents(tx, current.id)) {
    throw adminValidationError("\u0644\u0627 \u064A\u0645\u0643\u0646 \u062A\u063A\u064A\u064A\u0631 \u0646\u0648\u0639 \u0627\u0644\u0637\u0627\u0628\u0639\u0629 \u0644\u0623\u0646\u0647\u0627 \u0645\u0631\u062A\u0628\u0637\u0629 \u0628\u0645\u0627\u0643\u064A\u0646\u0627\u062A \u0628\u062B\u0642\u061B \u0623\u0632\u0644 \u0627\u0644\u0627\u0631\u062A\u0628\u0627\u0637\u0627\u062A \u0623\u0648\u0644\u0627\u064B");
  }
  return true;
}
function actorHasAdminPermission(permissions) {
  return Array.isArray(permissions) && permissions.includes("admin");
}
function validateMachineRanges(input) {
  for (const [minimum, maximum] of [
    ["min_thickness", "max_thickness"],
    ["min_width_cm", "max_width_cm"],
    ["min_cylinder_inch", "max_cylinder_inch"],
    ["min_length_cm", "max_length_cm"]
  ]) {
    if (input[minimum] != null && input[maximum] != null && Number(input[minimum]) > Number(input[maximum])) {
      throw adminValidationError(`${minimum} \u0644\u0627 \u064A\u0645\u0643\u0646 \u0623\u0646 \u062A\u062A\u062C\u0627\u0648\u0632 ${maximum}`);
    }
  }
}
function userId(raw) {
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1) {
    const error = new Error("\u0627\u0644\u0645\u0639\u0631\u0651\u0641 \u0627\u0644\u0631\u0642\u0645\u064A \u063A\u064A\u0631 \u0635\u0627\u0644\u062D");
    error.status = 400;
    throw error;
  }
  return value;
}
router3.get("/health", (_req, res) => res.json({ status: "ok" }));
router3.use("/self", self_service_default);
router3.use("/hr", hr_default);
router3.use("/production", routes_default);
router3.get("/public-branding", async (_req, res, next) => {
  try {
    const profile = (await db.select().from(company_profile).limit(1))[0] ?? null;
    const settings = await db.select({ setting_key: system_settings.setting_key, setting_value: system_settings.setting_value }).from(system_settings).where(eq8(system_settings.setting_key, "company_logo_data_url")).limit(1);
    const logoSetting = settings[0]?.setting_value;
    const logoSrc = typeof logoSetting === "string" && logoSetting.trim() ? logoSetting.trim() : typeof profile?.logo_url === "string" && profile.logo_url.trim() ? profile.logo_url.trim() : "";
    res.json({
      companyNameAr: profile?.name_ar || profile?.name || "MPBF",
      companyNameEn: profile?.name || profile?.name_ar || "PLASTIC MANUFACTURING",
      logoSrc,
      defaultLanguage: profile?.default_language === "en" ? "en" : "ar"
    });
  } catch (error) {
    next(error);
  }
});
router3.get("/me", (req, res) => {
  if (!req.user) return res.status(401).json({ success: false, message: "\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0645\u0637\u0644\u0648\u0628" });
  return res.json({ success: true, user: req.user });
});
router3.put("/me/language", requireAuth, async (req, res, next) => {
  try {
    const { preferred_language } = z6.object({ preferred_language: z6.enum(["ar", "en"]).nullable() }).strict().parse(req.body);
    const [user] = await db.update(users).set({ preferred_language }).where(eq8(users.id, req.user.id)).returning({ preferred_language: users.preferred_language });
    if (!user) return res.status(401).json({ success: false, message: "\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0645\u0637\u0644\u0648\u0628" });
    return res.json({ preferred_language: user.preferred_language });
  } catch (error) {
    return next(error);
  }
});
var loginAttempts = /* @__PURE__ */ new Map();
var LOGIN_WINDOW_MS = 15 * 60 * 1e3;
var LOGIN_LIMIT = 10;
function loginKey(req, identifier) {
  return `${req.ip}:${identifier.toLowerCase()}`;
}
router3.post("/login", async (req, res, next) => {
  try {
    const identifier = String(req.body?.username ?? req.body?.national_id ?? "").trim();
    const password = String(req.body?.password ?? "");
    if (!identifier || password.length < 1) return res.status(400).json({ message: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0648\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0645\u0637\u0644\u0648\u0628\u0627\u0646" });
    const key = loginKey(req, identifier);
    const now = Date.now();
    for (const [attemptKey, value] of loginAttempts) {
      if (value.resetAt <= now) loginAttempts.delete(attemptKey);
    }
    const attempt = loginAttempts.get(key);
    if (attempt && attempt.resetAt > now && attempt.count >= LOGIN_LIMIT) {
      return res.status(429).json({ message: "\u0645\u062D\u0627\u0648\u0644\u0627\u062A \u062F\u062E\u0648\u0644 \u0643\u062B\u064A\u0631\u0629\u060C \u062D\u0627\u0648\u0644 \u0644\u0627\u062D\u0642\u0627\u064B" });
    }
    const user = await authenticate(identifier, password);
    if (!user) {
      const current = attempt && attempt.resetAt > now ? attempt : { count: 0, resetAt: now + LOGIN_WINDOW_MS };
      current.count += 1;
      loginAttempts.set(key, current);
      return res.status(401).json({ message: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062F\u062E\u0648\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629" });
    }
    loginAttempts.delete(key);
    req.session.userId = user.id;
    await new Promise((resolve, reject) => req.session.save((error) => error ? reject(error) : resolve()));
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
});
router3.post("/logout", (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie("plastic-bag-session");
    res.json({ success: true });
  });
});
router3.post("/change-password", requireAuth, async (req, res, next) => {
  try {
    const password = String(req.body?.password ?? "");
    if (password.length < 8) return res.status(400).json({ message: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 8 \u0623\u062D\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644" });
    await db.update(users).set({ password: await hashPassword(password), must_change_password: false }).where(eq8(users.id, req.user.id));
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});
router3.get("/dashboard", admin2, async (_req, res, next) => {
  try {
    const names = [
      ["customers", customers],
      ["orders", orders],
      ["production_orders", production_orders],
      ["machines", machines],
      ["users", users]
    ];
    const entries = await Promise.all(names.map(async ([name, table]) => [name, Number((await db.select({ value: count() }).from(table))[0]?.value ?? 0)]));
    res.json(Object.fromEntries(entries));
  } catch (error) {
    next(error);
  }
});
router3.get("/users", usersRead, async (req, res, next) => {
  try {
    const { limit, offset, search } = page(req);
    const where = search ? or5(
      ilike(users.username, `%${search}%`),
      ilike(users.display_name, `%${search}%`),
      ilike(users.display_name_ar, `%${search}%`),
      ilike(users.full_name, `%${search}%`),
      ilike(users.email, `%${search}%`),
      ilike(users.phone, `%${search}%`),
      ilike(users.national_id, `%${search}%`),
      sql9`${users.id}::text ILIKE ${`%${search}%`}`
    ) : void 0;
    const rows2 = await db.select({
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
      updated_at: users.updated_at
    }).from(users).leftJoin(roles, eq8(users.role_id, roles.id)).leftJoin(sections, eq8(users.section_id, sections.id)).where(where).orderBy(desc3(users.id)).limit(limit).offset(offset);
    res.json(rows2);
  } catch (error) {
    next(error);
  }
});
router3.post("/users", usersRead, async (req, res, next) => {
  try {
    const raw = stripCreateId({ ...req.body ?? {} });
    if (raw.is_system_user === true && !actorHasAdminPermission(req.user?.permissions)) {
      throw adminValidationError("\u064A\u062A\u0637\u0644\u0628 \u0625\u0646\u0634\u0627\u0621 \u0645\u0633\u062A\u062E\u062F\u0645 \u0646\u0638\u0627\u0645 \u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0644\u0645\u0633\u0624\u0648\u0644", 403);
    }
    const username = typeof raw.username === "string" ? raw.username.trim() : "";
    const password = typeof raw.password === "string" ? raw.password : "";
    if (!username) return res.status(400).json({ message: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0645\u0637\u0644\u0648\u0628" });
    if (password.trim().length < 8) return res.status(400).json({ message: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 8 \u0623\u062D\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644" });
    const body = parsed(userAdminSchema.extend({
      username: requiredAdminText(50),
      password: z6.string().refine((value) => value.trim().length >= 8, "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 8 \u0623\u062D\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644")
    }), { ...raw, username, password });
    const inserted = await db.transaction(async (tx) => {
      await validateUserRoleGrant(tx, body.role_id, req.user?.permissions ?? []);
      await validateOptionalReference(tx, sections, sections.id, body.section_id, void 0, "\u0627\u0644\u0642\u0633\u0645 \u0627\u0644\u0645\u062D\u062F\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F");
      return tx.insert(users).values({ ...body, password: await bcrypt2.hash(password, 12) }).returning({ id: users.id });
    });
    res.status(201).json({ id: inserted[0].id });
  } catch (error) {
    next(error);
  }
});
router3.put("/users/:id", usersRead, async (req, res, next) => {
  try {
    const id2 = userId(req.params.id);
    const raw = { ...req.body ?? {} };
    assertPutIdIsImmutable(raw, id2);
    if ("password" in raw) {
      if (typeof raw.password !== "string") {
        return res.status(400).json({ message: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629" });
      }
      if (!raw.password.trim()) {
        delete raw.password;
      } else if (raw.password.trim().length < 8) {
        return res.status(400).json({ message: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 8 \u0623\u062D\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644" });
      }
    }
    const body = parsed(userAdminSchema.partial(), raw);
    if (!Object.keys(body).length) return res.status(400).json({ message: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0628\u064A\u0627\u0646\u0627\u062A \u0644\u0644\u062A\u0639\u062F\u064A\u0644" });
    const row = await db.transaction(async (tx) => {
      const [target] = await tx.select({
        id: users.id,
        role_id: users.role_id,
        section_id: users.section_id,
        is_system_user: users.is_system_user
      }).from(users).where(eq8(users.id, id2)).for("update").limit(1);
      if (!target) return [];
      if (Object.prototype.hasOwnProperty.call(body, "is_system_user") && body.is_system_user !== target.is_system_user && !actorHasAdminPermission(req.user?.permissions)) {
        throw adminValidationError("\u064A\u062A\u0637\u0644\u0628 \u062A\u063A\u064A\u064A\u0631 \u062D\u0627\u0644\u0629 \u0645\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0646\u0638\u0627\u0645 \u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0644\u0645\u0633\u0624\u0648\u0644", 403);
      }
      if (target.role_id != null) {
        await validateUserRoleGrant(tx, target.role_id, req.user?.permissions ?? [], true);
      }
      if (Object.prototype.hasOwnProperty.call(body, "role_id") && body.role_id !== target.role_id) {
        await validateUserRoleGrant(tx, body.role_id, req.user?.permissions ?? []);
      }
      await validateOptionalReference(tx, sections, sections.id, body.section_id, target.section_id, "\u0627\u0644\u0642\u0633\u0645 \u0627\u0644\u0645\u062D\u062F\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F");
      const values = { ...body };
      if (typeof values.password === "string") values.password = await bcrypt2.hash(values.password, 12);
      return tx.update(users).set(values).where(eq8(users.id, id2)).returning({ id: users.id, username: users.username, status: users.status });
    });
    if (!row[0]) return res.status(404).json({ message: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
    res.json(row[0]);
  } catch (error) {
    next(error);
  }
});
router3.delete("/users/:id", admin2, async (req, res, next) => {
  try {
    const id2 = userId(req.params.id);
    if (id2 === req.user.id) return res.status(409).json({ message: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u062D\u0627\u0644\u064A" });
    const target = (await db.select({ id: users.id, is_system_user: users.is_system_user }).from(users).where(eq8(users.id, id2)).limit(1))[0];
    if (!target) return res.status(404).json({ message: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
    if (target.is_system_user) return res.status(409).json({ message: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0645\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0646\u0638\u0627\u0645" });
    const row = await db.transaction(async (tx) => {
      await tx.update(customers).set({ sales_rep_id: null }).where(eq8(customers.sales_rep_id, id2));
      const legacyRolls = await tx.execute(
        sql9`SELECT to_regclass('public.rolls')::text AS table_name`
      );
      if (legacyRolls.rows[0]?.table_name) {
        await tx.execute(sql9`UPDATE public.rolls SET created_by = NULL WHERE created_by = ${id2}`);
      }
      await tx.update(system_settings).set({ updated_by: null }).where(eq8(system_settings.updated_by, id2));
      return (await tx.delete(users).where(eq8(users.id, id2)).returning({ id: users.id }))[0];
    });
    if (!row) return res.status(404).json({ message: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
    res.json({ success: true, id: row.id });
  } catch (error) {
    next(error);
  }
});
router3.get("/roles", rolesRead, async (req, res, next) => {
  try {
    const { search } = page(req);
    res.json(await db.select().from(roles).where(search ? or5(
      ilike(roles.name, `%${search}%`),
      ilike(roles.name_ar, `%${search}%`),
      sql9`${roles.id}::text ILIKE ${`%${search}%`}`
    ) : void 0).orderBy(roles.id));
  } catch (e) {
    next(e);
  }
});
router3.get("/sections", sectionsRead, async (req, res, next) => {
  try {
    const { search } = page(req);
    res.json(await db.select().from(sections).where(search ? or5(
      ilike(sections.id, `%${search}%`),
      ilike(sections.name, `%${search}%`),
      ilike(sections.name_ar, `%${search}%`)
    ) : void 0).orderBy(sections.id));
  } catch (e) {
    next(e);
  }
});
router3.post("/roles", rolesWrite, async (req, res, next) => {
  try {
    const body = parsed(roleAdminSchema, stripCreateId({ ...req.body ?? {} }));
    assertGrantWithinActor(req.user?.permissions ?? [], body.permissions);
    const row = await db.insert(roles).values(body).returning();
    res.status(201).json(row[0]);
  } catch (e) {
    next(e);
  }
});
router3.post("/sections", sectionsWrite, async (req, res, next) => {
  try {
    const body = parsed(sectionAdminSchema, stripCreateId({ ...req.body ?? {} }));
    const row = await db.transaction(async (tx) => {
      await tx.execute(sql9`SELECT pg_advisory_xact_lock(${29832}, ${4})`);
      const sequence = await tx.execute(sql9`
        SELECT MAX(substring(id from 4)::numeric)::text AS max_number,
               MAX(length(id) - 3)::int AS suffix_width
        FROM sections WHERE id ~ '^SEC[0-9]+$'
      `);
      const number = await nextAdminIdNumber(tx, "sections", sequence.rows[0]?.max_number ?? null);
      const id2 = nextSectionId((BigInt(number) - 1n).toString(), sequence.rows[0]?.suffix_width ?? null);
      return tx.insert(sections).values({ ...body, id: id2 }).returning();
    });
    res.status(201).json(row[0]);
  } catch (e) {
    next(e);
  }
});
router3.put("/roles/:id", rolesWrite, async (req, res, next) => {
  try {
    const id2 = Number(req.params.id);
    if (!Number.isSafeInteger(id2) || id2 < 1) return res.status(400).json({ message: "\u0627\u0644\u0645\u0639\u0631\u0651\u0641 \u0627\u0644\u0631\u0642\u0645\u064A \u063A\u064A\u0631 \u0635\u0627\u0644\u062D" });
    const input = { ...req.body ?? {} };
    assertPutIdIsImmutable(input, id2);
    const body = parsed(roleAdminSchema.partial(), input);
    const row = await db.transaction(async (tx) => {
      const [current] = await tx.select({ permissions: roles.permissions }).from(roles).where(eq8(roles.id, id2)).for("update").limit(1);
      if (!current) return [];
      assertGrantWithinActor(req.user?.permissions ?? [], current.permissions);
      if (Object.prototype.hasOwnProperty.call(body, "permissions")) {
        assertGrantWithinActor(req.user?.permissions ?? [], body.permissions);
      }
      return tx.update(roles).set(body).where(eq8(roles.id, id2)).returning();
    });
    if (!row[0]) return res.status(404).json({ message: "\u0627\u0644\u062F\u0648\u0631 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
    res.json(row[0]);
  } catch (e) {
    next(e);
  }
});
router3.put("/sections/:id", sectionsWrite, async (req, res, next) => {
  try {
    const id2 = req.params.id;
    const input = { ...req.body ?? {} };
    assertPutIdIsImmutable(input, id2);
    const body = parsed(sectionAdminSchema.partial(), input);
    const row = await db.update(sections).set(body).where(eq8(sections.id, id2)).returning();
    if (!row[0]) return res.status(404).json({ message: "\u0627\u0644\u0642\u0633\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
    res.json(row[0]);
  } catch (e) {
    next(e);
  }
});
router3.delete("/roles/:id", admin2, async (req, res, next) => {
  try {
    const id2 = Number(req.params.id);
    if (!Number.isSafeInteger(id2) || id2 < 1) return res.status(400).json({ message: "\u0627\u0644\u0645\u0639\u0631\u0651\u0641 \u0627\u0644\u0631\u0642\u0645\u064A \u063A\u064A\u0631 \u0635\u0627\u0644\u062D" });
    const row = await db.delete(roles).where(eq8(roles.id, id2)).returning({ id: roles.id });
    if (!row[0]) return res.status(404).json({ message: "\u0627\u0644\u062F\u0648\u0631 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
    res.json({ success: true, id: row[0].id });
  } catch (e) {
    next(e);
  }
});
router3.delete("/sections/:id", admin2, async (req, res, next) => {
  try {
    const id2 = req.params.id;
    const row = await db.transaction(async (tx) => {
      const [current] = await tx.select({ id: sections.id }).from(sections).where(eq8(sections.id, id2)).for("update").limit(1);
      if (!current) return null;
      const [userReference] = await tx.select({ id: users.id }).from(users).where(eq8(users.section_id, id2)).limit(1);
      const [machineReference] = await tx.select({ id: machines.id }).from(machines).where(eq8(machines.section_id, id2)).limit(1);
      if (userReference || machineReference) {
        throw orderError("\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0627\u0644\u0642\u0633\u0645 \u0644\u0627\u0631\u062A\u0628\u0627\u0637\u0647 \u0628\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646 \u0623\u0648 \u0645\u0627\u0643\u064A\u0646\u0627\u062A", 409);
      }
      return (await tx.delete(sections).where(eq8(sections.id, id2)).returning({ id: sections.id }))[0] ?? null;
    });
    if (!row) return res.status(404).json({ message: "\u0627\u0644\u0642\u0633\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
    res.json({ success: true, id: row.id });
  } catch (e) {
    next(e);
  }
});
router3.get("/orders/next-number", ordersWrite, async (_req, res, next) => {
  try {
    res.set("Cache-Control", "no-store");
    res.json({ order_number: await previewOrderNumber(db) });
  } catch (error) {
    next(error);
  }
});
router3.post("/orders/with-items", ordersWrite, async (req, res, next) => {
  try {
    const input = orderWithItemsSchema.parse(req.body);
    const result = await db.transaction(async (tx) => {
      const orderNumber = await allocateOrderNumber(tx);
      const customer = await tx.select({ id: customers.id }).from(customers).where(eq8(customers.id, input.customer_id)).limit(1);
      if (!customer.length) {
        const error = new Error("\u0627\u0644\u0639\u0645\u064A\u0644 \u0627\u0644\u0645\u062D\u062F\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F");
        error.status = 400;
        throw error;
      }
      const createdAt = /* @__PURE__ */ new Date();
      const deliveryDate = deliveryDateFromDays(orderDateInRiyadh(createdAt), input.delivery_days);
      const [order] = await tx.insert(orders).values({
        order_number: orderNumber,
        customer_id: input.customer_id,
        created_at: createdAt,
        delivery_days: input.delivery_days,
        delivery_date: deliveryDate,
        notes: input.notes,
        status: "waiting",
        created_by: req.user.id
      }).returning();
      const createdLines = [];
      for (const [index3, line] of input.items.entries()) {
        let productId = line.customer_product_id;
        if (line.new_product) {
          const [created] = await createCustomerProductInTransaction(tx, line.new_product, input.customer_id);
          productId = created.id;
        } else {
          const [existing] = await tx.select({ id: customer_products.id }).from(customer_products).where(and4(eq8(customer_products.id, productId), eq8(customer_products.customer_id, input.customer_id))).for("update").limit(1);
          if (!existing) {
            const error = new Error(`\u0645\u0646\u062A\u062C \u0627\u0644\u0633\u0637\u0631 ${index3 + 1} \u063A\u064A\u0631 \u062A\u0627\u0628\u0639 \u0644\u0644\u0639\u0645\u064A\u0644 \u0627\u0644\u0645\u062D\u062F\u062F`);
            error.status = 400;
            throw error;
          }
        }
        const plan = await categoryProductionPlan(tx, productId, line.quantity_kg);
        const [productionOrder] = await tx.insert(production_orders).values({
          production_order_number: productionOrderNumber(orderNumber, index3 + 1),
          order_id: order.id,
          customer_product_id: productId,
          quantity_kg: line.quantity_kg,
          ...plan,
          status: "pending"
        }).returning();
        createdLines.push(productionOrder);
      }
      return { order, production_orders: createdLines };
    });
    res.status(201).json(result);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "\u0631\u0642\u0645 \u0627\u0644\u0637\u0644\u0628 \u0623\u0648 \u0631\u0642\u0645 \u0623\u0645\u0631 \u0627\u0644\u0625\u0646\u062A\u0627\u062C \u0645\u0633\u062A\u062E\u062F\u0645 \u0645\u0633\u0628\u0642\u064B\u0627" });
    }
    next(error);
  }
});
var workspaceItems = z6.array(z6.object({
  id: z6.number().int().positive().max(2147483647),
  expected_status: z6.enum(ORDER_WORKSPACE_STATUSES)
}).strict()).min(1).max(100).refine((items2) => new Set(items2.map((item) => item.id)).size === items2.length);
var workspaceFailure = (error, res, next) => {
  const failure = error;
  if (failure.status) {
    res.status(failure.status).json({ message: failure.message, message_en: failure.message_en });
    return;
  }
  next(error);
};
router3.get("/orders/display-folders", ordersRead, async (_req, res, next) => {
  try {
    res.json(await orderFolderCounts());
  } catch (error) {
    workspaceFailure(error, res, next);
  }
});
router3.post("/orders/actions", ordersWrite, async (req, res, next) => {
  try {
    const input = z6.object({ action: z6.enum(ORDER_WORKSPACE_ACTIONS), items: workspaceItems }).strict().parse(req.body);
    res.json(await applyOrderActions(input.action, input.items));
  } catch (error) {
    workspaceFailure(error, res, next);
  }
});
router3.post("/orders/bulk-delete", admin2, async (req, res, next) => {
  try {
    const input = z6.object({ items: workspaceItems }).strict().parse(req.body);
    res.json(await deleteOrdersAtomically(input.items));
  } catch (error) {
    workspaceFailure(error, res, next);
  }
});
router3.post("/orders/display-folders/move", ordersWrite, async (req, res, next) => {
  try {
    const input = z6.object({
      folder: z6.enum(ORDER_DISPLAY_FOLDERS),
      items: z6.array(z6.object({
        id: z6.number().int().positive().max(2147483647),
        expected_folder: z6.enum(ORDER_DISPLAY_FOLDERS)
      }).strict()).min(1).max(100).refine((items2) => new Set(items2.map((item) => item.id)).size === items2.length)
    }).strict().parse(req.body);
    res.json(await moveOrderFolders(input.folder, input.items, req.user.id));
  } catch (error) {
    workspaceFailure(error, res, next);
  }
});
router3.post("/orders/:id/release-production", ordersWrite, async (req, res, next) => {
  try {
    const id2 = entityId("orders", req.params.id);
    const input = z6.object({ expected_status: z6.enum(ORDER_PRODUCTION_RELEASE_STATUSES) }).strict().parse(req.body);
    res.json(await releaseOrderToProduction(id2, input.expected_status));
  } catch (error) {
    next(error);
  }
});
router3.get("/orders/:id/print-link", ordersRead, async (req, res, next) => {
  res.set("Cache-Control", "no-store");
  try {
    const id2 = entityId("orders", req.params.id);
    const [order] = await db.select({ id: orders.id }).from(orders).where(eq8(orders.id, id2)).limit(1);
    if (!order) return res.status(404).json({ message: "\u0627\u0644\u0637\u0644\u0628 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
    res.json({ path: publicOrderPrintPath(id2) });
  } catch (error) {
    next(error);
  }
});
router3.get("/orders/:id/details", ordersRead, async (req, res, next) => {
  try {
    const id2 = entityId("orders", req.params.id);
    const details = await getOrderDetails(id2);
    if (!details) return res.status(404).json({ message: "\u0627\u0644\u0637\u0644\u0628 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
    res.json(details);
  } catch (error) {
    next(error);
  }
});
router3.get("/orders/:id/with-items", ordersRead, async (req, res, next) => {
  try {
    const id2 = entityId("orders", req.params.id);
    const [order] = await db.select().from(orders).where(eq8(orders.id, id2)).limit(1);
    if (!order) return res.status(404).json({ message: "\u0627\u0644\u0637\u0644\u0628 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
    const lines = await db.select({
      id: production_orders.id,
      production_order_number: production_orders.production_order_number,
      customer_product_id: production_orders.customer_product_id,
      quantity_kg: production_orders.quantity_kg,
      status: production_orders.status,
      batch_number: production_orders.batch_number
    }).from(production_orders).where(eq8(production_orders.order_id, order.id)).orderBy(production_orders.id);
    res.json({ order, items: lines });
  } catch (error) {
    next(error);
  }
});
router3.put("/orders/:id/with-items", ordersWrite, async (req, res, next) => {
  try {
    const id2 = entityId("orders", req.params.id);
    const input = orderEditSchema.parse(req.body);
    const result = await db.transaction(async (tx) => {
      const [order] = await tx.select().from(orders).where(eq8(orders.id, id2)).for("update");
      if (!order) throw orderError("\u0627\u0644\u0637\u0644\u0628 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F", 404);
      const deliveryDate = deliveryDateFromDays(orderDateInRiyadh(new Date(order.created_at)), input.delivery_days);
      const existing = await tx.select().from(production_orders).where(eq8(production_orders.order_id, id2)).orderBy(production_orders.id).for("update");
      const byId = new Map(existing.map((line) => [line.id, line]));
      const submittedIds = input.items.flatMap((line) => line.id ? [line.id] : []);
      if (new Set(submittedIds).size !== submittedIds.length || submittedIds.some((lineId) => !byId.has(lineId))) {
        throw orderError("\u062A\u063A\u064A\u0631\u062A \u0628\u0646\u0648\u062F \u0627\u0644\u0637\u0644\u0628\u061B \u0623\u0639\u062F \u0641\u062A\u062D \u0627\u0644\u0637\u0644\u0628 \u0642\u0628\u0644 \u0627\u0644\u062A\u0639\u062F\u064A\u0644");
      }
      const remaining = new Set(submittedIds);
      for (const line of existing) {
        const unchanged = input.items.find((item) => item.id === line.id);
        if (isProtectedProductionOrder(line.status, line.batch_number, line.previous_status) && (!unchanged || unchanged.new_product || unchanged.customer_product_id !== line.customer_product_id || Number(unchanged.quantity_kg) !== Number(line.quantity_kg))) {
          throw orderError(`\u0628\u062F\u0623 \u0627\u0644\u0639\u0645\u0644 \u0639\u0644\u0649 \u0623\u0645\u0631 \u0627\u0644\u0625\u0646\u062A\u0627\u062C ${line.production_order_number}\u061B \u0644\u0627 \u064A\u0645\u0643\u0646 \u062A\u063A\u064A\u064A\u0631 \u0645\u0646\u062A\u062C\u0647 \u0623\u0648 \u0643\u0645\u064A\u062A\u0647 \u0623\u0648 \u062D\u0630\u0641\u0647`);
        }
      }
      if (existing.length !== input.original_items.length || existing.some((line) => !input.original_items.some((snapshot) => snapshot.id === line.id && snapshot.customer_product_id === line.customer_product_id && Number(snapshot.quantity_kg) === Number(line.quantity_kg)))) {
        throw orderError("\u062A\u063A\u064A\u0631\u062A \u0628\u0646\u0648\u062F \u0627\u0644\u0637\u0644\u0628 \u0645\u0646\u0630 \u0641\u062A\u062D\u0647\u0627\u061B \u0623\u0639\u062F \u0641\u062A\u062D \u0627\u0644\u0637\u0644\u0628 \u0642\u0628\u0644 \u0627\u0644\u062D\u0641\u0638");
      }
      let nextSuffix = existing.reduce((max, line) => {
        return Math.max(max, productionOrderSequence(order.order_number, line.production_order_number));
      }, 0);
      const [updatedOrder] = await tx.update(orders).set({
        notes: input.notes ?? null,
        delivery_days: input.delivery_days,
        delivery_date: deliveryDate
      }).where(eq8(orders.id, id2)).returning();
      const resultLines = [];
      for (const line of input.items) {
        let productId = line.customer_product_id;
        if (line.new_product) {
          const [created] = await createCustomerProductInTransaction(tx, line.new_product, order.customer_id);
          productId = created.id;
        } else {
          const [product] = await tx.select({ id: customer_products.id }).from(customer_products).where(and4(eq8(customer_products.id, productId), eq8(customer_products.customer_id, order.customer_id))).for("update").limit(1);
          if (!product) throw orderError("\u0627\u0644\u0645\u0646\u062A\u062C \u063A\u064A\u0631 \u062A\u0627\u0628\u0639 \u0644\u0639\u0645\u064A\u0644 \u0627\u0644\u0637\u0644\u0628", 400);
        }
        if (line.id) {
          const previous = byId.get(line.id);
          if (previous.customer_product_id === productId && Number(previous.quantity_kg) === Number(line.quantity_kg)) {
            resultLines.push(previous);
          } else {
            const quantityChanged = Number(previous.quantity_kg) !== Number(line.quantity_kg);
            const finalQuantity = quantityChanged ? productionQuantity.parse(plannedFinalQuantity(
              line.quantity_kg,
              productionOverrun.parse(String(previous.overrun_percentage ?? "0"))
            )) : previous.final_quantity_kg;
            const [updated] = await tx.update(production_orders).set({
              customer_product_id: productId,
              quantity_kg: line.quantity_kg,
              final_quantity_kg: finalQuantity
            }).where(eq8(production_orders.id, line.id)).returning();
            resultLines.push(updated);
          }
        } else {
          nextSuffix += 1;
          const plan = await categoryProductionPlan(tx, productId, line.quantity_kg);
          const [created] = await tx.insert(production_orders).values({
            production_order_number: productionOrderNumber(order.order_number, nextSuffix),
            order_id: id2,
            customer_product_id: productId,
            quantity_kg: line.quantity_kg,
            ...plan,
            status: "pending"
          }).returning();
          resultLines.push(created);
        }
      }
      for (const line of existing) {
        if (!remaining.has(line.id)) await tx.delete(production_orders).where(eq8(production_orders.id, line.id));
      }
      return { order: updatedOrder, production_orders: resultLines };
    });
    res.json(result);
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ message: "\u0631\u0642\u0645 \u0623\u0645\u0631 \u0627\u0644\u0625\u0646\u062A\u0627\u062C \u0645\u0633\u062A\u062E\u062F\u0645 \u0645\u0633\u0628\u0642\u064B\u0627\u061B \u0623\u0639\u062F \u0641\u062A\u062D \u0627\u0644\u0637\u0644\u0628" });
    if (error.code === "23503") return res.status(409).json({ message: "\u0623\u0645\u0631 \u0627\u0644\u0625\u0646\u062A\u0627\u062C \u0645\u0631\u062A\u0628\u0637 \u0628\u0628\u064A\u0627\u0646\u0627\u062A \u0623\u062E\u0631\u0649 \u0648\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641\u0647" });
    next(error);
  }
});
var entities = { customers, categories, items, "master-batch-colors": master_batch_colors, "customer-products": customer_products, machines, orders, "production-orders": production_orders, "maintenance-component-catalog": maintenance_component_catalog, "system-settings": system_settings };
var schemas = { customers: insertCustomerSchema, categories: insertCategorySchema, items: insertItemSchema, "master-batch-colors": insertMasterBatchColorSchema, "customer-products": insertCustomerProductSchema, machines: insertMachineSchema, orders: insertNewOrderSchema, "production-orders": insertProductionOrderSchema, "maintenance-component-catalog": insertMaintenanceComponentCatalogSchema, "system-settings": insertSystemSettingSchema };
var numericEntityIds = /* @__PURE__ */ new Set(["customer-products", "orders", "production-orders", "maintenance-component-catalog", "system-settings"]);
function entityId(path2, raw) {
  if (!numericEntityIds.has(path2)) return raw;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1) {
    const error = new Error("\u0627\u0644\u0645\u0639\u0631\u0651\u0641 \u0627\u0644\u0631\u0642\u0645\u064A \u063A\u064A\u0631 \u0635\u0627\u0644\u062D");
    error.status = 400;
    throw error;
  }
  return value;
}
var entityRead = {
  customers: businessRead,
  categories: categoriesRead,
  items: itemsRead,
  "master-batch-colors": masterBatchRead,
  "customer-products": customerProductsRead,
  machines: machinesRead,
  orders: ordersRead,
  "production-orders": productionRead,
  "maintenance-component-catalog": maintenanceRead,
  "system-settings": settingsRead
};
var entityWrite = {
  customers: businessWrite,
  categories: categoriesWrite,
  items: itemsWrite,
  "master-batch-colors": masterBatchWrite,
  "customer-products": businessWrite,
  machines: machinesWrite,
  orders: ordersWrite,
  "production-orders": productionWrite,
  "maintenance-component-catalog": maintenanceWrite,
  "system-settings": settingsRead
};
var entitySearch = {
  customers: [customers.name, customers.name_ar, customers.code, customers.plate_drawer_code, customers.city, customers.phone],
  categories: [categories.id, categories.name, categories.name_ar, categories.code],
  items: [items.id, items.name, items.name_ar, items.code],
  "master-batch-colors": [master_batch_colors.id, master_batch_colors.name, master_batch_colors.name_ar, master_batch_colors.brand, master_batch_colors.aliases],
  "customer-products": [customer_products.size_caption, customer_products.raw_material, customer_products.printing_cylinder, customer_products.master_batch_id, customer_products.cutting_unit, customer_products.punching, customer_products.notes, customer_products.status],
  machines: [machines.id, machines.name, machines.name_ar, machines.type, machines.status, machines.manufacturer, machines.serial_number],
  orders: [orders.order_number, orders.status, orders.previous_status, orders.notes, orders.share_token],
  "production-orders": [production_orders.production_order_number, production_orders.status, production_orders.previous_status, production_orders.batch_number],
  "maintenance-component-catalog": [maintenance_component_catalog.id, maintenance_component_catalog.machine_type, maintenance_component_catalog.name_ar, maintenance_component_catalog.name_en],
  "system-settings": [system_settings.setting_key, system_settings.setting_value, system_settings.setting_type, system_settings.description]
};
var categoryParent = aliasedTable3(categories, "category_parent");
var itemCategory = aliasedTable3(categories, "item_category");
var customerSalesRep = aliasedTable3(users, "customer_sales_rep");
router3.get("/customers/sales-representatives", businessRead, async (_req, res, next) => {
  try {
    const representatives = await db.select({
      id: users.id,
      display_name: users.display_name,
      display_name_ar: users.display_name_ar
    }).from(users).innerJoin(roles, eq8(users.role_id, roles.id)).where(salesRepresentativeRoleCondition).orderBy(asc2(users.display_name_ar), asc2(users.display_name), asc2(users.id));
    res.json(representatives);
  } catch (error) {
    next(error);
  }
});
router3.get("/customer-products/form-options", customerProductsRead, async (_req, res, next) => {
  try {
    const rows2 = await db.selectDistinct({ printing_cylinder: customer_products.printing_cylinder }).from(customer_products);
    const seen = new Set(PRINTING_CYLINDERS);
    const printing_cylinders = [...PRINTING_CYLINDERS];
    for (const row of rows2) {
      const value = row.printing_cylinder;
      if (value?.trim() && !seen.has(value)) {
        seen.add(value);
        printing_cylinders.push(value);
      }
    }
    res.json({ printing_cylinders });
  } catch (error) {
    next(error);
  }
});
router3.get("/items/category-options", itemsRead, async (req, res, next) => {
  try {
    const { limit, offset } = page(req);
    const rows2 = await db.select({
      id: categories.id,
      name: categories.name,
      name_ar: categories.name_ar
    }).from(categories).orderBy(asc2(categories.id)).limit(limit).offset(offset);
    res.json(rows2);
  } catch (error) {
    next(error);
  }
});
for (const [path2, table] of Object.entries(entities)) {
  const mutationGuard = entityWrite[path2];
  router3.get(`/${path2}`, entityRead[path2], async (req, res, next) => {
    try {
      const { limit, offset, search } = page(req);
      const term = `%${search}%`;
      let rows2;
      if (path2 === "customers") {
        const conditions = [
          ...entitySearch[path2],
          customerSalesRep.display_name,
          customerSalesRep.display_name_ar
        ].map((column) => ilike(column, term));
        rows2 = await db.select({
          ...getTableColumns2(customers),
          sales_rep_name: customerSalesRep.display_name,
          sales_rep_name_ar: customerSalesRep.display_name_ar
        }).from(customers).leftJoin(customerSalesRep, eq8(customers.sales_rep_id, customerSalesRep.id)).where(search ? or5(...conditions) : void 0).orderBy(desc3(customers.id)).limit(limit).offset(offset);
      } else if (path2 === "customer-products") {
        const conditions = [
          ...entitySearch[path2],
          customers.name,
          customers.name_ar,
          categories.name,
          categories.name_ar,
          items.name,
          items.name_ar,
          master_batch_colors.name,
          master_batch_colors.name_ar
        ].map((column) => ilike(column, term));
        rows2 = await db.select({
          ...getTableColumns2(customer_products),
          customer_name: customers.name,
          customer_name_ar: customers.name_ar,
          category_name: categories.name,
          category_name_ar: categories.name_ar,
          item_name: items.name,
          item_name_ar: items.name_ar,
          master_batch_name: master_batch_colors.name,
          master_batch_name_ar: master_batch_colors.name_ar,
          master_batch_color_hex: master_batch_colors.color_hex
        }).from(customer_products).leftJoin(customers, eq8(customer_products.customer_id, customers.id)).leftJoin(categories, eq8(customer_products.category_id, categories.id)).leftJoin(items, eq8(customer_products.item_id, items.id)).leftJoin(master_batch_colors, eq8(customer_products.master_batch_id, master_batch_colors.id)).where(search ? or5(...conditions) : void 0).orderBy(desc3(customer_products.id)).limit(limit).offset(offset);
      } else if (path2 === "orders") {
        const folder = z6.enum(ORDER_DISPLAY_FOLDERS).optional().parse(req.query.display_folder);
        const conditions = [...entitySearch[path2], customers.name, customers.name_ar].map((column) => ilike(column, term));
        rows2 = await db.select({
          ...getTableColumns2(orders),
          display_folder: sql9`COALESCE(${order_display_folder_assignments.folder}, 'new')`,
          customer_name: customers.name,
          customer_name_ar: customers.name_ar
        }).from(orders).leftJoin(customers, eq8(orders.customer_id, customers.id)).leftJoin(order_display_folder_assignments, eq8(order_display_folder_assignments.order_id, orders.id)).where(and4(
          search ? or5(...conditions) : void 0,
          folder === "new" ? or5(isNull3(order_display_folder_assignments.order_id), eq8(order_display_folder_assignments.folder, "new")) : folder ? eq8(order_display_folder_assignments.folder, folder) : void 0
        )).orderBy(desc3(orders.id)).limit(limit).offset(offset);
        if (rows2.length) {
          const linked = await db.select({
            id: production_orders.id,
            order_id: production_orders.order_id,
            production_order_number: production_orders.production_order_number,
            quantity_kg: production_orders.quantity_kg,
            item_name: items.name,
            item_name_ar: items.name_ar,
            item_id: customer_products.item_id
          }).from(production_orders).leftJoin(customer_products, eq8(production_orders.customer_product_id, customer_products.id)).leftJoin(items, eq8(customer_products.item_id, items.id)).where(inArray4(production_orders.order_id, rows2.map((row) => row.id))).orderBy(production_orders.id);
          const byOrder = /* @__PURE__ */ new Map();
          for (const production of linked) {
            const entries = byOrder.get(production.order_id) ?? [];
            entries.push(production);
            byOrder.set(production.order_id, entries);
          }
          rows2 = rows2.map((order) => ({ ...order, production_orders_summary: byOrder.get(order.id) ?? [] }));
        }
      } else if (path2 === "production-orders") {
        const conditions = [
          ...entitySearch[path2],
          orders.order_number,
          customer_products.size_caption,
          customers.name,
          customers.name_ar
        ].map((column) => ilike(column, term));
        rows2 = await db.select({
          ...getTableColumns2(production_orders),
          order_number: orders.order_number,
          product_size_caption: customer_products.size_caption,
          customer_name: customers.name,
          customer_name_ar: customers.name_ar
        }).from(production_orders).leftJoin(orders, eq8(production_orders.order_id, orders.id)).leftJoin(customer_products, eq8(production_orders.customer_product_id, customer_products.id)).leftJoin(customers, eq8(orders.customer_id, customers.id)).where(search ? or5(...conditions) : void 0).orderBy(desc3(production_orders.id)).limit(limit).offset(offset);
      } else if (path2 === "machines") {
        const conditions = [...entitySearch[path2], sections.name, sections.name_ar].map((column) => ilike(column, term));
        rows2 = await db.select({
          ...getTableColumns2(machines),
          section_name: sections.name,
          section_name_ar: sections.name_ar
        }).from(machines).leftJoin(sections, eq8(machines.section_id, sections.id)).where(search ? or5(...conditions) : void 0).orderBy(desc3(machines.id)).limit(limit).offset(offset);
      } else if (path2 === "categories") {
        const conditions = [...entitySearch[path2], categoryParent.name, categoryParent.name_ar].map((column) => ilike(column, term));
        rows2 = await db.select({
          ...getTableColumns2(categories),
          parent_name: categoryParent.name,
          parent_name_ar: categoryParent.name_ar
        }).from(categories).leftJoin(categoryParent, eq8(categories.parent_id, categoryParent.id)).where(search ? or5(...conditions) : void 0).orderBy(
          sql9`regexp_replace(${categories.id}, '[0-9]+$', '')`,
          sql9`substring(${categories.id} from '[0-9]+$')::numeric ASC NULLS LAST`,
          asc2(categories.id)
        ).limit(limit).offset(offset);
      } else if (path2 === "items") {
        const categoryId = parsed(z6.string().trim().max(20).optional(), req.query.category_id);
        const conditions = [...entitySearch[path2], itemCategory.name, itemCategory.name_ar].map((column) => ilike(column, term));
        rows2 = await db.select({
          ...getTableColumns2(items),
          category_name: itemCategory.name,
          category_name_ar: itemCategory.name_ar
        }).from(items).leftJoin(itemCategory, eq8(items.category_id, itemCategory.id)).where(and4(
          categoryId ? eq8(items.category_id, categoryId) : void 0,
          search ? or5(...conditions) : void 0
        )).orderBy(
          sql9`regexp_replace(${items.id}, '[0-9]+$', '')`,
          sql9`substring(${items.id} from '[0-9]+$')::numeric ASC NULLS LAST`,
          asc2(items.id)
        ).limit(limit).offset(offset);
      } else {
        const conditions = entitySearch[path2].map((column) => ilike(column, term));
        rows2 = await db.select().from(table).where(search ? or5(...conditions) : void 0).orderBy(desc3(table.id)).limit(limit).offset(offset);
      }
      res.json(rows2);
    } catch (error) {
      next(error);
    }
  });
  router3.post(`/${path2}`, mutationGuard, async (req, res, next) => {
    try {
      const input = { ...req.body ?? {} };
      if (path2 === "customers") {
        delete input.id;
        const body2 = parsed(customerFormSchema, input);
        const [customer] = await db.transaction(async (tx) => {
          await tx.execute(sql9`SELECT pg_advisory_xact_lock(${29832}, ${6})`);
          await validateCustomerSalesRepresentative(tx, body2.sales_rep_id);
          const sequence = await tx.execute(sql9`
            SELECT MAX(substring(id from 4)::numeric)::text AS max_number,
                   MAX(length(substring(id from 4)))::int AS suffix_width
            FROM customers WHERE id ~ '^CID[0-9]+$'
          `);
          const id2 = nextCustomerId(sequence.rows[0]?.max_number ?? null, sequence.rows[0]?.suffix_width ?? null);
          return tx.insert(customers).values({ ...body2, id: id2 }).returning();
        });
        return res.status(201).json(customer);
      }
      if (path2 === "customer-products") {
        const cloneSourceId = z6.number().int().positive().optional().parse(input.clone_source_id);
        const { clone_source_id: _cloneSourceMetadata, ...productInput } = input;
        const body2 = normalizeCustomerProductInput(parsed(customerProductInputSchema, productInput));
        const facingNotice = customerProductFacingNotice(body2);
        if (facingNotice?.kind === "blocking") throw invalidProduct(facingNotice.message);
        const row2 = await db.transaction(async (tx) => {
          let cloneSource = null;
          if (cloneSourceId !== void 0) {
            [cloneSource] = await tx.select({
              id: customer_products.id,
              master_batch_id: customer_products.master_batch_id,
              cliche_front_design: customer_products.cliche_front_design,
              cliche_back_design: customer_products.cliche_back_design
            }).from(customer_products).where(eq8(customer_products.id, cloneSourceId)).limit(1);
            if (!cloneSource) throw invalidProduct("\u0627\u0644\u0645\u0646\u062A\u062C \u0627\u0644\u0645\u0635\u062F\u0631 \u0644\u0644\u0646\u0633\u062E \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F");
          }
          const { customer_id: customerId, ...product } = body2;
          return createCustomerProductInTransaction(tx, product, customerId, {
            oldBatchId: cloneSource?.master_batch_id,
            previousFrontImage: cloneSource?.cliche_front_design,
            previousBackImage: cloneSource?.cliche_back_design
          });
        });
        return res.status(201).json(row2[0]);
      }
      if (path2 === "production-orders") {
        const productionInput = parsed(productionOrderInputSchema, input);
        if (!productionInput.order_id || !productionInput.quantity_kg) {
          return res.status(400).json({ message: "\u0627\u0644\u0637\u0644\u0628 \u0648\u0627\u0644\u0643\u0645\u064A\u0629 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629 \u062D\u0642\u0648\u0644 \u0625\u0644\u0632\u0627\u0645\u064A\u0629" });
        }
        const row2 = await db.transaction(async (tx) => {
          const [parent] = await tx.select().from(orders).where(eq8(orders.id, productionInput.order_id)).for("update").limit(1);
          if (!parent) throw orderError("\u0627\u0644\u0637\u0644\u0628 \u0627\u0644\u0645\u062D\u062F\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F", 400);
          let number = productionInput.production_order_number;
          if (/^O[0-9]+$/.test(parent.order_number) || !number) {
            const siblings = await tx.select({ production_order_number: production_orders.production_order_number }).from(production_orders).where(eq8(production_orders.order_id, parent.id));
            const sequence = siblings.reduce((max, sibling) => Math.max(max, productionOrderSequence(parent.order_number, sibling.production_order_number)), 0) + 1;
            number = productionOrderNumber(parent.order_number, sequence);
          }
          await assertProductionProductMatchesOrder(tx, productionInput.order_id, productionInput.customer_product_id);
          const plan = await categoryProductionPlan(tx, productionInput.customer_product_id, productionInput.quantity_kg);
          const values = {
            ...productionInput,
            production_order_number: number,
            ...plan,
            final_quantity_kg: productionQuantity.parse(plan.final_quantity_kg)
          };
          return tx.insert(production_orders).values(values).returning();
        });
        return res.status(201).json(row2[0]);
      }
      if (path2 === "categories") {
        const { code: _ignoredCode, ...categoryInput } = stripCreateId(input);
        if (categoryInput.parent_id === "") categoryInput.parent_id = null;
        const body2 = parsed(categoryAdminSchema.omit({ code: true }), categoryInput);
        const row2 = await db.transaction(async (tx) => {
          await tx.execute(sql9`SELECT pg_advisory_xact_lock(${29832}, ${2})`);
          const sequence = await tx.execute(sql9`
            SELECT MAX(substring(id from 4)::numeric)::text AS max_number,
                   MAX(length(id) - 3)::int AS suffix_width
            FROM categories
            WHERE id ~ '^CAT[0-9]+$'
          `);
          await validateCategoryParent(tx, body2.parent_id);
          const number = await nextAdminIdNumber(tx, "categories", sequence.rows[0]?.max_number ?? null);
          const id2 = nextCategoryId((BigInt(number) - 1n).toString(), sequence.rows[0]?.suffix_width ?? null);
          return tx.insert(categories).values({ ...body2, id: id2, code: id2 }).returning();
        });
        return res.status(201).json(row2[0]);
      }
      if (path2 === "items") {
        const { code: _ignoredCode, ...itemInput } = stripCreateId(input);
        if (itemInput.category_id === "") itemInput.category_id = null;
        const body2 = parsed(itemAdminSchema.omit({ code: true }), itemInput);
        const row2 = await db.transaction(async (tx) => {
          await tx.execute(sql9`SELECT pg_advisory_xact_lock(${29832}, ${3})`);
          const sequence = await tx.execute(sql9`
            SELECT MAX(substring(id from 4)::numeric)::text AS max_number,
                   MAX(length(id) - 3)::int AS suffix_width
            FROM items
            WHERE id ~ '^ITM[0-9]+$'
          `);
          await validateOptionalReference(tx, categories, categories.id, body2.category_id, void 0, "\u0627\u0644\u062A\u0635\u0646\u064A\u0641 \u0627\u0644\u0645\u062D\u062F\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F");
          const number = await nextAdminIdNumber(tx, "items", sequence.rows[0]?.max_number ?? null);
          const id2 = nextItemId((BigInt(number) - 1n).toString(), sequence.rows[0]?.suffix_width ?? null);
          return tx.insert(items).values({ ...body2, id: id2, code: id2 }).returning();
        });
        return res.status(201).json(row2[0]);
      }
      if (path2 === "master-batch-colors") {
        const colorInput = stripCreateId(input);
        delete colorInput.sort_order;
        const body2 = parsed(masterBatchAdminSchema, colorInput);
        const row2 = await db.transaction(async (tx) => {
          await tx.execute(sql9`SELECT pg_advisory_xact_lock(${29832}, ${6})`);
          const sequence = await tx.execute(sql9`
            SELECT MAX(substring(id from 3)::numeric)::text AS max_number,
                   MAX(length(id) - 2)::int AS suffix_width
            FROM master_batch_colors WHERE id ~ '^MB[0-9]+$'
          `);
          const number = await nextAdminIdNumber(tx, "masterBatchColors", sequence.rows[0]?.max_number ?? null);
          const id2 = nextMasterBatchColorId((BigInt(number) - 1n).toString(), sequence.rows[0]?.suffix_width ?? null);
          return tx.insert(master_batch_colors).values({ ...body2, id: id2 }).returning();
        });
        return res.status(201).json(row2[0]);
      }
      if (path2 === "machines") {
        const body2 = parsed(machineAdminSchema, stripCreateId(input));
        normalizeChangedMachineType(body2);
        if (body2.section_id === "") body2.section_id = null;
        if (body2.inline_printer_id === "") body2.inline_printer_id = null;
        validateMachineRanges(body2);
        const row2 = await db.transaction(async (tx) => {
          await tx.execute(sql9`SELECT pg_advisory_xact_lock(${29832}, ${5})`);
          const sequence = await tx.execute(sql9`
            SELECT MAX(CASE WHEN id LIKE 'MAC%' THEN substring(id from 4)::numeric
                            ELSE substring(id from 2)::numeric END)::text AS max_number
            FROM machines WHERE id ~ '^(MAC|M)[0-9]+$'
          `);
          const number = await nextAdminIdNumber(tx, "machines", sequence.rows[0]?.max_number ?? null);
          const id2 = nextMachineId((BigInt(number) - 1n).toString());
          await validateMachineReferences(tx, body2, { id: id2, section_id: null, inline_printer_id: null, type: body2.type });
          return tx.insert(machines).values({ ...body2, id: id2 }).returning();
        });
        return res.status(201).json(row2[0]);
      }
      if (path2 === "maintenance-component-catalog") {
        const componentInput = stripCreateId(input);
        delete componentInput.sort_order;
        const body2 = parsed(componentAdminSchema, componentInput);
        const row2 = await db.insert(maintenance_component_catalog).values(body2).returning();
        return res.status(201).json(row2[0]);
      }
      if (path2 === "orders") {
        if (!input.status) input.status = "waiting";
        const row2 = await db.transaction(async (tx) => {
          input.order_number = await allocateOrderNumber(tx);
          const body2 = parsed(schemas[path2].strict(), input);
          return tx.insert(orders).values(body2).returning();
        });
        return res.status(201).json(row2[0]);
      }
      if (path2 === "system-settings") input.updated_by = req.user.id;
      const body = parsed(schemas[path2].strict(), input);
      const row = await db.insert(table).values(body).returning();
      res.status(201).json(row[0]);
    } catch (error) {
      next(error);
    }
  });
  router3.put(`/${path2}/:id`, mutationGuard, async (req, res, next) => {
    try {
      const key = entityId(path2, req.params.id);
      if (path2 === "customers") {
        const input2 = { ...req.body ?? {} };
        assertPutIdIsImmutable(input2, key);
        const body2 = parsed(customerFormSchema.partial(), input2);
        if (!Object.keys(body2).length) throw adminValidationError("\u0644\u0627 \u062A\u0648\u062C\u062F \u0628\u064A\u0627\u0646\u0627\u062A \u0644\u0644\u062A\u0639\u062F\u064A\u0644");
        const result = await db.transaction(async (tx) => {
          const [current] = await tx.select().from(customers).where(eq8(customers.id, key)).for("update").limit(1);
          if (!current) return null;
          if (body2.sales_rep_id !== void 0 && body2.sales_rep_id !== current.sales_rep_id) {
            await validateCustomerSalesRepresentative(tx, body2.sales_rep_id);
          }
          return tx.update(customers).set(body2).where(eq8(customers.id, key)).returning();
        });
        if (!result?.[0]) return res.status(404).json({ message: "\u0627\u0644\u0639\u0645\u064A\u0644 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
        return res.json(result[0]);
      }
      if (path2 === "system-settings") {
        const input2 = req.body ?? {};
        if (Object.keys(input2).some((field) => field !== "setting_value")) {
          return res.status(400).json({ message: "\u064A\u0645\u0643\u0646 \u062A\u0639\u062F\u064A\u0644 \u0642\u064A\u0645\u0629 \u0627\u0644\u0625\u0639\u062F\u0627\u062F \u0641\u0642\u0637" });
        }
        if (typeof input2.setting_value !== "string" && input2.setting_value !== null) {
          return res.status(400).json({ message: "\u0642\u064A\u0645\u0629 \u0627\u0644\u0625\u0639\u062F\u0627\u062F \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629" });
        }
        const current = await db.select({ is_editable: system_settings.is_editable }).from(system_settings).where(eq8(system_settings.id, key)).limit(1);
        if (!current[0]) return res.status(404).json({ message: "\u0627\u0644\u0625\u0639\u062F\u0627\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
        if (current[0].is_editable === false) {
          return res.status(403).json({ message: "\u0647\u0630\u0627 \u0627\u0644\u0625\u0639\u062F\u0627\u062F \u063A\u064A\u0631 \u0642\u0627\u0628\u0644 \u0644\u0644\u062A\u0639\u062F\u064A\u0644" });
        }
        const updated = await db.update(system_settings).set({ setting_value: input2.setting_value, updated_at: /* @__PURE__ */ new Date(), updated_by: req.user.id }).where(eq8(system_settings.id, key)).returning();
        return res.json(updated[0]);
      }
      if (path2 === "customer-products") {
        const input2 = normalizeCustomerProductInput(parsed(customerProductInputSchema.partial(), req.body ?? {}));
        const row2 = await db.transaction(async (tx) => {
          const [current] = await tx.select().from(customer_products).where(eq8(customer_products.id, key)).for("update").limit(1);
          if (!current) return null;
          const merged = { ...current, ...input2 };
          const facingNotice = customerProductFacingNotice(merged);
          if (facingNotice?.kind === "blocking") throw invalidProduct(facingNotice.message);
          const category = await validateCustomerProductReferences(
            tx,
            merged,
            current.master_batch_id,
            current.item_id,
            current.category_id
          );
          if (merged.customer_id !== current.customer_id) {
            await assertProductCanTransfer(tx, current.id, merged.customer_id);
          }
          validateProductImage(merged.cliche_front_design, current.cliche_front_design);
          validateProductImage(merged.cliche_back_design, current.cliche_back_design);
          const sizeSourcesChanged = ["width", "left_facing", "right_facing", "printing_cylinder", "cutting_length_cm", "category_id"].some((field) => Object.prototype.hasOwnProperty.call(input2, field) && input2[field] !== current[field]);
          const bagSourcesChanged = ["width", "left_facing", "right_facing", "thickness", "density", "printing_cylinder", "cutting_length_cm", "category_id"].some((field) => Object.prototype.hasOwnProperty.call(input2, field) && input2[field] !== current[field]);
          const packageSourcesChanged = ["unit_weight_kg", "unit_quantity"].some((field) => Object.prototype.hasOwnProperty.call(input2, field) && input2[field] !== current[field]);
          const cylinderUnchanged = merged.printing_cylinder === current.printing_cylinder;
          const categoryUnchanged = merged.category_id === current.category_id;
          const fields = deriveCustomerProductFields(
            {
              ...merged,
              density: merged.density === void 0 ? "0.95" : merged.density,
              size_caption: sizeSourcesChanged ? null : current.size_caption
            },
            `${category?.name_ar ?? ""} ${category?.name ?? ""}`,
            cylinderUnchanged && categoryUnchanged
          );
          if (!bagSourcesChanged && fields.bag_weight_grams === null && fields.bags_per_kilo === null) {
            fields.bag_weight_grams = current.bag_weight_grams;
            fields.bags_per_kilo = current.bags_per_kilo;
          }
          if (!packageSourcesChanged && fields.package_weight_kg === null) fields.package_weight_kg = current.package_weight_kg;
          return tx.update(customer_products).set({ ...input2, ...fields }).where(eq8(customer_products.id, key)).returning();
        });
        if (!row2) return res.status(404).json({ message: "\u0627\u0644\u0645\u0646\u062A\u062C \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
        return res.json(row2[0]);
      }
      if (path2 === "production-orders") {
        const readOnly2 = /* @__PURE__ */ new Set(["id", "created_at"]);
        const input2 = parsed(productionOrderInputSchema, Object.fromEntries(
          Object.entries(req.body ?? {}).filter(([field]) => !readOnly2.has(field))
        ));
        if (Object.keys(input2).length === 0) return res.status(400).json({ message: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0628\u064A\u0627\u0646\u0627\u062A \u0644\u0644\u062A\u0639\u062F\u064A\u0644" });
        const row2 = await db.transaction(async (tx) => {
          const [snapshot] = await tx.select({
            id: production_orders.id,
            order_id: production_orders.order_id
          }).from(production_orders).where(eq8(production_orders.id, key)).limit(1);
          if (!snapshot) return null;
          const orderIds = [.../* @__PURE__ */ new Set([snapshot.order_id, input2.order_id ?? snapshot.order_id])].sort((a, b) => a - b);
          for (const orderId of orderIds) {
            await tx.select({ id: orders.id }).from(orders).where(eq8(orders.id, orderId)).for("share").limit(1);
          }
          const [current] = await tx.select().from(production_orders).where(eq8(production_orders.id, key)).for("update").limit(1);
          if (!current) return null;
          if (current.order_id !== snapshot.order_id) {
            throw orderError("\u062A\u063A\u064A\u0631 \u0627\u0644\u0637\u0644\u0628 \u0627\u0644\u0645\u0631\u062A\u0628\u0637\u061B \u0623\u0639\u062F \u062A\u062D\u0645\u064A\u0644 \u0623\u0645\u0631 \u0627\u0644\u0625\u0646\u062A\u0627\u062C \u0642\u0628\u0644 \u0627\u0644\u062A\u0639\u062F\u064A\u0644", 409);
          }
          const currentIsProtected = isProtectedProductionOrder(
            current.status,
            current.batch_number,
            current.previous_status
          );
          if (currentIsProtected) {
            const productChanged = Object.prototype.hasOwnProperty.call(input2, "customer_product_id") && input2.customer_product_id !== current.customer_product_id;
            const quantityChanged = Object.prototype.hasOwnProperty.call(input2, "quantity_kg") && Number(input2.quantity_kg) !== Number(current.quantity_kg);
            const orderChanged = Object.prototype.hasOwnProperty.call(input2, "order_id") && input2.order_id !== current.order_id;
            if (productChanged || quantityChanged || orderChanged) {
              throw orderError("\u0644\u0627 \u064A\u0645\u0643\u0646 \u062A\u063A\u064A\u064A\u0631 \u0627\u0644\u0645\u0646\u062A\u062C \u0623\u0648 \u0627\u0644\u0643\u0645\u064A\u0629 \u0623\u0648 \u0627\u0644\u0637\u0644\u0628 \u0628\u0639\u062F \u0628\u062F\u0621 \u0623\u0645\u0631 \u0627\u0644\u0625\u0646\u062A\u0627\u062C", 409);
            }
            if (current.status !== "pending" && input2.status === "pending") {
              throw orderError("\u0644\u0627 \u064A\u0645\u0643\u0646 \u0625\u0639\u0627\u062F\u0629 \u0623\u0645\u0631 \u0625\u0646\u062A\u0627\u062C \u0628\u062F\u0623 \u0627\u0644\u0639\u0645\u0644 \u0639\u0644\u064A\u0647 \u0625\u0644\u0649 \u062D\u0627\u0644\u0629 \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631", 409);
            }
            if (current.batch_number != null && Object.prototype.hasOwnProperty.call(input2, "batch_number") && (typeof input2.batch_number !== "string" || !input2.batch_number.trim())) {
              throw orderError("\u0644\u0627 \u064A\u0645\u0643\u0646 \u0625\u0632\u0627\u0644\u0629 \u0631\u0642\u0645 \u062A\u0634\u063A\u064A\u0644\u0629 \u0645\u0646 \u0623\u0645\u0631 \u0625\u0646\u062A\u0627\u062C \u0645\u062D\u0641\u0648\u0638", 409);
            }
            const hasProtectedPreviousStatus = current.status === "pending" && current.previous_status != null && current.previous_status !== "pending";
            if (hasProtectedPreviousStatus && Object.prototype.hasOwnProperty.call(input2, "previous_status") && input2.previous_status !== current.previous_status) {
              throw orderError("\u0644\u0627 \u064A\u0645\u0643\u0646 \u0625\u0632\u0627\u0644\u0629 \u0633\u062C\u0644 \u062D\u0627\u0644\u0629 \u0623\u0645\u0631 \u0625\u0646\u062A\u0627\u062C \u0633\u0628\u0642 \u0628\u062F\u0621 \u0627\u0644\u0639\u0645\u0644 \u0639\u0644\u064A\u0647", 409);
            }
          }
          const merged = { ...current, ...input2 };
          const quantity = productionQuantity.parse(String(merged.quantity_kg));
          const overrun = productionOverrun.parse(String(merged.overrun_percentage ?? "0"));
          const finalWasSubmitted = Object.prototype.hasOwnProperty.call(input2, "final_quantity_kg");
          const quantityPlanChanged = Object.prototype.hasOwnProperty.call(input2, "quantity_kg") || Object.prototype.hasOwnProperty.call(input2, "overrun_percentage");
          const finalQuantity = finalWasSubmitted ? productionQuantity.parse(String(input2.final_quantity_kg)) : quantityPlanChanged ? productionQuantity.parse(plannedFinalQuantity(quantity, overrun)) : productionQuantity.parse(String(merged.final_quantity_kg));
          await assertProductionProductMatchesOrder(tx, merged.order_id, merged.customer_product_id);
          const values = {
            ...input2,
            ...quantityPlanChanged && !finalWasSubmitted ? { final_quantity_kg: finalQuantity } : {},
            ...finalWasSubmitted ? { final_quantity_kg: finalQuantity } : {}
          };
          return tx.update(production_orders).set(values).where(eq8(production_orders.id, key)).returning();
        });
        if (!row2) return res.status(404).json({ message: "\u0627\u0644\u0639\u0646\u0635\u0631 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
        return res.json(row2[0]);
      }
      if (path2 === "categories") {
        const input2 = { ...req.body ?? {} };
        assertPutIdIsImmutable(input2, key);
        if (input2.parent_id === "") input2.parent_id = null;
        const row2 = await db.transaction(async (tx) => {
          await tx.execute(sql9`SELECT pg_advisory_xact_lock(${29832}, ${2})`);
          const [current] = await tx.select({
            id: categories.id,
            parent_id: categories.parent_id,
            code: categories.code
          }).from(categories).where(eq8(categories.id, key)).for("update").limit(1);
          if (!current) return null;
          if (Object.prototype.hasOwnProperty.call(input2, "code")) {
            if (input2.code !== current.code) throw adminValidationError("\u0644\u0627 \u064A\u0645\u0643\u0646 \u062A\u063A\u064A\u064A\u0631 \u0643\u0648\u062F \u0627\u0644\u062A\u0635\u0646\u064A\u0641");
            delete input2.code;
          }
          const body2 = parsed(categoryAdminSchema.omit({ code: true }).partial(), input2);
          if (Object.prototype.hasOwnProperty.call(body2, "parent_id")) {
            await validateCategoryParent(tx, body2.parent_id, current.id, current.parent_id);
          }
          if (!Object.keys(body2).length) throw adminValidationError("\u0644\u0627 \u062A\u0648\u062C\u062F \u0628\u064A\u0627\u0646\u0627\u062A \u0644\u0644\u062A\u0639\u062F\u064A\u0644");
          return tx.update(categories).set(body2).where(eq8(categories.id, key)).returning();
        });
        if (!row2) return res.status(404).json({ message: "\u0627\u0644\u062A\u0635\u0646\u064A\u0641 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
        return res.json(row2[0]);
      }
      if (path2 === "items") {
        const input2 = { ...req.body ?? {} };
        assertPutIdIsImmutable(input2, key);
        if (input2.category_id === "") input2.category_id = null;
        const row2 = await db.transaction(async (tx) => {
          const [current] = await tx.select({
            id: items.id,
            category_id: items.category_id,
            code: items.code
          }).from(items).where(eq8(items.id, key)).for("update").limit(1);
          if (!current) return null;
          if (Object.prototype.hasOwnProperty.call(input2, "code")) {
            if (input2.code !== current.code) throw adminValidationError("\u0644\u0627 \u064A\u0645\u0643\u0646 \u062A\u063A\u064A\u064A\u0631 \u0643\u0648\u062F \u0627\u0644\u0635\u0646\u0641");
            delete input2.code;
          }
          const body2 = parsed(itemAdminSchema.omit({ code: true }).partial(), input2);
          await validateOptionalReference(
            tx,
            categories,
            categories.id,
            body2.category_id,
            current.category_id,
            "\u0627\u0644\u062A\u0635\u0646\u064A\u0641 \u0627\u0644\u0645\u062D\u062F\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F"
          );
          if (!Object.keys(body2).length) throw adminValidationError("\u0644\u0627 \u062A\u0648\u062C\u062F \u0628\u064A\u0627\u0646\u0627\u062A \u0644\u0644\u062A\u0639\u062F\u064A\u0644");
          return tx.update(items).set(body2).where(eq8(items.id, key)).returning();
        });
        if (!row2) return res.status(404).json({ message: "\u0627\u0644\u0635\u0646\u0641 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
        return res.json(row2[0]);
      }
      if (path2 === "master-batch-colors") {
        const input2 = { ...req.body ?? {} };
        assertPutIdIsImmutable(input2, key);
        delete input2.sort_order;
        const body2 = parsed(masterBatchAdminSchema.partial(), input2);
        if (!Object.keys(body2).length) throw adminValidationError("\u0644\u0627 \u062A\u0648\u062C\u062F \u0628\u064A\u0627\u0646\u0627\u062A \u0644\u0644\u062A\u0639\u062F\u064A\u0644");
        const row2 = await db.update(master_batch_colors).set(body2).where(eq8(master_batch_colors.id, key)).returning();
        if (!row2[0]) return res.status(404).json({ message: "\u0644\u0648\u0646 \u0627\u0644\u062E\u0627\u0645\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
        return res.json(row2[0]);
      }
      if (path2 === "machines") {
        const input2 = { ...req.body ?? {} };
        assertPutIdIsImmutable(input2, key);
        if (input2.section_id === "") input2.section_id = null;
        if (input2.inline_printer_id === "") input2.inline_printer_id = null;
        const row2 = await db.transaction(async (tx) => {
          await tx.execute(sql9`SELECT pg_advisory_xact_lock(${29832}, ${5})`);
          const [current] = await tx.select().from(machines).where(eq8(machines.id, key)).for("update").limit(1);
          if (!current) return null;
          normalizeChangedMachineType(input2, current.type);
          const body2 = parsed(machineAdminSchema.partial(), input2);
          if (!Object.keys(body2).length) throw adminValidationError("\u0644\u0627 \u062A\u0648\u062C\u062F \u0628\u064A\u0627\u0646\u0627\u062A \u0644\u0644\u062A\u0639\u062F\u064A\u0644");
          const merged = { ...current, ...body2 };
          validateMachineRanges(merged);
          const typeChanged = await validateMachineTypeTransition(tx, current, merged, body2);
          await validateMachineReferences(tx, merged, current, typeChanged);
          return tx.update(machines).set(body2).where(eq8(machines.id, key)).returning();
        });
        if (!row2) return res.status(404).json({ message: "\u0627\u0644\u0645\u0627\u0643\u064A\u0646\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
        return res.json(row2[0]);
      }
      if (path2 === "maintenance-component-catalog") {
        const input2 = { ...req.body ?? {} };
        assertPutIdIsImmutable(input2, key);
        delete input2.sort_order;
        const body2 = parsed(componentAdminSchema.partial(), input2);
        if (!Object.keys(body2).length) throw adminValidationError("\u0644\u0627 \u062A\u0648\u062C\u062F \u0628\u064A\u0627\u0646\u0627\u062A \u0644\u0644\u062A\u0639\u062F\u064A\u0644");
        const row2 = await db.update(maintenance_component_catalog).set(body2).where(eq8(maintenance_component_catalog.id, key)).returning();
        if (!row2[0]) return res.status(404).json({ message: "\u0645\u0643\u0648\u0651\u0646 \u0627\u0644\u0635\u064A\u0627\u0646\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
        return res.json(row2[0]);
      }
      const readOnly = /* @__PURE__ */ new Set(["id", "created_at", "updated_at", "universal_thickness"]);
      const input = Object.fromEntries(Object.entries(req.body ?? {}).filter(([key2]) => !readOnly.has(key2)));
      if (path2 === "orders" && ("order_number" in input || "customer_id" in input)) {
        return res.status(400).json({ message: "\u0631\u0642\u0645 \u0627\u0644\u0637\u0644\u0628 \u0648\u0627\u0644\u0639\u0645\u064A\u0644 \u062B\u0627\u0628\u062A\u0627\u0646 \u0628\u0639\u062F \u0627\u0644\u0625\u0646\u0634\u0627\u0621\u061B \u0627\u0633\u062A\u062E\u062F\u0645 \u062A\u0639\u062F\u064A\u0644 \u0627\u0644\u0637\u0644\u0628 \u0644\u062A\u063A\u064A\u064A\u0631 \u0628\u0646\u0648\u062F\u0647" });
      }
      const body = parsed(schemas[path2].strict().partial(), input);
      const row = await db.update(table).set(body).where(eq8(table.id, key)).returning();
      if (!row[0]) return res.status(404).json({ message: "\u0627\u0644\u0639\u0646\u0635\u0631 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      res.json(row[0]);
    } catch (error) {
      next(error);
    }
  });
  router3.delete(`/${path2}/:id`, admin2, async (req, res, next) => {
    try {
      const key = entityId(path2, req.params.id);
      const row = await db.transaction(async (tx) => {
        if (path2 === "categories") await tx.execute(sql9`SELECT pg_advisory_xact_lock(${29832}, ${2})`);
        if (path2 === "machines") await tx.execute(sql9`SELECT pg_advisory_xact_lock(${29832}, ${5})`);
        if (path2 === "orders") await lockOrderProductionDeletion(tx);
        if (path2 === "customer-products") {
          const [current] = await tx.select({ id: customer_products.id }).from(customer_products).where(eq8(customer_products.id, key)).for("update").limit(1);
          if (!current) return [];
          const [reference] = await tx.select({ id: production_orders.id }).from(production_orders).where(eq8(production_orders.customer_product_id, key)).limit(1);
          if (reference) throw orderError("\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0627\u0644\u0645\u0646\u062A\u062C \u0644\u0627\u0631\u062A\u0628\u0627\u0637\u0647 \u0628\u0623\u0648\u0627\u0645\u0631 \u0625\u0646\u062A\u0627\u062C", 409);
        } else if (path2 === "customers") {
          const [current] = await tx.select({ id: customers.id }).from(customers).where(eq8(customers.id, key)).for("update").limit(1);
          if (!current) return [];
          const [productReference] = await tx.select({ id: customer_products.id }).from(customer_products).where(eq8(customer_products.customer_id, key)).limit(1);
          const [orderReference] = await tx.select({ id: orders.id }).from(orders).where(eq8(orders.customer_id, key)).limit(1);
          if (productReference || orderReference) {
            throw orderError("\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0627\u0644\u0639\u0645\u064A\u0644 \u0644\u0627\u0631\u062A\u0628\u0627\u0637\u0647 \u0628\u0645\u0646\u062A\u062C\u0627\u062A \u0623\u0648 \u0637\u0644\u0628\u0627\u062A", 409);
          }
        } else if (path2 === "categories") {
          const [current] = await tx.select({ id: categories.id }).from(categories).where(eq8(categories.id, key)).for("update").limit(1);
          if (!current) return [];
          const [productReference] = await tx.select({ id: customer_products.id }).from(customer_products).where(eq8(customer_products.category_id, key)).limit(1);
          const [itemReference] = await tx.select({ id: items.id }).from(items).where(eq8(items.category_id, key)).limit(1);
          const [childReference] = await tx.select({ id: categories.id }).from(categories).where(eq8(categories.parent_id, key)).limit(1);
          if (productReference || itemReference || childReference) {
            throw orderError("\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0627\u0644\u062A\u0635\u0646\u064A\u0641 \u0644\u0627\u0631\u062A\u0628\u0627\u0637\u0647 \u0628\u0645\u0646\u062A\u062C\u0627\u062A \u0623\u0648 \u062A\u0635\u0646\u064A\u0641\u0627\u062A \u0641\u0631\u0639\u064A\u0629", 409);
          }
        } else if (path2 === "items") {
          const [current] = await tx.select({ id: items.id }).from(items).where(eq8(items.id, key)).for("update").limit(1);
          if (!current) return [];
          const [reference] = await tx.select({ id: customer_products.id }).from(customer_products).where(eq8(customer_products.item_id, key)).limit(1);
          if (reference) throw orderError("\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0627\u0644\u0635\u0646\u0641 \u0644\u0627\u0631\u062A\u0628\u0627\u0637\u0647 \u0628\u0645\u0646\u062A\u062C\u0627\u062A \u0627\u0644\u0639\u0645\u0644\u0627\u0621", 409);
        } else if (path2 === "master-batch-colors") {
          const [current] = await tx.select({ id: master_batch_colors.id }).from(master_batch_colors).where(eq8(master_batch_colors.id, key)).for("update").limit(1);
          if (!current) return [];
          const [reference] = await tx.select({ id: customer_products.id }).from(customer_products).where(eq8(customer_products.master_batch_id, key)).limit(1);
          if (reference) throw orderError("\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0644\u0648\u0646 \u0627\u0644\u062E\u0627\u0645\u0629 \u0644\u0627\u0631\u062A\u0628\u0627\u0637\u0647 \u0628\u0645\u0646\u062A\u062C\u0627\u062A \u0627\u0644\u0639\u0645\u0644\u0627\u0621", 409);
        } else if (path2 === "machines") {
          const [current] = await tx.select({ id: machines.id }).from(machines).where(eq8(machines.id, key)).for("update").limit(1);
          if (!current) return [];
          if (await hasInlinePrinterDependents(tx, current.id)) {
            throw orderError("\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0627\u0644\u0645\u0627\u0643\u064A\u0646\u0629 \u0644\u0623\u0646\u0647\u0627 \u0645\u0631\u062A\u0628\u0637\u0629 \u0643\u0637\u0627\u0628\u0639\u0629 \u062F\u0627\u062E\u0644\u064A\u0629 \u0628\u0645\u0627\u0643\u064A\u0646\u0627\u062A \u0628\u062B\u0642", 409);
          }
        } else if (path2 === "production-orders") {
          const [current] = await tx.select({
            id: production_orders.id,
            status: production_orders.status,
            previous_status: production_orders.previous_status,
            batch_number: production_orders.batch_number
          }).from(production_orders).where(eq8(production_orders.id, key)).for("update").limit(1);
          if (!current) return [];
          if (isProtectedProductionOrder(current.status, current.batch_number, current.previous_status)) {
            throw orderError("\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0623\u0645\u0631 \u0625\u0646\u062A\u0627\u062C \u063A\u064A\u0631 \u0645\u0639\u0644\u0642 \u0623\u0648 \u0645\u0631\u062A\u0628\u0637 \u0628\u062A\u0634\u063A\u064A\u0644\u0629", 409);
          }
        } else if (path2 === "orders") {
          const [current] = await tx.select({ id: orders.id }).from(orders).where(eq8(orders.id, key)).for("update").limit(1);
          if (!current) return [];
          await deleteOrderProduction(tx, key);
        }
        return tx.delete(table).where(eq8(table.id, key)).returning({ id: table.id });
      });
      if (!row[0]) return res.status(404).json({ message: "\u0627\u0644\u0639\u0646\u0635\u0631 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      res.json({ success: true, id: row[0].id });
    } catch (error) {
      next(error);
    }
  });
}
router3.get("/customers/:id/detail", businessRead, async (req, res, next) => {
  try {
    const customerId = req.params.id;
    const customer = await db.select({
      ...getTableColumns2(customers),
      sales_rep_name: customerSalesRep.display_name,
      sales_rep_name_ar: customerSalesRep.display_name_ar
    }).from(customers).leftJoin(customerSalesRep, eq8(customers.sales_rep_id, customerSalesRep.id)).where(eq8(customers.id, customerId)).limit(1);
    if (!customer[0]) return res.status(404).json({ message: "\u0627\u0644\u0639\u0645\u064A\u0644 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
    const products = await db.select({
      ...getTableColumns2(customer_products),
      customer_name: customers.name,
      customer_name_ar: customers.name_ar,
      category_name: categories.name,
      category_name_ar: categories.name_ar,
      item_name: items.name,
      item_name_ar: items.name_ar,
      master_batch_name: master_batch_colors.name,
      master_batch_name_ar: master_batch_colors.name_ar
    }).from(customer_products).leftJoin(customers, eq8(customer_products.customer_id, customers.id)).leftJoin(categories, eq8(customer_products.category_id, categories.id)).leftJoin(items, eq8(customer_products.item_id, items.id)).leftJoin(master_batch_colors, eq8(customer_products.master_batch_id, master_batch_colors.id)).where(eq8(customer_products.customer_id, customerId)).orderBy(desc3(customer_products.id));
    return res.json({ customer: customer[0], products });
  } catch (error) {
    next(error);
  }
});
router3.get("/company-profile", settingsRead, async (_req, res, next) => {
  try {
    res.json((await db.select().from(company_profile).limit(1))[0] ?? null);
  } catch (e) {
    next(e);
  }
});
router3.put("/company-profile", settingsRead, async (req, res, next) => {
  try {
    const body = parsed(insertCompanyProfileSchema.strict(), req.body);
    const existing = (await db.select({ id: company_profile.id }).from(company_profile).limit(1))[0];
    const row = existing ? await db.update(company_profile).set(body).where(eq8(company_profile.id, existing.id)).returning() : await db.insert(company_profile).values(body).returning();
    res.json(row[0]);
  } catch (e) {
    next(e);
  }
});
var routes_default2 = router3;

// server/vite.ts
import fs from "fs";
import path from "path";
import express from "express";
import { nanoid } from "nanoid";
import { createServer as createViteServer, createLogger } from "vite";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
    watch: {
      ignored: [
        "**/.cache/**",
        "**/.local/**",
        "**/node_modules/**",
        "**/.config/**",
        "**/.git/**",
        "**/.upm/**",
        "**/attached_assets/**",
        "**/dist/**",
        "**/artifacts/**"
      ]
    }
  };
  const vite = await createViteServer({
    configFile: path.resolve(import.meta.dirname, "..", "vite.config.ts"),
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page2 = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page2);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  const indexPath = path.resolve(distPath, "index.html");
  let cachedHtml;
  try {
    cachedHtml = fs.readFileSync(indexPath, "utf-8");
  } catch (e) {
    log(`Warning: could not pre-read index.html: ${e.message}`);
    cachedHtml = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>MPBF</title></head><body><p style="font-family:system-ui;padding:2rem">\u062C\u0627\u0631\u064A \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u062A\u0637\u0628\u064A\u0642\u2026 \u0623\u0639\u062F \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0635\u0641\u062D\u0629.</p></body></html>`;
  }
  app2.use("*", (_req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.send(cachedHtml);
  });
}

// server/index.ts
var app = express2();
var isProduction = process.env.NODE_ENV === "production";
var port = Number(process.env.PORT || 5e3);
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use((req, res, next) => {
  if (/^\/shared\/orders\/[^/]+\/print\/?$/.test(req.path)) {
    res.set({
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet"
    });
  }
  next();
});
app.use("/api/customer-products", express2.json({ limit: "16mb" }));
app.use("/api/orders", express2.json({ limit: "16mb" }));
app.use(express2.json({ limit: "10mb" }));
app.use(express2.urlencoded({ extended: false, limit: "10mb" }));
var PgSession = connectPgSimple(session);
var sessionStore = new PgSession({
  pool: sessionPool,
  tableName: "sessions",
  createTableIfMissing: false,
  pruneSessionInterval: 60 * 60
});
app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || (isProduction ? (() => {
      throw new Error("SESSION_SECRET must be set in production");
    })() : "development-session-secret"),
    name: "plastic-bag-session",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: 30 * 24 * 60 * 60 * 1e3
    }
  })
);
app.use("/api", populateUser);
app.use("/api", enforcePasswordChange);
app.use("/api", routes_default2);
app.use("/api", (_req, res) => res.status(404).json({ message: "\u0627\u0644\u0645\u0633\u0627\u0631 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" }));
app.use((error, _req, res, _next) => {
  console.error("API error:", error instanceof Error ? error.message : error);
  if (res.headersSent) return;
  if (error?.name === "ZodError") {
    return res.status(400).json({
      message: "\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u062F\u062E\u0644\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629",
      details: error.issues
    });
  }
  const status = Number(error?.status) || 500;
  const code = error?.code ?? error?.cause?.code;
  if (code === "P0011") return res.status(409).json({
    message: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062A\u0639\u062F\u064A\u0644 \u062E\u0637\u0629 \u0623\u0648 \u062D\u0627\u0644\u0629 \u0623\u0645\u0631 \u0628\u062F\u0623 \u062A\u0646\u0641\u064A\u0630\u0647 \u0623\u0648 \u062D\u0630\u0641 \u0633\u062C\u0644\u0627\u062A\u0647\u061B \u0627\u0633\u062A\u062E\u062F\u0645 \u0625\u062C\u0631\u0627\u0621\u0627\u062A \u0627\u0644\u0625\u0646\u062A\u0627\u062C",
    message_en: "A started production plan cannot be edited or deleted. Use the production actions."
  });
  if (status === 413) {
    const limit = /^\/api\/(?:orders|customer-products)(?:\/|\?|$)/.test(_req.originalUrl) ? "16 \u0645\u064A\u062C\u0627\u0628\u0627\u064A\u062A" : "10 \u0645\u064A\u062C\u0627\u0628\u0627\u064A\u062A";
    return res.status(413).json({ message: `\u062D\u062C\u0645 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0623\u0643\u0628\u0631 \u0645\u0646 \u0627\u0644\u062D\u062F \u0627\u0644\u0645\u0633\u0645\u0648\u062D \u0628\u0647 (${limit})` });
  }
  res.status(status).json({
    message: status === 500 ? "\u062D\u062F\u062B \u062E\u0637\u0623 \u062F\u0627\u062E\u0644\u064A" : String(error?.message || error),
    ...typeof code === "string" && code ? { code } : {}
  });
});
async function start() {
  const server = http.createServer(app);
  if (!isProduction) await setupVite(app, server);
  else serveStatic(app);
  server.listen(port, "0.0.0.0", () => {
    console.log(`Minimal ERP server listening on 0.0.0.0:${port}`);
  });
}
void start().catch((error) => {
  console.error("Unable to start server:", error);
  void pool.end();
  void sessionPool.end();
  process.exitCode = 1;
});
