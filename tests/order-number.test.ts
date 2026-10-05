import { describe, expect, it } from "@jest/globals";
import { nextOrderNumber, productionOrderNumber, productionOrderSequence } from "../server/order-number";

describe("order number allocation", () => {
  it("starts with O and five digits", () => {
    expect(nextOrderNumber(null)).toBe("O00001");
  });

  it("continues existing numeric numbers including leading zeros", () => {
    expect(nextOrderNumber("000154")).toBe("O00155");
    expect(nextOrderNumber("99999")).toBe("O100000");
    expect(nextOrderNumber("999999")).toBe("O1000000");
    expect(nextOrderNumber("9007199254740993")).toBe("O9007199254740994");
  });

  it("fails explicitly before the production-order suffix could be truncated", () => {
    expect(() => nextOrderNumber("9".repeat(44))).toThrow("الحد الأقصى");
    expect(() => nextOrderNumber("abc")).toThrow("غير صالح");
  });

  it("numbers children per new-format parent, expanding without wrapping", () => {
    expect(productionOrderNumber("O00001", 1)).toBe("O00001-JO01");
    expect(productionOrderNumber("O00001", 2)).toBe("O00001-JO02");
    expect(productionOrderNumber("O00002", 1)).toBe("O00002-JO01");
    expect(productionOrderNumber("O00001", 100)).toBe("O00001-JO100");
    expect(productionOrderSequence("O00001", "O00001-JO100")).toBe(100);
  });

  it("keeps legacy parents in their existing series", () => {
    expect(productionOrderNumber("000154", 3)).toBe("000154-03");
    expect(productionOrderNumber("TEST-7", 3)).toBe("TEST-7-03");
    expect(productionOrderSequence("TEST-7", "TEST-7-03")).toBe(3);
  });

  it("ignores unrelated or invalid child suffixes", () => {
    for (const value of ["O00002-JO99", "O00001-99", "O00001-JO1.5", "O00001-JO", "O00001-JO9007199254740993"]) {
      expect(productionOrderSequence("O00001", value)).toBe(0);
    }
  });

  it("rejects invalid or overlong child identifiers without truncation", () => {
    for (const sequence of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => productionOrderNumber("O00001", sequence)).toThrow("غير صالح");
    }
    expect(() => productionOrderNumber(`O${"1".repeat(44)}`, 100)).toThrow("الحد الأقصى");
  });
});