/** Reajuste anual IPCA nas parcelas 13, 25, 37, … (12k+1). */

export function proximaParcelaComReajuste(parcelaAtual: number): number {
  if (parcelaAtual <= 12) return 13;
  return Math.ceil((parcelaAtual - 1) / 12) * 12 + 1;
}

/** Máximo em lote sem incluir a parcela de reajuste (13, 25, 37, …). */
export function maxParcelasAteProximoReajuste(parcelaInicial: number): number {
  const parcelaReajuste = proximaParcelaComReajuste(parcelaInicial);
  return Math.max(0, parcelaReajuste - parcelaInicial);
}

export function ultimaParcelaEmitivelEmLote(parcelaInicial: number): number {
  return proximaParcelaComReajuste(parcelaInicial) - 1;
}

export function isParcelaReajuste(numeroParcela: number): boolean {
  return numeroParcela >= 13 && (numeroParcela - 1) % 12 === 0;
}
