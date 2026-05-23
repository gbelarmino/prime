"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable, type DataTablePageEvent } from "primereact/datatable";
import { Column } from "primereact/column";
import { DashboardDialog } from "@/components/dashboard/DashboardDialog";
import { InputNumber } from "primereact/inputnumber";
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Menu } from "primereact/menu";
import type { MenuItem } from "primereact/menuitem";
import { toast } from "sonner";
import { Ban, Download, Eye, FileCheck, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardDataTableShell } from "@/components/dashboard/DashboardDataTableShell";
import {
  DASHBOARD_DATATABLE_CLASS,
  dashboardActionMenuItem,
  dashboardActionMenuSeparator,
  dashboardActionsMenuPt,
  dashboardCellMono,
  dashboardCellText,
  dashboardDataTablePt,
  dashboardRowActionsCell,
  dashboardStatusBadge,
} from "@/lib/dashboard-datatable";
import { TituloCancelarDialog, type TituloCancelarPayload } from "@/components/dashboard/fin/TituloCancelarDialog";
import { TituloRegistrarConvenioDialog } from "@/components/dashboard/fin/TituloRegistrarConvenioDialog";
import { convenioDropdownOptions, filterConveniosAtivos } from "@/lib/convenio-label";
import {
  finService,
  formatContratoRef,
  type ConvenioBanco,
  type TituloCobranca,
  type TituloContextoLote,
} from "@/lib/fin-service";
import {
  calcularProximoVencimento,
  isVencimentoValidoParaContrato,
  parseIsoDate,
} from "@/lib/fin-vencimento";
import type { SpringPage } from "@/lib/spring-page";

const STATUS_OPTIONS = [
  { label: "Todos", value: "" },
  { label: "Rascunho", value: "RASCUNHO" },
  { label: "Emitido", value: "EMITIDO" },
  { label: "Pago", value: "PAGO" },
  { label: "Vencido", value: "VENCIDO" },
  { label: "Cancelado", value: "CANCELADO" },
  { label: "Baixa solicitada", value: "BAIXA_SOLICITADA" },
];

const STATUS_TONES: Record<string, string> = {
  RASCUNHO: "border-white/10 bg-white/10 text-white/50",
  AGUARDANDO_REGISTRO: "border-blue-500/25 bg-blue-500/15 text-blue-300",
  REGISTRADO: "border-blue-500/25 bg-blue-500/15 text-blue-300",
  EMITIDO: "border-amber-500/25 bg-amber-500/15 text-amber-300",
  PAGO: "border-emerald-500/25 bg-emerald-500/15 text-emerald-300",
  VENCIDO: "border-rose-500/25 bg-rose-500/15 text-rose-300",
  CANCELADO: "border-white/10 bg-white/10 text-white/40",
  BAIXA_SOLICITADA: "border-amber-500/25 bg-amber-500/15 text-amber-300",
  ERRO_REGISTRO: "border-rose-500/25 bg-rose-500/15 text-rose-300",
};

const PAGE_SIZE = 20;
const TABLE_PT = dashboardDataTablePt({ density: "default" });
const FILTER_INPUT_CLASS = "w-full rounded-xl border-white/10 bg-white/5 text-white";
const FILTRO_TODOS = "";

const FILTER_DROPDOWN_PT = {
  input: {
    className:
      "w-full border-white/10 bg-white/[0.05] p-3 text-white placeholder:text-white/25",
  },
};

type TitulosListProps = {
  showNovo?: boolean;
  onShowNovoChange?: (open: boolean) => void;
  imovelId?: number;
  embedded?: boolean;
};

function formatMoney(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso + (iso.length === 10 ? "T12:00:00" : "")).toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
}

export function TitulosList({
  showNovo = false,
  onShowNovoChange,
  imovelId,
  embedded = false,
}: TitulosListProps) {
  const router = useRouter();
  const menuRef = useRef<Menu>(null);
  const [selectedRow, setSelectedRow] = useState<TituloCobranca | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [filterContrato, setFilterContrato] = useState("");
  const [filterNome, setFilterNome] = useState("");
  const [filterCpf, setFilterCpf] = useState("");
  const [filterEmpreendimento, setFilterEmpreendimento] = useState(FILTRO_TODOS);
  const [filterQuadra, setFilterQuadra] = useState(FILTRO_TODOS);
  const [filterLote, setFilterLote] = useState<number | null>(null);
  const [filterQuadras, setFilterQuadras] = useState<string[]>([]);
  const [filterQuadrasLoading, setFilterQuadrasLoading] = useState(false);
  const [filterLotes, setFilterLotes] = useState<number[]>([]);
  const [filterLotesLoading, setFilterLotesLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedRef = useRef(false);
  const [pageData, setPageData] = useState<SpringPage<TituloCobranca> | null>(null);
  const [saving, setSaving] = useState(false);
  const [empreendimentos, setEmpreendimentos] = useState<string[]>([]);
  const [empreendimentosLoading, setEmpreendimentosLoading] = useState(false);
  const [selectedEmpreendimento, setSelectedEmpreendimento] = useState<string | null>(null);
  const [quadras, setQuadras] = useState<string[]>([]);
  const [quadrasLoading, setQuadrasLoading] = useState(false);
  const [selectedQuadra, setSelectedQuadra] = useState<string | null>(null);
  const [lotes, setLotes] = useState<number[]>([]);
  const [lotesLoading, setLotesLoading] = useState(false);
  const [selectedLote, setSelectedLote] = useState<number | null>(null);
  const [contexto, setContexto] = useState<TituloContextoLote | null>(null);
  const [contextoLoading, setContextoLoading] = useState(false);
  const [vencimento, setVencimento] = useState<Date | null>(null);
  const [convenios, setConvenios] = useState<ConvenioBanco[]>([]);
  const [convenioIdNovo, setConvenioIdNovo] = useState<string | null>(null);
  const [registrarDialogOpen, setRegistrarDialogOpen] = useState(false);
  const [tituloParaRegistrar, setTituloParaRegistrar] = useState<TituloCobranca | null>(null);
  const [convenioIdRegistrar, setConvenioIdRegistrar] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [tituloParaCancelar, setTituloParaCancelar] = useState<TituloCobranca | null>(null);

  const resetNovoForm = useCallback(() => {
    setSelectedEmpreendimento(null);
    setSelectedQuadra(null);
    setSelectedLote(null);
    setQuadras([]);
    setLotes([]);
    setContexto(null);
    setVencimento(null);
    setConvenioIdNovo(null);
  }, []);

  const loadConvenios = useCallback(async () => {
    try {
      const lista = await finService.listConvenios();
      const ativos = filterConveniosAtivos(lista);
      setConvenios(ativos);
      return ativos;
    } catch {
      toast.error("Falha ao carregar convênios.");
      setConvenios([]);
      return [];
    }
  }, []);

  useEffect(() => {
    void loadConvenios();
  }, [loadConvenios]);

  const buildListFilters = useCallback(
    (statusOverride?: string) => ({
      status: (statusOverride ?? statusFilter) || undefined,
      imovelId,
      empreendimento: filterEmpreendimento.trim() || undefined,
      quadra: filterQuadra.trim() || undefined,
      lote: filterLote ?? undefined,
      contrato: filterContrato.trim() || undefined,
      nome: filterNome.trim() || undefined,
      cpf: filterCpf.trim() || undefined,
    }),
    [
      statusFilter,
      imovelId,
      filterEmpreendimento,
      filterQuadra,
      filterLote,
      filterContrato,
      filterNome,
      filterCpf,
    ],
  );

  const load = useCallback(
    async (
      background = false,
      overrides?: { page?: number; status?: string },
    ) => {
      const pageToLoad = overrides?.page ?? page;
      const skipLoading = background || hasLoadedRef.current;
      if (skipLoading) {
        setRefreshing(true);
      }
      try {
        const data = await finService.listTitulos(
          pageToLoad,
          PAGE_SIZE,
          buildListFilters(overrides?.status),
          { skipLoading },
        );
        setPageData(data);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao carregar títulos.");
        setPageData(null);
      } finally {
        if (skipLoading) {
          setRefreshing(false);
        }
        hasLoadedRef.current = true;
      }
    },
    [page, buildListFilters],
  );

  useEffect(() => {
    void load(hasLoadedRef.current);
  }, [load]);

  useEffect(() => {
    setPage(0);
  }, [
    statusFilter,
    filterContrato,
    filterNome,
    filterCpf,
    filterEmpreendimento,
    filterQuadra,
    filterLote,
  ]);

  useEffect(() => {
    setEmpreendimentosLoading(true);
    void finService
      .listEmpreendimentos({ skipLoading: true })
      .then(setEmpreendimentos)
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Erro ao carregar empreendimentos.");
        setEmpreendimentos([]);
      })
      .finally(() => setEmpreendimentosLoading(false));
  }, []);

  useEffect(() => {
    if (embedded && imovelId != null) {
      return;
    }
    if (!filterEmpreendimento.trim()) {
      setFilterQuadras([]);
      setFilterQuadra(FILTRO_TODOS);
      setFilterLotes([]);
      setFilterLote(null);
      return;
    }
    setFilterQuadrasLoading(true);
    void finService
      .listQuadrasImovel({ empreendimento: filterEmpreendimento }, { skipLoading: true })
      .then((items) => {
        setFilterQuadras(items);
        setFilterQuadra((prev) => (prev && items.includes(prev) ? prev : FILTRO_TODOS));
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Erro ao carregar quadras.");
        setFilterQuadras([]);
      })
      .finally(() => setFilterQuadrasLoading(false));
  }, [embedded, imovelId, filterEmpreendimento]);

  useEffect(() => {
    if (embedded && imovelId != null) {
      return;
    }
    if (!filterEmpreendimento.trim() || !filterQuadra.trim()) {
      setFilterLotes([]);
      setFilterLote(null);
      return;
    }
    setFilterLotesLoading(true);
    void finService
      .listLotesImovel(
        { empreendimento: filterEmpreendimento, quadra: filterQuadra },
        { skipLoading: true },
      )
      .then((items) => {
        setFilterLotes(items);
        setFilterLote((prev) => (prev != null && items.includes(prev) ? prev : null));
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Erro ao carregar lotes.");
        setFilterLotes([]);
      })
      .finally(() => setFilterLotesLoading(false));
  }, [embedded, imovelId, filterEmpreendimento, filterQuadra]);

  const limparFiltros = () => {
    setFilterContrato("");
    setFilterNome("");
    setFilterCpf("");
    setFilterEmpreendimento(FILTRO_TODOS);
    setFilterQuadra(FILTRO_TODOS);
    setFilterLote(null);
    setStatusFilter("");
  };

  const temFiltrosAtivos =
    !!statusFilter ||
    !!filterContrato.trim() ||
    !!filterNome.trim() ||
    !!filterCpf.trim() ||
    !!filterEmpreendimento.trim() ||
    !!filterQuadra.trim() ||
    filterLote != null;

  useEffect(() => {
    if (!showNovo) {
      resetNovoForm();
      return;
    }
    void loadConvenios().then((ativos) => {
      if (ativos.length > 0) {
        setConvenioIdNovo((prev) => prev ?? ativos[0].id);
      }
    });
  }, [showNovo, resetNovoForm, loadConvenios]);

  useEffect(() => {
    if (!showNovo || !selectedEmpreendimento) {
      setQuadras([]);
      setSelectedQuadra(null);
      setLotes([]);
      setSelectedLote(null);
      setContexto(null);
      setVencimento(null);
      return;
    }
    setQuadrasLoading(true);
    void finService
      .listQuadrasImovel({ empreendimento: selectedEmpreendimento }, { skipLoading: true })
      .then(setQuadras)
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Erro ao carregar quadras.");
        setQuadras([]);
      })
      .finally(() => setQuadrasLoading(false));
  }, [showNovo, selectedEmpreendimento]);

  useEffect(() => {
    if (!showNovo || !selectedEmpreendimento || !selectedQuadra) {
      setLotes([]);
      setSelectedLote(null);
      setContexto(null);
      setVencimento(null);
      return;
    }
    setLotesLoading(true);
    void finService
      .listLotesImovel(
        { empreendimento: selectedEmpreendimento, quadra: selectedQuadra },
        { skipLoading: true },
      )
      .then(setLotes)
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Erro ao carregar lotes.");
        setLotes([]);
      })
      .finally(() => setLotesLoading(false));
  }, [showNovo, selectedEmpreendimento, selectedQuadra]);

  useEffect(() => {
    if (!showNovo || !selectedEmpreendimento || !selectedQuadra || selectedLote == null) {
      setContexto(null);
      setVencimento(null);
      return;
    }
    setContextoLoading(true);
    void finService
      .contextoLote(selectedEmpreendimento, selectedQuadra, selectedLote)
      .then((ctx) => {
        setContexto(ctx);
        setVencimento(parseIsoDate(ctx.vencimentoSugerido));
      })
      .catch((e) => {
        setContexto(null);
        setVencimento(null);
        toast.error(e instanceof Error ? e.message : "Erro ao carregar dados do lote.");
      })
      .finally(() => setContextoLoading(false));
  }, [showNovo, selectedEmpreendimento, selectedQuadra, selectedLote]);

  const onPage = (e: DataTablePageEvent) => {
    setPage(e.page ?? 0);
  };

  const baixarPdf = async (tituloId: string, urlBoleto?: string | null) => {
    setActionLoading(true);
    try {
      await finService.downloadPdf(tituloId, urlBoleto);
    } catch {
      toast.error("Erro ao baixar PDF.");
    } finally {
      setActionLoading(false);
    }
  };

  const abrirRegistrar = (row: TituloCobranca) => {
    setTituloParaRegistrar(row);
    setConvenioIdRegistrar(row.convenioId ?? null);
    setRegistrarDialogOpen(true);
  };

  const fecharRegistrarDialog = () => {
    setRegistrarDialogOpen(false);
    setTituloParaRegistrar(null);
    setConvenioIdRegistrar(null);
  };

  const confirmarRegistrar = async () => {
    if (!tituloParaRegistrar || !convenioIdRegistrar) {
      toast.error("Selecione um convênio bancário.");
      return;
    }
    setActionLoading(true);
    try {
      await finService.registrar(tituloParaRegistrar.id, convenioIdRegistrar);
      toast.success("Título registrado e emitido.");
      fecharRegistrarDialog();
      void load(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao registrar.");
    } finally {
      setActionLoading(false);
    }
  };

  const abrirCancelar = (row: TituloCobranca) => {
    setTituloParaCancelar(row);
    setCancelDialogOpen(true);
  };

  const fecharCancelarDialog = () => {
    setCancelDialogOpen(false);
    setTituloParaCancelar(null);
  };

  const confirmarCancelar = async (payload: TituloCancelarPayload) => {
    if (!tituloParaCancelar) return;
    setActionLoading(true);
    try {
      const atualizado = await finService.cancelar(tituloParaCancelar.id, payload);
      if (atualizado.status === "BAIXA_SOLICITADA") {
        toast.success("Baixa solicitada no banco. Aguarde confirmação ou sincronize o status.");
      } else {
        toast.success("Título cancelado.");
      }
      fecharCancelarDialog();
      void load(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao cancelar.");
    } finally {
      setActionLoading(false);
    }
  };

  const sincronizarStatus = async (tituloId: string) => {
    setActionLoading(true);
    try {
      const atualizado = await finService.sincronizarStatus(tituloId);
      if (atualizado.status === "CANCELADO") {
        toast.success("Baixa confirmada. Título cancelado.");
      } else {
        toast.info("Status atualizado no banco; ainda aguardando confirmação da baixa.");
      }
      void load(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao sincronizar status.");
    } finally {
      setActionLoading(false);
    }
  };

  const getTituloActionItems = (row: TituloCobranca): MenuItem[] => {
    const items: MenuItem[] = [
      dashboardActionMenuItem({
        label: "Ver detalhes",
        icon: <Eye size={16} className="text-blue-400 transition-transform group-hover:scale-110" />,
        onClick: () => router.push(`/dashboard/financeiro/titulos/detalhe?id=${row.id}`),
      }),
    ];

    if (row.status === "RASCUNHO") {
      items.push(
        dashboardActionMenuItem({
          label: "Registrar",
          icon: (
            <FileCheck size={16} className="text-emerald-400 transition-transform group-hover:scale-110" />
          ),
          onClick: () => abrirRegistrar(row),
          disabled: actionLoading,
        }),
      );
    }

    if (row.status !== "RASCUNHO") {
      items.push(
        dashboardActionMenuItem({
          label: row.urlBoleto?.trim() ? "Abrir boleto" : "Baixar PDF",
          icon: (
            <Download size={16} className="text-amber-400 transition-transform group-hover:scale-110" />
          ),
          onClick: () => void baixarPdf(row.id, row.urlBoleto),
          disabled: actionLoading,
        }),
      );
    }

    if (row.status === "BAIXA_SOLICITADA") {
      items.push(
        dashboardActionMenuItem({
          label: "Sincronizar status",
          icon: (
            <RefreshCw size={16} className="text-blue-400 transition-transform group-hover:scale-110" />
          ),
          onClick: () => void sincronizarStatus(row.id),
          disabled: actionLoading,
        }),
      );
    }

    if (
      row.status !== "PAGO" &&
      row.status !== "CANCELADO" &&
      row.status !== "BAIXA_SOLICITADA"
    ) {
      items.push(dashboardActionMenuSeparator());
      items.push(
        dashboardActionMenuItem({
          label: "Cancelar título",
          icon: <Ban size={16} className="text-rose-400 transition-transform group-hover:scale-110" />,
          labelClassName: "text-rose-300/90",
          onClick: () => abrirCancelar(row),
          disabled: actionLoading,
        }),
      );
    }

    return items;
  };

  const actionBodyTemplate = (row: TituloCobranca) =>
    dashboardRowActionsCell((e) => {
      setSelectedRow(row);
      menuRef.current?.toggle(e);
    });

  const criarTitulo = async () => {
    if (!contexto || !vencimento) {
      toast.error("Selecione empreendimento, quadra e lote válidos e confira o vencimento.");
      return;
    }
    if (!convenioIdNovo) {
      toast.error("Selecione um convênio bancário.");
      return;
    }
    if (!isVencimentoValidoParaContrato(vencimento, contexto.diaVencimentoMensal)) {
      toast.error(
        `Vencimento deve ser uma data futura no dia ${contexto.diaVencimentoMensal} do mês.`,
      );
      return;
    }
    setSaving(true);
    try {
      const y = vencimento.getFullYear();
      const m = String(vencimento.getMonth() + 1).padStart(2, "0");
      const d = String(vencimento.getDate()).padStart(2, "0");
      const venc = `${y}-${m}-${d}`;
      const criado = await finService.criarTitulo(
        {
          contratoId: contexto.contratoId,
          numeroParcela: contexto.numeroParcela,
          convenioId: convenioIdNovo,
          valorNominal: contexto.valorNominal,
          vencimento: venc,
        },
        `contrato-${formatContratoRef(contexto.numeroContrato, contexto.contratoId)}-parcela-${contexto.numeroParcela}`,
      );
      setPage(0);
      setStatusFilter("RASCUNHO");
      onShowNovoChange?.(false);
      await load(true, { page: 0, status: "RASCUNHO" });
      toast.success(`Título criado em rascunho (parcela ${criado.numeroParcela}).`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar título.");
      if (selectedEmpreendimento && selectedQuadra && selectedLote != null) {
        try {
          const ctx = await finService.contextoLote(
            selectedEmpreendimento,
            selectedQuadra,
            selectedLote,
          );
          setContexto(ctx);
          setVencimento(parseIsoDate(ctx.vencimentoSugerido));
        } catch {
          /* mantém contexto anterior */
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const totalRecords = pageData?.totalElements ?? 0;

  return (
    <>
      <div className={cn("flex flex-col gap-5", !embedded && "px-4")}>
        <div className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-white/40">
              <span className="font-bold text-white">{totalRecords}</span> títulos encontrados
            </p>
            <button
              type="button"
              onClick={() => void load(true)}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white/70 transition-all hover:bg-white/10 disabled:pointer-events-none disabled:opacity-50 md:self-auto"
            >
              <RefreshCw size={14} className={cn("shrink-0", refreshing && "animate-spin")} />
              Atualizar
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                Contrato
              </label>
              <InputText
                value={filterContrato}
                onChange={(e) => setFilterContrato(e.target.value)}
                placeholder="Número, ID ou nome"
                className={FILTER_INPUT_CLASS}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                Nome
              </label>
              <InputText
                value={filterNome}
                onChange={(e) => setFilterNome(e.target.value)}
                placeholder="Nome do contratante"
                className={FILTER_INPUT_CLASS}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                CPF
              </label>
              <InputText
                value={filterCpf}
                onChange={(e) => setFilterCpf(e.target.value)}
                placeholder="000.000.000-00"
                className={FILTER_INPUT_CLASS}
              />
            </div>
            {!embedded || imovelId == null ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                    Empreendimento
                  </label>
                  <Dropdown
                    value={filterEmpreendimento}
                    options={[
                      { label: "Todos os empreendimentos", value: FILTRO_TODOS },
                      ...empreendimentos.map((emp) => ({ label: emp, value: emp })),
                    ]}
                    optionLabel="label"
                    optionValue="value"
                    onChange={(e) => {
                      setFilterEmpreendimento((e.value as string) ?? FILTRO_TODOS);
                      setFilterQuadra(FILTRO_TODOS);
                      setFilterLote(null);
                    }}
                    placeholder="Todos os empreendimentos"
                    filter
                    className="w-full"
                    disabled={empreendimentosLoading}
                    pt={FILTER_DROPDOWN_PT}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                    Quadra
                  </label>
                  <Dropdown
                    value={filterQuadra}
                    options={[
                      { label: "Todas as quadras", value: FILTRO_TODOS },
                      ...filterQuadras.map((q) => ({ label: `Quadra ${q}`, value: q })),
                    ]}
                    optionLabel="label"
                    optionValue="value"
                    onChange={(e) => {
                      setFilterQuadra((e.value as string) ?? FILTRO_TODOS);
                      setFilterLote(null);
                    }}
                    placeholder={
                      filterEmpreendimento.trim()
                        ? "Todas as quadras"
                        : "Selecione o empreendimento"
                    }
                    filter
                    className="w-full"
                    disabled={!filterEmpreendimento.trim() || filterQuadrasLoading}
                    pt={FILTER_DROPDOWN_PT}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                    Lote
                  </label>
                  <Dropdown
                    value={filterLote}
                    options={filterLotes.map((n) => ({ label: `Lote ${n}`, value: n }))}
                    optionLabel="label"
                    optionValue="value"
                    onChange={(e) => setFilterLote(e.value ?? null)}
                    placeholder={filterQuadra.trim() ? "Todos os lotes" : "Selecione a quadra"}
                    showClear
                    className="w-full"
                    disabled={!filterQuadra.trim() || filterLotesLoading}
                    pt={FILTER_DROPDOWN_PT}
                  />
                </div>
              </>
            ) : null}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/70 transition-all focus:border-blue-500/50 focus:outline-none"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value || "all"} value={o.value} className="bg-[#020817]">
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {temFiltrosAtivos ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={limparFiltros}
                className="text-[10px] font-bold uppercase tracking-widest text-white/40 transition-colors hover:text-white/70"
              >
                Limpar filtros
              </button>
            </div>
          ) : null}
        </div>

        <DashboardDataTableShell>
          <DataTable
            value={pageData?.content ?? []}
            dataKey="id"
            lazy
            paginator
            rows={PAGE_SIZE}
            totalRecords={totalRecords}
            first={page * PAGE_SIZE}
            onPage={onPage}
            loading={refreshing}
            emptyMessage="Nenhum título encontrado."
            responsiveLayout="stack"
            breakpoint="960px"
            className={DASHBOARD_DATATABLE_CLASS}
            pt={TABLE_PT}
            rowHover
          >
            {!embedded ? (
              <Column
                header="Contrato"
                body={(row: TituloCobranca) =>
                  dashboardCellMono(formatContratoRef(row.numeroContrato, row.contratoId))
                }
                style={{ width: "8%" }}
              />
            ) : null}
            <Column field="numeroParcela" header="Parc." style={{ width: "6%" }} />
            <Column
              header="Nosso nº"
              body={(row: TituloCobranca) => dashboardCellMono(row.nossoNumero)}
              style={{ width: "12%" }}
            />
            {embedded ? (
              <Column
                header="Geração"
                body={(row: TituloCobranca) => dashboardCellText(formatDate(row.cadastroEm))}
                style={{ width: "10%" }}
              />
            ) : null}
            {embedded ? (
              <Column
                header="Convênio"
                body={(row: TituloCobranca) => dashboardCellText(row.convenioNome || "—")}
                style={{ width: "14%" }}
              />
            ) : null}
            <Column
              header="Vencimento"
              body={(row: TituloCobranca) => dashboardCellText(formatDate(row.vencimento))}
              style={{ width: "10%" }}
            />
            <Column
              header="Valor"
              body={(row: TituloCobranca) => dashboardCellText(formatMoney(row.valorNominal))}
              style={{ width: "12%" }}
            />
            <Column
              header="Status"
              body={(row: TituloCobranca) => dashboardStatusBadge(row.status, STATUS_TONES)}
              style={{ width: "12%" }}
            />
            <Column header="Ações" body={actionBodyTemplate} align="right" style={{ width: "8%" }} />
          </DataTable>
        </DashboardDataTableShell>

        <Menu
          model={selectedRow ? getTituloActionItems(selectedRow) : []}
          popup
          ref={menuRef}
          pt={dashboardActionsMenuPt()}
        />

        <TituloCancelarDialog
          visible={cancelDialogOpen}
          titulo={tituloParaCancelar}
          loading={actionLoading}
          onHide={fecharCancelarDialog}
          onConfirm={confirmarCancelar}
        />

        <TituloRegistrarConvenioDialog
          visible={registrarDialogOpen}
          onHide={fecharRegistrarDialog}
          tituloResumo={
            tituloParaRegistrar
              ? `${formatContratoRef(tituloParaRegistrar.numeroContrato, tituloParaRegistrar.contratoId)} · parc. ${tituloParaRegistrar.numeroParcela}`
              : null
          }
          convenios={convenios}
          convenioId={convenioIdRegistrar}
          onConvenioIdChange={setConvenioIdRegistrar}
          onConfirm={() => void confirmarRegistrar()}
          loading={actionLoading}
        />
      </div>

      {!embedded && onShowNovoChange ? (
      <DashboardDialog
        header="Novo título de cobrança"
        visible={showNovo}
        onHide={() => {
          onShowNovoChange(false);
          resetNovoForm();
        }}
        className="w-full max-w-md border border-white/10 bg-[#071C33] shadow-2xl"
        pt={{
          header: {
            className:
              "border-b border-white/[0.06] bg-transparent px-6 py-5 font-[family-name:var(--font-playfair)] text-xl font-semibold text-white",
          },
          content: { className: "bg-transparent px-6 py-6" },
          footer: { className: "border-t border-white/[0.06] bg-transparent px-6 py-5" },
        }}
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                onShowNovoChange(false);
                resetNovoForm();
              }}
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white/60 transition hover:border-white/15 hover:bg-white/[0.08] hover:text-white/90"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={saving || !contexto || contextoLoading || !convenioIdNovo}
              onClick={() => void criarTitulo()}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500 disabled:pointer-events-none disabled:opacity-50"
            >
              {saving ? "A criar…" : "Criar"}
            </button>
          </div>
        }
        modal
        draggable={false}
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
              Empreendimento
            </label>
            <Dropdown
              value={selectedEmpreendimento}
              options={empreendimentos.map((emp) => ({ label: emp, value: emp }))}
              onChange={(e) => {
                setSelectedEmpreendimento(e.value ?? null);
                setSelectedQuadra(null);
                setSelectedLote(null);
              }}
              placeholder="Selecione o empreendimento"
              className="w-full"
              filter
              disabled={empreendimentosLoading}
              pt={{
                input: {
                  className:
                    "w-full border-white/10 bg-white/[0.05] p-3 text-white placeholder:text-white/25",
                },
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
              Quadra
            </label>
            <Dropdown
              value={selectedQuadra}
              options={quadras.map((q) => ({ label: `Quadra ${q}`, value: q }))}
              onChange={(e) => {
                setSelectedQuadra(e.value ?? null);
                setSelectedLote(null);
              }}
              placeholder={
                selectedEmpreendimento ? "Selecione a quadra" : "Selecione primeiro o empreendimento"
              }
              className="w-full"
              filter
              disabled={!selectedEmpreendimento || quadrasLoading}
              pt={{
                input: {
                  className:
                    "w-full border-white/10 bg-white/[0.05] p-3 text-white placeholder:text-white/25",
                },
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
              Lote
            </label>
            <Dropdown
              value={selectedLote}
              options={lotes.map((n) => ({ label: `Lote ${n}`, value: n }))}
              onChange={(e) => setSelectedLote(e.value ?? null)}
              placeholder={
                !selectedEmpreendimento
                  ? "Selecione primeiro o empreendimento"
                  : !selectedQuadra
                    ? "Selecione primeiro a quadra"
                    : "Selecione o lote"
              }
              className="w-full"
              filter
              disabled={!selectedEmpreendimento || !selectedQuadra || lotesLoading}
              pt={{
                input: {
                  className:
                    "w-full border-white/10 bg-white/[0.05] p-3 text-white placeholder:text-white/25",
                },
              }}
            />
          </div>

          {contextoLoading && (
            <p className="text-xs text-white/40">A carregar dados do contrato…</p>
          )}

          {contexto && !contextoLoading && (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
                  Nº da parcela
                </label>
                <InputNumber
                  value={contexto.numeroParcela}
                  className="w-full"
                  inputClassName="w-full border-white/10 bg-white/[0.03] p-3 text-white/50 cursor-not-allowed"
                  disabled
                  useGrouping={false}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
                  Valor nominal
                </label>
                <InputNumber
                  value={contexto.valorNominal}
                  mode="currency"
                  currency="BRL"
                  locale="pt-BR"
                  className="w-full"
                  inputClassName="w-full border-white/10 bg-white/[0.03] p-3 text-white/50 cursor-not-allowed"
                  disabled
                />
              </div>
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="fin-titulo-vencimento"
                  className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35"
                >
                  Vencimento
                </label>
                <p className="text-xs text-white/40">
                  Dia {contexto.diaVencimentoMensal} de cada mês (conforme contrato). Apenas datas
                  futuras.
                </p>
                <Calendar
                  inputId="fin-titulo-vencimento"
                  value={vencimento}
                  onChange={(e) => setVencimento(e.value ?? null)}
                  dateFormat="dd/mm/yy"
                  className="w-full"
                  inputClassName="w-full border-white/10 bg-white/[0.05] p-3 text-white placeholder:text-white/25 focus:border-emerald-500/40"
                  showIcon
                  minDate={calcularProximoVencimento(contexto.diaVencimentoMensal, new Date())}
                  disabled={contextoLoading}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
                  Convênio
                </label>
                <Dropdown
                  value={convenioIdNovo}
                  options={convenioDropdownOptions(convenios)}
                  onChange={(e) => setConvenioIdNovo((e.value as string) ?? null)}
                  placeholder="Selecione Asaas ou Unicred"
                  className="w-full"
                  pt={{
                    input: {
                      className:
                        "w-full border-white/10 bg-white/[0.05] p-3 text-white placeholder:text-white/25",
                    },
                  }}
                />
              </div>
            </>
          )}
        </div>
      </DashboardDialog>
      ) : null}
    </>
  );
}
