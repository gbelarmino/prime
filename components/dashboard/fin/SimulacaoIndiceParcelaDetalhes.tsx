import {
  formatPercentualIndice,
  type IndiceSimulacaoParcela,
} from "@/lib/fin-indice-simulacao";

export function SimulacaoIndiceParcelaDetalhes({
  item,
  labelIndice,
}: {
  item: IndiceSimulacaoParcela;
  labelIndice: string;
}) {
  return (
    <>
      {item.marcoCorteIndice ? (
        <div className="mt-1 text-[10px] leading-tight text-sky-200/90">
          {item.indiceCorteIndisponivel ? (
            <>
              <span className="font-semibold text-amber-200/95">
                Corte {labelIndice} até {item.mesCorteIndiceLabel ?? "—"}
              </span>
              <span className="block text-amber-200/80">
                Índice ainda não disponível
                {item.mesesIndiceMarcoCorte != null
                  ? item.mesesIndiceMarcoCorte === 12
                    ? " (12 meses)"
                    : ` (${item.mesesIndiceMarcoCorte} meses)`
                  : ""}
              </span>
            </>
          ) : (
            <>
              <span className="font-semibold text-sky-100">
                {labelIndice}{" "}
                {item.indiceAcumuladoMarcoCorte != null
                  ? formatPercentualIndice(item.indiceAcumuladoMarcoCorte)
                  : "—"}{" "}
                acumulado
              </span>
              <span className="block text-sky-200/75">
                até {item.mesCorteIndiceLabel ?? "—"}
                {item.mesesIndiceMarcoCorte != null && item.mesesIndiceMarcoCorte !== 12
                  ? ` (${item.mesesIndiceMarcoCorte} meses)`
                  : item.mesesIndiceMarcoCorte === 12
                    ? " (12 meses)"
                    : ""}
              </span>
            </>
          )}
          {item.parcelaReajusteDestino != null ? (
            <span className="block font-medium text-sky-100/85">
              → reajuste na parc. {item.parcelaReajusteDestino}
            </span>
          ) : null}
        </div>
      ) : null}
      {item.reajusteAguardandoIndice ? (
        <div className="mt-1 text-[10px] leading-tight text-amber-200/90">
          <span className="font-semibold text-amber-100">
            Reajuste pendente — {labelIndice} ainda não disponível
          </span>
          <span className="block text-amber-200/75">
            Valor mantido do ciclo anterior (sem cálculo)
          </span>
        </div>
      ) : item.reajusteAplicadoNestaParcela ? (
        <div className="mt-1 text-[10px] leading-tight text-violet-300/90">
          <span className="font-semibold">
            {item.percentualTotalReajuste != null
              ? `Reajuste ${formatPercentualIndice(item.percentualTotalReajuste)}`
              : "Reajuste —"}
          </span>
          <span className="block text-violet-300/75">
            {formatPercentualIndice(item.percentualFixoReajuste)} fixo
            {item.indice12MesesReferencia != null
              ? ` + ${labelIndice} ${formatPercentualIndice(item.indice12MesesReferencia)}${
                  item.mesesIndiceReferencia != null && item.mesesIndiceReferencia !== 12
                    ? ` (${item.mesesIndiceReferencia} meses)`
                    : item.mesesIndiceReferencia === 12
                      ? " (12 meses)"
                      : ""
                }`
              : ` + ${labelIndice} —`}
          </span>
          {item.mesReferenciaIndice ? (
            <span className="block font-medium text-violet-200/90">
              Corte: {item.mesReferenciaIndice}
              {item.indice12MesesReferencia != null
                ? ` · ${labelIndice} ${formatPercentualIndice(item.indice12MesesReferencia)}`
                : ""}
            </span>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
