"use client";

import { cn } from "@/lib/utils";
import {
  formatPercentualIndice,
  type IndiceSimulacaoParcela,
} from "@/lib/fin-indice-simulacao";
import { parseIsoDate } from "@/lib/fin-vencimento";

function formatMoney(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return parseIsoDate(iso.slice(0, 10)).toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
}

export function LinhaSimulacaoIndice({
  item,
  labelIndice,
  parcelaDestaque,
  valorBackend,
  mostrarColunasEmitido = true,
}: {
  item: IndiceSimulacaoParcela;
  labelIndice: string;
  parcelaDestaque?: number | null;
  valorBackend?: number | null;
  mostrarColunasEmitido?: boolean;
}) {
  const temDivergencia =
    item.divergencia != null && Math.abs(item.divergencia) >= 0.01;
  const ehDestaque = parcelaDestaque != null && item.parcela === parcelaDestaque;
  const divergenciaBackend =
    ehDestaque && valorBackend != null
      ? Math.round((valorBackend - item.valorSimulado) * 100) / 100
      : null;
  const divergenciaBackendVisivel =
    divergenciaBackend != null && Math.abs(divergenciaBackend) >= 0.01;

  return (
    <tr
      className={cn(
        "bg-white/[0.02]",
        ehDestaque &&
          "bg-emerald-500/[0.1] ring-1 ring-inset ring-emerald-500/30",
        item.parcelaReajuste &&
          !ehDestaque &&
          "bg-violet-500/[0.08] ring-1 ring-inset ring-violet-500/20",
        item.marcoCorteIndice &&
          !item.parcelaReajuste &&
          !ehDestaque &&
          "bg-sky-500/[0.07] ring-1 ring-inset ring-sky-500/25",
        temDivergencia && !item.parcelaReajuste && !item.marcoCorteIndice && !ehDestaque && "bg-amber-500/[0.06]",
      )}
    >
      <td className="px-4 py-2.5">
        <div className="font-mono">
          {item.parcela}
          {ehDestaque ? (
            <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-emerald-200/90">
              alvo
            </span>
          ) : null}
        </div>
        {item.marcoCorteIndice ? (
          <div className="mt-1 text-[10px] leading-tight text-sky-200/90">
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
            {item.parcelaReajusteDestino != null ? (
              <span className="block font-medium text-sky-100/85">
                → reajuste na parc. {item.parcelaReajusteDestino}
              </span>
            ) : null}
          </div>
        ) : null}
        {item.reajusteAplicadoNestaParcela ? (
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
      </td>
      <td className="px-4 py-2.5">{formatDate(item.vencimento)}</td>
      <td className="px-4 py-2.5 text-right font-medium text-emerald-200/90">
        {formatMoney(item.valorSimulado)}
      </td>
      {valorBackend !== undefined ? (
        <td className="px-4 py-2.5 text-right">
          {ehDestaque ? (
            <div className="flex flex-col items-end gap-0.5">
              <span className="font-medium text-white/85">{formatMoney(valorBackend)}</span>
              {divergenciaBackendVisivel ? (
                <span
                  className={cn(
                    "font-mono text-[10px]",
                    divergenciaBackend! > 0 ? "text-amber-300" : "text-rose-300",
                  )}
                >
                  {divergenciaBackend! > 0 ? "+" : ""}
                  {formatMoney(divergenciaBackend)}
                </span>
              ) : null}
            </div>
          ) : (
            <span className="text-white/25">—</span>
          )}
        </td>
      ) : null}
      {mostrarColunasEmitido ? (
        <>
          <td className="px-4 py-2.5 text-right text-white/45">
            {item.valorEmitido != null ? formatMoney(item.valorEmitido) : "—"}
          </td>
          <td className="px-4 py-2.5 text-right">
            {temDivergencia ? (
              <span
                className={cn(
                  "font-mono text-[11px]",
                  item.divergencia! > 0 ? "text-amber-300" : "text-rose-300",
                )}
              >
                {item.divergencia! > 0 ? "+" : ""}
                {formatMoney(item.divergencia)}
              </span>
            ) : (
              <span className="text-white/25">—</span>
            )}
          </td>
        </>
      ) : null}
    </tr>
  );
}

export type FinIndiceSimulacaoParcelaTableProps = {
  simulacao: IndiceSimulacaoParcela[];
  labelIndice: string;
  condicoesResumo?: string;
  primeiraVencimento?: string;
  parcelaDestaque?: number | null;
  valorBackendParcelaDestaque?: number | null;
  /** Exibe coluna com valor retornado pelo backend na parcela alvo. */
  mostrarColunaBackend?: boolean;
  /** Exibe colunas emitido e diferença (títulos já lançados). */
  mostrarColunasEmitido?: boolean;
};

export function FinIndiceSimulacaoParcelaTable({
  simulacao,
  labelIndice,
  condicoesResumo,
  primeiraVencimento,
  parcelaDestaque,
  valorBackendParcelaDestaque,
  mostrarColunaBackend = false,
  mostrarColunasEmitido = true,
}: FinIndiceSimulacaoParcelaTableProps) {
  if (simulacao.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-white/35">
        Sem dados para montar a evolução das parcelas.
      </p>
    );
  }

  return (
    <>
      {condicoesResumo ? (
        <p className="mb-3 px-4 text-[11px] text-white/40">
          {condicoesResumo}
          {primeiraVencimento ? ` · 1º vencimento ${formatDate(primeiraVencimento)}` : ""} ·
          reajuste 6% + {labelIndice} (teto 12%) nas parcelas 13, 25, 37… · linhas em azul = mês de
          corte do índice · linhas em roxo = reajuste aplicado
          {parcelaDestaque != null ? ` · linha em verde = parcela ${parcelaDestaque} calculada` : ""}
        </p>
      ) : null}
      <table className="w-full text-left text-xs">
        <thead className="sticky top-0 bg-[#0a2540] text-[10px] font-bold uppercase tracking-widest text-white/40">
          <tr>
            <th className="px-4 py-3">Parc.</th>
            <th className="px-4 py-3">Vencimento</th>
            <th className="px-4 py-3 text-right">Simulado</th>
            {mostrarColunaBackend ? (
              <th className="px-4 py-3 text-right">API</th>
            ) : null}
            {mostrarColunasEmitido ? (
              <>
                <th className="px-4 py-3 text-right">Emitido</th>
                <th className="px-4 py-3 text-right">Dif.</th>
              </>
            ) : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.06] text-white/70">
          {simulacao.map((item) => (
            <LinhaSimulacaoIndice
              key={item.parcela}
              item={item}
              labelIndice={labelIndice}
              parcelaDestaque={parcelaDestaque}
              mostrarColunasEmitido={mostrarColunasEmitido}
              valorBackend={
                mostrarColunaBackend ? (valorBackendParcelaDestaque ?? null) : undefined
              }
            />
          ))}
        </tbody>
      </table>
    </>
  );
}
