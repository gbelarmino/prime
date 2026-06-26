/**
 * Espelha {@code TituloValorNominalCalculator} (aires-api): trilho fracionado,
 * reajuste 6% + índice do contrato (IPCA/IGPM, teto 12%) nas parcelas 13, 25, 37…
 * Índice negativo não reduz o reajuste (permanece 6%); positivo soma ao fixo até o teto.
 */

import {
  calcularVencimentosComPrimeiraParcelaDetalhe,
  parseIsoDate,
} from "@/lib/fin-vencimento";

export const REAJUSTE_PERCENTUAL_FIXO = 6;
export const REAJUSTE_PERCENTUAL_TETO = 12;

export type CondicoesValorNominal = {
  quantidadeParcelasFracionadas: number | null;
  valorFracionadoVendedora: number | null;
  valorParcela: number;
  tipoCorrecaoAnual?: string | null;
};

export type IndiceMensalLookup = {
  /** anoMes → variação mensal em % (ex.: 0.45) */
  variacaoMensalPorAnoMes: Map<number, number>;
  /** anoMes → variação 12 meses em % quando disponível */
  variacao12MesesPorAnoMes: Map<number, number>;
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function subtractMonths(date: Date, months: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setMonth(d.getMonth() - months);
  return d;
}

function quantidadeFracionadas(ch: CondicoesValorNominal): number {
  const qtd = ch.quantidadeParcelasFracionadas;
  return qtd != null && qtd > 0 ? qtd : 0;
}

export function parcelaReajusteDoCiclo(numeroParcela: number): number {
  if (numeroParcela < 13) {
    throw new Error("Parcela deve ser >= 13.");
  }
  return Math.floor((numeroParcela - 1) / 12) * 12 + 1;
}

export function mesesIpcaParaReajuste(
  parcelaReajuste: number,
  qtdFracionadas: number,
): number {
  if (parcelaReajuste === 25) {
    // Só usa janela >12 meses quando o fracionado é longo (ex.: 24 parcelas de sinal).
    // Caso contrário, aplica a mesma janela de 12 meses (coluna acumulada do BCB/IBGE).
    if (qtdFracionadas > 12) {
      return qtdFracionadas;
    }
    return 12;
  }
  return 12;
}

export function valorBaseSemReajuste(
  numeroParcela: number,
  qtdFracionadas: number,
  fracionado: number | null,
  valorParcela: number,
): number {
  if (
    qtdFracionadas > 0 &&
    numeroParcela <= qtdFracionadas &&
    fracionado != null
  ) {
    return roundMoney(fracionado);
  }
  return roundMoney(valorParcela);
}

function anoMesFromDate(date: Date): number {
  return date.getFullYear() * 100 + (date.getMonth() + 1);
}

function subtractAnoMes(anoMes: number, meses: number): number {
  const year = Math.floor(anoMes / 100);
  const month = anoMes % 100;
  const d = new Date(year, month - 1, 1);
  d.setMonth(d.getMonth() - meses);
  return d.getFullYear() * 100 + (d.getMonth() + 1);
}

/** Fração decimal acumulada (ex.: 0.045 = 4,5%). Retorna 0 se a série estiver incompleta. */
export function acumularVariacaoFraction(
  lookup: IndiceMensalLookup,
  fimInclusiveAnoMes: number,
  meses: number,
): number {
  if (!indiceDisponivelParaPeriodo(lookup, fimInclusiveAnoMes, meses)) {
    return 0;
  }
  if (meses === 12) {
    const v12 = lookup.variacao12MesesPorAnoMes.get(fimInclusiveAnoMes);
    if (v12 != null) {
      return v12 / 100;
    }
  }

  let acumulado = 1;
  for (let i = 0; i < meses; i++) {
    const anoMes = subtractAnoMes(fimInclusiveAnoMes, meses - 1 - i);
    const mensal = lookup.variacaoMensalPorAnoMes.get(anoMes)!;
    acumulado *= 1 + mensal / 100;
  }
  return acumulado - 1;
}

/** Série do índice completa para o período de corte (12 meses ou coluna acumulada). */
export function indiceDisponivelParaPeriodo(
  lookup: IndiceMensalLookup,
  fimInclusiveAnoMes: number,
  meses: number,
): boolean {
  if (meses === 12) {
    const v12 = lookup.variacao12MesesPorAnoMes.get(fimInclusiveAnoMes);
    if (v12 != null) {
      return true;
    }
  }
  for (let i = 0; i < meses; i++) {
    const anoMes = subtractAnoMes(fimInclusiveAnoMes, meses - 1 - i);
    if (lookup.variacaoMensalPorAnoMes.get(anoMes) == null) {
      return false;
    }
  }
  return true;
}

/** Dois meses antes do mês de vencimento do ciclo de reajuste (fim da janela do índice). */
export function mesCorteIndiceReajuste(vencimento: Date): number {
  return anoMesFromDate(subtractMonths(vencimento, 2));
}

/** Fração decimal do reajuste total (6% + índice se positivo, teto 12%). */
export function percentualReajusteTotal(indiceFraction: number): number {
  const fixo = REAJUSTE_PERCENTUAL_FIXO / 100;
  const teto = REAJUSTE_PERCENTUAL_TETO / 100;
  if (indiceFraction < 0) {
    return fixo;
  }
  const total = fixo + indiceFraction;
  return total > teto ? teto : total;
}

function anoMesReferenciaVencimento(vencimento: Date): number {
  return mesCorteIndiceReajuste(vencimento);
}

export function aplicarReajuste(
  base: number,
  vencimento: Date,
  mesesIpca: number,
  lookup: IndiceMensalLookup,
  tipoCorrecaoAnual?: string | null,
): { valor: number; ipcaAcumulado: number; percentualTotal: number } {
  const referenciaFim = anoMesReferenciaVencimento(vencimento);
  const usaIndice = tipoCorrecaoAnual !== "NENHUM";
  const ipca = usaIndice ? acumularVariacaoFraction(lookup, referenciaFim, mesesIpca) : 0;
  const total = usaIndice ? percentualReajusteTotal(ipca) : REAJUSTE_PERCENTUAL_FIXO / 100;
  return {
    valor: roundMoney(base * (1 + total)),
    ipcaAcumulado: ipca * 100,
    percentualTotal: total * 100,
  };
}

export function vencimentoProjetadoParcela(
  numeroParcela: number,
  dataPrimeiraParcela: Date,
  diaVencimento: number,
): Date {
  if (numeroParcela < 1) {
    throw new Error("Número da parcela deve ser >= 1.");
  }
  const detalhes = calcularVencimentosComPrimeiraParcelaDetalhe(
    dataPrimeiraParcela,
    diaVencimento,
    numeroParcela,
  );
  return detalhes[numeroParcela - 1]!.vencimento;
}

function valorNaParcelaReajuste(
  ch: CondicoesValorNominal,
  parcelaReajuste: number,
  vencimentoPorParcela: (n: number) => Date,
  lookup: IndiceMensalLookup,
  cache: Map<number, number>,
): number {
  const cached = cache.get(parcelaReajuste);
  if (cached != null) {
    return cached;
  }

  const qtdFracionadas = quantidadeFracionadas(ch);
  const fracionado = ch.valorFracionadoVendedora;
  const valorParcela = ch.valorParcela;
  const vencimento = vencimentoPorParcela(parcelaReajuste);
  const mesesIpca = mesesIpcaParaReajuste(parcelaReajuste, qtdFracionadas);
  const referenciaFim = anoMesReferenciaVencimento(vencimento);
  const indiceDisponivel =
    ch.tipoCorrecaoAnual !== "NENHUM" &&
    indiceDisponivelParaPeriodo(lookup, referenciaFim, mesesIpca);

  let resultado: number;
  if (parcelaReajuste === 13) {
    const base =
      13 <= qtdFracionadas && fracionado != null ? fracionado : valorParcela;
    if (!indiceDisponivel) {
      resultado = roundMoney(base);
    } else {
      resultado = aplicarReajuste(base, vencimento, mesesIpca, lookup, ch.tipoCorrecaoAnual).valor;
    }
  } else if (parcelaReajuste === 25) {
    const base = valorNaParcelaReajuste(
      ch,
      13,
      vencimentoPorParcela,
      lookup,
      cache,
    );
    if (!indiceDisponivel) {
      resultado = base;
    } else {
      resultado = aplicarReajuste(base, vencimento, mesesIpca, lookup, ch.tipoCorrecaoAnual).valor;
    }
  } else {
    const parcelaAnterior = parcelaReajuste - 12;
    const base = valorNaParcelaReajuste(
      ch,
      parcelaAnterior,
      vencimentoPorParcela,
      lookup,
      cache,
    );
    if (!indiceDisponivel) {
      resultado = base;
    } else {
      resultado = aplicarReajuste(base, vencimento, mesesIpca, lookup, ch.tipoCorrecaoAnual).valor;
    }
  }

  cache.set(parcelaReajuste, resultado);
  return resultado;
}

export function calcularValorNominalParcela(
  ch: CondicoesValorNominal,
  numeroParcela: number,
  dataPrimeiraParcela: Date,
  diaVencimento: number,
  lookup: IndiceMensalLookup,
  vencimentoPorParcelaOverride?: (numeroParcela: number) => Date,
): number {
  if (ch.valorParcela == null || Number.isNaN(ch.valorParcela)) {
    throw new Error("Contrato sem valor de parcela configurado.");
  }
  const qtdFracionadas = quantidadeFracionadas(ch);
  if (
    qtdFracionadas > 0 &&
    numeroParcela <= qtdFracionadas &&
    ch.valorFracionadoVendedora == null
  ) {
    throw new Error(
      `Contrato sem valor fracionado vendedora para parcelas 1–${qtdFracionadas}.`,
    );
  }

  const vencimentoPorParcela =
    vencimentoPorParcelaOverride ??
    ((n: number) => vencimentoProjetadoParcela(n, dataPrimeiraParcela, diaVencimento));

  if (numeroParcela < 13) {
    return valorBaseSemReajuste(
      numeroParcela,
      qtdFracionadas,
      ch.valorFracionadoVendedora,
      ch.valorParcela,
    );
  }

  const parcelaReajusteCiclo = parcelaReajusteDoCiclo(numeroParcela);
  const cache = new Map<number, number>();
  return valorNaParcelaReajuste(
    ch,
    parcelaReajusteCiclo,
    vencimentoPorParcela,
    lookup,
    cache,
  );
}

export function detalheReajusteParcela(
  ch: CondicoesValorNominal,
  numeroParcela: number,
  dataPrimeiraParcela: Date,
  diaVencimento: number,
  lookup: IndiceMensalLookup,
  vencimentoPorParcelaOverride?: (numeroParcela: number) => Date,
): {
  valorNominal: number;
  parcelaReajusteCiclo: number | null;
  mesesIpcaReferencia: number | null;
  ipcaAcumulado: number | null;
  percentualTotalReajuste: number | null;
  anoMesReferencia: number | null;
  indiceDisponivelParaReajuste: boolean;
} {
  const vencimentoPorParcela =
    vencimentoPorParcelaOverride ??
    ((n: number) => vencimentoProjetadoParcela(n, dataPrimeiraParcela, diaVencimento));

  if (numeroParcela < 13) {
    return {
      valorNominal: calcularValorNominalParcela(
        ch,
        numeroParcela,
        dataPrimeiraParcela,
        diaVencimento,
        lookup,
        vencimentoPorParcelaOverride,
      ),
      parcelaReajusteCiclo: null,
      mesesIpcaReferencia: null,
      ipcaAcumulado: null,
      percentualTotalReajuste: null,
      anoMesReferencia: null,
      indiceDisponivelParaReajuste: false,
    };
  }

  const parcelaReajusteCiclo = parcelaReajusteDoCiclo(numeroParcela);
  const qtdFracionadas = quantidadeFracionadas(ch);
  const mesesIpca = mesesIpcaParaReajuste(parcelaReajusteCiclo, qtdFracionadas);
  const vencimento = vencimentoPorParcela(parcelaReajusteCiclo);
  const anoMesReferencia = anoMesReferenciaVencimento(vencimento);
  const indiceDisponivelParaReajuste =
    ch.tipoCorrecaoAnual !== "NENHUM" &&
    indiceDisponivelParaPeriodo(lookup, anoMesReferencia, mesesIpca);

  const cache = new Map<number, number>();
  const valorNominal = valorNaParcelaReajuste(
    ch,
    parcelaReajusteCiclo,
    vencimentoPorParcela,
    lookup,
    cache,
  );

  let base: number;
  if (parcelaReajusteCiclo === 13) {
    base =
      13 <= qtdFracionadas && ch.valorFracionadoVendedora != null
        ? ch.valorFracionadoVendedora
        : ch.valorParcela;
  } else if (parcelaReajusteCiclo === 25) {
    base = valorNaParcelaReajuste(
      ch,
      13,
      vencimentoPorParcela,
      lookup,
      cache,
    );
  } else {
    base = valorNaParcelaReajuste(
      ch,
      parcelaReajusteCiclo - 12,
      vencimentoPorParcela,
      lookup,
      cache,
    );
  }

  const reajuste = indiceDisponivelParaReajuste
    ? aplicarReajuste(base, vencimento, mesesIpca, lookup, ch.tipoCorrecaoAnual)
    : null;

  return {
    valorNominal,
    parcelaReajusteCiclo,
    mesesIpcaReferencia: indiceDisponivelParaReajuste ? mesesIpca : null,
    ipcaAcumulado: reajuste?.ipcaAcumulado ?? null,
    percentualTotalReajuste: reajuste?.percentualTotal ?? null,
    anoMesReferencia: indiceDisponivelParaReajuste ? anoMesReferencia : null,
    indiceDisponivelParaReajuste,
  };
}

export function parseDataPrimeiraParcela(iso: string): Date {
  return parseIsoDate(iso);
}
