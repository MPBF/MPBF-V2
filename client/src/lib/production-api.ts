import i18n from "../i18n";
import type { FilmInput, ProductionRollRecord, ProductionState, ReceiptInput } from "../../../shared/production";

export type ProductionRollLabel = {
  roll: ProductionRollRecord;
  qr: { url: string; image: string };
};

export async function productionRequest<T>(path: string, body?: unknown, method = "POST"): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/production${path}`, {
      credentials: "include", method: body === undefined ? "GET" : method,
      headers: { "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new Error(i18n.language === "en" ? "Connection interrupted. Retry the same operation; do not enter it again." : "انقطع الاتصال. أعد محاولة العملية نفسها؛ لا تسجلها من جديد.");
  }
  const data = await response.json();
  if (!response.ok) throw new Error(i18n.language === "en" ? data.message_en || "The operation could not be completed." : data.message || "تعذر إكمال العملية.");
  return data;
}
export const productionApi = {
  state: () => productionRequest<ProductionState>("/state"),
  roll: (id: string | number) => productionRequest<ProductionState["rolls"][number]>(`/rolls/${encodeURIComponent(id)}`),
  qr: (id: number) => productionRequest<{ url: string; image: string }>(`/rolls/${id}/qr`),
  labels: (rollIds: number[]) => productionRequest<{ labels: ProductionRollLabel[] }>("/labels", { roll_ids: rollIds }),
  start: (id: number, request_id: string) => productionRequest(`/orders/${id}/start`, { request_id }),
  film: (id: number, input: FilmInput) => productionRequest(`/orders/${id}/rolls`, input),
  closeFilm: (id: number, request_id: string) => productionRequest(`/orders/${id}/close-film`, { request_id }),
  print: (id: number, machine_id: string, request_id: string) => productionRequest(`/rolls/${id}/print`, { machine_id, request_id }),
  cut: (id: number, machine_id: string, net_weight_kg: string, request_id: string) =>
    productionRequest(`/rolls/${id}/cut`, { machine_id, net_weight_kg, request_id }),
  queue: (production_order_id: number, stage: string, machine_id: string, position: number, request_id: string) =>
    productionRequest("/queues", { production_order_id, stage, machine_id, position, request_id }),
  removeQueue: (id: number, request_id: string) => productionRequest(`/queues/${id}/remove`, { request_id }),
  reorderQueue: (first_id: number, second_id: number, first_position: number, second_position: number, request_id: string) =>
    productionRequest("/queues/reorder", { first_id, second_id, first_position, second_position, request_id }),
  receive: (input: ReceiptInput) => productionRequest("/receipts", input),
  location: (input: { name: string; name_ar: string; request_id: string; is_active?: boolean }, id?: number) =>
    productionRequest(id ? `/locations/${id}` : "/locations", input),
};