"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { 
  Search, 
  Pencil, 
  Trash2, 
  Users,
  Mail,
  ShieldCheck,
  CircleDot,
  Shield
} from "lucide-react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import { toast } from "sonner";
import { usePaginatedSpringList } from "@/hooks/use-paginated-spring-list";
import { apiFetch } from "@/lib/api-fetch";
import { getUsuariosListUrl, getUsuarioSituacaoUrl, isApiConfigured } from "@/lib/api-config";
import { cn } from "@/lib/utils";
import {
  DASHBOARD_SEARCH_ICON_HEADER_CLASS,
  DASHBOARD_SEARCH_INPUT_HEADER_CLASS,
} from "@/lib/dashboard-datatable";
import type { UsuarioApiResponse } from "@/lib/validations/usuario";

export function UsuariosList() {
  const [perfil, setPerfil] = useState<string | null>(null);
  const [situacao, setSituacao] = useState<number | null>(null);

  const buildUrl = useCallback(
    (page: number, size: number, q: string) => getUsuariosListUrl(page, size, q, perfil || undefined, situacao),
    [perfil, situacao]
  );

  const {
    searchInput,
    setSearchInput,
    params,
    setPage,
    pageSize,
    loading,
    pageData,
    reload
  } = usePaginatedSpringList<UsuarioApiResponse>({
    buildUrl,
    pageSize: 10,
    fallbackErrorMessage: "Não foi possível carregar os usuários.",
    onFetchError: (m) => toast.error(m),
  });

  const [processingId, setProcessingId] = useState<number | null>(null);

  const toggleStatus = async (rowData: UsuarioApiResponse) => {
    const isCurrentlyBlocked = String(rowData.situacao) === "3" || String(rowData.situacao) === "BLOQUEADO";
    const nextStatus = isCurrentlyBlocked ? "ATIVO" : "BLOQUEADO";
    
    setProcessingId(rowData.id);
    
    try {
      const url = getUsuarioSituacaoUrl(rowData.id);
      
      // Conforme SituacaoUsuario.java: 1=ATIVO, 2=INATIVO, 3=BLOQUEADO
      const nextValue = nextStatus === "BLOQUEADO" ? 3 : 1;

      const res = await apiFetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situacao: nextValue }),
      });

      if (!res.ok) {
        let errorMsg = "Erro ao alterar bloqueio.";
        try {
          const errorData = await res.json();
          errorMsg = errorData.message || errorMsg;
        } catch { /* ignore */ }
        toast.error(errorMsg);
        return;
      }

      toast.success(`Usuário ${isCurrentlyBlocked ? 'desbloqueado' : 'bloqueado'} com sucesso!`);
      reload();
    } catch (e: any) {
      toast.error(`Erro de rede: ${e.message || "Conexão interrompida"}`);
    } finally {
      setProcessingId(null);
    }
  };

  const toggleActive = async (rowData: UsuarioApiResponse) => {
    const isCurrentlyActive = String(rowData.situacao) === "1" || String(rowData.situacao) === "ATIVO";
    const nextStatus = isCurrentlyActive ? "INATIVO" : "ATIVO";
    
    setProcessingId(rowData.id);
    
    try {
      const url = getUsuarioSituacaoUrl(rowData.id);
      
      // 1=ATIVO, 2=INATIVO
      const nextValue = nextStatus === "INATIVO" ? 2 : 1;

      const res = await apiFetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situacao: nextValue }),
      });

      if (!res.ok) {
        let errorMsg = "Erro ao alterar ativação.";
        try {
          const errorData = await res.json();
          errorMsg = errorData.message || errorMsg;
        } catch { /* ignore */ }
        toast.error(errorMsg);
        return;
      }

      toast.success(`Usuário ${isCurrentlyActive ? 'desativado' : 'ativado'} com sucesso!`);
      reload();
    } catch (e: any) {
      console.error("Erro no toggleActive:", e);
      toast.error(`Erro de rede: ${e.message || "Conexão interrompida"}`);
    } finally {
      setProcessingId(null);
    }
  };

  const rows = pageData?.content ?? [];
  const totalRecords = pageData?.totalElements ?? 0;

  const nameBodyTemplate = (rowData: any) => {
    const rawValue = rowData.perfil || rowData.role || rowData.tipoUsuario || rowData.permissao;
    const profileValue = typeof rawValue === 'object' && rawValue !== null 
      ? (rawValue.nome || rawValue.descricao || rawValue.nomePerfil)
      : rawValue;
    const rawPerfil = String(profileValue || "").toUpperCase();
    const isLocalAdmin = rawPerfil === "ADMIN" || rawPerfil === "1";
    
    return (
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-10 h-10 rounded-2xl flex items-center justify-center transition-colors",
          isLocalAdmin ? "bg-amber-500/10 text-amber-400" : "bg-blue-500/10 text-blue-400"
        )}>
          {isLocalAdmin ? <Shield size={18} /> : <Users size={18} />}
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-white leading-tight">{rowData.nome}</span>
          <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold mt-1">ID: #{rowData.id}</span>
        </div>
      </div>
    );
  };

  const emailBodyTemplate = (rowData: UsuarioApiResponse) => (
    <div className="flex items-center gap-2 text-white/60">
      <Mail size={14} className="text-blue-400/60" />
      <span>{rowData.email}</span>
    </div>
  );

  const roleBodyTemplate = (rowData: any) => {
    // Tentar encontrar o perfil em diferentes chaves possíveis
    const rawValue = rowData.perfil || rowData.role || rowData.tipoUsuario || rowData.permissao;
    
    // Se for um objeto (comum em APIs Spring que retornam a entidade completa), tenta pegar nome ou descricao
    const profileValue = typeof rawValue === 'object' && rawValue !== null 
      ? (rawValue.nome || rawValue.descricao || rawValue.nomePerfil || JSON.stringify(rawValue))
      : rawValue;

    const rawPerfil = String(profileValue || "").toUpperCase();
    const isAdministrativo = rawPerfil === "ADMINISTRATIVO";
    const isLocalAdmin = rawPerfil === "ADMIN" || rawPerfil === "1";
    const isImobiliaria = rawPerfil.includes("IMOBILIARIA") || rawPerfil === "3";
    const isCorretor = rawPerfil.includes("CORRETOR") || rawPerfil === "2";
    const isAtendimento = rawPerfil.includes("ATENDIMENTO");

    const label = isLocalAdmin
      ? "ADMIN"
      : isAdministrativo
        ? "ADMINISTRATIVO"
        : isImobiliaria
          ? "IMOBILIARIA"
          : isAtendimento
            ? "ATENDIMENTO"
            : isCorretor
              ? "CORRETOR"
              : rawPerfil || "USUÁRIO";
    const severity = isLocalAdmin ? "warning" : "info";
    
    return (
      <Tag 
        value={label} 
        severity={severity}
        className="px-3 py-1 rounded-full text-[10px] font-bold tracking-widest border-none bg-white/5 text-white/80"
        pt={{
          root: { className: cn(
            "border",
            isLocalAdmin
              ? "border-amber-500/20 text-amber-400 bg-amber-500/5"
              : isAdministrativo
                ? "border-violet-500/20 text-violet-400 bg-violet-500/5"
              : isAtendimento
                ? "border-emerald-500/20 text-emerald-400 bg-emerald-500/5"
                : "border-blue-500/20 text-blue-400 bg-blue-500/5"
          )}
        }}
      />
    );
  };

  const statusBodyTemplate = (rowData: any) => {
    const rawSituacao = String(rowData.situacao || "").toUpperCase();
    const active = rawSituacao === "1" || rawSituacao === "ATIVO";
    const blocked = rawSituacao === "3" || rawSituacao === "BLOQUEADO";
    const inactive = rawSituacao === "2" || rawSituacao === "INATIVO";
    
    const label = active ? "ATIVO" : (blocked ? "BLOQUEADO" : "INATIVO");
    const colorClass = active ? "bg-emerald-500 shadow-emerald-500/50" : (blocked ? "bg-amber-500 shadow-amber-500/50" : "bg-rose-500 shadow-rose-500/50");
    const textClass = active ? "text-emerald-400/80" : (blocked ? "text-amber-400/80" : "text-rose-400/80");

    return (
      <div className="flex items-center gap-2">
        <div className={cn("w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]", colorClass)} />
        <span className={cn("text-[10px] font-bold uppercase tracking-wider", textClass)}>
          {label}
        </span>
      </div>
    );
  };

  const actionBodyTemplate = (rowData: any) => {
    const isBlocked = String(rowData.situacao) === "3" || String(rowData.situacao) === "BLOQUEADO";
    const isActive = String(rowData.situacao) === "1" || String(rowData.situacao) === "ATIVO";
    const isProcessing = processingId === rowData.id;

    return (
      <div className="flex justify-end gap-2">
        <Link href={`/dashboard/usuarios/edit?id=${rowData.id}`}>
          <Button 
            icon="pi pi-pencil" 
            className="p-button-rounded p-button-text p-button-sm text-blue-400 hover:bg-blue-400/10 transition-all active:scale-90" 
            tooltip="Editar Usuário" 
            tooltipOptions={{ position: 'top' }}
          />
        </Link>
        <Button 
          icon={isBlocked ? "pi pi-lock-open" : "pi pi-lock"} 
          className={cn(
            "p-button-rounded p-button-text p-button-sm transition-all active:scale-90",
            isBlocked ? "text-emerald-400 hover:bg-emerald-400/10" : "text-amber-400 hover:bg-amber-400/10"
          )} 
          onClick={() => toggleStatus(rowData)}
          disabled={isProcessing}
          tooltip={isBlocked ? "Desbloquear Usuário" : "Bloquear Usuário"}
          tooltipOptions={{ position: 'top' }}
        />
        <Button 
          icon="pi pi-power-off" 
          className={cn(
            "p-button-rounded p-button-text p-button-sm transition-all active:scale-90",
            isActive ? "text-rose-400 hover:bg-rose-400/10" : "text-emerald-400 hover:bg-emerald-400/10"
          )} 
          onClick={() => toggleActive(rowData)}
          disabled={isProcessing}
          tooltip={isActive ? "Desativar Usuário" : "Ativar Usuário"}
          tooltipOptions={{ position: 'top' }}
        />
      </div>
    );
  };

  const perfis = [
    { label: "Todos os Perfis", value: null },
    { label: "Admin", value: "ADMIN" },
    { label: "Administrativo", value: "ADMINISTRATIVO" },
    { label: "Corretor", value: "CORRETOR" },
    { label: "Imobiliária", value: "IMOBILIARIA" },
    { label: "Atendimento", value: "ATENDIMENTO" },
  ];

  const statusOptions = [
    { label: "Todos os Status", value: null },
    { label: "Ativo", value: 1 },
    { label: "Inativo", value: 2 },
    { label: "Bloqueado", value: 3 },
  ];

  const header = (
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 py-2">
      <div className="flex flex-col md:flex-row items-center gap-3 w-full lg:w-auto">
        <div className="relative w-full md:w-80">
          <Search className={DASHBOARD_SEARCH_ICON_HEADER_CLASS} size={18} />
          <InputText 
            value={searchInput} 
            onChange={(e) => setSearchInput(e.target.value)} 
            placeholder="Buscar usuário..." 
            className={DASHBOARD_SEARCH_INPUT_HEADER_CLASS}
          />
        </div>

        <Dropdown
          value={perfil}
          options={perfis}
          optionValue="value"
          onChange={(e) => {
            setPerfil(e.value);
            setPage(0);
          }}
          placeholder="Perfil"
          className="w-full md:w-48 bg-white/5 border-white/10 rounded-full text-sm"
          pt={{
            root: { className: 'h-[42px] items-center px-2' },
            input: { className: 'text-white/70 text-sm' },
            trigger: { className: 'text-white/30' },
            panel: { className: 'bg-[#1a1a1a] border-white/10 rounded-2xl shadow-2xl p-2' },
            item: ({ context }: any) => ({
              className: cn(
                'rounded-xl transition-all mb-1 last:mb-0 text-sm py-2.5 px-4',
                context.selected ? 'bg-blue-600 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
              )
            })
          }}
        />

        <Dropdown
          value={situacao}
          options={statusOptions}
          optionValue="value"
          onChange={(e) => {
            setSituacao(e.value);
            setPage(0);
          }}
          placeholder="Status"
          className="w-full md:w-48 bg-white/5 border-white/10 rounded-full text-sm"
          pt={{
            root: { className: 'h-[42px] items-center px-2' },
            input: { className: 'text-white/70 text-sm' },
            trigger: { className: 'text-white/30' },
            panel: { className: 'bg-[#1a1a1a] border-white/10 rounded-2xl shadow-2xl p-2' },
            item: ({ context }: any) => ({
              className: cn(
                'rounded-xl transition-all mb-1 last:mb-0 text-sm py-2.5 px-4',
                context.selected ? 'bg-blue-600 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
              )
            })
          }}
        />
      </div>
      
      <div className="text-sm text-white/40 px-2">
        <span className="text-white font-bold">{totalRecords}</span> usuários
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
        onPage={(e) => setPage(e.page ?? 0)}
        header={header}
        className="p-datatable-custom"
        emptyMessage="Nenhum usuário encontrado."
        pt={{
          header: { className: 'bg-transparent border-white/5 p-6' },
          table: { className: 'bg-transparent' },
          thead: { className: 'bg-white/5' },
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
        <Column field="nome" header="Usuário" body={nameBodyTemplate} className="min-w-[250px]" />
        <Column field="email" header="E-mail" body={emailBodyTemplate} />
        <Column field="perfil" header="Perfil" body={roleBodyTemplate} />
        <Column field="situacao" header="Status" body={statusBodyTemplate} />
        <Column body={actionBodyTemplate} className="w-[120px]" />
      </DataTable>
    </div>
  );
}
