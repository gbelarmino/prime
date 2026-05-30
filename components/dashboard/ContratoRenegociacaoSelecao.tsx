"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, User, Building2, Calendar, RefreshCw } from "lucide-react";
import { DataTable, type DataTablePageEvent } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Menu } from "primereact/menu";
import type { MenuItem } from "primereact/menuitem";
import { toast } from "sonner";
import { DashboardDataTableShell } from "@/components/dashboard/DashboardDataTableShell";
import { usePaginatedSpringList } from "@/hooks/use-paginated-spring-list";
import { apiFetch } from "@/lib/api-fetch";
import {
  getContratosHonorariosListUrl,
  getImoveisEmpreendimentosUrl,
  isApiConfigured,
} from "@/lib/api-config";
import {
  DASHBOARD_DATATABLE_CLASS,
  dashboardActionMenuItem,
  dashboardActionsMenuPt,
  dashboardCellMono,
  dashboardCellText,
  dashboardDataTablePt,
  dashboardRowActionsCell,
  DASHBOARD_SEARCH_ICON_HEADER_CLASS,
  DASHBOARD_SEARCH_INPUT_HEADER_CLASS,
} from "@/lib/dashboard-datatable";
import { springPageDisplayRange } from "@/lib/spring-page";
import type { ContratoListItem } from "@/components/dashboard/ContratosList";
import { buildRenegociacaoDashboardUrl } from "@/lib/renegociacao-routes";
import type { ModalidadeRenegociacao } from "@/lib/renegociacao-types";
import { cn } from "@/lib/utils";

/** Nome do enum na API (`StatusContrato.ASSINADO`); não usar o valor numérico 8. */
const STATUS_ASSINADO_FILTRO = "ASSINADO";

const TABLE_PT = {
  ...dashboardDataTablePt(),
  header: { className: "border-white/5 bg-transparent p-6" },
};

type Props = {
  modalidadeInicial?: ModalidadeRenegociacao | null;
};

export function ContratoRenegociacaoSelecao({ modalidadeInicial }: Props) {
  const router = useRouter();
  const menuRef = useRef<Menu>(null);
  const [selectedRow, setSelectedRow] = useState<ContratoListItem | null>(null);
  const [empreendimentoFilter, setEmpreendimentoFilter] = useState("");
  const [empreendimentoOptions, setEmpreendimentoOptions] = useState<string[]>([]);

  useEffect(() => {
    if (!isApiConfigured()) return;
    const url = getImoveisEmpreendimentosUrl();
    if (!url) return;

    void (async () => {
      try {
        const res = await apiFetch(url, {
          headers: { Accept: "application/json" },
          skipLoading: true,
        });
        if (res.ok) {
          const data = await res.json();
          setEmpreendimentoOptions(Array.isArray(data) ? data : []);
        }
      } catch {
        /* mantém select só com "Todos" */
      }
    })();
  }, []);

  const buildUrl = useCallback(
    (p: number, size: number, q: string) =>
      getContratosHonorariosListUrl(
        p,
        size,
        q,
        STATUS_ASSINADO_FILTRO,
        null,
        empreendimentoFilter || undefined,
      ),
    [empreendimentoFilter],
  );

  const onFetchError = useCallback((msg: string) => {
    toast.error(msg);
  }, []);

  const {
    pageData,
    searchInput,
    setSearchInput,
    params,
    setPage,
    pageSize,
    fetchError,
  } = usePaginatedSpringList<ContratoListItem>({
    buildUrl,
    pageSize: 15,
    fallbackErrorMessage: "Não foi possível carregar contratos assinados.",
    onFetchError,
  });

  useEffect(() => {
    setPage(0);
  }, [empreendimentoFilter, setPage]);

  const items = pageData?.content ?? [];
  const totalRecords = pageData?.totalElements ?? 0;
  const range = useMemo(() => {
    if (!pageData || totalRecords === 0) return { from: 0, to: 0 };
    return springPageDisplayRange(pageData);
  }, [pageData, totalRecords]);

  const iniciarRenegociacao = useCallback(
    (id: number) => {
      router.push(
        buildRenegociacaoDashboardUrl({
          contratoId: id,
          modalidade: modalidadeInicial ?? undefined,
        }),
      );
    },
    [router, modalidadeInicial],
  );

  const getActionItems = useCallback(
    (row: ContratoListItem): MenuItem[] => [
      dashboardActionMenuItem({
        label: "Renegociar",
        icon: (
          <RefreshCw
            size={16}
            className="text-violet-400 transition-transform group-hover:scale-110"
            aria-hidden
          />
        ),
        labelClassName: "text-violet-300/90",
        onClick: () => iniciarRenegociacao(row.id),
      }),
    ],
    [iniciarRenegociacao],
  );

  const actionBodyTemplate = (row: ContratoListItem) => (
    <div
      className="flex justify-end"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      role="presentation"
    >
      {dashboardRowActionsCell((e) => {
        setSelectedRow(row);
        menuRef.current?.toggle(e);
      })}
    </div>
  );

  const tableHeader = (
    <div className="flex flex-col items-center justify-between gap-4 py-2 md:flex-row">
      <div className="relative w-full md:w-96">
        <Search className={DASHBOARD_SEARCH_ICON_HEADER_CLASS} size={18} aria-hidden />
        <InputText
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Buscar por cliente, número, imóvel…"
          className={DASHBOARD_SEARCH_INPUT_HEADER_CLASS}
        />
      </div>
      <p className="shrink-0 text-sm text-white/40">
        {totalRecords > 0 ? (
          <>
            A mostrar <span className="font-bold text-white">{range.from}</span>–
            <span className="font-bold text-white">{range.to}</span> de{" "}
            <span className="font-bold text-white">{totalRecords}</span> assinados
          </>
        ) : (
          <>
            <span className="font-bold text-white">0</span> contratos assinados
          </>
        )}
      </p>
    </div>
  );

  if (!isApiConfigured()) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-8 text-center">
        <p className="text-amber-200">A API não está configurada. Verifique as variáveis de ambiente.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {fetchError ? (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {fetchError}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 px-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
          Filtrar:
        </span>
        <select
          value={empreendimentoFilter}
          onChange={(e) => setEmpreendimentoFilter(e.target.value)}
          aria-label="Empreendimento"
          className="min-w-[220px] rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70 transition-all focus:border-violet-500/50 focus:outline-none"
        >
          <option value="" className="bg-[#020817]">
            Todos os empreendimentos
          </option>
          {empreendimentoOptions.map((emp) => (
            <option key={emp} value={emp} className="bg-[#020817]">
              {emp}
            </option>
          ))}
        </select>
      </div>

      <DashboardDataTableShell>
        <DataTable
          value={items}
          dataKey="id"
          lazy
          paginator
          header={tableHeader}
          rows={pageSize}
          first={params.page * pageSize}
          totalRecords={totalRecords}
          onPage={(e: DataTablePageEvent) => setPage(Math.floor((e.first ?? 0) / pageSize))}
          rowHover
          responsiveLayout="stack"
          breakpoint="960px"
          className={DASHBOARD_DATATABLE_CLASS}
          pt={TABLE_PT}
          emptyMessage={
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <FileText className="h-9 w-9 text-white/25" aria-hidden />
              <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                Nenhum contrato assinado encontrado
              </p>
            </div>
          }
        >
          <Column
            header="Contrato"
            body={(row: ContratoListItem) => (
              <div className="flex flex-col min-w-0">
                {dashboardCellMono(row.numeroContrato ?? `#${row.id}`, { truncate: true })}
                <div className="mt-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/35">
                  <Calendar size={10} aria-hidden />
                  {row.dataAssinatura
                    ? new Date(row.dataAssinatura).toLocaleDateString("pt-BR")
                    : "—"}
                </div>
              </div>
            )}
            style={{ width: "14rem" }}
          />
          <Column
            header="Cliente"
            body={(row: ContratoListItem) => (
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-blue-500/10 bg-blue-500/10 text-blue-400">
                  <User size={14} aria-hidden />
                </div>
                {dashboardCellText(row.contratante?.label)}
              </div>
            )}
          />
          <Column
            header="Imóvel"
            body={(row: ContratoListItem) => (
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-500/10 bg-amber-500/10 text-amber-400">
                  <Building2 size={14} aria-hidden />
                </div>
                {dashboardCellText(row.imovel?.label, {
                  title: row.imovel?.label ?? undefined,
                })}
              </div>
            )}
          />
          <Column
            header="Status"
            body={(row: ContratoListItem) => (
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest",
                  "bg-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]",
                )}
              >
                {row.statusLabel ?? "Assinado"}
              </span>
            )}
            style={{ width: "9rem" }}
          />
          <Column header="Ações" body={actionBodyTemplate} align="right" style={{ width: "4.5rem" }} />
        </DataTable>

        <Menu
          model={selectedRow ? getActionItems(selectedRow) : []}
          popup
          ref={menuRef}
          pt={dashboardActionsMenuPt()}
        />
      </DashboardDataTableShell>
    </div>
  );
}
