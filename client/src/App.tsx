import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, Boxes, Copy, Factory, FileText, Gauge, LogOut, Package, Pencil, Plus, Search, Shield, Trash2, Users, UsersRound, Wrench, X, Settings2, Cog, KeyRound, Building2, Check } from "lucide-react";
import { Link, Redirect, Route, Switch, useLocation, useRoute, useSearchParams } from "wouter";
import UserDashboard from "./pages/UserDashboard";
import HumanResources from "./pages/HumanResources";
import { defaultBranding, fetchBrandingSnapshot, type BrandingSnapshot } from "./lib/branding";
import PageHero from "./components/PageHero";
import OrderCreateModal from "./components/OrderCreateModal";
import CustomerProductModal from "./components/CustomerProductModal";

type Row = Record<string, any>;
type OrderProductionSummary = {
  id: number;
  production_order_number: string;
  item_name_ar: string | null;
  item_name: string | null;
  item_id: string | null;
  quantity_kg: string;
};
type Field = { key: string; label: string; type?: "integer" | "decimal" | "date" | "select" | "textarea" | "boolean"; options?: string[]; relation?: string; required?: boolean; wide?: boolean };
type Column = { key: string; label: string; kind?: "text" | "number" | "date" | "status" | "relation" | "color" | "boolean"; priority?: boolean; unit?: string; tightUnit?: boolean; fallbackKey?: string; secondaryKey?: string; secondaryRelation?: string; joinKey?: string; joinUnit?: string; colorKey?: string; compact?: "customer"; width?: "category" | "size" | "numeric" | "combined" | "material" | "color" | "order-customer"; centered?: boolean; truncateNumbers?: boolean; customerLink?: boolean };
type Config = { path: string; title: string; singular: string; read: string[]; write: string[]; del?: string[]; fields: Field[]; columns?: Column[]; mobileColumnLimit?: number; lockedFields?: string[]; clone?: boolean };

const api = async (path: string, options: RequestInit = {}) => {
  const response = await fetch(`/api${path}`, { credentials: "include", headers: { "Content-Type": "application/json", ...(options.headers || {}) }, ...options });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const fallbackByStatus: Record<number, string> = {
      400: "البيانات المدخلة غير صالحة",
      401: "انتهت الجلسة أو يلزم تسجيل الدخول",
      403: "لا تملك صلاحية تنفيذ هذا الإجراء",
      404: "العنصر المطلوب غير موجود",
      409: "تعذر تنفيذ الإجراء بسبب تعارض في البيانات",
      422: "تعذر التحقق من صحة البيانات",
      429: "عدد المحاولات كبير. حاول مرة أخرى لاحقاً",
      500: "حدث خطأ داخلي في الخادم",
    };
    throw new Error(body.message || fallbackByStatus[response.status] || "تعذر تنفيذ الطلب");
  }
  return normalizePayload(body);
};
const list = (path: string, search = "") => api(`${path}?limit=200${search ? `&search=${encodeURIComponent(search)}` : ""}`);
const can = (user: Row, permissions: readonly string[]) => permissions.some((permission) => user.permissions?.includes("*") || user.permissions?.includes(permission));

const orderStatuses = ["waiting", "on_hold", "in_production", "for_production", "paused", "cancelled", "completed", "delivered", "archived"];
const productionStatuses = ["pending", "active", "completed", "cancelled", "archived"];
const machineTypes = ["extruder", "printer", "cutter", "quality_check"];
const dictionaries: Record<string, string> = { active: "نشط", inactive: "غير نشط", waiting: "انتظار", on_hold: "معلّق", in_production: "قيد الإنتاج", for_production: "جاهز للإنتاج", paused: "متوقف", cancelled: "ملغي", completed: "مكتمل", delivered: "مسلّم", archived: "مؤرشف", pending: "قيد الانتظار", extruder: "فيلم", printer: "طباعة", cutter: "قص", quality_check: "فحص جودة", maintenance: "صيانة", down: "متوقفة" };
const relationLabel = (row: Row, key: string) => row[`${key}_name_ar`] || row[`${key}_name`] || (key === "order" ? row.order_number : null) || (key === "production_order" ? row.production_order_number : null) || row[key] || null;
const latinDigits = (value: string) => value
  .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
  .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
  .replace(/٫/g, ".")
  .replace(/٬/g, ",");
const normalizePayload = (value: any): any => {
  if (typeof value === "string") return latinDigits(value);
  if (Array.isArray(value)) return value.map(normalizePayload);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalizePayload(item)]));
  return value;
};
const fmtNumber = (value: any, digits = 2, unit = "", tightUnit = false) => {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(latinDigits(String(value)));
  if (!Number.isFinite(number)) return "—";
  return `${new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: Math.min(digits, 2) }).format(number)}${unit ? `${tightUnit ? "" : " "}${unit}` : ""}`;
};
const decimalInputValue = (value: any) => {
  if (value === null || value === undefined || value === "") return "";
  const number = Number(latinDigits(String(value)));
  return Number.isFinite(number) ? String(Math.round((number + Number.EPSILON) * 100) / 100) : latinDigits(String(value));
};
const fmtDate = (value: any) => value ? new Intl.DateTimeFormat("ar-SA-u-nu-latn", { dateStyle: "medium", timeZone: "Asia/Riyadh" }).format(new Date(`${String(value).slice(0, 10)}T00:00:00+03:00`)) : "—";
const fmtOrderDate = (value: any) => value ? new Intl.DateTimeFormat("ar-SA-u-nu-latn", { dateStyle: "medium", timeZone: "Asia/Riyadh" }).format(new Date(value)) : "—";
const displayValue = (row: Row, col: Column) => {
  if (col.key === "production_orders_summary") {
    const entries = row.production_orders_summary as OrderProductionSummary[] | undefined;
    return entries?.length ? entries.map((entry) => `${entry.production_order_number} - ${entry.item_name_ar || entry.item_name || entry.item_id || "—"} - ${fmtNumber(entry.quantity_kg, 2, "كجم")}`).join("؛ ") : "لا توجد أوامر إنتاج";
  }
  const raw = row[col.key] ?? (col.fallbackKey ? row[col.fallbackKey] : undefined);
  const value = col.kind === "relation" ? relationLabel(row, col.key) : raw;
  if (col.joinKey) {
    const first = value === null || value === undefined || value === "" ? "" : latinDigits(String(value));
    const joinedRaw = row[col.joinKey];
    const second = joinedRaw === null || joinedRaw === undefined || joinedRaw === "" ? "" : `${latinDigits(String(joinedRaw))}${col.joinUnit ? ` ${col.joinUnit}` : ""}`;
    if (!first && !second) return "X";
    if (!first) return second;
    if (!second) return first;
    return `${first} / ${second}`;
  }
  if (col.kind === "number") return fmtNumber(value, 2, col.unit, col.tightUnit);
  if (col.kind === "date") return fmtDate(value);
  if (col.kind === "boolean") return value === true ? "نعم" : value === false ? "لا" : "—";
  if (col.kind === "status") return typeof value === "boolean" ? (value ? "نشط" : "غير نشط") : value ? dictionaries[value] || value : "—";
  const text = value === null || value === undefined || value === "" ? "—" : latinDigits(String(value));
  return col.truncateNumbers ? text.replace(/-?\d+(?:\.\d+)?/g, (number) => String(Math.trunc(Number(number)))) : text;
};
const secondaryValue = (row: Row, col: Column) => {
  if (col.secondaryRelation) return relationLabel(row, col.secondaryRelation) || "—";
  if (!col.secondaryKey) return "";
  const value = row[col.secondaryKey];
  return value === null || value === undefined || value === "" ? "—" : latinDigits(String(value));
};
function OrderProductionCell({ entries }: { entries: OrderProductionSummary[] }) {
  if (!entries.length) return <span className="muted-text">لا توجد أوامر إنتاج</span>;
  return <div className="order-production-list">{entries.map((entry) => <div className="order-production-item" key={entry.id}><strong>{entry.production_order_number}</strong><span>الصنف: {entry.item_name_ar || entry.item_name || entry.item_id || "—"}</span><span className="order-production-quantity">{fmtNumber(entry.quantity_kg, 2, "كجم")}</span></div>)}</div>;
}
const renderCell = (row: Row, col: Column) => {
  const value = displayValue(row, col);
  const content = col.kind === "color" ? <span className="color-cell"><i style={{ background: row[col.key] || "#ddd" }} />{row[col.key] || "—"}</span> : col.kind === "status" ? <span className={`tag ${!dictionaries[row[col.key]] ? "neutral" : ""}`}>{value}</span> : value;
  return col.customerLink ? <Link className="customer-link" href={`/customers/${encodeURIComponent(String(row.id))}`}>{content}</Link> : content;
};
const configs: Record<string, Config> = {
  customers: { path: "/customers", title: "العملاء", singular: "عميل", read: ["manage_customers", "manage_orders", "view_orders", "admin"], write: ["manage_customers", "manage_orders", "admin"], fields: [{ key: "id", label: "رمز العميل", required: true }, { key: "name", label: "اسم العميل", required: true }, { key: "name_ar", label: "الاسم بالعربية" }, { key: "phone", label: "الهاتف" }, { key: "city", label: "المدينة" }, { key: "tax_number", label: "الرقم الضريبي" }, { key: "is_active", label: "نشط", type: "boolean" }], columns: [{ key: "__sequence", label: "م", kind: "relation" }, { key: "name_ar", label: "الاسم العربي", priority: true, customerLink: true }, { key: "name", label: "الاسم الإنجليزي", priority: true }, { key: "plate_drawer_code", label: "رقم الدرج", priority: true }, { key: "sales_rep", label: "اسم المندوب", kind: "relation", priority: true }] },
  products: { path: "/customer-products", title: "منتجات العملاء", singular: "منتج", read: ["manage_customers", "manage_orders", "view_orders", "admin"], write: ["manage_customers", "manage_orders", "admin"], clone: true, mobileColumnLimit: 8, fields: [{ key: "customer_id", label: "العميل", relation: "/customers", required: true }, { key: "category_id", label: "التصنيف", relation: "/categories" }, { key: "item_id", label: "الصنف", relation: "/items" }, { key: "size_caption", label: "وصف المقاس" }, { key: "width", label: "العرض بالسنتيمتر", type: "decimal" }, { key: "thickness", label: "السماكة بالميكرون", type: "decimal" }, { key: "bag_weight_grams", label: "وزن الكيس بالجرام", type: "decimal" }, { key: "raw_material", label: "المادة الخام" }, { key: "master_batch_id", label: "لون الماستر باتش", relation: "/master-batch-colors" }, { key: "status", label: "الحالة", type: "select", options: ["active", "inactive"] }, { key: "notes", label: "ملاحظات", type: "textarea", wide: true }], columns: [{ key: "__sequence", label: "م", centered: true }, { key: "customer_name_ar", label: "العميل", secondaryKey: "customer_name", priority: true, compact: "customer" }, { key: "category", label: "التصنيف / الصنف", kind: "relation", secondaryRelation: "item", priority: true, centered: true, width: "category" }, { key: "size_caption", label: "وصف المقاس", truncateNumbers: true, priority: true, centered: true, width: "size" }, { key: "width", label: "العرض", kind: "number", unit: "سم", priority: true, centered: true, width: "numeric" }, { key: "thickness", label: "السماكة", kind: "number", unit: "µ", tightUnit: true, priority: true, centered: true, width: "numeric" }, { key: "printing_cylinder", label: "السلندر / الطول", joinKey: "cutting_length_cm", joinUnit: "سم", centered: true, width: "combined" }, { key: "raw_material", label: "المادة الخام", centered: true, width: "material" }, { key: "master_batch", label: "الماستر باتش", kind: "relation", colorKey: "master_batch_color_hex", centered: true, width: "color" }] },
  categories: { path: "/categories", title: "التصنيفات", singular: "تصنيف", read: ["manage_categories", "manage_definitions", "manage_customers", "manage_orders", "view_orders", "admin"], write: ["manage_categories", "manage_definitions", "manage_customers", "manage_orders", "admin"], fields: [{ key: "name", label: "الاسم", required: true }, { key: "name_ar", label: "الاسم بالعربية" }, { key: "code", label: "الكود" }, { key: "parent_id", label: "التصنيف الأب", relation: "/categories" }], columns: [{ key: "id", label: "الرمز", priority: true }, { key: "name_ar", label: "الاسم العربي", priority: true }, { key: "name", label: "الاسم الإنجليزي" }, { key: "code", label: "الكود" }, { key: "parent", label: "التصنيف الأب", kind: "relation", priority: true }] },
  items: { path: "/items", title: "الأصناف", singular: "صنف", read: ["manage_items", "manage_definitions", "manage_customers", "manage_orders", "view_orders", "admin"], write: ["manage_items", "manage_definitions", "manage_customers", "manage_orders", "admin"], clone: true, fields: [{ key: "category_id", label: "التصنيف", relation: "/categories" }, { key: "name", label: "الاسم" }, { key: "name_ar", label: "الاسم بالعربية" }, { key: "code", label: "الكود" }, { key: "status", label: "الحالة", type: "select", options: ["active", "inactive"] }], columns: [{ key: "__sequence", label: "م", priority: true }, { key: "id", label: "الرمز", priority: true }, { key: "category", label: "التصنيف", kind: "relation", priority: true }, { key: "code", label: "الكود", priority: true }, { key: "name_ar", label: "الاسم", secondaryKey: "name", priority: true }] },
  colors: { path: "/master-batch-colors", title: "ألوان الماستر باتش", singular: "لون", read: ["manage_master_batch", "manage_definitions", "manage_customers", "manage_orders", "view_orders", "admin"], write: ["manage_master_batch", "manage_definitions", "manage_customers", "manage_orders", "admin"], fields: [{ key: "id", label: "الرمز", required: true }, { key: "name", label: "الاسم", required: true }, { key: "name_ar", label: "الاسم بالعربية", required: true }, { key: "color_hex", label: "قيمة اللون", required: true }, { key: "text_color", label: "لون النص", required: true }, { key: "brand", label: "العلامة التجارية" }, { key: "aliases", label: "الأسماء البديلة" }, { key: "is_active", label: "نشط", type: "boolean" }, { key: "sort_order", label: "الترتيب", type: "integer" }], columns: [{ key: "__sequence", label: "م", priority: true }, { key: "id", label: "الرمز", secondaryKey: "brand", priority: true }, { key: "name_ar", label: "الاسم العربي", priority: true }, { key: "color_hex", label: "عينة اللون", kind: "color", priority: true }] },
  orders: { path: "/orders", title: "الطلبات", singular: "طلب", read: ["view_orders", "manage_orders", "admin"], write: ["manage_orders", "admin"], fields: [{ key: "order_number", label: "رقم الطلب", required: true }, { key: "customer_id", label: "العميل", relation: "/customers", required: true }, { key: "status", label: "الحالة", type: "select", options: orderStatuses }, { key: "notes", label: "ملاحظات", type: "textarea", wide: true }], columns: [{ key: "order_number", label: "رقم الطلب", priority: true }, { key: "customer", label: "العميل", kind: "relation", priority: true, width: "order-customer" }, { key: "production_orders_summary", label: "أوامر الإنتاج", priority: true }, { key: "status", label: "الحالة", kind: "status", priority: true }] },
  production: { path: "/production-orders", title: "أوامر الإنتاج", singular: "أمر إنتاج", read: ["view_production", "manage_production", "admin"], write: ["manage_production", "admin"], fields: [{ key: "production_order_number", label: "رقم أمر الإنتاج", required: true }, { key: "order_id", label: "الطلب", relation: "/orders", required: true }, { key: "customer_product_id", label: "المنتج", relation: "/customer-products" }, { key: "quantity_kg", label: "الكمية كجم", type: "decimal", required: true }, { key: "final_quantity_kg", label: "الكمية النهائية كجم", type: "decimal", required: true }, { key: "status", label: "الحالة", type: "select", options: productionStatuses }], columns: [{ key: "production_order_number", label: "رقم الأمر", priority: true }, { key: "order", label: "رقم الطلب", kind: "relation", priority: true }, { key: "customer", label: "العميل", kind: "relation", priority: true }, { key: "product_size_caption", label: "وصف المنتج", priority: true }, { key: "quantity_kg", label: "المطلوبة", kind: "number", unit: "كجم", priority: true }, { key: "final_quantity_kg", label: "النهائية", kind: "number", unit: "كجم" }, { key: "status", label: "الحالة", kind: "status", priority: true }] },
  machines: { path: "/machines", title: "الماكينات", singular: "ماكينة", read: ["view_production", "manage_machines", "view_maintenance", "manage_maintenance", "admin"], write: ["manage_machines", "manage_maintenance", "admin"], fields: [{ key: "id", label: "رمز الماكينة", required: true }, { key: "name", label: "الاسم", required: true }, { key: "name_ar", label: "الاسم بالعربية" }, { key: "type", label: "النوع", type: "select", options: machineTypes }, { key: "section_id", label: "القسم", relation: "/sections" }, { key: "status", label: "الحالة", type: "select", options: ["active", "maintenance", "down"] }, { key: "manufacturer", label: "الشركة المصنعة" }, { key: "serial_number", label: "الرقم التسلسلي" }], columns: [{ key: "id", label: "الرمز", priority: true }, { key: "name_ar", label: "الاسم العربي", priority: true }, { key: "name", label: "الاسم" }, { key: "type", label: "النوع", kind: "status", priority: true }, { key: "section", label: "القسم", kind: "relation", priority: true }, { key: "status", label: "الحالة", kind: "status", priority: true }, { key: "manufacturer", label: "الشركة المصنعة" }, { key: "serial_number", label: "الرقم التسلسلي" }] },
  components: { path: "/maintenance-component-catalog", title: "كتالوج مكونات الصيانة", singular: "مكوّن", read: ["view_maintenance", "manage_maintenance", "admin"], write: ["manage_maintenance", "admin"], fields: [{ key: "machine_type", label: "نوع الماكينة" }, { key: "name_ar", label: "الاسم بالعربية" }, { key: "name_en", label: "الاسم بالإنجليزية" }, { key: "sort_order", label: "الترتيب", type: "integer" }, { key: "enabled", label: "مفعّل", type: "select", options: ["true", "false"] }], columns: [{ key: "machine_type", label: "نوع الماكينة", priority: true }, { key: "name_ar", label: "الاسم بالعربية", priority: true }, { key: "name_en", label: "الاسم بالإنجليزية" }, { key: "sort_order", label: "الترتيب", kind: "number" }, { key: "enabled", label: "الحالة", kind: "boolean", priority: true }] },
  users: { path: "/users", title: "مستخدمو النظام", singular: "مستخدم", read: ["manage_users", "admin"], write: ["manage_users", "admin"], fields: [{ key: "username", label: "اسم المستخدم" }, { key: "display_name", label: "الاسم" }, { key: "display_name_ar", label: "الاسم بالعربية" }, { key: "role_id", label: "الدور", type: "integer" }, { key: "section_id", label: "القسم" }, { key: "status", label: "الحالة", type: "select", options: ["active", "inactive"] }, { key: "password", label: "كلمة المرور" }] },
  roles: { path: "/roles", title: "الأدوار", singular: "دور", read: ["manage_users", "admin"], write: ["manage_users", "admin"], fields: [{ key: "name", label: "الاسم" }, { key: "name_ar", label: "الاسم بالعربية" }, { key: "permissions", label: "الصلاحيات JSON", type: "textarea", wide: true }] },
  sections: { path: "/sections", title: "الأقسام", singular: "قسم", read: ["manage_sections", "admin"], write: ["manage_sections", "admin"], fields: [{ key: "id", label: "الرمز" }, { key: "name", label: "الاسم" }, { key: "name_ar", label: "الاسم بالعربية" }, { key: "description", label: "الوصف", type: "textarea" }], columns: [{ key: "id", label: "الرمز", priority: true }, { key: "name_ar", label: "الاسم بالعربية", priority: true }, { key: "name", label: "الاسم" }, { key: "description", label: "الوصف" }] },
  settings: { path: "/system-settings", title: "إعدادات النظام", singular: "إعداد", read: ["manage_settings", "admin"], write: ["manage_settings", "admin"], fields: [{ key: "setting_key", label: "المفتاح" }, { key: "setting_value", label: "القيمة" }, { key: "setting_type", label: "النوع" }, { key: "description", label: "الوصف", type: "textarea" }] },
};

const nav = [
  ["/", "لوحة الإدارة", Gauge, ["admin"]], ["/my-dashboard", "لوحة المستخدم", Users, []], ["/customers", "العملاء", Users, configs.customers.read],
  ["/orders", "الطلبات", FileText, configs.orders.read], ["/production", "أوامر الإنتاج", Factory, configs.production.read],
  ["/hr", "الموارد البشرية", UsersRound, ["manage_hr", "manage_attendance", "admin"]],
  ["/admin", "الإدارة", Shield, ["manage_users", "manage_roles", "manage_sections", "manage_settings", "manage_machines", "manage_maintenance", "manage_categories", "manage_items", "manage_master_batch", "manage_definitions", "view_orders", "manage_customers", "manage_orders", "admin"]],
] as const;

function useAuth() {
  const [user, setUser] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api("/me").then((result) => setUser(result.user)).catch(() => setUser(null)).finally(() => setLoading(false)); }, []);
  return { user, setUser, loading };
}

function useBranding() {
  const [branding, setBranding] = useState<BrandingSnapshot>(defaultBranding);
  useEffect(() => {
    const load = () => { void fetchBrandingSnapshot().then(setBranding).catch(() => {}); };
    load();
    const onUpdate = () => load();
    window.addEventListener("branding:updated", onUpdate);
    return () => window.removeEventListener("branding:updated", onUpdate);
  }, []);
  return branding;
}

function BrandIdentity({ branding }: { branding: BrandingSnapshot }) {
  return <div className="brand">{branding.logoSrc ? <img src={branding.logoSrc} alt="شعار الشركة" style={{ width: 38, height: 38, borderRadius: 10, objectFit: "cover", border: "1px solid var(--line)" }} /> : <div className="brand-mark">م</div>}<div><strong>{branding.companyNameAr || "MPBF"}</strong><small>{branding.companyNameEn || "PLASTIC MANUFACTURING"}</small></div></div>;
}

function PasswordChange({ user, onComplete }: { user: Row; onComplete: (user: Row) => void }) {
  const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => { event.preventDefault(); setSaving(true); setError(""); try { await api("/change-password", { method: "POST", body: JSON.stringify({ password }) }); onComplete((await api("/me")).user); } catch (e) { setError((e as Error).message); } finally { setSaving(false); } };
  return <div className="login-page"><section className="login-box" style={{ gridColumn: "1/-1" }}><form className="login-card" onSubmit={submit}><div className="eyebrow">إجراء أمني إلزامي</div><h2>تحديث كلمة المرور</h2><p>مرحباً {user.display_name_ar || user.username}. يجب تحديث كلمة المرور قبل متابعة العمل.</p>{error && <div className="error" role="alert" aria-live="assertive">{error}</div>}<div className="field"><label htmlFor="new-password">كلمة المرور الجديدة</label><input id="new-password" autoFocus autoComplete="new-password" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></div><button className="btn btn-primary" disabled={saving}>حفظ والمتابعة</button></form></section></div>;
}

function Login({ onLogin, branding }: { onLogin: (user: Row) => void; branding: BrandingSnapshot }) {
  const [form, setForm] = useState({ username: "", password: "" }); const [error, setError] = useState("");
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(""); try { onLogin((await api("/login", { method: "POST", body: JSON.stringify(form) })).user); } catch (e) { setError((e as Error).message); } };
  return <div className="login-page"><section className="login-art"><div><BrandIdentity branding={branding} /><h1>دقة المصنع.<br />في كل وردية.</h1><p>من الطلب إلى الرول النهائي، مساحة عمل واحدة لفريق MPBF.</p></div><div className="grid-lines" /></section><section className="login-box"><form className="login-card" onSubmit={submit}><div className="eyebrow">دخول الفريق</div><h2>مرحباً بعودتك</h2><p>سجّل الدخول للوصول إلى مركز التشغيل.</p>{error && <div className="error" role="alert" aria-live="assertive">{error}</div>}<div className="field"><label htmlFor="login-username">اسم المستخدم</label><input id="login-username" autoFocus autoComplete="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div><div className="field"><label htmlFor="login-password">كلمة المرور</label><input id="login-password" type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div><button className="btn btn-primary" style={{ width: "100%", marginTop: 8 }}>دخول آمن</button></form></section></div>;
}

function Layout({ children, user, setUser, branding }: { children: ReactNode; user: Row; setUser: (user: Row | null) => void; branding: BrandingSnapshot }) {
  const [loc, setLoc] = useLocation(); const visibleNav = nav.filter(([, , , permissions]) => !permissions.length || can(user, permissions)); const adminNav = visibleNav.find(([href]) => href === "/admin"); const mobileNav = visibleNav.length <= 5 ? visibleNav : [...visibleNav.slice(0, 4), adminNav || visibleNav[4]]; const title = loc === "/" && !can(user, ["admin"]) ? "لوحة المستخدم" : nav.find(([href]) => href === loc)?.[1] || "الإدارة التشغيلية";
  const logout = async () => { try { await api("/logout", { method: "POST" }); } finally { setUser(null); setLoc("/"); } };
  return <div className="shell"><aside className="sidebar"><BrandIdentity branding={branding} /><nav className="nav">{visibleNav.map(([href, label, Icon]) => <Link key={href} href={href} className={loc === href ? "active" : ""}><Icon /><span>{label}</span></Link>)}</nav><div className="side-foot">نظام تشغيل المصنع<br /><span className="mono">MPBF / CORE 01</span></div></aside><main className="main"><header className="topbar"><div><h1>{title}</h1><p>مركز التحكم التشغيلي · بيانات مباشرة</p></div><div className="top-actions"><div className="user-chip"><div className="avatar">{String(user.display_name_ar || user.display_name || user.username || "م").slice(0, 1)}</div><span>{user.display_name_ar || user.display_name || user.username}</span></div><button aria-label="تسجيل الخروج" className="btn btn-plain" onClick={logout} title="تسجيل الخروج"><LogOut size={18} /></button></div></header><div className="content">{children}</div><nav className="mobile-nav">{mobileNav.map(([href, label, Icon]) => <Link key={href} href={href} className={loc === href ? "active" : ""}><Icon /><span>{label}</span></Link>)}</nav></main></div>;
}

function Dashboard({ user }: { user: Row }) {
  const [data, setData] = useState<Row | null>(null); const [error, setError] = useState(""); const [refreshing, setRefreshing] = useState(false);
  const load = () => { setRefreshing(true); setError(""); api("/dashboard").then(setData).catch((e) => setError(e.message)).finally(() => setRefreshing(false)); };
  useEffect(load, []);
  const cards = [["customers", "العملاء", "عملاء مسجلون"], ["orders", "الطلبات", "إجمالي الطلبات"], ["production_orders", "أوامر الإنتاج", "قيد المتابعة"], ["machines", "الماكينات", "أصول المصنع"], ["users", "المستخدمون", "حسابات النظام"]];
  const shortcuts = nav.filter(([href, , , permissions]) => !["/", "/my-dashboard", "/admin"].includes(href) && can(user, permissions));
  return <><PageHero kicker="نظرة تشغيلية · اليوم" title="لوحة الإدارة" description="ملخص مباشر لأداء المصنع ومحطات العمل." onRefresh={load} refreshing={refreshing} actions={<span className="tag">اتصال مباشر بالبيانات</span>} />{error && <div className="error">{error}</div>}<div className="stats">{cards.map(([key, label, sub]) => <div className="stat" key={key}><label>{label}</label><strong>{data ? data[key] ?? 0 : <span className="skeleton" style={{ display: "inline-block", width: 55 }} />}</strong><small>{sub}</small></div>)}</div><div className="panel"><div className="panel-head"><h3>محطات العمل</h3><span className="eyebrow">اختصارات سريعة</span></div><div style={{ padding: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>{shortcuts.map(([href, label, Icon]) => <Link className="btn btn-muted" href={href} key={href}><Icon size={17} />{label}</Link>)}</div></div></>;
}

function EntityPage({ kind, user, refreshToken = 0, showHero = true }: { kind: string; user: Row; refreshToken?: number; showHero?: boolean }) {
  const cfg = configs[kind]; const [rows, setRows] = useState<Row[]>([]); const [search, setSearch] = useState(""); const [busy, setBusy] = useState(true); const [error, setError] = useState(""); const [edit, setEdit] = useState<Row | null>(null);
  const readable = can(user, cfg.read); const writable = can(user, cfg.write); const deletable = can(user, cfg.del || ["admin"]); const clonable = Boolean(cfg.clone && writable);
  const load = () => { setBusy(true); setError(""); list(cfg.path, search).then((value) => setRows(Array.isArray(value) ? value.map((row, index) => ({ ...row, __sequence: index + 1 })) : [])).catch((e) => setError(e.message)).finally(() => setBusy(false)); };
  useEffect(load, [search, cfg.path, refreshToken]);
  if (!readable) return <div className="empty"><strong>لا تملك صلاحية العرض</strong>تواصل مع مدير النظام.</div>;
  const remove = async (id: any) => { if (!deletable || !confirm("تأكيد حذف السجل؟")) return; try { await api(`${cfg.path}/${id}`, { method: "DELETE" }); load(); } catch (e) { setError((e as Error).message); } };
  const clone = (row: Row) => { const { id: _id, created_at: _createdAt, updated_at: _updatedAt, ...copy } = row; setEdit(copy); };
  const cols = cfg.columns || cfg.fields.slice(0, 5).map((field) => ({ key: field.key, label: field.label, kind: field.type === "date" ? "date" : field.type === "decimal" || field.type === "integer" ? "number" : field.key === "status" ? "status" : "text" } as Column));
  const columnClass = (field: Column) => [field.priority ? "priority-column" : "", field.compact ? `compact-${field.compact}` : "", field.centered ? "centered-column" : "", field.width ? `column-${field.width}` : "", kind === "orders" && field.key === "order_number" ? "order-number-column" : ""].filter(Boolean).join(" ");
  const isTransparentColor = (row: Row, field: Column) => field.colorKey && /شفاف|transparent/i.test(`${row[`${field.key}_name_ar`] || ""} ${row[`${field.key}_name`] || ""}`);
  const renderCell = (row: Row, field: Column) => {
    if (kind === "orders" && field.key === "order_number") return <span className="order-number-stack"><span className="order-number-code">{displayValue(row, field)}</span><small className="order-number-date">{fmtOrderDate(row.created_at)}</small></span>;
    if (field.key === "production_orders_summary") return <OrderProductionCell entries={Array.isArray(row.production_orders_summary) ? row.production_orders_summary : []} />;
    const content = field.colorKey ? <span className="color-stack">{isTransparentColor(row, field) ? <X className="transparent-mark" size={22} aria-label="بدون لون" /> : <i style={{ background: row[field.colorKey] || "#fff" }} />}<span>{displayValue(row, field)}</span></span> : field.kind === "color" ? <span className="color-cell"><i style={{ background: row[field.key] || "#ddd" }} />{row[field.key] || "—"}</span> : field.kind === "status" ? <span className={`tag ${!dictionaries[row[field.key]] ? "neutral" : ""}`}>{displayValue(row, field)}</span> : field.secondaryKey || field.secondaryRelation ? <><strong>{displayValue(row, field)}</strong><small className="cell-sub">{secondaryValue(row, field)}</small></> : displayValue(row, field);
    return field.customerLink ? <Link className="customer-link" href={`/customers/${encodeURIComponent(String(row.id))}`}>{content}</Link> : content;
  };
  return <>{showHero ? <PageHero kicker={`سجل البيانات · ${rows.length} سجل معروض`} title={cfg.title} description={`استعرض وأدر سجلات ${cfg.title}.`} onRefresh={load} refreshing={busy} actions={writable && <button className="btn btn-primary" onClick={() => setEdit({})}><Plus size={17} /> إضافة {cfg.singular}</button>} /> : writable && <div className="page-heading"><button className="btn btn-primary" onClick={() => setEdit({})}><Plus size={17} /> إضافة {cfg.singular}</button></div>}{error && <div className="error" role="alert">{error}</div>}<section className="panel"><div className="panel-head"><div><h3>سجل {cfg.title}</h3><small className="muted-text">السجلات المعروضة من البيانات المحملة</small></div><div className="tools"><Search size={17} aria-hidden="true" /><label className="sr-only" htmlFor={`${kind}-search`}>بحث في {cfg.title}</label><input id={`${kind}-search`} aria-label={`بحث في ${cfg.title}`} className="search" placeholder="بحث في السجل…" value={search} onChange={(e) => setSearch(e.target.value)} /></div></div>{busy ? <div style={{ padding: 20, display: "grid", gap: 12 }} aria-busy="true">{[1, 2, 3, 4].map((i) => <div className="skeleton" key={i} />)}</div> : rows.length === 0 ? <div className="empty"><strong>لا توجد سجلات مطابقة</strong>ابدأ بإضافة أول سجل لهذا القسم.</div> : <div className="table-wrap"><table><thead><tr>{cols.map((field) => <th className={columnClass(field)} key={field.key}>{field.label}</th>)}{(writable || deletable || clonable) && <th>إجراء</th>}</tr></thead><tbody>{rows.map((row, index) => <tr key={row.id ?? index}>{cols.map((field) => <td className={columnClass(field)} title={displayValue(row, field)} key={field.key}>{renderCell(row, field)}</td>)}{(writable || deletable || clonable) && <td><div className="actions">{writable && <button aria-label={`تعديل ${cfg.singular}`} title="تعديل" className="btn btn-plain" onClick={() => setEdit(row)}><Pencil size={16} /></button>}{clonable && <button aria-label={`استنساخ ${cfg.singular}`} title="استنساخ" className="btn btn-plain" onClick={() => clone(row)}><Copy size={16} /></button>}{deletable && <button aria-label={`حذف ${cfg.singular}`} title="حذف" className="btn btn-plain" onClick={() => remove(row.id)}><Trash2 size={16} /></button>}</div></td>}</tr>)}</tbody></table><div className="mobile-cards">{rows.map((row, index) => { const primary = cols.find((c) => c.priority) || cols[0]; const subtitle = primary.secondaryKey || primary.secondaryRelation ? null : cols.find((c) => c !== primary && c.kind === "relation"); return <article className="entity-card" key={row.id ?? index}><strong>{renderCell(row, primary)}</strong><small>{primary.secondaryKey || primary.secondaryRelation ? secondaryValue(row, primary) : displayValue(row, subtitle || cols.find((c) => c !== primary) || primary)}</small>{cols.filter((c) => c !== primary && c !== subtitle).slice(0, cfg.mobileColumnLimit ?? 4).map((field) => <div className="card-line" key={field.key}><span>{field.label}</span><b>{renderCell(row, field)}</b></div>)}{(writable || deletable || clonable) && <div className="actions">{writable && <button className="btn btn-muted" onClick={() => setEdit(row)}><Pencil size={15} /> تعديل</button>}{clonable && <button className="btn btn-muted" onClick={() => clone(row)}><Copy size={15} /> استنساخ</button>}{deletable && <button aria-label="حذف السجل" className="btn btn-danger" onClick={() => remove(row.id)}><Trash2 size={15} /> حذف</button>}</div>}</article>; })}</div></div>}</section>{edit && (kind === "orders" && !edit.id ? <OrderCreateModal onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} /> : <EntityModal cfg={cfg} row={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />)}</>;
}

function EntityModal(props: { cfg: Config; row: Row; onClose: () => void; onSaved: () => void }) {
  return props.cfg.path === "/orders"
    ? <OrderCreateModal editId={props.row.id} onClose={props.onClose} onSaved={props.onSaved} />
    : props.cfg.path === "/customer-products"
      ? <CustomerProductModal row={props.row} onClose={props.onClose} onSaved={props.onSaved} />
    : <EntityFormModal {...props} />;
}

function EntityFormModal({ cfg, row, onClose, onSaved }: { cfg: Config; row: Row; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Row>(() => {
    const initial: Row = { ...row, permissions: Array.isArray(row.permissions) ? JSON.stringify(row.permissions, null, 2) : row.permissions };
    cfg.fields.filter((field) => field.type === "decimal" && !(cfg.path === "/customer-products" && (field.key === "width" || field.key === "thickness"))).forEach((field) => { initial[field.key] = decimalInputValue(initial[field.key]); });
    return initial;
  }); const [error, setError] = useState(""); const [saving, setSaving] = useState(false); const [options, setOptions] = useState<Record<string, Row[]>>({}); const [optionErrors, setOptionErrors] = useState<string[]>([]);
  useEffect(() => { setOptionErrors([]); setOptions({}); const relations = cfg.fields.filter((f) => f.relation); Promise.all(relations.map(async (f) => { try { const values = await list(f.relation!); return [f.key, Array.isArray(values) ? values : []] as const; } catch (e) { return [f.key, { error: `${f.label}: ${(e as Error).message}` }] as const; } })).then((pairs) => { const next: Record<string, Row[]> = {}; const errors: string[] = []; pairs.forEach(([key, value]) => { if (Array.isArray(value)) next[key] = value.filter((item, index, all) => all.findIndex((candidate) => String(candidate.id) === String(item.id)) === index); else errors.push(value.error); }); cfg.fields.filter((f) => f.relation && form[f.key] && next[f.key] && !next[f.key].some((o) => String(o.id) === String(form[f.key]))).forEach((f) => errors.push(`${f.label}: القيمة الحالية (${form[f.key]}) غير موجودة ضمن الخيارات`)); setOptions(next); setOptionErrors(errors); }); }, [cfg]);
  useEffect(() => { const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !saving) onClose(); }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [saving, onClose]);
  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body: Row = {};
      for (const field of cfg.fields) {
        let value = form[field.key];
        if (cfg.path === "/customer-products" && (field.key === "width" || field.key === "thickness") && value !== "" && value !== undefined && value !== null) {
          const numberText = latinDigits(String(value).trim());
          const maximum = field.key === "width" ? 999999 : 99999;
          if (!/^\d+$/.test(numberText) || Number(numberText) <= 0 || Number(numberText) > maximum) throw new Error(`${field.label} يجب أن يكون رقماً صحيحاً موجباً لا يتجاوز ${maximum}`);
        }
        if (field.type === "decimal" && row.id && value === decimalInputValue(row[field.key])) value = row[field.key];
        if ((value === "" || value === undefined || value === null) && field.required) throw new Error(`${field.label} مطلوب`);
        if (field.key === "id" && row.id) continue;
        if ((field.key === "color_hex" || field.key === "text_color") && value && !/^#[0-9A-Fa-f]{6}$/.test(String(value))) throw new Error(`${field.label} يجب أن يكون بصيغة سداسية مثل #12AB34`);
        if (value === "" || value === undefined || value === null) {
          if (row.id && !field.required) body[field.key] = null;
          continue;
        }
        if (field.key === "enabled" || field.type === "boolean") body[field.key] = value === true || value === "true";
        else if (field.type === "integer") body[field.key] = Number(value);
        else body[field.key] = field.type === "decimal" ? String(value) : value;
      }
      if (row.id) await api(`${cfg.path}/${row.id}`, { method: "PUT", body: JSON.stringify(body) });
      else await api(cfg.path, { method: "POST", body: JSON.stringify(body) });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };
  const labelFor = (option: Row) => latinDigits(String(option.name_ar || option.name || option.order_number || option.production_order_number || option.id));
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !saving && onClose()}><form className="modal" role="dialog" aria-modal="true" aria-labelledby="entity-dialog-title" onSubmit={save}><header><h3 id="entity-dialog-title">{row.id ? "تعديل" : "إضافة"} {cfg.singular}</h3><button aria-label="إغلاق الحوار" title="إغلاق" disabled={saving} type="button" className="btn btn-plain" onClick={onClose}><X /></button></header>{optionErrors.length > 0 && <div className="error" role="alert">{optionErrors.join(" · ")}</div>}{error && <div className="error" role="alert">{error}</div>}<div className="form-grid">{(cfg.path === "/categories" || cfg.path === "/items") && !row.id && <div className="field"><label htmlFor="catalog-generated-id">الرمز</label><input id="catalog-generated-id" type="text" value="يُنشأ تلقائيًا عند الحفظ" readOnly tabIndex={-1} /></div>}{cfg.fields.filter((field) => field.key !== "id" || !row.id).map((field) => <div className={field.wide ? "field wide" : "field"} key={field.key}><label htmlFor={`field-${field.key}`}>{field.label}</label>{field.relation ? <select id={`field-${field.key}`} required={field.required} value={form[field.key] ?? ""} disabled={Boolean(cfg.lockedFields?.includes(field.key)) || (!options[field.key]?.length && Boolean(optionErrors.find((e) => e.startsWith(field.label))))} onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}><option value="">غير محدد</option>{options[field.key]?.filter((option) => !(cfg.path === "/categories" && field.key === "parent_id" && String(option.id) === String(row.id))).map((option) => <option key={option.id} value={option.id}>{labelFor(option)}</option>)}{form[field.key] && !options[field.key]?.some((o) => String(o.id) === String(form[field.key])) && <option value={form[field.key]}>القيمة الحالية ({form[field.key]})</option>}</select> : field.type === "select" ? <select id={`field-${field.key}`} required={field.required} value={form[field.key] ?? ""} onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}><option value="">اختر</option>{field.options?.map((option) => <option key={option} value={option}>{dictionaries[option] || option}</option>)}</select> : field.type === "textarea" ? <textarea id={`field-${field.key}`} value={form[field.key] ?? ""} onChange={(e) => setForm({ ...form, [field.key]: e.target.value })} /> : field.type === "boolean" ? <select id={`field-${field.key}`} value={String(form[field.key] ?? true)} onChange={(e) => setForm({ ...form, [field.key]: e.target.value === "true" })}><option value="true">نشط</option><option value="false">غير نشط</option></select> : <div className="input-with-preview"><input id={`field-${field.key}`} required={field.required} type={field.type === "date" ? "date" : field.type === "integer" || field.type === "decimal" ? "number" : "text"} min={cfg.path === "/customer-products" && (field.key === "width" || field.key === "thickness") ? "1" : undefined} max={cfg.path === "/customer-products" && field.key === "width" ? "999999" : cfg.path === "/customer-products" && field.key === "thickness" ? "99999" : undefined} step={cfg.path === "/customer-products" && (field.key === "width" || field.key === "thickness") ? "1" : field.type === "decimal" ? "0.01" : undefined} value={form[field.key] ?? ""} onChange={(e) => setForm({ ...form, [field.key]: e.target.value })} />{(field.key === "color_hex" || field.key === "text_color") && <i className="color-preview" aria-label="معاينة اللون" style={{ background: form[field.key] || "#ddd" }} />}</div>}</div>)}</div><footer><button disabled={saving} className="btn btn-primary">{saving ? "جارٍ الحفظ…" : "حفظ السجل"}</button><button disabled={saving} type="button" className="btn btn-muted" onClick={onClose}>إلغاء</button></footer></form></div>;
}

function CompanyProfile({ user }: { user: Row }) {
  const allowed = can(user, ["manage_settings", "admin"]);
  const [form, setForm] = useState<Row>({}); const [error, setError] = useState(""); const [saved, setSaved] = useState(false);
  useEffect(() => { if (allowed) api("/company-profile").then((value) => setForm(value || {})).catch((e) => setError(e.message)); }, [allowed]);
  if (!allowed) return <div className="empty"><strong>لا تملك صلاحية العرض</strong>تواصل مع مدير النظام.</div>;
  const fields = [["name", "اسم الشركة"], ["name_ar", "اسم الشركة بالعربية"], ["address", "العنوان"], ["tax_number", "الرقم الضريبي"], ["phone", "الهاتف"], ["email", "البريد الإلكتروني"], ["working_hours_per_day", "ساعات العمل"]]; 
  const save = async (event: FormEvent) => { event.preventDefault(); setError(""); setSaved(false); try { const body = Object.fromEntries(fields.map(([key]) => [key, form[key]]).filter(([, value]) => value !== "" && value !== null && value !== undefined)); await api("/company-profile", { method: "PUT", body: JSON.stringify(body) }); setSaved(true); } catch (e) { setError((e as Error).message); } };
  return <section className="panel"><div className="panel-head"><h3>ملف الشركة</h3></div><form className="form-grid" onSubmit={save}>{fields.map(([key, label]) => <div className="field" key={key}><label htmlFor={`company-${key}`}>{label}</label><input id={`company-${key}`} type={key === "working_hours_per_day" ? "number" : "text"} value={form[key] ?? ""} onChange={(e) => setForm({ ...form, [key]: key === "working_hours_per_day" ? Number(e.target.value) : e.target.value })} /></div>)}<div className="wide" aria-live="polite">{error && <div className="error" role="alert">{error}</div>}{saved && <div className="tag">تم حفظ التغييرات</div>}<button className="btn btn-primary">حفظ ملف الشركة</button></div></form></section>;
}

const permissionGroups = [
  { label: "النظام والإدارة", items: [["admin","مدير النظام"],["manage_users","إدارة المستخدمين"],["manage_roles","إدارة الأدوار والصلاحيات"],["manage_sections","إدارة الأقسام"],["manage_settings","إدارة الإعدادات"],["manage_definitions","إدارة التعريفات"],["view_system_health","صحة النظام"],["view_system_monitoring","مراقبة النظام"]] },
  { label: "الصيانة والآلات", items: [["manage_machines","إدارة الماكينات"],["manage_maintenance","إدارة الصيانة"],["manage_maintenance_actions","إجراءات الصيانة"],["create_maintenance_requests","إنشاء طلبات الصيانة"],["view_maintenance","عرض الصيانة"],["view_maintenance_reports","تقارير الصيانة"],["view_maintenance_requests","طلبات الصيانة"],["view_maintenance_stats_reports","إحصاءات الصيانة"]] },
  { label: "الإنتاج والتشغيل", items: [["manage_production","إدارة الإنتاج"],["delete_production","حذف سجلات الإنتاج"],["manage_production_hall","إدارة صالة الإنتاج"],["view_production","عرض الإنتاج"],["view_production_monitoring","مراقبة الإنتاج"],["view_production_reports","تقارير الإنتاج"],["view_today_production","إنتاج اليوم"],["view_cutting_dashboard","لوحة القص"],["view_film_dashboard","لوحة الفيلم"],["view_printing_dashboard","لوحة الطباعة"],["manage_mixing","إدارة الخلط"],["view_mixing","عرض الخلط"]] },
  { label: "المخزون والمستودع", items: [["manage_inventory","إدارة المخزون"],["view_inventory","عرض المخزون"],["manage_warehouse","إدارة المستودع"],["view_warehouse","عرض المستودع"],["manage_warehouse_vouchers","إدارة سندات المستودع"],["view_warehouse_vouchers","عرض سندات المستودع"],["view_warehouse_reports","تقارير المستودع"],["manage_spare_parts","قطع الغيار"],["manage_consumable_parts","المواد المستهلكة"],["manage_items","إدارة الأصناف"],["manage_categories","إدارة التصنيفات"]] },
  { label: "الجودة والطلبات والعملاء", items: [["manage_quality","إدارة الجودة"],["manage_quality_settings","إعدادات الجودة"],["create_quality_inspections","إنشاء فحوص الجودة"],["view_quality","عرض الجودة"],["view_quality_reports","تقارير الجودة"],["view_quality_control_reports","تقارير ضبط الجودة"],["manage_orders","إدارة الطلبات"],["view_orders","عرض الطلبات"],["view_my_orders","طلباتي"],["update_order_status","تحديث حالة الطلب"],["manage_customers","إدارة العملاء"]] },
  { label: "الموارد البشرية والحضور", items: [["manage_hr","إدارة الموارد البشرية"],["view_hr","عرض الموارد البشرية"],["view_hr_reports","تقارير الموارد البشرية"],["manage_attendance","إدارة الحضور"],["view_attendance","عرض الحضور"],["view_attendance_reports","تقارير الحضور"],["manage_leaves","إدارة الإجازات"],["manage_training","إدارة التدريب"],["view_training","عرض التدريب"],["manage_negligence","إدارة الإهمال"],["manage_work_violations","إدارة مخالفات العمل"],["record_work_violations","تسجيل مخالفات العمل"],["view_work_violations","عرض مخالفات العمل"]] },
  { label: "التحليلات والعرض", items: [["view_dashboard","لوحة المتابعة"],["view_user_dashboard","لوحة المستخدم"],["view_home","الرئيسية"],["view_reports","التقارير"],["manage_analytics","التحليلات"],["view_financial_reports","التقارير المالية"],["manage_alerts","إدارة التنبيهات"],["view_alerts","عرض التنبيهات"],["view_notifications","الإشعارات"],["manage_display_screen","إدارة شاشة العرض"],["view_display_screen","عرض الشاشة"]] },
  { label: "الذكاء والتكاملات", items: [["manage_ai_agent","إدارة وكيل الذكاء"],["use_ai_agent","استخدام وكيل الذكاء"],["view_ai_agent","عرض وكيل الذكاء"],["manage_whatsapp","إدارة واتساب"],["manage_factory_simulation","إدارة محاكاة المصنع"],["view_factory_simulation","عرض محاكاة المصنع"],["view_tools","عرض الأدوات"],["view_legacy_database","عرض قاعدة البيانات القديمة"],["view_bag_configurator","مهيئ الأكياس"],["manage_master_batch","إدارة الماستر باتش"]] },
] as const;
const allPermissionLabels = new Map<string, string>(permissionGroups.flatMap((group) => group.items as readonly (readonly [string, string])[]));

const professionOptions = [
  "مدير",
  "مشرف",
  "موظف إداري",
  "محاسب",
  "مندوب مبيعات",
  "مشغل ماكينة",
  "فني صيانة",
  "فني كهرباء",
  "فني ميكانيكا",
  "مراقب جودة",
  "أمين مستودع",
  "عامل إنتاج",
  "سائق",
  "حارس أمن",
  "عامل نظافة",
  "أخرى",
] as const;

const nationalityOptions = [
  "سعودي",
  "مصري",
  "سوداني",
  "يمني",
  "هندي",
  "باكستاني",
  "بنغلاديشي",
  "نيبالي",
  "فلبيني",
  "سريلانكي",
  "أردني",
  "سوري",
  "أخرى",
] as const;

function UserModal({ row, onClose, onSaved }: { row: Row; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Row>({ status: "active", include_in_attendance: true, must_change_password: false, is_system_user: false, ...row });
  const [roles, setRoles] = useState<Row[]>([]); const [sections, setSections] = useState<Row[]>([]); const [error, setError] = useState("");
  useEffect(() => { Promise.all([list("/roles"), list("/sections")]).then(([r, s]) => { setRoles(r); setSections(s); }).catch((e) => setError(e.message)); }, []);
  const textFields = [["username","اسم المستخدم"],["display_name","الاسم الظاهر"],["display_name_ar","الاسم الظاهر بالعربية"],["phone","الهاتف"],["email","البريد الإلكتروني"],["national_id","رقم الهوية"]] as const;
  const save = async (event: FormEvent) => { event.preventDefault(); setError(""); try {
    const body: Row = {};
    textFields.forEach(([key]) => { body[key] = key === "username" ? String(form[key] || "").trim() : form[key] || null; });
    body.profession = form.profession || null;
    body.nationality = form.nationality || null;
    body.birth_date = form.birth_date || null;
    body.service_start_date = form.service_start_date || null;
    body.status = form.status || "active";
    body.role_id = Number(form.role_id);
    body.section_id = form.section_id || null;
    if (form.password) body.password = form.password;
    ["must_change_password","is_system_user","include_in_attendance"].forEach((key) => { body[key] = Boolean(form[key]); });
    if (!row.id && !form.password) throw new Error("كلمة المرور مطلوبة عند إنشاء مستخدم");
    await api(row.id ? `/users/${row.id}` : "/users", { method: row.id ? "PUT" : "POST", body: JSON.stringify(body) }); onSaved();
  } catch (e) { setError((e as Error).message); } };
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><form className="modal wide-modal" role="dialog" aria-modal="true" aria-labelledby="user-dialog-title" onSubmit={save}>
    <header><div><div className="eyebrow">ملف هوية وصلاحيات</div><h3 id="user-dialog-title">{row.id ? "تعديل مستخدم" : "إضافة مستخدم"}</h3></div><button aria-label="إغلاق حوار المستخدم" title="إغلاق" type="button" className="btn btn-plain" onClick={onClose}><X /></button></header>
    {error && <div className="error" style={{ margin: 18 }}>{error}</div>}<div className="form-grid">
      {textFields.map(([key, label]) => <div className="field" key={key}><label htmlFor={`user-${key}`}>{label}</label><input id={`user-${key}`} name={key} type={key === "email" ? "email" : key === "phone" ? "tel" : "text"} required={key === "username"} value={form[key] ?? ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></div>)}
      <div className="field"><label htmlFor="user-profession">المهنة</label><select id="user-profession" value={form.profession ?? ""} onChange={(e) => setForm({ ...form, profession: e.target.value })}><option value="">اختر المهنة</option>{form.profession && !professionOptions.includes(form.profession as typeof professionOptions[number]) && <option value={String(form.profession)}>{String(form.profession)}</option>}{professionOptions.map((profession) => <option key={profession} value={profession}>{profession}</option>)}</select></div>
      <div className="field"><label htmlFor="user-nationality">الجنسية</label><select id="user-nationality" value={form.nationality ?? ""} onChange={(e) => setForm({ ...form, nationality: e.target.value })}><option value="">اختر الجنسية</option>{form.nationality && !nationalityOptions.includes(form.nationality as typeof nationalityOptions[number]) && <option value={String(form.nationality)}>{String(form.nationality)}</option>}{nationalityOptions.map((nationality) => <option key={nationality} value={nationality}>{nationality}</option>)}</select></div>
      <div className="field"><label>الدور والصلاحية</label><select required value={form.role_id ?? ""} onChange={(e) => setForm({ ...form, role_id: e.target.value })}><option value="">اختر الدور</option>{roles.map((r) => <option key={r.id} value={r.id}>{r.name_ar || r.name}</option>)}</select></div>
      <div className="field"><label>القسم</label><select value={form.section_id ?? ""} onChange={(e) => setForm({ ...form, section_id: e.target.value })}><option value="">اختر القسم</option>{sections.map((s) => <option key={s.id} value={s.id}>{s.name_ar || s.name}</option>)}</select></div>
      <div className="field"><label>حالة الحساب</label><select value={form.status ?? "active"} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="active">نشط</option><option value="inactive">غير نشط</option></select></div>
      <div className="field"><label>تاريخ الميلاد</label><input type="date" value={form.birth_date ?? ""} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} /></div>
      <div className="field"><label>تاريخ بدء الخدمة</label><input type="date" value={form.service_start_date ?? ""} onChange={(e) => setForm({ ...form, service_start_date: e.target.value })} /></div>
      <div className="field"><label>كلمة المرور {row.id && <small>(اختيارية عند التعديل)</small>}</label><input type="password" autoComplete="new-password" minLength={8} required={!row.id} value={form.password ?? ""} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
      <div className="check-grid wide">{[["must_change_password","إجبار تغيير كلمة المرور"],["is_system_user","مستخدم نظام"],["include_in_attendance","يظهر في الحضور"]].map(([key,label]) => <label className="check-row" key={key}><input type="checkbox" checked={Boolean(form[key])} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} />{label}</label>)}</div>
    </div><footer><button className="btn btn-primary"><Check size={16} />حفظ المستخدم</button><button type="button" className="btn btn-muted" onClick={onClose}>إلغاء</button></footer>
  </form></div>;
}

function UsersAdmin({ user, refreshToken = 0 }: { user: Row; refreshToken?: number }) {
  const [rows, setRows] = useState<Row[]>([]); const [search, setSearch] = useState(""); const [edit, setEdit] = useState<Row | null>(null); const [error, setError] = useState("");
  const load = () => { setError(""); list("/users", search).then((v) => setRows(Array.isArray(v) ? v : [])).catch((e) => setError(e.message)); };
  useEffect(() => { load(); }, [search, refreshToken]);
  const remove = async (row: Row) => { if (!confirm("تأكيد حذف المستخدم؟")) return; try { await api(`/users/${row.id}`, { method: "DELETE" }); load(); } catch (e) { setError((e as Error).message); } };
  const arabicName = (row: Row) => row.display_name_ar || row.full_name || row.display_name || "—";
  const englishName = (row: Row) => row.display_name || row.full_name || "—";
  return <><div className="page-heading"><button className="btn btn-primary" onClick={() => setEdit({})}><Plus size={17} /> إضافة مستخدم</button></div>{error && <div className="error">{error}</div>}<section className="panel"><div className="panel-head"><div><h3>دليل المستخدمين</h3><small className="muted-text">بيانات الهوية، الدور، والقسم في مكان واحد</small></div><div className="tools"><Search size={17} aria-hidden="true" /><label className="sr-only" htmlFor="users-search">بحث في المستخدمين</label><input id="users-search" aria-label="بحث بالاسم أو المستخدم" className="search" placeholder="بحث بالاسم أو المستخدم…" value={search} onChange={(e) => setSearch(e.target.value)} /></div></div><div className="table-wrap"><table className="users-table"><thead><tr><th>الاسم</th><th>اسم المستخدم</th><th>القسم</th><th>الدور</th><th>الهاتف</th><th>خيارات</th></tr></thead><tbody>{rows.map((r) => <tr key={r.id}><td><strong>{arabicName(r)}</strong><small className="cell-sub" dir="ltr">{englishName(r)}</small></td><td>{r.username || "—"}</td><td>{r.section_name_ar || r.section_name || "—"}</td><td>{r.role_name_ar || r.role_name || "—"}</td><td>{r.phone || "—"}</td><td><div className="actions"><button aria-label="تعديل المستخدم" className="btn btn-plain" title="تعديل" onClick={() => setEdit(r)}><Pencil size={16} /></button>{can(user, ["admin"]) && <button aria-label="حذف المستخدم" className="btn btn-plain" title="حذف" onClick={() => remove(r)}><Trash2 size={16} /></button>}</div></td></tr>)}</tbody></table><div className="mobile-cards user-cards">{rows.map((r) => <article className="entity-card" key={r.id}><strong>{arabicName(r)}</strong><small className="cell-sub" dir="ltr">{englishName(r)}</small><div className="card-line"><span>اسم المستخدم</span><b>{r.username || "—"}</b></div><div className="card-line"><span>القسم</span><b>{r.section_name_ar || r.section_name || "—"}</b></div><div className="card-line"><span>الدور</span><b>{r.role_name_ar || r.role_name || "—"}</b></div><div className="card-line"><span>الهاتف</span><b>{r.phone || "—"}</b></div><div className="actions"><button aria-label="تعديل المستخدم" className="btn btn-muted" onClick={() => setEdit(r)}><Pencil size={15} /> تعديل</button>{can(user, ["admin"]) && <button aria-label="حذف المستخدم" className="btn btn-danger" onClick={() => remove(r)}><Trash2 size={15} /> حذف</button>}</div></article>)}</div>{!rows.length && <div className="empty"><strong>لا توجد حسابات</strong>أنشئ حساباً جديداً لبدء إدارة الوصول.</div>}</div></section>{edit && <UserModal row={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}</>;
}

function RoleModal({ row, onClose, onSaved }: { row: Row; onClose: () => void; onSaved: () => void }) {
  const existing: string[] = Array.isArray(row.permissions) ? row.permissions.map(String) : []; const [form, setForm] = useState<Row>({ ...row, permissions: existing }); const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  const toggle = (value: string) => { const permissions: string[] = form.permissions; setForm({ ...form, permissions: permissions.includes(value) ? permissions.filter((p) => p !== value) : [...permissions, value] }); };
  const save = async (e: FormEvent) => { e.preventDefault(); setSaving(true); try { await api(row.id ? `/roles/${row.id}` : "/roles", { method: row.id ? "PUT" : "POST", body: JSON.stringify({ name: form.name, name_ar: form.name_ar, permissions: form.permissions }) }); onSaved(); } catch (err) { setError((err as Error).message); } finally { setSaving(false); } };
  useEffect(() => { const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !saving) onClose(); }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [saving, onClose]);
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}><form className="modal role-modal" role="dialog" aria-modal="true" aria-labelledby="role-dialog-title" onSubmit={save}><header><div><div className="eyebrow">سياسة الوصول</div><h3 id="role-dialog-title">{row.id ? "تعديل دور" : "إضافة دور"}</h3></div><button aria-label="إغلاق حوار الدور" title="إغلاق" disabled={saving} type="button" className="btn btn-plain" onClick={onClose}><X /></button></header>{error && <div className="error" role="alert" style={{ margin: 18 }}>{error}</div>}<div className="role-head form-grid"><div className="field"><label htmlFor="role-name">اسم الدور</label><input id="role-name" required value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div><div className="field"><label htmlFor="role-name-ar">اسم الدور بالعربية</label><input id="role-name-ar" value={form.name_ar ?? ""} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} /></div></div><div className="permission-summary"><KeyRound size={17} /> <strong>{form.permissions.length}</strong> صلاحية محددة <span>يشمل ذلك الصلاحيات الحالية غير المعروفة</span></div><div className="permission-groups">{permissionGroups.map((group) => { const known: string[] = group.items.map(([key]) => key); const selected = known.filter((key) => form.permissions.includes(key)).length; return <section className="permission-group" key={group.label}><div className="permission-group-head"><strong>{group.label}</strong><button type="button" className="text-button" onClick={() => setForm({ ...form, permissions: selected === known.length ? form.permissions.filter((p: string) => !known.includes(p)) : Array.from(new Set([...form.permissions, ...known])) })}>{selected === known.length ? "إلغاء تحديد الكل" : "تحديد الكل"}</button><span>{selected}/{known.length}</span></div><div className="permission-grid">{group.items.map(([key, label]) => <label className={`permission ${form.permissions.includes(key) ? "selected" : ""}`} key={key}><input type="checkbox" checked={form.permissions.includes(key)} onChange={() => toggle(key)} /><span>{label}</span></label>)}</div></section>})}{existing.filter((p: string) => !allPermissionLabels.has(p)).length > 0 && <div className="unknown-permissions"><strong>صلاحيات محفوظة أخرى</strong><div>{existing.filter((p: string) => !allPermissionLabels.has(p)).map((p: string) => <span className="tag" key={p}>{p}</span>)}</div></div>}</div><footer><button disabled={saving} className="btn btn-primary"><Check size={16} />{saving ? "جارٍ الحفظ…" : "حفظ الدور"}</button><button disabled={saving} type="button" className="btn btn-muted" onClick={onClose}>إلغاء</button></footer></form></div>;
}

function RolesAdmin({ user, refreshToken = 0 }: { user: Row; refreshToken?: number }) {
  const [rows, setRows] = useState<Row[]>([]); const [edit, setEdit] = useState<Row | null>(null); const [error, setError] = useState("");
  const load = () => { setError(""); list("/roles").then((v) => setRows(v)).catch((e) => setError(e.message)); }; useEffect(() => { load(); }, [refreshToken]);
  const remove = async (r: Row) => { if (!confirm("تأكيد حذف الدور؟")) return; try { await api(`/roles/${r.id}`, { method: "DELETE" }); load(); } catch (e) { setError((e as Error).message); } };
  return <><div className="page-heading"><button className="btn btn-primary" onClick={() => setEdit({ permissions: [] })}><Plus size={17} /> إضافة دور</button></div>{error && <div className="error" role="alert">{error}</div>}<div className="role-cards">{rows.map((r) => <article className="role-card" key={r.id}><div className="role-icon"><Shield size={19} /></div><div className="role-card-main"><strong>{r.name_ar || r.name}</strong><span className="cell-sub">{r.name}</span><div className="role-count">{Array.isArray(r.permissions) ? r.permissions.length : 0} صلاحية</div></div><div className="actions"><button aria-label={`تعديل دور ${r.name_ar || r.name}`} title="تعديل" className="btn btn-plain" onClick={() => setEdit(r)}><Pencil size={16} /></button>{can(user, ["admin"]) && <button aria-label={`حذف دور ${r.name_ar || r.name}`} title="حذف" className="btn btn-plain" onClick={() => remove(r)}><Trash2 size={16} /></button>}</div></article>)}{!rows.length && <div className="empty panel"><strong>لا توجد أدوار</strong>أنشئ أول سياسة وصول للنظام.</div>}</div>{edit && <RoleModal row={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}</>;
}

function SettingsAdmin({ refreshToken = 0 }: { refreshToken?: number }) {
  const [profile, setProfile] = useState<Row>({
    name: "",
    name_ar: "",
    tax_number: "",
    phone: "",
    email: "",
    address: "",
    default_language: "ar",
    working_hours_per_day: 8,
  });
  const [settings, setSettings] = useState<Row[]>([]);
  const [operations, setOperations] = useState<Row>({
    timezone: "Asia/Riyadh",
    overtime_factor: "1.50",
    weekly_holiday_day: "friday",
    enable_holiday_overtime: "true",
  });
  const [logoDataUrl, setLogoDataUrl] = useState("");
  const [logoFileName, setLogoFileName] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const languageOptions = [
    { value: "ar", label: "العربية" },
    { value: "en", label: "English" },
  ];
  const timezoneOptions = ["Asia/Riyadh", "UTC", "Asia/Dubai", "Africa/Cairo"];
  const overtimeFactorOptions = ["1.25", "1.50", "1.75", "2.00"];
  const weeklyHolidayOptions = [
    { value: "sunday", label: "الأحد" },
    { value: "monday", label: "الاثنين" },
    { value: "tuesday", label: "الثلاثاء" },
    { value: "wednesday", label: "الأربعاء" },
    { value: "thursday", label: "الخميس" },
    { value: "friday", label: "الجمعة" },
    { value: "saturday", label: "السبت" },
  ];

  const settingsByKey = useMemo(
    () => Object.fromEntries(settings.map((row) => [String(row.setting_key), row])),
    [settings],
  );

  const parseBoolean = (value: unknown, fallback = false) => {
    if (value === undefined || value === null || value === "") return fallback;
    return String(value).toLowerCase() === "true";
  };

  const getSettingValue = (key: string, fallback = "") => {
    const value = settingsByKey[key]?.setting_value;
    if (value === undefined || value === null || value === "") return fallback;
    return String(value);
  };

  useEffect(() => {
    setError("");
    Promise.all([api("/company-profile"), list("/system-settings")])
      .then(([company, sys]) => {
        const loadedProfile = company || {};
        setSettings(Array.isArray(sys) ? sys : []);
        setProfile({
          name: loadedProfile.name ?? "",
          name_ar: loadedProfile.name_ar ?? "",
          tax_number: loadedProfile.tax_number ?? "",
          phone: loadedProfile.phone ?? "",
          email: loadedProfile.email ?? "",
          address: loadedProfile.address ?? "",
          default_language: loadedProfile.default_language ?? "ar",
          working_hours_per_day: Number(loadedProfile.working_hours_per_day ?? 8) || 8,
        });
      })
      .catch((e) => setError(e.message));
  }, [refreshToken]);

  useEffect(() => {
    if (!settings.length) return;
    setOperations({
      timezone: getSettingValue("factory_timezone", "Asia/Riyadh"),
      overtime_factor: getSettingValue("overtime_factor", "1.50"),
      weekly_holiday_day: getSettingValue("weekly_holiday_day", "friday"),
      enable_holiday_overtime: getSettingValue("enable_holiday_overtime", "true"),
    });
    setLogoDataUrl(getSettingValue("company_logo_data_url", ""));
    setLogoFileName(getSettingValue("company_logo_file_name", ""));
  }, [settingsByKey]);

  const upsertSetting = async (key: string, value: string, type: string, description: string) => {
    let existing = settingsByKey[key];
    if (!existing) {
      const candidates = await list("/system-settings", key);
      if (Array.isArray(candidates)) {
        existing = candidates.find((row) => String(row.setting_key) === key);
      }
    }
    if (existing?.id) {
      await api(`/system-settings/${existing.id}`, {
        method: "PUT",
        body: JSON.stringify({ setting_value: value }),
      });
      return;
    }
    await api("/system-settings", {
      method: "POST",
      body: JSON.stringify({
        setting_key: key,
        setting_value: value,
        setting_type: type,
        description,
        is_editable: true,
      }),
    });
  };

  const saveCompanyAndOperations = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSaved("");
    try {
      if (!String(profile.name || "").trim()) throw new Error("اسم الشركة مطلوب");
      await api("/company-profile", {
        method: "PUT",
        body: JSON.stringify({
          name: String(profile.name).trim(),
          name_ar: profile.name_ar || null,
          tax_number: profile.tax_number || null,
          phone: profile.phone || null,
          email: profile.email || null,
          address: profile.address || null,
          default_language: profile.default_language || "ar",
          working_hours_per_day: Number(profile.working_hours_per_day) || 8,
        }),
      });

      await upsertSetting("factory_timezone", String(operations.timezone || "Asia/Riyadh"), "string", "المنطقة الزمنية للمصنع");
      await upsertSetting("overtime_factor", String(operations.overtime_factor || "1.50"), "number", "معامل ساعة العمل الإضافي");
      await upsertSetting("weekly_holiday_day", String(operations.weekly_holiday_day || "friday"), "string", "يوم العطلة الأسبوعي");
      await upsertSetting("enable_holiday_overtime", String(parseBoolean(operations.enable_holiday_overtime, true)), "boolean", "تفعيل احتساب إضافي في يوم العطلة");
      await upsertSetting("company_logo_data_url", logoDataUrl || "", "string", "ملف شعار الشركة المرفوع");
      await upsertSetting("company_logo_file_name", logoFileName || "", "string", "اسم ملف شعار الشركة");

      setSettings(await list("/system-settings"));
      setSaved("تم حفظ هوية المصنع وإعدادات التشغيل");
      window.dispatchEvent(new Event("branding:updated"));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const onLogoFileChange = (event: any) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("ملف الشعار يجب أن يكون صورة");
      return;
    }
    if (file.size > 1_500_000) {
      setError("حجم الشعار كبير. الحد الأقصى 1.5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLogoDataUrl(String(reader.result || ""));
      setLogoFileName(file.name);
      setError("");
    };
    reader.onerror = () => setError("تعذر قراءة ملف الشعار");
    reader.readAsDataURL(file);
  };

  return (
    <div className="settings-layout">
      <div aria-live="polite">
        {error && <div className="error" role="alert">{error}</div>}
        {saved && <div className="success"><Check size={16} />{saved}</div>}
      </div>
      <section className="panel settings-section">
        <div className="panel-head">
          <div>
            <div className="eyebrow">هوية المصنع وتشغيل النظام</div>
            <h3>الإعدادات الأساسية</h3>
          </div>
          <Building2 size={21} color="var(--orange)" />
        </div>
        <form className="form-grid" onSubmit={saveCompanyAndOperations}>
          <div className="field">
            <label htmlFor="profile-name-ar">اسم الشركة بالعربية</label>
            <input id="profile-name-ar" value={profile.name_ar ?? ""} onChange={(e) => setProfile({ ...profile, name_ar: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="profile-name">اسم الشركة بالإنجليزية</label>
            <input id="profile-name" required value={profile.name ?? ""} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="profile-tax">الرقم الضريبي</label>
            <input id="profile-tax" value={profile.tax_number ?? ""} onChange={(e) => setProfile({ ...profile, tax_number: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="profile-phone">الهاتف</label>
            <input id="profile-phone" type="tel" value={profile.phone ?? ""} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="profile-email">البريد الإلكتروني</label>
            <input id="profile-email" type="email" value={profile.email ?? ""} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
          </div>
          <div className="field wide">
            <label htmlFor="profile-address">العنوان</label>
            <textarea id="profile-address" value={profile.address ?? ""} onChange={(e) => setProfile({ ...profile, address: e.target.value })} />
          </div>
          <div className="field wide">
            <label htmlFor="profile-logo-file">شعار الشركة (رفع ملف)</label>
            <input id="profile-logo-file" type="file" accept="image/*" onChange={onLogoFileChange} />
            {logoFileName && <small className="cell-sub">الملف الحالي: {logoFileName}</small>}
            {logoDataUrl && <img src={logoDataUrl} alt="شعار الشركة" style={{ marginTop: 8, maxHeight: 72, borderRadius: 8, border: "1px solid var(--line)" }} />}
          </div>
          <div className="field">
            <label htmlFor="default-language">اللغة الافتراضية</label>
            <select id="default-language" value={profile.default_language ?? "ar"} onChange={(e) => setProfile({ ...profile, default_language: e.target.value })}>
              {languageOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="factory-timezone">المنطقة الزمنية</label>
            <select id="factory-timezone" value={operations.timezone} onChange={(e) => setOperations({ ...operations, timezone: e.target.value })}>
              {timezoneOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="work-hours-day">ساعات العمل اليومية</label>
            <select id="work-hours-day" value={String(profile.working_hours_per_day ?? 8)} onChange={(e) => setProfile({ ...profile, working_hours_per_day: Number(e.target.value) })}>
              {[6, 7, 8, 9, 10, 12].map((hours) => <option key={hours} value={hours}>{hours} ساعة</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="overtime-factor">معامل ساعة الإضافي</label>
            <select id="overtime-factor" value={operations.overtime_factor} onChange={(e) => setOperations({ ...operations, overtime_factor: e.target.value })}>
              {overtimeFactorOptions.map((factor) => <option key={factor} value={factor}>{factor}x</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="holiday-day">يوم العطلة الأسبوعي</label>
            <select id="holiday-day" value={operations.weekly_holiday_day} onChange={(e) => setOperations({ ...operations, weekly_holiday_day: e.target.value })}>
              {weeklyHolidayOptions.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="holiday-overtime">احتساب إضافي في يوم العطلة</label>
            <select id="holiday-overtime" value={String(operations.enable_holiday_overtime)} onChange={(e) => setOperations({ ...operations, enable_holiday_overtime: e.target.value })}>
              <option value="true">مفعل</option>
              <option value="false">غير مفعل</option>
            </select>
          </div>
          <div className="wide">
            <button className="btn btn-primary">حفظ الإعدادات الأساسية</button>
          </div>
        </form>
      </section>
    </div>
  );
}


function Admin({ user }: { user: Row }) {
  const tabs = [["users", "المستخدمون", Users, ["manage_users", "admin"]], ["roles", "الأدوار والصلاحيات", KeyRound, ["manage_roles", "admin"]], ["sections", "الأقسام", Boxes, ["manage_sections", "admin"]], ["machines", "الماكينات", Cog, ["manage_machines", "admin"]], ["components", "مكونات الصيانة", Wrench, ["manage_maintenance", "admin"]], ["categories", "التصنيفات", Boxes, configs.categories.read], ["items", "الأصناف", Package, configs.items.read], ["colors", "ألوان الماستر باتش", Cog, configs.colors.read], ["settings", "إعدادات المصنع", Settings2, ["manage_settings", "admin"]]] as const;
  const visibleTabs = tabs.filter(([, , , permissions]) => can(user, permissions));
  const [tab, setTab] = useState(visibleTabs[0]?.[0] || "users");
  const [refreshToken, setRefreshToken] = useState(0);
  return <><PageHero kicker="مركز الإدارة · صلاحياتك مفعلة" title="الإدارة" description="إدارة الهوية والأصول والتعريفات من مساحة واحدة منظمة." onRefresh={() => setRefreshToken((token) => token + 1)} actions={<span className="tag"><Shield size={16} /> ADMIN / CORE</span>} /><div className="admin-tabs" role="tablist">{visibleTabs.map(([key, label, Icon]) => <button id={`admin-tab-${key}`} aria-controls={`admin-panel-${key}`} role="tab" aria-selected={tab === key} key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}><Icon size={17} />{label}</button>)}</div><div id={`admin-panel-${tab}`} role="tabpanel" aria-labelledby={`admin-tab-${tab}`} style={{ marginTop: 24 }}>{tab === "users" ? <UsersAdmin user={user} refreshToken={refreshToken} /> : tab === "roles" ? <RolesAdmin user={user} refreshToken={refreshToken} /> : tab === "settings" ? <SettingsAdmin refreshToken={refreshToken} /> : <EntityPage kind={tab} user={user} refreshToken={refreshToken} showHero={false} />}</div></>;
}

function CustomersPage({ user }: { user: Row }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [refreshToken, setRefreshToken] = useState(0);
  const tab = searchParams.get("tab") === "products" ? "products" : "customers";
  const selectTab = (next: "customers" | "products") => {
    setSearchParams((previous) => {
      const updated = new URLSearchParams(previous);
      if (next === "products") updated.set("tab", "products");
      else updated.delete("tab");
      return updated;
    });
  };

  return <>
    <PageHero kicker="سجل العملاء" title="العملاء" description="إدارة العملاء ومنتجاتهم من صفحة واحدة." onRefresh={() => setRefreshToken((token) => token + 1)} />
    <div className="customer-tabs" role="tablist" aria-label="أقسام العملاء">
      <button id="customer-tab-customers" type="button" role="tab" aria-controls="customer-panel-customers" aria-selected={tab === "customers"} className={tab === "customers" ? "active" : ""} onClick={() => selectTab("customers")}><Users size={17} /> العملاء</button>
      <button id="customer-tab-products" type="button" role="tab" aria-controls="customer-panel-products" aria-selected={tab === "products"} className={tab === "products" ? "active" : ""} onClick={() => selectTab("products")}><Boxes size={17} /> منتجات العملاء</button>
    </div>
    <div id={`customer-panel-${tab}`} role="tabpanel" aria-labelledby={`customer-tab-${tab}`}>
      <EntityPage key={tab} kind={tab} user={user} refreshToken={refreshToken} showHero={false} />
    </div>
  </>;
}

function CustomerDetail({ user }: { user: Row }) {
  const [, params] = useRoute("/customers/:id");
  const [location, setLocation] = useLocation();
  const [customer, setCustomer] = useState<Row | null>(null);
  const [products, setProducts] = useState<Row[]>([]);
  const [editingProduct, setEditingProduct] = useState<Row | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const customerId = params?.id || "";
  const productConfig: Config = { ...configs.products, lockedFields: ["customer_id"] };
  const load = () => {
    setLoading(true);
    setError("");
    setCustomer(null);
    setProducts([]);
    api(`/customers/${encodeURIComponent(customerId)}/detail`).then((data) => {
      setCustomer(data.customer || null);
      setProducts(Array.isArray(data.products) ? data.products.map((product: Row, index: number) => ({ ...product, __sequence: index + 1 })) : []);
    }).catch((err) => { setCustomer(null); setProducts([]); setError(err.message); }).finally(() => setLoading(false));
  };
  useEffect(load, [customerId]);
  const back = () => window.history.length > 1 ? window.history.back() : setLocation("/customers");
  const writable = can(user, configs.products.write);
  const productColumns = (configs.products.columns || []).filter((column) => column.key !== "customer_name_ar");
  const productColumnClass = (field: Column) => [field.priority ? "priority-column" : "", field.compact ? `compact-${field.compact}` : "", field.centered ? "centered-column" : "", field.width ? `column-${field.width}` : ""].filter(Boolean).join(" ");
  const productColorIsTransparent = (row: Row, field: Column) => field.colorKey && /شفاف|transparent/i.test(`${row[`${field.key}_name_ar`] || ""} ${row[`${field.key}_name`] || ""}`);
  const renderProductCell = (row: Row, field: Column) => field.colorKey ? <span className="color-stack">{productColorIsTransparent(row, field) ? <X className="transparent-mark" size={22} aria-label="بدون لون" /> : <i style={{ background: row[field.colorKey] || "#fff" }} />}<span>{displayValue(row, field)}</span></span> : field.kind === "color" ? <span className="color-cell"><i style={{ background: row[field.key] || "#ddd" }} />{row[field.key] || "—"}</span> : field.kind === "status" ? <span className={`tag ${!dictionaries[row[field.key]] ? "neutral" : ""}`}>{displayValue(row, field)}</span> : field.secondaryKey || field.secondaryRelation ? <><strong>{displayValue(row, field)}</strong><small className="cell-sub">{secondaryValue(row, field)}</small></> : displayValue(row, field);
  const cloneProduct = (product: Row) => { const { id: _id, created_at: _createdAt, updated_at: _updatedAt, ...copy } = product; if (customer) setEditingProduct({ ...copy, customer_id: customer.id, __clone_source_id: product.id }); };
  return <><PageHero kicker="ملف العميل" title={customer ? customer.name_ar || customer.name || customer.id : "تفاصيل العميل"} description={customer?.name || (loading ? "جارٍ تحميل بيانات العميل…" : "بيانات العميل ومنتجاته المسجلة.")} onRefresh={load} refreshing={loading} actions={<button className="btn btn-muted" onClick={back}><ArrowRight size={17} /> رجوع إلى العملاء</button>} />{error && <div className="error" role="alert">{error}</div>}{loading ? <div style={{ padding: 20 }} aria-busy="true"><div className="skeleton" /></div> : !customer ? null : <><div className="page-heading customer-detail-heading">{writable && <button className="btn btn-primary" onClick={() => setEditingProduct({ customer_id: customer.id, status: "active" })}><Plus size={17} /> إضافة منتج</button>}</div><section className="panel customer-summary"><div><span>رمز العميل</span><strong>{customer.id || "—"}</strong></div><div><span>رقم الدرج</span><strong>{customer.plate_drawer_code || "—"}</strong></div><div><span>المندوب</span><strong>{customer.sales_rep_name_ar || customer.sales_rep_name || "—"}</strong></div><div><span>الهاتف</span><strong>{customer.phone || "—"}</strong></div><div><span>المدينة</span><strong>{customer.city || "—"}</strong></div><div><span>الرقم الضريبي</span><strong>{customer.tax_number || "—"}</strong></div></section><section className="panel"><div className="panel-head"><div><h3>منتجات العميل</h3><small className="muted-text">{products.length} منتج مسجل</small></div></div>{products.length === 0 ? <div className="empty"><strong>لا توجد منتجات لهذا العميل</strong>أضف أول منتج من الزر أعلاه.</div> : <div className="table-wrap"><table><thead><tr>{productColumns.map((field) => <th className={productColumnClass(field)} key={field.key}>{field.label}</th>)}{writable && <th>إجراء</th>}</tr></thead><tbody>{products.map((product) => <tr key={product.id}>{productColumns.map((field) => <td className={productColumnClass(field)} title={displayValue(product, field)} key={field.key}>{renderProductCell(product, field)}</td>)}{writable && <td><div className="actions"><button aria-label="تعديل المنتج" title="تعديل المنتج" className="btn btn-plain" onClick={() => setEditingProduct(product)}><Pencil size={16} /></button><button aria-label="استنساخ المنتج" title="استنساخ المنتج" className="btn btn-plain" onClick={() => cloneProduct(product)}><Copy size={16} /></button></div></td>}</tr>)}</tbody></table><div className="mobile-cards">{products.map((product) => { const primary = productColumns.find((column) => column.priority) || productColumns[0]; const subtitle = primary.secondaryKey || primary.secondaryRelation ? null : productColumns.find((column) => column !== primary && column.kind === "relation"); return <article className="entity-card" key={product.id}><strong>{renderProductCell(product, primary)}</strong><small>{primary.secondaryKey || primary.secondaryRelation ? secondaryValue(product, primary) : displayValue(product, subtitle || productColumns.find((column) => column !== primary) || primary)}</small>{productColumns.filter((column) => column !== primary && column !== subtitle).slice(0, configs.products.mobileColumnLimit ?? 4).map((field) => <div className="card-line" key={field.key}><span>{field.label}</span><b>{renderProductCell(product, field)}</b></div>)}{writable && <div className="actions"><button className="btn btn-muted" onClick={() => setEditingProduct(product)}><Pencil size={15} /> تعديل</button><button className="btn btn-muted" onClick={() => cloneProduct(product)}><Copy size={15} /> استنساخ</button></div>}</article>; })}</div></div>}</section>{editingProduct && <EntityModal cfg={productConfig} row={editingProduct} onClose={() => setEditingProduct(null)} onSaved={() => { setEditingProduct(null); load(); }} />}</>}</>;
}

function App() {
  const auth = useAuth();
  const branding = useBranding();
  if (auth.loading) return <div className="login-page"><div className="login-box"><div className="skeleton" style={{ width: 220, height: 28 }} /></div></div>;
  if (!auth.user) return <Login onLogin={auth.setUser} branding={branding} />;
  if (auth.user.must_change_password) return <PasswordChange user={auth.user} onComplete={auth.setUser} />;
  const isAdmin = can(auth.user, ["admin"]);
  return <Layout user={auth.user} setUser={auth.setUser} branding={branding}><Switch><Route path="/">{isAdmin ? <Dashboard user={auth.user} /> : <UserDashboard user={auth.user} />}</Route><Route path="/my-dashboard"><UserDashboard user={auth.user} /></Route><Route path="/hr"><HumanResources canReviewRequests={can(auth.user, ["admin"])} /></Route><Route path="/customers/:id"><CustomerDetail user={auth.user} /></Route><Route path="/customers"><CustomersPage user={auth.user} /></Route><Route path="/products"><Redirect to="/customers?tab=products" replace /></Route><Route path="/orders"><EntityPage kind="orders" user={auth.user} /></Route><Route path="/production"><EntityPage kind="production" user={auth.user} /></Route><Route path="/admin"><Admin user={auth.user} /></Route><Route>{isAdmin ? <Dashboard user={auth.user} /> : <UserDashboard user={auth.user} />}</Route></Switch></Layout>;
}

export default App;
