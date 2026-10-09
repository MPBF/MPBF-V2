import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { build } from "esbuild";

// Pass a Playwright module path when it is supplied by the test environment.
const { chromium } = await import(process.argv[2] || "playwright");
const result = await build({
  stdin: {
    resolveDir: process.cwd(),
    loader: "tsx",
    contents: `
      import React from "react";
      import { createRoot } from "react-dom/client";
      import Controls from "./client/src/components/OrderWorkspaceControls";
      import i18n from "./client/src/i18n";
      import "./client/src/index.css";
      const root = createRoot(document.getElementById("root"));
      window.testCalls = [];
      window.renderCase = async ({ language = "ar", canDelete = true, busy = false, count = 2 } = {}) => {
        await i18n.changeLanguage(language);
        document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
        document.documentElement.lang = language;
        const rows = Array.from({ length: count }, (_, i) => ({ id: i + 1, status: "waiting" }));
        root.render(<Controls rows={rows} selected={rows.map(row => row.id)} folder="all"
          counts={{ new: count, production: 0, urgent: 0, archive: 0 }}
          canManage={true} canDelete={canDelete} busy={busy}
          onFolderChange={() => {}} onSelectPage={() => {}} onClear={() => {}}
          onAction={async () => {}} onMove={async () => {}}
          onDelete={async items => { window.testCalls.push(items); }} />);
      };
    `,
  },
  outfile: "/tmp/order-bulk-delete-ui.js",
  bundle: true,
  write: false,
  jsx: "automatic",
});
const script = result.outputFiles.find((file) => file.path.endsWith(".js")).text;
const css = result.outputFiles.find((file) => file.path.endsWith(".css")).text;
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH || execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(),
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
try {
  const page = await browser.newPage();
  await page.setContent('<!doctype html><html><head></head><body><main id="root" style="padding:12px"></main></body></html>');
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: script });
  for (const width of [390, 768, 1366]) {
    await page.setViewportSize({ width, height: 900 });
    for (const language of ["ar", "en"]) {
      const label = language === "ar" ? "حذف الطلبات المحددة" : "Delete selected orders";
      await page.evaluate((language) => window.renderCase({ language }), language);
      const button = page.getByRole("button", { name: label, exact: true, includeHidden: true });
      await button.waitFor({ state: "attached" });
      if (!await page.locator("details").evaluate((element) => element.open)) {
        await page.locator("details summary").click();
      }
      assert.equal(await button.isEnabled(), true);
      const box = await button.boundingBox();
      assert.ok(box && box.x >= 0 && box.x + box.width <= width, `Menu exceeds ${width}px viewport: ${JSON.stringify(box)}`);
      assert.ok(box.height >= 32, "Delete button is too small");
      const before = await page.evaluate(() => window.testCalls.length);
      page.once("dialog", (dialog) => {
        assert.ok(dialog.message().includes(language === "ar" ? "لا يمكن التراجع" : "cannot be undone"));
        assert.ok(dialog.message().includes(language === "ar" ? "لن يُحذف أي منها" : "none will be deleted"));
        return dialog.dismiss();
      });
      await button.click();
      assert.equal(await page.evaluate(() => window.testCalls.length), before);
      page.once("dialog", (dialog) => dialog.accept());
      await button.click();
      assert.deepEqual(await page.evaluate(() => window.testCalls.at(-1)), [
        { id: 1, expected_status: "waiting" }, { id: 2, expected_status: "waiting" },
      ]);
      for (const scenario of [{ busy: true }, { count: 0 }, { count: 101 }]) {
        await page.evaluate((options) => window.renderCase(options), { language, ...scenario });
        await page.waitForFunction((label) => [...document.querySelectorAll("button")].some((b) => b.textContent === label && b.disabled), label);
        assert.equal(await button.isDisabled(), true);
      }
      await page.evaluate((language) => window.renderCase({ language, canDelete: false }), language);
      await button.waitFor({ state: "detached" });
      assert.equal(await button.count(), 0);
      console.log(`PASS bulk delete UI: ${language}, ${width}px; confirmation, cancellation, permissions and disabled states`);
    }
  }
} finally {
  await browser.close();
}
