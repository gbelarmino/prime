import { apiFetch } from "@/lib/api-fetch";
import { getContratanteByIdUrl, getContratantesListUrl } from "@/lib/api-config";
import type { SpringPage } from "@/lib/spring-page";

export type ContratanteOption = {
  id: string;
  nome: string;
  cpf?: string | null;
  email?: string | null;
};

type ContratanteListRow = {
  id: number;
  nome: string;
  cpf?: string | null;
  email?: string | null;
};

function toOption(row: ContratanteListRow): ContratanteOption {
  return {
    id: String(row.id),
    nome: row.nome,
    cpf: row.cpf ?? null,
    email: row.email ?? null,
  };
}

/** Busca contratantes no backend (`q` em nome, CPF ou e-mail). */
export async function searchContratantes(
  q: string,
  size = 30,
): Promise<ContratanteOption[]> {
  const term = q.trim();
  const url = getContratantesListUrl(0, size, term);
  if (!url) return [];
  const res = await apiFetch(url, { skipLoading: true });
  if (!res.ok) return [];
  const page = (await res.json()) as SpringPage<ContratanteListRow>;
  return (page.content ?? []).map(toOption);
}

export async function fetchContratanteOption(
  id: number,
): Promise<ContratanteOption | null> {
  const url = getContratanteByIdUrl(id);
  if (!url) return null;
  const res = await apiFetch(url, { skipLoading: true });
  if (!res.ok) return null;
  const row = (await res.json()) as ContratanteListRow;
  return toOption(row);
}

/** Mantém o item selecionado visível após buscas remotas. */
export function mergeContratanteOptions(
  incoming: ContratanteOption[],
  selected: ContratanteOption | null,
): ContratanteOption[] {
  const map = new Map<string, ContratanteOption>();
  for (const item of incoming) {
    map.set(item.id, item);
  }
  if (selected?.id) {
    map.set(selected.id, selected);
  }
  return Array.from(map.values());
}
