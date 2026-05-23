const PORTAL_TOKEN_KEY = "aires_portal_token";
const PORTAL_CONTRATANTE_KEY = "aires_portal_contratante_id";
const PORTAL_NOME_KEY = "aires_portal_nome";

export function getPortalToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(PORTAL_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setPortalSession(token: string, contratanteId: number, nome: string): void {
  localStorage.setItem(PORTAL_TOKEN_KEY, token);
  localStorage.setItem(PORTAL_CONTRATANTE_KEY, String(contratanteId));
  localStorage.setItem(PORTAL_NOME_KEY, nome);
}

export function clearPortalSession(): void {
  localStorage.removeItem(PORTAL_TOKEN_KEY);
  localStorage.removeItem(PORTAL_CONTRATANTE_KEY);
  localStorage.removeItem(PORTAL_NOME_KEY);
}

export function isPortalAuthenticated(): boolean {
  return Boolean(getPortalToken());
}

export function getPortalNome(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PORTAL_NOME_KEY);
}
