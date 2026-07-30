"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { DataTable, type DataTablePageEvent } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { toast } from "sonner";
import { DashboardDataTableShell } from "@/components/dashboard/DashboardDataTableShell";
import { isApiConfigured } from "@/lib/api-config";
import {
  CHAMADO_STATUS_LABEL,
  CHAMADO_STATUS_TONES,
  listarChamados,
  type ChamadoListItem,
  type ChamadoStatus,
} from "@/lib/chamados-service";
import {
  DASHBOARD_DATATABLE_CLASS,
  DASHBOARD_SEARCH_ICON_HEADER_CLASS,
  DASHBOARD_SEARCH_INPUT_HEADER_CLASS,
  dashboardCellMono,
  dashboardCellText,
  dashboardDataTablePt,
  dashboardStatusBadge,
} from "@/lib/dashboard-datatable";
import { formatBusinessDateTime } from "@/lib/format-datetime";

const PAGE_SIZE = 10;

const STATUS_OPTIONS: { label: string; value: ChamadoStatus | null }[] = [
  { label: "Todos", value: null },
  { label: "Aberto", value: "ABERTO" },
  { label: "Em análise", value: "EM_ANALISE" },
  { label: "Concluído", value: "CONCLUIDO" },
  { label: "Cancelado", value: "CANCELADO" },
];

export function ChamadosList() {
  const router = useRouter();
  const [rows, setRows] = useState<ChamadoListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ChamadoStatus | null>(null);
  const [page, setPage] = useState(0);

  const load = useCallback(async () => {
    if (!isApiConfigured()) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await listarChamados(status, q);
      setRows(data);
      setPage(0);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível carregar os chamados.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [status, q]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const t = window.setTimeout(() => setQ(searchInput.trim()), 350);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const pageRows = useMemo(() => {
    const start = page * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, page]);

  const onPageChange = (event: DataTablePageEvent) => {
    setPage(event.page ?? 0);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 px-1 md:flex-row md:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className={DASHBOARD_SEARCH_ICON_HEADER_CLASS} size={18} />
          <InputText
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por assunto, nº, cliente…"
            className={DASHBOARD_SEARCH_INPUT_HEADER_CLASS}
          />
        </div>
        <Dropdown
          value={status}
          options={STATUS_OPTIONS}
          onChange={(e) => setStatus(e.value as ChamadoStatus | null)}
          placeholder="Status"
          className="w-full md:w-52"
          pt={{
            root: { className: "border-white/10 bg-white/5 text-white" },
            input: { className: "text-sm text-white" },
            panel: { className: "border-white/10 bg-[#071C33] text-white" },
          }}
        />
      </div>

      <DashboardDataTableShell>
        <DataTable
          value={pageRows}
          loading={loading}
          paginator
          lazy
          first={page * PAGE_SIZE}
          rows={PAGE_SIZE}
          totalRecords={rows.length}
          onPage={onPageChange}
          emptyMessage="Nenhum chamado encontrado."
          className={DASHBOARD_DATATABLE_CLASS}
          pt={dashboardDataTablePt()}
          onRowClick={(e) => {
            const row = e.data as ChamadoListItem;
            router.push(`/dashboard/atendimento/chamados/detalhe?id=${row.id}`);
          }}
          rowClassName={() => "cursor-pointer"}
        >
          <Column
            header="Nº"
            body={(row: ChamadoListItem) => dashboardCellMono(`#${row.numero}`)}
            style={{ width: "5rem" }}
          />
          <Column
            header="Assunto"
            body={(row: ChamadoListItem) => dashboardCellText(row.assunto)}
          />
          <Column
            header="Cliente"
            body={(row: ChamadoListItem) => dashboardCellText(row.nomeContratante ?? "—")}
          />
          <Column
            header="Contrato"
            body={(row: ChamadoListItem) =>
              dashboardCellMono(row.numeroContrato ?? (row.contratoId != null ? String(row.contratoId) : "—"))
            }
          />
          <Column
            header="Status"
            body={(row: ChamadoListItem) =>
              dashboardStatusBadge(CHAMADO_STATUS_LABEL[row.status], CHAMADO_STATUS_TONES, row.status)
            }
            style={{ width: "8rem" }}
          />
          <Column
            header="Aberto em"
            body={(row: ChamadoListItem) =>
              dashboardCellText(formatBusinessDateTime(row.abertoEm) || "—")
            }
            style={{ width: "11rem" }}
          />
        </DataTable>
      </DashboardDataTableShell>
    </div>
  );
}
