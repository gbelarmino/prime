import { loadingState } from "./loading-store";
import { clearAuthSession, getAuthToken, getTenantId, TENANT_HEADER } from "./auth-storage";

/**
 * Wrapper sobre o fetch nativo que:
 * 1. Controla automaticamente o spinner global (opcional).
 * 2. Injeta o Bearer token se disponível.
 */
export async function apiFetch(
  input: RequestInfo | URL, 
  init?: RequestInit & { skipLoading?: boolean }
): Promise<Response> {
  const skipLoading = init?.skipLoading ?? false;

  if (!skipLoading) {
    loadingState.start();
  }
  
  const token = getAuthToken();
  const headers = new Headers(init?.headers);
  
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const tenantId = getTenantId();
  if (tenantId != null && !headers.has(TENANT_HEADER)) {
    headers.set(TENANT_HEADER, String(tenantId));
  }

  // Remove skipLoading from finalInit to avoid passing it to native fetch
  const { skipLoading: _, ...fetchInit } = init || {};

  const finalInit: RequestInit = {
    ...fetchInit,
    headers,
    credentials: fetchInit?.credentials ?? "omit",
  };

  try {
    const response = await fetch(input, finalInit);

    if (
      response.status === 401 &&
      typeof window !== "undefined" &&
      token
    ) {
      clearAuthSession();
      const next = encodeURIComponent(
        `${window.location.pathname}${window.location.search}`,
      );
      window.location.replace(`/login?next=${next}`);
    }

    return response;
  } catch (error) {
    throw error;
  } finally {
    if (!skipLoading) {
      loadingState.stop();
    }
  }
}
