import type { ModalidadeRenegociacao } from "./renegociacao-types";
import { getUserRole } from "./auth-storage";

export const RENEGOCIACAO_DASHBOARD_PATH = "/dashboard/contratos/renegociacao";

export const RENEGOCIACAO_CONSULTAR_PATH = "/dashboard/contratos/renegociacao/consultar";

/** Atalho do antigo fluxo “Aditivo contrato” (saldo devedor / T2). */
export const MODALIDADE_ATALHO_ADITIVO: ModalidadeRenegociacao = "T2_SALDO_DEVEDOR";

const MODALIDADES: ModalidadeRenegociacao[] = [
  "T1_PARCELAS_VENCIDAS",
  "T2_SALDO_DEVEDOR",
  "T3_COMPLETA",
  "T4_QUITACAO",
  "T5_COM_ENTRADA",
  "T6_JUDICIAL",
];

export function parseModalidadeRenegociacao(
  raw: string | null | undefined,
): ModalidadeRenegociacao | null {
  if (!raw) return null;
  return MODALIDADES.includes(raw as ModalidadeRenegociacao)
    ? (raw as ModalidadeRenegociacao)
    : null;
}

export function buildRenegociacaoDashboardUrl(options?: {
  contratoId?: number;
  renegociacaoId?: number;
  modalidade?: ModalidadeRenegociacao;
}): string {
  const params = new URLSearchParams();
  if (options?.contratoId != null && options.contratoId > 0) {
    params.set("contratoId", String(options.contratoId));
  }
  if (options?.renegociacaoId != null && options.renegociacaoId > 0) {
    params.set("renegociacaoId", String(options.renegociacaoId));
  }
  if (options?.modalidade) {
    params.set("modalidade", options.modalidade);
  }
  const qs = params.toString();
  return qs ? `${RENEGOCIACAO_DASHBOARD_PATH}?${qs}` : RENEGOCIACAO_DASHBOARD_PATH;
}

/** Destino seguro para “ver títulos” após efetivação (rotas existentes no export estático). */
export function buildRenegociacaoTitulosContratoUrl(contratoId: number): string {
  const role = getUserRole();
  if (role === "ADMIN" || role === "ADMINISTRATIVO") {
    return "/dashboard/financeiro/titulos";
  }
  return `/dashboard/atendimento/painel?id=${contratoId}`;
}
