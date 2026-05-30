import { apiFetch } from "./api-fetch";
import {
  getContratoCondicoesAditivoPdfUrl,
  getContratoCondicoesAprovarReducaoUrl,
  getContratoCondicoesPublicarUrl,
  getContratoCondicoesRascunhoUrl,
  getContratoCondicoesSimularUrl,
  getContratoCondicoesVersoesUrl,
} from "./api-config";

export type TipoOrigemCondicoesVersao =
  | "ADITIVO_GRADE"
  | "RENEGOCIACAO_SALDO"
  | "AJUSTE_AGENDA";

export type PoliticaReajustePosTransicao = "CADEIA" | "NOVA_BASE" | "SEM_REAJUSTE";

export type StatusCondicoesVersao =
  | "RASCUNHO"
  | "AGUARDANDO_ADITIVO"
  | "AGUARDANDO_APROVACAO"
  | "VIGENTE"
  | "SUPERSEDIDA";

export type CondicoesVersaoTituloAfetado = {
  id: string;
  numeroParcela: number;
  vencimento: string;
  valorNominal: number;
  status: string;
};

export type CondicoesVersaoParcelaFutura = {
  numeroParcela: number;
  vencimento: string;
  valorNominal: number;
};

export type CondicoesVersaoSimulacaoResponse = {
  totalAnterior: number;
  totalNovo: number;
  pagoAcumulado: number;
  saldoDevedor: number;
  diferencaTotal: number;
  reducaoTotal: boolean;
  exigeAprovacaoAdmin: boolean;
  exigePdfAditivo: boolean;
  titulosAfetados: CondicoesVersaoTituloAfetado[];
  cronogramaFuturo: CondicoesVersaoParcelaFutura[];
  avisos: string[];
};

export type CondicoesVersaoResponse = {
  id: number;
  contratoId: number;
  numeroVersao: number;
  tipoOrigem: TipoOrigemCondicoesVersao;
  parcelaInicial: number;
  parcelaFinal: number | null;
  dataVigencia: string | null;
  status: StatusCondicoesVersao;
  politicaReajuste: PoliticaReajustePosTransicao | null;
  possuiPdfAditivo: boolean;
  motivo: string | null;
  publicadoEm: string | null;
};

type SimularBody = {
  tipoOrigem: TipoOrigemCondicoesVersao;
  parcelaInicial: number;
  dataVigencia?: string | null;
  condicoes: Record<string, unknown>;
  politicaReajuste?: PoliticaReajustePosTransicao | null;
  motivo?: string | null;
  confirmarCancelamentoTitulos?: boolean;
};

type RascunhoBody = Omit<SimularBody, "confirmarCancelamentoTitulos">;

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

export async function listarCondicoesVersoes(contratoId: number): Promise<CondicoesVersaoResponse[]> {
  const res = await apiFetch(getContratoCondicoesVersoesUrl(contratoId));
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function simularCondicoesVersao(
  contratoId: number,
  body: SimularBody,
): Promise<CondicoesVersaoSimulacaoResponse> {
  const res = await apiFetch(getContratoCondicoesSimularUrl(contratoId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function criarCondicoesRascunho(
  contratoId: number,
  body: RascunhoBody,
): Promise<CondicoesVersaoResponse> {
  const res = await apiFetch(getContratoCondicoesRascunhoUrl(contratoId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function aprovarReducaoCondicoes(
  contratoId: number,
  versaoId: number,
): Promise<CondicoesVersaoResponse> {
  const res = await apiFetch(getContratoCondicoesAprovarReducaoUrl(contratoId, versaoId), {
    method: "POST",
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function uploadAditivoPdf(
  contratoId: number,
  versaoId: number,
  file: File,
): Promise<CondicoesVersaoResponse> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await apiFetch(getContratoCondicoesAditivoPdfUrl(contratoId, versaoId), {
    method: "POST",
    body: fd,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function publicarCondicoesVersao(
  contratoId: number,
  versaoId: number,
  confirmarCancelamentoTitulos: boolean,
  titulosCancelarIds: string[],
): Promise<CondicoesVersaoResponse> {
  const res = await apiFetch(getContratoCondicoesPublicarUrl(contratoId, versaoId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirmarCancelamentoTitulos, titulosCancelarIds }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}
