"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Search, 
  Pencil, 
  Eye, 
  Trash2, 
  Building2,
  Mail,
  Hash,
  BadgeCheck,
  Building
} from "lucide-react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Menu } from "primereact/menu";
import { toast } from "sonner";
import { usePaginatedSpringList } from "@/hooks/use-paginated-spring-list";
import { getImobiliariasListUrl, isApiConfigured } from "@/lib/api-config";
import { cn } from "@/lib/utils";
import {
  DASHBOARD_SEARCH_ICON_HEADER_CLASS,
  DASHBOARD_SEARCH_INPUT_HEADER_CLASS,
} from "@/lib/dashboard-datatable";
import type { ImobiliariaApiResponse } from "@/lib/validations/imobiliaria";

export function ImobiliariasList() {
  const router = useRouter();
  const menuRef = useRef<Menu>(null);
  const [selectedRow, setSelectedRow] = useState<ImobiliariaApiResponse | null>(null);

  const buildUrl = useCallback(
    (page: number, size: number, q: string) => getImobiliariasListUrl(page, size, q),
    []
  );

  const actionItems = [
    { 
      label: 'Editar Imobiliária', 
      icon: 'pi pi-pencil', 
      template: (item: any) => (
        <button onClick={item.command} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors group">
          <i className="pi pi-pencil text-blue-400 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-widest text-white/70 text-left whitespace-nowrap">{item.label}</span>
        </button>
      ),
      command: () => {
        if (selectedRow) router.push(`/dashboard/imobiliarias/edit?id=${selectedRow.id}`);
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
          <span className="text-xs font-bold uppercase tracking-widest text-white/70 text-left whitespace-nowrap">{item.label}</span>
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
    fetchError,
  } = usePaginatedSpringList<ImobiliariaApiResponse>({
    buildUrl,
    pageSize: 10,
    fallbackErrorMessage: "Não foi possível carregar as imobiliárias.",
    onFetchError: (m) => toast.error(m),
  });

  const rows = pageData?.content ?? [];
  const totalRecords = pageData?.totalElements ?? 0;

  const onPageChange = (event: any) => {
    setPage(event.page);
  };

  const nameBodyTemplate = (rowData: ImobiliariaApiResponse) => {
    return (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
          <Building2 size={18} />
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-white leading-tight">{rowData.razaoSocial}</span>
          <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold mt-1">ID: #{rowData.id}</span>
        </div>
      </div>
    );
  };

  const cnpjBodyTemplate = (rowData: ImobiliariaApiResponse) => {
    return (
      <div className="flex items-center gap-2 text-white/60 font-mono text-xs">
        <Hash size={12} className="text-blue-400/40" />
        {rowData.cnpj}
      </div>
    );
  };

  const emailBodyTemplate = (rowData: ImobiliariaApiResponse) => {
    return rowData.email ? (
      <div className="flex items-center gap-2 text-white/60 text-sm">
        <Mail size={14} className="text-blue-400/60" />
        <span>{rowData.email}</span>
      </div>
    ) : (
      <span className="text-white/20">—</span>
    );
  };

  const creciBodyTemplate = (rowData: ImobiliariaApiResponse) => {
    return rowData.creciJ ? (
      <div className="flex items-center gap-2 text-white/60 text-sm">
        <BadgeCheck size={14} className="text-emerald-400/60" />
        <span>{rowData.creciJ}</span>
      </div>
    ) : (
      <span className="text-white/20">—</span>
    );
  };

  const actionBodyTemplate = (rowData: ImobiliariaApiResponse) => {
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
          placeholder="Buscar por razão social ou CNPJ..." 
          className={DASHBOARD_SEARCH_INPUT_HEADER_CLASS}
        />
      </div>
      <div className="text-sm text-white/40">
        <span className="text-white font-bold">{totalRecords}</span> imobiliárias encontradas
      </div>
    </div>
  );

  if (!isApiConfigured()) {
    return (
      <div className="p-8 text-center bg-amber-500/10 border border-amber-500/20 rounded-[2rem] backdrop-blur-sm">
        <p className="text-amber-200">A API não está configurada corretamente.</p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl ">
      <DataTable 
        value={rows} 
        lazy 
        paginator 
        first={params.page * pageSize} 
        rows={pageSize} 
        totalRecords={totalRecords} 
        onPage={onPageChange}
        header={header}
        className="p-datatable-custom"
        emptyMessage="Nenhuma imobiliária cadastrada."
        responsiveLayout="stack"
        breakpoint="960px"
        pt={{
          header: { className: 'bg-transparent border-white/5 p-6' },
          table: { className: 'bg-transparent' },
          thead: { className: 'bg-white/5' },
          headerRow: { className: 'bg-transparent' },
          bodyRow: { className: 'bg-transparent border-white/5 hover:bg-white/[0.02] transition-colors group' },
          column: { 
            headerCell: { className: 'bg-transparent border-white/5 text-white/40 font-bold text-[10px] uppercase tracking-widest py-6 px-8' },
            bodyCell: { className: 'border-white/5 py-5 px-8' }
          },
          paginator: {
            root: { className: 'bg-transparent border-white/5 p-6' },
            pages: { className: 'flex gap-2' },
            pageButton: ({ context }: any) => ({
              className: cn(
                'rounded-xl border-none transition-all w-10 h-10 font-bold flex items-center justify-center',
                context.active 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                  : 'bg-white/5 text-white/60 hover:bg-blue-600 hover:text-white'
              )
            })
          }
        }}
      >
        <Column field="razaoSocial" header="Razão Social" body={nameBodyTemplate} className="min-w-[250px]" />
        <Column field="cnpj" header="CNPJ" body={cnpjBodyTemplate} />
        <Column field="creciJ" header="CRECI" body={creciBodyTemplate} />
        <Column field="email" header="E-mail" body={emailBodyTemplate} />
        <Column header="Ações" body={actionBodyTemplate} align="right" />
      </DataTable>

      <Menu 
        model={actionItems} 
        popup 
        ref={menuRef} 
        id="popup_menu_imobiliarias"
        pt={{
          root: { className: 'bg-[#071C33] border-white/10 shadow-2xl rounded-xl py-2 w-max' },
          menu: { className: 'p-0' },
          menuitem: {
            className: cn(
              'transition-all duration-200',
              ""
            )
          },
          action: { className: 'px-0 py-0 flex items-center no-underline' }
        }}
      />
    </div>
  );
}
