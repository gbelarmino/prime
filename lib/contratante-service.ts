import { apiFetch } from "@/lib/api-fetch";
import {
  getContratanteByIdUrl,
  getContratantesExportAgendaUrl,
  getContratantesListUrl,
} from "@/lib/api-config";
import { baixarBlob, tryGetFilenameFromDisposition } from "@/lib/baixar-boleto-pdf";
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

/** Exporta clientes com celular em vCard para a agenda do telemóvel. */
export async function exportContratantesAgenda(q?: string): Promise<{
  exported: number;
  skipped: number;
}> {
  const url = getContratantesExportAgendaUrl(q);
  if (!url) {
    throw new Error("API não configurada.");
  }
  const res = await apiFetch(url);
  if (!res.ok) {
    let message = "Não foi possível exportar a agenda.";
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = (await res.json()) as { message?: string };
      if (body.message?.trim()) message = body.message.trim();
    } else {
      const text = await res.text().catch(() => "");
      if (text.trim()) message = text.trim();
    }
    throw new Error(message);
  }
  const blob = await res.blob();
  const filename =
    tryGetFilenameFromDisposition(res.headers.get("content-disposition")) ??
    "clientes-aires.vcf";
  baixarBlob(blob, filename);
  const exported = Number(res.headers.get("x-aires-export-count") ?? "0");
  const skipped = Number(res.headers.get("x-aires-export-skipped") ?? "0");
  return { exported: Number.isFinite(exported) ? exported : 0, skipped: Number.isFinite(skipped) ? skipped : 0 };
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
