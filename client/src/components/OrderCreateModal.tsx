import { useEffect, useRef, useState, type FormEvent, type ReactNode, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { AlertCircle, Boxes, Check, ClipboardList, LoaderCircle, Plus, Trash2, X } from "lucide-react";
import "./OrderCreateModal.css";

type Row = Record<string, any>;
type OrderLine = {
  key: number;
  id?: number;
  productionNumber?: string;
  locked?: boolean;
  mode: "existing" | "new";
  customerProductId: string;
  quantityKg: string;
  categoryId: string;
  itemId: string;
  sizeCaption: string;
  width: string;
  thickness: string;
  rawMaterial: string;
};
type ChoiceState = { values: Row[]; loading: boolean; error: string };

const freshLine = (key: number): OrderLine => ({
  key,
  mode: "existing",
  customerProductId: "",
  quantityKg: "",
  categoryId: "",
  itemId: "",
  sizeCaption: "",
  width: "",
  thickness: "",
  rawMaterial: "",
});

const getRows = (payload: any): Row[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const readApi = async (path: string, options: RequestInit = {}) => {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const fallback: Record<number, string> = {
      400: "البيانات المدخلة غير صالحة.",
      401: "انتهت الجلسة؛ يرجى تسجيل الدخول من جديد.",
      403: "لا تملك صلاحية تسجيل هذا الطلب.",
      404: "تعذر العثور على البيانات المطلوبة.",
      409: "يوجد تعارض في بيانات الطلب.",
      422: "تعذر التحقق من صحة البيانات.",
      500: "حدث خطأ في الخادم. حاول مرة أخرى.",
    };
    throw new Error(body?.message || fallback[response.status] || "تعذر إكمال الطلب.");
  }
  return body;
};

const readAllChoices = async (path: string): Promise<Row[]> => {
  const results: Row[] = [];
  for (let offset = 0; ; offset += 200) {
    const page = getRows(await readApi(`${path}?limit=200&offset=${offset}`));
    results.push(...page);
    if (page.length < 200) return results;
  }
};

const labelFor = (row: Row) => String(row.name_ar || row.name || row.display_name_ar || row.display_name || row.id || "");
const customerLabel = (row: Row) => String(row.name_ar || row.display_name_ar || row.name_en || row.display_name_en || row.name || row.display_name || row.id || "");
const riyadhDate = (value: Date | string = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
};
const normalizeDigits = (value: string) => value
  .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
  .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
const isCalendarDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.getUTCFullYear() === Number(match[1]) && date.getUTCMonth() === Number(match[2]) - 1 && date.getUTCDate() === Number(match[3]);
};
const legacyDeliveryDays = (createdAt: unknown, deliveryDate: unknown) => {
  const start = riyadhDate(String(createdAt ?? ""));
  const end = typeof deliveryDate === "string" ? deliveryDate.slice(0, 10) : "";
  if (!isCalendarDate(start) || !isCalendarDate(end)) return null;
  const startTime = Date.parse(`${start}T00:00:00Z`);
  const endTime = Date.parse(`${end}T00:00:00Z`);
  const difference = (endTime - startTime) / 86_400_000;
  return Number.isInteger(difference) && difference >= 1 && difference <= 3650 ? difference : null;
};
const validDeliveryDays = (value: unknown): number | null => {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const normalized = normalizeDigits(String(value)).trim();
  if (!/^\d+$/.test(normalized)) return null;
  const days = Number(normalized);
  return Number.isInteger(days) && days >= 1 && days <= 3650 ? days : null;
};
const wholeMeasure = (value: unknown) => {
  if (value === null || value === undefined || String(value).trim() === "") return "";
  const number = Number(normalizeDigits(String(value)).replace("٫", "."));
  return Number.isFinite(number) ? String(Math.round(number)) : "";
};
const productLabel = (product: Row) => {
  const width = wholeMeasure(product.width);
  const thickness = wholeMeasure(product.thickness);
  const details = [
    product.category_name_ar || product.category_name,
    product.item_name_ar || product.item_name,
    product.size_caption,
    width ? `عرض ${width} سم` : "",
    thickness ? `سماكة ${thickness} µ` : "",
    product.raw_material ? `المادة الخام: ${product.raw_material}` : "",
  ].filter(Boolean);
  return details.join(" · ") || `منتج رقم ${product.id}`;
};

function Alert({ children, info = false }: { children: ReactNode; info?: boolean }) {
  return <div className={`order-create-alert${info ? " info" : ""}`} role={info ? "status" : "alert"}><AlertCircle size={17} aria-hidden="true" /><div>{children}</div></div>;
}

function CustomerSearchSelect({ customers, selectedId, onSelect, disabled }: {
  customers: Row[];
  selectedId: string;
  onSelect: (id: string) => void;
  disabled: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const selected = customers.find((customer) => String(customer.id) === selectedId);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matches = customers.filter((customer) => [
    customer.name_ar, customer.display_name_ar, customer.name_en, customer.display_name_en,
    customer.name, customer.display_name, customer.id,
  ].some((value) => String(value ?? "").toLocaleLowerCase().includes(normalizedQuery)));
  const visibleMatches = matches.slice(0, 100);

  useEffect(() => {
    if (selected) setQuery(customerLabel(selected));
  }, [selected?.id]);

  const choose = (customer: Row) => {
    onSelect(String(customer.id));
    setQuery(customerLabel(customer));
    setOpen(false);
  };
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => visibleMatches.length ? (index + 1) % visibleMatches.length : 0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => visibleMatches.length ? (index - 1 + visibleMatches.length) % visibleMatches.length : 0);
    } else if (event.key === "Enter" && open && visibleMatches[activeIndex]) {
      event.preventDefault();
      choose(visibleMatches[activeIndex]);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      setQuery(selected ? customerLabel(selected) : "");
    }
  };

  return (
    <div className="order-customer-picker">
      <div className="order-customer-input-wrap">
        <input
          id="order-customer"
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls="order-customer-options"
          aria-activedescendant={open && visibleMatches[activeIndex] ? `order-customer-option-${visibleMatches[activeIndex].id}` : undefined}
          aria-label="ابحث عن العميل بالاسم أو الرقم"
          value={query}
          onFocus={() => { if (!disabled) setOpen(true); }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActiveIndex(0);
            if (selectedId) onSelect("");
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          placeholder="ابحث باسم العميل أو رقمه"
          autoComplete="off"
          disabled={disabled}
          required={!selectedId}
        />
        {selectedId && !disabled && (
          <button className="order-customer-clear" type="button" aria-label="مسح العميل المحدد" onMouseDown={(event) => event.preventDefault()} onClick={() => {
            onSelect("");
            setQuery("");
            setOpen(true);
          }}><X size={15} /></button>
        )}
      </div>
      {open && !disabled && (
        <div className="order-customer-options" id="order-customer-options" role="listbox" aria-label="نتائج العملاء">
          {visibleMatches.length ? visibleMatches.map((customer, index) => (
            <button
              id={`order-customer-option-${customer.id}`}
              className={`order-customer-option${index === activeIndex ? " is-active" : ""}`}
              key={customer.id ?? index}
              type="button"
              role="option"
              aria-selected={String(customer.id) === selectedId}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(customer)}
            >
              <span>{customerLabel(customer)}</span><small>#{customer.id}</small>
            </button>
          )) : <div className="order-customer-empty" role="status">لا توجد نتائج مطابقة.</div>}
        </div>
      )}
    </div>
  );
}

export default function OrderCreateModal({ editId, onClose, onSaved }: { editId?: number; onClose: () => void; onSaved: () => void }) {
  const [customers, setCustomers] = useState<ChoiceState>({ values: [], loading: true, error: "" });
  const [categories, setCategories] = useState<ChoiceState>({ values: [], loading: true, error: "" });
  const [items, setItems] = useState<ChoiceState>({ values: [], loading: true, error: "" });
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [customerProducts, setCustomerProducts] = useState<Row[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState("");
  const [reloadOptions, setReloadOptions] = useState(0);
  const [orderNumber, setOrderNumber] = useState("");
  const [orderCreatedDate, setOrderCreatedDate] = useState(() => riyadhDate());
  const [deliveryDays, setDeliveryDays] = useState("20");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("waiting");
  const [originalItems, setOriginalItems] = useState<{ id: number; customer_product_id: number | null; quantity_kg: string }[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(Boolean(editId));
  const [detailsError, setDetailsError] = useState("");
  const [detailsRetry, setDetailsRetry] = useState(0);
  const [lines, setLines] = useState<OrderLine[]>([freshLine(1)]);
  const [nextLineKey, setNextLineKey] = useState(2);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    if (editId) return;
    const timer = window.setInterval(() => setOrderCreatedDate(riyadhDate()), 60_000);
    return () => window.clearInterval(timer);
  }, [editId]);

  useEffect(() => {
    if (!editId) return;
    let active = true;
    setDetailsLoading(true);
    setDetailsError("");
    readApi(`/api/orders/${editId}/with-items`).then((data) => {
      if (!active) return;
      setOrderNumber(data.order.order_number);
      setOrderCreatedDate(riyadhDate(data.order.created_at));
      setSelectedCustomer(data.order.customer_id);
      const savedDays = validDeliveryDays(data.order.delivery_days);
      setDeliveryDays(String(savedDays ?? legacyDeliveryDays(data.order.created_at, data.order.delivery_date) ?? 20));
      setNotes(data.order.notes || "");
      setStatus(data.order.status || "waiting");
      setOriginalItems(data.items.map((line: Row) => ({
        id: line.id, customer_product_id: line.customer_product_id, quantity_kg: line.quantity_kg,
      })));
      setLines(data.items.map((line: Row, index: number) => ({
        ...freshLine(index + 1),
        id: line.id,
        productionNumber: line.production_order_number,
        locked: line.status !== "pending" || Boolean(line.batch_number),
        customerProductId: String(line.customer_product_id ?? ""),
        quantityKg: String(line.quantity_kg),
      })));
      setNextLineKey(data.items.length + 1);
      setDetailsLoading(false);
    }).catch((e) => {
      if (active) { setDetailsError((e as Error).message); setDetailsLoading(false); }
    });
    return () => { active = false; };
  }, [editId, detailsRetry]);

  useEffect(() => {
    let active = true;
    const loadChoices = async (path: string, setter: (value: ChoiceState) => void) => {
      setter({ values: [], loading: true, error: "" });
      try {
        const values = await readAllChoices(path);
        if (active) setter({ values, loading: false, error: "" });
      } catch (e) {
        if (active) setter({ values: [], loading: false, error: (e as Error).message });
      }
    };
    void loadChoices("/api/customers", setCustomers);
    void loadChoices("/api/categories", setCategories);
    void loadChoices("/api/items", setItems);
    return () => { active = false; };
  }, [reloadOptions]);

  useEffect(() => {
    if (!selectedCustomer) {
      setCustomerProducts([]);
      setProductsLoading(false);
      setProductsError("");
      return;
    }
    const controller = new AbortController();
    setProductsLoading(true);
    setProductsError("");
    setCustomerProducts([]);
    readApi(`/api/customers/${encodeURIComponent(selectedCustomer)}/detail`, { signal: controller.signal })
      .then((payload) => {
        const products = Array.isArray(payload?.products) ? payload.products : Array.isArray(payload?.data?.products) ? payload.data.products : [];
        setCustomerProducts(products);
        setProductsLoading(false);
      })
      .catch((e) => {
        if (e?.name !== "AbortError") {
          setProductsError((e as Error).message);
          setProductsLoading(false);
        }
      });
    return () => controller.abort();
  }, [selectedCustomer, reloadOptions]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !savingRef.current) onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const updateLine = (key: number, patch: Partial<OrderLine>) => {
    setLines((current) => current.map((line) => line.key === key ? { ...line, ...patch } : line));
  };

  const addLine = () => {
    if (lines.length >= 25) return;
    setLines((current) => [...current, freshLine(nextLineKey)]);
    setNextLineKey((key) => key + 1);
  };

  const changeCustomer = (value: string) => {
    if (editId) return;
    setSelectedCustomer(value);
    setLines((current) => current.map((line) => ({ ...line, customerProductId: "" })));
  };

  const retryProducts = () => {
    if (selectedCustomer) setReloadOptions((value) => value + 1);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingRef.current) return;
    setError("");
    if (detailsLoading || detailsError) return;
    const normalizedLines = lines.map((line) => ({ ...line, quantityKg: normalizeDigits(line.quantityKg), width: normalizeDigits(line.width), thickness: normalizeDigits(line.thickness) }));
    if (!selectedCustomer) {
      setError("يرجى اختيار العميل.");
      return;
    }
    const normalizedDeliveryDays = validDeliveryDays(deliveryDays);
    if (normalizedDeliveryDays === null) {
      setError("أدخل مدة تسليم صحيحة من يوم واحد إلى 3650 يوماً.");
      return;
    }
    if (normalizedLines.length < 1) {
      setError("أضف منتجاً واحداً على الأقل إلى الطلب.");
      return;
    }
    for (let index = 0; index < normalizedLines.length; index += 1) {
      const line = normalizedLines[index];
      const quantity = Number(line.quantityKg.trim().replace(",", "."));
      if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(line.quantityKg.trim().replace(",", ".")) || !Number.isFinite(quantity) || quantity <= 0) {
        setError(`أدخل كمية صحيحة أكبر من صفر وبحد أقصى منزلتين عشريتين للبند ${index + 1}.`);
        return;
      }
      if (line.mode === "existing" && !line.customerProductId) {
        setError(`اختر منتج العميل للبند ${index + 1}، أو أضف منتجاً جديداً.`);
        return;
      }
      if (line.mode === "new" && (!line.itemId || !line.sizeCaption.trim())) {
        setError(`نوع المنتج ومقاسه مطلوبان للبند ${index + 1}.`);
        return;
      }
      if (line.mode === "new") {
        for (const [value, maximum, label] of [
          [line.width, 999999, "العرض"],
          [line.thickness, 99999, "السماكة"],
        ] as const) {
          const numberText = value.trim();
          if (numberText && (!/^\d+$/.test(numberText) || Number(numberText) <= 0 || Number(numberText) > maximum)) {
            setError(`${label} للبند ${index + 1} يجب أن يكون رقماً صحيحاً موجباً لا يتجاوز ${maximum}.`);
            return;
          }
        }
      }
    }
    savingRef.current = true;
    setSaving(true);
    try {
      const payload = {
        ...(editId ? { status, original_items: originalItems } : { customer_id: selectedCustomer }),
        delivery_days: normalizedDeliveryDays,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        items: normalizedLines.map((line) => ({
          ...(editId && line.id ? { id: line.id } : {}),
          ...(line.mode === "existing"
            ? { customer_product_id: Number(line.customerProductId) }
            : {
                new_product: {
                  ...(line.categoryId ? { category_id: line.categoryId } : {}),
                  item_id: line.itemId,
                  size_caption: line.sizeCaption.trim(),
                  ...(line.width.trim() ? { width: line.width.trim() } : {}),
                  ...(line.thickness.trim() ? { thickness: line.thickness.trim() } : {}),
                  ...(line.rawMaterial.trim() ? { raw_material: line.rawMaterial.trim() } : {}),
                },
              }),
          quantity_kg: line.quantityKg.trim().replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))).replace(",", "."),
        })),
      };
      await readApi(editId ? `/api/orders/${editId}/with-items` : "/api/orders/with-items", { method: editId ? "PUT" : "POST", body: JSON.stringify(payload) });
      onSaved();
    } catch (e) {
      setError((e as Error).message || "تعذر حفظ الطلب.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const baseOptionErrors = [customers.error, categories.error, items.error].filter(Boolean);
  return (
    <div className="order-create-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !saving && onClose()}>
      <section className="order-create-modal" role="dialog" aria-modal="true" aria-labelledby="order-create-title">
        <header className="order-create-head">
          <div className="order-create-heading">
            <span className="order-create-mark" aria-hidden="true"><ClipboardList size={21} /></span>
            <div>
              <h2 id="order-create-title">{editId ? "تعديل طلب العميل" : "تسجيل طلب عميل"}</h2>
              <p>{editId ? "عدّل البنود التي لم يبدأ إنتاجها. البنود قيد العمل محفوظة دون تغيير." : "أدخل بيانات الطلب ثم أضف الأصناف والكميات بالكيلوغرام."}</p>
            </div>
          </div>
          <button className="order-create-close" type="button" aria-label="إغلاق نافذة الطلب" title="إغلاق" disabled={saving} onClick={onClose}><X size={20} /></button>
        </header>

        <form className="order-create-form" noValidate onSubmit={submit}>
          {error && <Alert>{error}</Alert>}
          {detailsLoading && <div className="order-options-state" role="status">جارٍ تحميل بنود الطلب…</div>}
          {detailsError && <Alert>تعذر تحميل بنود الطلب: {detailsError} <button type="button" onClick={() => setDetailsRetry((value) => value + 1)}>إعادة المحاولة</button></Alert>}
          {baseOptionErrors.length > 0 && (
            <Alert>
              تعذر تحميل بعض الخيارات. يمكنك إعادة المحاولة قبل المتابعة.
              <button type="button" className="order-options-state-retry" onClick={() => setReloadOptions((value) => value + 1)}>إعادة تحميل الخيارات</button>
            </Alert>
          )}

          <section className="order-create-section" aria-labelledby="order-main-heading">
            <h3 className="order-create-section-title" id="order-main-heading"><span>01</span> بيانات الطلب</h3>
            <div className="order-create-grid">
              <div className="order-create-field order-create-number">
                <label htmlFor="order-number">رقم الطلب</label>
                <div className="order-create-field-static order-number-readonly" id="order-number" dir={editId ? "ltr" : "rtl"}>
                  {editId ? (orderNumber || "—") : "عند الحفظ"}
                </div>
              </div>
              <div className="order-create-field order-created-date-field">
                <label htmlFor="order-created-date">تاريخ الطلب</label>
                <div className="order-create-field-static order-date-readonly" id="order-created-date" dir="ltr">
                  {orderCreatedDate || "—"}
                </div>
              </div>
              <div className="order-create-field order-delivery-days-field">
                <label htmlFor="order-delivery-days">مدة التسليم <span aria-hidden="true">*</span></label>
                <input
                  id="order-delivery-days"
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  aria-label="مدة التسليم بالأيام"
                  value={deliveryDays}
                  onChange={(event) => setDeliveryDays(normalizeDigits(event.target.value).replace(/[^\d]/g, ""))}
                  minLength={1}
                  maxLength={4}
                  aria-describedby="order-delivery-days-hint"
                  disabled={saving}
                  required
                />
                <small className="order-create-hint" id="order-delivery-days-hint">1–3650 يوم</small>
              </div>
              <div className="order-create-field order-customer-field">
                <label htmlFor="order-customer">العميل <span aria-hidden="true">*</span></label>
                {customers.loading ? <div className="order-create-skeleton" aria-label="جارٍ تحميل العملاء" aria-busy="true"><i /><i /></div> :
                  editId ? <div className="order-create-field-static">{customerLabel(customers.values.find((customer) => String(customer.id) === String(selectedCustomer)) || {}) || "—"}</div> :
                  <CustomerSearchSelect customers={customers.values} selectedId={String(selectedCustomer)} onSelect={changeCustomer} disabled={saving || Boolean(customers.error)} />}
              </div>
            </div>
          </section>

          <section className="order-create-section" aria-labelledby="order-items-heading">
            <h3 className="order-create-section-title" id="order-items-heading"><span>02</span> منتجات الطلب</h3>
            {!selectedCustomer ? (
              <div className="order-options-state">اختر العميل أولاً لعرض منتجاته المسجلة أو إضافة منتج جديد.</div>
            ) : productsLoading ? (
              <div className="order-create-skeleton order-products-loading" aria-label="جارٍ تحميل منتجات العميل" aria-busy="true"><i /><i /><i /></div>
            ) : productsError ? (
              <div className="order-options-state" role="alert">تعذر تحميل منتجات هذا العميل: {productsError}<button type="button" onClick={retryProducts}>إعادة المحاولة</button></div>
            ) : null}

            {selectedCustomer && !productsLoading && !productsError && customerProducts.length === 0 && (
              <div className="order-options-state order-create-inline-note">لا توجد منتجات مسجلة لهذا العميل بعد. يمكنك إضافة تفاصيل منتج جديد مباشرةً في أحد البنود.</div>
            )}

            <div className="order-lines">
              {lines.map((line, index) => {
                const matchingItems = line.categoryId ? items.values.filter((item) => String(item.category_id ?? item.categoryId ?? "") === line.categoryId) : items.values;
                return (
                  <article className="order-line-card" key={line.key} aria-label={`بند رقم ${index + 1}`}>
                    <div className="order-line-top">
                      <div className="order-line-title"><span className="order-line-index">{String(index + 1).padStart(2, "0")}</span> {line.productionNumber || "بند المنتج"} {line.locked && <small>· بدأ الإنتاج — للعرض فقط</small>}</div>
                      {lines.length > 1 && !line.locked && <button className="order-line-remove" type="button" onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))} disabled={saving} aria-label={`حذف البند ${index + 1}`}><Trash2 size={15} /> حذف البند</button>}
                    </div>

                    <div className="order-product-mode" role="group" aria-label={`مصدر المنتج للبند ${index + 1}`}>
                      <button type="button" aria-pressed={line.mode === "existing"} onClick={() => updateLine(line.key, { mode: "existing", categoryId: "", itemId: "", sizeCaption: "", width: "", thickness: "", rawMaterial: "" })} disabled={saving || line.locked}>منتج مسجل</button>
                      <button type="button" aria-pressed={line.mode === "new"} onClick={() => updateLine(line.key, { mode: "new", customerProductId: "" })} disabled={saving || line.locked}>منتج جديد</button>
                    </div>

                    <div className="order-line-grid" style={{ marginTop: 11 }}>
                      {line.mode === "existing" ? (
                        <div className="order-line-field order-line-product">
                          <label htmlFor={`order-product-${line.key}`}>منتج العميل <span aria-hidden="true">*</span></label>
                          <select id={`order-product-${line.key}`} value={line.customerProductId} onChange={(event) => updateLine(line.key, { customerProductId: event.target.value })} required disabled={saving || line.locked || !selectedCustomer || productsLoading || Boolean(productsError)}>
                            <option value="">اختر منتجاً</option>
                            {customerProducts.map((product, productIndex) => <option key={product.id ?? productIndex} value={product.id}>{productLabel(product)}</option>)}
                          </select>
                        </div>
                      ) : (
                        <div className="order-line-field order-line-product">
                          <label htmlFor={`order-new-item-${line.key}`}>نوع المنتج <span aria-hidden="true">*</span></label>
                          <select id={`order-new-item-${line.key}`} value={line.itemId} onChange={(event) => updateLine(line.key, { itemId: event.target.value })} required disabled={saving || items.loading || Boolean(items.error)}>
                            <option value="">{items.loading ? "جارٍ تحميل الأنواع…" : "اختر نوع المنتج"}</option>
                            {matchingItems.map((item, itemIndex) => <option key={item.id ?? itemIndex} value={item.id}>{labelFor(item)}</option>)}
                          </select>
                        </div>
                      )}
                      <div className="order-line-field order-line-quantity">
                        <label htmlFor={`order-quantity-${line.key}`}>الكمية <span aria-hidden="true">*</span></label>
                        <div className="order-quantity-wrap">
                          <input id={`order-quantity-${line.key}`} type="text" inputMode="decimal" dir="ltr" value={line.quantityKg} onChange={(event) => updateLine(line.key, { quantityKg: event.target.value })} placeholder="0.00" required disabled={saving || line.locked} aria-describedby={`order-quantity-unit-${line.key}`} />
                          <span className="order-quantity-unit" id={`order-quantity-unit-${line.key}`}>كغ</span>
                        </div>
                      </div>
                    </div>

                    {line.mode === "new" && (
                      <div className="order-new-product">
                        <div className="order-line-field">
                          <label htmlFor={`order-category-${line.key}`}>التصنيف <span className="order-create-hint">(اختياري)</span></label>
                          <select id={`order-category-${line.key}`} value={line.categoryId} onChange={(event) => updateLine(line.key, { categoryId: event.target.value, itemId: "" })} disabled={saving || categories.loading || Boolean(categories.error)}>
                            <option value="">{categories.loading ? "جارٍ تحميل التصنيفات…" : "بدون تصنيف"}</option>
                            {categories.values.map((category, categoryIndex) => <option key={category.id ?? categoryIndex} value={category.id}>{labelFor(category)}</option>)}
                          </select>
                        </div>
                        <div className="order-line-field">
                          <label htmlFor={`order-size-${line.key}`}>المقاس <span aria-hidden="true">*</span></label>
                           <input id={`order-size-${line.key}`} type="text" maxLength={50} value={line.sizeCaption} onChange={(event) => updateLine(line.key, { sizeCaption: event.target.value })} placeholder="مثال: 30 × 40" required disabled={saving} />
                        </div>
                        <div className="order-line-field">
                          <label htmlFor={`order-width-${line.key}`}>العرض</label>
                           <input id={`order-width-${line.key}`} type="number" min="1" max="999999" step="1" value={line.width} onChange={(event) => updateLine(line.key, { width: event.target.value })} placeholder="سم · اختياري" disabled={saving} />
                        </div>
                        <div className="order-line-field">
                          <label htmlFor={`order-thickness-${line.key}`}>السماكة</label>
                           <input id={`order-thickness-${line.key}`} type="number" min="1" max="99999" step="1" value={line.thickness} onChange={(event) => updateLine(line.key, { thickness: event.target.value })} placeholder="ميكرون · اختياري" disabled={saving} />
                        </div>
                        <div className="order-line-field order-create-field-wide">
                          <label htmlFor={`order-raw-material-${line.key}`}>الخامة</label>
                           <input id={`order-raw-material-${line.key}`} type="text" maxLength={20} value={line.rawMaterial} onChange={(event) => updateLine(line.key, { rawMaterial: event.target.value })} placeholder="اختياري" disabled={saving} />
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
             <button className="order-create-add" type="button" onClick={addLine} disabled={saving || lines.length >= 25}><Plus size={16} /> إضافة بند آخر</button>
            {lineOptionsIssue(categories, items) && <p className="order-create-inline-note">{lineOptionsIssue(categories, items)}</p>}
          </section>

          <section className="order-create-section order-notes-section" aria-labelledby="order-notes-heading">
            <h3 className="order-create-section-title" id="order-notes-heading"><span>03</span> ملاحظات</h3>
            <div className="order-create-field">
              <label htmlFor="order-notes">ملاحظات <span className="order-create-hint">(اختياري)</span></label>
              <textarea id="order-notes" maxLength={5000} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="أي تفاصيل تساعد فريق التخطيط أو التسليم…" disabled={saving} />
            </div>
          </section>

          <footer className="order-create-footer">
             <span className="order-create-footer-note"><Boxes size={14} aria-hidden="true" /> {editId ? "البنود التي بدأ إنتاجها لا يمكن تعديلها أو حذفها" : "الحالة الأولية: بانتظار المعالجة"}</span>
            <div className="order-create-actions">
              <button type="button" className="order-create-cancel" onClick={onClose} disabled={saving}>إلغاء</button>
               <button type="submit" className="order-create-save" disabled={saving || detailsLoading || Boolean(detailsError) || customers.loading || Boolean(customers.error) || productsLoading || Boolean(productsError)}>
                 {saving ? <><LoaderCircle className="order-create-spin" size={16} /> جارٍ حفظ الطلب…</> : <><Check size={16} /> حفظ الطلب</>}
              </button>
            </div>
          </footer>
        </form>
      </section>
    </div>
  );
}

function lineOptionsIssue(categories: ChoiceState, items: ChoiceState) {
  const messages = [];
  if (categories.error) messages.push("تعذر تحميل التصنيفات؛ يمكن حفظ منتج جديد دون تصنيف.");
  if (items.error) messages.push("تعذر تحميل أنواع المنتجات؛ أعد تحميل الخيارات للمتابعة.");
  return messages.join(" ");
}