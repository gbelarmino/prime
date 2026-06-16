import { apiFetch } from "./api-fetch";
import {
  baixarBlob,
  baixarBoletoPdf,
  tryGetFilenameFromDisposition,
} from "./baixar-boleto-pdf";
import {
  getFinConvenioAtivoUrl,
  getFinConvenioEmpreendimentoUrl,
  getFinConveniosEmpreendimentosUrl,
  getFinConveniosGestaoUrl,
  getFinConveniosUrl,
  getFinDashboardResumoUrl,
  getFinFluxoReceitaUrl,
  getFinIndicesIpcaSincronizarUrl,
  getFinIndicesIpcaUltimoUrl,
  getFinIndicesIpcaUrl,
  getFinIndicesIgpmSincronizarUrl,
  getFinIndicesIgpmUltimoUrl,
  getFinIndicesIgpmUrl,
  getFinReajusteSimularUrl,
  getFinLancamentoByIdUrl,
  getFinLancamentosListUrl,
  getFinPlanoContasSaldosUrl,
  getFinConciliacaoExtratoUrl,
  getFinConciliacaoFecharUrl,
  getFinConciliacaoMatchingUrl,
  getFinConciliacaoMovimentosSistemaUrl,
  getFinConciliacaoRelatorioUrl,
  getFinConciliacaoSessaoUrl,
  getFinConciliacaoSessoesUrl,
  getFinUnicredWebhookConciliacaoByIdUrl,
  getFinUnicredWebhookConciliacaoCriarTituloUrl,
  getFinUnicredWebhookConciliacaoIgnorarUrl,
  getFinUnicredWebhookConciliacaoListUrl,
  getFinUnicredWebhookConciliacaoPendentesUrl,
  getFinUnicredWebhookConciliacaoReprocessarUrl,
  getFinUnicredWebhookConciliacaoVincularUrl,
  getFinPorImovelByIdUrl,
  getFinPorImovelListUrl,
  getFinTituloByIdUrl,
  getFinTituloCancelarUrl,
  getFinTituloSincronizarStatusUrl,
  getFinTituloHistoricoUrl,
  getFinTituloLiquidarUrl,
  getFinTituloPdfUrl,
  getFinTituloRegistrarUrl,
  getFinTituloWhatsAppCobrancaParcelaUrl,
  getFinTitulosIdsElegiveisWhatsAppUrl,
  getFinTitulosWhatsAppCobrancaParcelaLoteUrl,
  getFinTitulosEmailCobrancaParcelaLoteUrl,
  getFinTitulosListUrl,
  getFinTitulosLoteUrl,
  getFinTitulosIdsElegiveisRegistroUrl,
  getFinTitulosPdfLoteUrl,
  getFinTitulosMarcarVencidosUrl,
  getFinTitulosRegistrarLoteUrl,
  getFinTitulosUrl,
  getFinTituloAvulsoUrl,
  getFinTituloContextoLoteUrl,
  getFinTituloLegadoManualQuadrasUrl,
  getFinTituloLegadoManualLotesUrl,
  getFinTituloLegadoManualUrl,
  getFinTituloLegadoManualByIdUrl,
  getFinCobrancaGruposUrl,
  getFinCobrancaGruposSugestoesUrl,
  getFinCobrancaGrupoByIdUrl,
  getFinCobrancaGrupoSimularUrl,
  getFinCobrancaGrupoEmitirUrl,
  getFinCobrancaGrupoLiderUrl,
  getFinCobrancaGrupoMembrosUrl,
  getFinCobrancaGrupoDesativarUrl,
  getImoveisEmpreendimentosUrl,
  getImoveisListUrl,
  getImoveisQuadrasUrl,
} from "./api-config";
import type { SpringPage } from "./spring-page";

/** Situação 3 — Vendido (sc_grl.tbl_dmn ST_IMV). */
const SITUACAO_VENDIDO = 3;

export type TituloCobrancaStatus =
  | "RASCUNHO"
  | "AGUARDANDO_REGISTRO"
  | "REGISTRADO"
  | "EMITIDO"
  | "PAGO"
  | "VENCIDO"
  | "CANCELADO"
  | "BAIXA_SOLICITADA"
  | "ERRO_REGISTRO"
  | "EM_CONCILIACAO";

export interface TituloCobranca {
  id: string;
  contratoId: number;
  numeroContrato?: string | null;
  numeroParcela: number;
  convenioId: string;
  convenioNome: string;
  nossoNumero: string;
  linhaDigitavel?: string | null;
  codigoBarras?: string | null;
  pixCopiaCola?: string | null;
  idExternoBanco?: string | null;
  urlBoleto?: string | null;
  codigoInstrucaoBaixa?: string | null;
  status: TituloCobrancaStatus;
  valorNominal: number;
  valorPago?: number | null;
  valorJuros?: number | null;
  valorMulta?: number | null;
  valorTarifa?: number | null;
  vencimento: string;
  dataPagamento?: string | null;
  versao: number;
  cadastroEm: string;
  alteradoEm: string;
  usuarioNome?: string | null;
  legado?: boolean;
}

export interface TituloHistoricoItem {
  id: string;
  statusAnterior?: TituloCobrancaStatus | null;
  statusNovo: TituloCobrancaStatus;
  observacao?: string | null;
  payloadResumo?: string | null;
  usuarioId?: number | null;
  usuarioNome?: string | null;
  eventoEm: string;
}

export interface TituloRegistrarLoteItem {
  tituloId: string;
  sucesso: boolean;
  mensagem?: string | null;
  titulo?: TituloCobranca | null;
}

export interface TituloRegistrarLoteResult {
  total: number;
  registrados: number;
  falhas: number;
  itens: TituloRegistrarLoteItem[];
}

export interface TituloIdsElegiveisRegistro {
  ids: string[];
  total: number;
}

export interface TituloWhatsAppCobrancaResult {
  enfileirado: boolean;
  filaId?: number | null;
  mensagem?: string | null;
}

export interface TituloWhatsAppCobrancaLoteGrupo {
  contratoId: number;
  quantidadeTitulos: number;
  enfileirado: boolean;
  filaId?: number | null;
  mensagem?: string | null;
}

export interface TituloWhatsAppCobrancaLoteResult {
  totalTitulos: number;
  titulosIgnorados: number;
  mensagensEnfileiradas: number;
  mensagensFalhas: number;
  grupos: TituloWhatsAppCobrancaLoteGrupo[];
}

export interface TituloEmailCobrancaLoteGrupo {
  contratoId: number;
  quantidadeTitulos: number;
  enfileirado: boolean;
  filaId?: number | null;
  mensagem?: string | null;
}

export interface TituloEmailCobrancaLoteResult {
  totalTitulos: number;
  titulosIgnorados: number;
  emailsEnfileirados: number;
  emailsFalhas: number;
  grupos: TituloEmailCobrancaLoteGrupo[];
}

export interface TituloPdfLoteItem {
  tituloId: string;
  sucesso: boolean;
  mensagem?: string | null;
}

export interface TituloPdfLoteResult {
  total: number;
  sucesso: number;
  falhas: number;
  itens: TituloPdfLoteItem[];
}

export type TituloPdfLoteDownload =
  | { ok: true; filename: string }
  | { ok: false; resultado: TituloPdfLoteResult };

export interface ConvenioBanco {
  id: string;
  nome: string;
  codigoBanco: string;
  agencia?: string | null;
  conta?: string | null;
  carteira?: string | null;
  variacaoCarteira?: string | null;
  cooperativa?: string | null;
  nomeBeneficiario?: string | null;
  beneficiario?: string | null;
  tipoIntegracao: string;
  ativo: boolean;
}

export interface IndiceEconomicoMensal {
  id: number;
  tipoIndice: string;
  ano: number;
  mes: number;
  anoMes: number;
  variacaoMensal: number | null;
  variacao12Meses: number | null;
  numeroIndice: number | null;
  sincronizadoEm: string;
}

export type IndiceSyncExecucao = "INCREMENTAL" | "BACKFILL" | "MANUAL" | "AGENDADO";
export type IndiceSyncStatus = "SUCESSO" | "ERRO" | "PARCIAL";

export interface ReajusteSimulacaoResponse {
  tipoIndice: string;
  valorBase: number;
  periodoReferencia: string;
  mesesAcumulados: number;
  percentualIndice: number | null;
  percentualAplicado: number | null;
  limiteReajusteAnual: number | null;
  valorReajustado: number | null;
  metodoCalculo: string;
  avisos: string[];
  detalheMensal: {
    ano: number;
    mes: number;
    variacaoMensal: number | null;
    variacao12Meses: number | null;
  }[];
}

export interface IndiceEconomicoSyncResult {
  logId: string;
  tipoIndice: string;
  execucao: IndiceSyncExecucao;
  status: IndiceSyncStatus;
  registrosNovos: number;
  registrosAtualizados: number;
  inicioEm: string;
  fimEm: string | null;
  urlSidra: string | null;
  erro: string | null;
}

export interface FinDashboardResumo {
  totalTitulos: number;
  titulosAbertos: number;
  titulosPagos: number;
  titulosVencidos: number;
  valorNominalAberto: number;
}

export interface FinFluxoReceitaMes {
  mes: string;
  recebidoLiquido: number;
  emitido: number;
  inadimplencia: number;
  taxas: number;
}

export interface FinFluxoReceitaEmpreendimento {
  empreendimento: string;
  mesInicial: string;
  mesFinal: string;
  meses: FinFluxoReceitaMes[];
}

export interface FinFluxoReceita {
  mesInicial: string | null;
  mesFinal: string | null;
  empreendimentos: FinFluxoReceitaEmpreendimento[];
}

export interface TituloContextoLote {
  imovelId: number;
  contratoId: number;
  numeroContrato?: string | null;
  empreendimento: string;
  quadra: string;
  lote: number;
  numeroParcela: number;
  valorNominal?: number | null;
  diaVencimentoMensal: number;
  vencimentoSugerido: string;
  primeiroTituloLote: boolean;
  dataPrimeiraParcelaContrato: string;
  referenciaVencimento: string;
  parcelaReajusteLimite: number;
  maxParcelasPermitidas: number;
  tipoCorrecaoAnual?: string | null;
  quantidadeParcelasFracionadas?: number | null;
  valorFracionadoVendedora?: number | null;
  valorParcela?: number | null;
  convenioId?: string | null;
  convenioNome?: string | null;
  avisoConvenio?: string | null;
  avisoValorNominal?: string | null;
}

export interface EmpreendimentoConvenioItem {
  nomeEmpreendimento: string;
  convenioId: string | null;
  convenioNome: string | null;
  convenioAtivo: boolean;
}

/** Rótulo exibido ao utilizador — prefere o número do contrato em vez do ID interno. */
export function formatContratoRef(
  numeroContrato?: string | null,
  contratoId?: number | null,
): string {
  const numero = numeroContrato?.trim();
  if (numero) return numero;
  if (contratoId != null) return String(contratoId);
  return "—";
}

export interface ImovelLoteOption {
  id: number;
  quadra: string | null;
  lote: number | null;
}

export interface TituloCobrancaCreate {
  contratoId: number;
  numeroParcela: number;
  convenioId?: string;
  valorNominal: number;
  vencimento: string;
}

export interface TituloAvulsoEmitir {
  contratoId: number;
  numeroParcela: number;
  convenioId: string;
  valorNominal: number;
  vencimento: string;
}

export interface CobrancaGrupoMembro {
  contratoId: number;
  numeroContrato?: string | null;
  quadra?: string | null;
  lote?: number | null;
  ordem: number;
  maxParcelaAtiva: number;
  proximaParcela: number;
}

export interface CobrancaGrupo {
  id: string;
  numeroContratoBase: string;
  contratanteId: number;
  contratanteNome?: string | null;
  empreendimento: string;
  contratoLiderId: number;
  ativo: boolean;
  membros: CobrancaGrupoMembro[];
}

export interface CobrancaGrupoSugestaoContrato {
  contratoId: number;
  numeroContrato?: string | null;
  quadra?: string | null;
  lote?: number | null;
  maxParcelaAtiva: number;
  proximaParcela: number;
}

export interface CobrancaGrupoSugestao {
  numeroContratoBase: string;
  contratanteId: number;
  contratanteNome?: string | null;
  empreendimento: string;
  contratos: CobrancaGrupoSugestaoContrato[];
  jaPossuiGrupoAtivo: boolean;
}

export interface CobrancaGrupoEmitirMembro {
  contratoId: number;
  numeroParcela: number;
  /** Valor do lote quando o cálculo automático falha (ex.: série IGPM incompleta). */
  valorNominal?: number;
}

export interface CobrancaGrupoEmitirPayload {
  convenioId: string;
  vencimento: string;
  membros: CobrancaGrupoEmitirMembro[];
}

export interface CobrancaGrupoEmitirSimulacaoItem {
  contratoId: number;
  numeroContrato?: string | null;
  quadra?: string | null;
  lote?: number | null;
  numeroParcela: number;
  valorNominal: number | null;
  aviso?: string | null;
}

export interface CobrancaGrupoEmitirSimulacao {
  contratoLiderId: number;
  numeroParcelaLider: number;
  valorTotal: number;
  prontoParaEmitir: boolean;
  itens: CobrancaGrupoEmitirSimulacaoItem[];
}

export interface CobrancaGrupoEmitirResult {
  titulo: TituloCobranca;
  valorTotal: number;
  rateios: CobrancaGrupoEmitirSimulacaoItem[];
}

export interface TituloCobrancaLoteCreate {
  contratoId: number;
  convenioId?: string;
  quantidadeParcelas: number;
  /** Vencimento da 1ª parcela desta emissão; demais parcelas seguem o dia mensal do contrato. */
  dataPrimeiraParcela?: string;
}

export interface TituloCobrancaLoteResult {
  quantidadeCriada: number;
  parcelaInicial: number;
  parcelaFinal: number;
  titulos: TituloCobranca[];
}

export type TituloLegadoManualStatus =
  | "EMITIDO"
  | "REGISTRADO"
  | "PAGO"
  | "VENCIDO"
  | "CANCELADO";

export interface TituloLegadoManualCreate {
  contratoId: number;
  numeroParcela: number;
  convenioId?: string;
  valorNominal: number;
  vencimento: string;
  statusFinal: TituloLegadoManualStatus;
  nossoNumero?: string;
  linhaDigitavel?: string;
  codigoBarras?: string;
  idExternoBanco?: string;
  urlBoleto?: string;
  valorPago?: number;
  dataPagamento?: string;
  valorJuros?: number;
  valorMulta?: number;
  valorDesconto?: number;
  valorTarifa?: number;
  observacao?: string;
}

export type TituloLegadoManualUpdate = Omit<TituloLegadoManualCreate, "contratoId" | "convenioId">;

export interface TituloLiquidarPayload {
  valorPago: number;
  dataPagamento: string;
  valorJuros?: number;
  valorMulta?: number;
  valorDesconto?: number;
  valorTarifa?: number;
  canal?: string;
}

export type PlanoContaNatureza = "ATIVO" | "PASSIVO" | "RECEITA" | "DESPESA";

export interface PlanoContaSaldo {
  id: string;
  codigo: string;
  nome: string;
  natureza: PlanoContaNatureza | string;
  totalDebito: number;
  totalCredito: number;
  saldo: number;
  quantidadeLancamentos: number;
}

export interface PlanoContaSaldosFilters {
  competenciaDe?: string;
  competenciaAte?: string;
  q?: string;
  apenasComMovimento?: boolean;
}

export interface LancamentoLinha {
  id: string;
  contaCodigo: string;
  contaNome: string;
  contaNatureza: string;
  debito: number;
  credito: number;
}

export interface LancamentoContabil {
  id: string;
  tituloId?: string | null;
  contratoId?: number | null;
  numeroContrato?: string | null;
  numeroParcela?: number | null;
  competencia: string;
  historico: string;
  status: string;
  cadastroEm: string;
  totalDebito: number;
  totalCredito: number;
  linhas: LancamentoLinha[];
}

export interface LancamentosListFilters {
  contrato?: string;
  conta?: string;
  imovelId?: number;
  tituloId?: string;
  competenciaDe?: string;
  competenciaAte?: string;
  q?: string;
}

export interface FinImovelResumo {
  imovelId: number;
  empreendimento: string;
  quadra: string | null;
  lote: number | null;
  contratoId: number | null;
  numeroContrato: string | null;
  contratanteNome: string | null;
  totalLancamentos: number;
  totalPagamentos: number;
  totalRecebido: number;
  primeiraCompetencia: string | null;
  ultimaCompetencia: string | null;
}

export interface FinPorImovelListFilters {
  empreendimento?: string;
  quadra?: string;
  lote?: number;
  q?: string;
}

export type ConciliacaoSessaoStatus = "ABERTA" | "FECHADA";

export type ConciliacaoItemStatus =
  | "CONCILIADO"
  | "DIVERGENCIA_VALOR"
  | "SO_BANCO"
  | "SO_SISTEMA"
  | "EM_ANALISE";

export interface ConciliacaoItem {
  id: string;
  status: ConciliacaoItemStatus;
  diferenca: number;
  justificativa?: string | null;
  extratoValor?: number | null;
  extratoTipo?: string | null;
  extratoHistorico?: string | null;
  sistemaValor?: number | null;
  sistemaTipo?: string | null;
  sistemaHistorico?: string | null;
  pagamentoId?: string | null;
}

export interface ConciliacaoSessao {
  id: string;
  convenioId: string;
  convenioNome: string;
  dataReferencia: string;
  status: ConciliacaoSessaoStatus;
  saldoAberturaBanco?: number | null;
  saldoAberturaSistema?: number | null;
  totalCreditoBanco: number;
  totalDebitoBanco: number;
  totalCreditoSistema: number;
  totalDebitoSistema: number;
  itensConciliados: number;
  itensPendentes: number;
  relatorioHash?: string | null;
  itens: ConciliacaoItem[];
}

export interface ConciliacaoSessaoCreate {
  convenioId: string;
  dataReferencia: string;
  saldoAberturaBanco?: number;
  saldoAberturaSistema?: number;
  observacao?: string;
}

export type UnicredWebhookConciliacaoStatus =
  | "PENDENTE"
  | "AUTO"
  | "VINCULADO"
  | "CRIADO"
  | "IGNORADO"
  | "NAO_APLICAVEL";

export interface UnicredWebhookConciliacaoResumo {
  id: string;
  uuidRequisicaoWebhook?: string | null;
  codigoMovimento?: string | null;
  codigoMovimentoDescricao?: string | null;
  uuidTituloExterno?: string | null;
  statusConciliacao?: UnicredWebhookConciliacaoStatus | null;
  dataRecebimento: string;
  erro?: string | null;
  valorTitulo?: number | null;
  valorRecebido?: number | null;
  dataLiquidacao?: string | null;
  nossoNumero?: string | null;
  pagadorNome?: string | null;
  pagadorDocumento?: string | null;
  tituloVinculadoId?: string | null;
  liquidacao: boolean;
}

export interface UnicredWebhookConciliacaoDetalhe {
  resumo: UnicredWebhookConciliacaoResumo;
  payloadJson?: string | null;
  observacaoConciliacao?: string | null;
  usuarioConciliacaoNome?: string | null;
  sugestoesTitulos: TituloCobranca[];
}

export interface UnicredWebhookVincularPayload {
  tituloId: string;
  observacao?: string;
}

export interface UnicredWebhookCriarTituloPayload {
  contratoId: number;
  numeroParcela: number;
  convenioId?: string;
  valorNominal?: number;
  vencimento?: string;
  observacao?: string;
}

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message ?? `Erro HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export type FinFetchOptions = {
  /** Evita o spinner global; usar com loading local (ex.: botão Atualizar). */
  skipLoading?: boolean;
};

export const finService = {
  async listTitulos(
    page = 0,
    size = 20,
    filters?: {
      status?: string;
      contratoId?: number;
      imovelId?: number;
      vencimentoDe?: string;
      vencimentoAte?: string;
      cadastroDe?: string;
      cadastroAte?: string;
      pagamentoDe?: string;
      pagamentoAte?: string;
      empreendimento?: string;
      quadra?: string;
      lote?: number;
      contrato?: string;
      nome?: string;
      cpf?: string;
      nossoNumero?: string;
    },
    options?: FinFetchOptions,
  ): Promise<SpringPage<TituloCobranca>> {
    const url = getFinTitulosListUrl(page, size, {
      status: filters?.status,
      contratoId: filters?.contratoId,
      imovelId: filters?.imovelId,
      vencimentoDe: filters?.vencimentoDe,
      vencimentoAte: filters?.vencimentoAte,
      cadastroDe: filters?.cadastroDe,
      cadastroAte: filters?.cadastroAte,
      pagamentoDe: filters?.pagamentoDe,
      pagamentoAte: filters?.pagamentoAte,
      empreendimento: filters?.empreendimento,
      quadra: filters?.quadra,
      lote: filters?.lote,
      contrato: filters?.contrato,
      nome: filters?.nome,
      cpf: filters?.cpf,
      nossoNumero: filters?.nossoNumero,
    });
    const res = await apiFetch(url, { skipLoading: options?.skipLoading });
    return parseJson(res);
  },

  async getTitulo(id: string): Promise<TituloCobranca> {
    const res = await apiFetch(getFinTituloByIdUrl(id));
    return parseJson(res);
  },

  async listQuadrasVendidas(): Promise<string[]> {
    const res = await apiFetch(getImoveisQuadrasUrl(3));
    return parseJson(res);
  },

  async listEmpreendimentos(options?: FinFetchOptions): Promise<string[]> {
    const res = await apiFetch(getImoveisEmpreendimentosUrl(), {
      skipLoading: options?.skipLoading,
    });
    return parseJson(res);
  },

  async listQuadrasImovel(
    opts: { empreendimento: string },
    options?: FinFetchOptions,
  ): Promise<string[]> {
    const url = getImoveisListUrl(
      0,
      500,
      undefined,
      undefined,
      SITUACAO_VENDIDO,
      opts.empreendimento,
    );
    const res = await apiFetch(url, { skipLoading: options?.skipLoading });
    const page = await parseJson<SpringPage<{ quadra?: string | null }>>(res);
    const quadras = new Set<string>();
    for (const item of page.content ?? []) {
      if (item.quadra) quadras.add(item.quadra);
    }
    return [...quadras].sort((a, b) => a.localeCompare(b, "pt-BR"));
  },

  async listLotesImovel(
    opts: { empreendimento: string; quadra: string },
    options?: FinFetchOptions,
  ): Promise<number[]> {
    const url = getImoveisListUrl(
      0,
      500,
      undefined,
      opts.quadra,
      SITUACAO_VENDIDO,
      opts.empreendimento,
    );
    const res = await apiFetch(url, { skipLoading: options?.skipLoading });
    const page = await parseJson<SpringPage<{ lote?: number | null }>>(res);
    const lotes = new Set<number>();
    for (const item of page.content ?? []) {
      if (item.lote != null) lotes.add(item.lote);
    }
    return [...lotes].sort((a, b) => a - b);
  },

  async listLotesVendidosDaQuadra(quadra: string): Promise<ImovelLoteOption[]> {
    const url = getImoveisListUrl(0, 500, undefined, quadra, 3);
    const res = await apiFetch(url);
    const page = await parseJson<SpringPage<ImovelLoteOption>>(res);
    return (page.content ?? []).slice().sort((a, b) => (a.lote ?? 0) - (b.lote ?? 0));
  },

  async contextoLote(
    empreendimento: string,
    quadra: string,
    lote: number,
  ): Promise<TituloContextoLote> {
    const res = await apiFetch(getFinTituloContextoLoteUrl(empreendimento, quadra, lote));
    return parseJson(res);
  },

  /** Quadras com contrato assinado — seletor do boleto legado manual. */
  async listQuadrasLegadoManual(
    empreendimento: string,
    options?: FinFetchOptions,
  ): Promise<string[]> {
    const res = await apiFetch(getFinTituloLegadoManualQuadrasUrl(empreendimento), {
      skipLoading: options?.skipLoading,
    });
    return parseJson(res);
  },

  /** Lotes com contrato assinado — seletor do boleto legado manual. */
  async listLotesLegadoManual(
    opts: { empreendimento: string; quadra: string },
    options?: FinFetchOptions,
  ): Promise<number[]> {
    const res = await apiFetch(
      getFinTituloLegadoManualLotesUrl(opts.empreendimento, opts.quadra),
      { skipLoading: options?.skipLoading },
    );
    return parseJson(res);
  },

  async criarTituloLegadoManual(body: TituloLegadoManualCreate): Promise<TituloCobranca> {
    const res = await apiFetch(getFinTituloLegadoManualUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return parseJson(res);
  },

  async atualizarTituloLegadoManual(
    id: string,
    body: TituloLegadoManualUpdate,
  ): Promise<TituloCobranca> {
    const res = await apiFetch(getFinTituloLegadoManualByIdUrl(id), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return parseJson(res);
  },

  async emitirTituloAvulso(
    body: TituloAvulsoEmitir,
    idempotencyKey?: string,
  ): Promise<TituloCobranca> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
    const res = await apiFetch(getFinTituloAvulsoUrl(), {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    return parseJson(res);
  },

  async criarTitulo(
    body: TituloCobrancaCreate,
    idempotencyKey?: string,
  ): Promise<TituloCobranca> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
    const res = await apiFetch(getFinTitulosUrl(), {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    return parseJson(res);
  },

  async criarTitulosEmLote(body: TituloCobrancaLoteCreate): Promise<TituloCobrancaLoteResult> {
    const res = await apiFetch(getFinTitulosLoteUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return parseJson(res);
  },

  async registrar(id: string): Promise<TituloCobranca> {
    const res = await apiFetch(getFinTituloRegistrarUrl(id), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    return parseJson(res);
  },

  async listTitulosIdsElegiveisRegistro(
    filters?: {
      status?: string;
      contratoId?: number;
      imovelId?: number;
      vencimentoDe?: string;
      vencimentoAte?: string;
      cadastroDe?: string;
      cadastroAte?: string;
      pagamentoDe?: string;
      pagamentoAte?: string;
      empreendimento?: string;
      quadra?: string;
      lote?: number;
      contrato?: string;
      nome?: string;
      cpf?: string;
      nossoNumero?: string;
    },
    options?: FinFetchOptions,
  ): Promise<TituloIdsElegiveisRegistro> {
    const url = getFinTitulosIdsElegiveisRegistroUrl({
      status: filters?.status,
      contratoId: filters?.contratoId,
      imovelId: filters?.imovelId,
      vencimentoDe: filters?.vencimentoDe,
      vencimentoAte: filters?.vencimentoAte,
      cadastroDe: filters?.cadastroDe,
      cadastroAte: filters?.cadastroAte,
      pagamentoDe: filters?.pagamentoDe,
      pagamentoAte: filters?.pagamentoAte,
      empreendimento: filters?.empreendimento,
      quadra: filters?.quadra,
      lote: filters?.lote,
      contrato: filters?.contrato,
      nome: filters?.nome,
      cpf: filters?.cpf,
      nossoNumero: filters?.nossoNumero,
    });
    const res = await apiFetch(url, { skipLoading: options?.skipLoading });
    return parseJson(res);
  },

  async registrarTitulosEmLote(tituloIds: string[]): Promise<TituloRegistrarLoteResult> {
    const res = await apiFetch(getFinTitulosRegistrarLoteUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tituloIds }),
    });
    return parseJson(res);
  },

  /** EMITIDO com vencimento anterior a hoje passam para VENCIDO (mesmo job diário da API). */
  async marcarTitulosVencidos(): Promise<{ marcados: number }> {
    const res = await apiFetch(getFinTitulosMarcarVencidosUrl(), { method: "POST" });
    return parseJson(res);
  },

  async enfileirarWhatsAppCobrancaParcela(id: string): Promise<TituloWhatsAppCobrancaResult> {
    const res = await apiFetch(getFinTituloWhatsAppCobrancaParcelaUrl(id), { method: "POST" });
    return parseJson(res);
  },

  async listTitulosIdsElegiveisWhatsApp(
    filters?: {
      status?: string;
      contratoId?: number;
      imovelId?: number;
      vencimentoDe?: string;
      vencimentoAte?: string;
      cadastroDe?: string;
      cadastroAte?: string;
      pagamentoDe?: string;
      pagamentoAte?: string;
      empreendimento?: string;
      quadra?: string;
      lote?: number;
      contrato?: string;
      nome?: string;
      cpf?: string;
      nossoNumero?: string;
    },
    options?: FinFetchOptions,
  ): Promise<TituloIdsElegiveisRegistro> {
    const url = getFinTitulosIdsElegiveisWhatsAppUrl({
      status: filters?.status,
      contratoId: filters?.contratoId,
      imovelId: filters?.imovelId,
      vencimentoDe: filters?.vencimentoDe,
      vencimentoAte: filters?.vencimentoAte,
      cadastroDe: filters?.cadastroDe,
      cadastroAte: filters?.cadastroAte,
      pagamentoDe: filters?.pagamentoDe,
      pagamentoAte: filters?.pagamentoAte,
      empreendimento: filters?.empreendimento,
      quadra: filters?.quadra,
      lote: filters?.lote,
      contrato: filters?.contrato,
      nome: filters?.nome,
      cpf: filters?.cpf,
      nossoNumero: filters?.nossoNumero,
    });
    const res = await apiFetch(url, { skipLoading: options?.skipLoading });
    return parseJson(res);
  },

  async enfileirarWhatsAppCobrancaParcelaEmLote(
    tituloIds: string[],
  ): Promise<TituloWhatsAppCobrancaLoteResult> {
    const res = await apiFetch(getFinTitulosWhatsAppCobrancaParcelaLoteUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tituloIds }),
    });
    return parseJson(res);
  },

  async enfileirarEmailCobrancaParcelaEmLote(
    tituloIds: string[],
  ): Promise<TituloEmailCobrancaLoteResult> {
    const res = await apiFetch(getFinTitulosEmailCobrancaParcelaLoteUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tituloIds }),
    });
    return parseJson(res);
  },

  async cancelar(
    id: string,
    payload?: { motivo?: string; justificativa?: string; valorRecebido?: number },
  ): Promise<TituloCobranca> {
    const res = await apiFetch(getFinTituloCancelarUrl(id), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload ?? {}),
    });
    return parseJson(res);
  },

  async sincronizarStatus(id: string): Promise<TituloCobranca> {
    const res = await apiFetch(getFinTituloSincronizarStatusUrl(id), { method: "POST" });
    return parseJson(res);
  },

  async liquidar(id: string, body: TituloLiquidarPayload): Promise<TituloCobranca> {
    const res = await apiFetch(getFinTituloLiquidarUrl(id), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return parseJson(res);
  },

  async historico(id: string): Promise<TituloHistoricoItem[]> {
    const res = await apiFetch(getFinTituloHistoricoUrl(id));
    return parseJson(res);
  },

  async downloadPdf(
    id: string,
    urlBoleto?: string | null,
    status?: TituloCobrancaStatus,
  ): Promise<void> {
    await baixarBoletoPdf(id, { urlBoleto, pdfUrl: getFinTituloPdfUrl(id), status });
  },

  async downloadPdfLote(tituloIds: string[]): Promise<TituloPdfLoteDownload> {
    const res = await apiFetch(getFinTitulosPdfLoteUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tituloIds }),
    });
    const contentType = res.headers.get("content-type") ?? "";
    if (res.ok && contentType.includes("pdf")) {
      const blob = await res.blob();
      const filename =
        tryGetFilenameFromDisposition(res.headers.get("content-disposition")) ??
        `boletos-lote-${tituloIds.length}.pdf`;
      baixarBlob(blob, filename);
      return { ok: true, filename };
    }
    const text = await res.text().catch(() => "");
    if (res.status === 422 && text.trim()) {
      try {
        const resultado = JSON.parse(text) as TituloPdfLoteResult;
        if (Array.isArray(resultado.itens)) {
          return { ok: false, resultado };
        }
      } catch {
        // resposta não estruturada
      }
    }
    let detail = "Erro ao baixar PDF em lote";
    if (text.trim()) {
      try {
        const errBody = JSON.parse(text) as { message?: string };
        if (errBody.message?.trim()) {
          detail = errBody.message.trim();
        } else {
          detail = text.trim();
        }
      } catch {
        detail = text.trim();
      }
    }
    throw new Error(detail);
  },

  /** Somente convênios ativos (seleção em títulos, conciliação, etc.). */
  async listConvenios(): Promise<ConvenioBanco[]> {
    const res = await apiFetch(getFinConveniosUrl());
    return parseJson(res);
  },

  /** Todos os convênios para gestão do flag ativo (admin). */
  async listConveniosGestao(): Promise<ConvenioBanco[]> {
    const res = await apiFetch(getFinConveniosGestaoUrl());
    return parseJson(res);
  },

  async setConvenioAtivo(id: string, ativo: boolean): Promise<ConvenioBanco> {
    const res = await apiFetch(getFinConvenioAtivoUrl(id), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo }),
    });
    return parseJson(res);
  },

  async listEmpreendimentoConvenios(): Promise<EmpreendimentoConvenioItem[]> {
    const res = await apiFetch(getFinConveniosEmpreendimentosUrl());
    return parseJson(res);
  },

  async vincularEmpreendimentoConvenio(
    nomeEmpreendimento: string,
    convenioId: string,
  ): Promise<EmpreendimentoConvenioItem> {
    const res = await apiFetch(getFinConveniosEmpreendimentosUrl(), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nomeEmpreendimento, convenioId }),
    });
    return parseJson(res);
  },

  async removerVinculoEmpreendimentoConvenio(nomeEmpreendimento: string): Promise<void> {
    const res = await apiFetch(getFinConvenioEmpreendimentoUrl(nomeEmpreendimento), {
      method: "DELETE",
    });
    if (!res.ok) {
      await parseJson(res);
    }
  },

  async dashboardResumo(): Promise<FinDashboardResumo> {
    const res = await apiFetch(getFinDashboardResumoUrl());
    return parseJson(res);
  },

  async fluxoReceita(options?: FinFetchOptions): Promise<FinFluxoReceita> {
    const res = await apiFetch(getFinFluxoReceitaUrl(), { skipLoading: options?.skipLoading });
    return parseJson(res);
  },

  async listLancamentos(
    page = 0,
    size = 20,
    filters?: LancamentosListFilters,
    options?: FinFetchOptions,
  ): Promise<SpringPage<LancamentoContabil>> {
    const url = getFinLancamentosListUrl(page, size, filters);
    const res = await apiFetch(url, { skipLoading: options?.skipLoading });
    return parseJson(res);
  },

  async getLancamento(id: string): Promise<LancamentoContabil> {
    const res = await apiFetch(getFinLancamentoByIdUrl(id));
    return parseJson(res);
  },

  async listPorImovel(
    page = 0,
    size = 20,
    filters?: FinPorImovelListFilters,
    options?: FinFetchOptions,
  ): Promise<SpringPage<FinImovelResumo>> {
    const url = getFinPorImovelListUrl(page, size, filters);
    const res = await apiFetch(url, { skipLoading: options?.skipLoading });
    return parseJson(res);
  },

  async getResumoImovel(imovelId: number): Promise<FinImovelResumo> {
    const res = await apiFetch(getFinPorImovelByIdUrl(imovelId));
    return parseJson(res);
  },

  async listPlanoContaSaldos(
    filters?: PlanoContaSaldosFilters,
    options?: FinFetchOptions,
  ): Promise<PlanoContaSaldo[]> {
    const res = await apiFetch(getFinPlanoContasSaldosUrl(filters), {
      skipLoading: options?.skipLoading,
    });
    return parseJson(res);
  },

  async abrirConciliacao(payload: ConciliacaoSessaoCreate): Promise<ConciliacaoSessao> {
    const res = await apiFetch(getFinConciliacaoSessoesUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return parseJson(res);
  },

  async getConciliacao(sessaoId: string, options?: FinFetchOptions): Promise<ConciliacaoSessao> {
    const res = await apiFetch(getFinConciliacaoSessaoUrl(sessaoId), {
      skipLoading: options?.skipLoading,
    });
    return parseJson(res);
  },

  async recarregarConciliacaoSistema(sessaoId: string): Promise<ConciliacaoSessao> {
    const res = await apiFetch(getFinConciliacaoMovimentosSistemaUrl(sessaoId), { method: "POST" });
    return parseJson(res);
  },

  async importarConciliacaoExtrato(sessaoId: string, file: File): Promise<ConciliacaoSessao> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await apiFetch(getFinConciliacaoExtratoUrl(sessaoId), {
      method: "POST",
      body: fd,
    });
    return parseJson(res);
  },

  async matchingConciliacao(sessaoId: string): Promise<ConciliacaoSessao> {
    const res = await apiFetch(getFinConciliacaoMatchingUrl(sessaoId), { method: "POST" });
    return parseJson(res);
  },

  async fecharConciliacao(
    sessaoId: string,
    saldos?: { saldoFechamentoBanco?: number; saldoFechamentoSistema?: number },
  ): Promise<ConciliacaoSessao> {
    const res = await apiFetch(getFinConciliacaoFecharUrl(sessaoId), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(saldos ?? {}),
    });
    return parseJson(res);
  },

  async downloadConciliacaoRelatorio(sessaoId: string): Promise<void> {
    const url = getFinConciliacaoRelatorioUrl(sessaoId);
    const res = await apiFetch(url);
    const data = await parseJson<Record<string, unknown>>(res);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `conciliacao-${sessaoId}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  },

  async listUnicredWebhookConciliacao(
    page = 0,
    size = 20,
    status?: UnicredWebhookConciliacaoStatus,
    options?: FinFetchOptions,
  ): Promise<SpringPage<UnicredWebhookConciliacaoResumo>> {
    const res = await apiFetch(getFinUnicredWebhookConciliacaoListUrl(page, size, status), {
      skipLoading: options?.skipLoading,
    });
    return parseJson(res);
  },

  async contagemUnicredWebhookPendentes(
    options?: FinFetchOptions,
  ): Promise<{ pendentes: number }> {
    const res = await apiFetch(getFinUnicredWebhookConciliacaoPendentesUrl(), {
      skipLoading: options?.skipLoading,
    });
    return parseJson(res);
  },

  async getUnicredWebhookConciliacao(
    id: string,
    options?: FinFetchOptions,
  ): Promise<UnicredWebhookConciliacaoDetalhe> {
    const res = await apiFetch(getFinUnicredWebhookConciliacaoByIdUrl(id), {
      skipLoading: options?.skipLoading,
    });
    return parseJson(res);
  },

  async vincularUnicredWebhook(
    id: string,
    payload: UnicredWebhookVincularPayload,
  ): Promise<TituloCobranca> {
    const res = await apiFetch(getFinUnicredWebhookConciliacaoVincularUrl(id), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return parseJson(res);
  },

  async criarTituloUnicredWebhook(
    id: string,
    payload: UnicredWebhookCriarTituloPayload,
  ): Promise<TituloCobranca> {
    const res = await apiFetch(getFinUnicredWebhookConciliacaoCriarTituloUrl(id), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return parseJson(res);
  },

  async ignorarUnicredWebhook(id: string, observacao?: string): Promise<void> {
    const res = await apiFetch(getFinUnicredWebhookConciliacaoIgnorarUrl(id), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ observacao: observacao ?? null }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(err.message ?? `Erro HTTP ${res.status}`);
    }
  },

  async reprocessarUnicredWebhook(id: string): Promise<TituloCobranca> {
    const res = await apiFetch(getFinUnicredWebhookConciliacaoReprocessarUrl(id), { method: "POST" });
    return parseJson(res);
  },

  async listIndicesIpca(opts?: { desde?: string; ate?: string }): Promise<IndiceEconomicoMensal[]> {
    const res = await apiFetch(getFinIndicesIpcaUrl(opts));
    return parseJson(res);
  },

  async getIndiceIpcaUltimo(): Promise<IndiceEconomicoMensal> {
    const res = await apiFetch(getFinIndicesIpcaUltimoUrl());
    return parseJson(res);
  },

  async sincronizarIndicesIpca(payload?: {
    desde?: string;
    ate?: string;
  }): Promise<IndiceEconomicoSyncResult> {
    const res = await apiFetch(getFinIndicesIpcaSincronizarUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload ?? {}),
    });
    return parseJson(res);
  },

  async listIndicesIgpm(opts?: { desde?: string; ate?: string }): Promise<IndiceEconomicoMensal[]> {
    const res = await apiFetch(getFinIndicesIgpmUrl(opts));
    return parseJson(res);
  },

  async getIndiceIgpmUltimo(): Promise<IndiceEconomicoMensal> {
    const res = await apiFetch(getFinIndicesIgpmUltimoUrl());
    return parseJson(res);
  },

  async sincronizarIndicesIgpm(payload?: {
    desde?: string;
    ate?: string;
  }): Promise<IndiceEconomicoSyncResult> {
    const res = await apiFetch(getFinIndicesIgpmSincronizarUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload ?? {}),
    });
    return parseJson(res);
  },

  async simularReajusteIndice(payload: {
    tipoIndice: "IGPM" | "IPCA";
    valorBase: number;
    periodoReferencia: string;
    contratoId?: number;
    mesesAcumulados?: number;
  }): Promise<ReajusteSimulacaoResponse> {
    const res = await apiFetch(getFinReajusteSimularUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return parseJson(res);
  },

  async listCobrancaGrupos(options?: FinFetchOptions): Promise<CobrancaGrupo[]> {
    const res = await apiFetch(getFinCobrancaGruposUrl(), { skipLoading: options?.skipLoading });
    return parseJson(res);
  },

  async listCobrancaGruposSugestoes(options?: FinFetchOptions): Promise<CobrancaGrupoSugestao[]> {
    const res = await apiFetch(getFinCobrancaGruposSugestoesUrl(), { skipLoading: options?.skipLoading });
    return parseJson(res);
  },

  async criarCobrancaGrupo(body: {
    numeroContratoBase?: string;
    contratoLiderId: number;
    contratoIds: number[];
  }): Promise<CobrancaGrupo> {
    const res = await apiFetch(getFinCobrancaGruposUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return parseJson(res);
  },

  async atualizarLiderCobrancaGrupo(
    grupoId: string,
    contratoLiderId: number,
  ): Promise<CobrancaGrupo> {
    const res = await apiFetch(getFinCobrancaGrupoLiderUrl(grupoId), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contratoLiderId }),
    });
    return parseJson(res);
  },

  async desativarCobrancaGrupo(grupoId: string): Promise<void> {
    await apiFetch(getFinCobrancaGrupoDesativarUrl(grupoId), { method: "POST" });
  },

  async simularEmissaoCobrancaGrupo(
    grupoId: string,
    body: CobrancaGrupoEmitirPayload,
  ): Promise<CobrancaGrupoEmitirSimulacao> {
    const res = await apiFetch(getFinCobrancaGrupoSimularUrl(grupoId), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return parseJson(res);
  },

  async emitirCobrancaGrupo(
    grupoId: string,
    body: CobrancaGrupoEmitirPayload,
    idempotencyKey?: string,
  ): Promise<CobrancaGrupoEmitirResult> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
    const res = await apiFetch(getFinCobrancaGrupoEmitirUrl(grupoId), {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    return parseJson(res);
  },
};
