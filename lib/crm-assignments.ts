import { apiFetch } from "@/lib/api-fetch";
import {
  getCorretoresListUrl,
  getImobiliariasListUrl,
  isApiConfigured,
} from "@/lib/api-config";
import { getAuthToken } from "@/lib/auth-storage";
import { fetchCampanhas } from "@/lib/crm-service";
import type { CorretorApiResponse } from "@/lib/validations/corretor";

type SpringPage<T> = {
  content: T[];
};

export type CampanhaOption = {
  id: number;
  slug: string;
  nome: string;
};

export type ImobiliariaOption = {
  id: number;
  label: string;
};

export type CorretorOption = {
  id: number;
  nome: string;
  imobiliariaId: number;
  imobiliariaRazaoSocial: string | null;
};

async function authHeaders(): Promise<HeadersInit> {
  const token = getAuthToken();
  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function loadCampanhasAtivas(): Promise<CampanhaOption[]> {
  const lista = await fetchCampanhas();
  return lista.filter((c) => c.ativo).map((c) => ({ id: c.id, slug: c.slug, nome: c.nome }));
}

export async function loadImobiliariasOptions(): Promise<ImobiliariaOption[]> {
  if (!isApiConfigured()) return [];
  const res = await apiFetch(getImobiliariasListUrl(0, 500), {
    headers: await authHeaders(),
    skipLoading: true,
  });
  if (!res.ok) return [];
  const page = (await res.json()) as SpringPage<{ id: number; razaoSocial: string }>;
  return (page.content ?? []).map((i) => ({ id: i.id, label: i.razaoSocial }));
}

export async function loadCorretoresOptions(): Promise<CorretorOption[]> {
  if (!isApiConfigured()) return [];
  const res = await apiFetch(getCorretoresListUrl(0, 500), {
    headers: await authHeaders(),
    skipLoading: true,
  });
  if (!res.ok) return [];
  const page = (await res.json()) as SpringPage<CorretorApiResponse>;
  return (page.content ?? []).map((c) => ({
    id: c.id,
    nome: c.nome,
    imobiliariaId: c.imobiliariaId,
    imobiliariaRazaoSocial: c.imobiliariaRazaoSocial,
  }));
}

export function filterCorretoresByImobiliaria(
  corretores: CorretorOption[],
  imobiliariaId: number | null,
): CorretorOption[] {
  if (imobiliariaId == null) return corretores;
  return corretores.filter((c) => c.imobiliariaId === imobiliariaId);
}
