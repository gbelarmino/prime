import { apiFetch } from "./api-fetch";
import { baixarBoletoPdf } from "./baixar-boleto-pdf";
import {
  getAtendimentoBuscaUrl,
  getAtendimentoCobrancaBoletoUnicoUrl,
  getAtendimentoCobrancaEntradaParcelasUrl,
  getAtendimentoCobrancaParcelamentoUrl,
  getAtendimentoCobrancaPdfUrl,
  getAtendimentoOcorrenciasUrl,
  getAtendimentoPainelUrl,
  type AtendimentoBuscaSort,
} from "./api-config";
import type { SpringPage } from "./spring-page";
import type { TituloCobranca } from "./fin-service";

export type AtendimentoCanal = "TELEFONE" | "WHATSAPP" | "PRESENCIAL" | "SISTEMA";

export type AtendimentoModoCobranca = "BOLETO_UNICO" | "PARCELADO" | "ENTRADA_PARCELAS";

export type AtendimentoStatusFinanceiro = "EM_DIA" | "INADIMPLENTE" | "QUITADO";

export interface AtendimentoBuscaItem {
  contratoId: number;
  numeroContrato: string;
  contratanteId: number;
  contratanteNome: string;
  cpf: string;
  celular: string | null;
  empreendimento: string;
  quadra: string | null;
  lote: number | null;
  statusContrato: string | null;
  statusFinanceiro: AtendimentoStatusFinanceiro;
  saldoDevedor: number;
  percentualQuitacao: number;
}

export interface AtendimentoTituloResumo {
  id: string;
  numeroParcela: number;
  status: string;
  valorNominal: number;
  vencimento: string;
}

export interface AtendimentoResumoFinanceiro {
  contratoId: number;
  numeroContrato: string;
  contratanteId: number;
  contratanteNome: string;
  cpf: string;
  celular: string | null;
  empreendimento: string;
  quadra: string | null;
  lote: number | null;
  statusContrato: string | null;
  valorTotalContrato: number;
  totalPago: number;
  saldoDevedor: number;
  /** Ex.: 69 x 393,0 = 27.117,00 */
  memoriaSaldoDevedor?: string | null;
  parcelasRestantes?: number | null;
  valorParcelaReferencia?: number | null;
  valorInadimplente: number;
  percentualQuitacao: number;
  parcelasPagas: number;
  parcelasTotal: number;
  parcelasEmAtraso: number;
  proximoVencimento: string | null;
  statusFinanceiro: AtendimentoStatusFinanceiro;
  titulosAbertos: AtendimentoTituloResumo[];
  titulosVencidos: AtendimentoTituloResumo[];
  titulosPagos: AtendimentoTituloResumo[];
  convenioId: string | null;
  convenioNome: string | null;
  avisoConvenio: string | null;
}

export interface AtendimentoOcorrencia {
  id: number;
  contratoId: number;
  contratanteId: number;
  usuarioNome: string | null;
  canal: AtendimentoCanal;
  texto: string;
  metadata: Record<string, unknown> | null;
  dataHora: string;
}

export interface AtendimentoRenegociacaoRequest {
  modo: AtendimentoModoCobranca;
  valorTotal: number;
  valorEntrada?: number | null;
  quantidadeParcelas?: number | null;
  primeiroVencimento: string;
  titulosOrigemIds?: string[] | null;
  observacao?: string | null;
}

export interface AtendimentoRenegociacaoResponse {
  titulos: TituloCobranca[];
  ocorrenciaId: number;
}

export interface AtendimentoBuscaFilters {
  contrato?: string;
  empreendimentos?: string[];
  quadras?: string[];
  lotes?: number[];
  nome?: string;
  cpf?: string;
  celular?: string;
  situacoesFinanceiras?: AtendimentoStatusFinanceiro[];
}

export type { AtendimentoBuscaSort };

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message ?? `Erro HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function cobrancaUrl(contratoId: number, modo: AtendimentoModoCobranca): string {
  switch (modo) {
    case "BOLETO_UNICO":
      return getAtendimentoCobrancaBoletoUnicoUrl(contratoId);
    case "PARCELADO":
      return getAtendimentoCobrancaParcelamentoUrl(contratoId);
    case "ENTRADA_PARCELAS":
      return getAtendimentoCobrancaEntradaParcelasUrl(contratoId);
  }
}

export const atendimentoService = {
  async buscar(
    page = 0,
    size = 20,
    filters: AtendimentoBuscaFilters,
    sort?: AtendimentoBuscaSort,
    options?: { skipLoading?: boolean },
  ): Promise<SpringPage<AtendimentoBuscaItem>> {
    const url = getAtendimentoBuscaUrl(page, size, filters, sort);
    const res = await apiFetch(url, { skipLoading: options?.skipLoading });
    return parseJson(res);
  },

  async getPainel(contratoId: number): Promise<AtendimentoResumoFinanceiro> {
    const res = await apiFetch(getAtendimentoPainelUrl(contratoId));
    return parseJson(res);
  },

  async listOcorrencias(contratoId: number): Promise<AtendimentoOcorrencia[]> {
    const res = await apiFetch(getAtendimentoOcorrenciasUrl(contratoId));
    return parseJson(res);
  },

  async criarOcorrencia(
    contratoId: number,
    body: { texto: string; canal: AtendimentoCanal },
  ): Promise<AtendimentoOcorrencia> {
    const res = await apiFetch(getAtendimentoOcorrenciasUrl(contratoId), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return parseJson(res);
  },

  async renegociar(
    contratoId: number,
    body: AtendimentoRenegociacaoRequest,
  ): Promise<AtendimentoRenegociacaoResponse> {
    const res = await apiFetch(cobrancaUrl(contratoId, body.modo), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return parseJson(res);
  },

  async downloadPdf(
    tituloId: string,
    options?: {
      urlBoleto?: string | null;
      temArquivoBoleto?: boolean;
      status?: string;
    },
  ): Promise<void> {
    await baixarBoletoPdf(tituloId, {
      urlBoleto: options?.urlBoleto,
      temArquivoBoleto: options?.temArquivoBoleto,
      status: options?.status,
      pdfUrl: getAtendimentoCobrancaPdfUrl(tituloId),
    });
  },
};

export const ATENDIMENTO_STATUS_FINANCEIRO_TONES: Record<string, string> = {
  EM_DIA: "border-emerald-500/25 bg-emerald-500/15 text-emerald-300",
  INADIMPLENTE: "border-rose-500/25 bg-rose-500/15 text-rose-300",
  QUITADO: "border-blue-500/25 bg-blue-500/15 text-blue-300",
};

export const ATENDIMENTO_STATUS_FINANCEIRO_LABELS: Record<AtendimentoStatusFinanceiro, string> = {
  EM_DIA: "Em dia",
  INADIMPLENTE: "Inadimplente",
  QUITADO: "Quitado",
};

export const ATENDIMENTO_SITUACAO_FINANCEIRA_OPTIONS: {
  label: string;
  value: AtendimentoStatusFinanceiro;
}[] = (["EM_DIA", "INADIMPLENTE", "QUITADO"] as const).map((value) => ({
  value,
  label: ATENDIMENTO_STATUS_FINANCEIRO_LABELS[value],
}));

export const ATENDIMENTO_CANAL_LABELS: Record<AtendimentoCanal, string> = {
  TELEFONE: "Telefone",
  WHATSAPP: "WhatsApp",
  PRESENCIAL: "Presencial",
  SISTEMA: "Sistema",
};

export const ATENDIMENTO_MODO_COBRANCA_LABELS: Record<AtendimentoModoCobranca, string> = {
  BOLETO_UNICO: "Boleto único",
  PARCELADO: "Parcelamento",
  ENTRADA_PARCELAS: "Entrada + parcelas",
};
