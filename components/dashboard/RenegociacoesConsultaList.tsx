"use client";

import { useCallback, useRef, useState, type MouseEvent } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, GitCompareArrows, Eye, Ban, User, X } from "lucide-react";
import { DataTable, type DataTablePageEvent } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { MultiSelect } from "primereact/multiselect";
import { Menu } from "primereact/menu";
import type { MenuItem } from "primereact/menuitem";
import { toast } from "sonner";
import { DashboardDataTableShell } from "@/components/dashboard/DashboardDataTableShell";
import { RenegociacaoCancelarDialog } from "@/components/dashboard/RenegociacaoCancelarDialog";
import { usePaginatedSpringList } from "@/hooks/use-paginated-spring-list";
import { getRenegociacoesConsultaUrl, isApiConfigured } from "@/lib/api-config";
import {
  DASHBOARD_DATATABLE_CLASS,
  DASHBOARD_SEARCH_ICON_HEADER_CLASS,
  DASHBOARD_SEARCH_INPUT_HEADER_CLASS,
  dashboardActionMenuItem,
  dashboardActionMenuSeparator,
  dashboardActionsMenuPt,
  dashboardCellMono,
  dashboardCellText,
  dashboardDataTablePt,
  dashboardRowActionsCell,
} from "@/lib/dashboard-datatable";
import { renegociacaoStatusBadge } from "@/lib/renegociacao-status-badge";
import { cn } from "@/lib/utils";
import { formatBusinessDateTime } from "@/lib/format-datetime";
import { DashboardCalendar } from "@/lib/dashboard-calendar";
import { dashboardMultiSelectPt } from "@/lib/dashboard-multiselect";
import { formatIsoDate, normalizarDataCalendario } from "@/lib/fin-vencimento";
import { buildRenegociacaoDashboardUrl } from "@/lib/renegociacao-routes";
import { cancelarRenegociacao } from "@/lib/renegociacao-service";
import type { RenegociacaoConsultaItem } from "@/lib/renegociacao-types";
import {
  MODALIDADE_OPTIONS,
  STATUS_RENEGOCIACAO_LABEL,
  renegociacaoEstaFechada,
  renegociacaoPodeSerCancelada,
  type StatusRenegociacao,
} from "@/lib/renegociacao-types";

const STATUS_FILTRO_OPTIONS = (Object.keys(STATUS_RENEGOCIACAO_LABEL) as StatusRenegociacao[]).map(
  (value) => ({ label: STATUS_RENEGOCIACAO_LABEL[value], value }),
);

const FILTRO_CALENDAR_INPUT =
  "w-full rounded-xl rounded-r-none border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white";

const PAGE_SIZE = 10;

function modalidadeLabel(modalidade: RenegociacaoConsultaItem["modalidade"]): string {
  return MODALIDADE_OPTIONS.find((o) => o.value === modalidade)?.label ?? modalidade;
}

export function RenegociacoesConsultaList() {
  const router = useRouter();
  const menuRef = useRef<Menu>(null);
  const [selectedRow, setSelectedRow] = useState<RenegociacaoConsultaItem | null>(null);
  const [menuModel, setMenuModel] = useState<MenuItem[]>([]);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [statusFiltro, setStatusFiltro] = useState<StatusRenegociacao[]>([]);
  const [criadoDe, setCriadoDe] = useState<Date | null>(null);
  const [criadoAte, setCriadoAte] = useState<Date | null>(null);

  const buildUrl = useCallback(
    (page: number, size: number, q: string) =>
      getRenegociacoesConsultaUrl(page, size, q, {
        status: statusFiltro.length > 0 ? statusFiltro : undefined,
        criadoDe: criadoDe ? formatIsoDate(criadoDe) : undefined,
        criadoAte: criadoAte ? formatIsoDate(criadoAte) : undefined,
      }),
    [statusFiltro, criadoDe, criadoAte],
  );

  const {
    searchInput,
    setSearchInput,
    params,
    setPage,
    pageSize,
    pageData,
    reload,
  } = usePaginatedSpringList<RenegociacaoConsultaItem>({
    buildUrl,
    pageSize: PAGE_SIZE,
    fallbackErrorMessage: "Não foi possível carregar as renegociações.",
    onFetchError: (m) => toast.error(m),
  });

  const rows = pageData?.content ?? [];
  const totalRecords = pageData?.totalElements ?? 0;
  const filtrosAtivos = statusFiltro.length > 0 || criadoDe != null || criadoAte != null;

  const aplicarStatus = (next: StatusRenegociacao[]) => {
    setStatusFiltro(next);
    setPage(0);
  };

  const aplicarCriadoDe = (next: Date | null) => {
    setCriadoDe(next);
    setPage(0);
  };

  const aplicarCriadoAte = (next: Date | null) => {
    setCriadoAte(next);
    setPage(0);
  };

  const limparFiltros = () => {
    setStatusFiltro([]);
    setCriadoDe(null);
    setCriadoAte(null);
    setPage(0);
  };

  const onPageChange = (event: DataTablePageEvent) => {
    setPage(event.page ?? 0);
  };

  const abrirRenegociacao = (row: RenegociacaoConsultaItem) => {
    router.push(
      buildRenegociacaoDashboardUrl({
        contratoId: row.contratoId,
        renegociacaoId: row.id,
        modalidade: row.modalidade,
      }),
    );
  };

  const buildActionItems = (row: RenegociacaoConsultaItem): MenuItem[] => {
    if (renegociacaoEstaFechada(row.status)) {
      return [
        dashboardActionMenuItem({
          label: "Visualizar",
          onClick: () => abrirRenegociacao(row),
          icon: <Eye size={16} className="text-emerald-400" />,
        }),
      ];
    }
    const items: MenuItem[] = [
      dashboardActionMenuItem({
        label: "Abrir renegociação",
        onClick: () => abrirRenegociacao(row),
        icon: <Eye size={16} className="text-emerald-400" />,
      }),
    ];
    if (renegociacaoPodeSerCancelada(row.status)) {
      items.push(dashboardActionMenuSeparator());
      items.push(
        dashboardActionMenuItem({
          label: "Cancelar renegociação",
          onClick: () => {
            setSelectedRow(row);
            setCancelDialogOpen(true);
          },
          icon: <Ban size={16} className="text-rose-400" />,
          labelClassName: "text-rose-300",
        }),
      );
    }
    return items;
  };

  const openActionsMenu = (e: MouseEvent<HTMLButtonElement>, row: RenegociacaoConsultaItem) => {
    e.stopPropagation();
    flushSync(() => {
      setSelectedRow(row);
      setMenuModel(buildActionItems(row));
    });
    menuRef.current?.toggle(e);
  };

  const confirmarCancelamento = async (motivo: string) => {
    if (!selectedRow) return;
    setCancelLoading(true);
    try {
      await cancelarRenegociacao(selectedRow.contratoId, selectedRow.id, motivo);
      toast.success("Renegociação cancelada.");
      setCancelDialogOpen(false);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível cancelar.");
    } finally {
      setCancelLoading(false);
    }
  };

  const criadorBody = (row: RenegociacaoConsultaItem) => {
    const nome = row.usuarioCriacaoNome?.trim();
    if (!nome) {
      if (row.usuarioCriacaoId != null) {
        return dashboardCellText(`Usuário #${row.usuarioCriacaoId}`, {
          title: "Nome indisponível no cadastro",
        });
      }
      return dashboardCellText("—");
    }
    return (
      <div className="flex items-center gap-2">
        <User size={14} className="shrink-0 text-violet-400/60" aria-hidden />
        {dashboardCellText(nome, { title: nome })}
      </div>
    );
  };

  const contratoBody = (row: RenegociacaoConsultaItem) => (
    <div className="flex flex-col gap-0.5">
      {dashboardCellMono(row.numeroContrato?.trim() || `ID ${row.contratoId}`)}
      <span className="truncate text-[10px] font-bold uppercase tracking-widest text-white/35">
        Contrato #{row.contratoId}
      </span>
    </div>
  );

  const actionBody = (row: RenegociacaoConsultaItem) =>
    dashboardRowActionsCell((e) => openActionsMenu(e, row));

  const tablePt = {
    ...dashboardDataTablePt(),
    header: { className: "border-white/5 bg-transparent p-6" },
  };

  const header = (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <div className="relative min-w-0 w-full md:max-w-md">
        <Search className={DASHBOARD_SEARCH_ICON_HEADER_CLASS} size={18} aria-hidden />
        <InputText
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Buscar por contrato ou contratante…"
          className={DASHBOARD_SEARCH_INPUT_HEADER_CLASS}
          pt={{ root: { className: "w-full min-w-0" } }}
        />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[14rem] flex-1 sm:max-w-xs">
          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-white/35">
            Status
          </span>
          <MultiSelect
            value={statusFiltro}
            options={STATUS_FILTRO_OPTIONS}
            optionLabel="label"
            optionValue="value"
            onChange={(e) => aplicarStatus((e.value as StatusRenegociacao[] | null) ?? [])}
            placeholder="Todos os status"
            display="chip"
            maxSelectedLabels={2}
            selectedItemsLabel="{0} status"
            filter
            pt={dashboardMultiSelectPt()}
            className="w-full"
          />
        </div>
        <div className="w-[11.5rem]">
          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-white/35">
            Criação de
          </span>
          <DashboardCalendar
            value={criadoDe}
            onChange={(e) => aplicarCriadoDe(normalizarDataCalendario(e.value))}
            maxDate={criadoAte ?? undefined}
            placeholder="dd/mm/aaaa"
            inputClassName={FILTRO_CALENDAR_INPUT}
            className="w-full"
          />
        </div>
        <div className="w-[11.5rem]">
          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-white/35">
            Criação até
          </span>
          <DashboardCalendar
            value={criadoAte}
            onChange={(e) => aplicarCriadoAte(normalizarDataCalendario(e.value))}
            minDate={criadoDe ?? undefined}
            placeholder="dd/mm/aaaa"
            inputClassName={FILTRO_CALENDAR_INPUT}
            className="w-full"
          />
        </div>
        {filtrosAtivos ? (
          <button
            type="button"
            onClick={limparFiltros}
            className="mb-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white"
          >
            <X size={12} />
            Limpar
          </button>
        ) : null}
        <div className="mb-1 flex shrink-0 flex-col gap-3 sm:ml-auto sm:flex-row sm:items-center sm:justify-end">
          <div className="text-sm whitespace-nowrap text-white/40">
            <span className="font-bold text-white">{totalRecords}</span> renegociações encontradas
          </div>
          <Link href="/dashboard/contratos/renegociacao" className="shrink-0">
            <Button
              type="button"
              className={cn(
                "w-full border border-violet-500/30 bg-violet-600/20 text-violet-200",
                "hover:bg-violet-600/30 sm:w-auto",
              )}
            >
              <GitCompareArrows className="mr-2 h-4 w-4" aria-hidden />
              Nova renegociação
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );

  if (!isApiConfigured()) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-8 text-center">
        <p className="text-amber-200">A API não está configurada. Verifique suas variáveis de ambiente.</p>
      </div>
    );
  }

  return (
    <>
      <DashboardDataTableShell>
        <DataTable
          value={rows}
          dataKey="id"
          lazy
          paginator
          rows={pageSize}
          totalRecords={totalRecords}
          first={params.page * pageSize}
          onPage={onPageChange}
          header={header}
          emptyMessage="Nenhuma renegociação encontrada."
          responsiveLayout="stack"
          breakpoint="960px"
          className={DASHBOARD_DATATABLE_CLASS}
          pt={tablePt}
          rowHover
        >
          <Column
            header="ID"
            body={(row: RenegociacaoConsultaItem) => dashboardCellMono(String(row.id))}
            style={{ width: "5rem" }}
          />
          <Column header="Contrato" body={contratoBody} className="min-w-[10rem]" />
          <Column
            header="Contratante"
            body={(row: RenegociacaoConsultaItem) => dashboardCellText(row.contratanteNome)}
            className="min-w-[12rem]"
          />
          <Column
            header="Modalidade"
            body={(row: RenegociacaoConsultaItem) =>
              dashboardCellText(modalidadeLabel(row.modalidade))
            }
          />
          <Column
            header="Status"
            body={(row: RenegociacaoConsultaItem) => renegociacaoStatusBadge(row.status)}
          />
          <Column header="Criado por" body={criadorBody} className="min-w-[10rem]" />
          <Column
            header="Versão"
            body={(row: RenegociacaoConsultaItem) =>
              row.versaoPublicadaId != null
                ? dashboardCellMono(String(row.versaoPublicadaId))
                : dashboardCellText("—")
            }
            style={{ width: "6rem" }}
          />
          <Column
            header="Criada em"
            body={(row: RenegociacaoConsultaItem) =>
              dashboardCellText(formatBusinessDateTime(row.criadoEm))
            }
          />
          <Column
            header="Atualizada em"
            body={(row: RenegociacaoConsultaItem) =>
              dashboardCellText(formatBusinessDateTime(row.atualizadoEm))
            }
          />
          <Column header="Ações" body={actionBody} align="right" style={{ width: "5rem" }} />
        </DataTable>
      </DashboardDataTableShell>

      <Menu
        model={menuModel}
        popup
        popupAlignment="right"
        ref={menuRef}
        pt={dashboardActionsMenuPt()}
      />

      <RenegociacaoCancelarDialog
        visible={cancelDialogOpen}
        row={selectedRow}
        loading={cancelLoading}
        onHide={() => {
          if (!cancelLoading) setCancelDialogOpen(false);
        }}
        onConfirm={confirmarCancelamento}
      />
    </>
  );
}
