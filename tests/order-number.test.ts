import { describe, expect, it } from "@jest/globals";
import { nextOrderNumber } from "../server/order-number";

describe("order number allocation", () => {
  it("starts from a six-digit number", () => {
    expect(nextOrderNumber(null)).toBe("000001");
  });

  it("continues existing numeric numbers including leading zeros", () => {
    expect(nextOrderNumber("000154")).toBe("000155");
    expect(nextOrderNumber("999999")).toBe("1000000");
  });

  it("fails explicitly before the production-order suffix could be truncated", () => {
    expect(() => nextOrderNumber("9".repeat(47))).toThrow("الحد الأقصى");
    expect(() => nextOrderNumber("abc")).toThrow("غير صالح");
  });
});