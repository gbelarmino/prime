import { apiFetch } from "./api-fetch";
import { baixarBlob, tryGetFilenameFromDisposition } from "./baixar-boleto-pdf";
import {
  getChamadoAnexoUrl,
  getChamadoByIdUrl,
  getChamadoMensagensUrl,
  getChamadosAbertosContagemUrl,
  getChamadosUrl,
} from "./api-config";

export type ChamadoStatus = "ABERTO" | "EM_ANALISE" | "CONCLUIDO" | "CANCELADO";
export type ChamadoAutorTipo = "COMPRADOR" | "USUARIO" | "SISTEMA";

export type ChamadoListItem = {
  id: string;
  numero: number;
  assunto: string;
  status: ChamadoStatus;
  contratoId: number | null;
  numeroContrato: string | null;
  contratanteId: number | null;
  nomeContratante: string | null;
  abertoEm: string;
  atualizadoEm: string;
};

export type ChamadoAnexo = {
  id: string;
  mensagemId: string | null;
  nomeOriginal: string;
  contentType: string | null;
  tamanhoBytes: number;
  criadoEm: string;
};

export type ChamadoMensagem = {
  id: string;
  autorTipo: ChamadoAutorTipo;
  autorUsuarioId: number | null;
  autorNome: string | null;
  texto: string;
  interno: boolean;
  criadoEm: string;
  anexos: ChamadoAnexo[];
};

export type ChamadoDetalhe = ChamadoListItem & {
  descricao: string;
  fechadoEm: string | null;
  mensagens: ChamadoMensagem[];
  anexos: ChamadoAnexo[];
};

export const CHAMADO_STATUS_LABEL: Record<ChamadoStatus, string> = {
  ABERTO: "Aberto",
  EM_ANALISE: "Em análise",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

export const CHAMADO_STATUS_TONES: Record<string, string> = {
  ABERTO: "border-amber-500/25 bg-amber-500/15 text-amber-300",
  EM_ANALISE: "border-sky-500/25 bg-sky-500/15 text-sky-300",
  CONCLUIDO: "border-emerald-500/25 bg-emerald-500/15 text-emerald-300",
  CANCELADO: "border-white/10 bg-white/10 text-white/50",
};

async function parseError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body && typeof body.message === "string") return body.message;
    if (body && typeof body.error === "string") return body.error;
  } catch {
    /* ignore */
  }
  return `Erro ${res.status}`;
}

export async function listarChamados(status?: ChamadoStatus | null, q?: string): Promise<ChamadoListItem[]> {
  const url = getChamadosUrl(status ?? undefined, q);
  if (!url) throw new Error("API não configurada");
  const res = await apiFetch(url);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function contagemChamadosAbertos(options?: {
  skipLoading?: boolean;
}): Promise<{ abertos: number }> {
  const url = getChamadosAbertosContagemUrl();
  if (!url) throw new Error("API não configurada");
  const res = await apiFetch(url, { skipLoading: options?.skipLoading });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function obterChamado(id: string): Promise<ChamadoDetalhe> {
  const url = getChamadoByIdUrl(id);
  if (!url) throw new Error("API não configurada");
  const res = await apiFetch(url);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function atualizarStatusChamado(id: string, status: ChamadoStatus): Promise<ChamadoDetalhe> {
  const url = getChamadoByIdUrl(id);
  if (!url) throw new Error("API não configurada");
  const res = await apiFetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function responderChamado(
  id: string,
  input: { texto: string; interno?: boolean; files?: File[] },
): Promise<ChamadoDetalhe> {
  const url = getChamadoMensagensUrl(id);
  if (!url) throw new Error("API não configurada");
  const fd = new FormData();
  fd.set("texto", input.texto);
  fd.set("interno", String(Boolean(input.interno)));
  for (const f of input.files ?? []) fd.append("files", f);
  const res = await apiFetch(url, { method: "POST", body: fd });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function baixarAnexoChamado(
  chamadoId: string,
  anexoId: string,
  fallbackName = "anexo",
): Promise<void> {
  const url = getChamadoAnexoUrl(chamadoId, anexoId);
  if (!url) throw new Error("API não configurada");
  const res = await apiFetch(url);
  if (!res.ok) throw new Error(await parseError(res));
  const blob = await res.blob();
  const name =
    tryGetFilenameFromDisposition(res.headers.get("Content-Disposition")) ?? fallbackName;
  baixarBlob(blob, name);
}
