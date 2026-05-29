"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DataTable, type DataTablePageEvent } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { toast } from "sonner";
import { RefreshCw, RotateCcw, Ban } from "lucide-react";
import { DashboardDataTableShell } from "@/components/dashboard/DashboardDataTableShell";
import {
  DASHBOARD_DATATABLE_CLASS,
  DASHBOARD_DATATABLE_SHELL_CLASS,
  WHATSAPP_FILA_STATUS_TONES,
  dashboardCellMono,
  dashboardCellText,
  dashboardDataTablePt,
  dashboardStatusBadge,
} from "@/lib/dashboard-datatable";
import { emailService, type EmailFilaItem } from "@/lib/email-service";
import { WhatsAppSectionShell } from "@/components/dashboard/whatsapp/WhatsAppSectionShell";
import { formatBusinessDateTimeWithSeconds } from "@/lib/format-datetime";
import type { SpringPage } from "@/lib/spring-page";
import { springPageDisplayRange } from "@/lib/spring-page";

const STATUS_OPTIONS = [
  { label: "Todos", value: "" },
  { label: "Pendente", value: "PENDENTE" },
  { label: "Enviando", value: "ENVIANDO" },
  { label: "Sucesso", value: "SUCESSO" },
  { label: "Erro", value: "ERRO" },
  { label: "Cancelado", value: "CANCELADO" },
];

const PAGE_SIZE = 25;

export function EmailFila() {
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pageData, setPageData] = useState<SpringPage<EmailFilaItem> | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await emailService.listFila(page, PAGE_SIZE, statusFilter || undefined);
      setPageData(data);
    } catch {
      toast.error("Erro ao carregar fila");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const onPage = (e: DataTablePageEvent) => setPage(e.page ?? 0);

  const reprocessar = async (row: EmailFilaItem) => {
    setActionLoading(true);
    try {
      await emailService.reprocessarFila(row.id);
      toast.success("Reenfileirado");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setActionLoading(false);
    }
  };

  const cancelar = async (row: EmailFilaItem) => {
    setActionLoading(true);
    try {
      await emailService.cancelarFila(row.id);
      toast.success("Cancelado");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setActionLoading(false);
    }
  };

  const rows = pageData?.content ?? [];
  const tablePt = useMemo(() => dashboardDataTablePt({ density: "default" }), []);
  const range = pageData ? springPageDisplayRange(pageData) : { from: 0, to: 0 };

  return (
    <WhatsAppSectionShell
      eyebrow="Operação"
      title="Fila de e-mails"
      description="Mensagens enfileiradas por gatilhos ou testes. Processamento automático a cada 30 segundos."
      actions={
        <button
          type="button"
          disabled={loading}
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white/70"
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </button>
      }
    >
      <DashboardDataTableShell className={DASHBOARD_DATATABLE_SHELL_CLASS}>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Dropdown
            value={statusFilter}
            options={STATUS_OPTIONS}
            onChange={(e) => {
              setStatusFilter(e.value as string);
              setPage(0);
            }}
            placeholder="Estado"
          />
        </div>
        <DataTable
          value={rows}
          loading={loading}
          lazy
          paginator
          rows={PAGE_SIZE}
          totalRecords={pageData?.totalElements ?? 0}
          first={page * PAGE_SIZE}
          onPage={onPage}
          className={DASHBOARD_DATATABLE_CLASS}
          pt={tablePt}
          emptyMessage="Nenhum e-mail na fila"
        >
          <Column field="id" header="ID" body={(r: EmailFilaItem) => dashboardCellMono(String(r.id))} />
          <Column field="destinatario" header="Destino" body={(r: EmailFilaItem) => dashboardCellMono(r.destinatario)} />
          <Column field="assunto" header="Assunto" body={(r: EmailFilaItem) => dashboardCellText(r.assunto)} />
          <Column
            field="status"
            header="Estado"
            body={(r: EmailFilaItem) => dashboardStatusBadge(r.status, WHATSAPP_FILA_STATUS_TONES)}
          />
          <Column
            field="dataCriacao"
            header="Criado"
            body={(r: EmailFilaItem) => dashboardCellMono(formatBusinessDateTimeWithSeconds(r.dataCriacao))}
          />
          <Column
            header="Acções"
            body={(r: EmailFilaItem) => (
              <div className="flex gap-2">
                {r.status !== "SUCESSO" && r.status !== "CANCELADO" ? (
                  <>
                    <Button
                      icon={<RotateCcw className="h-4 w-4" />}
                      rounded
                      text
                      disabled={actionLoading}
                      onClick={() => void reprocessar(r)}
                      tooltip="Reprocessar"
                    />
                    <Button
                      icon={<Ban className="h-4 w-4" />}
                      rounded
                      text
                      severity="danger"
                      disabled={actionLoading}
                      onClick={() => void cancelar(r)}
                      tooltip="Cancelar"
                    />
                  </>
                ) : null}
              </div>
            )}
          />
        </DataTable>
        {pageData ? (
          <p className="mt-2 text-xs text-white/40">
            {range.from}–{range.to} de {pageData.totalElements}
          </p>
        ) : null}
      </DashboardDataTableShell>
    </WhatsAppSectionShell>
  );
}
