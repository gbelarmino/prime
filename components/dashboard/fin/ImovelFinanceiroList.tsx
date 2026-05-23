"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable, type DataTablePageEvent } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dropdown } from "primereact/dropdown";
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
} from "@/lib/dashboard-datatable";
import { DashboardDataTableShell } from "@/components/dashboard/DashboardDataTableShell";
import { finService, type FinImovelResumo } from "@/lib/fin-service";
import { springPageDisplayRange } from "@/lib/spring-page";
import type { SpringPage } from "@/lib/spring-page";

const PAGE_SIZE = 20;
const TABLE_PT = dashboardDataTablePt({ density: "default" });

const TODOS = "";
const LOTE_TODOS = "ALL" as const;
type LoteFilter = typeof LOTE_TODOS | number;

const DROPDOWN_PT = {
  input: {
    className:
      "w-full border-white/10 bg-white/[0.05] p-2.5 text-xs text-white placeholder:text-white/25",
  },
};

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

function periodoLabel(row: FinImovelResumo): string {
  if (!row.primeiraCompetencia && !row.ultimaCompetencia) return "—";
  if (row.primeiraCompetencia === row.ultimaCompetencia) {
    return formatDate(row.primeiraCompetencia);
  }
  return `${formatDate(row.primeiraCompetencia)} – ${formatDate(row.ultimaCompetencia)}`;
}

export function ImovelFinanceiroList() {
  const router = useRouter();
  const menuRef = useRef<Menu>(null);
  const [selectedRow, setSelectedRow] = useState<FinImovelResumo | null>(null);
  const [page, setPage] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedRef = useRef(false);
  const [pageData, setPageData] = useState<SpringPage<FinImovelResumo> | null>(null);
  const [empreendimento, setEmpreendimento] = useState(TODOS);
  const [quadra, setQuadra] = useState(TODOS);
  const [lote, setLote] = useState<LoteFilter>(LOTE_TODOS);
  const [busca, setBusca] = useState("");
  const [buscaDebounced, setBuscaDebounced] = useState("");

  const [empreendimentos, setEmpreendimentos] = useState<string[]>([]);
  const [quadras, setQuadras] = useState<string[]>([]);
  const [lotes, setLotes] = useState<number[]>([]);
  const [empreendimentosLoading, setEmpreendimentosLoading] = useState(true);
  const [quadrasLoading, setQuadrasLoading] = useState(false);
  const [lotesLoading, setLotesLoading] = useState(false);

  useEffect(() => {
    setEmpreendimentosLoading(true);
    void finService
      .listEmpreendimentos({ skipLoading: true })
      .then(setEmpreendimentos)
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Erro ao carregar empreendimentos.");
        setEmpreendimentos([]);
      })
      .finally(() => setEmpreendimentosLoading(false));
  }, []);

  useEffect(() => {
    if (!empreendimento) {
      setQuadras([]);
      setQuadra(TODOS);
      setLotes([]);
      setLote(LOTE_TODOS);
      return;
    }
    setQuadrasLoading(true);
    void finService
      .listQuadrasImovel({ empreendimento }, { skipLoading: true })
      .then((items) => {
        setQuadras(items);
        setQuadra((current) => (current && !items.includes(current) ? TODOS : current));
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Erro ao carregar quadras vendidas.");
        setQuadras([]);
      })
      .finally(() => setQuadrasLoading(false));
  }, [empreendimento]);

  useEffect(() => {
    if (!empreendimento || !quadra) {
      setLotes([]);
      setLote(LOTE_TODOS);
      return;
    }
    setLotesLoading(true);
    void finService
      .listLotesImovel({ empreendimento, quadra }, { skipLoading: true })
      .then((items) => {
        setLotes(items);
        setLote((current) =>
          current !== LOTE_TODOS && !items.includes(current) ? LOTE_TODOS : current,
        );
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Erro ao carregar lotes vendidos.");
        setLotes([]);
      })
      .finally(() => setLotesLoading(false));
  }, [empreendimento, quadra]);

  useEffect(() => {
    const timer = window.setTimeout(() => setBuscaDebounced(busca), 400);
    return () => window.clearTimeout(timer);
  }, [busca]);

  const load = useCallback(async (background = false) => {
    const skipLoading = background || hasLoadedRef.current;
    if (skipLoading) {
      setRefreshing(true);
    }
    try {
      const data = await finService.listPorImovel(
        page,
        PAGE_SIZE,
        {
          empreendimento: empreendimento || undefined,
          quadra: quadra || undefined,
          lote: lote === LOTE_TODOS ? undefined : lote,
          q: buscaDebounced.trim() || undefined,
        },
        { skipLoading },
      );
      setPageData(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar resumo por imóvel.");
      setPageData(null);
    } finally {
      if (skipLoading) {
        setRefreshing(false);
      }
      hasLoadedRef.current = true;
    }
  }, [page, empreendimento, quadra, lote, buscaDebounced]);

  useEffect(() => {
    void load(hasLoadedRef.current);
  }, [load]);

  useEffect(() => {
    setPage(0);
  }, [empreendimento, quadra, lote, buscaDebounced]);

  const rows = pageData?.content ?? [];
  const totalRecords = pageData?.totalElements ?? 0;
  const range = pageData ? springPageDisplayRange(pageData) : { from: 0, to: 0 };

  const onPage = (e: DataTablePageEvent) => {
    setPage(e.page ?? 0);
  };

  const empreendimentoOptions = [
    { label: "Todos os empreendimentos", value: TODOS },
    ...empreendimentos.map((emp) => ({ label: emp, value: emp })),
  ];

  const quadraOptions = [
    { label: "Todas as quadras", value: TODOS },
    ...quadras.map((q) => ({ label: `Quadra ${q}`, value: q })),
  ];

  const loteOptions: { label: string; value: LoteFilter }[] = [
    { label: "Todos os lotes", value: LOTE_TODOS },
    ...lotes.map((n) => ({ label: `Lote ${n}`, value: n as LoteFilter })),
  ];

  const getImovelActionItems = (row: FinImovelResumo): MenuItem[] => [
    dashboardActionMenuItem({
      label: "Ver detalhe financeiro",
      icon: <Eye size={16} className="text-blue-400 transition-transform group-hover:scale-110" />,
      onClick: () =>
        router.push(`/dashboard/financeiro/por-imovel/detalhe?id=${row.imovelId}`),
    }),
  ];

  const actionBodyTemplate = (row: FinImovelResumo) =>
    dashboardRowActionsCell((e) => {
      setSelectedRow(row);
      menuRef.current?.toggle(e);
    });

  return (
    <div className="flex flex-col gap-5 px-4">
      <div className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-white/40">
            <span className="font-bold text-white">{totalRecords}</span> imóveis com movimentação
            {buscaDebounced.trim() ? (
              <span className="text-white/30">
                {" "}
                · busca: &quot;{buscaDebounced.trim()}&quot;
              </span>
            ) : null}
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

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-[200px] flex-col gap-1.5">
            <label
              htmlFor="fin-emp"
              className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35"
            >
              Empreendimento
            </label>
            <Dropdown
              inputId="fin-emp"
              value={empreendimento}
              options={empreendimentoOptions}
              optionLabel="label"
              optionValue="value"
              onChange={(e) => {
                setEmpreendimento(e.value ?? TODOS);
                setQuadra(TODOS);
                setLote(LOTE_TODOS);
              }}
              placeholder="Todos os empreendimentos"
              filter
              disabled={empreendimentosLoading}
              className="w-full"
              pt={DROPDOWN_PT}
            />
          </div>

          <div className="flex min-w-[140px] flex-col gap-1.5">
            <label
              htmlFor="fin-quadra"
              className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35"
            >
              Quadra
            </label>
            <Dropdown
              inputId="fin-quadra"
              value={quadra}
              options={quadraOptions}
              optionLabel="label"
              optionValue="value"
              onChange={(e) => {
                setQuadra(e.value ?? TODOS);
                setLote(LOTE_TODOS);
              }}
              placeholder={empreendimento ? "Todas as quadras" : "Selecione o empreendimento"}
              filter
              disabled={!empreendimento || quadrasLoading}
              className="w-full"
              pt={DROPDOWN_PT}
            />
          </div>

          <div className="flex min-w-[120px] flex-col gap-1.5">
            <label
              htmlFor="fin-lote"
              className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35"
            >
              Lote
            </label>
            <Dropdown
              inputId="fin-lote"
              value={lote}
              options={loteOptions}
              optionLabel="label"
              optionValue="value"
              onChange={(e) => {
                const value = e.value as LoteFilter;
                if (value === LOTE_TODOS) {
                  setLote(LOTE_TODOS);
                  return;
                }
                const parsed = Number(value);
                setLote(Number.isNaN(parsed) ? LOTE_TODOS : parsed);
              }}
              placeholder={
                !empreendimento
                  ? "Selecione o empreendimento"
                  : !quadra
                    ? "Selecione a quadra"
                    : "Todos os lotes"
              }
              filter
              disabled={!empreendimento || !quadra || lotesLoading}
              className="w-full"
              pt={DROPDOWN_PT}
            />
          </div>

          <div className="flex min-w-[220px] flex-1 flex-col gap-1.5">
            <label
              htmlFor="fin-busca"
              className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35"
            >
              Busca
            </label>
            <div className="relative w-full">
              <Search
                className={DASHBOARD_SEARCH_ICON_COMPACT_CLASS}
                size={16}
              />
              <InputText
                id="fin-busca"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setBuscaDebounced(busca);
                    setPage(0);
                  }
                }}
                placeholder="Contrato, cliente, CPF ou e-mail…"
                className={DASHBOARD_SEARCH_INPUT_COMPACT_CLASS}
                pt={{ root: { className: "w-full" } }}
              />
            </div>
          </div>
        </div>
      </div>

      <DashboardDataTableShell>
        <DataTable
          value={rows}
          dataKey="imovelId"
          lazy
          paginator
          rows={PAGE_SIZE}
          totalRecords={totalRecords}
          first={page * PAGE_SIZE}
          onPage={onPage}
          loading={refreshing}
          emptyMessage="Nenhum imóvel com lançamentos ou pagamentos encontrado."
          responsiveLayout="stack"
          breakpoint="960px"
          className={DASHBOARD_DATATABLE_CLASS}
          pt={TABLE_PT}
          rowHover
        >
          <Column
            header="Empreendimento"
            body={(row: FinImovelResumo) => dashboardCellText(row.empreendimento)}
            style={{ width: "16%" }}
          />
          <Column
            header="Quadra"
            body={(row: FinImovelResumo) =>
              row.quadra ? dashboardCellMono(row.quadra) : dashboardCellText("—")
            }
            style={{ width: "7%" }}
          />
          <Column
            header="Lote"
            body={(row: FinImovelResumo) =>
              row.lote != null ? dashboardCellMono(String(row.lote)) : dashboardCellText("—")
            }
            style={{ width: "6%" }}
          />
          <Column
            header="Contrato"
            body={(row: FinImovelResumo) =>
              row.numeroContrato
                ? dashboardCellMono(row.numeroContrato)
                : row.contratoId != null
                  ? dashboardCellMono(String(row.contratoId))
                  : dashboardCellText("—")
            }
            style={{ width: "12%" }}
          />
          <Column
            header="Cliente"
            body={(row: FinImovelResumo) => dashboardCellText(row.contratanteNome ?? "—")}
            style={{ width: "20%" }}
          />
          <Column
            header="Total recebido"
            body={(row: FinImovelResumo) =>
              dashboardCellText(formatMoney(row.totalRecebido), { mono: true })
            }
            style={{ width: "14%" }}
          />
          <Column
            header="Lançamentos"
            body={(row: FinImovelResumo) => dashboardCellMono(String(row.totalLancamentos))}
            style={{ width: "10%" }}
          />
          <Column
            header="Pagamentos"
            body={(row: FinImovelResumo) => dashboardCellMono(String(row.totalPagamentos))}
            style={{ width: "10%" }}
          />
          <Column
            header="Período"
            body={(row: FinImovelResumo) => dashboardCellText(periodoLabel(row))}
            style={{ width: "14%" }}
          />
          <Column header="Ações" body={actionBodyTemplate} align="right" style={{ width: "8%" }} />
        </DataTable>
      </DashboardDataTableShell>

      <Menu
        model={selectedRow ? getImovelActionItems(selectedRow) : []}
        popup
        ref={menuRef}
        pt={dashboardActionsMenuPt()}
      />
    </div>
  );
}
