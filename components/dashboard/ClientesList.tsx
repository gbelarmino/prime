"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Search, 
  Pencil, 
  Eye, 
  Trash2, 
  User, 
  Mail, 
  Phone, 
  MapPin,
  MoreVertical,
  MoreHorizontal,
  FileText,
} from "lucide-react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Menu } from "primereact/menu";
import { toast } from "sonner";
import { usePaginatedSpringList } from "@/hooks/use-paginated-spring-list";
import { getContratantesListUrl, isApiConfigured } from "@/lib/api-config";
import { exportContratantesAgenda } from "@/lib/contratante-service";
import { formatCpfDisplay } from "@/lib/format-cpf";
import { formatPhoneDisplay } from "@/lib/format-phone";
import { cn } from "@/lib/utils";
import {
  DASHBOARD_SEARCH_ICON_HEADER_CLASS,
  DASHBOARD_SEARCH_INPUT_HEADER_CLASS,
} from "@/lib/dashboard-datatable";
import { ClienteViewModal } from "@/components/dashboard/ClienteViewModal";

export type ContratanteListItem = {
  id: number;
  nome: string;
  cpf: string;
  cidade: string | null;
  email: string | null;
  telefoneCelular1: string | null;
  quantidadeContratos?: number;
};

export function ClientesList() {
  const router = useRouter();
  const menuRef = useRef<Menu>(null);
  const [selectedRow, setSelectedRow] = useState<ContratanteListItem | null>(null);
  const [viewClientId, setViewClientId] = useState<number | null>(null);
  const [isExportingAgenda, setIsExportingAgenda] = useState(false);

  const buildUrl = useCallback(
    (page: number, size: number, q: string) => getContratantesListUrl(page, size, q),
    []
  );

  const actionItems = [
    { 
      label: 'Editar Cliente', 
      icon: 'pi pi-pencil', 
      template: (item: any) => (
        <button onClick={item.command} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors group">
          <i className="pi pi-pencil text-blue-400 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-widest text-white/70 text-left whitespace-nowrap">{item.label}</span>
        </button>
      ),
      command: () => {
        if (selectedRow) router.push(`/dashboard/clientes/edit?id=${selectedRow.id}`);
      }
    },
    { 
      label: 'Visualizar Detalhes', 
      icon: 'pi pi-eye', 
      template: (item: any) => (
        <button onClick={item.command} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors group">
          <i className="pi pi-eye text-emerald-400 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-widest text-white/70 text-left whitespace-nowrap">{item.label}</span>
        </button>
      ),
      command: () => {
        if (selectedRow) setViewClientId(selectedRow.id);
      }
    },
    { separator: true },

    { 
      label: 'Excluir Registro', 
      icon: 'pi pi-trash', 
      disabled: true,
      template: (item: any) => (
        <div className="w-full px-4 py-3 flex items-center gap-3 opacity-30 cursor-not-allowed">
          <i className="pi pi-trash text-rose-400" />
          <span className="text-xs font-bold uppercase tracking-widest text-white/70">{item.label}</span>
        </div>
      )
    },
  ];

  const {
    searchInput,
    setSearchInput,
    params,
    setPage,
    pageSize,
    loading,
    pageData,
  } = usePaginatedSpringList<ContratanteListItem>({
    buildUrl,
    pageSize: 10,
    fallbackErrorMessage: "Não foi possível carregar os clientes.",
    onFetchError: (m) => toast.error(m),
  });

  const rows = pageData?.content ?? [];
  const totalRecords = pageData?.totalElements ?? 0;

  const onPageChange = (event: any) => {
    setPage(event.page);
  };

  const handleExportAgenda = async () => {
    setIsExportingAgenda(true);
    try {
      const { exported, skipped } = await exportContratantesAgenda(params.q);
      const skippedNote =
        skipped > 0 ? ` (${skipped} sem celular válido ignorado${skipped === 1 ? "" : "s"})` : "";
      toast.success(`${exported} contato${exported === 1 ? "" : "s"} exportado${exported === 1 ? "" : "s"}${skippedNote}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível exportar a agenda.";
      toast.error(message);
    } finally {
      setIsExportingAgenda(false);
    }
  };

  const nameBodyTemplate = (rowData: ContratanteListItem) => {
    return (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/10 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
          <User size={18} />
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-white leading-tight">{rowData.nome}</span>
          <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold mt-1">ID: #{rowData.id}</span>
        </div>
      </div>
    );
  };

  const cpfBodyTemplate = (rowData: ContratanteListItem) => {
    return <span className="font-mono text-white/60 text-sm">{formatCpfDisplay(rowData.cpf)}</span>;
  };

  const emailBodyTemplate = (rowData: ContratanteListItem) => {
    return rowData.email ? (
      <div className="flex items-center gap-2 text-white/60 text-sm">
        <Mail size={14} className="text-blue-400/60" />
        <span>{rowData.email}</span>
      </div>
    ) : "—";
  };

  const phoneBodyTemplate = (rowData: ContratanteListItem) => {
    const formatted = formatPhoneDisplay(rowData.telefoneCelular1);
    return formatted ? (
      <div className="flex items-center gap-2 text-white/60 text-sm">
        <Phone size={14} className="text-blue-400/60" />
        <span className="font-mono tabular-nums tracking-tight">{formatted}</span>
      </div>
    ) : "—";
  };

  const cityBodyTemplate = (rowData: ContratanteListItem) => {
    return rowData.cidade ? (
      <div className="flex items-center gap-2 text-white/60 text-sm">
        <MapPin size={12} className="text-blue-400/60" />
        <span>{rowData.cidade}</span>
      </div>
    ) : "—";
  };

  const contratosBodyTemplate = (rowData: ContratanteListItem) => {
    const qtd = rowData.quantidadeContratos ?? 0;
    if (qtd <= 0) {
      return <span className="text-white/20">—</span>;
    }
    const badgeLabel = qtd > 99 ? "99+" : String(qtd);
    return (
      <button
        type="button"
        title={`Ver ${qtd} contrato(s) deste cliente`}
        onClick={() => router.push(`/dashboard/contratos?contratanteId=${rowData.id}`)}
        className="relative inline-flex items-center justify-center rounded-xl p-2 text-blue-400 transition-colors hover:bg-blue-500/10 hover:text-blue-300"
      >
        <FileText size={20} className="shrink-0" />
        <span className="absolute -right-1 -top-1 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full border border-[#071C33] bg-blue-600 px-1 text-[10px] font-bold leading-none text-white shadow-sm shadow-blue-600/40">
          {badgeLabel}
        </span>
      </button>
    );
  };

  const actionBodyTemplate = (rowData: ContratanteListItem) => {
    return (
      <div className="flex justify-end">
        <Button 
          icon="pi pi-ellipsis-h" 
          className="p-button-rounded p-button-text text-amber-400 hover:bg-amber-400/10 transition-all active:scale-90"
          onClick={(e) => {
            setSelectedRow(rowData);
            menuRef.current?.toggle(e);
          }}
          tooltip="Ações"
          tooltipOptions={{ position: 'left' }}
        />
      </div>
    );
  };

  const header = (
    <div className="flex flex-col md:flex-row justify-between items-center gap-4 py-2">
      <div className="relative w-full md:w-96">
        <Search className={DASHBOARD_SEARCH_ICON_HEADER_CLASS} size={18} />
        <InputText 
          value={searchInput} 
          onChange={(e) => setSearchInput(e.target.value)} 
          placeholder="Buscar por nome, CPF ou e-mail..." 
          className={DASHBOARD_SEARCH_INPUT_HEADER_CLASS}
        />
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
        <div className="text-sm text-white/40 whitespace-nowrap">
          <span className="text-white font-bold">{totalRecords}</span> clientes encontrados
        </div>
        <Button
          label="Exportar agenda"
          icon="pi pi-address-book"
          className="bg-violet-600/10 hover:bg-violet-600/20 text-violet-300 border border-violet-500/20 text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-xl transition-all"
          onClick={handleExportAgenda}
          loading={isExportingAgenda}
          disabled={isExportingAgenda || totalRecords === 0}
          tooltip="Baixa vCard para importar no telemóvel (nome: Primeiro Nome - Empreendimento - Q L)"
          tooltipOptions={{ position: "left" }}
        />
      </div>
    </div>
  );

  if (!isApiConfigured()) {
    return (
      <div className="p-8 text-center bg-amber-500/10 border border-amber-500/20 rounded-2xl">
        <p className="text-amber-200">A API não está configurada. Verifique suas variáveis de ambiente.</p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl">
      <DataTable 
        value={rows} 
        lazy 
        paginator 
        first={params.page * pageSize} 
        rows={pageSize} 
        totalRecords={totalRecords} 
        onPage={onPageChange}
        header={header}
        className="p-datatable-responsive-demo"
        emptyMessage="Nenhum cliente encontrado."
        responsiveLayout="stack"
        breakpoint="960px"
        pt={{
          header: { className: 'bg-transparent border-white/5 p-6' },
          table: { className: 'bg-transparent' },
          thead: { className: 'bg-white/5' },
          headerRow: { className: 'bg-transparent' },
          bodyRow: { className: 'bg-transparent border-white/5 hover:bg-white/[0.02] transition-colors' },
          column: { 
            headerCell: { className: 'bg-transparent border-white/5 text-white/40 font-bold text-[10px] uppercase tracking-widest py-4 px-6' },
            bodyCell: { className: 'border-white/5 py-4 px-6' }
          },
          paginator: {
            root: { className: 'bg-transparent border-white/5 p-4' },
            pages: { className: 'flex gap-1' },
            pageButton: ({ context }: any) => ({
              className: cn(
                'rounded-lg border-none transition-all w-8 h-8 flex items-center justify-center',
                context.active 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                  : 'bg-white/5 text-white/60 hover:bg-blue-600 hover:text-white'
              )
            })
          }
        }}
      >
        <Column field="nome" header="Nome" body={nameBodyTemplate} />
        <Column field="cpf" header="CPF" body={cpfBodyTemplate} />
        <Column field="email" header="E-mail" body={emailBodyTemplate} />
        <Column field="telefoneCelular1" header="Celular" body={phoneBodyTemplate} />
        <Column field="cidade" header="Cidade" body={cityBodyTemplate} />
        <Column header="Contrato" body={contratosBodyTemplate} style={{ width: "4.5rem" }} align="center" />
        <Column header="Ações" body={actionBodyTemplate} align="right" />
      </DataTable>

      <Menu 
        model={actionItems} 
        popup 
        ref={menuRef} 
        id="popup_menu_actions"
        pt={{
          root: { className: 'bg-[#071C33] border-white/10 shadow-2xl rounded-xl py-2 w-max' },
          menu: { className: 'p-0' },
          menuitem: {
            className: cn(
              'transition-all duration-200',
              ""
            )
          },
          action: { className: 'px-4 py-3 flex items-center gap-3 no-underline' },
          icon: { className: 'text-sm' },
          label: { className: 'text-xs font-bold uppercase tracking-widest text-white/70' }
        }}
      />

      <ClienteViewModal 
        clientId={viewClientId} 
        onClose={() => setViewClientId(null)} 
      />
    </div>
  );
}
