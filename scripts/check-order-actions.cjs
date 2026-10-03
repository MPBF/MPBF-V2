// Runs against the real frontend, intercepting every /api request with fixtures.
// Never authenticates as a real user or writes to the database.
const assert = require("node:assert/strict");
const { spawn, execFileSync } = require("node:child_process");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const WebSocket = require("ws");
const outputDir = path.join("screenshots", "order-signatures");

(async () => {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), "order-actions-browser-"));
  const chrome = spawn(process.env.CHROMIUM_PATH || execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(),
    ["--headless=new", "--no-sandbox", "--disable-gpu", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"],
    { stdio: ["ignore", "ignore", "pipe"] });
  let ws;
  let passed = 0;
  const check = (name, value, expected = true) => { assert.deepEqual(value, expected, name); console.log(`PASS ${name}`); passed++; };
  try {
    const address = await new Promise((resolve, reject) => {
      let output = "";
      const timer = setTimeout(() => reject(Error("Chromium startup timeout")), 15000);
      chrome.stderr.on("data", (chunk) => {
        output += String(chunk);
        const match = output.match(/DevTools listening on (ws:\/\/\S+)/);
        if (match) { clearTimeout(timer); resolve(match[1]); }
      });
      chrome.on("error", reject);
    });
    ws = new WebSocket(address);
    await new Promise((resolve, reject) => { ws.once("open", resolve); ws.once("error", reject); });
    let serial = 0;
    const pending = new Map();
    let session;
    const send = (method, params = {}, sessionId = session) => new Promise((resolve, reject) => {
      const id = ++serial;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
    let permissions = ["view_orders"];
    let detailStatus = 200;
    let large = false;
    let noLines = false;
    let language = "ar";
    const requests = [];
    const errors = [];
    const order = { id: 7, order_number: "ORD123", customer_id: "CID010", status: "in_production",
      previous_status: "waiting", notes: "تعليمات الطلب التجريبي", created_by: 42,
      created_at: "2026-10-02T22:30:00.000Z", delivery_date: "2026-10-18", delivery_days: 15 };
    const product = { id: 11, customer_id: "CID010", category_id: "CAT01", item_id: "ITM01",
      size_caption: "28+7+7X41", width: "28", left_facing: "7", right_facing: "7", thickness: "10",
      universal_thickness: "25", density: "0.95", bag_weight_grams: "4.85", bags_per_kilo: "206",
      printing_cylinder: "16", cutting_length_cm: 41, raw_material: "HDPE", master_batch_id: "PT01",
      is_printed: true, cutting_unit: "kg", punching: "بنانة", unit_weight_kg: "1.00", unit_quantity: 20,
      package_weight_kg: "20.00", cliche_front_design: null, cliche_back_design: null,
      front_print_colors: ["أزرق"], back_print_colors: [], notes: "تعليمات المنتج التجريبي",
      status: "active", created_at: "2026-08-03T06:00:00.000Z",
      category: { id: "CAT01", code: "CB", name_ar: "أكياس", name: "Bags" },
      item: { id: "ITM01", code: "S-CB", name_ar: "بنانة - S", name: "Banana S" },
      color: { id: "PT01", name_ar: "أبيض", name: "White", brand: "Test", color_hex: "#ffffff" } };
    const first = { id: 9, order_id: 7, production_order_number: "ORD123-01", customer_product_id: 11,
      quantity_kg: "300.00", final_quantity_kg: "330.00", overrun_percentage: "10.00", status: "active",
      previous_status: "pending", batch_number: "BATCH01", created_at: "2026-10-03T06:00:00.000Z", product };
    const detail = () => {
      const lines = noLines ? [] : large ? Array.from({ length: 38 }, (_, i) => ({
        ...first, id: 100 + i, production_order_number: `ORD123-${i + 1}`,
        product: { ...product, notes: `تعليمات المنتج ${i + 1}: بيانات اختبار لتأكيد تكرار رأس الجدول وعدم قص الصفوف عند الطباعة` },
      })) : [first, { ...first, id: 10, product: null, customer_product_id: null, production_order_number: "ORD123-02",
        quantity_kg: "100.50", final_quantity_kg: "105.53", overrun_percentage: "5", status: "pending", batch_number: null }];
      return { order,
        customer: { id: "CID010", name_ar: "عميل تجريبي", name: "Test Customer", plate_drawer_code: "C-24",
          sales_rep_id: 8, phone: "0501234567", city: "مدينة تجريبية", tax_number: "7000000000", is_active: true,
          address: null, code: null, user_id: null, commercial_name: null, unified_number: null,
          unique_customer_number: null, created_at: "2026-08-03T06:00:00.000Z" },
        creator: { id: 42, display_name_ar: "منشئ تجريبي", display_name: "Creator", full_name: null, username: "creator" },
        sales_representative: { id: 8, display_name_ar: "مندوب تجريبي", display_name: "Representative", full_name: null, username: "rep" },
        production_orders: lines,
        totals: { requested_kg: noLines ? "0.00" : large ? "11400.00" : "400.50",
          planned_kg: noLines ? "0.00" : large ? "12540.00" : "435.53", production_order_count: lines.length,
          by_status: large ? { active: 38 } : { active: 1, pending: 1 } },
        actual_production: { available: false, message: "لا توجد سجلات إنتاج فعلي. الكميات المعروضة مخططة." } };
    };
    const intercept = async (event) => {
      const { request, requestId } = event.params;
      const route = new URL(request.url).pathname.replace(/^\/api/, "");
      requests.push({ route, method: request.method });
      if (request.method !== "GET") throw Error(`Unexpected write ${request.method} ${route}`);
      let body = [];
      let status = 200;
      if (route === "/me") body = { user: { id: 42, display_name_ar: "مستخدم تجريبي", username: "test", preferred_language: language, permissions } };
      else if (route === "/public-branding") body = { companyNameAr: "مصنع أكياس البلاستيك الحديث", companyNameEn: "Modern Plastic Bags Factory",
        logoSrc: "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="70" height="70"><rect width="70" height="70" rx="12" fill="#167a6d"/><text x="35" y="43" fill="white" font-size="20" text-anchor="middle">MPBF</text></svg>') };
      else if (route === "/orders") body = [{ ...order, customer_name_ar: "عميل تجريبي", production_orders_summary: [] }];
      else if (/^\/orders\/\d+\/details$/.test(route)) {
        status = route.includes("/999/") ? 404 : detailStatus;
        body = status === 200 ? detail() : { message: status === 404 ? "الطلب غير موجود" : "تعذر التحميل التجريبي" };
      }
      await send("Fetch.fulfillRequest", { requestId, responseCode: status,
        responseHeaders: [{ name: "Content-Type", value: "application/json" }],
        body: Buffer.from(JSON.stringify(body)).toString("base64") }, event.sessionId);
    };
    ws.on("message", (raw) => {
      const event = JSON.parse(String(raw));
      if (event.id) {
        const handler = pending.get(event.id);
        if (!handler) return;
        pending.delete(event.id);
        if (event.error) handler.reject(Error(event.error.message)); else handler.resolve(event.result);
      } else if (event.method === "Fetch.requestPaused") intercept(event).catch((e) => errors.push(e.message));
      else if (event.method === "Runtime.exceptionThrown") errors.push(event.params.exceptionDetails.exception?.description || event.params.exceptionDetails.text);
    });
    const { targetId } = await send("Target.createTarget", { url: "about:blank" }, null);
    session = (await send("Target.attachToTarget", { targetId, flatten: true }, null)).sessionId;
    const enable = async (s = session) => {
      await send("Page.enable", {}, s); await send("Runtime.enable", {}, s);
      await send("Fetch.enable", { patterns: [{ urlPattern: "*/api/*" }] }, s);
    };
    await enable();
    const evaluate = async (expression) => {
      const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || expression);
      return result.result.value;
    };
    const wait = async (expression) => {
      for (let i = 0; i < 100; i++) {
        if (await evaluate(expression)) return;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      throw Error(`Timed out: ${expression}`);
    };
    const origin = process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://127.0.0.1:5000";
    const navigate = async (route) => { await send("Page.navigate", { url: origin + route }); };
    const click = (selector) => evaluate(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(selector)})].find(e=>e.offsetParent!==null);if(!e)throw Error('No visible control: '+${JSON.stringify(selector)});e.click();})()`);
    const capture = async (name) => {
      await evaluate("Promise.allSettled(document.getAnimations().filter(a=>a.effect?.target instanceof Element&&a.effect.target.closest('[role=dialog]')).map(a=>a.finished))");
      await fs.mkdir(outputDir, { recursive: true });
      const shot = await send("Page.captureScreenshot", { format: "png" });
      await fs.writeFile(path.join(outputDir, `${name}.png`), Buffer.from(shot.data, "base64"));
    };
    const pdf = async (name) => {
      const result = await send("Page.printToPDF", { preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false });
      await fs.mkdir(outputDir, { recursive: true });
      await fs.writeFile(path.join(outputDir, `${name}.pdf`), Buffer.from(result.data, "base64"));
    };
    const checkSignatures = async (context) => {
      check(`${context}: complete localized signature titles`, await evaluate(
        "[...document.querySelectorAll('.opp-signatures > div > strong')].map(e=>e.textContent.trim())"
      ), language === "en" ? ["Manager", "Approved By", "Created By"] : ["المدير", "تم الاعتماد بواسطة", "تم الإنشاء بواسطة"]);
      check(`${context}: titles have no line background or clipping`, await evaluate(`(()=>{
        const titles=[...document.querySelectorAll('.opp-signatures .opp-bilingual')];
        return titles.length===3&&titles.every(e=>{
          const style=getComputedStyle(e), rect=e.getBoundingClientRect();
          return style.backgroundColor==='rgba(0, 0, 0, 0)'&&style.marginTop==='0px'
            &&rect.height>=27&&e.scrollHeight<=e.clientHeight&&e.scrollWidth<=e.clientWidth;
        });
      })()`));
      check(`${context}: three signature lines retain width, color and bottom position`, await evaluate(`(()=>{
        const lines=[...document.querySelectorAll('.opp-signatures > div > span')];
        return lines.length===3&&lines.every(e=>{
          const style=getComputedStyle(e), rect=e.getBoundingClientRect(), parent=e.parentElement.getBoundingClientRect();
          return style.backgroundColor==='rgb(64, 75, 70)'&&rect.height===1
            &&Math.abs(rect.width-parent.width*.68)<1&&Math.abs(rect.bottom-parent.bottom)<1
            &&rect.top>=e.parentElement.querySelector('strong').getBoundingClientRect().bottom;
        });
      })()`));
      check(`${context}: creator name remains above its signature line`, await evaluate(`(()=>{
        const name=document.querySelector('.opp-signatures b'), line=name.nextElementSibling;
        return name.textContent.trim()==='منشئ تجريبي'
          &&name.getBoundingClientRect().bottom<=line.getBoundingClientRect().top;
      })()`));
    };
    const checkPrintSignatures = async (context) => {
      await send("Emulation.setEmulatedMedia", { media: "print" });
      try { await checkSignatures(`${context} A4 landscape`); }
      finally { await send("Emulation.setEmulatedMedia", { media: "" }); }
    };

    for (const width of (process.argv.includes("--print-only") ? [1280] : [390, 768, 1280])) {
      await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 700 });
      await navigate("/orders?tab=orders");
      await wait("!!document.querySelector('[aria-label=\"عرض الطلب\"]')");
      check(`${width}: read-only user has view and print, no edit`, await evaluate("!!document.querySelector('[aria-label=\"طباعة الطلب\"]')&&!document.querySelector('[aria-label=\"تعديل طلب\"]')"));
      check(`${width}: print uses an independent protected tab`, await evaluate("(()=>{const a=document.querySelector('[aria-label=\"طباعة الطلب\"]');return a.target==='_blank'&&a.getAttribute('href')==='/orders/7/print'&&a.rel.includes('noopener')})()"));
      await click('[aria-label="عرض الطلب"]');
      await wait("!!document.querySelector('.odm-summary-strip')");
      check(`${width}: creator and all production orders shown`, await evaluate("document.querySelector('[role=dialog]').textContent.includes('منشئ تجريبي')&&document.querySelectorAll('.odm-production-card').length===2"));
      check(`${width}: view read-only and fits viewport`, await evaluate("!document.querySelector('[role=dialog] input,[role=dialog] select')&&document.querySelector('[role=dialog]').getBoundingClientRect().width<=innerWidth&&document.documentElement.scrollWidth<=innerWidth"));
      await click(".odm-production-toggle");
      check(`${width}: complete product and production specifications available`, await evaluate("document.querySelector('.odm-production-body').textContent.includes('تعليمات المنتج التجريبي')&&document.querySelector('.odm-production-body').textContent.includes('السماكة العامة')&&document.querySelector('.odm-production-body').textContent.includes('BATCH01')"));
      await capture(`order-details-${width}`);
      await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
      await wait("!document.querySelector('[role=dialog]')");
      await navigate("/orders/7/print");
      await wait("!!document.querySelector('.opp-sheet')");
      check(`${width}: print is standalone, not the app shell`, await evaluate("!document.querySelector('.shell')"));
      check(`${width}: bilingual 12-column document and creator signature`, await evaluate("document.querySelectorAll('.opp-spec-table thead th').length===12&&document.querySelector('.opp-signatures').textContent.includes('منشئ تجريبي')&&document.querySelector('.opp-sheet').textContent.includes('PRODUCTION ORDER')"));
      await capture(`order-print-${width}`);
      check(`${width}: correct universal thickness, logo, QR and localized Riyadh date`, await evaluate("({thickness:document.querySelector('.opp-sheet').textContent.includes('25 MIC'),logo:!!document.querySelector('.opp-logo'),qr:!!document.querySelector('.opp-qr'),date:document.querySelector('.opp-order-id div:nth-child(2) span').textContent.trim()===new Intl.DateTimeFormat('ar-SA-u-nu-latn',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'Asia/Riyadh'}).format(new Date('2026-10-02T22:30:00.000Z')).replace(/[\\u061c\\u200e\\u200f]/g,'')})"), { thickness: true, logo: true, qr: true, date: true });
      check(`${width}: one total sums planned quantities across all production rows`, await evaluate("document.querySelectorAll('.opp-total-cell strong').length===1&&document.querySelector('.opp-total-cell').textContent.trim()==='435.53 كجم'"));
      check(`${width}: only planned quantities, including missing-product rows`, await evaluate("[...document.querySelectorAll('.opp-spec-row')].map(r=>r.cells[10].textContent.trim())"), ["330 kg", "105.53 kg"]);
      check(`${width}: item cell contains only Arabic and English names`, await evaluate("[...document.querySelector('.opp-item-cell').children].map(e=>e.textContent.trim())"), ["بنانة - S", "Banana S"]);
      check(`${width}: missing product does not substitute order/category metadata`, await evaluate("document.querySelectorAll('.opp-item-cell')[1].textContent"), "——");
      check(`${width}: independent product and order notes are preserved`, await evaluate("document.querySelector('.opp-notes').textContent==='تعليمات المنتج التجريبي'&&document.querySelector('.opp-order-notes').textContent.includes('تعليمات الطلب التجريبي')"));
      await checkSignatures(`Arabic ${width} preview`);
      check(`${width}: horizontal scrolling stays inside paper preview`, await evaluate("document.documentElement.scrollWidth<=innerWidth"));
      if (width === 1280) {
        await evaluate("window.__prints=0;window.print=()=>{window.__prints++;window.dispatchEvent(new Event('afterprint'))}");
        await click(".opp-print-action");
        await wait("window.__prints===1");
        check("print button invokes native print when document is ready", await evaluate("window.__prints"), 1);
        await evaluate("Object.defineProperty(document.querySelector('.opp-sheet img'),'naturalWidth',{value:0,configurable:true});void 0");
        await click(".opp-print-action");
        await wait("!!document.querySelector('.opp-print-error')");
        check("missing logo reports an error rather than silently printing", await evaluate("window.__prints===1&&!document.querySelector('.opp-print-action').disabled"));
        await evaluate("delete document.querySelector('.opp-sheet img').naturalWidth;window.__blockedPrints=0;window.print=()=>{window.__blockedPrints++;throw Error('Printing unavailable')}");
        await click(".opp-print-action");
        await wait("window.__blockedPrints===1&&!!document.querySelector('.opp-print-error')");
        check("unavailable native printing reports an error and permits retry", await evaluate("window.__blockedPrints===1&&!document.querySelector('.opp-print-action').disabled"));
        await evaluate("window.print=()=>{window.__prints++;window.dispatchEvent(new Event('afterprint'))}");
        await click(".opp-print-action");
        await wait("window.__prints===2&&!document.querySelector('.opp-print-error')");
        await checkPrintSignatures("Arabic");
        await pdf("order-print-a4");
      }
    }
    await navigate("/orders?tab=orders&viewOrder=7");
    await wait("!!document.querySelector('.odm-summary-strip')");
    check("QR/deep link opens the requested authenticated order", await evaluate("document.querySelector('#odm-title').textContent.includes('ORD123')"));
    await click('[aria-label="إغلاق التفاصيل"]');
    await wait("!document.querySelector('[role=dialog]')");
    check("closing deep-linked view clears viewOrder without changing tab", await evaluate("!new URLSearchParams(location.search).has('viewOrder')&&new URLSearchParams(location.search).get('tab')==='orders'"));
    detailStatus = 503;
    await click('[aria-label="عرض الطلب"]');
    await wait("!!document.querySelector('.odm-retry')");
    check("failed detail load disables printing and offers retry", await evaluate("document.querySelector('.odm-print-button').disabled"));
    detailStatus = 200;
    await click(".odm-retry");
    await wait("!!document.querySelector('.odm-summary-strip')");
    await evaluate("window.__orderOpenCalls=[];window.open=(...args)=>{window.__orderOpenCalls.push(args);return null}");
    await click(".odm-print-button");
    check("modal print action opens the correct new tab with opener protection", await evaluate("window.__orderOpenCalls[0]"), ["/orders/7/print", "_blank", "noopener,noreferrer"]);
    await click('[aria-label="إغلاق التفاصيل"]');
    await navigate("/orders/999/print");
    await wait("!!document.querySelector('.opp-page-error')");
    check("missing order cannot print", await evaluate("document.querySelector('.opp-page-error').textContent.includes('الطلب غير موجود')&&!document.querySelector('.opp-print-action')"));
    detailStatus = 503;
    await navigate("/orders/7/print");
    await wait("!!document.querySelector('.opp-page-error button')");
    detailStatus = 200;
    await click(".opp-page-error button");
    await wait("!!document.querySelector('.opp-sheet')");
    language = "en";
    await navigate("/orders/7/print");
    await wait("!!document.querySelector('.opp-sheet') && document.documentElement.lang==='en'");
    check("English preview retains both item names", await evaluate("[...document.querySelector('.opp-item-cell').children].map(e=>e.textContent.trim())"), ["بنانة - S", "Banana S"]);
    check("English preview has one planned total", await evaluate("document.querySelector('.opp-total-cell').textContent.trim()"), "435.53 kg");
    check("English preview quantity remains planned-only", await evaluate("[...document.querySelectorAll('.opp-spec-row')].map(r=>r.cells[10].textContent.trim())"), ["330 kg", "105.53 kg"]);
    await checkSignatures("English preview");
    await checkPrintSignatures("English");
    await capture("order-print-en");
    await pdf("order-print-a4-en");
    language = "ar";
    const originalItem = product.item;
    product.item = { ...originalItem, name: "" };
    await navigate("/orders/7/print");
    await wait("!!document.querySelector('.opp-sheet')");
    check("missing English item name shows dash without substituting Arabic", await evaluate("[...document.querySelector('.opp-item-cell').children].map(e=>e.textContent.trim())"), ["بنانة - S", "—"]);
    product.item = { ...originalItem, name_ar: "", name: "Banana S" };
    await navigate("/orders/7/print");
    await wait("!!document.querySelector('.opp-sheet')");
    check("missing Arabic name shows dash without substituting English", await evaluate("[...document.querySelector('.opp-item-cell').children].map(e=>e.textContent.trim())"), ["—", "Banana S"]);
    product.item = { ...originalItem, name: "اسم عربي في الحقل الإنجليزي" };
    await navigate("/orders/7/print");
    await wait("!!document.querySelector('.opp-sheet')");
    check("Arabic-filled English field is not displayed as an English name", await evaluate("document.querySelector('.opp-item-cell small').textContent"), "—");
    product.item = null;
    await navigate("/orders/7/print");
    await wait("!!document.querySelector('.opp-sheet')");
    check("missing item does not substitute category names", await evaluate("document.querySelector('.opp-item-cell').textContent"), "——");
    product.item = originalItem;
    const originalPlanned = first.final_quantity_kg;
    first.final_quantity_kg = "0.00";
    await navigate("/orders/7/print");
    await wait("!!document.querySelector('.opp-sheet')");
    check("zero planned quantity does not fall back to requested quantity", await evaluate("document.querySelector('.opp-spec-row').cells[10].textContent.trim()"), "0 kg");
    first.final_quantity_kg = originalPlanned;
    noLines = true;
    await navigate("/orders/7/print");
    await wait("!!document.querySelector('.opp-no-rows')");
    check("empty order is explicit, not invented production rows", await evaluate("document.querySelectorAll('.opp-spec-row').length"), 0);
    check("empty order has one zero total", await evaluate("document.querySelector('.opp-total-cell').textContent.trim()"), "0 كجم");
    noLines = false;
    large = true;
    await navigate("/orders/7/print");
    await wait("document.querySelectorAll('.opp-spec-row').length===38");
    await checkSignatures("Arabic multipage preview");
    await checkPrintSignatures("Arabic multipage");
    await pdf("order-print-a4-multipage");
    check("large orders render all linked production lines", await evaluate("document.querySelectorAll('.opp-spec-row').length"), 38);
    check("large order planned total includes every line and groups thousands", await evaluate("document.querySelector('.opp-total-cell').textContent.trim()"), "12,540 كجم");
    language = "en";
    await navigate("/orders/7/print");
    await wait("document.querySelectorAll('.opp-spec-row').length===38&&document.documentElement.lang==='en'");
    await checkSignatures("English multipage preview");
    await checkPrintSignatures("English multipage");
    check("English multipage quantities and item names remain correct", await evaluate(`({
      total:document.querySelector('.opp-total-cell').textContent.trim(),
      rows:[...document.querySelectorAll('.opp-spec-row')].every(r=>r.cells[10].textContent.trim()==='330 kg'),
      items:[...document.querySelectorAll('.opp-item-cell')].every(e=>e.textContent==='بنانة - SBanana S')
    })`), { total: "12,540 kg", rows: true, items: true });
    await pdf("order-print-a4-multipage-en");
    language = "ar";
    permissions = ["manage_customers"];
    const priorDetails = requests.filter((r) => r.route.endsWith("/details")).length;
    await navigate("/orders/7/print");
    await wait("document.body?.textContent?.includes('لا تملك صلاحية عرض أو طباعة الطلب')");
    check("unauthorized preview never requests private order details", requests.filter((r) => r.route.endsWith("/details")).length, priorDetails);
    check("no mutations or users directory requests", requests.every((r) => r.method === "GET" && !["/users", "/roles"].includes(r.route)));
    check("no browser exceptions", errors, []);
    console.log(`Order actions passed ${passed} browser checks; PDFs and screenshots saved using fixtures only.`);
  } finally {
    if (ws) ws.close();
    await new Promise((resolve) => {
      if (chrome.exitCode !== null || chrome.signalCode !== null) return resolve();
      chrome.once("close", resolve); chrome.kill("SIGKILL");
    });
    await fs.rm(profile, { recursive: true, force: true, maxRetries: 3 }).catch(() => {});
  }
})().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });