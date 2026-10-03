import { hasProductionPermission, isPlasticRoll, productionPermissions, type ProductionState, type ProductionUser, type ProductionRollRecord } from "../../shared/production";
import { one, permission, rows, type ConnectionPool, type Connection } from "./core";

// Execution snapshots are frozen at start. Unstarted plans use current product data.
const liveProduct = `jsonb_build_object('id',cp.id,'item_id',cp.item_id,'name',i.name,'name_ar',i.name_ar,
  'customer_name',c.name,'customer_name_ar',c.name_ar,'width',cp.width::text,
  'left_facing',cp.left_facing::text,'right_facing',cp.right_facing::text,
  'universal_thickness',cp.universal_thickness::text,'cutting_length_cm',cp.cutting_length_cm,
  'raw_material',cp.raw_material,'printing_cylinder',cp.printing_cylinder,'punching',cp.punching,
  'notes',cp.notes,'front_print_colors',cp.front_print_colors,'back_print_colors',cp.back_print_colors)`;
const rollSelect = `SELECT r.*,p.production_order_number,p.batch_number,p.status production_order_status,
  o.order_number,o.status order_status,e.stage production_stage,e.product,e.is_printed,e.is_roll_product
  FROM factory_rolls r JOIN production_orders p ON p.id=r.production_order_id
  JOIN orders o ON o.id=p.order_id
  JOIN factory_execution e ON e.production_order_id=r.production_order_id`;

export class ProductionReadService {
  constructor(readonly pool: ConnectionPool) {}
  async state(actor: ProductionUser): Promise<ProductionState> {
    permission(actor, ...productionPermissions);
    const production = hasProductionPermission(actor, "view_production", "manage_production", "operate_film", "operate_printing", "operate_cutting");
    const hall = hasProductionPermission(actor, "view_production_hall", "receive_production");
    const warehouse = hasProductionPermission(actor, "view_finished_inventory", "manage_finished_warehouse", "receive_production");
    const tx = await this.pool.connect();
    try {
      await tx.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
      const state: ProductionState = { orders: [], rolls: [], queues: [], machines: [], locations: [], inventory: [], movements: [], receipts: [] };
      if (production || hall) state.orders = await rows(tx, `SELECT p.id,p.order_id,p.production_order_number,p.customer_product_id,
        p.quantity_kg,p.final_quantity_kg,p.status,p.batch_number,o.order_number,o.status order_status,
        CASE WHEN cp.id IS NULL THEN e.product ELSE COALESCE(e.product,${liveProduct}) END product,
        e.started_at,e.film_closed_at,e.completed_at,e.stage,COALESCE(e.is_printed,cp.is_printed,false) is_printed,
        COALESCE(e.is_roll_product,false) is_roll_product,
        COALESCE(r.produced,0)::text produced_kg,COALESCE(r.ready,0)::text ready_kg,COALESCE(r.waste,0)::text waste_kg,
        COALESCE(received.quantity,0)::text received_kg,(COALESCE(r.ready,0)-COALESCE(received.quantity,0))::text remaining_kg
        FROM production_orders p JOIN orders o ON o.id=p.order_id LEFT JOIN factory_execution e ON e.production_order_id=p.id
        LEFT JOIN customer_products cp ON cp.id=p.customer_product_id LEFT JOIN items i ON i.id=cp.item_id
        LEFT JOIN customers c ON c.id=o.customer_id
        LEFT JOIN LATERAL (SELECT sum(weight_kg) produced,sum(waste_kg) waste,
          sum(CASE WHEN stage='done' THEN CASE WHEN e.is_roll_product THEN weight_kg ELSE net_weight_kg END ELSE 0 END) ready
          FROM factory_rolls WHERE production_order_id=p.id) r ON true
        LEFT JOIN LATERAL (SELECT sum(quantity_kg) quantity FROM factory_receipt_items WHERE production_order_id=p.id) received ON true
        ${!production ? "WHERE e.production_order_id IS NOT NULL AND COALESCE(r.ready,0)-COALESCE(received.quantity,0)>0" : ""}
        ORDER BY p.id DESC`);
      state.orders.forEach(order => {
        if (!order.started_at) order.is_roll_product = isPlasticRoll(order.product?.name ?? null, order.product?.name_ar ?? null);
      });
      if (production) {
        state.rolls = await rows(tx, `${rollSelect} ORDER BY r.id DESC`);
        state.queues = await rows(tx, "SELECT * FROM factory_queues ORDER BY stage,machine_id,position,id");
        state.machines = await rows(tx, `SELECT id,name,name_ar,type,status,inline_printer_id,min_thickness,max_thickness,min_width_cm,max_width_cm FROM machines ORDER BY id`);
      }
      if (warehouse || hall) state.locations = await rows(tx, "SELECT * FROM factory_locations ORDER BY id");
      if (warehouse) {
        state.receipts = await rows(tx, `SELECT r.*,COALESCE(jsonb_agg(to_jsonb(ri)||jsonb_build_object(
            'production_order_number',p.production_order_number,'location_name',l.name,'location_name_ar',l.name_ar)
            ORDER BY ri.id) FILTER(WHERE ri.id IS NOT NULL),'[]'::jsonb) items
          FROM factory_receipts r LEFT JOIN factory_receipt_items ri ON ri.receipt_id=r.id
          LEFT JOIN production_orders p ON p.id=ri.production_order_id LEFT JOIN factory_locations l ON l.id=ri.location_id
          GROUP BY r.id ORDER BY r.id DESC`);
        state.inventory = await rows(tx, `SELECT inv.*,p.production_order_number,p.batch_number,p.status production_order_status,e.product,
          l.name location_name,l.name_ar location_name_ar FROM factory_inventory inv
          JOIN factory_execution e ON e.production_order_id=inv.production_order_id
          JOIN production_orders p ON p.id=inv.production_order_id JOIN factory_locations l ON l.id=inv.location_id ORDER BY inv.id DESC`);
        state.movements = await rows(tx, `SELECT m.*,r.voucher_number,ri.production_order_id,ri.location_id,p.production_order_number
          FROM factory_movements m JOIN factory_receipts r ON r.id=m.receipt_id
          JOIN factory_receipt_items ri ON ri.id=m.receipt_item_id
          JOIN production_orders p ON p.id=ri.production_order_id ORDER BY m.id DESC`);
      }
      await tx.query("COMMIT");
      return state;
    } catch (error) {
      await tx.query("ROLLBACK").catch(() => {});
      throw error;
    } finally { tx.release(); }
  }
  async roll(actor: ProductionUser, id: number): Promise<ProductionRollRecord> {
    permission(actor, ...productionPermissions);
    return this.read(tx => one(tx, `${rollSelect} WHERE r.id=$1`, [id]));
  }
  private async read<T>(action: (tx: Connection) => Promise<T>) {
    const tx = await this.pool.connect();
    try { return await action(tx); } finally { tx.release(); }
  }
}