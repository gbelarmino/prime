"use client";

import { useState, useEffect } from "react";
import { FileText, Calendar, Clock, ExternalLink } from "lucide-react";
import { DataTable, type DataTablePageEvent } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { DashboardDialog } from "@/components/dashboard/DashboardDialog";
import { toast } from "sonner";
import {
  getClicksignEnvelopesUrl,
  getClicksignEnvelopeDetailsUrl,
  type ClicksignEnvelopeStatusFilter,
} from "@/lib/api-config";
import { apiFetch } from "@/lib/api-fetch";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

/** Total de envelopes na resposta JSON:API da Clicksign v3 (`meta.record_count`). */
function extractClicksignTotalRecords(json: unknown): number {
  if (!json || typeof json !== "object") return 0;
  const root = json as Record<string, unknown>;
  const meta = root.meta;
  if (meta && typeof meta === "object") {
    const m = meta as Record<string, unknown>;
    if (m.record_count != null) {
      const n = Number(m.record_count);
      if (!Number.isNaN(n) && n >= 0) return n;
    }
    const pagination = m.pagination;
    if (pagination && typeof pagination === "object") {
      const p = pagination as Record<string, unknown>;
      if (typeof p.total_count === "number") return p.total_count;
      if (typeof p.total === "number") return p.total;
    }
  }
  const data = root.data;
  return Array.isArray(data) ? data.length : 0;
}

const STATUS_FILTER_OPTIONS: { value: ClicksignEnvelopeStatusFilter; label: string }[] = [
  { value: "", label: "Todos os status" },
  { value: "draft", label: "Rascunho" },
  { value: "running", label: "Em curso" },
  { value: "closed", label: "Fechado" },
  { value: "canceled", label: "Cancelado" },
];

export function ClicksignList() {
  const [loading, setLoading] = useState(true);
  const [envelopes, setEnvelopes] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<ClicksignEnvelopeStatusFilter>("");
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedEnvelope, setSelectedEnvelope] = useState<any>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchEnvelopes = async (
    pageIndex: number,
    status: ClicksignEnvelopeStatusFilter,
  ) => {
    setLoading(true);
    try {
      const apiPage = pageIndex + 1;
      const res = await apiFetch(
        getClicksignEnvelopesUrl(apiPage, status || undefined, PAGE_SIZE),
      );
      if (!res.ok) throw new Error("Erro ao buscar envelopes");
      const json = await res.json();

      setEnvelopes(json.data || []);
      setTotalRecords(extractClicksignTotalRecords(json));
    } catch {
      toast.error("Não foi possível carregar os envelopes da Clicksign.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnvelopes(page, statusFilter);
  }, [page, statusFilter]);

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value as ClicksignEnvelopeStatusFilter);
    setPage(0);
  };

  const onPageChange = (e: DataTablePageEvent) => {
    setPage(typeof e.page === "number" ? e.page : Math.floor((e.first ?? 0) / PAGE_SIZE));
  };

  const showDetails = async (id: string) => {
    setSelectedEnvelope(null);
    setDetailsVisible(true);
    setLoadingDetails(true);
    try {
      const res = await apiFetch(getClicksignEnvelopeDetailsUrl(id));
      if (!res.ok) throw new Error("Erro ao buscar detalhes");
      const json = await res.json();
      setSelectedEnvelope(json.data);
    } catch (error) {
      toast.error("Erro ao carregar detalhes do envelope.");
      setDetailsVisible(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  const statusBodyTemplate = (rowData: any) => {
    const status = rowData.attributes?.status || "unknown";
    const configs: any = {
      "draft": { bg: "bg-amber-500/10", text: "text-amber-400", label: "Rascunho" },
      "sent": { bg: "bg-blue-500/10", text: "text-blue-400", label: "Enviado" },
      "running": { bg: "bg-blue-500/10", text: "text-blue-400", label: "Em curso" },
      "completed": { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "Concluído" },
      "canceled": { bg: "bg-rose-500/10", text: "text-rose-400", label: "Cancelado" },
      "closed": { bg: "bg-gray-500/10", text: "text-gray-400", label: "Fechado" },
    };
    const config = configs[status] || { bg: "bg-white/5", text: "text-white/40", label: status };

    return (
      <div className={cn("inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest", config.bg, config.text)}>
        {config.label}
      </div>
    );
  };

  const dateBodyTemplate = (rowData: any) => {
    const date = rowData.attributes?.created;
    if (!date) return "—";
    return (
      <div className="flex items-center gap-2 text-white/60">
        <Calendar size={14} className="text-white/20" />
        <span className="text-xs">{new Date(date).toLocaleDateString('pt-BR')}</span>
      </div>
    );
  };

  const nameBodyTemplate = (rowData: any) => {
    return (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-400 border border-blue-400/10">
          <FileText size={16} />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-white leading-none">{rowData.attributes?.name || "Sem nome"}</span>
          <span className="text-[10px] text-white/30 font-mono mt-1">{rowData.id}</span>
        </div>
      </div>
    );
  };

  const actionBodyTemplate = (rowData: any) => {
    return (
      <div className="flex justify-end gap-2">
        <Button 
          icon="pi pi-eye" 
          className="p-button-rounded p-button-text text-blue-400 hover:bg-blue-400/10"
          onClick={() => showDetails(rowData.id)}
          tooltip="Ver Detalhes"
        />
      </div>
    );
  };

  const tableHeader = (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-2">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
          Status do envelope
        </span>
        <select
          value={statusFilter}
          onChange={(e) => handleStatusFilterChange(e.target.value)}
          disabled={loading}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white/70 focus:outline-none focus:border-blue-500/50 transition-all min-w-[200px] disabled:opacity-50"
          aria-label="Filtrar por status do envelope"
        >
          {STATUS_FILTER_OPTIONS.map((o) => (
            <option key={o.value || "all"} value={o.value} className="bg-[#020817]">
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="text-sm text-white/40 px-2 sm:text-right shrink-0">
        <span className="text-white font-bold">{loading ? "…" : totalRecords}</span> envelopes
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl">
        <DataTable
          value={envelopes}
          lazy
          paginator
          rows={PAGE_SIZE}
          first={page * PAGE_SIZE}
          totalRecords={totalRecords}
          onPage={onPageChange}
          loading={loading}
          header={tableHeader}
          emptyMessage="Nenhum envelope encontrado na Clicksign."
          responsiveLayout="stack"
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
          currentPageReportTemplate="{first}–{last} de {totalRecords}"
          pt={{
            header: { className: 'bg-transparent border-white/5 p-6' },
            table: { className: 'bg-transparent' },
            thead: { className: 'bg-white/5' },
            bodyRow: { className: 'bg-transparent border-white/5 hover:bg-white/[0.02] transition-colors' },
            column: {
              headerCell: {
                className:
                  "bg-transparent border-white/5 text-white/40 font-bold text-[10px] uppercase tracking-widest py-4 px-6",
              },
              bodyCell: { className: "border-white/5 py-4 px-6" },
            },
            paginator: {
              root: {
                className:
                  "bg-transparent border-t border-white/5 p-4 flex flex-wrap items-center justify-center gap-2",
              },
              pages: { className: "flex items-center gap-1 mx-2" },
              pageButton: ({ context }: { context: { active?: boolean } }) => ({
                className: cn(
                  "rounded-lg border-none transition-all w-8 h-8 flex items-center justify-center text-xs font-bold shrink-0",
                  context.active
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white",
                ),
              }),
              firstPageButton: {
                className:
                  "text-white/30 hover:text-white transition-colors w-8 h-8 flex items-center justify-center shrink-0",
              },
              prevPageButton: {
                className:
                  "text-white/30 hover:text-white transition-colors w-8 h-8 flex items-center justify-center shrink-0",
              },
              nextPageButton: {
                className:
                  "text-white/30 hover:text-white transition-colors w-8 h-8 flex items-center justify-center shrink-0",
              },
              lastPageButton: {
                className:
                  "text-white/30 hover:text-white transition-colors w-8 h-8 flex items-center justify-center shrink-0",
              },
              current: {
                className: "text-[10px] font-bold text-white/40 uppercase tracking-widest ml-2",
              },
            },
          }}
        >
          <Column header="Envelope / Documento" body={nameBodyTemplate} />
          <Column header="Data de Criação" body={dateBodyTemplate} />
          <Column header="Status" body={statusBodyTemplate} />
          <Column body={actionBodyTemplate} align="right" />
        </DataTable>

      </div>

      {/* Dialog de Detalhes */}
      <DashboardDialog 
        header="Detalhes do Envelope" 
        visible={detailsVisible} 
        onHide={() => setDetailsVisible(false)}
        className="w-full max-w-3xl mx-4"
        contentClassName="bg-[#020817] p-0"
        headerClassName="bg-[#020817] border-b border-white/5 p-6 text-white"
        pt={{
          root: { className: 'rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl' },
          mask: { className: 'backdrop-blur-sm bg-black/40' }
        }}
      >
        {loadingDetails ? null : selectedEnvelope && (
          <div className="flex flex-col">
            {/* Resumo do Header */}
            <div className="p-8 bg-white/5 flex flex-col md:flex-row justify-between gap-6">
              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-black text-white">{selectedEnvelope.attributes?.name}</h2>
                <div className="flex items-center gap-4">
                    <span className="text-xs text-white/40 font-mono">{selectedEnvelope.id}</span>
                    {statusBodyTemplate(selectedEnvelope)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a 
                  href={`https://sandbox.clicksign.com/envelopes/${selectedEnvelope.id}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-full no-underline flex items-center gap-2 transition-all"
                >
                  Ver na Clicksign
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Atributos */}
                <div className="flex flex-col gap-6">
                    <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Configurações</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-xs text-white/40">Idioma</span>
                            <span className="text-xs text-white font-bold">{selectedEnvelope.attributes?.locale}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-xs text-white/40">Auto Close</span>
                            <span className="text-xs text-white font-bold">{selectedEnvelope.attributes?.auto_close ? 'Sim' : 'Não'}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-xs text-white/40">Prazo</span>
                            <span className="text-xs text-white font-bold">
                                {selectedEnvelope.attributes?.deadline_at ? new Date(selectedEnvelope.attributes.deadline_at).toLocaleDateString('pt-BR') : 'Sem prazo'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Datas */}
                <div className="flex flex-col gap-6">
                    <h3 className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em]">Timeline</h3>
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="mt-1 w-2 h-2 rounded-full bg-blue-500" />
                            <div className="flex flex-col">
                                <span className="text-xs text-white font-bold">Criado em</span>
                                <span className="text-[10px] text-white/40">
                                    {new Date(selectedEnvelope.attributes?.created).toLocaleString('pt-BR')}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="mt-1 w-2 h-2 rounded-full bg-amber-500" />
                            <div className="flex flex-col">
                                <span className="text-xs text-white font-bold">Última modificação</span>
                                <span className="text-[10px] text-white/40">
                                    {new Date(selectedEnvelope.attributes?.modified).toLocaleString('pt-BR')}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Documentos Relacionados se existissem na response detalhada */}
            <div className="p-8 border-t border-white/5 bg-white/[0.01]">
                <div className="bg-blue-500/5 border border-blue-500/10 p-6 rounded-2xl flex items-center gap-6">
                    <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-400">
                        <Clock size={24} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-sm text-white font-bold">Histórico e Webhooks</span>
                        <p className="text-xs text-white/40 leading-relaxed">
                            O acompanhamento detalhado de assinaturas por signatário está disponível diretamente no portal da Clicksign através do link acima.
                        </p>
                    </div>
                </div>
            </div>
          </div>
        )}
      </DashboardDialog>
    </div>
  );
}
