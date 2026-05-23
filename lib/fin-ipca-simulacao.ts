import type { IndiceEconomicoMensal, TituloCobranca } from "@/lib/fin-service";
import { isParcelaReajuste } from "@/lib/fin-parcela-reajuste";
import {
  calcularVencimentosParcelasDetalhe,
  formatIsoDate,
  parseIsoDate,
} from "@/lib/fin-vencimento";

export type IpcaSimulacaoParcela = {
  parcela: number;
  vencimento: string;
  valorSimulado: number;
  parcelaReajuste: boolean;
  reajusteAplicadoNestaParcela: boolean;
  percentualFixoReajuste: number | null;
  ipca12MesesReferencia: number | null;
  percentualTotalReajuste: number | null;
  mesReferenciaIpca: string | null;
  tituloEmitido: TituloCobranca | null;
  valorEmitido: number | null;
  divergencia: number | null;
};

/** Percentual fixo anual do contrato quando IPCA não está no cadastro (ex.: 6%). */
export const REAJUSTE_PERCENTUAL_FIXO_PADRAO = 6;

export function indicesIpcaPorAnoMes(
  indices: IndiceEconomicoMensal[],
): Map<number, IndiceEconomicoMensal> {
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

export function formatPercentualIpca(valor: number | null | undefined): string {
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

function calcularValorSimulado(
  valorBase: number,
  parcela: number,
  vencimentos: Map<number, Date>,
  indices: Map<number, IndiceEconomicoMensal>,
  percentualFixoReajuste: number,
): {
  valor: number;
  reajusteNesta: boolean;
  percentualFixo: number | null;
  ipca12: number | null;
  percentualTotal: number | null;
  mesRef: number | null;
} {
  let valor = valorBase;
  let reajusteNesta = false;
  let percentualFixo: number | null = null;
  let ipca12: number | null = null;
  let percentualTotal: number | null = null;
  let mesRef: number | null = null;

  for (let k = 1; ; k++) {
    const parcelaReajuste = 13 + (k - 1) * 12;
    if (parcelaReajuste > parcela) break;

    const venc = vencimentos.get(parcelaReajuste);
    if (!venc) break;

    const refDate = subtractMonths(venc, 1);
    const anoMes = anoMesFromDate(refDate);
    const indice = indices.get(anoMes);
    const variacao = indice?.variacao12Meses ?? null;

    const taxaAplicada = percentualFixoReajuste + (variacao ?? 0);
    valor = valor * (1 + taxaAplicada / 100);

    if (parcela === parcelaReajuste) {
      reajusteNesta = true;
      percentualFixo = percentualFixoReajuste;
      ipca12 = variacao;
      percentualTotal = taxaAplicada;
      mesRef = anoMes;
    }
  }

  return {
    valor: roundMoney(valor),
    reajusteNesta,
    percentualFixo,
    ipca12,
    percentualTotal,
    mesRef,
  };
}

function referenciaAntesPrimeiroVencimento(primeiroVencimento: Date): Date {
  const ref = new Date(
    primeiroVencimento.getFullYear(),
    primeiroVencimento.getMonth(),
    primeiroVencimento.getDate() - 1,
  );
  return ref;
}

export function resolverParcelaAtual(titulos: TituloCobranca[]): number {
  if (titulos.length === 0) return 0;
  return Math.max(...titulos.map((t) => t.numeroParcela));
}

/** Última parcela cujo vencimento cai no mês de referência ou antes (ex.: mês atual). */
export function resolverParcelaLimiteMesAtual(opts: {
  titulos: TituloCobranca[];
  diaVencimentoMensal: number;
  referencia?: Date;
  maxParcelas?: number;
}): number {
  const { titulos, diaVencimentoMensal, referencia = new Date(), maxParcelas = 360 } = opts;
  if (titulos.length === 0) return 0;

  const sorted = [...titulos].sort((a, b) => a.numeroParcela - b.numeroParcela);
  const primeiro = sorted[0];
  const primeiraData = parseIsoDate(primeiro.vencimento);
  const limiteAnoMes = anoMesFromDate(referencia);
  const tituloPorParcela = new Map(sorted.map((t) => [t.numeroParcela, t]));

  const detalhes = calcularVencimentosParcelasDetalhe(
    diaVencimentoMensal,
    referenciaAntesPrimeiroVencimento(primeiraData),
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

export function resolverPercentualFixoReajuste(percentualCorrecao?: number | null): number {
  if (percentualCorrecao != null && Number.isFinite(percentualCorrecao)) {
    return percentualCorrecao;
  }
  return REAJUSTE_PERCENTUAL_FIXO_PADRAO;
}

export function simularParcelasIpca(opts: {
  titulos: TituloCobranca[];
  diaVencimentoMensal: number;
  parcelaAtual: number;
  indices: IndiceEconomicoMensal[];
  percentualCorrecao?: number | null;
}): IpcaSimulacaoParcela[] {
  const { titulos, diaVencimentoMensal, parcelaAtual, indices, percentualCorrecao } = opts;
  if (parcelaAtual < 1 || titulos.length === 0) return [];

  const percentualFixoReajuste = resolverPercentualFixoReajuste(percentualCorrecao);

  const sorted = [...titulos].sort((a, b) => a.numeroParcela - b.numeroParcela);
  const primeiro = sorted[0];
  const valorBase = primeiro.valorNominal;
  const primeiraData = parseIsoDate(primeiro.vencimento);
  const tituloPorParcela = new Map(sorted.map((t) => [t.numeroParcela, t]));
  const indicesMap = indicesIpcaPorAnoMes(indices);

  const detalhes = calcularVencimentosParcelasDetalhe(
    diaVencimentoMensal,
    referenciaAntesPrimeiroVencimento(primeiraData),
    parcelaAtual,
  );

  const vencimentos = new Map<number, Date>();
  for (let parcela = 1; parcela <= parcelaAtual; parcela++) {
    const emitido = tituloPorParcela.get(parcela);
    if (emitido) {
      vencimentos.set(parcela, parseIsoDate(emitido.vencimento));
    } else {
      vencimentos.set(parcela, detalhes[parcela - 1]?.vencimento ?? primeiraData);
    }
  }

  const resultados: IpcaSimulacaoParcela[] = [];
  for (let parcela = 1; parcela <= parcelaAtual; parcela++) {
    const { valor, reajusteNesta, percentualFixo, ipca12, percentualTotal, mesRef } =
      calcularValorSimulado(
      valorBase,
      parcela,
      vencimentos,
      indicesMap,
      percentualFixoReajuste,
    );
    const emitido = tituloPorParcela.get(parcela) ?? null;
    const valorEmitido = emitido?.valorNominal ?? null;
    const divergencia =
      valorEmitido != null ? roundMoney(valorEmitido - valor) : null;

    resultados.push({
      parcela,
      vencimento: formatIsoDate(vencimentos.get(parcela)!),
      valorSimulado: valor,
      parcelaReajuste: isParcelaReajuste(parcela),
      reajusteAplicadoNestaParcela: reajusteNesta,
      percentualFixoReajuste: percentualFixo,
      ipca12MesesReferencia: ipca12,
      percentualTotalReajuste: percentualTotal,
      mesReferenciaIpca: mesRef != null ? formatAnoMesLabel(mesRef) : null,
      tituloEmitido: emitido,
      valorEmitido,
      divergencia,
    });
  }

  return resultados;
}

/** Início do backfill IPCA na API — garante índices para contratos antigos. */
export const IPCA_SERIE_INICIO_ANO_MES = "2015-01";

export function periodoIpcaParaSimulacao(
  primeiraParcelaVencimento: string,
  parcelaAtual: number,
  referencia: Date = new Date(),
): { desde: string; ate: string } {
  const inicio = parseIsoDate(primeiraParcelaVencimento);
  const fimEstimado = subtractMonths(inicio, -(parcelaAtual + 14));
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const ateCalculado = fmt(fimEstimado);
  const ateMesAtual = fmt(referencia);
  const desdeCalculado = fmt(subtractMonths(inicio, 2));
  return {
    desde: desdeCalculado < IPCA_SERIE_INICIO_ANO_MES ? IPCA_SERIE_INICIO_ANO_MES : desdeCalculado,
    ate: ateCalculado <= ateMesAtual ? ateCalculado : ateMesAtual,
  };
}
