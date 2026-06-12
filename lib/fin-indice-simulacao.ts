import type { IndiceEconomicoMensal, TituloCobranca } from "@/lib/fin-service";
import { isParcelaReajuste } from "@/lib/fin-parcela-reajuste";
import {
  calcularVencimentosComPrimeiraParcelaDetalhe,
  calcularVencimentosParcelasDetalhe,
  formatIsoDate,
  parseIsoDate,
} from "@/lib/fin-vencimento";
import {
  detalheReajusteParcela,
  parcelaReajusteDoCiclo,
  REAJUSTE_PERCENTUAL_FIXO,
  type CondicoesValorNominal,
  type IndiceMensalLookup,
} from "@/lib/fin-valor-nominal";

export type TipoIndiceSimulacao = "IPCA" | "IGPM";

/** Índice configurado no contrato para reajuste (IPCA/IGPM). Null legado → IGPM; NENHUM → sem índice. */
export function resolverTipoIndiceContrato(
  tipoCorrecaoAnual?: string | null,
): TipoIndiceSimulacao | null {
  if (tipoCorrecaoAnual === "NENHUM") {
    return null;
  }
  if (tipoCorrecaoAnual === "IPCA") {
    return "IPCA";
  }
  return "IGPM";
}

export type IndiceSimulacaoParcela = {
  parcela: number;
  vencimento: string;
  valorSimulado: number;
  parcelaReajuste: boolean;
  reajusteAplicadoNestaParcela: boolean;
  percentualFixoReajuste: number | null;
  indice12MesesReferencia: number | null;
  mesesIndiceReferencia: number | null;
  percentualTotalReajuste: number | null;
  mesReferenciaIndice: string | null;
  tituloEmitido: TituloCobranca | null;
  valorEmitido: number | null;
  divergencia: number | null;
};

/** Percentual fixo anual na emissão de títulos (6%, espelha backend). */
export const REAJUSTE_PERCENTUAL_FIXO_PADRAO = REAJUSTE_PERCENTUAL_FIXO;

export const INDICE_SERIE_INICIO_ANO_MES: Record<TipoIndiceSimulacao, string> = {
  IPCA: "2015-01",
  IGPM: "2015-01",
};

export function indicesPorAnoMes(indices: IndiceEconomicoMensal[]): Map<number, IndiceEconomicoMensal> {
  return new Map(indices.map((i) => [i.anoMes, i]));
}

function subtractMonths(date: Date, months: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setMonth(d.getMonth() - months);
  return d;
}

function anoMesFromDate(d: Date): number {
  return d.getFullYear() * 100 + (d.getMonth() + 1);
}

export function formatAnoMesLabel(anoMes: number): string {
  const ano = Math.floor(anoMes / 100);
  const mes = anoMes % 100;
  const data = new Date(ano, mes - 1, 1);
  const texto = data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function formatPercentualIndice(valor: number | null | undefined): string {
  if (valor == null) return "—";
  const sinal = valor > 0 ? "+" : "";
  return `${sinal}${valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

function roundMoney(v: number): number {
  return Math.round(v * 100) / 100;
}

function referenciaAntesPrimeiroVencimento(primeiroVencimento: Date): Date {
  return new Date(
    primeiroVencimento.getFullYear(),
    primeiroVencimento.getMonth(),
    primeiroVencimento.getDate() - 1,
  );
}

function buildIndiceLookup(indices: IndiceEconomicoMensal[]): IndiceMensalLookup {
  const variacaoMensalPorAnoMes = new Map<number, number>();
  const variacao12MesesPorAnoMes = new Map<number, number>();
  for (const indice of indices) {
    if (indice.variacaoMensal != null) {
      variacaoMensalPorAnoMes.set(indice.anoMes, indice.variacaoMensal);
    }
    if (indice.variacao12Meses != null) {
      variacao12MesesPorAnoMes.set(indice.anoMes, indice.variacao12Meses);
    }
  }
  return { variacaoMensalPorAnoMes, variacao12MesesPorAnoMes };
}

export function resolverParcelaAtual(titulos: TituloCobranca[]): number {
  if (titulos.length === 0) return 0;
  return Math.max(...titulos.map((t) => t.numeroParcela));
}

/** Última parcela cujo vencimento cai no mês de referência ou antes (ex.: mês atual). */
export function resolverParcelaLimiteMesAtual(opts: {
  titulos: TituloCobranca[];
  diaVencimentoMensal: number;
  dataPrimeiraParcelaContrato?: string | null;
  referencia?: Date;
  maxParcelas?: number;
}): number {
  const {
    titulos,
    diaVencimentoMensal,
    dataPrimeiraParcelaContrato,
    referencia = new Date(),
    maxParcelas = 360,
  } = opts;
  if (titulos.length === 0) return 0;

  const sorted = [...titulos].sort((a, b) => a.numeroParcela - b.numeroParcela);
  const primeiro = sorted[0];
  const primeiraData = dataPrimeiraParcelaContrato
    ? parseIsoDate(dataPrimeiraParcelaContrato)
    : parseIsoDate(primeiro.vencimento);
  const limiteAnoMes = anoMesFromDate(referencia);
  const tituloPorParcela = new Map(sorted.map((t) => [t.numeroParcela, t]));

  const detalhes = dataPrimeiraParcelaContrato
    ? calcularVencimentosComPrimeiraParcelaDetalhe(
        primeiraData,
        diaVencimentoMensal,
        maxParcelas,
      )
    : calcularVencimentosParcelasDetalhe(
        diaVencimentoMensal,
        referenciaAntesPrimeiroVencimento(parseIsoDate(primeiro.vencimento)),
        maxParcelas,
      );

  let ultima = 0;
  for (let parcela = 1; parcela <= detalhes.length; parcela++) {
    const emitido = tituloPorParcela.get(parcela);
    const venc = emitido
      ? parseIsoDate(emitido.vencimento)
      : detalhes[parcela - 1]?.vencimento;
    if (!venc) break;
    if (anoMesFromDate(venc) > limiteAnoMes) break;
    ultima = parcela;
  }
  return ultima;
}

/** @deprecated Emissão usa 6% fixo; mantido para compatibilidade de UI legada. */
export function resolverPercentualFixoReajuste(_percentualCorrecao?: number | null): number {
  return REAJUSTE_PERCENTUAL_FIXO_PADRAO;
}

export function simularParcelasIndice(opts: {
  titulos: TituloCobranca[];
  diaVencimentoMensal: number;
  parcelaAtual: number;
  indices: IndiceEconomicoMensal[];
  condicoes: CondicoesValorNominal;
  dataPrimeiraParcelaContrato?: string | null;
}): IndiceSimulacaoParcela[] {
  const {
    titulos,
    diaVencimentoMensal,
    parcelaAtual,
    indices,
    condicoes,
    dataPrimeiraParcelaContrato,
  } = opts;
  if (parcelaAtual < 1 || titulos.length === 0) return [];

  const sorted = [...titulos].sort((a, b) => a.numeroParcela - b.numeroParcela);
  const primeiro = sorted[0];
  const dataPrimeiraParcela = dataPrimeiraParcelaContrato
    ? parseIsoDate(dataPrimeiraParcelaContrato)
    : parseIsoDate(primeiro.vencimento);
  const tituloPorParcela = new Map(sorted.map((t) => [t.numeroParcela, t]));
  const lookup = buildIndiceLookup(indices);

  const detalhes = calcularVencimentosComPrimeiraParcelaDetalhe(
    dataPrimeiraParcela,
    diaVencimentoMensal,
    parcelaAtual,
  );

  const vencimentos = new Map<number, Date>();
  for (let parcela = 1; parcela <= parcelaAtual; parcela++) {
    const emitido = tituloPorParcela.get(parcela);
    if (emitido) {
      vencimentos.set(parcela, parseIsoDate(emitido.vencimento));
    } else {
      vencimentos.set(parcela, detalhes[parcela - 1]?.vencimento ?? dataPrimeiraParcela);
    }
  }

  const resultados: IndiceSimulacaoParcela[] = [];
  for (let parcela = 1; parcela <= parcelaAtual; parcela++) {
    const detalhe = detalheReajusteParcela(
      condicoes,
      parcela,
      dataPrimeiraParcela,
      diaVencimentoMensal,
      lookup,
    );
    const reajusteNesta =
      parcela >= 13 && parcela === parcelaReajusteDoCiclo(parcela);
    const emitido = tituloPorParcela.get(parcela) ?? null;
    const valorEmitido = emitido?.valorNominal ?? null;
    const valor = detalhe.valorNominal;
    const divergencia = valorEmitido != null ? roundMoney(valorEmitido - valor) : null;

    resultados.push({
      parcela,
      vencimento: formatIsoDate(vencimentos.get(parcela)!),
      valorSimulado: valor,
      parcelaReajuste: isParcelaReajuste(parcela),
      reajusteAplicadoNestaParcela: reajusteNesta,
      percentualFixoReajuste: reajusteNesta ? REAJUSTE_PERCENTUAL_FIXO : null,
      indice12MesesReferencia: reajusteNesta ? detalhe.ipcaAcumulado : null,
      mesesIndiceReferencia: reajusteNesta ? detalhe.mesesIpcaReferencia : null,
      percentualTotalReajuste: reajusteNesta ? detalhe.percentualTotalReajuste : null,
      mesReferenciaIndice:
        reajusteNesta && detalhe.anoMesReferencia != null
          ? formatAnoMesLabel(detalhe.anoMesReferencia)
          : null,
      tituloEmitido: emitido,
      valorEmitido,
      divergencia,
    });
  }

  return resultados;
}

export function periodoIndiceParaSimulacao(
  primeiraParcelaVencimento: string,
  parcelaAtual: number,
  tipoIndice: TipoIndiceSimulacao,
  referencia: Date = new Date(),
  quantidadeParcelasFracionadas?: number | null,
): { desde: string; ate: string } {
  const inicio = parseIsoDate(primeiraParcelaVencimento);
  const mesesLookback = Math.max(14, (quantidadeParcelasFracionadas ?? 0) + 2);
  const fimEstimado = subtractMonths(inicio, -(parcelaAtual + mesesLookback));
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const ateCalculado = fmt(fimEstimado);
  const ateMesAtual = fmt(referencia);
  const desdeCalculado = fmt(subtractMonths(inicio, mesesLookback));
  const serieInicio = INDICE_SERIE_INICIO_ANO_MES[tipoIndice];
  return {
    desde: desdeCalculado < serieInicio ? serieInicio : desdeCalculado,
    ate: ateCalculado <= ateMesAtual ? ateCalculado : ateMesAtual,
  };
}

export function resumoBasesContrato(condicoes: CondicoesValorNominal): string {
  const qtd = condicoes.quantidadeParcelasFracionadas ?? 0;
  if (qtd > 0 && condicoes.valorFracionadoVendedora != null) {
    return `1–${qtd}: fracionado · ${qtd + 1}+: parcela cheia`;
  }
  return "parcela cheia em todas as faixas";
}
