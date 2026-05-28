import { getApiBaseUrl } from "@/lib/api-config";
import { apiFetch } from "@/lib/api-fetch";
import { setAuthSession } from "@/lib/auth-storage";

export type TenantResumo = {
  id: number;
  slug: string;
  nome: string;
  padrao: boolean;
};

type LoginPayload = {
  accessToken?: string;
  token?: string;
  role?: string;
  email?: string;
  exigirTrocaSenha?: boolean;
  tenantId?: number;
  tenantSlug?: string;
};

export function getTenantsMeUrl(): string {
  const base = getApiBaseUrl();
  return base ? `${base}/api/tenants/me` : "";
}

export function getSwitchTenantUrl(): string {
  const base = getApiBaseUrl();
  return base ? `${base}/api/auth/switch-tenant` : "";
}

export async function fetchMyTenants(): Promise<TenantResumo[]> {
  const url = getTenantsMeUrl();
  if (!url) return [];
  try {
    const res = await apiFetch(url, { skipLoading: true });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function switchTenant(tenantId: number): Promise<boolean> {
  const url = getSwitchTenantUrl();
  if (!url) return false;
  const res = await apiFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenantId }),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as LoginPayload;
  const token = data.accessToken ?? data.token;
  if (!token) return false;
  setAuthSession(
    token,
    data.role ?? "ADMIN",
    data.email,
    data.tenantId,
    data.tenantSlug,
  );
  return true;
}
