"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Search, 
  Eye, 
  Trash2, 
  MapPin,
  Building2,
  Box,
  CheckCircle2,
  Clock,
  Ban,
  Tag,
  FileText,
} from "lucide-react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Menu } from "primereact/menu";
import { toast } from "sonner";
import { usePaginatedSpringList } from "@/hooks/use-paginated-spring-list";
import { getImoveisEmpreendimentosUrl, getImoveisListUrl, getImoveisQuadrasUrl, isApiConfigured } from "@/lib/api-config";
import { cn } from "@/lib/utils";
import {
  DASHBOARD_SEARCH_ICON_HEADER_CLASS,
  DASHBOARD_SEARCH_INPUT_HEADER_CLASS,
  dashboardActionMenuItem,
  dashboardActionMenuSeparator,
} from "@/lib/dashboard-datatable";
import type { MenuItem } from "primereact/menuitem";
import { getUserRole, getAuthToken } from "@/lib/auth-storage";
import { apiFetch } from "@/lib/api-fetch";
import { ImovelViewModal } from "@/components/dashboard/ImovelViewModal";
import { ContratoViewModal } from "@/components/dashboard/ContratoViewModal";
import {
  IMOVEL_SITUACAO_VENDIDO,
  type ImovelApiResponse,
} from "@/lib/validations/imovel";

export function ImoveisList() {
  const router = useRouter();
  const menuRef = useRef<Menu>(null);
  const [selectedRow, setSelectedRow] = useState<ImovelApiResponse | null>(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [viewContratoId, setViewContratoId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  
  // Filtros
  const [empreendimentoFilter, setEmpreendimentoFilter] = useState("");
  const [quadraFilter, setQuadraFilter] = useState("");
  const [situacaoFilter, setSituacaoFilter] = useState<string>("");
  const [empreendimentoOptions, setEmpreendimentoOptions] = useState<string[]>([]);
  const [quadraOptions, setQuadraOptions] = useState<string[]>([]);

  useEffect(() => {
    setRole(getUserRole());
  }, []);

  // Busca opções de empreendimentos e quadras
  useEffect(() => {
    if (!isApiConfigured()) return;

    const fetchOptions = async (url: string, onSuccess: (data: string[]) => void, label: string) => {
      if (!url) return;
      try {
        const token = getAuthToken();
        const res = await apiFetch(url, {
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (res.ok) {
          const data = await res.json();
          onSuccess(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error(`Erro ao buscar ${label}:`, err);
      }
    };

    void fetchOptions(getImoveisEmpreendimentosUrl(), setEmpreendimentoOptions, "empreendimentos");
    void fetchOptions(getImoveisQuadrasUrl(), setQuadraOptions, "quadras");
  }, []);

  const isAdmin = role === "ADMIN";
  const canSeeIndisponivel = role === "ADMIN" || role === "ADMINISTRATIVO";

  const buildUrl = useCallback(
    (page: number, size: number, q: string) => 
      getImoveisListUrl(
        page,
        size,
        q,
        quadraFilter,
        situacaoFilter ? Number(situacaoFilter) : null,
        empreendimentoFilter,
      ),
    [quadraFilter, situacaoFilter, empreendimentoFilter]
  );

  const getActionItems = (row: ImovelApiResponse): MenuItem[] => {
    const isVendido = row.situacao === IMOVEL_SITUACAO_VENDIDO;
    const contratoId = row.contratoId ?? null;

    const items: MenuItem[] = [
      dashboardActionMenuItem({
        label: "Visualizar Detalhes",
        icon: <Eye size={16} className="text-emerald-400 transition-transform group-hover:scale-110" />,
        onClick: () => setViewModalVisible(true),
      }),
    ];

    if (isVendido) {
      items.push(
        dashboardActionMenuItem({
          label: "Ver Contrato",
          icon: (
            <FileText
              size={16}
              className={cn(
                "transition-transform",
                contratoId != null ? "text-blue-400 group-hover:scale-110" : "text-white/20",
              )}
            />
          ),
          disabled: contratoId == null,
          onClick: () => {
            if (contratoId != null) {
              setViewContratoId(contratoId);
            } else {
              toast.error("Nenhum contrato assinado vinculado a este imóvel.");
            }
          },
        }),
      );
    }

    items.push(
      dashboardActionMenuItem({
        label: "Editar Imóvel",
        icon: (
          <i
            className={cn(
              "pi pi-pencil transition-transform",
              isAdmin ? "text-blue-400 group-hover:scale-110" : "text-white/20",
            )}
          />
        ),
        disabled: !isAdmin,
        onClick: () => router.push(`/dashboard/imoveis/edit?id=${row.id}`),
      }),
    );

    items.push(dashboardActionMenuSeparator());
    items.push(
      dashboardActionMenuItem({
        label: "Excluir Registro",
        icon: <i className="pi pi-trash text-rose-400" />,
        disabled: true,
        onClick: () => {},
      }),
    );

    return items;
  };

  const {
    searchInput,
    setSearchInput,
    params,
    setPage,
    pageSize,
    loading,
    pageData,
    fetchError,
  } = usePaginatedSpringList<ImovelApiResponse>({
    buildUrl,
    pageSize: 10,
    fallbackErrorMessage: "Não foi possível carregar os imóveis.",
    onFetchError: (m) => toast.error(m),
  });

  const rows = pageData?.content ?? [];
  const totalRecords = pageData?.totalElements ?? 0;

  const onPageChange = (event: any) => {
    setPage(event.page);
  };

  const empreendimentoBodyTemplate = (rowData: ImovelApiResponse) => {
    return (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
          <Building2 size={14} />
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-white">{rowData.empreendimento}</span>
          <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Imóvel #{rowData.id}</span>
        </div>
      </div>
    );
  };

  const quadraLoteBodyTemplate = (rowData: ImovelApiResponse) => {
    return (
      <div className="flex items-center gap-2 text-white/80">
        <Box size={14} className="text-blue-400/60" />
        <span>Q: <span className="text-white font-bold">{rowData.quadra || "—"}</span></span>
        <span className="text-white/20">|</span>
        <span>L: <span className="text-white font-bold">{rowData.lote || "—"}</span></span>
      </div>
    );
  };

  const situacaoBodyTemplate = (rowData: ImovelApiResponse) => {
    const situacao = rowData.situacao || 1;
    const label = rowData.descricaoSituacao || "Disponível";
    
    const configs: Record<number, { bg: string, text: string, icon: any }> = {
      1: { bg: "bg-emerald-500/10", text: "text-emerald-400", icon: CheckCircle2 },
      2: { bg: "bg-rose-500/10", text: "text-rose-400", icon: Ban },
      3: { bg: "bg-blue-500/10", text: "text-blue-400", icon: Tag },
      4: { bg: "bg-amber-500/10", text: "text-amber-400", icon: Clock },
    };

    const config = configs[situacao] || configs[1];

    return (
      <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest", config.bg, config.text)}>
        <config.icon size={12} />
        {label}
      </div>
    );
  };

  const localBodyTemplate = (rowData: ImovelApiResponse) => {
    return (
      <div className="flex items-center gap-2 text-white/60">
        <MapPin size={14} className="text-blue-400/60" />
        <span>{rowData.cidade}{rowData.uf ? ` - ${rowData.uf}` : ""}</span>
      </div>
    );
  };

  const actionBodyTemplate = (rowData: ImovelApiResponse) => {
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

  // Resetar página ao mudar filtros
  useEffect(() => {
    setPage(0);
  }, [empreendimentoFilter, quadraFilter, situacaoFilter, setPage]);

  const header = (
    <div className="flex flex-col gap-6 py-2">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-96">
          <Search className={DASHBOARD_SEARCH_ICON_HEADER_CLASS} size={18} />
          <InputText 
            value={searchInput} 
            onChange={(e) => setSearchInput(e.target.value)} 
            placeholder="Buscar por empreendimento, quadra ou lote..." 
            className={DASHBOARD_SEARCH_INPUT_HEADER_CLASS}
          />
        </div>
        <div className="text-sm text-white/40">
          <span className="text-white font-bold">{totalRecords}</span> imóveis encontrados
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Filtrar:</span>
          <select
            value={empreendimentoFilter}
            onChange={(e) => setEmpreendimentoFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white/70 focus:outline-none focus:border-blue-500/50 transition-all min-w-[220px]"
          >
            <option value="" className="bg-[#020817]">Todos os empreendimentos</option>
            {empreendimentoOptions.map((emp) => (
              <option key={emp} value={emp} className="bg-[#020817]">{emp}</option>
            ))}
          </select>
          <select
            value={quadraFilter}
            onChange={(e) => setQuadraFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white/70 focus:outline-none focus:border-blue-500/50 transition-all min-w-[160px]"
          >
            <option value="" className="bg-[#020817]">Todas as quadras</option>
            {quadraOptions.map(q => (
              <option key={q} value={q} className="bg-[#020817]">{q}</option>
            ))}
          </select>
        </div>

        <select
          value={situacaoFilter}
          onChange={(e) => setSituacaoFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white/70 focus:outline-none focus:border-blue-500/50 transition-all min-w-[180px]"
        >
          <option value="" className="bg-[#020817]">Todas as situações</option>
          <option value="1" className="bg-[#020817]">1 — Disponível</option>
          {canSeeIndisponivel && <option value="2" className="bg-[#020817]">2 — Indisponível</option>}
          <option value="3" className="bg-[#020817]">3 — Vendido</option>
          <option value="4" className="bg-[#020817]">4 — Em Negociação</option>
        </select>
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
        emptyMessage="Nenhum imóvel encontrado."
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
        <Column field="empreendimento" header="Empreendimento" body={empreendimentoBodyTemplate} />
        <Column header="Quadra / Lote" body={quadraLoteBodyTemplate} />
        <Column field="cidade" header="Localização" body={localBodyTemplate} />
        <Column field="situacao" header="Situação" body={situacaoBodyTemplate} />
        <Column header="Ações" body={actionBodyTemplate} align="right" />
      </DataTable>

      <Menu 
        model={selectedRow ? getActionItems(selectedRow) : []} 
        popup 
        ref={menuRef} 
        id="popup_menu_imoveis"
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
      <ImovelViewModal 
        imovelId={viewModalVisible ? selectedRow?.id ?? null : null} 
        onClose={() => setViewModalVisible(false)} 
      />
      <ContratoViewModal
        contratoId={viewContratoId}
        onClose={() => setViewContratoId(null)}
      />
    </div>
  );
}
