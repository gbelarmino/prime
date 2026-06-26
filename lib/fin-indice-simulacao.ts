import { finService, type IndiceEconomicoMensal, type TituloCobranca, type TituloContextoLote } from "@/lib/fin-service";
import { isParcelaReajuste } from "@/lib/fin-parcela-reajuste";
import {
  calcularVencimentosComPrimeiraParcelaDetalhe,
  calcularVencimentosParcelasDetalhe,
  formatIsoDate,
  isVencimentoFuturo,
  parseIsoDate,
} from "@/lib/fin-vencimento";
import {
  acumularVariacaoFraction,
  detalheReajusteParcela,
  indiceDisponivelParaPeriodo,
  mesCorteIndiceReajuste,
  mesesIpcaParaReajuste,
  parcelaReajusteDoCiclo,
  REAJUSTE_PERCENTUAL_FIXO,
  vencimentoProjetadoParcela,
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
  /** Parcela de reajuste (13, 25, 37…) na série. */
  parcelaReajuste: boolean;
  /** Reajuste calculado e aplicado nesta parcela. */
  reajusteAplicadoNestaParcela: boolean;
  /** Parcela de reajuste aguardando publicação do índice (valor não recalculado). */
  reajusteAguardandoIndice: boolean;
  /** Parcela cujo vencimento cai no mês de corte do índice (fim da janela acumulada). */
  marcoCorteIndice: boolean;
  /** Marco de corte sem série completa do índice para o período. */
  indiceCorteIndisponivel: boolean;
  parcelaReajusteDestino: number | null;
  indiceAcumuladoMarcoCorte: number | null;
  mesCorteIndiceLabel: string | null;
  mesesIndiceMarcoCorte: number | null;
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

/** Parcela que exibe o ponto de corte do índice antes do reajuste (ex.: 59 → reajuste na 61). */
export function parcelaMarcoCorteParaReajuste(parcelaReajuste: number): number {
  return parcelaReajuste - 2;
}

type MarcoCorteIndice = {
  parcelaReajusteDestino: number;
  indiceAcumuladoMarcoCorte: number | null;
  mesCorteIndiceLabel: string;
  mesesIndiceMarcoCorte: number;
  indiceDisponivel: boolean;
};

function buildMarcadoresCorteIndice(opts: {
  parcelaLimite: number;
  vencimentoPorParcela: (parcela: number) => Date;
  condicoes: CondicoesValorNominal;
  lookup: IndiceMensalLookup;
}): Map<number, MarcoCorteIndice> {
  const { parcelaLimite, vencimentoPorParcela, condicoes, lookup } = opts;
  const qtdFracionadas = condicoes.quantidadeParcelasFracionadas ?? 0;
  const marcos = new Map<number, MarcoCorteIndice>();

  for (let parcelaReajuste = 13; parcelaReajuste <= parcelaLimite; parcelaReajuste += 12) {
    const parcelaMarco = parcelaMarcoCorteParaReajuste(parcelaReajuste);
    if (parcelaMarco < 1 || parcelaMarco > parcelaLimite) {
      continue;
    }

    const vencReajuste = vencimentoPorParcela(parcelaReajuste);
    const anoMesCorte = mesCorteIndiceReajuste(vencReajuste);
    const mesesIndice = mesesIpcaParaReajuste(parcelaReajuste, qtdFracionadas);

    if (condicoes.tipoCorrecaoAnual === "NENHUM") {
      continue;
    }

    const indiceDisponivel = indiceDisponivelParaPeriodo(lookup, anoMesCorte, mesesIndice);
    const indiceAcumulado = indiceDisponivel
      ? acumularVariacaoFraction(lookup, anoMesCorte, mesesIndice) * 100
      : null;

    marcos.set(parcelaMarco, {
      parcelaReajusteDestino: parcelaReajuste,
      indiceAcumuladoMarcoCorte: indiceAcumulado,
      mesCorteIndiceLabel: formatAnoMesLabel(anoMesCorte),
      mesesIndiceMarcoCorte: mesesIndice,
      indiceDisponivel,
    });
  }

  return marcos;
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

/**
 * Extensão da simulação: múltiplo de 12 estritamente superior à última parcela emitida.
 * Ex.: última emitida 72 → simula até 84; última 71 → até 72.
 */
export function resolverParcelaLimiteSimulacao(titulos: TituloCobranca[]): number {
  const emitidos = titulos.filter(
    (t) => t.status !== "CANCELADO" && t.status !== "RASCUNHO",
  );
  const maxEmitida = emitidos.length
    ? Math.max(...emitidos.map((t) => t.numeroParcela))
    : 0;
  if (maxEmitida < 1) {
    return 0;
  }
  return Math.ceil((maxEmitida + 1) / 12) * 12;
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
  /** Vencimento informado na emissão/cálculo da parcela alvo (espelha backend). */
  vencimentoParcelaAlvo?: Date | null;
}): IndiceSimulacaoParcela[] {
  const {
    titulos,
    diaVencimentoMensal,
    parcelaAtual,
    indices,
    condicoes,
    dataPrimeiraParcelaContrato,
    vencimentoParcelaAlvo,
  } = opts;
  const parcelaLimite = resolverParcelaLimiteSimulacao(titulos);
  if (parcelaLimite < 1) return [];
  if (titulos.length === 0 && !dataPrimeiraParcelaContrato) return [];

  const sorted = [...titulos].sort((a, b) => a.numeroParcela - b.numeroParcela);
  const titulosCalculo = titulosEfetivosParaVencimento(sorted);
  const tituloP1 = titulosCalculo.find((t) => t.numeroParcela === 1);
  const dataPrimeiraParcela = tituloP1
    ? parseIsoDate(tituloP1.vencimento)
    : dataPrimeiraParcelaContrato
      ? parseIsoDate(dataPrimeiraParcelaContrato)
      : parseIsoDate(sorted[0]!.vencimento);
  const tituloPorParcela = new Map(sorted.map((t) => [t.numeroParcela, t]));
  const lookup = buildIndiceLookup(indices);

  const vencimentosInformados =
    vencimentoParcelaAlvo != null && parcelaAtual >= 1
      ? new Map<number, Date>([[parcelaAtual, vencimentoParcelaAlvo]])
      : undefined;

  const vencimentoPorParcela = buildVencimentoPorParcelaCalculo({
    titulos: sorted,
    dataPrimeiraParcelaContrato: formatIsoDate(dataPrimeiraParcela),
    diaVencimentoMensal,
    parcelaMaxima: parcelaLimite,
    vencimentosInformados,
  });

  const vencimentos = new Map<number, Date>();
  for (let parcela = 1; parcela <= parcelaLimite; parcela++) {
    vencimentos.set(parcela, vencimentoPorParcela(parcela));
  }

  const marcosCorte = buildMarcadoresCorteIndice({
    parcelaLimite,
    vencimentoPorParcela,
    condicoes,
    lookup,
  });

  const resultados: IndiceSimulacaoParcela[] = [];
  for (let parcela = 1; parcela <= parcelaLimite; parcela++) {
    const detalhe = detalheReajusteParcela(
      condicoes,
      parcela,
      dataPrimeiraParcela,
      diaVencimentoMensal,
      lookup,
      vencimentoPorParcela,
    );
    const ehParcelaReajuste = isParcelaReajuste(parcela);
    const reajusteCalculado =
      ehParcelaReajuste && detalhe.indiceDisponivelParaReajuste;
    const emitido = tituloPorParcela.get(parcela) ?? null;
    const valorEmitido = emitido?.valorNominal ?? null;
    const valor = detalhe.valorNominal;
    const divergencia = valorEmitido != null ? roundMoney(valorEmitido - valor) : null;
    const marco = marcosCorte.get(parcela) ?? null;

    resultados.push({
      parcela,
      vencimento: formatIsoDate(vencimentos.get(parcela)!),
      valorSimulado: valor,
      parcelaReajuste: ehParcelaReajuste,
      reajusteAplicadoNestaParcela: reajusteCalculado,
      reajusteAguardandoIndice: ehParcelaReajuste && !detalhe.indiceDisponivelParaReajuste,
      marcoCorteIndice: marco != null,
      indiceCorteIndisponivel: marco != null && !marco.indiceDisponivel,
      parcelaReajusteDestino: marco?.parcelaReajusteDestino ?? null,
      indiceAcumuladoMarcoCorte: marco?.indiceAcumuladoMarcoCorte ?? null,
      mesCorteIndiceLabel: marco?.mesCorteIndiceLabel ?? null,
      mesesIndiceMarcoCorte: marco?.mesesIndiceMarcoCorte ?? null,
      percentualFixoReajuste: reajusteCalculado ? REAJUSTE_PERCENTUAL_FIXO : null,
      indice12MesesReferencia: reajusteCalculado ? detalhe.ipcaAcumulado : null,
      mesesIndiceReferencia: reajusteCalculado ? detalhe.mesesIpcaReferencia : null,
      percentualTotalReajuste: reajusteCalculado ? detalhe.percentualTotalReajuste : null,
      mesReferenciaIndice:
        reajusteCalculado && detalhe.anoMesReferencia != null
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

function listarIndices(
  tipo: TipoIndiceSimulacao,
  periodo: { desde: string; ate: string },
): Promise<IndiceEconomicoMensal[]> {
  return tipo === "IPCA"
    ? finService.listIndicesIpca(periodo)
    : finService.listIndicesIgpm(periodo);
}

export async function listarTitulosDoLote(
  empreendimento: string,
  quadra: string,
  lote: number,
): Promise<TituloCobranca[]> {
  const size = 200;
  let page = 0;
  const todos: TituloCobranca[] = [];
  for (;;) {
    const res = await finService.listTitulos(page, size, {
      empreendimento,
      quadra,
      lote,
    });
    todos.push(...(res.content ?? []));
    if (res.number >= res.totalPages - 1 || (res.content?.length ?? 0) < size) break;
    page += 1;
  }
  return todos.sort((a, b) => a.numeroParcela - b.numeroParcela);
}

export type SimulacaoEvolucaoContrato = {
  contexto: TituloContextoLote;
  simulacao: IndiceSimulacaoParcela[];
  labelIndice: string;
  tipoIndice: TipoIndiceSimulacao | null;
  condicoesResumo: string;
  primeiraVencimento: string;
};

export async function carregarSimulacaoEvolucaoContrato(opts: {
  empreendimento: string;
  quadra: string;
  lote: number;
  parcelaAlvo: number;
  vencimentoParcelaAlvo?: Date | null;
}): Promise<SimulacaoEvolucaoContrato> {
  const { empreendimento, quadra, lote, parcelaAlvo, vencimentoParcelaAlvo } = opts;
  const [titulos, contexto] = await Promise.all([
    listarTitulosDoLote(empreendimento, quadra, lote),
    finService.contextoLote(empreendimento, quadra, lote),
  ]);

  if (contexto.valorParcela == null) {
    throw new Error("Contrato sem valor de parcela configurado.");
  }

  const condicoes: CondicoesValorNominal = {
    quantidadeParcelasFracionadas: contexto.quantidadeParcelasFracionadas ?? null,
    valorFracionadoVendedora: contexto.valorFracionadoVendedora ?? null,
    valorParcela: contexto.valorParcela,
    tipoCorrecaoAnual: contexto.tipoCorrecaoAnual ?? null,
  };

  const tipoIndiceContrato = resolverTipoIndiceContrato(contexto.tipoCorrecaoAnual);
  const labelIndice =
    contexto.tipoCorrecaoAnual === "NENHUM"
      ? "sem índice"
      : tipoIndiceContrato === "IPCA"
        ? "IPCA"
        : "IGP-M";

  const dataPrimeira = contexto.dataPrimeiraParcelaContrato;
  const indices =
    tipoIndiceContrato != null
      ? await listarIndices(
          tipoIndiceContrato,
          periodoIndiceParaSimulacao(
            dataPrimeira,
            parcelaAlvo,
            tipoIndiceContrato,
            new Date(),
            condicoes.quantidadeParcelasFracionadas,
          ),
        )
      : [];

  const simulacao = simularParcelasIndice({
    titulos,
    diaVencimentoMensal: contexto.diaVencimentoMensal,
    parcelaAtual: parcelaAlvo,
    indices,
    condicoes,
    dataPrimeiraParcelaContrato: dataPrimeira,
    vencimentoParcelaAlvo,
  });

  const partes = [
    resumoBasesContrato(condicoes),
    condicoes.valorFracionadoVendedora != null
      ? `fracionado ${condicoes.valorFracionadoVendedora.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })}`
      : null,
    `parcela ${contexto.valorParcela.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })}`,
    contexto.tipoCorrecaoAnual
      ? `correção ${contexto.tipoCorrecaoAnual === "NENHUM" ? "nenhuma" : labelIndice}`
      : "correção IGP-M (legado)",
  ].filter(Boolean);

  return {
    contexto,
    simulacao,
    labelIndice,
    tipoIndice: tipoIndiceContrato,
    condicoesResumo: partes.join(" · "),
    primeiraVencimento: dataPrimeira,
  };
}

export function condicoesFromContexto(ctx: TituloContextoLote): CondicoesValorNominal {
  if (ctx.valorParcela == null) {
    throw new Error("Contrato sem valor de parcela configurado.");
  }
  return {
    quantidadeParcelasFracionadas: ctx.quantidadeParcelasFracionadas ?? null,
    valorFracionadoVendedora: ctx.valorFracionadoVendedora ?? null,
    valorParcela: ctx.valorParcela,
    tipoCorrecaoAnual: ctx.tipoCorrecaoAnual ?? null,
  };
}

function titulosEfetivosParaVencimento(titulos: TituloCobranca[]): TituloCobranca[] {
  return titulos.filter((t) => t.status !== "CANCELADO" && t.status !== "RASCUNHO");
}

/**
 * Cronograma mensal a partir da parcela 1 (ajuste de fim de semana), com override dos títulos emitidos.
 */
export function buildVencimentoPorParcelaCalculo(opts: {
  titulos: TituloCobranca[];
  dataPrimeiraParcelaContrato: string;
  diaVencimentoMensal: number;
  parcelaMaxima: number;
  vencimentosInformados?: Map<number, Date>;
}): (parcela: number) => Date {
  const titulosCalculo = titulosEfetivosParaVencimento(opts.titulos);
  const tituloPorParcela = new Map(
    [...titulosCalculo]
      .sort((a, b) => a.numeroParcela - b.numeroParcela)
      .map((t) => [t.numeroParcela, t] as const),
  );
  const tituloP1 = tituloPorParcela.get(1);
  const primeiraData = tituloP1
    ? parseIsoDate(tituloP1.vencimento)
    : parseIsoDate(opts.dataPrimeiraParcelaContrato);

  const maxParcela = Math.max(
    opts.parcelaMaxima,
    ...titulosCalculo.map((t) => t.numeroParcela),
    ...Array.from(opts.vencimentosInformados?.keys() ?? []),
    1,
  );

  const detalhes = calcularVencimentosComPrimeiraParcelaDetalhe(
    primeiraData,
    opts.diaVencimentoMensal,
    maxParcela,
  );

  const cache = new Map<number, Date>();

  return (parcela: number) => {
    const hit = cache.get(parcela);
    if (hit) {
      return hit;
    }

    let vencimento: Date;
    const informado = opts.vencimentosInformados?.get(parcela);
    if (informado) {
      vencimento = informado;
    } else {
      const emitido = tituloPorParcela.get(parcela);
      if (emitido) {
        vencimento = parseIsoDate(emitido.vencimento);
      } else {
        const projetado = detalhes[parcela - 1]?.vencimento;
        if (projetado) {
          vencimento = projetado;
        } else if (detalhes.length > 0) {
          const ultimo = detalhes[detalhes.length - 1]!.vencimento;
          const offset = parcela - detalhes.length;
          vencimento = calcularVencimentosParcelasDetalhe(
            opts.diaVencimentoMensal,
            ultimo,
            offset,
          ).at(-1)!.vencimento;
        } else {
          vencimento = vencimentoProjetadoParcela(
            parcela,
            primeiraData,
            opts.diaVencimentoMensal,
          );
        }
      }
    }

    cache.set(parcela, vencimento);
    return vencimento;
  };
}

/** Vencimentos do lote (espelha backend + preview TitulosList). */
export function buildParcelasVencimentosNovoLote(opts: {
  contexto: TituloContextoLote;
  dataPrimeiraParcela: Date | null;
  quantidadeParcelas: number;
  maxParcelasPermitidas: number;
  parcelaReajusteLimite: number;
}): Map<number, Date> {
  const {
    contexto,
    dataPrimeiraParcela,
    quantidadeParcelas,
    maxParcelasPermitidas,
    parcelaReajusteLimite,
  } = opts;
  const map = new Map<number, Date>();
  const parcelaInicial = contexto.numeroParcela;
  const usarDataPrimeiraLote =
    dataPrimeiraParcela != null && isVencimentoFuturo(dataPrimeiraParcela);
  const referencia = parseIsoDate(contexto.referenciaVencimento ?? contexto.vencimentoSugerido);

  const vencimentoDetalheParaOffset = (offset: number): Date | undefined => {
    const detalhe = usarDataPrimeiraLote
      ? calcularVencimentosComPrimeiraParcelaDetalhe(
          dataPrimeiraParcela!,
          contexto.diaVencimentoMensal,
          offset,
        ).at(-1)
      : calcularVencimentosParcelasDetalhe(
          contexto.diaVencimentoMensal,
          referencia,
          offset,
        ).at(-1);
    return detalhe?.vencimento;
  };

  if (maxParcelasPermitidas >= 1 && quantidadeParcelas >= 1) {
    const qtd = Math.min(maxParcelasPermitidas, Math.floor(quantidadeParcelas));
    const parcelaFinal = parcelaInicial + qtd - 1;
    const vencimentosDetalhe = usarDataPrimeiraLote
      ? calcularVencimentosComPrimeiraParcelaDetalhe(
          dataPrimeiraParcela!,
          contexto.diaVencimentoMensal,
          qtd,
        )
      : calcularVencimentosParcelasDetalhe(
          contexto.diaVencimentoMensal,
          referencia,
          qtd,
        );

    vencimentosDetalhe.forEach((detalhe, index) => {
      map.set(parcelaInicial + index, detalhe.vencimento);
    });

    if (qtd === maxParcelasPermitidas && parcelaFinal < parcelaReajusteLimite) {
      for (let parcela = parcelaFinal + 1; parcela <= parcelaReajusteLimite; parcela++) {
        const offset = parcela - parcelaInicial + 1;
        const vencimento = vencimentoDetalheParaOffset(offset);
        if (vencimento) {
          map.set(parcela, vencimento);
        }
      }
    }
  } else {
    const vencimento =
      dataPrimeiraParcela != null && isVencimentoFuturo(dataPrimeiraParcela)
        ? dataPrimeiraParcela
        : parseIsoDate(contexto.vencimentoSugerido);
    map.set(parcelaInicial, vencimento);
  }

  return map;
}

/**
 * Valor nominal por parcela na emissão em lote (espelha TituloValorNominalService no backend).
 */
export async function calcularValoresNominaisNovoLote(
  contexto: TituloContextoLote,
  titulos: TituloCobranca[],
  parcelasComVencimento: Map<number, Date>,
): Promise<Map<number, number>> {
  if (contexto.valorParcela == null || parcelasComVencimento.size === 0) {
    return new Map();
  }

  const condicoes = condicoesFromContexto(contexto);
  const dataPrimeiraContrato = parseIsoDate(contexto.dataPrimeiraParcelaContrato);
  const diaVencimento = contexto.diaVencimentoMensal;
  const maxParcela = Math.max(...parcelasComVencimento.keys());
  const tipoIndice = resolverTipoIndiceContrato(contexto.tipoCorrecaoAnual);

  let lookup: IndiceMensalLookup = {
    variacaoMensalPorAnoMes: new Map(),
    variacao12MesesPorAnoMes: new Map(),
  };

  if (maxParcela >= 13 && tipoIndice != null) {
    const indices = await listarIndices(
      tipoIndice,
      periodoIndiceParaSimulacao(
        contexto.dataPrimeiraParcelaContrato,
        maxParcela,
        tipoIndice,
        new Date(),
        condicoes.quantidadeParcelasFracionadas,
      ),
    );
    lookup = buildIndiceLookup(indices);
  }

  const vencimentoPorParcela = buildVencimentoPorParcelaCalculo({
    titulos,
    dataPrimeiraParcelaContrato: contexto.dataPrimeiraParcelaContrato,
    diaVencimentoMensal: diaVencimento,
    parcelaMaxima: maxParcela,
    vencimentosInformados: parcelasComVencimento,
  });

  const resultado = new Map<number, number>();
  for (const [parcela] of parcelasComVencimento) {
    const valor = detalheReajusteParcela(
      condicoes,
      parcela,
      dataPrimeiraContrato,
      diaVencimento,
      lookup,
      vencimentoPorParcela,
    ).valorNominal;
    resultado.set(parcela, valor);
  }
  return resultado;
}
