import type { AtendimentoResumoFinanceiro } from "./atendimento-service";
import type { BoletoEncargosConfig } from "./fin-memorial-calculo";
import { hojeNegocioIso } from "./app-business-date";
import {
  agregarInadimplenciaPresente,
  titulosVencidosDoPainel,
  type InadimplenciaPresenteAgregado,
} from "./renegociacao-inadimplencia-presente";

export type BaseQuitacaoLocal = {
  saldoDevedorContrato: number;
  somaTitulosAbertos: number;
  valorInadimplenteNominal: number;
  inadimplenciaPresente: InadimplenciaPresenteAgregado;
  parcelasContratuaisSemTitulo: number;
  baseQuitacao: number;
  avisos: string[];
};

function isVencido(vencimento: string, status: string, dataReferencia?: string): boolean {
  if (status === "VENCIDO") return true;
  const ref = dataReferencia ?? hojeNegocioIso();
  return vencimento < ref && status !== "PAGO" && status !== "CANCELADO";
}

/** Espelha {@code RenegociacaoQuitacaoCalculo} no cliente para fallback local. */
export function montarBaseQuitacaoLocal(
  financeiro: AtendimentoResumoFinanceiro,
  parcelaInicial: number,
  encargos?: BoletoEncargosConfig,
  dataAcordo?: string,
): BaseQuitacaoLocal {
  const saldo = financeiro.saldoDevedor;
  const inadimplente = financeiro.valorInadimplente;
  const abertos = financeiro.titulosAbertos.filter((t) => t.numeroParcela >= parcelaInicial);
  const somaAbertos = abertos.reduce((s, t) => s + t.valorNominal, 0);
  const parcelasSemTitulo = Math.max(0, saldo - somaAbertos);
  const avisos: string[] = [];

  const vencidosCorte = titulosVencidosDoPainel(
    financeiro.titulosAbertos.filter((t) => t.numeroParcela >= parcelaInicial),
    financeiro.titulosVencidos.filter((t) => t.numeroParcela >= parcelaInicial),
    dataAcordo,
  );
  const inadimplenciaPresente = encargos
    ? agregarInadimplenciaPresente(vencidosCorte, encargos, dataAcordo)
    : {
        nominalTotal: 0,
        multaTotal: 0,
        jurosTotal: 0,
        valorPresenteTotal: 0,
        memoriaCalculo: "",
        itens: [],
      };

  if (parcelasSemTitulo > 0.01) {
    avisos.push(
      `O saldo devedor inclui ${parcelasSemTitulo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} de parcelas contratuais ainda não emitidas como título.`,
    );
  }
  if (somaAbertos > saldo * 1.05 && saldo > 0) {
    avisos.push(
      "Soma dos títulos em aberto supera o saldo devedor do painel — revise a parcela de corte.",
    );
  }
  if (inadimplenciaPresente.valorPresenteTotal > 0) {
    avisos.push(
      `Inadimplência a valor presente: ${inadimplenciaPresente.valorPresenteTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`,
    );
    if (inadimplenciaPresente.memoriaCalculo) {
      avisos.push(`Memória: ${inadimplenciaPresente.memoriaCalculo}`);
    }
  } else if (inadimplente > 0) {
    avisos.push(
      `Inadimplência nominal no painel: ${inadimplente.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} (sem títulos vencidos na faixa de corte).`,
    );
  }

  const totalAnterior = totalQuitacaoAntesDesconto(saldo, inadimplenciaPresente.valorPresenteTotal);

  return {
    saldoDevedorContrato: saldo,
    somaTitulosAbertos: somaAbertos,
    valorInadimplenteNominal: inadimplente,
    inadimplenciaPresente,
    parcelasContratuaisSemTitulo: parcelasSemTitulo,
    baseQuitacao: totalAnterior,
    avisos,
  };
}

/** Saldo devedor (parcelas × valor parcela) + inadimplência a valor presente. */
export function totalQuitacaoAntesDesconto(saldoDevedor: number, inadimplenciaVp: number): number {
  return Math.round((saldoDevedor + inadimplenciaVp) * 100) / 100;
}

export function aplicarDescontoQuitacao(
  base: number,
  pctDesconto?: number | null,
  vlDesconto?: number | null,
): number {
  if (base <= 0) return 0;
  if (vlDesconto != null && vlDesconto > 0) {
    return Math.max(0, Math.round((base - vlDesconto) * 100) / 100);
  }
  if (pctDesconto != null && pctDesconto > 0) {
    return Math.round(base * (1 - pctDesconto / 100) * 100) / 100;
  }
  return Math.round(base * 100) / 100;
}
