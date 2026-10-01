/**
 * Helpers síncronos de permissão (sem React) — evita ciclo auth-storage ↔ context.
 */
import { getUserRole } from "@/lib/auth-storage";
import { defaultActionGranted, menuPermissionKey } from "@/lib/permissions-catalog";
import { hasPermissionKey } from "@/lib/permissions-store";

export function checkPermission(key: string, role?: string | null): boolean {
  const r = role ?? getUserRole();
  if (r === "ADMIN") return true;
  const fromStore = hasPermissionKey(key);
  if (fromStore != null) return fromStore;
  if (key.startsWith("action.")) return defaultActionGranted(key, r);
  return false;
}

/** `null` = matriz ainda não carregada (usar roles[] legado). */
export function checkMenuPermission(menuId: string, role?: string | null): boolean | null {
  const r = role ?? getUserRole();
  if (r === "ADMIN") return true;
  return hasPermissionKey(menuPermissionKey(menuId));
}
