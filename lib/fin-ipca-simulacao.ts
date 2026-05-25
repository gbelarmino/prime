/** Reexporta API genérica com nomes legados IPCA (compatibilidade). */
import {
  periodoIndiceParaSimulacao,
  type IndiceSimulacaoParcela,
} from "@/lib/fin-indice-simulacao";

export {
  REAJUSTE_PERCENTUAL_FIXO_PADRAO,
  formatAnoMesLabel,
  formatPercentualIndice as formatPercentualIpca,
  indicesPorAnoMes as indicesIpcaPorAnoMes,
  resolverParcelaAtual,
  resolverParcelaLimiteMesAtual,
  resolverPercentualFixoReajuste,
  simularParcelasIndice as simularParcelasIpca,
} from "@/lib/fin-indice-simulacao";

export type IpcaSimulacaoParcela = IndiceSimulacaoParcela;

export const IPCA_SERIE_INICIO_ANO_MES = "2015-01";

export function periodoIpcaParaSimulacao(
  primeiraParcelaVencimento: string,
  parcelaAtual: number,
  referencia: Date = new Date(),
): { desde: string; ate: string } {
  return periodoIndiceParaSimulacao(
    primeiraParcelaVencimento,
    parcelaAtual,
    "IPCA",
    referencia,
  );
}
