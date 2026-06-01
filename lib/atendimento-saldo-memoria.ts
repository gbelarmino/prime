import type { AtendimentoResumoFinanceiro } from "./atendimento-service";

function formatValorParcelaMemoria(v: number): string {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
}

function formatMoedaMemoria(v: number): string {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Texto do card Saldo devedor: {@code 69 x 393,0 = 27.117,00} */
export function textoSaldoDevedorComMemoria(
  financeiro: AtendimentoResumoFinanceiro,
  valorParcelaContrato?: number | null,
): string {
  if (financeiro.memoriaSaldoDevedor?.trim()) {
    return financeiro.memoriaSaldoDevedor.trim();
  }
  const faltam = Math.max(0, financeiro.parcelasTotal - financeiro.parcelasPagas);
  const vp = financeiro.valorParcelaReferencia ?? valorParcelaContrato;
  if (faltam > 0 && vp != null && vp > 0) {
    return `${faltam} x ${formatValorParcelaMemoria(vp)} = ${formatMoedaMemoria(financeiro.saldoDevedor)}`;
  }
  return financeiro.saldoDevedor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
