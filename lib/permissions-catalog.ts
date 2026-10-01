/**
 * Keys de ação e defaults por perfil (espelha PermissionCatalog da API).
 * Menus usam `menu.{id}` a partir de dashboard-menu-items.
 */

export const STAFF_ROLES = [
  "ADMIN",
  "ADMINISTRATIVO",
  "CORRETOR",
  "IMOBILIARIA",
  "ATENDIMENTO",
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export const ACTION_KEYS = {
  contratosEdit: "action.contratos.edit",
  contratosCriar: "action.contratos.criar",
  contratosLegado: "action.contratos.legado",
  contratosExtratoAnual: "action.contratos.extrato_anual",
  contratosAditivo: "action.contratos.aditivo",
  contratosRenegociacao: "action.contratos.renegociacao",
  imoveisManage: "action.imoveis.manage",
  titulosCancelarPago: "action.titulos.cancelar_pago",
  chamadosAccess: "action.chamados.access",
  indicesSync: "action.indices.sync",
} as const;

/** Defaults de ações por role (sem menu — menus usam roles[] até a matriz carregar). */
const ACTION_DEFAULTS: Record<string, StaffRole[]> = {
  [ACTION_KEYS.contratosEdit]: ["ADMIN", "ADMINISTRATIVO"],
  [ACTION_KEYS.contratosCriar]: ["ADMIN", "CORRETOR", "IMOBILIARIA"],
  [ACTION_KEYS.contratosLegado]: ["ADMIN", "ADMINISTRATIVO"],
  [ACTION_KEYS.contratosExtratoAnual]: ["ADMIN", "ADMINISTRATIVO"],
  [ACTION_KEYS.contratosAditivo]: ["ADMIN", "ATENDIMENTO", "ADMINISTRATIVO"],
  [ACTION_KEYS.contratosRenegociacao]: ["ADMIN", "ATENDIMENTO", "ADMINISTRATIVO"],
  [ACTION_KEYS.imoveisManage]: ["ADMIN", "ADMINISTRATIVO"],
  [ACTION_KEYS.titulosCancelarPago]: ["ADMIN", "ADMINISTRATIVO"],
  [ACTION_KEYS.chamadosAccess]: ["ADMIN", "ADMINISTRATIVO"],
  [ACTION_KEYS.indicesSync]: ["ADMIN"],
};

export function menuPermissionKey(menuId: string): string {
  return `menu.${menuId}`;
}

export function defaultActionGranted(key: string, role: string | null): boolean {
  if (!role) return false;
  if (role === "ADMIN") return true;
  const roles = ACTION_DEFAULTS[key];
  return Boolean(roles?.includes(role as StaffRole));
}
