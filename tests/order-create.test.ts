import express from "express";
import { afterAll, beforeAll, describe, expect, it, jest } from "@jest/globals";
import { categories, customers, customer_products, orders, production_orders } from "../shared/schema";
import { deliveryDateFromDays, orderDateInRiyadh } from "../server/order-delivery";
import router from "../server/routes";
import { db } from "../server/db";

jest.mock("../server/db", () => ({ db: { transaction: jest.fn() } }));
jest.mock("../server/hr", () => ({ __esModule: true, default: express.Router() }));
jest.mock("../server/self-service", () => ({ __esModule: true, default: express.Router() }));
jest.mock("../server/auth", () => ({
  requireAnyPermission: (...permissions: string[]) => (req: any, res: any, next: any) => {
    if (!permissions.includes(req.headers["x-test-permission"])) return res.status(403).end();
    req.user = { id: 42 };
    next();
  },
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
  authenticate: (_req: any, _res: any, next: any) => next(),
  requireAuth: (_req: any, _res: any, next: any) => next(),
  resolveUser: jest.fn(),
  hashPassword: jest.fn(),
}));

describe("creating an order with delivery days", () => {
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

  it.each([0, 5, 10, 20])("assigns order identifiers and snapshots category rate %s%%", async (percentage) => {
    const tx = {
      execute: async () => ({ rows: [{ max_number: "19" }] }),
      select: () => ({
        from: (table: unknown) => ({
          where: () => {
            const query = {
              limit: async () => table === customers ? [{ id: "C1" }] :
                table === customer_products ? [{ id: 3, category_id: "CAT1" }] :
                  table === categories ? [{ id: "CAT1", overrun_percentage: percentage }] : [],
            };
            return { ...query, for: () => query };
          },
        }),
      }),
      insert: (table: unknown) => ({
        values: (values: Record<string, unknown>) => ({
          returning: async () => [{ id: table === orders ? 7 : 11, ...values }],
        }),
      }),
    };
    jest.mocked(db.transaction).mockImplementation(async (callback: any) => callback(tx) as any);
    const response = await fetch(`${url}/api/orders/with-items`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-permission": "manage_orders" },
      body: JSON.stringify({ customer_id: "C1", delivery_days: 20, items: [{ customer_product_id: 3, quantity_kg: "10.00" }] }),
    });
    expect(response.status).toBe(201);
    const result = await response.json();
    expect(result.order.order_number).toBe("000020");
    expect(result.order.delivery_days).toBe(20);
    expect(result.order.delivery_date).toBe(deliveryDateFromDays(orderDateInRiyadh(new Date(result.order.created_at)), 20));
    expect(result.production_orders[0].production_order_number).toBe("000020-01");
    expect(result.production_orders[0]).toMatchObject({
      quantity_kg: "10.00", overrun_percentage: String(percentage),
      final_quantity_kg: (10 * (1 + percentage / 100)).toFixed(2),
    });
  });
});