import {
  isParcelaReajuste,
  maxParcelasAteProximoReajuste,
  proximaParcelaComReajuste,
  ultimaParcelaEmitivelEmLote,
} from "@/lib/fin-parcela-reajuste";
import {
  calcularVencimentosComPrimeiraParcelaDetalhe,
  calcularVencimentosParcelasDetalhe,
  formatIsoDate,
  isVencimentoFuturo,
  parseIsoDate,
} from "@/lib/fin-vencimento";

export type PreviewLoteItem = {
  parcela: number;
  vencimento: string;
  vencimentoBruto: string;
  ajustadoPorDiaUtil: boolean;
  excedente: boolean;
  parcelaReajuste: boolean;
};

export type PreviewLote = {
  parcelaInicial: number;
  parcelaFinal: number;
  quantidade: number;
  ajustadosPorDiaUtil: number;
  parcelaReajusteLimite: number;
  ultimaParcelaEmitivel: number;
  primeiroVencimento: string | null;
  ultimoVencimento: string | null;
  itens: PreviewLoteItem[];
  itensExcedentes: PreviewLoteItem[];
  itensRevisao: PreviewLoteItem[];
};

export function resolveMaxParcelasLote(
  parcelaInicial: number,
  maxParcelasPermitidasCtx?: number | null,
): number {
  if (maxParcelasPermitidasCtx != null && maxParcelasPermitidasCtx >= 0) {
    return maxParcelasPermitidasCtx;
  }
  return maxParcelasAteProximoReajuste(parcelaInicial);
}

export function resolveParcelaReajusteLimiteLote(
  parcelaInicial: number,
  parcelaReajusteLimiteCtx?: number | null,
): number {
  return parcelaReajusteLimiteCtx ?? proximaParcelaComReajuste(parcelaInicial);
}

export function buildPreviewLote(input: {
  parcelaInicial: number;
  diaVencimentoMensal: number;
  referenciaVencimento: string;
  quantidadeParcelas: number;
  dataPrimeiraParcela: Date | null;
  maxParcelasPermitidas?: number | null;
  parcelaReajusteLimite?: number | null;
}): PreviewLote | null {
  const {
    parcelaInicial,
    diaVencimentoMensal,
    referenciaVencimento,
    quantidadeParcelas,
    dataPrimeiraParcela,
  } = input;

  const maxParcelasPermitidas = resolveMaxParcelasLote(
    parcelaInicial,
    input.maxParcelasPermitidas,
  );
  const parcelaReajusteLimite = resolveParcelaReajusteLimiteLote(
    parcelaInicial,
    input.parcelaReajusteLimite,
  );
  const ultimaParcelaEmitivel = ultimaParcelaEmitivelEmLote(parcelaInicial);

  if (maxParcelasPermitidas < 1 || quantidadeParcelas < 1) return null;

  const qtd = Math.min(maxParcelasPermitidas, Math.floor(quantidadeParcelas));
  const parcelaFinal = parcelaInicial + qtd - 1;

  const usarDataPrimeiraLote =
    dataPrimeiraParcela != null && isVencimentoFuturo(dataPrimeiraParcela);

  const vencimentosDetalhe = usarDataPrimeiraLote
    ? calcularVencimentosComPrimeiraParcelaDetalhe(
        dataPrimeiraParcela,
        diaVencimentoMensal,
        qtd,
      )
    : calcularVencimentosParcelasDetalhe(
        diaVencimentoMensal,
        parseIsoDate(referenciaVencimento),
        qtd,
      );

  const itens: PreviewLoteItem[] = vencimentosDetalhe.map((detalhe, index) => ({
    parcela: parcelaInicial + index,
    vencimento: formatIsoDate(detalhe.vencimento),
    vencimentoBruto: formatIsoDate(detalhe.vencimentoBruto),
    ajustadoPorDiaUtil: detalhe.ajustadoPorDiaUtil,
    excedente: false,
    parcelaReajuste: false,
  }));

  const itensExcedentes: PreviewLoteItem[] = [];
  if (qtd === maxParcelasPermitidas && parcelaFinal < parcelaReajusteLimite) {
    for (let parcela = parcelaFinal + 1; parcela <= parcelaReajusteLimite; parcela++) {
      const offset = parcela - parcelaInicial + 1;
      const detalhe = usarDataPrimeiraLote
        ? calcularVencimentosComPrimeiraParcelaDetalhe(
            dataPrimeiraParcela!,
            diaVencimentoMensal,
            offset,
          ).at(-1)
        : calcularVencimentosParcelasDetalhe(
            diaVencimentoMensal,
            parseIsoDate(referenciaVencimento),
            offset,
          ).at(-1);
      if (!detalhe) continue;
      itensExcedentes.push({
        parcela,
        vencimento: formatIsoDate(detalhe.vencimento),
        vencimentoBruto: formatIsoDate(detalhe.vencimentoBruto),
        ajustadoPorDiaUtil: detalhe.ajustadoPorDiaUtil,
        excedente: true,
        parcelaReajuste: isParcelaReajuste(parcela),
      });
    }
  }

  const ajustadosPorDiaUtil = itens.filter((item) => item.ajustadoPorDiaUtil).length;

  return {
    parcelaInicial,
    parcelaFinal,
    quantidade: qtd,
    ajustadosPorDiaUtil,
    parcelaReajusteLimite,
    ultimaParcelaEmitivel,
    primeiroVencimento: itens[0]?.vencimento ?? null,
    ultimoVencimento: itens.at(-1)?.vencimento ?? null,
    itens,
    itensExcedentes,
    itensRevisao: [...itens, ...itensExcedentes],
  };
}
