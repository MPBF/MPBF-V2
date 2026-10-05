import { describe, expect, it } from "@jest/globals";
import { filmOperationSpecs, filmSearchTerm } from "../client/src/lib/film-operation-specs";
import type { ProductSnapshot } from "../shared/production";

const product: ProductSnapshot = {
  id: 1, item_id: "BAG", name: "Bag", name_ar: "كيس", customer_name: "Customer", customer_name_ar: "عميل",
  width: "28", left_facing: "7", right_facing: "7", universal_thickness: "35", cutting_length_cm: 40,
  raw_material: "HDPE", printing_cylinder: null, punching: null, notes: null,
  front_print_colors: ["Red"], back_print_colors: ["Black"],
  master_batch: { id: "BLUE", name: "Blue", name_ar: "أزرق", color_hex: "#2463EB" },
};
const format = (value: string | number | null | undefined) => String(value);
const specs = (changes: Partial<ProductSnapshot> = {}, language = "en") =>
  filmOperationSpecs({ ...product, ...changes }, language, format, language === "en" ? "Unrecorded" : "غير مسجل");

describe("film operation specs", () => {
  it("displays saved size, physical film thickness and material", () => {
    const value = specs({ size_caption: " 28 + 7 + 7 cm " });
    expect(value.size).toBe("28 + 7 + 7 cm");
    expect(value.material).toBe("HDPE");
    expect(value.thickness).toBe("35 µm");
  });
  it("displays master-batch film color, not printing ink colors", () => {
    expect(specs().batchName).toBe("Blue");
    expect(specs({}, "ar").batchName).toBe("أزرق");
  });
  it("uses frozen width and positive gussets when caption is missing", () => {
    expect(specs().size).toBe("Width 28 cm · Gusset 7 / 7 cm");
    expect(specs({ left_facing: "0", right_facing: "0" }).size).toBe("Width 28 cm");
    expect(specs({ left_facing: null }).size).toBe("Width 28 cm · Gusset 7 cm");
  });
  it("does not invent dimensions or thickness from invalid numeric text", () => {
    const value = specs({ width: "broken", left_facing: null, right_facing: "0", universal_thickness: "" });
    expect(value.size).toBe("Unrecorded");
    expect(value.thickness).toBe("Unrecorded");
  });
  it("distinguishes transparent master batch from ordinary solid white", () => {
    expect(specs({ master_batch: { id: "TRANS", name: "Transparent", name_ar: "شفاف", color_hex: "#FFFFFF" } }).batchName).toBe("Transparent");
    expect(specs({ master_batch: { id: "WHITE", name: "White", name_ar: "أبيض", color_hex: "#FFFFFF" } }).batchName).toBe("White");
  });
  it("explicitly displays missing color instead of assuming white", () => {
    expect(specs({ master_batch: null }).batchName).toBe("Unrecorded");
    expect(specs({ master_batch: null }).batch).toBeNull();
  });
  it("English skips Arabic text and blanks throughout fallbacks", () => {
    const value = specs({ size_caption: "مقاس عربي", raw_material: "خامة عربية",
      master_batch: { id: "X", name: "اسم عربي", name_ar: "اسم", color_hex: "#2463EB" } });
    expect(value.size).toBe("Width 28 cm · Gusset 7 / 7 cm");
    expect(value.material).toBe("Unrecorded");
    expect(value.batchName).toBe("#2463EB");
    expect(specs({ master_batch: { id: "X", name: " ", name_ar: " ", color_hex: "#fff" } }).batchName).toBe("#fff");
  });
  it("normalizes Arabic and Persian typed order digits for phone search", () => {
    expect(filmSearchTerm(" PO-٢ ")).toBe("po-2");
    expect(filmSearchTerm(" ORDER-۱۲۳ ")).toBe("order-123");
    expect(filmSearchTerm("عميل")).toBe("عميل");
  });
  it("handles absent products without guessing", () => {
    const value = filmOperationSpecs(null, "ar", format, "غير مسجل");
    expect(value.size).toBe("غير مسجل");
    expect(value.batchName).toBe("غير مسجل");
  });
});
