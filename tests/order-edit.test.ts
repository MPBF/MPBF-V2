import express from "express";
import { afterAll, beforeAll, describe, expect, it, jest } from "@jest/globals";
import { orders, production_orders, customer_products } from "../shared/schema";
import router from "../server/routes";
import { db } from "../server/db";

jest.mock("../server/db", () => ({ db: { transaction: jest.fn() } }));
jest.mock("../server/hr", () => ({ __esModule: true, default: express.Router() }));
jest.mock("../server/self-service", () => ({ __esModule: true, default: express.Router() }));
jest.mock("../server/auth", () => ({
  requireAnyPermission: (...permissions: string[]) => (req: any, res: any, next: any) =>
    permissions.includes(req.headers["x-test-permission"]) ? next() : res.status(403).json({ message: "Forbidden" }),
  requirePermission: (permission: string) => (req: any, res: any, next: any) =>
    permission === req.headers["x-test-permission"] ? next() : res.status(403).json({ message: "Forbidden" }),
  authenticate: (_req: any, _res: any, next: any) => next(),
  requireAuth: (_req: any, _res: any, next: any) => next(),
  resolveUser: jest.fn(),
  hashPassword: jest.fn(),
}));

const baseOrder = { id: 7, order_number: "TEST-7", customer_id: "C1", status: "waiting", notes: null, delivery_date: null };
const baseLines = [
  { id: 11, order_id: 7, production_order_number: "TEST-7-01", customer_product_id: 1, quantity_kg: "10.00", final_quantity_kg: "10.00", status: "pending", batch_number: null },
  { id: 12, order_id: 7, production_order_number: "TEST-7-02", customer_product_id: 2, quantity_kg: "20.00", final_quantity_kg: "20.00", status: "pending", batch_number: null },
];

function fakeTransaction(state: { order: any; lines: any[] }, failInsert = false) {
  return async (callback: (tx: any) => Promise<any>) => {
    // Writes are private until callback succeeds, just as in a DB transaction.
    const draft = structuredClone(state);
    const tx = {
      select: () => ({
        from(table: unknown) {
          const rows = table === orders ? [draft.order] : table === production_orders ? [...draft.lines] : table === customer_products ? [{ id: 1 }, { id: 2 }, { id: 3 }] : [];
          const query: any = {
            where: () => query,
            orderBy: () => query,
            for: async () => rows,
            limit: async () => rows,
          };
          return query;
        },
      }),
      update: (table: unknown) => ({
        set(values: any) {
          return {
            where() {
              return {
                returning: async () => {
                  if (table === orders) Object.assign(draft.order, values);
                  else Object.assign(draft.lines[0], values);
                  return [table === orders ? draft.order : draft.lines[0]];
                },
              };
            },
          };
        },
      }),
      insert: (_table: unknown) => ({
        values: (_values: any) => ({
          returning: async () => {
            if (failInsert) throw new Error("simulated insert failure");
            const created = { id: 99, ..._values };
            draft.lines.push(created);
            return [created];
          },
        }),
      }),
      delete: (_table: unknown) => ({ where: async () => { draft.lines.splice(0, 1); } }),
    };
    const result = await callback(tx);
    state.order = draft.order;
    state.lines = draft.lines;
    return result;
  };
}

const original_items = baseLines.map(({ id, customer_product_id, quantity_kg }) => ({ id, customer_product_id, quantity_kg }));
const body = (items: any[]) => ({ status: "waiting", original_items, items });

describe("editing an order with production lines", () => {
  let server: ReturnType<ReturnType<typeof express>["listen"]>;
  let url: string;
  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use("/api", router);
    app.use((error: any, _req: any, res: any, _next: any) => res.status(error.status || 500).json({ message: error.message }));
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  });
  afterAll(async () => { await new Promise<void>((resolve) => server.close(() => resolve())); });
  const request = (items: any[], permission = "manage_orders") =>
    fetch(`${url}/api/orders/7/with-items`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-test-permission": permission },
      body: JSON.stringify(body(items)),
    });

  it("keeps the surviving production-order ID and creates a new numbered line", async () => {
    const state = { order: structuredClone(baseOrder), lines: structuredClone(baseLines) };
    jest.mocked(db.transaction).mockImplementation(fakeTransaction(state) as typeof db.transaction);
    const response = await request([
      { id: 12, customer_product_id: 2, quantity_kg: "20.00" },
      { customer_product_id: 3, quantity_kg: "5.00" },
    ]);
    expect(response.status).toBe(200);
    expect(state.lines.map((line) => line.id)).toEqual([12, 99]);
    expect(state.lines[1].production_order_number).toBe("TEST-7-03");
  });

  it("rolls back the metadata update and keeps both old lines if inserting a replacement fails", async () => {
    const state = { order: structuredClone(baseOrder), lines: structuredClone(baseLines) };
    jest.mocked(db.transaction).mockImplementation(fakeTransaction(state, true) as typeof db.transaction);
    const response = await request([
      { id: 12, customer_product_id: 2, quantity_kg: "20.00" },
      { customer_product_id: 3, quantity_kg: "5.00" },
    ]);
    expect(response.status).toBe(500);
    expect(state.lines).toEqual(baseLines);
    expect(state.order).toEqual(baseOrder);
  });

  it("rejects deletion of a line already in production without changing the order", async () => {
    const state = { order: structuredClone(baseOrder), lines: structuredClone(baseLines) };
    state.lines[0].status = "active";
    jest.mocked(db.transaction).mockImplementation(fakeTransaction(state) as typeof db.transaction);
    const response = await request([{ id: 12, customer_product_id: 2, quantity_kg: "20.00" }]);
    expect(response.status).toBe(409);
    expect(state.lines).toHaveLength(2);
  });

  it("rejects a stale edit instead of replacing a concurrently changed line", async () => {
    const state = { order: structuredClone(baseOrder), lines: structuredClone(baseLines) };
    state.lines[0].quantity_kg = "15.00";
    jest.mocked(db.transaction).mockImplementation(fakeTransaction(state) as typeof db.transaction);
    const response = await request(baseLines.map((line) => ({
      id: line.id, customer_product_id: line.customer_product_id, quantity_kg: line.quantity_kg,
    })));
    expect(response.status).toBe(409);
    expect(state.lines[0].quantity_kg).toBe("15.00");
  });

  it("requires order management permission", async () => {
    jest.mocked(db.transaction).mockClear();
    const response = await request([], "view_orders");
    expect(response.status).toBe(403);
    expect(db.transaction).not.toHaveBeenCalled();
  });
});