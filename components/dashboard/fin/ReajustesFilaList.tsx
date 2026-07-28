"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dropdown } from "primereact/dropdown";
import { toast } from "sonner";
import { ExternalLink, Play, RefreshCw } from "lucide-react";
import { DashboardDataTableShell } from "@/components/dashboard/DashboardDataTableShell";
import { DashboardDialog } from "@/components/dashboard/DashboardDialog";
import {
  DASHBOARD_DATATABLE_CLASS,
  dashboardCellMono,
  dashboardCellText,
  dashboardDataTablePt,
  dashboardStatusBadge,
} from "@/lib/dashboard-datatable";
import {
  finService,
  type ReajusteFilaItem,
  type ReajusteFilaStatus,
} from "@/lib/fin-service";
import { springPageDisplayRange, type SpringPage } from "@/lib/spring-page";

const PAGE_SIZE = 50;

const MES_OPTIONS = [
  { label: "Janeiro", value: 1 },
  { label: "Fevereiro", value: 2 },
  { label: "Março", value: 3 },
  { label: "Abril", value: 4 },
  { label: "Maio", value: 5 },
  { label: "Junho", value: 6 },
  { label: "Julho", value: 7 },
  { label: "Agosto", value: 8 },
  { label: "Setembro", value: 9 },
  { label: "Outubro", value: 10 },
  { label: "Novembro", value: 11 },
  { label: "Dezembro", value: 12 },
];

const STATUS_OPTIONS = [
  { label: "Todos", value: "" },
  { label: "Pronto", value: "PRONTO" },
  { label: "Aguardando índice", value: "AGUARDANDO_INDICE" },
  { label: "Bloqueado", value: "BLOQUEADO" },
];

const TIPO_OPTIONS = [
  { label: "Todos", value: "" },
  { label: "IPCA", value: "IPCA" },
  { label: "IGP-M", value: "IGPM" },
];

const STATUS_TONES: Record<string, string> = {
  PRONTO: "border-emerald-500/25 bg-emerald-500/15 text-emerald-300",
  AGUARDANDO_INDICE: "border-amber-500/25 bg-amber-500/15 text-amber-300",
  BLOQUEADO: "border-rose-500/25 bg-rose-500/15 text-rose-300",
};

const STATUS_LABEL: Record<ReajusteFilaStatus, string> = {
  PRONTO: "Pronto",
  AGUARDANDO_INDICE: "Aguardando índice",
  BLOQUEADO: "Bloqueado",
};

const FILTER_LABEL =
  "text-[10px] font-bold uppercase tracking-widest text-white/40";

function money(v: number | null | undefined): string {
  if (v == null || Number.isNaN(Number(v))) return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function pct(v: number | null | undefined): string {
  if (v == null || Number.isNaN(Number(v))) return "—";
  return `${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}%`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = iso.slice(0, 10);
  const [y, m, day] = d.split("-");
  if (!y || !m || !day) return iso;
  return `${day}/${m}/${y}`;
}

function yearOptions(around: number): { label: string; value: number }[] {
  const years: { label: string; value: number }[] = [];
  for (let y = around - 1; y <= around + 2; y++) {
    years.push({ label: String(y), value: y });
  }
  return years;
}

export function ReajustesFilaList() {
  const now = useMemo(() => new Date(), []);
  const [ano, setAno] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [empreendimento, setEmpreendimento] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [tipoIndice, setTipoIndice] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SpringPage<ReajusteFilaItem> | null>(null);
  const [empreendimentos, setEmpreendimentos] = useState<string[]>([]);
  const [confirmRow, setConfirmRow] = useState<ReajusteFilaItem | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    void finService
      .listEmpreendimentos({ skipLoading: true })
      .then(setEmpreendimentos)
      .catch(() => toast.error("Falha ao carregar empreendimentos."));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const pageData = await finService.listReajustesFila(
        {
          ano,
          mes,
          empreendimento: empreendimento || undefined,
          status: statusFiltro || undefined,
          tipoIndice: tipoIndice || undefined,
          page,
          size: PAGE_SIZE,
        },
        { skipLoading: true },
      );
      setData(pageData);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar reajustes.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [ano, mes, empreendimento, statusFiltro, tipoIndice, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(0);
  }, [ano, mes, empreendimento, statusFiltro, tipoIndice]);

  const gerarCiclo = async () => {
    if (!confirmRow || confirmRow.status !== "PRONTO") return;
    setGenerating(true);
    try {
      const result = await finService.criarTitulosEmLote({
        contratoId: confirmRow.contratoId,
        quantidadeParcelas: confirmRow.quantidadeParcelasCiclo,
        dataPrimeiraParcela: confirmRow.dataAniversarioCiclo.slice(0, 10),
      });
      toast.success(
        `${result.quantidadeCriada} título(s) criados (parcelas ${result.parcelaInicial}–${result.parcelaFinal}).`,
      );
      setConfirmRow(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar ciclo.");
    } finally {
      setGenerating(false);
    }
  };

  const range = data ? springPageDisplayRange(data) : { from: 0, to: 0 };
  const anos = yearOptions(now.getFullYear());

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="flex flex-col gap-1.5">
            <label className={FILTER_LABEL}>Mês aniversário</label>
            <Dropdown
              value={mes}
              options={MES_OPTIONS}
              onChange={(e) => setMes(e.value as number)}
              className="w-full"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={FILTER_LABEL}>Ano</label>
            <Dropdown
              value={ano}
              options={anos}
              onChange={(e) => setAno(e.value as number)}
              className="w-full"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={FILTER_LABEL}>Empreendimento</label>
            <Dropdown
              value={empreendimento}
              options={[
                { label: "Todos", value: "" },
                ...empreendimentos.map((e) => ({ label: e, value: e })),
              ]}
              onChange={(e) => setEmpreendimento((e.value as string) ?? "")}
              className="w-full"
              showClear
              placeholder="Todos"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={FILTER_LABEL}>Status</label>
            <Dropdown
              value={statusFiltro}
              options={STATUS_OPTIONS}
              onChange={(e) => setStatusFiltro((e.value as string) ?? "")}
              className="w-full"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={FILTER_LABEL}>Índice</label>
            <Dropdown
              value={tipoIndice}
              options={TIPO_OPTIONS}
              onChange={(e) => setTipoIndice((e.value as string) ?? "")}
              className="w-full"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-white/45">
            Contratos cuja próxima parcela é de reajuste (13, 25, 37…) no mês selecionado.
            Gere o ciclo só quando o índice dos 12 meses anteriores estiver fechado.
          </p>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white/60 transition hover:bg-white/[0.08] hover:text-white/90 disabled:opacity-40"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>
      </div>

      <DashboardDataTableShell>
        <DataTable
          value={data?.content ?? []}
          loading={loading}
          className={DASHBOARD_DATATABLE_CLASS}
          pt={dashboardDataTablePt()}
          emptyMessage="Nenhum contrato elegível para reajuste neste mês."
          paginator={!!data && (data.totalPages ?? 0) > 1}
          rows={PAGE_SIZE}
          first={page * PAGE_SIZE}
          totalRecords={data?.totalElements ?? 0}
          onPage={(e) => setPage(Math.floor((e.first ?? 0) / PAGE_SIZE))}
          lazy
        >
          <Column
            header="Contrato"
            body={(row: ReajusteFilaItem) =>
              dashboardCellMono(row.numeroContrato ?? String(row.contratoId))
            }
          />
          <Column
            header="Cliente"
            body={(row: ReajusteFilaItem) => dashboardCellText(row.nomeCliente ?? "—")}
          />
          <Column
            header="Imóvel"
            body={(row: ReajusteFilaItem) =>
              dashboardCellText(
                [row.empreendimento, row.quadra, row.lote != null ? `Lote ${row.lote}` : null]
                  .filter(Boolean)
                  .join(" · ") || "—",
              )
            }
          />
          <Column
            header="Aniversário"
            body={(row: ReajusteFilaItem) =>
              dashboardCellMono(`dia ${row.diaAniversario} · ${formatDate(row.dataAniversarioCiclo)}`)
            }
          />
          <Column
            header="Ciclo"
            body={(row: ReajusteFilaItem) =>
              dashboardCellMono(`${row.proximaParcela}–${row.parcelaFinalCiclo}`)
            }
          />
          <Column
            header="Índice"
            body={(row: ReajusteFilaItem) =>
              dashboardCellText(`${row.tipoIndice} · corte ${row.mesCorte}`)
            }
          />
          <Column
            header="% total"
            body={(row: ReajusteFilaItem) => dashboardCellMono(pct(row.percentualTotal))}
          />
          <Column
            header="Valor reajustado"
            body={(row: ReajusteFilaItem) => dashboardCellMono(money(row.valorParcelaReajustada))}
          />
          <Column
            header="Status"
            body={(row: ReajusteFilaItem) =>
              dashboardStatusBadge(STATUS_LABEL[row.status] ?? row.status, STATUS_TONES)
            }
          />
          <Column
            header=""
            body={(row: ReajusteFilaItem) => (
              <div className="flex justify-end gap-2">
                <Link
                  href={
                    row.tipoIndice === "IPCA"
                      ? "/dashboard/financeiro/indices-ipca"
                      : "/dashboard/financeiro/indices-igpm"
                  }
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white/45 hover:bg-white/5 hover:text-white/80"
                  title="Ver índices"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Índices
                </Link>
                <button
                  type="button"
                  disabled={row.status !== "PRONTO"}
                  onClick={() => setConfirmRow(row)}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600/90 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white disabled:pointer-events-none disabled:opacity-30"
                >
                  <Play className="h-3.5 w-3.5" />
                  Gerar ciclo
                </button>
              </div>
            )}
            style={{ width: "14rem" }}
          />
        </DataTable>
      </DashboardDataTableShell>

      {data && data.totalElements > 0 ? (
        <p className="text-xs text-white/35">
          Mostrando {range.from}–{range.to} de {data.totalElements}
        </p>
      ) : null}

      <DashboardDialog
        visible={confirmRow != null}
        onHide={() => !generating && setConfirmRow(null)}
        header="Gerar ciclo de reajuste"
        className="w-full max-w-lg"
      >
        {confirmRow ? (
          <div className="space-y-4 text-sm text-white/70">
            <p>
              Contrato{" "}
              <span className="font-mono font-semibold text-white">
                {confirmRow.numeroContrato ?? confirmRow.contratoId}
              </span>
              {confirmRow.nomeCliente ? ` · ${confirmRow.nomeCliente}` : null}
            </p>
            <ul className="space-y-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs">
              <li>
                Parcelas{" "}
                <span className="font-mono text-white">
                  {confirmRow.proximaParcela}–{confirmRow.parcelaFinalCiclo}
                </span>{" "}
                ({confirmRow.quantidadeParcelasCiclo} títulos)
              </li>
              <li>
                Aniversário{" "}
                <span className="font-mono text-white">
                  {formatDate(confirmRow.dataAniversarioCiclo)}
                </span>
              </li>
              <li>
                {confirmRow.tipoIndice}: índice {pct(confirmRow.percentualIndice)} · total{" "}
                {pct(confirmRow.percentualTotal)}
              </li>
              <li>
                Valor anterior {money(confirmRow.valorParcelaAnterior)} → reajustado{" "}
                <span className="font-semibold text-emerald-300">
                  {money(confirmRow.valorParcelaReajustada)}
                </span>
              </li>
            </ul>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={generating}
                onClick={() => setConfirmRow(null)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white/50 hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={generating}
                onClick={() => void gerarCiclo()}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white disabled:opacity-40"
              >
                {generating ? "Gerando…" : "Confirmar"}
              </button>
            </div>
          </div>
        ) : null}
      </DashboardDialog>
    </div>
  );
}
