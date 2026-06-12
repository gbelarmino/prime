import { readPrimeEnv } from "@/lib/runtime-env";

/** Token JWT e Role do utilizador — SPA estática no Firebase. */
const TOKEN_KEY = "aires_auth_token";
const ROLE_KEY = "aires_auth_role";
const EMAIL_KEY = "aires_auth_email";
const TENANT_ID_KEY = "aires_tenant_id";
const TENANT_SLUG_KEY = "aires_tenant_slug";

/** Header enviado à API (Fase 0 multi-tenant). */
export const TENANT_HEADER = "X-Tenant-Id";

export const ADMIN_DASHBOARD_HOME = "/dashboard";
export const WELCOME_DASHBOARD_PATH = "/dashboard/inicio";
const ATENDIMENTO_PATH_PREFIX = "/dashboard/atendimento";
const FINANCEIRO_PATH_PREFIX = "/dashboard/financeiro";
const WHATSAPP_CONEXAO_PATH = "/dashboard/whatsapp/conexao";

/** Rotas permitidas ao perfil administrativo (back-office). */
const ADMINISTRATIVO_ALLOWED_PREFIXES = [
  WELCOME_DASHBOARD_PATH,
  "/dashboard/clientes",
  "/dashboard/imoveis",
  "/dashboard/contratos",
  ATENDIMENTO_PATH_PREFIX,
  FINANCEIRO_PATH_PREFIX,
  "/dashboard/whatsapp/fila",
  "/dashboard/email/fila",
] as const;

const CRM_PATH_PREFIX = "/dashboard/crm";

const ADMINISTRATIVO_BLOCKED_CONTRATOS = ["/dashboard/contratos/novo"] as const;

/** Token de demonstração — nunca aceite em produção. */
const DEMO_TOKEN = "demo-token";

/**
 * Bypass de auth do staff apenas em `npm run dev` com `NEXT_PUBLIC_SKIP_AUTH=true`.
 * Em build de produção (`output: export`) o bundle ignora SKIP_AUTH em runtime.
 */
export function isStaffDevAuthBypass(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    readPrimeEnv("NEXT_PUBLIC_SKIP_AUTH") === "true"
  );
}

/** @deprecated Use isStaffDevAuthBypass — mantido para compatibilidade local. */
export function isAuthCheckDisabled(): boolean {
  return isStaffDevAuthBypass();
}

function hasValidStaffToken(): boolean {
  const token = getAuthToken();
  return Boolean(token && token !== DEMO_TOKEN);
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getUserRole(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ROLE_KEY);
  } catch {
    return null;
  }
}

export function getTenantId(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(TENANT_ID_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function getTenantSlug(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TENANT_SLUG_KEY);
  } catch {
    return null;
  }
}

export function setAuthSession(
  token: string,
  role: string,
  email?: string,
  tenantId?: number | null,
  tenantSlug?: string | null,
): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ROLE_KEY, role);
  if (email) localStorage.setItem(EMAIL_KEY, email);
  if (tenantId != null) {
    localStorage.setItem(TENANT_ID_KEY, String(tenantId));
  } else {
    localStorage.removeItem(TENANT_ID_KEY);
  }
  if (tenantSlug) {
    localStorage.setItem(TENANT_SLUG_KEY, tenantSlug);
  } else {
    localStorage.removeItem(TENANT_SLUG_KEY);
  }
}

export function clearAuthSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(EMAIL_KEY);
  localStorage.removeItem(TENANT_ID_KEY);
  localStorage.removeItem(TENANT_SLUG_KEY);
}

export function isAuthenticated(): boolean {
  if (isStaffDevAuthBypass()) return true;
  return hasValidStaffToken();
}

export function isAdmin(): boolean {
  if (!isAuthenticated()) return false;
  return getUserRole() === "ADMIN";
}

export function isCorretor(): boolean {
  return getUserRole() === "CORRETOR";
}

export function isImobiliaria(): boolean {
  return getUserRole() === "IMOBILIARIA";
}

export function isAtendimento(): boolean {
  return getUserRole() === "ATENDIMENTO";
}

export function isAdministrativo(): boolean {
  return getUserRole() === "ADMINISTRATIVO";
}

/** Contratos: sem criar proposta nem ações de fluxo (aprovar/reprovar); pode editar registos existentes. */
export function isContratosReadOnly(): boolean {
  return isAdministrativo();
}

/** Edição de contratos existentes (valores, partes, condições). */
export function canEditContratos(): boolean {
  return isAdmin() || isAdministrativo();
}

/** Registo de contrato já assinado (legado/atípico) — admin e administrativo. */
export function canRegistrarContratoLegado(): boolean {
  return isAdmin() || isAdministrativo();
}

function isAtendimentoPath(pathname: string): boolean {
  return pathname === ATENDIMENTO_PATH_PREFIX || pathname.startsWith(`${ATENDIMENTO_PATH_PREFIX}/`);
}

function isWhatsAppConexaoPath(pathname: string): boolean {
  return pathname === WHATSAPP_CONEXAO_PATH || pathname.startsWith(`${WHATSAPP_CONEXAO_PATH}/`);
}

function isAdminDashboardHome(pathname: string): boolean {
  return pathname === ADMIN_DASHBOARD_HOME;
}

function isWelcomePath(pathname: string): boolean {
  return pathname === WELCOME_DASHBOARD_PATH;
}

/** Rota inicial após login conforme o perfil. */
export function getDefaultDashboardPath(role?: string | null): string {
  const r = role ?? getUserRole();
  if (r === "ATENDIMENTO") return ATENDIMENTO_PATH_PREFIX;
  if (r === "ADMINISTRATIVO") return WELCOME_DASHBOARD_PATH;
  if (r === "ADMIN") return ADMIN_DASHBOARD_HOME;
  return WELCOME_DASHBOARD_PATH;
}

/**
 * Painel /dashboard só para ADMIN; atendimento em /dashboard/atendimento e conexão WhatsApp;
 * corretor e imobiliária usam /dashboard/inicio como início.
 */
function isAdministrativoAllowedPath(pathname: string): boolean {
  if (
    ADMINISTRATIVO_BLOCKED_CONTRATOS.some(
      (blocked) => pathname === blocked || pathname.startsWith(`${blocked}/`),
    )
  ) {
    return false;
  }
  return ADMINISTRATIVO_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function canAccessDashboardPath(pathname: string, role?: string | null): boolean {
  const r = role ?? getUserRole();
  if (r === "ATENDIMENTO") {
    return isAtendimentoPath(pathname) || isWhatsAppConexaoPath(pathname);
  }
  if (r === "ADMINISTRATIVO") {
    return isAdministrativoAllowedPath(pathname);
  }
  if (isAdminDashboardHome(pathname) && r !== "ADMIN") {
    return false;
  }
  if (isWelcomePath(pathname) && r === "ADMIN") {
    return false;
  }
  if ((r === "CORRETOR" || r === "IMOBILIARIA") && isAtendimentoPath(pathname)) {
    return false;
  }
  const auditoriaPrefix = "/dashboard/auditoria";
  if (pathname === auditoriaPrefix || pathname.startsWith(`${auditoriaPrefix}/`)) {
    return r === "ADMIN";
  }
  if (pathname === CRM_PATH_PREFIX || pathname.startsWith(`${CRM_PATH_PREFIX}/`)) {
    return r === "ADMIN";
  }
  return true;
}

/** Resolve destino seguro após login (evita mandar não-admin para /dashboard). */
export function resolvePostLoginPath(requestedNext: string | null, role: string): string {
  const fallback = getDefaultDashboardPath(role);
  if (!requestedNext || !requestedNext.startsWith("/dashboard")) {
    return fallback;
  }
  if (canAccessDashboardPath(requestedNext, role)) {
    return requestedNext;
  }
  return fallback;
}

export function getUserEmail(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(EMAIL_KEY);
  } catch {
    return null;
  }
}

/** Decodifica payload JWT (sem validar assinatura — uso client-side para exp/sub). */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Token staff válido para API/WebSocket (não demo, não portal, não expirado). */
export function isStaffTokenUsable(token: string | null | undefined): boolean {
  if (!token || token === DEMO_TOKEN) return false;
  const payload = decodeJwtPayload(token);
  if (!payload) return false;
  const sub = typeof payload.sub === "string" ? payload.sub : "";
  if (!sub || sub.startsWith("portal:")) return false;
  const exp = payload.exp;
  if (typeof exp === "number" && Date.now() >= exp * 1000) return false;
  return true;
}
