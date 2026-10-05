/** Reserve five characters for the minimum production suffix (-JO01). */
const MAX_ORDER_NUMBER_LENGTH = 45;

// Static, internal SQL only. Both series share the same transactional allocator.
export const ORDER_NUMBER_MAX_SQL = `
  SELECT MAX(CASE WHEN order_number ~ '^[0-9]+$' THEN order_number::numeric
    ELSE substring(order_number from 2)::numeric END)::text AS max_number
  FROM orders WHERE order_number ~ '^[0-9]+$' OR order_number ~ '^O[0-9]+$'
`;

export function nextOrderNumber(lastNumericOrderNumber: string | null): string {
  if (lastNumericOrderNumber !== null && !/^\d+$/.test(lastNumericOrderNumber)) {
    throw new Error("آخر رقم طلب رقمي غير صالح");
  }
  const number = `O${(BigInt(lastNumericOrderNumber ?? "0") + 1n).toString().padStart(5, "0")}`;
  if (number.length > MAX_ORDER_NUMBER_LENGTH) {
    throw new Error("تعذر إنشاء رقم طلب جديد: بلغ التسلسل الحد الأقصى");
  }
  return number;
}

const productionPrefix = (orderNumber: string) =>
  `${orderNumber}-${/^O[0-9]+$/.test(orderNumber) ? "JO" : ""}`;

export function productionOrderNumber(orderNumber: string, sequence: number): string {
  if (!Number.isSafeInteger(sequence) || sequence < 1) throw new Error("تسلسل أمر الإنتاج غير صالح");
  const number = `${productionPrefix(orderNumber)}${String(sequence).padStart(2, "0")}`;
  if (number.length > 50) throw new Error("تعذر إنشاء رقم أمر إنتاج: بلغ التسلسل الحد الأقصى");
  return number;
}

export function productionOrderSequence(orderNumber: string, number: string): number {
  const prefix = productionPrefix(orderNumber);
  if (!number.startsWith(prefix)) return 0;
  const suffix = number.slice(prefix.length);
  if (!/^[0-9]+$/.test(suffix)) return 0;
  const sequence = Number(suffix);
  return Number.isSafeInteger(sequence) && sequence > 0 ? sequence : 0;
}