/** Reajuste anual IPCA/IGP-M nas parcelas 13, 25, 37, … (12k+1). */

export function proximaParcelaComReajuste(parcelaAtual: number): number {
  if (parcelaAtual <= 12) return 13;
  return Math.ceil((parcelaAtual - 1) / 12) * 12 + 1;
}

/** Máximo em lote: até antes do próximo reajuste; na parcela de reajuste, só 1. */
export function maxParcelasAteProximoReajuste(parcelaInicial: number): number {
  if (isParcelaReajuste(parcelaInicial)) {
    return 1;
  }
  const parcelaReajuste = proximaParcelaComReajuste(parcelaInicial);
  return Math.max(0, parcelaReajuste - parcelaInicial);
}

export function ultimaParcelaEmitivelEmLote(parcelaInicial: number): number {
  if (isParcelaReajuste(parcelaInicial)) {
    return parcelaInicial;
  }
  return proximaParcelaComReajuste(parcelaInicial) - 1;
}

export function emitindoSomenteParcelaReajuste(parcelaInicial: number, parcelaFinal: number): boolean {
  return isParcelaReajuste(parcelaInicial) && parcelaInicial === parcelaFinal;
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

/** Próxima parcela de reajuste a partir de `parcelaAtual` (inclusive se já for reajuste). */
export function parcelaReajusteBloqueadaParaLote(parcelaAtual: number): number {
  return proximaParcelaComReajuste(parcelaAtual);
}
