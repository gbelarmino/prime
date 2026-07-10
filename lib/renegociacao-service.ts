import { apiFetch } from "./api-fetch";
import { baixarBlob, tryGetFilenameFromDisposition } from "./baixar-boleto-pdf";
import {
  getRenegociacaoAprovarUrl,
  getRenegociacaoAuditoriaUrl,
  getRenegociacaoBaseUrl,
  getRenegociacoesConsultaUrl,
  getRenegociacaoCancelarUrl,
  getRenegociacaoEfetivarUrl,
  getRenegociacaoGerarDocumentosUrl,
  getRenegociacaoPropostaPdfUrl,
  getRenegociacaoPropostaUrl,
  getRenegociacaoSimularUrl,
  getRenegociacaoSubmeterAprovacaoUrl,
} from "./api-config";
import type {
  CriarRenegociacaoRequest,
  ModalidadeRenegociacao,
  RenegociacaoDetalhe,
  RenegociacaoConsultaItem,
  RenegociacaoResumo,
  RenegociacaoSimulacaoResponse,
  SimularRenegociacaoRequest,
} from "./renegociacao-types";
import { renegociacaoEstaAtiva } from "./renegociacao-types";
import type { AtendimentoResumoFinanceiro } from "./atendimento-service";
import {
  calcularVencimentosComPrimeiraParcelaDetalhe,
  formatIsoDate,
  parseIsoDate,
} from "./fin-vencimento";
import type { BoletoEncargosConfig } from "./fin-memorial-calculo";
import { addDiasIso, hojeNegocioIso } from "./app-business-date";
import {
  aplicarDescontoQuitacao,
  montarBaseQuitacaoLocal,
} from "./renegociacao-quitacao-calculo";
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

export async function listarRenegociacoesConsulta(
  page: number,
  size: number,
  q?: string,
): Promise<import("./spring-page").SpringPage<RenegociacaoConsultaItem>> {
  const url = getRenegociacoesConsultaUrl(page, size, q);
  if (!url) throw new Error("API não configurada");
  const res = await apiFetch(url);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
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

/** Primeiro processo não terminal do contrato (mesma regra do backend ao criar). */
export async function obterRenegociacaoAtivaEmAndamento(
  contratoId: number,
): Promise<RenegociacaoResumo | null> {
  const lista = await listarRenegociacoes(contratoId);
  return lista.find((r) => renegociacaoEstaAtiva(r.status)) ?? null;
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

/** PDF da proposta comercial T1 (template Domus) após simulação persistida. */
export async function baixarPropostaPdfT1(
  contratoId: number,
  renegociacaoId: number,
  simulacaoId: number,
): Promise<void> {
  const url = getRenegociacaoPropostaPdfUrl(contratoId, renegociacaoId, simulacaoId);
  if (!url) throw new Error("API não configurada");
  const res = await apiFetch(url);
  if (!res.ok) throw new Error(await parseError(res));
  const blob = await res.blob();
  const filename =
    tryGetFilenameFromDisposition(res.headers.get("Content-Disposition")) ??
    `proposta-t1-contrato-${contratoId}.pdf`;
  baixarBlob(blob, filename);
}

/** Ponte Fase 1: T2/T3 usam motor de condições até o endpoint unificado existir. */
export async function simularViaCondicoesVersao(
  contratoId: number,
  body: {
    tipoOrigem: "RENEGOCIACAO_SALDO" | "ADITIVO_GRADE";
    parcelaInicial: number;
    dataVigencia?: string | null;
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

/** T4 — protótipo local quando a API de renegociação ainda não está disponível. */
export function simularQuitacaoLocal(
  financeiro: AtendimentoResumoFinanceiro,
  params: {
    parcelaInicial: number;
    quantidadeParcelas: number;
    pctDesconto?: number | null;
    vlDesconto?: number | null;
    primeiroVencimento?: string | null;
    diaVencimentoContrato?: number | null;
    encargos?: BoletoEncargosConfig;
    dataAcordo?: string | null;
  },
): RenegociacaoSimulacaoResponse {
  const base = montarBaseQuitacaoLocal(
    financeiro,
    params.parcelaInicial,
    params.encargos,
    params.dataAcordo ?? undefined,
  );
  const saldoDevedor = base.saldoDevedorContrato;
  const inadimplenciaVp = base.inadimplenciaPresente.valorPresenteTotal;
  const totalAnterior = base.baseQuitacao;
  const totalNovo = aplicarDescontoQuitacao(totalAnterior, params.pctDesconto, params.vlDesconto);
  const desconto = Math.max(0, Math.round((totalAnterior - totalNovo) * 100) / 100);
  const pct =
    params.pctDesconto != null && params.pctDesconto > 0
      ? params.pctDesconto
      : totalAnterior > 0
        ? Math.round((desconto / totalAnterior) * 10000) / 100
        : 0;
  const qtd = Math.max(1, params.quantidadeParcelas);
  const parcelaValor = Math.round((totalNovo / qtd) * 100) / 100;
  const v0Iso = params.primeiroVencimento ?? addDiasIso(hojeNegocioIso(), 15);
  const diaVenc =
    params.diaVencimentoContrato != null &&
    params.diaVencimentoContrato >= 1 &&
    params.diaVencimentoContrato <= 31
      ? params.diaVencimentoContrato
      : parseIsoDate(v0Iso).getDate();
  const vencimentos = calcularVencimentosComPrimeiraParcelaDetalhe(
    parseIsoDate(v0Iso),
    diaVenc,
    qtd,
  );
  const cronograma = vencimentos.map((v, i) => ({
    numeroParcela: i + 1,
    vencimento: formatIsoDate(v.vencimento),
    valorNominal: i === qtd - 1 ? totalNovo - parcelaValor * (qtd - 1) : parcelaValor,
  }));
  const abertos = financeiro.titulosAbertos.filter((t) => t.numeroParcela >= params.parcelaInicial);
  const exige = pct > 5;
  return {
    simulacaoId: 0,
    nrSequencia: 1,
    memoriaCalculo: {
      vlPrincipal: saldoDevedor,
      vlJuros: base.inadimplenciaPresente.jurosTotal,
      vlMulta: base.inadimplenciaPresente.multaTotal,
      vlDesconto: desconto,
      vlTotal: totalNovo,
      vlValorPresente: inadimplenciaVp,
    },
    totalAnterior,
    totalNovo,
    saldoDevedor,
    pctDesconto: pct,
    diferencaTotal: totalNovo - totalAnterior,
    reducaoTotal: totalNovo < totalAnterior,
    exigeAprovacao: exige,
    nrNivelAprovacaoRequerido: pct > 15 ? 3 : exige ? 2 : 1,
    classificacaoJuridicaSugerida: "TERMO_QUITACAO",
    instrumentosSugeridos: ["TERMO_QUITACAO"],
    titulosAfetados: abertos.map((t) => ({
      id: t.id,
      numeroParcela: t.numeroParcela,
      vencimento: t.vencimento,
      valorNominal: t.valorNominal,
      status: t.status,
    })),
    cronogramaFuturo: cronograma,
    avisos: [
      "Simulação local — publique a API de renegociação para persistir no processo.",
      "Vencimentos do cronograma seguem o dia do contrato; sábado e domingo deslocam para a segunda-feira.",
      ...base.avisos,
      abertos.length === 0
        ? `Nenhum título em aberto a partir da parcela ${params.parcelaInicial}.`
        : `${abertos.length} título(s) em aberto na faixa de corte.`,
    ],
  };
}

/** Corrige total/cronograma quando a API devolve totalAnterior sem somar inadimplência VP. */
export function alinharSimulacaoQuitacaoT4(
  api: RenegociacaoSimulacaoResponse,
  local: RenegociacaoSimulacaoResponse,
  tolerancia = 0.02,
): RenegociacaoSimulacaoResponse {
  if (Math.abs(api.totalAnterior - local.totalAnterior) <= tolerancia) {
    return api;
  }
  return {
    ...api,
    totalAnterior: local.totalAnterior,
    totalNovo: local.totalNovo,
    memoriaCalculo: { ...api.memoriaCalculo, ...local.memoriaCalculo },
    cronogramaFuturo: local.cronogramaFuturo,
    pctDesconto: local.pctDesconto,
    diferencaTotal: local.diferencaTotal,
    reducaoTotal: local.reducaoTotal,
    exigeAprovacao: local.exigeAprovacao,
    nrNivelAprovacaoRequerido: local.nrNivelAprovacaoRequerido,
  };
}

export function modalidadeUsaMotorCondicoes(m: ModalidadeRenegociacao | null): boolean {
  return m === "T2_SALDO_DEVEDOR" || m === "T3_COMPLETA" || m === "T5_COM_ENTRADA";
}

/** Modalidades que efetivam títulos diretamente neste wizard (sem versão contratual). */
export function modalidadeEfetivaNoWizard(m: ModalidadeRenegociacao | null): boolean {
  return modalidadeUsaMotorCondicoes(m) || m === "T1_PARCELAS_VENCIDAS";
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
): Promise<{ renegociacaoId: number; versaoPublicadaId?: number | null; status: string }> {
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
