import type { categories, customer_products, customers, items, master_batch_colors, orders, production_orders } from "./schema";

type JsonValue<T> = T extends Date ? string : T;
type Serialized<T> = { [K in keyof T]: JsonValue<T[K]> };
export type OrderPerson = { id: number; display_name: string | null; display_name_ar: string | null; full_name: string | null; username: string | null };
export type OrderDetailProduct = Serialized<typeof customer_products.$inferSelect> & {
  category: typeof categories.$inferSelect | null;
  item: typeof items.$inferSelect | null;
  color: typeof master_batch_colors.$inferSelect | null;
};
export type OrderDetailProduction = Serialized<typeof production_orders.$inferSelect> & { product: OrderDetailProduct | null };
export type OrderDetails = {
  order: Serialized<Omit<typeof orders.$inferSelect, "share_token">>;
  customer: Serialized<typeof customers.$inferSelect> | null;
  creator: OrderPerson | null;
  sales_representative: OrderPerson | null;
  production_orders: OrderDetailProduction[];
  totals: {
    requested_kg: string;
    planned_kg: string;
    production_order_count: number;
    by_status: Record<string, number>;
  };
  actual_production: { available: false; message: string };
};

// Stored quantities have exactly two decimal places; sum integer hundredths,
// not floating point values or inferred "produced" amounts.
export function orderProductionTotals(rows: { quantity_kg: string; final_quantity_kg: string; status: string }[]): OrderDetails["totals"] {
  const hundredths = (value: string) => {
    if (!/^\d+(?:\.\d{1,2})?$/.test(value)) throw new Error("كمية إنتاج مخزنة غير صالحة");
    const [whole, fraction = ""] = value.split(".");
    return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  };
  const decimal = (value: bigint) => `${value / 100n}.${String(value % 100n).padStart(2, "0")}`;
  const by_status: Record<string, number> = {};
  let requested = 0n;
  let planned = 0n;
  for (const row of rows) {
    requested += hundredths(row.quantity_kg);
    planned += hundredths(row.final_quantity_kg);
    by_status[row.status] = (by_status[row.status] ?? 0) + 1;
  }
  return { requested_kg: decimal(requested), planned_kg: decimal(planned), production_order_count: rows.length, by_status };
}