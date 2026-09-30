/** The suffix on production orders (-01, -02, …) needs three characters. */
const MAX_ORDER_NUMBER_LENGTH = 47;

export function nextOrderNumber(lastNumericOrderNumber: string | null): string {
  if (lastNumericOrderNumber !== null && !/^\d+$/.test(lastNumericOrderNumber)) {
    throw new Error("آخر رقم طلب رقمي غير صالح");
  }
  const number = (BigInt(lastNumericOrderNumber ?? "0") + 1n).toString().padStart(6, "0");
  if (number.length > MAX_ORDER_NUMBER_LENGTH) {
    throw new Error("تعذر إنشاء رقم طلب جديد: بلغ التسلسل الحد الأقصى");
  }
  return number;
}