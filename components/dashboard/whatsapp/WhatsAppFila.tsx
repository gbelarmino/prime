"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DataTable,
  type DataTablePageEvent,
  type DataTableRowClickEvent,
  type DataTableRowToggleEvent,
} from "primereact/datatable";
import { Column } from "primereact/column";
import { Dropdown } from "primereact/dropdown";
import { Menu } from "primereact/menu";
import type { MenuItem } from "primereact/menuitem";
import { toast } from "sonner";
import { Ban, ChevronDown, RefreshCw, RotateCcw } from "lucide-react";
import { DashboardDataTableShell } from "@/components/dashboard/DashboardDataTableShell";
import {
  DASHBOARD_DATATABLE_CLASS,
  WHATSAPP_FILA_STATUS_TONES,
  dashboardActionMenuItem,
  dashboardActionMenuSeparator,
  dashboardActionsMenuPt,
  dashboardCellMono,
  dashboardCellText,
  dashboardDataTablePt,
  dashboardRowActionsCell,
  dashboardStatusBadge,
} from "@/lib/dashboard-datatable";
import {
  whatsappService,
  type WhatsAppFilaItem,
} from "@/lib/whatsapp-service";
import { DashboardConfirmDialog } from "@/components/dashboard/DashboardConfirmDialog";
import { WhatsAppSectionShell } from "@/components/dashboard/whatsapp/WhatsAppSectionShell";
import {
  formatBusinessDateTimeWithSeconds,
} from "@/lib/format-datetime";
import { formatPhoneDisplay } from "@/lib/format-phone";
import { springPageDisplayRange } from "@/lib/spring-page";
import type { SpringPage } from "@/lib/spring-page";
import { applyWhatsAppFilaRealtime } from "@/lib/whatsapp-fila-realtime";
import { useWhatsAppFilaRealtime } from "@/hooks/use-whatsapp-fila-realtime";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
  { label: "Todos", value: "" },
  { label: "Pendente", value: "PENDENTE" },
  { label: "Enviando", value: "ENVIANDO" },
  { label: "Sucesso", value: "SUCESSO" },
  { label: "Erro", value: "ERRO" },
  { label: "Cancelado", value: "CANCELADO" },
];

const PAGE_SIZE = 25;

function waFilaDataTablePt() {
  const base = dashboardDataTablePt({ density: "default" }) as Record<string, unknown>;
  const column = (base.column ?? {}) as Record<string, unknown>;
  const bodyCell = (column.bodyCell ?? {}) as { className?: string };
  const paginator = (base.paginator ?? {}) as Record<string, unknown>;

  return {
    ...base,
    column: {
      ...column,
      bodyCell: {
        className: cn(
          bodyCell.className,
          "align-top whitespace-normal",
        ),
      },
    },
    paginator: {
      ...paginator,
      pageButton: ({ context }: { context?: { active?: boolean } }) => ({
        className: cn(
          "flex h-10 w-10 items-center justify-center border-none font-bold transition-all rounded-none",
          context?.active
            ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
            : "bg-white/5 text-white/60 hover:bg-blue-600 hover:text-white",
        ),
      }),
    },
    rowExpansion: {
      className: "bg-white/[0.02]",
    },
  };
}

export function WhatsAppFila() {
  const tablePt = useMemo(() => waFilaDataTablePt(), []);
  const menuRef = useRef<Menu>(null);
  const [selectedRow, setSelectedRow] = useState<WhatsAppFilaItem | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pageData, setPageData] = useState<SpringPage<WhatsAppFilaItem> | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [cancelConfirmRow, setCancelConfirmRow] = useState<WhatsAppFilaItem | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const statusFilterRef = useRef(statusFilter);
  const pageRef = useRef(page);

  useEffect(() => {
    statusFilterRef.current = statusFilter;
  }, [statusFilter]);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  const applyUpdate = useCallback((updated: WhatsAppFilaItem) => {
    setPageData((prev) =>
      prev
        ? applyWhatsAppFilaRealtime(prev, { type: "WHATSAPP_FILA_UPDATED", item: updated }, {
            statusFilter: statusFilterRef.current,
            page: pageRef.current,
            pageSize: PAGE_SIZE,
          })
        : prev,
    );
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await whatsappService.listFila(
        page,
        PAGE_SIZE,
        statusFilter || undefined,
      );
      setPageData(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar fila WhatsApp.");
      setPageData(null);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(0);
  }, [statusFilter]);

  useEffect(() => {
    setExpandedId(null);
  }, [page, statusFilter]);

  const onRealtimeEvent = useCallback(
    (event: Parameters<typeof applyWhatsAppFilaRealtime>[1]) => {
      setPageData((prev) =>
        applyWhatsAppFilaRealtime(prev, event, {
          statusFilter: statusFilterRef.current,
          page: pageRef.current,
          pageSize: PAGE_SIZE,
        }),
      );
    },
    [],
  );

  useWhatsAppFilaRealtime(onRealtimeEvent);

  const rows = pageData?.content ?? [];
  const totalRecords = pageData?.totalElements ?? 0;
  const range = pageData ? springPageDisplayRange(pageData) : { from: 0, to: 0 };

  const expandedRows = useMemo(() => {
    const row = rows.find((r) => r.id === expandedId);
    return row ? [row] : [];
  }, [rows, expandedId]);

  const handleRowClick = (event: DataTableRowClickEvent) => {
    const row = event.data as WhatsAppFilaItem | undefined;
    if (!row) return;
    setExpandedId((current) => (current === row.id ? null : row.id));
  };

  const handleRowToggle = (event: DataTableRowToggleEvent) => {
    const data = event.data as WhatsAppFilaItem[] | undefined;
    if (!Array.isArray(data) || data.length === 0) {
      setExpandedId(null);
      return;
    }
    setExpandedId(data[data.length - 1]?.id ?? null);
  };

  const rowExpansionTemplate = (row: WhatsAppFilaItem) => (
    <div className="border-t border-white/5 px-6 py-4">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
        Mensagem completa
      </p>
      <p className="m-0 whitespace-pre-wrap break-words text-sm leading-relaxed text-white/90">
        {row.mensagem?.trim() || "—"}
      </p>
      {row.erro?.trim() ? (
        <div className="mt-4 border-t border-white/5 pt-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-rose-300/50">
            Erro
          </p>
          <p className="m-0 whitespace-pre-wrap break-words text-sm leading-relaxed text-rose-200/90">
            {row.erro}
          </p>
        </div>
      ) : null}
    </div>
  );

  const idBody = (row: WhatsAppFilaItem) => (
    <span className="inline-flex items-center gap-1.5 font-mono text-[12px] tabular-nums text-white/70">
      <ChevronDown
        size={14}
        className={cn(
          "shrink-0 text-white/35 transition-transform duration-200",
          expandedId === row.id && "rotate-180 text-amber-300/80",
        )}
        aria-hidden
      />
      {row.id}
    </span>
  );

  const mensagemBody = (row: WhatsAppFilaItem) => {
    const text = row.mensagem?.trim() || "—";
    return (
      <p
        className="m-0 line-clamp-2 max-w-[14rem] break-words text-[12px] leading-relaxed text-white/85"
        title={text !== "—" ? text : undefined}
      >
        {text}
      </p>
    );
  };

  const statusBody = (row: WhatsAppFilaItem) => (
    <div className="flex flex-col items-start gap-0.5">
      {dashboardStatusBadge(row.status, WHATSAPP_FILA_STATUS_TONES)}
      {row.erro?.trim() && expandedId !== row.id ? (
        <span className="text-[9px] font-medium text-rose-300/55">Expandir para ver o erro</span>
      ) : null}
    </div>
  );

  const onPageChange = (event: DataTablePageEvent) => {
    setPage(event.page ?? 0);
  };

  const canReprocessar = (row: WhatsAppFilaItem) =>
    row.status === "ERRO" || row.status === "PENDENTE";

  const canCancelar = (row: WhatsAppFilaItem) =>
    row.status === "ERRO" || row.status === "PENDENTE";

  const handleReprocessar = async (row: WhatsAppFilaItem) => {
    setActionLoading(true);
    try {
      const updated = await whatsappService.reprocessarFila(row.id);
      applyUpdate(updated);
      toast.success("Mensagem reagendada para envio imediato.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao reprocessar.");
    } finally {
      setActionLoading(false);
    }
  };

  const confirmCancelarFila = async () => {
    if (!cancelConfirmRow) return;
    setActionLoading(true);
    try {
      const updated = await whatsappService.cancelarFila(cancelConfirmRow.id);
      applyUpdate(updated);
      toast.success("Envio cancelado; a mensagem não será enviada.");
      setCancelConfirmRow(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao cancelar.");
    } finally {
      setActionLoading(false);
    }
  };

  const getFilaActionItems = (row: WhatsAppFilaItem): MenuItem[] => {
    const items: MenuItem[] = [];

    if (canReprocessar(row)) {
      items.push(
        dashboardActionMenuItem({
          label: "Reprocessar",
          icon: (
            <RotateCcw
              size={16}
              className="text-amber-400 transition-transform group-hover:scale-110"
            />
          ),
          onClick: () => void handleReprocessar(row),
          disabled: actionLoading,
        }),
      );
    }

    if (canCancelar(row)) {
      if (items.length > 0) {
        items.push(dashboardActionMenuSeparator());
      }
      items.push(
        dashboardActionMenuItem({
          label: "Cancelar envio",
          icon: <Ban size={16} className="text-rose-400 transition-transform group-hover:scale-110" />,
          labelClassName: "text-rose-300/90",
          onClick: () => setCancelConfirmRow(row),
          disabled: actionLoading,
        }),
      );
    }

    return items;
  };

  const actionBodyTemplate = (row: WhatsAppFilaItem) => {
    if (!canReprocessar(row) && !canCancelar(row)) {
      return <span className="block text-right text-white/25">—</span>;
    }
    return (
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
  };

  const rowClassName = (row: WhatsAppFilaItem) =>
    cn(
      "cursor-pointer transition-colors",
      expandedId === row.id && "bg-white/[0.04]",
    );

  return (
    <WhatsAppSectionShell
      eyebrow="Operação"
      title="Fila de mensagens"
      description="Mensagens enfileiradas pelo motor WhatsApp — pendentes, em envio, entregues ou com erro."
      actions={
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold uppercase tracking-widest text-white/60 hover:text-white"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Atualizar
        </button>
      }
      surface="plain"
    >
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2 sm:max-w-xs">
          <label
            htmlFor="wa-fila-status"
            className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35"
          >
            Status
          </label>
          <Dropdown
            inputId="wa-fila-status"
            value={statusFilter}
            options={STATUS_OPTIONS}
            optionLabel="label"
            optionValue="value"
            onChange={(e) => setStatusFilter(e.value ?? "")}
            className="w-full border-white/10 bg-white/[0.04]"
          />
        </div>
        {totalRecords > 0 ? (
          <p className="text-xs text-white/40">
            A mostrar {range.from}–{range.to} de {totalRecords}
          </p>
        ) : null}
      </div>

      <DashboardDataTableShell className="rounded-none">
        <DataTable
          value={rows}
          dataKey="id"
          loading={loading}
          paginator
          lazy
          stripedRows
          rows={PAGE_SIZE}
          first={page * PAGE_SIZE}
          totalRecords={totalRecords}
          onPage={onPageChange}
          expandedRows={expandedRows}
          onRowToggle={handleRowToggle}
          onRowClick={handleRowClick}
          rowExpansionTemplate={rowExpansionTemplate}
          rowClassName={rowClassName}
          emptyMessage="Nenhuma mensagem na fila."
          className={DASHBOARD_DATATABLE_CLASS}
          pt={tablePt}
        >
          <Column header="ID" body={idBody} style={{ width: "3.5rem" }} />
          <Column
            field="telefone"
            header="Telefone"
            body={(r: WhatsAppFilaItem) => dashboardCellMono(formatPhoneDisplay(r.telefone))}
            style={{ width: "8.5rem" }}
          />
          <Column
            header="Mensagem"
            body={mensagemBody}
            style={{ width: "14rem" }}
          />
          <Column header="Status" body={statusBody} style={{ width: "6.5rem" }} />
          <Column field="tentativas" header="Tent." style={{ width: "2.75rem" }} />
          <Column
            header="Agendada"
            body={(r: WhatsAppFilaItem) =>
              dashboardCellMono(formatBusinessDateTimeWithSeconds(r.dataAgendada))
            }
            style={{ width: "9.5rem" }}
          />
          <Column
            header="Envio"
            body={(r: WhatsAppFilaItem) =>
              dashboardCellMono(formatBusinessDateTimeWithSeconds(r.dataEnvio))
            }
            style={{ width: "9.5rem" }}
          />
          <Column
            field="linhaNome"
            header="Linha"
            body={(r: WhatsAppFilaItem) => dashboardCellText(r.linhaNome)}
            style={{ width: "5.5rem" }}
          />
          <Column
            header="Ações"
            body={actionBodyTemplate}
            align="right"
            style={{ width: "4.5rem" }}
          />
        </DataTable>

        <Menu
          model={selectedRow ? getFilaActionItems(selectedRow) : []}
          popup
          ref={menuRef}
          pt={dashboardActionsMenuPt()}
        />
      </DashboardDataTableShell>

      <DashboardConfirmDialog
        visible={!!cancelConfirmRow}
        onHide={() => setCancelConfirmRow(null)}
        onConfirm={() => void confirmCancelarFila()}
        header="Cancelar envio"
        tone="warning"
        confirmLabel="Cancelar envio"
        loading={actionLoading}
        message={
          <p>
            A mensagem para <span className="font-semibold text-white">{cancelConfirmRow?.telefone}</span> deixará de
            ser enviada automaticamente.
          </p>
        }
      />
    </WhatsAppSectionShell>
  );
}
