"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DataTable, type DataTablePageEvent } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { Menu } from "primereact/menu";
import type { MenuItem } from "primereact/menuitem";
import { toast } from "sonner";
import {
  Ban,
  CalendarClock,
  Mail,
  RefreshCw,
  RotateCcw,
  Send,
  AlertCircle,
} from "lucide-react";
import {
  DASHBOARD_ACTIONS_BUTTON_CLASS,
  WHATSAPP_FILA_STATUS_TONES,
  dashboardActionMenuItem,
  dashboardActionMenuSeparator,
  dashboardActionsMenuPt,
  dashboardStatusBadge,
} from "@/lib/dashboard-datatable";
import { emailService, type EmailFilaItem } from "@/lib/email-service";
import { formatBusinessDateTimeWithSeconds } from "@/lib/format-datetime";
import type { SpringPage } from "@/lib/spring-page";
import { DashboardConfirmDialog } from "@/components/dashboard/DashboardConfirmDialog";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
  { label: "Todos os estados", value: "" },
  { label: "Pendente", value: "PENDENTE" },
  { label: "Enviando", value: "ENVIANDO" },
  { label: "Sucesso", value: "SUCESSO" },
  { label: "Erro", value: "ERRO" },
  { label: "Cancelado", value: "CANCELADO" },
];

const PAGE_SIZE = 10;

const FILA_TABLE_PT = {
  header: { className: "bg-transparent border-white/5 p-6" },
  table: { className: "bg-transparent" },
  thead: { className: "bg-white/5" },
  headerRow: { className: "bg-transparent" },
  bodyRow: {
    className: "bg-transparent border-white/5 hover:bg-white/[0.02] transition-colors",
  },
  column: {
    headerCell: {
      className:
        "bg-transparent border-white/5 text-white/40 font-bold text-[10px] uppercase tracking-widest py-4 px-6",
    },
    bodyCell: { className: "border-white/5 py-4 px-6 align-top" },
  },
  paginator: {
    root: { className: "bg-transparent border-white/5 p-4" },
    pages: { className: "flex gap-1" },
    pageButton: ({ context }: { context?: { active?: boolean } }) => ({
      className: cn(
        "rounded-lg border-none transition-all w-8 h-8 flex items-center justify-center",
        context?.active
          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
          : "bg-white/5 text-white/60 hover:bg-blue-600 hover:text-white",
      ),
    }),
  },
};

function canReprocessar(row: EmailFilaItem) {
  return row.status !== "SUCESSO" && row.status !== "CANCELADO";
}

function canCancelar(row: EmailFilaItem) {
  return row.status !== "SUCESSO" && row.status !== "CANCELADO";
}

export function EmailFila() {
  const menuRef = useRef<Menu>(null);
  const [selectedRow, setSelectedRow] = useState<EmailFilaItem | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pageData, setPageData] = useState<SpringPage<EmailFilaItem> | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [cancelConfirmRow, setCancelConfirmRow] = useState<EmailFilaItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await emailService.listFila(page, PAGE_SIZE, statusFilter || undefined);
      setPageData(data);
    } catch {
      toast.error("Erro ao carregar fila de e-mails.");
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

  const onPageChange = (event: DataTablePageEvent) => {
    setPage(event.page ?? 0);
  };

  const handleReprocessar = async (row: EmailFilaItem) => {
    setActionLoading(true);
    try {
      await emailService.reprocessarFila(row.id);
      toast.success("E-mail reenfileirado para envio.");
      void load();
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
      await emailService.cancelarFila(cancelConfirmRow.id);
      toast.success("Envio cancelado.");
      setCancelConfirmRow(null);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao cancelar.");
    } finally {
      setActionLoading(false);
    }
  };

  const getActionItems = (row: EmailFilaItem): MenuItem[] => {
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
      if (items.length > 0) items.push(dashboardActionMenuSeparator());
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

  const rows = pageData?.content ?? [];
  const totalRecords = pageData?.totalElements ?? 0;

  const destinoBody = (row: EmailFilaItem) => (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-sky-500/10 bg-sky-500/10 text-sky-400 transition-all duration-300 group-hover:bg-sky-600 group-hover:text-white">
        <Mail size={18} />
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-semibold leading-tight text-white">{row.destinatario}</span>
        <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-white/40">
          ID #{row.id}
        </span>
      </div>
    </div>
  );

  const assuntoBody = (row: EmailFilaItem) => (
    <p
      className="m-0 line-clamp-2 max-w-[18rem] text-sm leading-relaxed text-white/70"
      title={row.assunto}
    >
      {row.assunto?.trim() || "—"}
    </p>
  );

  const statusBody = (row: EmailFilaItem) =>
    dashboardStatusBadge(row.status, WHATSAPP_FILA_STATUS_TONES);

  const tentativasBody = (row: EmailFilaItem) => (
    <span className="font-mono text-sm tabular-nums text-white/60">{row.tentativas ?? 0}</span>
  );

  const dateBody = (iso: string | null | undefined) => {
    const formatted = formatBusinessDateTimeWithSeconds(iso);
    if (formatted === "—") {
      return <span className="text-white/20">—</span>;
    }
    return (
      <div className="flex items-center gap-2 text-sm text-white/60">
        <CalendarClock size={14} className="shrink-0 text-sky-400/60" />
        <span className="font-mono tabular-nums tracking-tight">{formatted}</span>
      </div>
    );
  };

  const envioBody = (row: EmailFilaItem) => {
    if (!row.dataEnvio) {
      return <span className="text-white/20">—</span>;
    }
    return (
      <div className="flex items-center gap-2 text-sm text-white/60">
        <Send size={14} className="shrink-0 text-emerald-400/60" />
        <span className="font-mono tabular-nums tracking-tight">
          {formatBusinessDateTimeWithSeconds(row.dataEnvio)}
        </span>
      </div>
    );
  };

  const erroBody = (row: EmailFilaItem) => {
    const msg = row.erro?.trim();
    if (!msg) return <span className="text-white/20">—</span>;
    return (
      <div className="flex max-w-[14rem] items-start gap-2 text-sm text-rose-300/90">
        <AlertCircle size={14} className="mt-0.5 shrink-0 text-rose-400/70" />
        <span className="line-clamp-3 break-words leading-relaxed" title={msg}>
          {msg}
        </span>
      </div>
    );
  };

  const actionBody = (row: EmailFilaItem) => {
    if (!canReprocessar(row) && !canCancelar(row)) {
      return <span className="block text-right text-white/25">—</span>;
    }
    return (
      <div className="flex justify-end">
        <Button
          icon="pi pi-ellipsis-h"
          className={DASHBOARD_ACTIONS_BUTTON_CLASS}
          onClick={(e) => {
            setSelectedRow(row);
            menuRef.current?.toggle(e);
          }}
          tooltip="Ações"
          tooltipOptions={{ position: "left" }}
        />
      </div>
    );
  };

  const header = (
    <div className="flex flex-col gap-4 py-2 md:flex-row md:items-center md:justify-between">
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 md:w-auto">
        <Dropdown
          value={statusFilter}
          options={STATUS_OPTIONS}
          optionLabel="label"
          optionValue="value"
          onChange={(e) => setStatusFilter((e.value as string) ?? "")}
          placeholder="Filtrar por estado"
          className="w-full border-white/10 bg-white/5 sm:min-w-[14rem]"
        />
        <button
          type="button"
          disabled={loading}
          onClick={() => void load()}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white/60 transition-colors hover:text-white disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Actualizar
        </button>
      </div>
      <p className="text-sm text-white/40">
        <span className="font-bold text-white">{totalRecords}</span>{" "}
        {totalRecords === 1 ? "e-mail na fila" : "e-mails na fila"}
      </p>
    </div>
  );

  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl">
      <DataTable
        value={rows}
        dataKey="id"
        lazy
        paginator
        loading={loading}
        first={page * PAGE_SIZE}
        rows={PAGE_SIZE}
        totalRecords={totalRecords}
        onPage={onPageChange}
        header={header}
        className="p-datatable-responsive-demo"
        emptyMessage="Nenhum e-mail na fila."
        responsiveLayout="stack"
        breakpoint="960px"
        pt={FILA_TABLE_PT}
      >
        <Column header="Destinatário" body={destinoBody} />
        <Column header="Assunto" body={assuntoBody} />
        <Column header="Estado" body={statusBody} style={{ width: "7rem" }} />
        <Column header="Tent." body={tentativasBody} style={{ width: "3.5rem" }} align="center" />
        <Column header="Criado" body={(r: EmailFilaItem) => dateBody(r.dataCriacao)} />
        <Column header="Envio" body={envioBody} />
        <Column header="Erro" body={erroBody} />
        <Column header="Ações" body={actionBody} align="right" style={{ width: "4.5rem" }} />
      </DataTable>

      <Menu
        model={selectedRow ? getActionItems(selectedRow) : []}
        popup
        ref={menuRef}
        pt={dashboardActionsMenuPt()}
      />

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
            O e-mail para <span className="font-semibold text-white">{cancelConfirmRow?.destinatario}</span> deixará de
            ser enviado automaticamente.
          </p>
        }
      />
    </div>
  );
}
