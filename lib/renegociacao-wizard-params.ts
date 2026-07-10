import type { ModalidadeRenegociacao } from "./renegociacao-types";
import { hojeNegocioIso } from "./app-business-date";

export function dataAcordoPadrao(): string {
  return hojeNegocioIso();
}

export type ParametrosWizardRenegociacao = {
  parcelaInicial: number;
  quantidadeParcelas: number;
  pctDesconto: number | null;
  valorEntrada: number | null;
  /** Data do acordo — referência para correções (VP, mora). */
  dataAcordo: string;
};

export type AjudaParametrosModalidade = {
  descricaoPasso: string;
  parcelaInicial: string;
  quantidadeParcelas: string;
  desconto: string;
  dataAcordo?: string;
  ocultarQuantidadeParcelas?: boolean;
  forcarUmaParcela?: boolean;
};

export const AJUDA_PARAMETROS_POR_MODALIDADE: Partial<
  Record<ModalidadeRenegociacao, AjudaParametrosModalidade>
> = {
  T1_PARCELAS_VENCIDAS: {
    descricaoPasso:
      "Acordo sobre mora: vencidas a valor presente, divididas em N parcelas e somadas às próximas N vincendas do contrato.",
    dataAcordo:
      "Data de referência para atualizar mora (multa e juros de boleto) até o acordo. Padrão: hoje.",
    parcelaInicial: "Opcional: parcela mínima das vencidas que entram no VP (1 = todas). Não confundir com a primeira vincenda.",
    quantidadeParcelas:
      "Em quantas parcelas o total do acordo será diluído (somado ao valor normal de cada vincenda).",
    desconto: "Desconto sobre o VP total da mora (não incide sobre a parcela vigente).",
  },
  T2_SALDO_DEVEDOR: {
    descricaoPasso:
      "Reparcelamento do saldo a partir da parcela de corte. Usa as condições do contrato no passo seguinte.",
    parcelaInicial: "Primeira parcela do fluxo vigente que entra no novo saldo (geralmente a primeira em aberto).",
    quantidadeParcelas: "Parcelas do novo cronograma após o corte.",
    desconto: "Redução sobre o saldo reparcelado — pode exigir aprovação.",
  },
  T3_COMPLETA: {
    descricaoPasso: "Novo fluxo integral (vencidas + vincendas). Condições financeiras obrigatórias.",
    parcelaInicial: "Parcela a partir da qual o contrato será recomposto.",
    quantidadeParcelas: "Total de parcelas do novo grade.",
    desconto: "Desconto global sobre o total do novo fluxo.",
  },
  T4_QUITACAO: {
    descricaoPasso:
      "Quitação antecipada: total anterior = saldo devedor (parcelas restantes × valor da parcela) + inadimplência a valor presente; total quitado = total anterior − desconto (opcional).",
    dataAcordo:
      "Data de referência para calcular a inadimplência a valor presente. Padrão: hoje.",
    parcelaInicial:
      "Parcela de corte: use a primeira parcela em aberto (títulos cancelados na efetivação partirão daqui).",
    quantidadeParcelas:
      "Recomendado 1 (parcela única). Até 24 parcelas dividem o valor quitado após o desconto.",
    desconto: "Opcional. Deixe vazio para simular sem desconto; ou informe % sobre o total anterior.",
    forcarUmaParcela: false,
  },
  T5_COM_ENTRADA: {
    descricaoPasso: "Entrada à vista + saldo remanescente parcelado.",
    parcelaInicial: "Parcela inicial do saldo remanescente após a entrada.",
    quantidadeParcelas: "Parcelas do saldo após a entrada.",
    desconto: "Desconto sobre o saldo (não sobre a entrada).",
  },
  T6_JUDICIAL: {
    descricaoPasso: "Acordo homologado — informe o processo e parâmetros do acordo.",
    parcelaInicial: "Parcela de referência do acordo judicial.",
    quantidadeParcelas: "Parcelas previstas no acordo.",
    desconto: "Desconto homologado (se houver).",
  },
};

export function primeiraParcelaAberta(
  titulosAbertos: { numeroParcela: number }[] | undefined,
): number | null {
  if (!titulosAbertos?.length) return null;
  return Math.min(...titulosAbertos.map((t) => t.numeroParcela));
}

export function defaultsParametrosModalidade(
  modalidade: ModalidadeRenegociacao,
  financeiro?: { titulosAbertos?: { numeroParcela: number }[] } | null,
): Partial<ParametrosWizardRenegociacao> {
  const parcela = primeiraParcelaAberta(financeiro?.titulosAbertos) ?? 1;
  if (modalidade === "T1_PARCELAS_VENCIDAS") {
    // Filtro opcional de vencidas — default 1 inclui toda a mora (≠ parcela de corte T2/T3).
    return { parcelaInicial: 1, dataAcordo: dataAcordoPadrao() };
  }
  if (modalidade === "T4_QUITACAO") {
    return { parcelaInicial: parcela, quantidadeParcelas: 1, dataAcordo: dataAcordoPadrao() };
  }
  return { parcelaInicial: parcela, dataAcordo: dataAcordoPadrao() };
}
