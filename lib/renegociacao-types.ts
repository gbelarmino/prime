/** Tipos alinhados a docs/modulo-renegociacao/openapi.yaml */

export type ModalidadeRenegociacao =
  | "T1_PARCELAS_VENCIDAS"
  | "T2_SALDO_DEVEDOR"
  | "T3_COMPLETA"
  | "T4_QUITACAO"
  | "T5_COM_ENTRADA"
  | "T6_JUDICIAL";

export type StatusRenegociacao =
  | "RASCUNHO"
  | "SIMULACAO"
  | "PROPOSTA_PENDENTE"
  | "PROPOSTA_APROVADA"
  | "PROPOSTA_REJEITADA"
  | "AGUARDANDO_DOCUMENTOS"
  | "AGUARDANDO_ASSINATURA"
  | "ASSINADO"
  | "EFETIVACAO_PARCIAL"
  | "EFETIVADO"
  | "CANCELADO"
  | "REVERTIDO";

export type ClassificacaoJuridica =
  | "ADITIVO"
  | "CONFISSAO_DIVIDA"
  | "TERMO_PARCELAMENTO"
  | "TERMO_QUITACAO"
  | "NOVACAO_RISCO"
  | "ACORDO_JUDICIAL";

export type CanalRenegociacao = "DASHBOARD" | "ATENDIMENTO" | "PORTAL";

export type MemoriaCalculo = {
  vlPrincipal?: number;
  vlCorrecao?: number;
  vlJuros?: number;
  vlMulta?: number;
  vlDesconto?: number;
  vlTotal?: number;
  vlValorPresente?: number;
  itens?: MemoriaCalculoItem[];
};

export type MemoriaCalculoItem = {
  tituloId?: string;
  numeroParcela?: number;
  componente?: string;
  valor?: number;
  vencimento?: string;
  diasAtraso?: number;
  valorNominal?: number;
  valorMulta?: number;
  valorJuros?: number;
  valorPresente?: number;
  multaPercentual?: number;
  jurosMensalPercentual?: number;
  memoria?: string;
};

export type ParcelaFluxo = {
  numeroParcela: number;
  vencimento: string;
  /** Valor composto (T1) ou parcela do cronograma */
  valorNominal: number;
  /** T1: parcela vigente antes do acordo */
  valorVigente?: number | null;
  /** T1: parcela do acordo (mora) */
  valorAcordo?: number | null;
};

export type TituloAfetado = {
  id: string;
  numeroParcela: number;
  vencimento: string;
  valorNominal: number;
  status: string;
  /** T1: VENCIDA | VINCENDA_REEMITIDA */
  papel?: string | null;
};

export type RenegociacaoResumo = {
  id: number;
  modalidade: ModalidadeRenegociacao;
  status: StatusRenegociacao;
  versaoPublicadaId?: number | null;
  criadoEm: string;
};

/** Item da listagem global (GET /api/renegociacoes/consulta). */
export type RenegociacaoConsultaItem = {
  id: number;
  contratoId: number;
  numeroContrato: string | null;
  contratanteNome: string;
  modalidade: ModalidadeRenegociacao;
  status: StatusRenegociacao;
  versaoPublicadaId?: number | null;
  criadoEm: string;
  atualizadoEm: string;
  usuarioCriacaoId?: number | null;
  usuarioCriacaoNome?: string | null;
};

/** Cancelável apenas se ainda não foi efetivada (nem já cancelada/revertida). */
export function renegociacaoPodeSerCancelada(status: StatusRenegociacao): boolean {
  return (
    status !== "EFETIVADO" && status !== "CANCELADO" && status !== "REVERTIDO"
  );
}

export type RenegociacaoDetalhe = RenegociacaoResumo & {
  dataAcordo?: string | null;
  motivo?: string | null;
  justificativa?: string | null;
  classificacaoJuridica?: ClassificacaoJuridica | null;
  propostaAtualId?: number | null;
  ultimaSimulacaoId?: number | null;
};

export type CriarRenegociacaoRequest = {
  modalidade: ModalidadeRenegociacao;
  motivo: string;
  justificativa?: string;
  versaoBaseId?: number;
  canal?: CanalRenegociacao;
};

export type SimularRenegociacaoRequest = {
  /** Alinha o processo à modalidade do wizard (evita processo antigo com T1 gravado). */
  modalidade?: ModalidadeRenegociacao;
  parcelaInicial?: number;
  /** Data do acordo — referência para correções (VP, mora). */
  dataAcordo?: string;
  /** @deprecated use dataAcordo */
  dataCorte?: string;
  valorEntrada?: number;
  quantidadeParcelas?: number;
  primeiroVencimento?: string;
  pctDesconto?: number;
  vlDesconto?: number;
  titulosOrigemIds?: string[];
  condicoes?: Record<string, unknown>;
  politicaReajuste?: "CADEIA" | "NOVA_BASE" | "SEM_REAJUSTE";
  dadosJudiciais?: {
    nrProcesso?: string;
    comarca?: string;
    dtHomologacao?: string;
  };
  confirmarCancelamentoTitulos?: boolean;
};

export type RenegociacaoSimulacaoResponse = {
  simulacaoId: number;
  nrSequencia: number;
  memoriaCalculo: MemoriaCalculo;
  totalAnterior: number;
  totalNovo: number;
  saldoDevedor: number;
  pctDesconto: number;
  diferencaTotal: number;
  reducaoTotal: boolean;
  exigeAprovacao: boolean;
  nrNivelAprovacaoRequerido: number;
  classificacaoJuridicaSugerida?: ClassificacaoJuridica;
  instrumentosSugeridos?: string[];
  titulosAfetados: TituloAfetado[];
  cronogramaFuturo: ParcelaFluxo[];
  avisos: string[];
};

export const MODALIDADE_OPTIONS: {
  value: ModalidadeRenegociacao;
  label: string;
  hint: string;
  juridico: string;
}[] = [
  {
    value: "T1_PARCELAS_VENCIDAS",
    label: "Parcelas vencidas",
    hint: "Mora a VP diluída em N parcelas, somada às próximas N vincendas (confissão/termo).",
    juridico: "CONFISSAO_DIVIDA / TERMO_PARCELAMENTO",
  },
  {
    value: "T2_SALDO_DEVEDOR",
    label: "Saldo devedor",
    hint: "Reparcelamento do saldo a partir do corte — aditivo.",
    juridico: "ADITIVO",
  },
  {
    value: "T3_COMPLETA",
    label: "Renegociação completa",
    hint: "Novo fluxo integral (vencidas + vincendas).",
    juridico: "ADITIVO + CONFISSAO_DIVIDA",
  },
  {
    value: "T4_QUITACAO",
    label: "Liquidação antecipada",
    hint: "Quitação com desconto e termo de quitação.",
    juridico: "TERMO_QUITACAO",
  },
  {
    value: "T5_COM_ENTRADA",
    label: "Com entrada",
    hint: "Entrada + parcelamento do saldo remanescente.",
    juridico: "ADITIVO / CONFISSAO_DIVIDA",
  },
  {
    value: "T6_JUDICIAL",
    label: "Judicial",
    hint: "Acordo homologado — registro processual obrigatório.",
    juridico: "ACORDO_JUDICIAL",
  },
];

/** Status em que não é permitido abrir outro processo no mesmo contrato. */
export const STATUS_RENEGOCIACAO_TERMINAIS: StatusRenegociacao[] = [
  "EFETIVADO",
  "CANCELADO",
  "REVERTIDO",
  "PROPOSTA_REJEITADA",
];

export function renegociacaoEstaAtiva(status: StatusRenegociacao): boolean {
  return !STATUS_RENEGOCIACAO_TERMINAIS.includes(status);
}

export const STATUS_RENEGOCIACAO_LABEL: Record<StatusRenegociacao, string> = {
  RASCUNHO: "Rascunho",
  SIMULACAO: "Em simulação",
  PROPOSTA_PENDENTE: "Proposta pendente",
  PROPOSTA_APROVADA: "Proposta aprovada",
  PROPOSTA_REJEITADA: "Rejeitada",
  AGUARDANDO_DOCUMENTOS: "Aguardando documentos",
  AGUARDANDO_ASSINATURA: "Aguardando assinatura",
  ASSINADO: "Assinado",
  EFETIVACAO_PARCIAL: "Efetivação parcial",
  EFETIVADO: "Efetivado",
  CANCELADO: "Cancelado",
  REVERTIDO: "Revertido",
};

/** Tons de badge por código de status (uso com `dashboardStatusBadge(label, map, status)`). */
export const STATUS_RENEGOCIACAO_TONES: Record<StatusRenegociacao, string> = {
  RASCUNHO: "border-white/15 bg-white/10 text-white/50",
  SIMULACAO: "border-sky-500/30 bg-sky-500/15 text-sky-200",
  PROPOSTA_PENDENTE: "border-amber-500/30 bg-amber-500/15 text-amber-200",
  PROPOSTA_APROVADA: "border-emerald-500/30 bg-emerald-500/15 text-emerald-200",
  PROPOSTA_REJEITADA: "border-rose-500/30 bg-rose-500/15 text-rose-200",
  AGUARDANDO_DOCUMENTOS: "border-violet-500/30 bg-violet-500/15 text-violet-200",
  AGUARDANDO_ASSINATURA: "border-cyan-500/30 bg-cyan-500/15 text-cyan-200",
  ASSINADO: "border-teal-500/30 bg-teal-500/15 text-teal-200",
  EFETIVACAO_PARCIAL: "border-amber-500/35 bg-amber-600/20 text-amber-100",
  EFETIVADO: "border-emerald-500/35 bg-emerald-600/20 text-emerald-100",
  CANCELADO: "border-white/15 bg-white/10 text-white/40",
  REVERTIDO: "border-orange-500/25 bg-orange-500/10 text-orange-200/90",
};

export function renegociacaoStatusLabel(status: StatusRenegociacao): string {
  return STATUS_RENEGOCIACAO_LABEL[status] ?? status;
}

export type EfetivacaoOperacao = {
  id: number;
  sequencia: number;
  tipo: string;
  numeroParcela?: number | null;
  tituloOrigemId?: string | null;
  tituloDestinoId?: string | null;
  statusOperacao: "PENDENTE" | "SUCESSO" | "FALHA" | "PULADO" | string;
  mensagemErro?: string | null;
  codigoInstrucaoBaixa?: string | null;
  statusTituloResultado?: string | null;
  executadoEm?: string | null;
};

export type EfetivarRenegociacaoResultado = {
  renegociacaoId: number;
  versaoPublicadaId?: number | null;
  status: StatusRenegociacao;
  concluida: boolean;
  mensagemResumo: string;
  operacoes: EfetivacaoOperacao[];
};
