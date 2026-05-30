import { apiFetch } from "./api-fetch";
import {
  getRenegociacaoAprovarUrl,
  getRenegociacaoAuditoriaUrl,
  getRenegociacaoBaseUrl,
  getRenegociacaoCancelarUrl,
  getRenegociacaoEfetivarUrl,
  getRenegociacaoGerarDocumentosUrl,
  getRenegociacaoPropostaUrl,
  getRenegociacaoSimularUrl,
  getRenegociacaoSubmeterAprovacaoUrl,
} from "./api-config";
import type {
  CriarRenegociacaoRequest,
  RenegociacaoDetalhe,
  RenegociacaoResumo,
  RenegociacaoSimulacaoResponse,
  SimularRenegociacaoRequest,
} from "./renegociacao-types";
import {
  simularCondicoesVersao,
  type CondicoesVersaoSimulacaoResponse,
  type PoliticaReajustePosTransicao,
} from "./contrato-condicoes-service";

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

export async function listarRenegociacoes(
  contratoId: number,
  status?: string[],
): Promise<RenegociacaoResumo[]> {
  const base = getRenegociacaoBaseUrl(contratoId);
  if (!base) throw new Error("API não configurada");
  const q = status?.length ? `?${status.map((s) => `status=${encodeURIComponent(s)}`).join("&")}` : "";
  const res = await apiFetch(`${base}${q}`);
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function criarRenegociacao(
  contratoId: number,
  body: CriarRenegociacaoRequest,
): Promise<RenegociacaoDetalhe> {
  const url = getRenegociacaoBaseUrl(contratoId);
  if (!url) throw new Error("API não configurada");
  const res = await apiFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function obterRenegociacao(
  contratoId: number,
  renegociacaoId: number,
): Promise<RenegociacaoDetalhe> {
  const base = getRenegociacaoBaseUrl(contratoId);
  if (!base) throw new Error("API não configurada");
  const res = await apiFetch(`${base}/${renegociacaoId}`);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function simularRenegociacao(
  contratoId: number,
  renegociacaoId: number,
  body: SimularRenegociacaoRequest,
): Promise<RenegociacaoSimulacaoResponse> {
  const url = getRenegociacaoSimularUrl(contratoId, renegociacaoId);
  if (!url) throw new Error("API não configurada");
  const res = await apiFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

/** Ponte Fase 1: T2/T3 usam motor de condições até o endpoint unificado existir. */
export async function simularViaCondicoesVersao(
  contratoId: number,
  body: {
    tipoOrigem: "RENEGOCIACAO_SALDO" | "ADITIVO_GRADE";
    parcelaInicial: number;
    condicoes: Record<string, unknown>;
    politicaReajuste?: PoliticaReajustePosTransicao | null;
    motivo?: string | null;
    confirmarCancelamentoTitulos?: boolean;
  },
): Promise<CondicoesVersaoSimulacaoResponse> {
  return simularCondicoesVersao(contratoId, body);
}

/** Adapta resposta do aditivo para o shape do wizard unificado. */
export function condicoesSimulacaoParaRenegociacao(
  raw: CondicoesVersaoSimulacaoResponse,
  seq = 1,
): RenegociacaoSimulacaoResponse {
  return {
    simulacaoId: 0,
    nrSequencia: seq,
    memoriaCalculo: {
      vlPrincipal: raw.saldoDevedor,
      vlDesconto: raw.reducaoTotal ? Math.max(0, raw.diferencaTotal) : 0,
      vlTotal: raw.totalNovo,
    },
    totalAnterior: raw.totalAnterior,
    totalNovo: raw.totalNovo,
    saldoDevedor: raw.saldoDevedor,
    pctDesconto: raw.totalAnterior > 0 ? (Math.max(0, -raw.diferencaTotal) / raw.totalAnterior) * 100 : 0,
    diferencaTotal: raw.diferencaTotal,
    reducaoTotal: raw.reducaoTotal,
    exigeAprovacao: raw.exigeAprovacaoAdmin,
    nrNivelAprovacaoRequerido: raw.exigeAprovacaoAdmin ? 2 : 1,
    classificacaoJuridicaSugerida: raw.reducaoTotal ? "ADITIVO" : "TERMO_PARCELAMENTO",
    instrumentosSugeridos: raw.exigePdfAditivo ? ["ADITIVO"] : ["TERMO_RENEGOCIACAO"],
    titulosAfetados: raw.titulosAfetados.map((t) => ({
      id: t.id,
      numeroParcela: t.numeroParcela,
      vencimento: t.vencimento,
      valorNominal: t.valorNominal,
      status: t.status,
    })),
    cronogramaFuturo: raw.cronogramaFuturo.map((p) => ({
      numeroParcela: p.numeroParcela,
      vencimento: p.vencimento,
      valorNominal: p.valorNominal,
    })),
    avisos: raw.avisos,
  };
}

export async function cancelarRenegociacao(
  contratoId: number,
  renegociacaoId: number,
  motivo: string,
): Promise<RenegociacaoDetalhe> {
  const url = getRenegociacaoCancelarUrl(contratoId, renegociacaoId);
  if (!url) throw new Error("API não configurada");
  const res = await apiFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ motivo }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function gerarPropostaRenegociacao(
  contratoId: number,
  renegociacaoId: number,
  body: { simulacaoId: number; dtValidade: string },
): Promise<{ id: number; status: string; dtValidade: string; nrNivelAprovacaoRequerido: number }> {
  const url = getRenegociacaoPropostaUrl(contratoId, renegociacaoId);
  if (!url) throw new Error("API não configurada");
  const res = await apiFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function aprovarRenegociacao(
  contratoId: number,
  renegociacaoId: number,
  comentario?: string,
): Promise<{ id: number; nrNivelAtual: number; status: string }> {
  const url = getRenegociacaoAprovarUrl(contratoId, renegociacaoId);
  if (!url) throw new Error("API não configurada");
  const res = await apiFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ comentario: comentario ?? null }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function gerarDocumentosRenegociacao(
  contratoId: number,
  renegociacaoId: number,
): Promise<{ id: number | null; tipo: string; statusAssinatura: string; linkArquivo: string | null }[]> {
  const url = getRenegociacaoGerarDocumentosUrl(contratoId, renegociacaoId);
  if (!url) throw new Error("API não configurada");
  const res = await apiFetch(url, { method: "POST" });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function submeterAprovacao(
  contratoId: number,
  renegociacaoId: number,
): Promise<{ id: number; nrNivelAtual: number; status: string }> {
  const url = getRenegociacaoSubmeterAprovacaoUrl(contratoId, renegociacaoId);
  if (!url) throw new Error("API não configurada");
  const res = await apiFetch(url, { method: "POST" });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function efetivarRenegociacao(
  contratoId: number,
  renegociacaoId: number,
  body: { confirmarCancelamentoTitulos: boolean; titulosCancelarIds: string[] },
  idempotencyKey: string,
): Promise<{ renegociacaoId: number; versaoPublicadaId: number; status: string }> {
  const url = getRenegociacaoEfetivarUrl(contratoId, renegociacaoId);
  if (!url) throw new Error("API não configurada");
  const res = await apiFetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function listarAuditoriaRenegociacao(
  contratoId: number,
  renegociacaoId: number,
): Promise<
  {
    acao: string;
    payloadAntes?: object;
    payloadDepois?: object;
    dtEvento: string;
  }[]
> {
  const url = getRenegociacaoAuditoriaUrl(contratoId, renegociacaoId);
  if (!url) throw new Error("API não configurada");
  const res = await apiFetch(url);
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}
