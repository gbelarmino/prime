/** Reajuste anual IPCA/IGP-M nas parcelas 13, 25, 37, … (12k+1). */

/** Rótulo do índice de reajuste do contrato para exibição na UI. */
export function labelIndiceReajusteContrato(tipoCorrecaoAnual?: string | null): string {
  if (tipoCorrecaoAnual === "IPCA") return "IPCA";
  if (tipoCorrecaoAnual === "INPC") return "INPC";
  if (tipoCorrecaoAnual === "NENHUM") return "sem índice";
  return "IGP-M";
}

export function proximaParcelaComReajuste(parcelaAtual: number): number {
  if (parcelaAtual <= 12) return 13;
  return Math.ceil((parcelaAtual - 1) / 12) * 12 + 1;
}

/** Parcela de reajuste que não pode entrar no lote (limite exclusivo). */
export function limiteExclusivoProximoReajuste(parcelaInicial: number): number {
  if (isParcelaReajuste(parcelaInicial)) {
    return parcelaInicial + 12;
  }
  return proximaParcelaComReajuste(parcelaInicial);
}

/** Máximo em lote até antes do próximo reajuste (inclui parcela de reajuste inicial). */
export function maxParcelasAteProximoReajuste(parcelaInicial: number): number {
  const limite = limiteExclusivoProximoReajuste(parcelaInicial);
  return Math.max(0, limite - parcelaInicial);
}

export function ultimaParcelaEmitivelEmLote(parcelaInicial: number): number {
  return limiteExclusivoProximoReajuste(parcelaInicial) - 1;
}

export function isParcelaReajuste(numeroParcela: number): boolean {
  return numeroParcela >= 13 && (numeroParcela - 1) % 12 === 0;
}

/** Parcelas 13, 25, 37… dentro de [inicial, final] (não entram em lote). */
export function parcelasReajusteNoIntervalo(inicial: number, final: number): number[] {
  const out: number[] = [];
  for (let p = inicial; p <= final; p++) {
    if (isParcelaReajuste(p)) out.push(p);
  }
  return out;
}

/** Próxima parcela de reajuste bloqueada para lote após o intervalo emitível. */
export function parcelaReajusteBloqueadaParaLote(parcelaAtual: number): number {
  return limiteExclusivoProximoReajuste(parcelaAtual);
}
