import { hasProductionPermission, type ProductionUser } from "../../../shared/production";

export function initialProductionPath(user: ProductionUser): string | null {
  if (hasProductionPermission(user, "view_production", "manage_production")) return "/production";
  if (hasProductionPermission(user, "operate_film")) return "/production/film";
  if (hasProductionPermission(user, "operate_printing")) return "/production/printing";
  if (hasProductionPermission(user, "operate_cutting")) return "/production/cutting";
  if (hasProductionPermission(user, "view_production_hall", "receive_production")) return "/production/hall";
  if (hasProductionPermission(user, "view_finished_inventory", "manage_finished_warehouse")) return "/production/warehouse";
  return null;
}