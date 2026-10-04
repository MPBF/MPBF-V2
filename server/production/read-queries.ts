// Select the order IDs first; expensive JSON projection and indexed totals only
// run for work-list candidates or the requested history page.
export const liveProduct = `jsonb_build_object('id',cp.id,'item_id',cp.item_id,'name',i.name,'name_ar',i.name_ar,
  'customer_name',c.name,'customer_name_ar',c.name_ar,'width',cp.width::text,
  'left_facing',cp.left_facing::text,'right_facing',cp.right_facing::text,
  'universal_thickness',cp.universal_thickness::text,'cutting_length_cm',cp.cutting_length_cm,
  'raw_material',cp.raw_material,'printing_cylinder',cp.printing_cylinder,'punching',cp.punching,
  'notes',cp.notes,'front_print_colors',cp.front_print_colors,'back_print_colors',cp.back_print_colors)`;
export const orderSelect = `SELECT p.id,p.order_id,p.production_order_number,p.customer_product_id,
  p.quantity_kg,p.final_quantity_kg,p.status,p.batch_number,o.order_number,o.status order_status,
  CASE WHEN cp.id IS NULL THEN e.product ELSE COALESCE(e.product,${liveProduct}) END product,
  e.started_at,e.film_closed_at,e.completed_at,e.stage,COALESCE(e.is_printed,cp.is_printed,false) is_printed,
  COALESCE(e.is_roll_product,false) is_roll_product,
  COALESCE(r.produced,0)::text produced_kg,COALESCE(r.ready,0)::text ready_kg,COALESCE(r.waste,0)::text waste_kg,
  COALESCE(r.roll_count,0)::int roll_count,
  COALESCE(received.quantity,0)::text received_kg,(COALESCE(r.ready,0)-COALESCE(received.quantity,0))::text remaining_kg
  FROM selected s JOIN production_orders p ON p.id=s.id JOIN orders o ON o.id=p.order_id
  LEFT JOIN factory_execution e ON e.production_order_id=p.id
  LEFT JOIN customer_products cp ON cp.id=p.customer_product_id LEFT JOIN items i ON i.id=cp.item_id
  LEFT JOIN customers c ON c.id=o.customer_id
  LEFT JOIN LATERAL (SELECT sum(weight_kg) produced,sum(waste_kg) waste,count(*) roll_count,
    sum(CASE WHEN stage='done' THEN CASE WHEN e.is_roll_product THEN weight_kg ELSE net_weight_kg END ELSE 0 END) ready
    FROM factory_rolls WHERE production_order_id=p.id) r ON true
  LEFT JOIN LATERAL (SELECT sum(quantity_kg) quantity FROM factory_receipt_items WHERE production_order_id=p.id) received ON true
  ORDER BY p.id DESC`;
export const rollSelect = `SELECT r.*,p.production_order_number,p.batch_number,p.status production_order_status,
  o.order_number,o.status order_status,e.stage production_stage,e.product,e.is_printed,e.is_roll_product
  FROM factory_rolls r JOIN production_orders p ON p.id=r.production_order_id
  JOIN orders o ON o.id=p.order_id JOIN factory_execution e ON e.production_order_id=r.production_order_id`;
export const receiptSelect = `SELECT r.*,COALESCE((SELECT jsonb_agg(to_jsonb(ri)||jsonb_build_object(
  'production_order_number',p.production_order_number,'location_name',l.name,'location_name_ar',l.name_ar) ORDER BY ri.id)
  FROM factory_receipt_items ri JOIN production_orders p ON p.id=ri.production_order_id
  JOIN factory_locations l ON l.id=ri.location_id WHERE ri.receipt_id=r.id),'[]'::jsonb) items
  FROM factory_receipts r`;
export const inventorySelect = `SELECT inv.*,p.production_order_number,p.batch_number,p.status production_order_status,e.product,
  l.name location_name,l.name_ar location_name_ar FROM factory_inventory inv
  JOIN factory_execution e ON e.production_order_id=inv.production_order_id
  JOIN production_orders p ON p.id=inv.production_order_id JOIN factory_locations l ON l.id=inv.location_id`;
export const movementSelect = `SELECT m.*,r.voucher_number,ri.production_order_id,ri.location_id,p.production_order_number
  FROM factory_movements m JOIN factory_receipts r ON r.id=m.receipt_id
  JOIN factory_receipt_items ri ON ri.id=m.receipt_item_id JOIN production_orders p ON p.id=ri.production_order_id`;