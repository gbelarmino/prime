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
  itens?: {
    tituloId?: string;
    numeroParcela?: number;
    componente?: string;
    valor?: number;
  }[];
};

export type ParcelaFluxo = {
  numeroParcela: number;
  vencimento: string;
  valorNominal: number;
};

export type TituloAfetado = {
  id: string;
  numeroParcela: number;
  vencimento: string;
  valorNominal: number;
  status: string;
};

export type RenegociacaoResumo = {
  id: number;
  modalidade: ModalidadeRenegociacao;
  status: StatusRenegociacao;
  versaoPublicadaId?: number | null;
  criadoEm: string;
};

export type RenegociacaoDetalhe = RenegociacaoResumo & {
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
  parcelaInicial?: number;
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
    hint: "Acordo sobre mora sem alterar vincendas (confissão/termo).",
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

export const STATUS_RENEGOCIACAO_LABEL: Record<StatusRenegociacao, string> = {
  RASCUNHO: "Rascunho",
  SIMULACAO: "Em simulação",
  PROPOSTA_PENDENTE: "Proposta pendente",
  PROPOSTA_APROVADA: "Proposta aprovada",
  PROPOSTA_REJEITADA: "Rejeitada",
  AGUARDANDO_DOCUMENTOS: "Aguardando documentos",
  AGUARDANDO_ASSINATURA: "Aguardando assinatura",
  ASSINADO: "Assinado",
  EFETIVADO: "Efetivado",
  CANCELADO: "Cancelado",
  REVERTIDO: "Revertido",
};
