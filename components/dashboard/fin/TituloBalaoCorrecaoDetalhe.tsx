import { formatPercentualIndice } from "@/lib/fin-indice-simulacao";
import type { BalaoCorrecaoCicloDetalhe, BalaoValorNominalCalculoDetalhe } from "@/lib/fin-service";

function formatMoney(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso + (iso.length === 10 ? "T12:00:00" : "")).toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
}

function CicloCorrecao({
  ciclo,
  tipoIndice,
}: {
  ciclo: BalaoCorrecaoCicloDetalhe;
  tipoIndice: string;
}) {
  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5 text-xs leading-relaxed text-white/70">
      <p className="font-semibold text-white/85">
        Reajuste na parcela {ciclo.parcelaReajuste}
        <span className="font-normal text-white/45"> · venc. {formatDate(ciclo.vencimentoReajuste)}</span>
      </p>
      {!ciclo.indiceDisponivel ? (
        <p className="mt-1 text-amber-200/90">
          Índice {tipoIndice} indisponível para corte {ciclo.mesCorteIndice} — valor mantido em{" "}
          {formatMoney(ciclo.valorAntes)}.
        </p>
      ) : (
        <>
          <p className="mt-1">
            Corte {tipoIndice} até <span className="text-white/90">{ciclo.mesCorteIndice}</span>
            {ciclo.indiceAcumuladoPercent != null ? (
              <>
                {" "}
                · acumulado{" "}
                <span className="text-sky-200/95">
                  {formatPercentualIndice(ciclo.indiceAcumuladoPercent)}
                </span>
              </>
            ) : null}
          </p>
          <p className="mt-0.5 text-violet-200/90">
            {formatPercentualIndice(ciclo.percentualFixoPercent)} fixo
            {ciclo.indiceAcumuladoPercent != null && ciclo.indiceAcumuladoPercent > 0
              ? ` + ${tipoIndice} ${formatPercentualIndice(ciclo.indiceAcumuladoPercent)}`
              : ciclo.indiceAcumuladoPercent != null && ciclo.indiceAcumuladoPercent < 0
                ? ` · índice negativo → só ${formatPercentualIndice(ciclo.percentualFixoPercent)}`
                : ""}
            {ciclo.percentualAplicadoPercent != null ? (
              <>
                {" "}
                ={" "}
                <span className="font-semibold text-violet-100">
                  {formatPercentualIndice(ciclo.percentualAplicadoPercent)} aplicado
                </span>
                {ciclo.percentualAplicadoPercent >= 12 ? " (teto 12%)" : ""}
              </>
            ) : null}
          </p>
          <p className="mt-1 tabular-nums text-white/55">
            {formatMoney(ciclo.valorAntes)} → {formatMoney(ciclo.valorDepois)}
          </p>
        </>
      )}
    </div>
  );
}

export function TituloBalaoCorrecaoDetalhe({
  correcao,
}: {
  correcao: BalaoValorNominalCalculoDetalhe;
}) {
  const { tipoIndice, ciclos, valorBase, valorNominal, valorContratualFixo, avisoIndice } = correcao;

  return (
    <div className="col-span-2 flex flex-col gap-3 border-t border-white/8 pt-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">
          Cálculo da correção
        </p>
        <p className="mt-1 text-xs text-white/45">
          Regra: {tipoIndice} fechado no mês anterior ao vencimento + 6% fixo · teto 12% · índice
          negativo → só 6%.
        </p>
      </div>

      {valorContratualFixo ? (
        <p className="text-xs text-white/55">Valor contratual fixo cadastrado no contrato.</p>
      ) : (
        <>
          <p className="text-xs text-white/60">
            Valor base (B1): <span className="font-medium text-white/85">{formatMoney(valorBase)}</span>
          </p>

          {ciclos.length === 0 ? (
            <p className="text-xs text-white/50">
              Sem correção — parcela de referência anterior ao 1º reajuste (parcela 13).
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {ciclos.map((ciclo) => (
                <CicloCorrecao key={ciclo.parcelaReajuste} ciclo={ciclo} tipoIndice={tipoIndice} />
              ))}
            </div>
          )}

          <p className="text-xs font-medium text-emerald-300/90">
            Valor nominal: {formatMoney(valorNominal)}
          </p>

          {avisoIndice ? (
            <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200/90">
              {avisoIndice}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
