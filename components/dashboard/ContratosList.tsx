"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Pencil,
  Eye,
  Trash2,
  FileText,
  Check,
  X,
  History,
  Send,
  MoreHorizontal,
  Calendar,
  User,
  Building2,
  Download
} from "lucide-react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Button } from "primereact/button";
import { Menu } from "primereact/menu";
import { DashboardDialog } from "@/components/dashboard/DashboardDialog";
import { toast } from "sonner";
import { usePaginatedSpringList } from "@/hooks/use-paginated-spring-list";
import {
  getContratoCancelarUrl,
  getContratosHonorariosListUrl,
  getContratanteByIdUrl,
  getContratoEnviarPropostaUrl,
  getContratoEnviarClicksignUrl,
  getContratoAprovarUrl,
  getContratoReprovarUrl,
  getContratoHonorariosExportExcelUrl,
  getDominiosSelectItemsUrl,
  getImoveisEmpreendimentosUrl,
  isApiConfigured
} from "@/lib/api-config";
import { cn } from "@/lib/utils";
import {
  DASHBOARD_SEARCH_ICON_HEADER_CLASS,
  DASHBOARD_SEARCH_INPUT_HEADER_CLASS,
} from "@/lib/dashboard-datatable";
import { getUserRole } from "@/lib/auth-storage";
import { apiFetch } from "@/lib/api-fetch";
import { ContratoTimeline } from "@/components/dashboard/ContratoTimeline";
import { downloadContratoPdf, downloadContratoPdfAssinado } from "@/lib/download-contrato-pdf";
import { openContratoHtmlInNewTab } from "@/lib/open-contrato-html";
import { ContratoViewModal } from "@/components/dashboard/ContratoViewModal";

export type ContratoListItem = {
  id: number;
  numeroContrato: string | null;
  dataAssinatura: string;
  status: number | null;
  statusLabel: string | null;
  contratante: { id: number; label: string } | null;
  imovel: { id: number; label: string } | null;
  linkPdfAssinado: string | null;
  origemAssinatura: string | null;
};

type DominioSelectItem = {
  valor: number;
  descricao: string;
  chaveFiltro: string;
};

export function ContratosList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idFilter = searchParams.get("id");
  const contratanteIdParam = searchParams.get("contratanteId");
  const contratanteIdFilter =
    contratanteIdParam && /^\d+$/.test(contratanteIdParam) ? Number(contratanteIdParam) : null;
  const menuRef = useRef<Menu>(null);
  const [selectedRow, setSelectedRow] = useState<ContratoListItem | null>(null);

  const [timelineId, setTimelineId] = useState<number | null>(null);
  const [viewContratoId, setViewContratoId] = useState<number | null>(null);
  const [confirmEnviarId, setConfirmEnviarId] = useState<number | null>(null);
  const [confirmCancelarId, setConfirmCancelarId] = useState<number | null>(null);
  const [cancelMotivo, setCancelMotivo] = useState("");
  const [confirmClicksignId, setConfirmClicksignId] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [empreendimentoFilter, setEmpreendimentoFilter] = useState("");
  const [empreendimentoOptions, setEmpreendimentoOptions] = useState<string[]>([]);
  const [statusOptions, setStatusOptions] = useState<DominioSelectItem[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [contratanteFiltroNome, setContratanteFiltroNome] = useState<string | null>(null);

  useEffect(() => {
    setRole(getUserRole());
  }, []);

  useEffect(() => {
    if (!isApiConfigured() || contratanteIdFilter == null) {
      setContratanteFiltroNome(null);
      return;
    }
    let cancelled = false;
    const url = getContratanteByIdUrl(contratanteIdFilter);
    if (!url) return;
    void (async () => {
      try {
        const res = await apiFetch(url, { headers: { Accept: "application/json" }, skipLoading: true });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { nome?: string };
        if (!cancelled && typeof data.nome === "string") {
          setContratanteFiltroNome(data.nome);
        }
      } catch {
        if (!cancelled) setContratanteFiltroNome(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contratanteIdFilter]);

  useEffect(() => {
    if (!isApiConfigured()) return;
    const url = getImoveisEmpreendimentosUrl();
    if (!url) return;

    void (async () => {
      try {
        const res = await apiFetch(url, { headers: { Accept: "application/json" } });
        if (res.ok) {
          const data = await res.json();
          setEmpreendimentoOptions(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Erro ao buscar empreendimentos:", err);
      }
    })();
  }, []);

  useEffect(() => {
    if (!isApiConfigured()) return;
    let cancelled = false;
    const url = getDominiosSelectItemsUrl("ST_CTR");
    if (!url) return;
    void (async () => {
      try {
        const res = await apiFetch(url, { skipLoading: true });
        if (!res.ok) return;
        const data = (await res.json()) as unknown;
        if (cancelled || !Array.isArray(data)) return;
        const parsed: DominioSelectItem[] = data
          .map((row) => {
            if (!row || typeof row !== "object") return null;
            const o = row as Record<string, unknown>;
            const chaveFiltro = typeof o.chaveFiltro === "string" ? o.chaveFiltro : "";
            const descricao = typeof o.descricao === "string" ? o.descricao : "";
            if (!chaveFiltro) return null;
            return {
              valor: typeof o.valor === "number" ? o.valor : Number(o.valor),
              descricao,
              chaveFiltro,
            };
          })
          .filter((x): x is DominioSelectItem => x != null);
        setStatusOptions(parsed);
      } catch {
        /* mantém select só com "Todos" */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isAdmin = role === "ADMIN";
  const isReadOnlyContratos = role === "ADMINISTRATIVO";
  const idStr = idFilter?.toLowerCase();

  // Redirecionar para tela de novo contrato se o ID for "novo" ou "novo.txt"
  useEffect(() => {
    if (idStr === "novo" || idStr === "novo.txt") {
      router.replace("/dashboard/contratos/novo");
    }
  }, [idStr, router]);

  const buildUrl = useCallback(
    (page: number, size: number, q: string) => {
      // Garantir que idFilter seja numérico antes de enviar para a API
      const safeIdFilter = idFilter && /^\d+$/.test(idFilter) ? idFilter : null;
      return getContratosHonorariosListUrl(
        page,
        size,
        q,
        statusFilter,
        safeIdFilter,
        empreendimentoFilter,
        contratanteIdFilter
      );
    },
    [statusFilter, empreendimentoFilter, idFilter, contratanteIdFilter]
  );

  const {
    searchInput,
    setSearchInput,
    params,
    setPage,
    pageSize,
    loading,
    pageData,
    reload,
    fetchError,
  } = usePaginatedSpringList<ContratoListItem>({
    buildUrl,
    pageSize: 10,
    fallbackErrorMessage: "Não foi possível carregar os contratos.",
    onFetchError: (m) => toast.error(m),
  });

  const rows = pageData?.content ?? [];
  const totalRecords = pageData?.totalElements ?? 0;

  const onPageChange = (event: any) => {
    setPage(event.page);
  };

  useEffect(() => {
    setPage(0);
  }, [statusFilter, empreendimentoFilter, contratanteIdFilter, setPage]);

  // Handlers de Aprovação/Reprovação/Cancelamento
  const handleAprovar = async (id: number) => {
    try {
      const res = await apiFetch(getContratoAprovarUrl(id), { method: "POST" });
      if (!res.ok) {
        toast.error("Não foi possível aprovar o contrato.");
        return;
      }
      toast.success("Contrato aprovado com sucesso!");
      reload();
    } catch {
      toast.error("Erro ao aprovar contrato.");
    }
  };

  const handleReprovar = async (id: number) => {
    const motivo = window.prompt("Informe o motivo da reprovação:");
    if (motivo === null) return;
    try {
      const res = await apiFetch(getContratoReprovarUrl(id), {
        method: "POST",
        body: JSON.stringify(motivo)
      });
      if (!res.ok) {
        toast.error("Não foi possível reprovar o contrato.");
        return;
      }
      toast.success("Contrato reprovado.");
      reload();
    } catch {
      toast.error("Erro ao reprovar contrato.");
    }
  };

  const processEnviarProposta = async () => {
    if (!confirmEnviarId || isProcessing) return;
    setIsProcessing(true);
    try {
      const res = await apiFetch(getContratoEnviarPropostaUrl(confirmEnviarId), { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.message || "Não foi possível enviar a proposta.");
        return;
      }
      toast.success("Proposta enviada com sucesso!");
      setConfirmEnviarId(null);
      reload();
    } catch {
      toast.error("Erro ao enviar proposta.");
    } finally {
      setIsProcessing(false);
    }
  };

  const processCancelar = async () => {
    if (!confirmCancelarId || isProcessing) return;
    const motivo = cancelMotivo.trim();
    if (!motivo) {
      toast.error("Informe o motivo do cancelamento.");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await apiFetch(getContratoCancelarUrl(confirmCancelarId), {
        method: "POST",
        body: JSON.stringify(motivo)
      });
      if (!res.ok) {
        toast.error("Não foi possível cancelar o contrato.");
        return;
      }
      toast.success("Contrato cancelado com sucesso!");
      setConfirmCancelarId(null);
      setCancelMotivo("");
      reload();
    } catch {
      toast.error("Erro ao cancelar contrato.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEnviarClicksign = (id: number) => {
    setConfirmClicksignId(id);
  };

  const processEnviarClicksign = async () => {
    if (!confirmClicksignId || isProcessing) return;

    setIsProcessing(true);
    try {
      const res = await apiFetch(getContratoEnviarClicksignUrl(confirmClicksignId), { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || "Não foi possível enviar para Clicksign.");
        return;
      }
      toast.success("Contrato enviado para Clicksign com sucesso!");
      setConfirmClicksignId(null);
      reload();
    } catch {
      toast.error("Erro ao conectar com a API.");
    } finally {
      setIsProcessing(false);
    }
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const safeIdFilter = idFilter && /^\d+$/.test(idFilter) ? idFilter : null;
      const url = getContratoHonorariosExportExcelUrl(
        searchInput,
        statusFilter,
        safeIdFilter,
        empreendimentoFilter,
        contratanteIdFilter
      );
      
      const res = await apiFetch(url);
      if (!res.ok) {
        toast.error("Falha ao gerar planilha.");
        return;
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', 'contratos.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      
      toast.success("Planilha baixada com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao processar download.");
    } finally {
      setIsExporting(false);
    }
  };

  // Gerar Menu Dinâmico
  const getActionItems = (r: ContratoListItem) => {
    const statusStr = String(r.status);
    const isProposta = statusStr === "1";
    const isEnviada = statusStr === "5";
    const isAprovado = statusStr === "3";
    const isReprovado = statusStr === "4";
    const isRevisado = statusStr === "2";
    const isCancelado = statusStr === "6";
    const isEmAssinatura = statusStr === "7";
    const isAssinado = statusStr === "8";
    const isLegado = r.origemAssinatura === "LEGADO_MANUAL";

    const items: any[] = [];

    // Comum: Visualizar Resumo (Modal)
    items.push({
      label: 'Visualizar Resumo',
      icon: 'pi pi-eye',
      template: (item: any) => (
        <button onClick={() => setViewContratoId(r.id)} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors group">
          <Eye size={16} className="text-blue-400 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-widest text-white/70 text-left whitespace-nowrap">{item.label}</span>
        </button>
      )
    });

    // Legado: baixar PDF anexado (upload). Demais: gerar PDF a partir do template.
    if (isLegado) {
      if (r.linkPdfAssinado) {
        items.push({
          label: "Baixar PDF",
          icon: "pi pi-file-pdf",
          template: (item: { label: string }) => (
            <button
              type="button"
              onClick={() => void downloadContratoPdfAssinado(r.id)}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-emerald-500/10 transition-colors group"
            >
              <Download size={16} className="text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400/80 text-left whitespace-nowrap">
                {item.label}
              </span>
            </button>
          ),
        });
      }
    } else {
      items.push({
        label: "Gerar PDF",
        icon: "pi pi-file-pdf",
        template: (item: { label: string }) => (
          <button
            type="button"
            onClick={() => void downloadContratoPdf(r.id)}
            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors group"
          >
            <Download size={16} className="text-rose-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-widest text-white/70 text-left whitespace-nowrap">
              {item.label}
            </span>
          </button>
        ),
      });

      // PDF assinado via Clicksign
      if (isAssinado && r.linkPdfAssinado) {
        items.push({
          label: "PDF Assinado",
          icon: "pi pi-file-pdf",
          template: (item: { label: string }) => (
            <button
              type="button"
              onClick={() => void downloadContratoPdfAssinado(r.id)}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-emerald-500/10 transition-colors group"
            >
              <FileText size={16} className="text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400/80 text-left whitespace-nowrap">
                {item.label}
              </span>
            </button>
          ),
        });
      }
    }

    // Ações de Corretor (fluxo digital apenas)
    if (!isAdmin && !isReadOnlyContratos && !isLegado) {
      if (isProposta || isReprovado) {
        items.push({
          label: 'Editar',
          icon: 'pi pi-pencil',
          template: (item: any) => (
            <button onClick={() => router.push(`/dashboard/contratos/edit?id=${r.id}`)} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors group">
              <Pencil size={16} className="text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold uppercase tracking-widest text-white/70 text-left whitespace-nowrap">{item.label}</span>
            </button>
          )
        });
      }
      if (isProposta) {
        items.push({
          label: 'Enviar Proposta',
          icon: 'pi pi-send',
          template: (item: any) => (
            <button onClick={() => setConfirmEnviarId(r.id)} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors group">
              <Send size={16} className="text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold uppercase tracking-widest text-white/70 text-left whitespace-nowrap">{item.label}</span>
            </button>
          )
        });
      }
    }

    // Ações de ADMIN
    if (isAdmin) {
      if (!isCancelado) {
        items.push({
          label: 'Editar',
          icon: 'pi pi-pencil',
          template: (item: any) => (
            <button onClick={() => router.push(`/dashboard/contratos/edit?id=${r.id}`)} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors group">
              <Pencil size={16} className="text-blue-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold uppercase tracking-widest text-white/70 text-left whitespace-nowrap">{item.label}</span>
            </button>
          )
        });
      }

      if (!isLegado && (isProposta || isEnviada || isRevisado || isAprovado)) {
        if (isProposta) {
          items.push({
            label: 'Enviar Proposta',
            icon: 'pi pi-send',
            template: (item: any) => (
              <button onClick={() => setConfirmEnviarId(r.id)} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors group">
                <Send size={16} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold uppercase tracking-widest text-white/70 text-left whitespace-nowrap">{item.label}</span>
              </button>
            )
          });
        }

        if (!isAprovado) {
          items.push({
            label: 'Aprovar',
            icon: 'pi pi-check',
            template: (item: any) => (
              <button onClick={() => handleAprovar(r.id)} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors group">
                <Check size={16} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold uppercase tracking-widest text-white/70 text-left whitespace-nowrap">{item.label}</span>
              </button>
            )
          });
        }

        items.push({
          label: 'Reprovar',
          icon: 'pi pi-times',
          template: (item: any) => (
            <button onClick={() => handleReprovar(r.id)} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors group">
              <X size={16} className="text-rose-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold uppercase tracking-widest text-white/70 text-left whitespace-nowrap">{item.label}</span>
            </button>
          )
        });
      }
      
      if (isAprovado && !isLegado) {
        items.push({
          label: 'Enviar Assinatura',
          icon: 'pi pi-send',
          template: (item: any) => (
            <button onClick={() => handleEnviarClicksign(r.id)} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors group">
              <Send size={16} className="text-blue-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold uppercase tracking-widest text-white/70 text-left whitespace-nowrap">{item.label}</span>
            </button>
          )
        });
      }

      if (!isCancelado) {
        items.push({ separator: true }, {
          label: 'Cancelar Contrato',
          icon: 'pi pi-trash',
          template: (item: any) => (
            <button
              onClick={() => {
                setCancelMotivo("");
                setConfirmCancelarId(r.id);
              }}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-rose-500/10 transition-colors group"
            >
              <X size={16} className="text-rose-500 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold uppercase tracking-widest text-rose-500/80 text-left whitespace-nowrap">{item.label}</span>
            </button>
          )
        });
      }
    }

    // Histórico
    items.push({ separator: true }, {
      label: 'Histórico',
      icon: 'pi pi-history',
      template: (item: any) => (
        <button onClick={() => setTimelineId(r.id)} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors group">
          <History size={16} className="text-white/40 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-widest text-white/40 group-hover:text-white/70 transition-colors text-left whitespace-nowrap">{item.label}</span>
        </button>
      )
    });

    return items;
  };

  // Templates de Coluna
  const contratoBodyTemplate = (rowData: ContratoListItem) => {
    return (
      <div className="flex flex-col">
        <span className="font-bold text-white tabular-nums">{rowData.numeroContrato || `ID #${rowData.id}`}</span>
        <div className="flex items-center gap-2 mt-1 text-[10px] text-white/40 font-bold uppercase tracking-widest">
          <Calendar size={10} />
          {rowData.dataAssinatura ? new Date(rowData.dataAssinatura).toLocaleDateString('pt-BR') : '—'}
        </div>
      </div>
    );
  };

  const clienteBodyTemplate = (rowData: ContratoListItem) => {
    return (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
          <User size={14} />
        </div>
        <span className="text-sm text-white/80 font-medium">{rowData.contratante?.label || "—"}</span>
      </div>
    );
  };

  const imovelBodyTemplate = (rowData: ContratoListItem) => {
    return (
      <div className="flex items-center gap-3 max-w-[250px]">
        <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
          <Building2 size={14} />
        </div>
        <span className="text-xs text-white/60 truncate" title={rowData.imovel?.label || ""}>
          {rowData.imovel?.label || "—"}
        </span>
      </div>
    );
  };

  const statusBodyTemplate = (rowData: ContratoListItem) => {
    const s = String(rowData.status);
    const label = rowData.statusLabel || "—";
    const legado = rowData.origemAssinatura === "LEGADO_MANUAL";

    const configs: Record<string, { bg: string, text: string }> = {
      "1": { bg: "bg-blue-500/10", text: "text-blue-400" },      // PROPOSTA
      "2": { bg: "bg-amber-500/10", text: "text-amber-400" },    // REVISAO
      "3": { bg: "bg-indigo-500/10", text: "text-indigo-400" },   // APROVADO (Mudado de emerald para indigo)
      "4": { bg: "bg-rose-500/10", text: "text-rose-400" },      // REPROVADO
      "5": { bg: "bg-amber-500/10", text: "text-amber-400" },    // PROPOSTA ENVIADA
      "6": { bg: "bg-white/10", text: "text-white/30" },         // CANCELADO
      "7": { bg: "bg-blue-500/10", text: "text-blue-400" },      // EM ASSINATURA
      "8": { bg: "bg-emerald-500/20", text: "text-emerald-400 font-black shadow-[0_0_15px_rgba(16,185,129,0.3)]" }, // ASSINADO (Reforçado)
    };

    const config = configs[s] || { bg: "bg-white/5", text: "text-white/60" };

    return (
      <div className="flex flex-col items-start gap-1">
        <div className={cn("inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest", config.bg, config.text)}>
          {label}
        </div>
        {legado && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-400/90 border border-emerald-500/20">
            Legado
          </span>
        )}
      </div>
    );
  };

  const actionBodyTemplate = (rowData: ContratoListItem) => {
    return (
      <div className="flex justify-end">
        <Button
          icon="pi pi-ellipsis-h"
          className="p-button-rounded p-button-text text-amber-400 hover:bg-amber-400/10 transition-all active:scale-90"
          onClick={(e) => {
            setSelectedRow(rowData);
            menuRef.current?.toggle(e);
          }}
        />
      </div>
    );
  };

  const header = (
    <div className="flex flex-col gap-6 py-2">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-96">
          <Search className={DASHBOARD_SEARCH_ICON_HEADER_CLASS} size={18} />
          <InputText
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nº, cliente ou imóvel..."
            className={DASHBOARD_SEARCH_INPUT_HEADER_CLASS}
          />
        </div>
        <div className="text-sm text-white/40">
          <span className="text-white font-bold">{totalRecords}</span> contratos encontrados
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
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
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white/70 focus:outline-none focus:border-blue-500/50 transition-all min-w-[200px]"
        >
          <option value="" className="bg-[#020817]">
            Todos os status
          </option>
          {statusOptions.map((o) => (
            <option key={o.chaveFiltro} value={o.chaveFiltro} className="bg-[#020817]">
              {o.descricao}
            </option>
          ))}
        </select>
        
        {!isReadOnlyContratos && (
          <Button
            label="Exportar Excel"
            icon="pi pi-file-excel"
            className="ml-auto bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-xl transition-all"
            onClick={handleExportExcel}
            loading={isExporting}
            disabled={isExporting || totalRecords === 0}
          />
        )}
      </div>

      {idFilter && /^\d+$/.test(idFilter) && (
        <div className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-xl">
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Filtrando por ID: #{idFilter}</span>
          <button
            onClick={() => router.push('/dashboard/contratos')}
            className="text-[10px] font-bold text-white/40 hover:text-white transition-colors uppercase tracking-widest flex items-center gap-1"
          >
            <X size={12} /> Limpar
          </button>
        </div>
      )}

      {contratanteIdFilter != null && (
        <div className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-xl">
          <User size={14} className="text-blue-400 shrink-0" />
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
            Contratos do cliente
            {contratanteFiltroNome ? `: ${contratanteFiltroNome}` : ` #${contratanteIdFilter}`}
          </span>
          <button
            type="button"
            onClick={() => {
              const next = new URLSearchParams(searchParams.toString());
              next.delete("contratanteId");
              const qs = next.toString();
              router.push(qs ? `/dashboard/contratos?${qs}` : "/dashboard/contratos");
            }}
            className="text-[10px] font-bold text-white/40 hover:text-white transition-colors uppercase tracking-widest flex items-center gap-1"
          >
            <X size={12} /> Limpar
          </button>
        </div>
      )}
    </div>
  );

  if (!isApiConfigured()) {
    return (
      <div className="p-8 text-center bg-amber-500/10 border border-amber-500/20 rounded-2xl">
        <p className="text-amber-200">A API não está configurada.</p>
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
        emptyMessage="Nenhum contrato encontrado."
        responsiveLayout="stack"
        pt={{
          header: { className: 'bg-transparent border-white/5 p-6' },
          table: { className: 'bg-transparent' },
          thead: { className: 'bg-white/5' },
          bodyRow: { className: 'bg-transparent border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer' },
          column: {
            headerCell: { className: 'bg-transparent border-white/5 text-white/40 font-bold text-[10px] uppercase tracking-widest py-4 px-6' },
            bodyCell: { className: 'border-white/5 py-4 px-6' }
          },
          paginator: {
            root: { className: 'bg-transparent border-white/5 p-4 flex items-center justify-center' },
            pages: { className: 'flex items-center gap-1 mx-2' },
            pageButton: ({ context }: any) => ({
              className: cn(
                'rounded-lg border-none transition-all w-8 h-8 flex items-center justify-center text-xs font-bold shrink-0',
                context.active ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
              )
            }),
            firstPageButton: { className: 'text-white/30 hover:text-white transition-colors w-8 h-8 flex items-center justify-center shrink-0' },
            prevPageButton: { className: 'text-white/30 hover:text-white transition-colors w-8 h-8 flex items-center justify-center shrink-0' },
            nextPageButton: { className: 'text-white/30 hover:text-white transition-colors w-8 h-8 flex items-center justify-center shrink-0' },
            lastPageButton: { className: 'text-white/30 hover:text-white transition-colors w-8 h-8 flex items-center justify-center shrink-0' },
          }
        }}
      >
        <Column header="Contrato" body={contratoBodyTemplate} />
        <Column header="Cliente" body={clienteBodyTemplate} />
        <Column header="Imóvel" body={imovelBodyTemplate} />
        <Column header="Status" body={statusBodyTemplate} />
        <Column body={actionBodyTemplate} align="right" />
      </DataTable>

      <Menu
        model={selectedRow ? getActionItems(selectedRow) : []}
        popup
        ref={menuRef}
        pt={{
          root: { className: 'bg-[#071C33] border-white/10 shadow-2xl rounded-xl py-2 w-max' },
          action: { className: 'px-0 py-0 flex items-center no-underline' }
        }}
      />

      <ContratoViewModal 
        contratoId={viewContratoId} 
        onClose={() => setViewContratoId(null)} 
      />

      {/* Modal Histórico */}
      <DashboardDialog
        header="Histórico de Alterações"
        visible={!!timelineId}
        onHide={() => setTimelineId(null)}
        className="w-full max-w-2xl mx-4"
        contentClassName="bg-[#020817] p-8"
        headerClassName="bg-[#020817] border-b border-white/5 p-6 text-white"
        pt={{
          root: { className: 'rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl' },
          mask: { className: 'backdrop-blur-sm bg-black/40' }
        }}
      >
        {timelineId && <ContratoTimeline contratoId={timelineId} />}
      </DashboardDialog>

      {/* Modal Enviar Proposta */}
      <DashboardDialog
        header="Enviar Proposta"
        visible={!!confirmEnviarId}
        onHide={() => !isProcessing && setConfirmEnviarId(null)}
        className="w-full max-w-md mx-4"
        footer={(
          <div className="flex justify-end gap-3 p-4">
            <Button label="Cancelar" onClick={() => setConfirmEnviarId(null)} className="p-button-text text-white/40" disabled={isProcessing} />
            <Button label={isProcessing ? "Enviando..." : "Sim, Enviar"} onClick={processEnviarProposta} className="bg-emerald-600 hover:bg-emerald-700 border-none px-6" disabled={isProcessing} />
          </div>
        )}
        contentClassName="bg-[#020817] p-6 text-white/60 text-sm leading-relaxed"
        headerClassName="bg-[#020817] border-b border-white/5 p-6 text-white"
        pt={{
          root: { className: 'rounded-[2rem] overflow-hidden border border-white/10' },
          mask: { className: 'backdrop-blur-sm bg-black/40' }
        }}
      >
        <div className="flex flex-col gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 self-center mb-2">
            <Send size={24} />
          </div>
          <p className="text-center">Deseja enviar esta proposta para revisão da administração?</p>
          <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl text-[11px] uppercase tracking-wider font-bold text-amber-500/80">
            Atenção: Você não poderá editar os dados enquanto a proposta estiver em análise.
          </div>
        </div>
      </DashboardDialog>

      {/* Modal Cancelar */}
      <DashboardDialog
        header="Cancelar Contrato"
        visible={!!confirmCancelarId}
        onHide={() => {
          if (isProcessing) return;
          setConfirmCancelarId(null);
          setCancelMotivo("");
        }}
        className="w-full max-w-md mx-4"
        footer={(
          <div className="flex justify-end gap-3 p-4">
            <Button
              label="Voltar"
              onClick={() => {
                setConfirmCancelarId(null);
                setCancelMotivo("");
              }}
              className="p-button-text text-white/40"
              disabled={isProcessing}
            />
            <Button
              label={isProcessing ? "Cancelando..." : "Confirmar Cancelamento"}
              onClick={processCancelar}
              className="bg-rose-600 hover:bg-rose-700 border-none px-6"
              disabled={isProcessing || !cancelMotivo.trim()}
            />
          </div>
        )}
        contentClassName="bg-[#020817] p-6 text-white/60 text-sm leading-relaxed"
        headerClassName="bg-[#020817] border-b border-white/5 p-6 text-white"
        pt={{
          root: { className: 'rounded-[2rem] overflow-hidden border border-white/10' },
          mask: { className: 'backdrop-blur-sm bg-black/40' }
        }}
      >
        <div className="flex flex-col gap-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 self-center mb-2">
            <Trash2 size={24} />
          </div>
          <p className="text-center font-medium text-white">Tem certeza que deseja cancelar este contrato?</p>
          <p className="text-center text-xs">O imóvel vinculado ficará disponível para venda imediatamente após esta ação.</p>
          <div className="flex flex-col gap-2 pt-1">
            <label htmlFor="cancel-motivo" className="text-[10px] font-bold uppercase tracking-widest text-white/40">
              Motivo do cancelamento <span className="text-rose-400/90">*</span>
            </label>
            <InputTextarea
              id="cancel-motivo"
              value={cancelMotivo}
              onChange={(e) => setCancelMotivo(e.target.value)}
              rows={4}
              autoResize
              maxLength={2000}
              className="w-full bg-white/5 border border-white/10 text-white rounded-xl text-sm p-3 placeholder:text-white/25"
              placeholder="Descreva o motivo do cancelamento (obrigatório)…"
            />
          </div>
        </div>
      </DashboardDialog>

      {/* Modal Enviar Clicksign */}
      <DashboardDialog
        header="Assinatura Digital"
        visible={!!confirmClicksignId}
        onHide={() => !isProcessing && setConfirmClicksignId(null)}
        className="w-full max-w-md mx-4"
        footer={(
          <div className="flex justify-end gap-3 p-4">
            <Button label="Cancelar" onClick={() => setConfirmClicksignId(null)} className="p-button-text text-white/40" disabled={isProcessing} />
            <Button label={isProcessing ? "Processando..." : "Confirmar Envio"} onClick={processEnviarClicksign} className="bg-blue-600 hover:bg-blue-700 border-none px-6" disabled={isProcessing} />
          </div>
        )}
        contentClassName="bg-[#020817] p-6 text-white/60 text-sm leading-relaxed"
        headerClassName="bg-[#020817] border-b border-white/5 p-6 text-white"
        pt={{
          root: { className: 'rounded-[2rem] overflow-hidden border border-white/10' },
          mask: { className: 'backdrop-blur-sm bg-black/40' }
        }}
      >
        <div className="flex flex-col gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 self-center mb-2">
            <FileText size={24} />
          </div>
          <p className="text-center font-medium text-white">Deseja enviar este contrato para assinatura digital?</p>
          <p className="text-center text-xs">Todos os signatários receberão um e-mail da Clicksign para realizar a assinatura.</p>
          <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-xl text-[11px] uppercase tracking-wider font-bold text-blue-400/80">
            Importante: Certifique-se de que os dados do comprador e e-mails estão corretos antes de confirmar.
          </div>
        </div>
      </DashboardDialog>

    </div>
  );
}
