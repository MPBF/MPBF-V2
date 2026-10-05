// Browser-only fixtures intercept EVERY API request. No real auth or business writes.
const assert = require("node:assert/strict");
const { spawn, execFileSync } = require("node:child_process");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const WebSocket = require("ws");
const QRCode = require("qrcode");

(async () => {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), "factory-browser-"));
  const chrome = spawn(process.env.CHROMIUM_PATH || execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(),
    ["--headless=new", "--no-sandbox", "--disable-gpu", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"],
    { stdio: ["ignore", "ignore", "pipe"] });
  let ws, session, onLoad, serial = 0, language = "en", permissions = ["admin"], failure = false, failWrite = false, historyFailure = false, passed = 0;
  const filmReadyOnly = process.argv.includes("--film-ready-only");
  let failStart = false;
  const pending = new Map(), errors = [], writes = [], committed = new Map(), historyCalls = [], stateScopes = [];
  const check = (name, actual, expected = true) => { assert.deepEqual(actual, expected, name); console.log(`PASS ${name}`); passed++; };
  const product = { id: 1, item_id: "ITM01", name: "Plastic bag", name_ar: "كيس بلاستيك", customer_name: "Fixture customer", customer_name_ar: "عميل الاختبار",
    width: "28", left_facing: "7", right_facing: "7", universal_thickness: "25", cutting_length_cm: 41, raw_material: "HDPE", printing_cylinder: "16", punching: "بنانة", notes: null, front_print_colors: [], back_print_colors: [] };
  const duration = (machine_id = "F1", changes = {}) => ({
    machine_id, machine_name: machine_id === "F1" ? "Film One" : "Film Two",
    machine_name_ar: machine_id === "F1" ? "فيلم واحد" : "فيلم اثنان",
    roll_count: 2, first_roll_at: "2026-10-01T20:59:59Z", last_roll_at: "2026-10-03T02:00:02Z",
    duration_seconds: 104403, ...changes,
  });
  const order = (id, changes = {}) => ({ id, order_id: id, order_number: `ORDER-${id}`, production_order_number: `PO-${id}`, customer_product_id: 1,
    quantity_kg: "100.00", final_quantity_kg: "110.00", status: "active", order_status: "in_production", batch_number: null, product,
    started_at: "2026-10-03T05:00:00Z", film_closed_at: null, completed_at: null, is_printed: true, is_roll_product: false, stage: "film",
    produced_kg: "10.00", ready_kg: "0.00", received_kg: "0.00", remaining_kg: "0.00", waste_kg: "0.00", roll_count: id === 2 ? 3 : 1,
    film_durations: id === 1 || id === 6 ? [] : id === 2 ? [duration(), duration("F2", {roll_count:1,duration_seconds:null,
      first_roll_at:"2026-10-02T12:00:00Z",last_roll_at:"2026-10-02T12:00:00Z"})] :
      id === 3 ? [duration("F1", {duration_seconds:0,last_roll_at:"2026-10-01T20:59:59Z"})] : [duration()],
    ...changes });
  const roll = (id, po, changes = {}) => ({ id, production_order_id: po, production_order_number: `PO-${po}`, roll_number: `PO-${po}-R001`, weight_kg: "10.00",
    stage: "film", film_machine_id: "F1", created_by: 42, created_at: "2026-10-03T05:30:00Z", production_minutes: 10, is_last_roll: false,
    printing_machine_id: null, printed_by: null, printed_at: null, cutting_machine_id: null, cut_by: null, cut_completed_at: null, net_weight_kg: null,
    waste_kg: "0.00", product, is_printed: true, is_roll_product: false, ...changes });
  const state = { orders: [order(1, { status: "pending", started_at: null }), order(2), order(3, { is_printed: false }),
    order(4, { is_printed: false, is_roll_product: true, ready_kg: "10.00", remaining_kg: "7.00", received_kg: "3.00" }),
    order(5, { is_roll_product: true }), order(6, { started_at: null, status: "completed", order_status: "completed" }), order(7, { order_status: "paused" })],
    rolls: [roll(2, 2), roll(3, 3, { is_printed: false }), roll(4, 4, { is_printed: false, is_roll_product: true, stage: "done" }),
      roll(5, 5, { is_roll_product: true }), roll(7, 7)], machines: [
      { id: "F1", name: "Film One", name_ar: "فيلم واحد", type: "extruder", status: "active", inline_printer_id: "P1" },
      { id: "F2", name: "Film Two", name_ar: "فيلم اثنان", type: "extruder", status: "active", inline_printer_id: null },
      { id: "P1", name: "Printer One", name_ar: "طابعة", type: "Printer", status: "active" },
      { id: "C1", name: "Cutter One", name_ar: "قصاصة", type: "cutting", status: "active" }],
    queues: [{ id: 1, production_order_id: 2, stage: "film", machine_id: "F1", position: 1 }, { id: 2, production_order_id: 3, stage: "film", machine_id: "F1", position: 2 }],
    locations: [{ id: 1, name: "Hall A", name_ar: "الموقع أ", is_active: true }], receipts: [{
      id: 1, voucher_number: "FR-00000001", created_at: "2026-10-03T06:00:00Z", created_by: 42, notes: "Fixture receipt", items: [
        { id: 1, production_order_id: 4, production_order_number: "PO-4", customer_product_id: 1, item_id: "ITM01", location_id: 1, quantity_kg: "1.00", packaging: null },
        { id: 2, production_order_id: 2, production_order_number: "PO-2", customer_product_id: 1, item_id: "ITM01", location_id: 1, quantity_kg: "2.00", packaging: null }] }],
    inventory: [{ id: 1, production_order_id: 4, customer_product_id: 1, item_id: "ITM01", location_id: 1, quantity_kg: "3.00",
      production_order_number: "PO-4", batch_number: null, product, location_name: "Hall A", location_name_ar: "الموقع أ" }],
    movements: [{ id: 1, receipt_id: 1, receipt_item_id: 1, quantity_kg: "3.00", created_at: "2026-10-03T06:00:00Z", voucher_number: "FR-00000001", production_order_id: 4, location_id: 1 }] };
  const archives = {
    orders: [...state.orders, ...Array.from({length:121}, (_, index) => order(index+100, { status:"completed", order_status:"completed",
      completed_at:"2026-10-03T06:00:00Z",film_closed_at:"2026-10-03T06:00:00Z",roll_count:121,ready_kg:"1000",received_kg:"999",remaining_kg:"1" }))],
    rolls: [...state.rolls,...Array.from({length:121},(_,index)=>roll(index+100,2,{roll_number:`HISTORY-R-${index+100}`,stage:"done"}))],
    receipts: [...state.receipts,...Array.from({length:121},(_,index)=>({...state.receipts[0],id:index+100,voucher_number:`HISTORY-V-${index+100}`}))],
    inventory: state.inventory, movements: state.movements.map(item=>({...item,production_order_number:"PO-4"})),
  };
  state.totals={orders:archives.orders.length,rolls:archives.rolls.length,receipts:archives.receipts.length,movements:archives.movements.length,inventory:state.inventory.length,inventory_kg:"3.00"};
  try {
    const address = await new Promise((resolve, reject) => {
      let output = "";
      const timer = setTimeout(() => reject(Error("Chromium startup timeout")), 15000);
      chrome.stderr.on("data", chunk => { output += chunk; const match = output.match(/DevTools listening on (ws:\/\/\S+)/); if (match) { clearTimeout(timer); resolve(match[1]); } });
      chrome.on("error", reject);
    });
    ws = new WebSocket(address);
    await new Promise((resolve, reject) => { ws.once("open", resolve); ws.once("error", reject); });
    const send = (method, params = {}, sessionId = session) => new Promise((resolve, reject) => {
      const id = ++serial; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
    ws.on("message", raw => {
      const event = JSON.parse(String(raw));
      if (event.id) { const p = pending.get(event.id); if (p) { pending.delete(event.id); event.error ? p.reject(Error(JSON.stringify(event.error))) : p.resolve(event.result); } }
      else if (event.method === "Page.loadEventFired") onLoad?.();
      else if (event.method === "Page.javascriptDialogOpening") void send("Page.handleJavaScriptDialog", { accept: true });
      else if (event.method === "Runtime.exceptionThrown") errors.push(event.params.exceptionDetails.exception?.description || event.params.exceptionDetails.text);
      else if (event.method === "Fetch.requestPaused") void (async () => {
        const { request, requestId } = event.params;
        const route = new URL(request.url).pathname.replace(/^\/api/, "");
        let body = [], status = 200;
        if (route === "/me") body = { user: { id: 42, username: "fixture", display_name: "Fixture user", display_name_ar: "مستخدم الاختبار", permissions, preferred_language: language } };
        else if (route === "/public-branding") body = { companyNameEn: "MPBF Factory", companyNameAr: "مصنع MPBF", logoSrc: null };
        else if (request.method !== "GET") {
          const input = JSON.parse(request.postData || "{}");
          writes.push({ route, input });
          const previous = committed.get(input.request_id);
          if (previous) {
            assert.deepEqual(input, previous.input, "idempotent replay must preserve its payload");
            body = previous.body;
          } else {
            if (filmReadyOnly && /^\/production\/orders\/\d+\/start$/.test(route)) {
              if (failStart) {
                failStart=false; status=409;
                body={message:"تغيرت حالة الطلب؛ حدّث البيانات.",message_en:"Order state changed. Refresh and retry."};
              } else {
                const target=state.orders.find(order=>order.id===Number(route.split("/")[3]));
                target.started_at="2026-10-05T09:00:00Z";target.status="active";target.order_status="in_production";target.stage="film";
              }
            }
            if (route === "/production/queues/reorder") {
              const first = state.queues.find(q=>q.id===input.first_id), second = state.queues.find(q=>q.id===input.second_id);
              if (!first || !second || first.position!==input.first_position || second.position!==input.second_position) {
                status=409;body={message:"تغير ترتيب الطابور",message_en:"Queue positions changed."};
              } else [first.position,second.position]=[second.position,first.position];
            }
            if(status===200){
              body={id:99+committed.size,voucher_number:"FR-00000099",items:input.items||[]};
              committed.set(input.request_id,{route,input:structuredClone(input),body});
            }
          }
          if(failWrite&&status===200){
            failWrite=false;
            // The save has committed, but the response is lost in transit.
            await send("Fetch.failRequest",{requestId,errorReason:"ConnectionClosed"},event.sessionId);
            return;
          }
        } else if (route === "/production/state") {
          const scope=new URL(request.url).searchParams.get("scope");
          stateScopes.push(scope);
          if (failure) { status = 500; body = { message: "خطأ تحميل تجريبي", message_en: "Fixture loading failure" }; }
          else body = {...state,receipts:[],inventory:[],movements:[],rolls:state.rolls.filter(roll=>roll.stage!=="done"),
            orders:scope==="warehouse"?[]:scope==="hall"?state.orders.filter(order=>Number(order.remaining_kg)>0):state.orders.filter(order=>order.id!==6)};
        } else if (route.startsWith("/production/history/")) {
          const url=new URL(request.url), kind=route.split("/").pop(), params=url.searchParams;
          historyCalls.push({kind,params:Object.fromEntries(params)});
          if(historyFailure){historyFailure=false;status=500;body={message:"تعذر تحميل التاريخ",message_en:"Fixture history failure"};}
          else {
            let records=archives[kind]||[];
            if(params.get("order_id"))records=records.filter(record=>record.production_order_id===Number(params.get("order_id")));
            if(params.get("before"))records=records.filter(record=>record.id<Number(params.get("before")));
            if(params.get("status"))records=records.filter(record=>(kind==="rolls"?record.stage:record.status)===params.get("status"));
            if(params.get("search"))records=records.filter(record=>JSON.stringify(record).toLowerCase().includes(params.get("search").toLowerCase()));
            records=[...records].sort((a,b)=>b.id-a.id);
            const limit=Number(params.get("limit")||50), more=records.length>limit;
            records=records.slice(0,limit);body={records,next:more?records.at(-1).id:null};
          }
        } else if (/\/production\/rolls\/\d+\/qr$/.test(route)) {
          const rollId = route.split("/").at(-2);
          const url = new URL(`/production/rolls/${rollId}`, request.url).href;
          body = { url, image: await QRCode.toDataURL(url) };
        } else if (/\/production\/rolls\/\d+$/.test(route)) {
          const record = state.rolls.find(r => r.id === Number(route.split("/").pop()));
          body = {...record,film_duration:state.orders.find(order=>order.id===record.production_order_id)
            .film_durations.find(group=>group.machine_id===record.film_machine_id),
            created_actor:{id:42,display_name:"Creator Person",display_name_ar:"منشئ الرول",full_name:"Creator Full Name",username:"creator"},
            printed_actor:record.id===2?{id:43,display_name:"Printer Person",display_name_ar:"عامل الطباعة",full_name:"Printer Full Name",username:"printer"}:null,
            cut_actor:record.id===2?{id:44,display_name:"Cutter Person",display_name_ar:"عامل القص",full_name:"Cutter Full Name",username:"cutter"}:null,
            ...(record.id===2?{stage:"done",printed_by:43,cut_by:44,printed_at:"2026-10-03T06:10:11Z",
              cut_completed_at:"2026-10-03T06:30:31Z",net_weight_kg:"9.00"}:{})};
        }
        await send("Fetch.fulfillRequest", { requestId, responseCode: status, responseHeaders: [{ name: "Content-Type", value: "application/json" }],
          body: Buffer.from(JSON.stringify(body)).toString("base64") }, event.sessionId);
      })().catch(error => errors.push(error.message));
    });
    const target = (await send("Target.createTarget", { url: "about:blank" }, null)).targetId;
    session = (await send("Target.attachToTarget", { targetId: target, flatten: true }, null)).sessionId;
    for (const method of ["Page.enable", "Runtime.enable"]) await send(method);
    await send("Fetch.enable", { patterns: [{ urlPattern: "*/api/*" }] });
    const evaluate = async expression => {
      const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
      return result.result.value;
    };
    const wait = async expression => { for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await new Promise(r => setTimeout(r, 100)); } throw Error(`Timed out: ${expression}`); };
    const origin = process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://127.0.0.1:5000";
    const navigate = async route => {
      const loaded = new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(Error(`Navigation timeout ${route}`)), 15000);
        onLoad = () => { clearTimeout(timer); resolve(); onLoad = undefined; };
      });
      await send("Page.navigate", { url: origin + route }); await loaded;
      await wait("!!document.querySelector('.production-app')");
      await wait("!document.querySelector('.prod-loading')");
    };
    const clickText = label => evaluate(`(()=>{const e=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)}); if(!e)throw Error('Missing button '+${JSON.stringify(label)});e.click()})()`);
    const setInput = (selector, value) => evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}); if(!e)throw Error('Missing input'); const setter=Object.getOwnPropertyDescriptor(e.tagName==='SELECT'?HTMLSelectElement.prototype:e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set;setter.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))})()`);
    if (filmReadyOnly) {
      const ready = state.orders[0];
      const reset = () => Object.assign(ready, {status:"pending",order_status:"for_production",previous_status:null,
        batch_number:null,started_at:null,film_closed_at:null,completed_at:null,stage:null,produced_kg:"0.00",roll_count:0});
      state.orders.push(order(80,{status:"pending",started_at:null,previous_status:"active"}),
        order(81,{status:"pending",started_at:null,batch_number:"OLD"}),
        order(82,{status:"pending",started_at:null,order_status:"paused"}),
        order(83,{status:"pending",started_at:null,final_quantity_kg:"0.00"}));
      for (const lang of ["ar","en"]) {
        language=lang; permissions=["operate_film"];
        for(const width of [390,768,1440]) {
          reset();
          await send("Emulation.setDeviceMetricsOverride",{width,height:950,deviceScaleFactor:1,mobile:width<500});
          const before=writes.length;
          await navigate("/production/film");
          await wait("!!document.querySelector('[data-film-state=\"ready\"] .prod-start-film')");
          check(`${lang} ${width}: ready order visible without starting`,writes.length,before);
          check(`${lang} ${width}: ready plan stays pending`,[ready.status,ready.order_status,ready.started_at],["pending","for_production",null]);
          check(`${lang} ${width}: readiness label localized`,await evaluate("document.querySelector('[data-film-state=\"ready\"]').textContent.includes("+JSON.stringify(lang==="ar"?"جاهز":"Ready")+")"));
          check(`${lang} ${width}: exactly one eligible ready card`,await evaluate("document.querySelectorAll('[data-film-state=\"ready\"]').length"),1);
          check(`${lang} ${width}: no execution controls before start`,await evaluate("!document.querySelector('[data-film-state=\"ready\"] input')&&!document.querySelector('#weight-1')"));
          check(`${lang} ${width}: fits phone/tablet/desktop`,await evaluate("document.documentElement.scrollWidth<=innerWidth+1"));
          if(lang==="ar"&&width===390){
            const shot=await send("Page.captureScreenshot",{format:"png"});
            await fs.writeFile("/tmp/film-ready-mobile.png",Buffer.from(shot.data,"base64"));
            failStart=true;
            await evaluate("document.querySelector('.prod-start-film').click()");
            await wait("!!document.querySelector('[role=\"alert\"]')");
            check("failed start keeps plan ready",ready.started_at,null);
            check("failed start has no weight controls",await evaluate("!document.querySelector('#weight-1')"));
          }
          const startBefore=writes.length;
          await evaluate("(()=>{const b=document.querySelector('.prod-start-film');b.click();b.click()})()");
          await wait("!document.querySelector('[data-film-state=\"ready\"]')&&!!document.querySelector('#weight-1')");
          check(`${lang} ${width}: double click sends one start`,writes.length,startBefore+1);
          check(`${lang} ${width}: start is scoped to child order`,writes.at(-1).route,"/production/orders/1/start");
          check(`${lang} ${width}: start sends only request identity`,Object.keys(writes.at(-1).input),["request_id"]);
          check(`${lang} ${width}: started order becomes active`,ready.status,"active");
        }
        reset(); permissions=["view_production"];
        await navigate("/production/film");
        await wait("!!document.querySelector('[data-film-state=\"ready\"]')");
        check(`${lang}: readonly users see ready orders without start button`,await evaluate("!document.querySelector('.prod-start-film')"));
      }
      check("no film ready browser runtime errors",errors,[]);
      console.log(`Verified ${passed} film-ready browser checks; fixture writes only.`);
      return;
    }
    for (const lang of ["en", "ar"]) {
      language = lang;
      for (const width of [390, 768, 1440]) {
        await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 500 });
        for (const route of ["/production", "/production/film", "/production/printing", "/production/cutting", "/production/hall", "/production/warehouse", "/production/rolls/2", "/production/rolls/3"]) {
          await navigate(route);
          check(`${lang} ${width} ${route} fits viewport`, await evaluate("document.documentElement.scrollWidth <= innerWidth + 1"));
          check(`${lang} ${width} ${route} renders content`, await evaluate("document.querySelector('.production-app').innerText.length > 50"));
          if(route==="/production/film"){
            check(`${lang} ${width} duplicate close-film button absent`,await evaluate("![...document.querySelectorAll('button')].some(button=>/Close film with existing rolls|إغلاق الفيلم باستخدام الرولات المسجلة/.test(button.textContent))"));
            check(`${lang} ${width} final-roll checkbox remains`,await evaluate("!!document.querySelector('.prod-label-inline input[type=\"checkbox\"]')&&/final roll|آخر رول/.test(document.querySelector('.production-app').innerText)"));
            check(`${lang} ${width} manual duration input removed`,await evaluate("document.querySelectorAll('input[id^=\"minutes-\"]').length"),0);
            const groups=await evaluate(`(()=>{const card=[...document.querySelectorAll('.prod-order')].find(node=>node.querySelector('h3 .prod-number')?.textContent==='PO-2');return [...card.querySelectorAll('.prod-film-duration-item')].map(node=>node.innerText)})()`);
            check(`${lang} ${width} separate machine summaries`,groups.length,2);
            check(`${lang} ${width} aggregate spans more than a day`,groups[0].includes(lang==="en"?"29 h 3 sec":"29 س 3 ث"));
            check(`${lang} ${width} one roll is pending`,groups[1].includes(lang==="en"?"duration not yet determined":"لم تُحدد المدة بعد"));
            check(`${lang} ${width} both endpoints visible`,await evaluate("document.querySelectorAll('.prod-film-duration-times time').length>=4"));
            check(`${lang} ${width} legitimate zero span`,await evaluate(`document.querySelector('.production-app').innerText.includes(${JSON.stringify(lang==="en"?"0 sec":"0 ث")})`));
          }
          if(route==="/production/rolls/2"){
            const detailText=await evaluate("document.querySelector('.prod-roll-detail').innerText");
            for(const name of lang==="en"?["Creator Person","Printer Person","Cutter Person"]:["منشئ الرول","عامل الطباعة","عامل القص"]){
              check(`${lang} ${width} recorded actor ${name}`,detailText.includes(name));
            }
            check(`${lang} ${width} all authoritative actor IDs remain`,["#42","#43","#44"].every(id=>detailText.includes(id)));
            check(`${lang} ${width} no receiver tracking`,!(/Received by|استلمها|مستلم الرول/.test(detailText)));
            check(`${lang} ${width} detail uses its order/machine aggregate`,await evaluate(`document.querySelector('.prod-roll-detail .prod-film-duration').innerText.includes(${JSON.stringify(lang==="en"?"29 h 3 sec":"29 س 3 ث")})`));
            check(`${lang} ${width} detail does not show old manual minutes`,await evaluate("!document.querySelector('.prod-roll-detail').innerText.includes('Production time (minutes)')&&!document.querySelector('.prod-roll-detail').innerText.includes('مدة الإنتاج (دقيقة)')"));
          }
          if(route==="/production/rolls/3"){
            check(`${lang} ${width} absent stage actors not guessed`,await evaluate(`document.querySelector('.prod-roll-detail').innerText.includes(${JSON.stringify(lang==="en"?"Not recorded":"غير مسجل")})`));
          }
          if (lang === "en" && route === "/production" && [390, 1440].includes(width)) {
            const shot = await send("Page.captureScreenshot", { format: "png" });
            await fs.writeFile(`/tmp/factory-production-${width}.png`, Buffer.from(shot.data, "base64"));
          }
        }
      }
    }
    language = "en";
    await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await navigate("/production");
    check("historical records explicitly unrecorded", await evaluate("document.body.innerText.includes('Unrecorded')"));
    check("history is not fetched before opening",historyCalls.length,0);
    await evaluate("[...document.querySelectorAll('summary')].find(item=>item.textContent.trim()==='Order history').click()");
    await wait("document.body.innerText.includes('PO-220')");
    check("history first page is limited and includes full-source actuals",await evaluate("document.querySelectorAll('details[open] .prod-record').length===50&&document.body.innerText.includes('1,000 kg')"));
    check("history order review has full-source machine duration",await evaluate("document.querySelector('details[open] .prod-film-duration').innerText.includes('29 h 3 sec')"));
    await clickText("Next");await wait("document.body.innerText.includes('PO-170')");
    check("history sends a keyset cursor",historyCalls.at(-1).params.before,"171");
    await clickText("Previous");await wait("document.body.innerText.includes('PO-220')");
    await setInput("details[open] input:not([type])","PO-100");
    await evaluate("document.querySelector('details[open] form').requestSubmit()");
    await wait("document.body.innerText.includes('PO-100')&&!document.body.innerText.includes('PO-220')");
    check("search resets page cursor",historyCalls.at(-1).params.before===undefined);
    check("search preserves complete summary counts",await evaluate("document.querySelector('.prod-grid .prod-stat strong').textContent"),String(state.totals.orders));
    await setInput("details[open] input:not([type])","");historyFailure=true;
    await evaluate("document.querySelector('details[open] form').requestSubmit()");
    await wait("!!document.querySelector('details[open] .prod-error')");
    await clickText("Retry");await wait("document.body.innerText.includes('PO-220')");
    check("failed history request can be retried",await evaluate("!document.querySelector('details[open] .prod-error')"));
    await navigate("/production");
    await evaluate("document.querySelector('button[aria-label=\"Move down\"]').click()");
    await wait("!!document.querySelector('.prod-success')");
    check("queue reorder single atomic request with UUID", writes.at(-1).route, "/production/queues/reorder");
    check("queue reorder UUID", /^[0-9a-f-]{36}$/.test(writes.at(-1).input.request_id));
    check("queue UI sends current positions, not target positions", [writes.at(-1).input.first_position,writes.at(-1).input.second_position],[1,2]);
    check("queue swap applies both positions",state.queues.map(q=>q.position),[2,1]);
    await navigate("/production/film");
    await clickText("Change machine"); await setInput("#machine-film", "F2");
    check("machine choice immediately saved and picker closes", await evaluate("localStorage.getItem('mpbf-production-machine:42:film')==='F2'&&!document.querySelector('#machine-film')"));
    await setInput("#weight-2", "2.50");
    failWrite = true;
    await evaluate("document.querySelector('#weight-2').closest('article').querySelector('button.prod-btn:not(.quiet)').click()");
    await wait("!!document.querySelector('.prod-error')");
    const failedKey = writes.at(-1).input.request_id;
    check("failure retains entered film weight", await evaluate("document.querySelector('#weight-2').value"), "2.50");
    await clickText("Retry"); await wait("!!document.querySelector('.prod-success')");
    check("write retry preserves operation UUID", writes.at(-1).input.request_id, failedKey);
    check("film recording and retries never submit manual minutes",writes.filter(item=>item.route==="/production/orders/2/rolls").every(item=>!("production_minutes" in item.input)));
    check("successful film recovery clears the submitted draft",await evaluate("document.querySelector('#weight-2').value"),"");
    check("lost film response creates just one roll", [...committed.values()].filter(v=>v.route==="/production/orders/2/rolls").length,1);
    const beforeEmptyFilm=writes.length;
    await evaluate("document.querySelector('#weight-2').closest('article').querySelector('button.prod-btn:not(.quiet)').click()");
    check("empty recovered film draft cannot record a duplicate",writes.length,beforeEmptyFilm);
    await setInput("#weight-2","3.50");failWrite=true;
    await evaluate("document.querySelector('#weight-2').closest('article').querySelector('button.prod-btn:not(.quiet)').click()");
    await wait("!!document.querySelector('.prod-error')");
    await setInput("#weight-2","4.50");await clickText("Retry");await wait("!!document.querySelector('.prod-success')");
    check("recovery preserves a newer edited film draft",await evaluate("document.querySelector('#weight-2').value"),"4.50");
    check("recovery replays original film amount",writes.at(-1).input.weight_kg,"3.50");
    await navigate("/production/printing");
    check("printing excludes paused parent and done rolls", await evaluate("!document.querySelector('.production-app').innerText.includes('PO-7-R001')&&!document.querySelector('.production-app').innerText.includes('PO-4-R001')"));
    await navigate("/production/cutting");
    check("cutting excludes unprinted printed-bag roll and plastic rolls", await evaluate("!document.querySelector('.production-app').innerText.includes('PO-2-R001')&&!document.querySelector('.production-app').innerText.includes('PO-5-R001')"));
    await navigate("/production/rolls/2"); await wait("!!document.querySelector('.prod-qr img')");
    check("QR links to authenticated in-system roll route", await evaluate("document.querySelector('.prod-qr').innerText.includes('/production/rolls/2')"));
    permissions = ["view_production"];
    await navigate("/production");
    check("read-only manager has no mutation buttons", await evaluate("![...document.querySelectorAll('.production-app button')].some(b=>/Start production|Add to queue|Remove/.test(b.textContent))"));
    await navigate("/production/film");
    check("read-only operator cannot register film", await evaluate("![...document.querySelectorAll('.production-app button')].some(b=>b.textContent.trim()==='Register roll'&&!b.disabled)"));
    permissions = ["operate_film"];
    await navigate("/production"); await wait("location.pathname==='/production/film'");
    check("operator-only navigation opens permitted board", await evaluate("location.pathname"), "/production/film");
    permissions = ["view_finished_inventory"];
    await navigate("/production");
    await wait("location.pathname==='/production/warehouse'");
    check("warehouse-only navigation opens inventory", await evaluate("location.pathname"), "/production/warehouse");
    await evaluate("[...document.querySelectorAll('summary')].find(item=>item.textContent.trim()==='Saved receipt vouchers').click()");
    await wait("!!document.querySelector('.prod-voucher')");
    await evaluate("document.querySelectorAll('.prod-voucher').forEach(voucher=>voucher.open=true)");
    check("all saved voucher items displayed", await evaluate("document.querySelector('.production-app').innerText.includes('PO-4')&&document.querySelector('.production-app').innerText.includes('PO-2')"));
    check("inventory reader cannot edit locations", await evaluate("![...document.querySelectorAll('.production-app button')].some(b=>/Save location|Edit/.test(b.textContent))"));
    permissions=["admin"];await navigate("/production/warehouse");
    await setInput("#location-name","Fixture new location");await setInput("#location-name-ar","موقع الاختبار الجديد");failWrite=true;
    await clickText("Save location");await wait("!!document.querySelector('.prod-error')");
    const locationKey=writes.at(-1).input.request_id;
    await clickText("Retry");await wait("!!document.querySelector('.prod-success')");
    check("location retry reuses its operation UUID",writes.at(-1).input.request_id,locationKey);
    check("location recovery clears both name fields",await evaluate("[document.querySelector('#location-name').value,document.querySelector('#location-name-ar').value]"),["",""]);
    check("lost location response creates one location", [...committed.values()].filter(v=>v.route==="/production/locations").length,1);
    Object.assign(state.orders.find(order=>order.id===4), {ready_kg:"0.30",received_kg:"0.20",remaining_kg:"0.10"});
    permissions = ["receive_production"];
    await navigate("/production");
    await wait("location.pathname==='/production/hall'");
    check("receiver-only navigation opens hall", await evaluate("location.pathname"), "/production/hall");
    await setInput("#receipt-order-0","4"); await setInput("#receipt-location-0","1"); await setInput("#receipt-quantity-0","0.10");
    check("exact remaining 0.10 kg is accepted without floating subtraction", await evaluate("document.querySelector('#receipt-quantity-0').validity.valid"));
    await setInput("#receipt-notes","Fixture recovery note");failWrite=true;
    await clickText("Save receipt");await wait("!!document.querySelector('.prod-error')");
    const receiptKey=writes.at(-1).input.request_id;
    check("uncertain receipt retains its quantity",await evaluate("document.querySelector('#receipt-quantity-0').value"),"0.10");
    await clickText("Retry"); await wait("!!document.querySelector('.prod-success')");
    check("receiving UI submits authoritative kilograms and all identifiers", writes.at(-1).input.items, [{production_order_id:4,location_id:1,quantity_kg:"0.10"}]);
    check("receipt retry reuses its operation UUID",writes.at(-1).input.request_id,receiptKey);
    check("receipt recovery clears submitted items and notes",await evaluate("[document.querySelector('#receipt-order-0').value,document.querySelector('#receipt-quantity-0').value,document.querySelector('#receipt-notes').value]"),["","",""]);
    check("lost receipt response creates one partial receipt", [...committed.values()].filter(v=>v.route==="/production/receipts").length,1);
    const beforeEmptyReceipt=writes.length;await clickText("Save receipt");
    check("empty recovered receipt cannot submit again",writes.length,beforeEmptyReceipt);
    permissions = ["view_production_hall"];
    await navigate("/production/hall");
    check("hall viewer cannot save receipt", await evaluate("![...document.querySelectorAll('.production-app button')].some(b=>b.textContent.trim()==='Save receipt')"));
    permissions = ["view_production"];
    failure = true;
    await navigate("/production"); await wait("!!document.querySelector('.prod-error')");
    failure = false;
    await clickText("Retry"); await wait("!document.querySelector('.prod-error')");
    check("load failure retry restores data", await evaluate("document.querySelector('.production-app').innerText.includes('PO-2')"));
    permissions=["admin"];
    for(const lang of ["en","ar"]){
      language=lang;
      for(const width of [390,768,1440]){
        await send("Emulation.setDeviceMetricsOverride",{width,height:900,deviceScaleFactor:1,mobile:width<500});
        await navigate("/production");
        await evaluate(`[...document.querySelectorAll('summary')].find(item=>item.textContent.trim()===${JSON.stringify(lang==="en"?"Order history":"تاريخ أوامر الإنتاج")}).click()`);
        await wait("document.body.innerText.includes('PO-220')");
        check(`${lang} ${width} expanded history fits viewport`,await evaluate("document.documentElement.scrollWidth<=innerWidth+1"));
        await setInput("details[open] input:not([type])", "NO-MATCH-I18N");
        await evaluate("document.querySelector('details[open] form').requestSubmit()");
        const emptyText = lang === "en" ? "No results" : "لا توجد نتائج";
        await wait(`document.querySelector('details[open]').innerText.includes(${JSON.stringify(emptyText)})`);
        check(`${lang} ${width} history empty message`, await evaluate("document.querySelectorAll('details[open] .prod-record').length"), 0);
        await setInput("details[open] input:not([type])", ""); historyFailure = true;
        await evaluate("document.querySelector('details[open] form').requestSubmit()");
        await wait("!!document.querySelector('details[open] .prod-error')");
        check(`${lang} ${width} history localized error`, await evaluate(`document.querySelector('details[open] .prod-error').innerText.includes(${JSON.stringify(lang === "en" ? "Fixture history failure" : "تعذر تحميل التاريخ")})`));
        await navigate("/production/warehouse");
        for(const title of (lang==="en"?["Finished-goods balances","Saved receipt vouchers","Inventory movements"]:["أرصدة المواد التامة","سندات الاستلام المحفوظة","حركات المخزون"])){
          await evaluate(`[...document.querySelectorAll('summary')].find(item=>item.textContent.trim()===${JSON.stringify(title)}).click()`);
        }
        await wait("!!document.querySelector('.prod-voucher')");
        await evaluate("document.querySelectorAll('.prod-voucher').forEach(item=>item.open=true)");
        check(`${lang} ${width} expanded warehouse history fits viewport`,await evaluate("document.documentElement.scrollWidth<=innerWidth+1"));
      }
    }
    check("each board requests its own scope",["management","film","printing","cutting","hall","warehouse","roll"].every(scope=>stateScopes.includes(scope)));
    check("no runtime exceptions", errors, []);
    await fs.writeFile("/tmp/factory-ui-requests.json",JSON.stringify(writes));
    console.log(`Verified ${passed} browser assertions with isolated API fixtures.`);
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    ws?.close();
    if (chrome.exitCode === null) {
      const exited = new Promise(resolve => chrome.once("exit", resolve));
      chrome.kill("SIGTERM"); await exited;
    }
    await fs.rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });