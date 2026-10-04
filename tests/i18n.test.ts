import { afterEach, describe, expect, it } from "@jest/globals";

import i18n, { localizedName, normalizeLanguage, translate, translateError } from "../client/src/i18n";
import productionEnglish from "../client/src/i18n-en-production";
import { rollLabelPreviewCopy } from "../client/src/pages/production/roll-label-document";

describe("interface localization", () => {
  afterEach(async () => {
    await i18n.changeLanguage("ar");
  });

  it("translates known interface keys and falls back to Arabic", async () => {
    await i18n.changeLanguage("en");
    expect(translate("لوحة الإدارة")).toBe("Admin dashboard");
    expect(translate("عبارة غير مترجمة")).toBe("عبارة غير مترجمة");
  });

  it("uses English-only display names and a neutral fallback when unavailable", async () => {
    await i18n.changeLanguage("en");
    expect(localizedName("اسم عربي", "English name")).toBe("English name");
    expect(localizedName("اسم عربي", null)).toBe("—");
    expect(localizedName("اسم عربي", "اسم عربي", "CAT01")).toBe("CAT01");
    expect(localizedName("اسم عربي", "Mixed عربي", "CAT01")).toBe("CAT01");
    expect(localizedName("اسم عربي", "  English name  ")).toBe("English name");
    await i18n.changeLanguage("ar");
    expect(localizedName("اسم عربي", "English name")).toBe("اسم عربي");
  });

  it("uses a readable English fallback for unrecognized Arabic API errors", async () => {
    await i18n.changeLanguage("en");
    expect(translateError("تعذر تنفيذ طلب مخصص"))
      .toBe("Request failed. Please check the details and try again.");
    expect(translateError("The service is unavailable"))
      .toBe("The service is unavailable");
  });

  it("normalizes unsupported locales to the configured fallback", () => {
    expect(normalizeLanguage("en")).toBe("en");
    expect(normalizeLanguage("fr")).toBe("ar");
    expect(normalizeLanguage(undefined, "en")).toBe("en");
  });

  it("retains every production translation after merging the dictionaries", async () => {
    await i18n.changeLanguage("en");
    for (const [source, english] of Object.entries(productionEnglish)) {
      expect(english.trim()).not.toBe("");
      expect(english).not.toMatch(/[\u0600-\u06ff]/);
      expect(translate(source)).toBe(english);
    }
    await i18n.changeLanguage("ar");
    for (const source of Object.keys(productionEnglish)) {
      expect(translate(source)).toBe(source);
    }
  });

  it("keeps print preview labels and failure messages consistent with the dictionaries", async () => {
    const arabic = rollLabelPreviewCopy("ar");
    const english = rollLabelPreviewCopy("en");
    await i18n.changeLanguage("en");
    for (const key of Object.keys(arabic) as (keyof typeof arabic)[]) {
      if (key !== "direction") expect(translate(arabic[key])).toBe(english[key]);
    }
  });

  it("translates indirect configuration, validation, and unit labels", async () => {
    await i18n.changeLanguage("en");
    expect(translate("الاسم بالعربية")).toBe("Name in Arabic");
    expect(translate("التصنيفات")).toBe("Categories");
    expect(translate("غير مصنف")).toBe("Unclassified");
    expect(translateError("اختر دوراً صالحاً من القائمة")).toBe("Select a valid role from the list");
    expect(translate("كيلو")).toBe("Kilogram");
  });
});