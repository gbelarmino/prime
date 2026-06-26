"use client";

import { cn } from "@/lib/utils";
import { type IndiceSimulacaoParcela } from "@/lib/fin-indice-simulacao";
import { SimulacaoIndiceParcelaDetalhes } from "@/components/dashboard/fin/SimulacaoIndiceParcelaDetalhes";
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
  valoresBackendPorParcela,
  parcelaInicialLote,
  parcelaFinalLote,
  mostrarColunasEmitido = true,
}: {
  item: IndiceSimulacaoParcela;
  labelIndice: string;
  parcelaDestaque?: number | null;
  valorBackend?: number | null;
  valoresBackendPorParcela?: Record<number, number | null>;
  parcelaInicialLote?: number | null;
  parcelaFinalLote?: number | null;
  mostrarColunasEmitido?: boolean;
}) {
  const temDivergencia =
    item.divergencia != null && Math.abs(item.divergencia) >= 0.01;
  const ehDestaque = parcelaDestaque != null && item.parcela === parcelaDestaque;
  const ehNoLote =
    parcelaInicialLote != null &&
    parcelaFinalLote != null &&
    item.parcela >= parcelaInicialLote &&
    item.parcela <= parcelaFinalLote;
  const valorBackendLinha =
    valoresBackendPorParcela?.[item.parcela] ??
    (ehDestaque ? valorBackend : undefined);
  const divergenciaBackend =
    valorBackendLinha != null
      ? Math.round((valorBackendLinha - item.valorSimulado) * 100) / 100
      : null;
  const divergenciaBackendVisivel =
    divergenciaBackend != null && Math.abs(divergenciaBackend) >= 0.01;

  return (
    <tr
      className={cn(
        "bg-white/[0.02]",
        ehDestaque &&
          "bg-emerald-500/[0.1] ring-1 ring-inset ring-emerald-500/30",
        ehNoLote &&
          !ehDestaque &&
          "bg-emerald-500/[0.06] ring-1 ring-inset ring-emerald-500/20",
        item.parcelaReajuste &&
          !ehDestaque &&
          !ehNoLote &&
          (item.reajusteAguardandoIndice
            ? "bg-amber-500/[0.08] ring-1 ring-inset ring-amber-500/25"
            : "bg-violet-500/[0.08] ring-1 ring-inset ring-violet-500/20"),
        item.marcoCorteIndice &&
          !item.parcelaReajuste &&
          !ehDestaque &&
          (item.indiceCorteIndisponivel
            ? "bg-amber-500/[0.07] ring-1 ring-inset ring-amber-500/20"
            : "bg-sky-500/[0.07] ring-1 ring-inset ring-sky-500/25"),
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
          ) : ehNoLote ? (
            <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-emerald-200/70">
              lote
            </span>
          ) : null}
        </div>
        <SimulacaoIndiceParcelaDetalhes item={item} labelIndice={labelIndice} />
      </td>
      <td className="px-4 py-2.5">{formatDate(item.vencimento)}</td>
      <td className="px-4 py-2.5 text-right font-medium text-emerald-200/90">
        {formatMoney(item.valorSimulado)}
      </td>
      {valorBackend !== undefined || valoresBackendPorParcela != null ? (
        <td className="px-4 py-2.5 text-right">
          {valorBackendLinha != null ? (
            <div className="flex flex-col items-end gap-0.5">
              <span className="font-medium text-white/85">{formatMoney(valorBackendLinha)}</span>
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
  /** Destaca todas as parcelas do intervalo do lote (verde). */
  parcelaInicialLote?: number | null;
  parcelaFinalLote?: number | null;
  /** Valor consolidado do grupo por parcela (coluna API). */
  valoresBackendPorParcela?: Record<number, number | null>;
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
  parcelaInicialLote,
  parcelaFinalLote,
  valoresBackendPorParcela,
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
          reajuste 6% + {labelIndice} se positivo (teto 12%; índice negativo → só 6%) nas parcelas 13, 25, 37… · linhas em azul = mês de
          corte do índice · linhas em roxo = reajuste aplicado
          {parcelaDestaque != null ? ` · linha em verde = parcela ${parcelaDestaque} calculada` : ""}
          {parcelaInicialLote != null && parcelaFinalLote != null
            ? ` · intervalo do lote: parcelas ${parcelaInicialLote}–${parcelaFinalLote}`
            : ""}
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
              parcelaInicialLote={parcelaInicialLote}
              parcelaFinalLote={parcelaFinalLote}
              mostrarColunasEmitido={mostrarColunasEmitido}
              valoresBackendPorParcela={
                mostrarColunaBackend ? valoresBackendPorParcela : undefined
              }
              valorBackend={
                mostrarColunaBackend && !valoresBackendPorParcela
                  ? (valorBackendParcelaDestaque ?? null)
                  : undefined
              }
            />
          ))}
        </tbody>
      </table>
    </>
  );
}
