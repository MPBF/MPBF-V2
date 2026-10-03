import type { OrderDetails } from "../../../shared/order-details";

export class OrderDetailsError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "OrderDetailsError";
    this.status = status;
  }
}

export async function fetchOrderDetails(id: string | number, signal: AbortSignal): Promise<OrderDetails> {
  const response = await fetch(`/api/orders/${encodeURIComponent(String(id))}/details`, {
    credentials: "include",
    headers: { Accept: "application/json" },
    signal,
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body && typeof body === "object" && "message" in body && typeof body.message === "string"
      ? body.message
      : response.status === 404 ? "لم يتم العثور على الطلب." : "تعذر تحميل تفاصيل الطلب.";
    throw new OrderDetailsError(message, response.status);
  }
  const record = (value: unknown): value is Record<string, any> =>
    value !== null && typeof value === "object" && !Array.isArray(value);
  const nullableRecord = (value: unknown) => value === null || record(value);
  if (!record(body) || !record(body.order) || body.order.id !== Number(id) ||
    typeof body.order.order_number !== "string" ||
    !Array.isArray(body.production_orders) ||
    !body.production_orders.every((row: unknown) => record(row) &&
      Number.isSafeInteger(row.id) && typeof row.quantity_kg === "string" &&
      typeof row.final_quantity_kg === "string" && nullableRecord(row.product)) ||
    !record(body.totals) || typeof body.totals.requested_kg !== "string" ||
    typeof body.totals.planned_kg !== "string" ||
    !record(body.actual_production) || body.actual_production.available !== false ||
    !nullableRecord(body.customer) || !nullableRecord(body.creator) || !nullableRecord(body.sales_representative)) {
    throw new OrderDetailsError("استجابة تفاصيل الطلب غير مكتملة.", 500);
  }
  return body as unknown as OrderDetails;
}

export const orderStatusLabel = (status: unknown): string => {
  const labels: Record<string, string> = {
    waiting: "بانتظار التنفيذ",
    on_hold: "معلق",
    in_production: "قيد الإنتاج",
    for_production: "جاهز للإنتاج",
    paused: "متوقف",
    cancelled: "ملغي",
    completed: "مكتمل",
    delivered: "تم التسليم",
    archived: "مؤرشف",
    pending: "قيد الانتظار",
    active: "نشط",
  };
  return typeof status === "string" && status ? labels[status] ?? status.replaceAll("_", " ") : "—";
};

export const productionStatusLabel = (status: unknown): string =>
  status === "active" ? "قيد الإنتاج" : orderStatusLabel(status);

export const displayValue = (value: unknown): string => {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  if (Array.isArray(value)) return value.length ? value.map((part) => String(part ?? "—")).join("، ") : "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

export const fieldLabel = (key: string): string =>
  key.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export const personName = (person: { display_name?: string | null; display_name_ar?: string | null; full_name?: string | null; username?: string | null } | null): string =>
  person?.display_name_ar || person?.display_name || person?.full_name || person?.username || "—";

export const formatOrderDate = (value: unknown): string => {
  if (value == null || value === "") return "—";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("en-GB", { dateStyle: "short", timeZone: "Asia/Riyadh" }).format(date);
};

export const numberText = (value: unknown): string => {
  if (value == null || value === "") return "—";
  const numeric = Number(value);
  return Number.isFinite(numeric) ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(numeric) : "—";
};