import { describe, expect, it } from "@jest/globals";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PRODUCT_SELECT_VALUES, ProductValueSelect } from "../client/src/components/customer-product-controls";

describe("customer product dropdowns", () => {
  it.each([
    ["facing", 0, 50],
    ["width", 10, 100],
    ["thickness", 1, 60],
    ["cuttingLength", 0, 300],
  ] as const)("includes every integer in the requested %s range", (key, min, max) => {
    expect(PRODUCT_SELECT_VALUES[key]).toEqual(Array.from({ length: max - min + 1 }, (_, index) => String(min + index)));
  });

  it("offers only the three requested densities", () => {
    expect(PRODUCT_SELECT_VALUES.density).toEqual(["0.95", "1", "1.15"]);
  });

  const render = (value: unknown, values: string[], zeroMeansUnset = false) => renderToStaticMarkup(createElement(ProductValueSelect, {
    id: "test-value", label: "القيمة", value, values, zeroMeansUnset, onChange: () => {},
  }));
  it("keeps out-of-range historical values selected", () => {
    expect(render("150", PRODUCT_SELECT_VALUES.width)).toContain('<option value="150" selected="">القيمة الحالية: 150</option>');
  });
  it("matches historical numeric formatting without adding duplicate options", () => {
    const html = render("1.000", PRODUCT_SELECT_VALUES.density);
    expect(html).toContain('<option value="1" selected="">1</option>');
    expect(html).not.toContain("القيمة الحالية");
  });
  it("represents an unset cutting length with zero, without changing other blank fields to zero", () => {
    expect(render(null, PRODUCT_SELECT_VALUES.cuttingLength, true)).toContain('<option value="0" selected="">0 — غير محدد</option>');
    expect(render(null, PRODUCT_SELECT_VALUES.facing)).toContain('<option value="" selected="">غير محدد</option>');
  });
});