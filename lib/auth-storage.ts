import { readPrimeEnv } from "@/lib/runtime-env";

/** Token JWT e Role do utilizador — SPA estática no Firebase. */
const TOKEN_KEY = "aires_auth_token";
const ROLE_KEY = "aires_auth_role";
const EMAIL_KEY = "aires_auth_email";

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
] as const;

const ADMINISTRATIVO_BLOCKED_CONTRATOS = [
  "/dashboard/contratos/novo",
  "/dashboard/contratos/edit",
  "/dashboard/contratos/legado",
] as const;

/**
 * Quando `NEXT_PUBLIC_SKIP_AUTH=true`, o dashboard não exige token (apenas desenvolvimento / teste rápido).
 */
export function isAuthCheckDisabled(): boolean {
  return readPrimeEnv("NEXT_PUBLIC_SKIP_AUTH") === "true";
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

export function setAuthSession(token: string, role: string, email?: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ROLE_KEY, role);
  if (email) localStorage.setItem(EMAIL_KEY, email);
}

export function clearAuthSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(EMAIL_KEY);
}

export function isAuthenticated(): boolean {
  if (isAuthCheckDisabled()) return true;
  return Boolean(getAuthToken());
}

export function isAdmin(): boolean {
  const role = getUserRole();
  if (role === "ADMIN") return true;
  if (role) return false;
  return isAuthCheckDisabled();
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

/** Contratos: apenas listagem, resumo e PDF (sem criar/editar/aprovar). */
export function isContratosReadOnly(): boolean {
  return isAdministrativo();
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
