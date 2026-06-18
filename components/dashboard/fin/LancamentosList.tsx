"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable, type DataTablePageEvent } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Menu } from "primereact/menu";
import type { MenuItem } from "primereact/menuitem";
import { toast } from "sonner";
import { Eye, RefreshCw, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DASHBOARD_DATATABLE_CLASS,
  DASHBOARD_SEARCH_ICON_COMPACT_CLASS,
  DASHBOARD_SEARCH_INPUT_COMPACT_CLASS,
  dashboardActionMenuItem,
  dashboardActionsMenuPt,
  dashboardCellMono,
  dashboardCellText,
  dashboardDataTablePt,
  dashboardRowActionsCell,
  dashboardStatusBadge,
} from "@/lib/dashboard-datatable";
import { DashboardDataTableShell } from "@/components/dashboard/DashboardDataTableShell";
import { finService, type LancamentoContabil } from "@/lib/fin-service";
import { springPageDisplayRange } from "@/lib/spring-page";
import type { SpringPage } from "@/lib/spring-page";

const STATUS_TONES: Record<string, string> = {
  CONFIRMADO: "border-emerald-500/25 bg-emerald-500/15 text-emerald-300",
  ESTORNADO: "border-rose-500/25 bg-rose-500/15 text-rose-300",
  RASCUNHO: "border-white/10 bg-white/10 text-white/50",
};

const PAGE_SIZE = 20;
const TABLE_PT = dashboardDataTablePt({ density: "default" });

const FILTER_INPUT_CLASS =
  "bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white/70 focus:outline-none focus:border-blue-500/50 transition-all min-w-[140px] [color-scheme:dark]";

function formatMoney(v: number | null | undefined): string {
  if (v == null) return "—";
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

export function LancamentosList({
  imovelId,
  embedded = false,
}: {
  imovelId?: number;
  embedded?: boolean;
}) {
  const router = useRouter();
  const menuRef = useRef<Menu>(null);
  const [selectedRow, setSelectedRow] = useState<LancamentoContabil | null>(null);
  const [page, setPage] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedRef = useRef(false);
  const [pageData, setPageData] = useState<SpringPage<LancamentoContabil> | null>(null);
  const [contrato, setContrato] = useState("");
  const [conta, setConta] = useState("");
  const [busca, setBusca] = useState("");
  const [competenciaDe, setCompetenciaDe] = useState("");
  const [competenciaAte, setCompetenciaAte] = useState("");

  const load = useCallback(async (background = false) => {
    const skipLoading = background || hasLoadedRef.current;
    if (skipLoading) {
      setRefreshing(true);
    }
    try {
      const data = await finService.listLancamentos(
        page,
        PAGE_SIZE,
        {
          imovelId,
          contrato: imovelId ? undefined : contrato.trim() || undefined,
          conta: imovelId ? undefined : conta.trim() || undefined,
          competenciaDe: competenciaDe || undefined,
          competenciaAte: competenciaAte || undefined,
          q: busca.trim() || undefined,
        },
        { skipLoading },
      );
      setPageData(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar lançamentos.");
      setPageData(null);
    } finally {
      if (skipLoading) {
        setRefreshing(false);
      }
      hasLoadedRef.current = true;
    }
  }, [page, contrato, conta, busca, competenciaDe, competenciaAte, imovelId]);

  useEffect(() => {
    void load(hasLoadedRef.current);
  }, [load]);

  useEffect(() => {
    setPage(0);
  }, [contrato, conta, busca, competenciaDe, competenciaAte]);

  const rows = pageData?.content ?? [];
  const totalRecords = pageData?.totalElements ?? 0;
  const range = pageData ? springPageDisplayRange(pageData) : { from: 0, to: 0 };

  const onPage = (e: DataTablePageEvent) => {
    setPage(e.page ?? 0);
  };

  const historicoBody = (row: LancamentoContabil) => {
    const text = row.historico ?? "";
    const short = text.length > 80 ? `${text.slice(0, 80)}…` : text;
    return dashboardCellText(short || "—", { title: text });
  };

  const getLancamentoActionItems = (row: LancamentoContabil): MenuItem[] => [
    dashboardActionMenuItem({
      label: "Ver detalhes",
      icon: <Eye size={16} className="text-blue-400 transition-transform group-hover:scale-110" />,
      onClick: () =>
        router.push(`/dashboard/financeiro/lancamentos/detalhe?id=${row.id}`),
    }),
  ];

  const actionBodyTemplate = (row: LancamentoContabil) =>
    dashboardRowActionsCell((e) => {
      setSelectedRow(row);
      menuRef.current?.toggle(e);
    });

  return (
    <div className={cn("flex flex-col gap-5", !embedded && "px-4")}>
      <div className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-white/40">
            <span className="font-bold text-white">{totalRecords}</span> lançamentos encontrados
            {totalRecords > 0 ? (
              <span className="text-white/30">
                {" "}
                · a mostrar {range.from}–{range.to}
              </span>
            ) : null}
          </p>
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white/70 transition-all hover:bg-white/10 disabled:pointer-events-none disabled:opacity-50 md:self-auto"
          >
            <RefreshCw size={14} className={cn("shrink-0", refreshing && "animate-spin")} />
            Atualizar
          </button>
        </div>

        {!imovelId ? (
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="lanc-contrato"
                className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35"
              >
                Contrato
              </label>
              <InputText
                id="lanc-contrato"
                value={contrato}
                onChange={(e) => setContrato(e.target.value)}
                placeholder="Número ou ID"
                className="w-full min-w-[120px] border-white/10 bg-white/[0.05] p-2.5 text-xs text-white placeholder:text-white/25"
                pt={{ root: { className: "w-full" } }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="lanc-conta"
                className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35"
              >
                Conta contábil
              </label>
              <InputText
                id="lanc-conta"
                value={conta}
                onChange={(e) => setConta(e.target.value)}
                placeholder="Código ou nome"
                className="w-full min-w-[140px] border-white/10 bg-white/[0.05] p-2.5 text-xs text-white placeholder:text-white/25"
                pt={{ root: { className: "w-full" } }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="lanc-de"
                className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35"
              >
                Competência de
              </label>
              <input
                id="lanc-de"
                type="date"
                value={competenciaDe}
                onChange={(e) => setCompetenciaDe(e.target.value)}
                className={FILTER_INPUT_CLASS}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="lanc-ate"
                className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35"
              >
                Competência até
              </label>
              <input
                id="lanc-ate"
                type="date"
                value={competenciaAte}
                onChange={(e) => setCompetenciaAte(e.target.value)}
                className={FILTER_INPUT_CLASS}
              />
            </div>

            <div className="relative min-w-[220px] flex-1">
              <label
                htmlFor="lanc-busca"
                className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-white/35"
              >
                Histórico
              </label>
              <div className="relative w-full">
                <Search
                  className={DASHBOARD_SEARCH_ICON_COMPACT_CLASS}
                  size={16}
                />
                <InputText
                  id="lanc-busca"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar no histórico…"
                  className={DASHBOARD_SEARCH_INPUT_COMPACT_CLASS}
                  pt={{ root: { className: "w-full" } }}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <DashboardDataTableShell>
        <DataTable
          value={rows}
          dataKey="id"
          lazy
          paginator
          rows={PAGE_SIZE}
          totalRecords={totalRecords}
          first={page * PAGE_SIZE}
          onPage={onPage}
          loading={refreshing}
          emptyMessage="Nenhum lançamento encontrado."
          responsiveLayout="stack"
          breakpoint="960px"
          className={DASHBOARD_DATATABLE_CLASS}
          pt={TABLE_PT}
          rowHover
        >
          <Column
            header="Competência"
            body={(row: LancamentoContabil) => dashboardCellMono(formatDate(row.competencia))}
            style={{ width: "10%" }}
          />
          <Column
            header="Contrato"
            body={(row: LancamentoContabil) =>
              row.numeroContrato
                ? dashboardCellMono(row.numeroContrato)
                : row.contratoId != null
                  ? dashboardCellMono(String(row.contratoId))
                  : dashboardCellText("—")
            }
            style={{ width: "8%" }}
          />
          <Column
            header="Parc."
            body={(row: LancamentoContabil) =>
              row.numeroParcela != null
                ? dashboardCellMono(String(row.numeroParcela))
                : dashboardCellText("—")
            }
            style={{ width: "6%" }}
          />
          <Column header="Histórico" body={historicoBody} style={{ width: "32%" }} />
          <Column
            header="Débito"
            body={(row: LancamentoContabil) =>
              dashboardCellText(formatMoney(row.totalDebito), { mono: true })
            }
            style={{ width: "11%" }}
          />
          <Column
            header="Crédito"
            body={(row: LancamentoContabil) =>
              dashboardCellText(formatMoney(row.totalCredito), { mono: true })
            }
            style={{ width: "11%" }}
          />
          <Column
            header="Status"
            body={(row: LancamentoContabil) => dashboardStatusBadge(row.status, STATUS_TONES)}
            style={{ width: "10%" }}
          />
          <Column header="Ações" body={actionBodyTemplate} align="right" style={{ width: "8%" }} />
        </DataTable>
      </DashboardDataTableShell>

      <Menu
        model={selectedRow ? getLancamentoActionItems(selectedRow) : []}
        popup
        ref={menuRef}
        pt={dashboardActionsMenuPt()}
      />
    </div>
  );
}
