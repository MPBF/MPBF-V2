import QRCode from "react-qr-code";

import type { BrandingSnapshot } from "../lib/branding";
import { displayValue, formatOrderDate, numberText, orderStatusLabel, personName, productionStatusLabel } from "../lib/order-details";
import type { OrderDetails, OrderDetailProduction } from "../../../shared/order-details";

const bilingual = (ar: string, en: string) => <span className="opp-bilingual"><strong>{ar}</strong><small>{en}</small></span>;
const safeText = (value: unknown) => displayValue(value);

function PunchingIcon({ type }: { type: string }) {
  const normalized = type.toLocaleLowerCase();
  const hook = normalized.includes("hook") || normalized.includes("t-shirt") || normalized.includes("علاقي") || normalized.includes("علاقة");
  const banana = normalized.includes("banana") || normalized.includes("بنانة") || normalized.includes("بنان");
  if (!hook && !banana) return <span className="opp-no-punch">{safeText(type)}</span>;
  return <svg className="opp-punch-icon" viewBox="0 0 52 60" role="img" aria-label={hook ? "تخريم علاقي" : "تخريم بنانة"}>
    <rect x="4" y="5" width="44" height="50" rx="3" fill="#e2eae6" stroke="#405b53" strokeWidth="2" />
    {hook
      ? <path d="M16 16h20v11c0 6-4 10-10 10s-10-4-10-10z" fill="#fff" stroke="#435d55" strokeWidth="2" />
      : <rect x="12" y="15" width="28" height="12" rx="6" fill="#fff" stroke="#435d55" strokeWidth="2" />}
    <path d="M8 49h36" stroke="#a7b7ae" strokeWidth="1" strokeDasharray="2 2" />
    <text x="26" y="44" textAnchor="middle" fontSize="7" fontWeight="700" fill="#315d52">{hook ? "علاقي" : "بنانة"}</text>
  </svg>;
}

function sizeText(product: NonNullable<OrderDetailProduction["product"]>) {
  const caption = product.size_caption;
  const faces = [product.width, product.left_facing, product.right_facing].map((value) => value == null ? "" : String(value));
  if (caption) return caption;
  const [width, left, right] = faces;
  const size = width ? `${width}${left || right ? `+${left || "0"}+${right || "0"}` : ""}` : "";
  return size || "—";
}

function productionQuantity(row: OrderDetailProduction, product: NonNullable<OrderDetailProduction["product"]>) {
  const overrun = Number(row.overrun_percentage);
  return <div className="opp-qty-value">
    <strong dir="ltr">{numberText(row.quantity_kg)} kg</strong>
    <span>مطلوب / Requested</span>
    <strong dir="ltr">{numberText(row.final_quantity_kg)} kg</strong>
    <span>مخطط / Planned · +{Number.isFinite(overrun) ? overrun : "—"}%</span>
    {(product.unit_quantity != null || product.package_weight_kg != null) &&
      <small dir="auto">{product.unit_quantity != null ? `${numberText(product.unit_quantity)} وحدة` : ""}{product.unit_quantity != null && product.package_weight_kg != null ? " · " : ""}{product.package_weight_kg != null ? `${numberText(product.package_weight_kg)} كجم/عبوة` : ""}</small>}
  </div>;
}

function SpecificationRow({ row, index }: { row: OrderDetailProduction; index: number }) {
  const product = row.product;
  const itemName = product?.item?.name_ar || product?.item?.name || product?.category?.name_ar || product?.category?.name || "—";
  const color = product?.color;
  const printColors = [...(product?.front_print_colors ?? []), ...(product?.back_print_colors ?? [])].filter(Boolean);
  const notes = [product?.notes, product?.cliche_front_design ? `تصميم أمامي: ${product.cliche_front_design}` : "", product?.cliche_back_design ? `تصميم خلفي: ${product.cliche_back_design}` : ""].filter(Boolean);
  return <tr className="opp-spec-row">
    <td className="opp-row-number">{index + 1}</td>
    <td className="opp-item-cell">
      <strong>{itemName}</strong>
      <small>{product?.item?.code || product?.category?.code || safeText(row.production_order_number)}</small>
      <small>الحالة: {productionStatusLabel(row.status)} · السابقة: {productionStatusLabel(row.previous_status)}</small>
      <small>تشغيلة: {safeText(row.batch_number)} · {formatOrderDate(row.created_at)}</small>
    </td>
    <td dir="ltr">{product ? sizeText(product) : "—"}</td>
    <td dir="ltr">{product?.cutting_length_cm == null ? "—" : `${numberText(product.cutting_length_cm)} cm`}</td>
    <td dir="ltr">{product?.universal_thickness == null ? "—" : `${numberText(product.universal_thickness)} MIC`}</td>
    <td>{safeText(product?.raw_material)}</td>
    <td>
      <div className="opp-color-cell">
        <span className="opp-color-swatch" style={{ backgroundColor: color?.color_hex || "transparent" }} aria-label={color?.name_ar || "لون غير محدد"} />
        <strong>{color?.name_ar || color?.name || "—"}</strong>
        {color?.id && <small dir="ltr">#{color.id}</small>}
        {color?.brand && <small>{color.brand}</small>}
        {!!printColors.length && <small className="opp-print-colors">ألوان الطباعة: {printColors.join("، ")}</small>}
      </div>
    </td>
    <td>{product?.is_printed == null ? "—" : product.is_printed ? "نعم / Yes" : "لا / No"}</td>
    <td dir="ltr">{product?.printing_cylinder ? `${product.printing_cylinder.replace(/["″]+$/, "")}″` : "—"}</td>
    <td>{product?.punching ? <PunchingIcon type={product.punching} /> : "—"}</td>
    <td>{product ? productionQuantity(row, product) : <span>{numberText(row.quantity_kg)} kg<br />مطلوب<br />{numberText(row.final_quantity_kg)} kg<br />مخطط</span>}</td>
    <td className="opp-notes">{notes.length ? notes.join(" · ") : "—"}</td>
  </tr>;
}

export default function OrderPrintSheet({ data, branding }: { data: OrderDetails; branding: BrandingSnapshot }) {
  const { order, customer, production_orders: productionOrders, totals, creator, sales_representative } = data;
  const qrValue = typeof window === "undefined" ? "" : `${window.location.origin}/orders?tab=orders&viewOrder=${encodeURIComponent(String(order.id))}`;
  const rep = personName(sales_representative);
  const customerName = customer?.name_ar || customer?.name || "—";
  return <article className="opp-sheet" dir="rtl" lang="ar">
    <header className="opp-sheet-header">
      <div className="opp-brand">
        {branding.logoSrc ? <img className="opp-logo" src={branding.logoSrc} alt={`شعار ${branding.companyNameAr}`} /> : <div className="opp-logo-fallback" aria-hidden="true"><span>{branding.companyNameAr.slice(0, 2)}</span></div>}
        <div className="opp-brand-names"><h1>{branding.companyNameAr || "—"}</h1><p dir="ltr">{branding.companyNameEn || "—"}</p></div>
      </div>
      <div className="opp-document-title"><h2>أمر تشغيل إنتاج</h2><span>PRODUCTION ORDER</span></div>
      <div className="opp-order-id">
        <div><b>رقم الطلب:</b> <span dir="auto">{safeText(order.order_number)}</span></div>
        <div><b>التاريخ:</b> <span>{formatOrderDate(order.created_at)}</span></div>
        <div><b>التسليم:</b> <span>{formatOrderDate(order.delivery_date)}</span></div>
        <div><b>مدة التسليم:</b> <span>{order.delivery_days == null ? "—" : `${order.delivery_days} يوم`}</span></div>
      </div>
      {qrValue && <QRCode className="opp-qr" value={qrValue} size={74} level="M" title="رابط الطلب داخل النظام" />}
    </header>

    <table className="opp-overview" aria-label="ملخص أمر الإنتاج"><tbody><tr>
      <th>{bilingual("العميل", "Customer")}</th>
      <td className="opp-customer-cell"><strong>{customerName}</strong><span>{customer?.name_ar && customer.name ? customer.name : "—"}</span><small>{customer?.code ? `#${customer.code}` : customer?.phone || "—"}</small></td>
      <th>{bilingual("الدرج", "Drawer")}</th><td>{safeText(customer?.plate_drawer_code)}</td>
      <th>{bilingual("المندوب", "Sales Rep")}</th><td>{rep}</td>
      <th>{bilingual("الحالة", "Status")}</th><td>{orderStatusLabel(order.status)}</td>
      <th className="opp-total-head">{bilingual("الإجمالي", "Total")}</th>
       <td className="opp-total-cell"><strong>{numberText(totals.requested_kg)} كجم</strong><small>مطلوب / Requested</small><strong>{numberText(totals.planned_kg)} كجم</strong><small>مخطط / Planned</small></td>
    </tr></tbody></table>

    {order.previous_status && <p className="opp-previous-status">الحالة السابقة للطلب: <strong>{orderStatusLabel(order.previous_status)}</strong></p>}
    {order.notes && <div className="opp-order-notes"><strong>ملاحظات الطلب:</strong> {order.notes}</div>}
    {data.actual_production.available === false && <div className="opp-production-disclaimer">{data.actual_production.message} الكميات أدناه مطلوبة ومخططة وليست سجلاً للإنتاج المنفذ.</div>}

    <table className="opp-spec-table" aria-label="مواصفات أوامر الإنتاج">
      <colgroup><col style={{ width: "2.5%" }} /><col style={{ width: "13.5%" }} /><col style={{ width: "8%" }} /><col style={{ width: "5.5%" }} /><col style={{ width: "5.5%" }} /><col style={{ width: "7%" }} /><col style={{ width: "9%" }} /><col style={{ width: "5%" }} /><col style={{ width: "6%" }} /><col style={{ width: "6%" }} /><col style={{ width: "12%" }} /><col style={{ width: "20%" }} /></colgroup>
      <thead><tr>
        <th>{bilingual("#", "#")}</th><th>{bilingual("الصنف", "Item")}</th><th>{bilingual("المقاس / الواجهات", "Size / Facings")}</th>
        <th>{bilingual("طول القص", "Cut length")}</th><th>{bilingual("السماكة العامة", "Thickness · MIC")}</th>
        <th>{bilingual("المادة", "Material")}</th><th>{bilingual("اللون", "Color")}</th><th>{bilingual("الطباعة", "Printed")}</th>
        <th>{bilingual("السلندر", "Cylinder")}</th><th>{bilingual("التخريم", "Punching")}</th>
        <th>{bilingual("الكمية", "Quantity")}</th><th>{bilingual("ملاحظات", "Notes")}</th>
      </tr></thead>
      <tbody>{productionOrders.map((row, index) => <SpecificationRow key={`${row.id}-${index}`} row={row} index={index} />)}
        {productionOrders.length === 0 && <tr><td className="opp-no-rows" colSpan={12}>لا توجد أوامر إنتاج مرتبطة بهذا الطلب.</td></tr>}
      </tbody>
    </table>

    <section className="opp-signatures" aria-label="التوقيعات">
      <div><strong>المدير / Manager</strong><span /></div>
      <div><strong>تم الاعتماد بواسطة / Approved By</strong><span /></div>
      <div><strong>تم الإنشاء بواسطة / Created By</strong><b>{personName(creator)}</b><span /></div>
    </section>
    <footer className="opp-generated">SYSTEM GENERATED <span>·</span> {new Intl.DateTimeFormat("en-GB", { dateStyle: "short", timeStyle: "medium", timeZone: "Asia/Riyadh" }).format(new Date())}</footer>
  </article>;
}