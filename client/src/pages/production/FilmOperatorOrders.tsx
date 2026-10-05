import { ChevronDown, Factory, Gauge, Layers3, Palette, Plus, Ruler, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import MasterBatchSwatch from "../../components/MasterBatchSwatch";
import { filmOperationSpecs, filmRemainingQuantity, filmSearchTerm, safeFilmName as englishSafe } from "../../lib/film-operation-specs";

import type { ProductionOrderRecord } from "../../../../shared/production";

type Props = {
  orders: ProductionOrderRecord[];
  readyIds: Set<number>;
  language: string;
  canOperate: boolean;
  saving: boolean;
  selectedMachine: string;
  weights: Record<number, string>;
  last: Record<number, boolean>;
  inline: Record<number, boolean>;
  inlinePrinterAvailable: boolean;
  text: (key: string) => string;
  number: (value: string | number | null | undefined, digits?: number) => string;
  productName: (order: ProductionOrderRecord) => string;
  onWeight: (id: number, value: string) => void;
  onLast: (id: number, value: boolean) => void;
  onInline: (id: number, value: boolean) => void;
  onRecord: (order: ProductionOrderRecord) => void;
  onStart: (order: ProductionOrderRecord) => void;
};

export default function FilmOperatorOrders(props: Props) {
  const {
    orders, readyIds, language, canOperate, saving, selectedMachine, weights, last, inline,
    inlinePrinterAvailable, text, number, productName, onWeight, onLast, onInline, onRecord, onStart,
  } = props;
  const [search, setSearch] = useState("");
  const [openOrderId, setOpenOrderId] = useState<number | null | undefined>(undefined);
  const groups = useMemo(() => {
    const map = new Map<number, { orderId: number; orderNumber: string; customerName: string; members: ProductionOrderRecord[] }>();
    for (const order of orders) {
      let group = map.get(order.order_id);
      if (!group) {
        const customer = order.product?.customer_name_ar;
        const customerEn = order.product?.customer_name;
        group = {
          orderId: order.order_id,
          orderNumber: order.order_number,
          customerName: englishSafe(language === "en" ? customerEn : customer || customerEn, language, text("unrecorded")),
          members: [],
        };
        map.set(order.order_id, group);
      }
      group.members.push(order);
    }
    const term = filmSearchTerm(search);
    return [...map.values()].map(group => {
      const groupMatches = !term || filmSearchTerm(`${group.customerName} ${group.orderNumber}`).includes(term);
      const members = groupMatches ? group.members : group.members.filter(order => filmSearchTerm(order.production_order_number).includes(term));
      return { ...group, members };
    }).filter(group => group.members.length > 0);
  }, [orders, language, search, text]);

  const visibleOpenId = openOrderId === undefined
    ? groups[0]?.orderId ?? null
    : openOrderId === null
      ? null
      : groups.some(group => group.orderId === openOrderId) ? openOrderId : groups[0]?.orderId ?? null;
  useEffect(() => {
    if (openOrderId === undefined) {
      if (groups.length) setOpenOrderId(groups[0].orderId);
      return;
    }
    if (openOrderId !== null && !groups.some(group => group.orderId === openOrderId)) {
      setOpenOrderId(groups[0]?.orderId ?? null);
    }
  }, [groups, openOrderId]);

  return <section className="film-operator" aria-label={text("film")}>
    <label className="film-search">
      <Search aria-hidden="true" />
      <span className="sr-only">{language === "en" ? "Search customer order or production number" : "البحث باسم العميل أو رقم الطلب"}</span>
      <input
        type="search"
        value={search}
        onChange={event => setSearch(event.target.value)}
        data-film-search
        aria-label={language === "en" ? "Search by customer name, customer order number, or production order number" : "البحث باسم العميل أو رقم طلب العميل أو أمر الإنتاج"}
        placeholder={language === "en" ? "Customer, order or production no." : "العميل أو رقم الطلب أو أمر الإنتاج"}
      />
    </label>
    {groups.length ? <div className="film-order-groups">
      {groups.map(group => {
        const expanded = visibleOpenId === group.orderId;
        const buttonId = `film-order-toggle-${group.orderId}`;
        const panelId = `film-order-panel-${group.orderId}`;
        return <section className="film-order-group" key={group.orderId}>
          <button
            id={buttonId}
            type="button"
            className="film-order-disclosure"
            data-film-order-id={group.orderId}
            aria-expanded={expanded}
            aria-controls={panelId}
            onClick={() => setOpenOrderId(expanded ? null : group.orderId)}
          >
            <span className="film-group-customer">
              <strong className="prod-number">{group.orderNumber}</strong>
              <span>{group.customerName}</span>
            </span>
            <span className="film-group-count">{number(group.members.length, 0)} <span>{text("ordersUnit")}</span></span>
            <ChevronDown aria-hidden="true" className={expanded ? "is-open" : ""} />
          </button>
          <div className="film-group-content" id={panelId} role="region" aria-labelledby={buttonId} hidden={!expanded}>
            {expanded && <>
            {group.members.map(order => {
              const isReady = readyIds.has(order.id);
              const spec = filmOperationSpecs(order.product, language, number, text("unrecorded"));
              return <article
                className={`film-production-order${isReady ? " prod-film-ready" : ""}`}
                key={order.id}
                data-production-order-id={order.id}
                {...(isReady ? { "data-film-state": "ready" } : {})}
              >
                <header className="film-order-identity">
                  <div>
                    <h3 className="prod-number">{order.production_order_number}</h3>
                    <p>{productName(order)}</p>
                  </div>
                  {isReady && <span className="film-ready-label"><span aria-hidden="true" />{text("ready")}</span>}
                </header>
                <div className="film-spec-grid">
                  <div className="film-spec"><Ruler aria-hidden="true" /><span>{language === "en" ? "Size" : "المقاس"}</span><strong><bdi dir="auto">{spec.size}</bdi></strong></div>
                  <div className="film-spec"><Layers3 aria-hidden="true" /><span>{language === "en" ? "Raw material" : "الخامة"}</span><strong><bdi dir="auto">{spec.material}</bdi></strong></div>
                  <div className="film-spec film-color-spec"><Palette aria-hidden="true" /><span>{language === "en" ? "Film color" : "لون الفيلم"}</span><strong><bdi dir="auto">{spec.batchName}</bdi></strong>{spec.batch && <MasterBatchSwatch color={spec.batch} size={25} label={spec.batchName} />}</div>
                  <div className="film-spec"><Gauge aria-hidden="true" /><span>{language === "en" ? "Thickness" : "السماكة"}</span><strong><bdi dir="auto">{spec.thickness}</bdi></strong></div>
                </div>
                <div className="film-order-metrics">
                  <div><span>{language === "en" ? "Quantity" : "الكمية"}</span><strong><bdi dir="ltr">{number(order.final_quantity_kg)} kg</bdi></strong></div>
                  {!isReady && <div><span>{language === "en" ? "Remaining" : "المتبقي"}</span><strong><bdi dir="ltr">{number(filmRemainingQuantity(order.final_quantity_kg, order.produced_kg))} kg</bdi></strong></div>}
                  {!isReady && <div><span>{text("rolls")}</span><strong>{number(order.roll_count ?? 0, 0)}</strong></div>}
                </div>
                {isReady ? <>
                  {canOperate && <button className="prod-btn prod-start-film" data-prod-start-film disabled={saving} onClick={() => onStart(order)}><Factory />{text("start")}</button>}
                </> : <div className="film-roll-entry">
                  <div className="prod-field film-weight-field">
                    <label htmlFor={`weight-${order.id}`}>{language === "en" ? "Roll weight (kg)" : "وزن الرول (كجم)"}</label>
                    <input id={`weight-${order.id}`} disabled={!canOperate} inputMode="decimal" min="0.01" step="0.01" type="number" value={weights[order.id] ?? ""} onChange={event => onWeight(order.id, event.target.value)} />
                  </div>
                  {order.is_printed && inlinePrinterAvailable && <label className="prod-label-inline"><input type="checkbox" disabled={!canOperate} checked={!!inline[order.id]} onChange={event => onInline(order.id, event.target.checked)} />{text("inline")}</label>}
                  <label className="prod-label-inline film-last-roll"><input type="checkbox" disabled={!canOperate} checked={!!last[order.id]} onChange={event => onLast(order.id, event.target.checked)} />{language === "en" ? "Final roll" : "آخر رول"}</label>
                  <button className="prod-btn" disabled={!canOperate || saving || !selectedMachine} onClick={() => onRecord(order)}><Plus />{text("addRoll")}</button>
                </div>}
              </article>;
            })}
            </>}
          </div>
        </section>;
      })}
    </div> : <div className="prod-empty film-no-results"><strong>{search ? (language === "en" ? "No matching orders" : "لا توجد أوامر مطابقة") : text("noEligible")}</strong>{search && <span>{language === "en" ? "Try a customer or order number." : "جرّب البحث باسم العميل أو رقم الطلب."}</span>}</div>}
  </section>;
}
