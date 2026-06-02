"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable, type DataTablePageEvent } from "primereact/datatable";
import { Column } from "primereact/column";
import { DashboardConfirmDialog } from "@/components/dashboard/DashboardConfirmDialog";
import { DashboardDialog } from "@/components/dashboard/DashboardDialog";
import { InputNumber } from "primereact/inputnumber";
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Menu } from "primereact/menu";
import type { MenuItem } from "primereact/menuitem";
import { toast } from "sonner";
import { Ban, CalendarClock, Download, Eye, FileCheck, Mail, MessageCircle, RefreshCw } from "lucide-react";
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
import { TituloPdfLoteDialog } from "@/components/dashboard/fin/TituloPdfLoteDialog";
import { TituloRegistrarLoteDialog } from "@/components/dashboard/fin/TituloRegistrarLoteDialog";
import { TituloEmailLoteDialog } from "@/components/dashboard/fin/TituloEmailLoteDialog";
import { TituloWhatsAppLoteDialog } from "@/components/dashboard/fin/TituloWhatsAppLoteDialog";
import {
  finService,
  formatContratoRef,
  type TituloCobranca,
  type TituloContextoLote,
  type TituloPdfLoteResult,
  type TituloRegistrarLoteResult,
  type TituloEmailCobrancaLoteResult,
  type TituloWhatsAppCobrancaLoteResult,
} from "@/lib/fin-service";
import { podeBaixarPdfBoleto } from "@/lib/baixar-boleto-pdf";
import {
  isParcelaReajuste,
  maxParcelasAteProximoReajuste,
  proximaParcelaComReajuste,
  ultimaParcelaEmitivelEmLote,
} from "@/lib/fin-parcela-reajuste";
import {
  calcularVencimentosComPrimeiraParcelaDetalhe,
  calcularVencimentosParcelasDetalhe,
  diaSemanaCurto,
  formatIsoDate,
  parseIsoDate,
} from "@/lib/fin-vencimento";
import type { SpringPage } from "@/lib/spring-page";
import { springPageDisplayRange } from "@/lib/spring-page";

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

const PAGE_SIZE = 12;
const LOTE_MAX = 50;
const TABLE_PT = dashboardDataTablePt({ density: "default" });
const FILTER_INPUT_CLASS =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white/70 placeholder:text-white/25 focus:border-blue-500/50 focus:outline-none transition-all [color-scheme:dark]";
const FILTER_DATE_CLASS =
  "bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white/70 focus:outline-none focus:border-blue-500/50 transition-all min-w-[140px] [color-scheme:dark]";
const FILTRO_TODOS = "";

const FILTER_DROPDOWN_PT = {
  input: {
    className:
      "w-full border-white/10 bg-white/[0.05] p-3 text-white placeholder:text-white/25",
  },
};

type NovoTituloStep = "form" | "confirm";

type TitulosListProps = {
  showNovo?: boolean;
  onShowNovoChange?: (open: boolean) => void;
  imovelId?: number;
  embedded?: boolean;
};

function resolveMaxParcelas(ctx: TituloContextoLote): number {
  return ctx.maxParcelasPermitidas ?? maxParcelasAteProximoReajuste(ctx.numeroParcela);
}

function resolveParcelaReajusteLimite(ctx: TituloContextoLote): number {
  return ctx.parcelaReajusteLimite ?? proximaParcelaComReajuste(ctx.numeroParcela);
}

function resolveUltimaParcelaEmitivel(ctx: TituloContextoLote): number {
  return ultimaParcelaEmitivelEmLote(ctx.numeroParcela);
}

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

function tituloRegistravel(status: TituloCobranca["status"]): boolean {
  return status === "RASCUNHO" || status === "ERRO_REGISTRO";
}

function tituloElegivelWhatsApp(status: TituloCobranca["status"]): boolean {
  return status === "EMITIDO";
}

function tituloElegivelPdf(status: TituloCobranca["status"]): boolean {
  return podeBaixarPdfBoleto(status);
}

function tituloSelecionavel(status: TituloCobranca["status"]): boolean {
  return (
    tituloRegistravel(status) || tituloElegivelWhatsApp(status) || tituloElegivelPdf(status)
  );
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
  const [filterVencimentoDe, setFilterVencimentoDe] = useState("");
  const [filterVencimentoAte, setFilterVencimentoAte] = useState("");
  const [filterEmissaoDe, setFilterEmissaoDe] = useState("");
  const [filterEmissaoAte, setFilterEmissaoAte] = useState("");
  const [page, setPage] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [marcandoVencidos, setMarcandoVencidos] = useState(false);
  const [marcarVencidosDialogOpen, setMarcarVencidosDialogOpen] = useState(false);
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
  const [quantidadeParcelas, setQuantidadeParcelas] = useState<number>(1);
  const [dataPrimeiraParcela, setDataPrimeiraParcela] = useState<Date | null>(null);
  const [novoTituloStep, setNovoTituloStep] = useState<NovoTituloStep>("form");
  const [registrarDialogOpen, setRegistrarDialogOpen] = useState(false);
  const [tituloParaRegistrar, setTituloParaRegistrar] = useState<TituloCobranca | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [tituloParaCancelar, setTituloParaCancelar] = useState<TituloCobranca | null>(null);
  const [selectedTitulos, setSelectedTitulos] = useState<TituloCobranca[]>([]);
  const [registrarLoteDialogOpen, setRegistrarLoteDialogOpen] = useState(false);
  const [registrarLoteResultado, setRegistrarLoteResultado] =
    useState<TituloRegistrarLoteResult | null>(null);
  const [whatsappLoteDialogOpen, setWhatsappLoteDialogOpen] = useState(false);
  const [whatsappLoteResultado, setWhatsappLoteResultado] =
    useState<TituloWhatsAppCobrancaLoteResult | null>(null);
  const [emailLoteDialogOpen, setEmailLoteDialogOpen] = useState(false);
  const [emailLoteResultado, setEmailLoteResultado] =
    useState<TituloEmailCobrancaLoteResult | null>(null);
  const [pdfLoteDialogOpen, setPdfLoteDialogOpen] = useState(false);
  const [pdfLoteResultado, setPdfLoteResultado] = useState<TituloPdfLoteResult | null>(null);
  const [selecionandoTodos, setSelecionandoTodos] = useState(false);

  const titulosRegistraveisSelecionados = useMemo(
    () => selectedTitulos.filter((t) => tituloRegistravel(t.status)),
    [selectedTitulos],
  );

  const titulosWhatsAppSelecionados = useMemo(
    () => selectedTitulos.filter((t) => tituloElegivelWhatsApp(t.status)),
    [selectedTitulos],
  );

  const titulosPdfSelecionados = useMemo(
    () => selectedTitulos.filter((t) => tituloElegivelPdf(t.status)),
    [selectedTitulos],
  );

  const resetNovoForm = useCallback(() => {
    setSelectedEmpreendimento(null);
    setSelectedQuadra(null);
    setSelectedLote(null);
    setQuadras([]);
    setLotes([]);
    setContexto(null);
    setQuantidadeParcelas(1);
    setDataPrimeiraParcela(null);
    setNovoTituloStep("form");
  }, []);

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
      vencimentoDe: filterVencimentoDe || undefined,
      vencimentoAte: filterVencimentoAte || undefined,
      cadastroDe: filterEmissaoDe || undefined,
      cadastroAte: filterEmissaoAte || undefined,
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
      filterVencimentoDe,
      filterVencimentoAte,
      filterEmissaoDe,
      filterEmissaoAte,
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
    setSelectedTitulos([]);
  }, [
    statusFilter,
    filterContrato,
    filterNome,
    filterCpf,
    filterEmpreendimento,
    filterQuadra,
    filterLote,
    filterVencimentoDe,
    filterVencimentoAte,
    filterEmissaoDe,
    filterEmissaoAte,
  ]);

  useEffect(() => {
    setSelectedTitulos([]);
  }, [page]);

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
    setFilterVencimentoDe("");
    setFilterVencimentoAte("");
    setFilterEmissaoDe("");
    setFilterEmissaoAte("");
  };

  const temFiltrosAtivos =
    !!statusFilter ||
    !!filterContrato.trim() ||
    !!filterNome.trim() ||
    !!filterCpf.trim() ||
    !!filterEmpreendimento.trim() ||
    !!filterQuadra.trim() ||
    filterLote != null ||
    !!filterVencimentoDe ||
    !!filterVencimentoAte ||
    !!filterEmissaoDe ||
    !!filterEmissaoAte;

  useEffect(() => {
    if (!showNovo) {
      resetNovoForm();
      return;
    }
  }, [showNovo, resetNovoForm]);

  useEffect(() => {
    if (!showNovo || !selectedEmpreendimento) {
      setQuadras([]);
      setSelectedQuadra(null);
      setLotes([]);
      setSelectedLote(null);
      setContexto(null);
      setQuantidadeParcelas(1);
      setNovoTituloStep("form");
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
      setQuantidadeParcelas(1);
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
      setQuantidadeParcelas(1);
      return;
    }
    setContextoLoading(true);
    void finService
      .contextoLote(selectedEmpreendimento, selectedQuadra, selectedLote)
      .then((ctx) => {
        setContexto(ctx);
        const maxPermitidas = resolveMaxParcelas(ctx);
        setQuantidadeParcelas((q) =>
          maxPermitidas === 0 ? 0 : Math.min(Math.max(1, q), maxPermitidas),
        );
        if (ctx.primeiroTituloLote && ctx.dataPrimeiraParcelaContrato) {
          setDataPrimeiraParcela(parseIsoDate(ctx.dataPrimeiraParcelaContrato));
        } else {
          setDataPrimeiraParcela(null);
        }
      })
      .catch((e) => {
        setContexto(null);
        setQuantidadeParcelas(1);
        toast.error(e instanceof Error ? e.message : "Erro ao carregar dados do lote.");
      })
      .finally(() => setContextoLoading(false));
  }, [showNovo, selectedEmpreendimento, selectedQuadra, selectedLote]);

  const maxParcelasPermitidas = useMemo(
    () => (contexto ? resolveMaxParcelas(contexto) : 0),
    [contexto],
  );

  const parcelaReajusteLimite = useMemo(
    () => (contexto ? resolveParcelaReajusteLimite(contexto) : 13),
    [contexto],
  );

  const ultimaParcelaEmitivel = useMemo(
    () => (contexto ? resolveUltimaParcelaEmitivel(contexto) : 12),
    [contexto],
  );

  const previewLote = useMemo(() => {
    if (!contexto || maxParcelasPermitidas < 1 || quantidadeParcelas < 1) return null;
    const qtd = Math.min(maxParcelasPermitidas, Math.floor(quantidadeParcelas));
    const parcelaInicial = contexto.numeroParcela;
    const parcelaFinal = parcelaInicial + qtd - 1;

    const vencimentosDetalhe =
      contexto.primeiroTituloLote && dataPrimeiraParcela
        ? calcularVencimentosComPrimeiraParcelaDetalhe(
            dataPrimeiraParcela,
            contexto.diaVencimentoMensal,
            qtd,
          )
        : calcularVencimentosParcelasDetalhe(
            contexto.diaVencimentoMensal,
            parseIsoDate(contexto.referenciaVencimento ?? contexto.vencimentoSugerido),
            qtd,
          );

    const itens = vencimentosDetalhe.map((detalhe, index) => ({
      parcela: parcelaInicial + index,
      vencimento: formatIsoDate(detalhe.vencimento),
      vencimentoBruto: formatIsoDate(detalhe.vencimentoBruto),
      ajustadoPorDiaUtil: detalhe.ajustadoPorDiaUtil,
      excedente: false,
      parcelaReajuste: false,
      valor: contexto.valorNominal,
    }));

    const itensExcedentes: typeof itens = [];
    if (qtd === maxParcelasPermitidas && parcelaFinal < parcelaReajusteLimite) {
      for (let parcela = parcelaFinal + 1; parcela <= parcelaReajusteLimite; parcela++) {
        const offset = parcela - parcelaInicial + 1;
        const detalhe =
          contexto.primeiroTituloLote && dataPrimeiraParcela
            ? calcularVencimentosComPrimeiraParcelaDetalhe(
                dataPrimeiraParcela,
                contexto.diaVencimentoMensal,
                offset,
              ).at(-1)
            : calcularVencimentosParcelasDetalhe(
                contexto.diaVencimentoMensal,
                parseIsoDate(contexto.referenciaVencimento ?? contexto.vencimentoSugerido),
                offset,
              ).at(-1);
        if (!detalhe) continue;
        itensExcedentes.push({
          parcela,
          vencimento: formatIsoDate(detalhe.vencimento),
          vencimentoBruto: formatIsoDate(detalhe.vencimentoBruto),
          ajustadoPorDiaUtil: detalhe.ajustadoPorDiaUtil,
          excedente: true,
          parcelaReajuste: isParcelaReajuste(parcela),
          valor: contexto.valorNominal,
        });
      }
    }

    const ajustadosPorDiaUtil = itens.filter((item) => item.ajustadoPorDiaUtil).length;
    return {
      parcelaInicial,
      parcelaFinal,
      quantidade: qtd,
      valorTotal: contexto.valorNominal * qtd,
      ajustadosPorDiaUtil,
      parcelaReajusteLimite,
      ultimaParcelaEmitivel,
      primeiroVencimento: itens[0]?.vencimento ?? null,
      ultimoVencimento: itens.at(-1)?.vencimento ?? null,
      itens,
      itensExcedentes,
      itensRevisao: [...itens, ...itensExcedentes],
    };
  }, [
    contexto,
    dataPrimeiraParcela,
    quantidadeParcelas,
    maxParcelasPermitidas,
    parcelaReajusteLimite,
    ultimaParcelaEmitivel,
  ]);

  const onPage = (e: DataTablePageEvent) => {
    setPage(e.page ?? 0);
  };

  const baixarPdf = async (
    tituloId: string,
    urlBoleto?: string | null,
    rowStatus?: TituloCobranca["status"],
  ) => {
    setActionLoading(true);
    try {
      await finService.downloadPdf(tituloId, urlBoleto, rowStatus);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao baixar PDF.");
    } finally {
      setActionLoading(false);
    }
  };

  const abrirRegistrar = (row: TituloCobranca) => {
    setTituloParaRegistrar(row);
    setRegistrarDialogOpen(true);
  };

  const fecharRegistrarDialog = () => {
    setRegistrarDialogOpen(false);
    setTituloParaRegistrar(null);
  };

  const confirmarRegistrar = async () => {
    if (!tituloParaRegistrar) return;
    setActionLoading(true);
    try {
      await finService.registrar(tituloParaRegistrar.id);
      toast.success("Título registrado e emitido.");
      fecharRegistrarDialog();
      void load(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao registrar.");
    } finally {
      setActionLoading(false);
    }
  };

  const abrirRegistrarLote = () => {
    if (titulosRegistraveisSelecionados.length === 0) {
      toast.info("Selecione títulos em rascunho ou com erro de registro.");
      return;
    }
    if (titulosRegistraveisSelecionados.length > LOTE_MAX) {
      toast.error(`Selecione no máximo ${LOTE_MAX} títulos por operação.`);
      return;
    }
    setRegistrarLoteResultado(null);
    setRegistrarLoteDialogOpen(true);
  };

  const fecharRegistrarLoteDialog = () => {
    setRegistrarLoteDialogOpen(false);
    setRegistrarLoteResultado(null);
    if (registrarLoteResultado && registrarLoteResultado.registrados > 0) {
      setSelectedTitulos([]);
      void load(true);
    }
  };

  const confirmarRegistrarLote = async () => {
    if (titulosRegistraveisSelecionados.length === 0) return;
    setActionLoading(true);
    try {
      const resultado = await finService.registrarTitulosEmLote(
        titulosRegistraveisSelecionados.map((t) => t.id),
      );
      setRegistrarLoteResultado(resultado);
      if (resultado.falhas === 0) {
        toast.success(`${resultado.registrados} título(s) registrado(s) e emitido(s).`);
      } else if (resultado.registrados > 0) {
        toast.warning(
          `${resultado.registrados} registrado(s), ${resultado.falhas} falha(s). Veja o detalhe.`,
        );
      } else {
        toast.error("Nenhum título foi registrado.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao registrar em lote.");
    } finally {
      setActionLoading(false);
    }
  };

  const carregarTitulosPorIds = async (
    ids: string[],
    filtroStatus: (status: TituloCobranca["status"]) => boolean,
  ): Promise<TituloCobranca[]> => {
    const mapaPagina = new Map((pageData?.content ?? []).map((t) => [t.id, t]));
    const faltantes = ids.filter((id) => !mapaPagina.has(id));
    let extras: TituloCobranca[] = [];
    if (faltantes.length > 0) {
      extras = await Promise.all(faltantes.map((id) => finService.getTitulo(id)));
    }
    const porId = new Map<string, TituloCobranca>();
    for (const t of [...(pageData?.content ?? []), ...extras]) {
      if (filtroStatus(t.status)) {
        porId.set(t.id, t);
      }
    }
    return ids.map((id) => porId.get(id)).filter((t): t is TituloCobranca => t != null);
  };

  const selecionarTodosDoFiltro = async () => {
    setSelecionandoTodos(true);
    try {
      const { ids, total } = await finService.listTitulosIdsElegiveisRegistro(
        buildListFilters(),
        { skipLoading: true },
      );
      if (total === 0) {
        toast.info("Nenhum rascunho elegível no filtro atual.");
        setSelectedTitulos([]);
        return;
      }
      if (total > LOTE_MAX) {
        toast.error(
          `O filtro retornou ${total} títulos. Refine os filtros para no máximo ${LOTE_MAX}.`,
        );
        return;
      }
      const selecionados = await carregarTitulosPorIds(ids, tituloRegistravel);
      setSelectedTitulos(selecionados);
      toast.success(`${selecionados.length} título(s) selecionado(s).`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao listar títulos elegíveis.");
    } finally {
      setSelecionandoTodos(false);
    }
  };

  const selecionarTodosWhatsAppDoFiltro = async () => {
    setSelecionandoTodos(true);
    try {
      const { ids, total } = await finService.listTitulosIdsElegiveisWhatsApp(
        buildListFilters(),
        { skipLoading: true },
      );
      if (total === 0) {
        toast.info("Nenhum título emitido elegível para WhatsApp no filtro atual.");
        setSelectedTitulos([]);
        return;
      }
      if (total > LOTE_MAX) {
        toast.error(
          `O filtro retornou ${total} títulos. Refine os filtros para no máximo ${LOTE_MAX}.`,
        );
        return;
      }
      const selecionados = await carregarTitulosPorIds(ids, tituloElegivelWhatsApp);
      setSelectedTitulos(selecionados);
      toast.success(`${selecionados.length} título(s) selecionado(s) para WhatsApp.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao listar títulos elegíveis.");
    } finally {
      setSelecionandoTodos(false);
    }
  };

  const enviarWhatsApp = async (row: TituloCobranca) => {
    setActionLoading(true);
    try {
      const resultado = await finService.enfileirarWhatsAppCobrancaParcela(row.id);
      if (resultado.enfileirado) {
        toast.success("Cobrança enfileirada para envio por WhatsApp.");
      } else {
        toast.warning(resultado.mensagem ?? "Não foi possível enfileirar o envio.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enfileirar WhatsApp.");
    } finally {
      setActionLoading(false);
    }
  };

  const abrirWhatsAppLote = () => {
    if (titulosWhatsAppSelecionados.length === 0) {
      toast.info("Selecione títulos na situação Emitido.");
      return;
    }
    if (titulosWhatsAppSelecionados.length > LOTE_MAX) {
      toast.error(`Selecione no máximo ${LOTE_MAX} títulos por operação.`);
      return;
    }
    setWhatsappLoteResultado(null);
    setWhatsappLoteDialogOpen(true);
  };

  const fecharWhatsAppLoteDialog = () => {
    setWhatsappLoteDialogOpen(false);
    setWhatsappLoteResultado(null);
    if (whatsappLoteResultado && whatsappLoteResultado.enfileirados > 0) {
      setSelectedTitulos([]);
    }
  };

  const confirmarWhatsAppLote = async () => {
    if (titulosWhatsAppSelecionados.length === 0) return;
    setActionLoading(true);
    try {
      const resultado = await finService.enfileirarWhatsAppCobrancaParcelaEmLote(
        titulosWhatsAppSelecionados.map((t) => t.id),
      );
      setWhatsappLoteResultado(resultado);
      if (resultado.falhas === 0) {
        toast.success(`${resultado.enfileirados} envio(s) enfileirado(s) na fila do WhatsApp.`);
      } else if (resultado.enfileirados > 0) {
        toast.warning(
          `${resultado.enfileirados} enfileirado(s), ${resultado.falhas} falha(s). Veja o detalhe.`,
        );
      } else {
        toast.error("Nenhum envio foi enfileirado.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enfileirar WhatsApp em lote.");
    } finally {
      setActionLoading(false);
    }
  };

  const abrirEmailLote = () => {
    if (titulosWhatsAppSelecionados.length === 0) {
      toast.info("Selecione títulos na situação Emitido.");
      return;
    }
    if (titulosWhatsAppSelecionados.length > LOTE_MAX) {
      toast.error(`Selecione no máximo ${LOTE_MAX} títulos por operação.`);
      return;
    }
    setEmailLoteResultado(null);
    setEmailLoteDialogOpen(true);
  };

  const fecharEmailLoteDialog = () => {
    setEmailLoteDialogOpen(false);
    setEmailLoteResultado(null);
    if (emailLoteResultado && emailLoteResultado.emailsEnfileirados > 0) {
      setSelectedTitulos([]);
    }
  };

  const confirmarEmailLote = async () => {
    if (titulosWhatsAppSelecionados.length === 0) return;
    setActionLoading(true);
    try {
      const resultado = await finService.enfileirarEmailCobrancaParcelaEmLote(
        titulosWhatsAppSelecionados.map((t) => t.id),
      );
      setEmailLoteResultado(resultado);
      if (resultado.emailsFalhas === 0) {
        toast.success(
          `${resultado.emailsEnfileirados} e-mail(s) enfileirado(s) na fila de envio.`,
        );
      } else if (resultado.emailsEnfileirados > 0) {
        toast.warning(
          `${resultado.emailsEnfileirados} enfileirado(s), ${resultado.emailsFalhas} falha(s). Veja o detalhe.`,
        );
      } else {
        toast.error("Nenhum e-mail foi enfileirado.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enfileirar e-mail em lote.");
    } finally {
      setActionLoading(false);
    }
  };

  const abrirPdfLote = () => {
    if (titulosPdfSelecionados.length === 0) {
      toast.info("Selecione títulos com boleto/PDF disponível para download.");
      return;
    }
    if (titulosPdfSelecionados.length > LOTE_MAX) {
      toast.error(`Selecione no máximo ${LOTE_MAX} títulos por operação.`);
      return;
    }
    setPdfLoteResultado(null);
    setPdfLoteDialogOpen(true);
  };

  const fecharPdfLoteDialog = () => {
    setPdfLoteDialogOpen(false);
    setPdfLoteResultado(null);
  };

  const confirmarPdfLote = async () => {
    if (titulosPdfSelecionados.length === 0) return;
    setActionLoading(true);
    try {
      const outcome = await finService.downloadPdfLote(
        titulosPdfSelecionados.map((t) => t.id),
      );
      if (outcome.ok) {
        toast.success(`PDF mesclado baixado (${outcome.filename}).`);
        setPdfLoteDialogOpen(false);
        setPdfLoteResultado(null);
        setSelectedTitulos([]);
      } else {
        setPdfLoteResultado(outcome.resultado);
        toast.error("Não foi possível mesclar todos os boletos. Veja o detalhe.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao baixar PDF em lote.");
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

    if (row.status === "RASCUNHO" || row.status === "ERRO_REGISTRO") {
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

    if (podeBaixarPdfBoleto(row.status)) {
      items.push(
        dashboardActionMenuItem({
          label: row.urlBoleto?.trim() ? "Abrir boleto" : "Baixar PDF",
          icon: (
            <Download size={16} className="text-amber-400 transition-transform group-hover:scale-110" />
          ),
          onClick: () => void baixarPdf(row.id, row.urlBoleto, row.status),
          disabled: actionLoading,
        }),
      );
    }

    if (tituloElegivelWhatsApp(row.status)) {
      items.push(
        dashboardActionMenuItem({
          label: "Enviar WhatsApp",
          icon: (
            <MessageCircle
              size={16}
              className="text-emerald-400 transition-transform group-hover:scale-110"
            />
          ),
          onClick: () => void enviarWhatsApp(row),
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

  const validarFormNovoTitulo = (): number | null => {
    if (!contexto) {
      toast.error("Selecione empreendimento, quadra e lote válidos.");
      return null;
    }
    if (contexto.avisoConvenio) {
      toast.error(contexto.avisoConvenio);
      return null;
    }
    if (contexto.primeiroTituloLote && !dataPrimeiraParcela) {
      toast.error("Informe a data da 1ª parcela.");
      return null;
    }
    if (maxParcelasPermitidas < 1) {
      toast.error(
        `A parcela ${parcelaReajusteLimite} exige reajuste IPCA antes da emissão. Gere essa parcela individualmente após o reajuste.`,
      );
      return null;
    }
    const qtd = Math.floor(quantidadeParcelas);
    if (!Number.isFinite(qtd) || qtd < 1 || qtd > maxParcelasPermitidas) {
      toast.error(
        `Informe entre 1 e ${maxParcelasPermitidas} parcela(s) (até a parcela ${ultimaParcelaEmitivel}; a ${parcelaReajusteLimite}ª só após reajuste IPCA).`,
      );
      return null;
    }
    return qtd;
  };

  const irParaConfirmacao = () => {
    if (validarFormNovoTitulo() == null) return;
    setNovoTituloStep("confirm");
  };

  const confirmarCriacaoTitulos = async () => {
    const qtd = validarFormNovoTitulo();
    if (qtd == null || !contexto) return;
    setSaving(true);
    try {
      const resultado = await finService.criarTitulosEmLote({
        contratoId: contexto.contratoId,
        quantidadeParcelas: qtd,
        ...(contexto.primeiroTituloLote && dataPrimeiraParcela
          ? { dataPrimeiraParcela: formatIsoDate(dataPrimeiraParcela) }
          : {}),
      });
      setPage(0);
      setStatusFilter("RASCUNHO");
      onShowNovoChange?.(false);
      resetNovoForm();
      await load(true, { page: 0, status: "RASCUNHO" });
      toast.success(
        `${resultado.quantidadeCriada} título(s) criado(s) em rascunho (parcelas ${resultado.parcelaInicial}–${resultado.parcelaFinal}).`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar títulos.");
      if (selectedEmpreendimento && selectedQuadra && selectedLote != null) {
        try {
          const ctx = await finService.contextoLote(
            selectedEmpreendimento,
            selectedQuadra,
            selectedLote,
          );
          setContexto(ctx);
        } catch {
          /* mantém contexto anterior */
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const totalRecords = pageData?.totalElements ?? 0;
  const range = pageData ? springPageDisplayRange(pageData) : { from: 0, to: 0 };

  const confirmarMarcarVencidos = async () => {
    setMarcandoVencidos(true);
    try {
      const { marcados } = await finService.marcarTitulosVencidos();
      setMarcarVencidosDialogOpen(false);
      if (marcados > 0) {
        toast.success(
          marcados === 1
            ? "1 título atualizado para Vencido."
            : `${marcados} títulos atualizados para Vencido.`,
        );
        await load(true);
      } else {
        toast.info("Nenhum título EMITIDO em atraso para atualizar.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao marcar títulos vencidos.");
    } finally {
      setMarcandoVencidos(false);
    }
  };

  return (
    <>
      <div className={cn("flex flex-col gap-5", !embedded && "px-4")}>
        <div className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-white/40">
              <span className="font-bold text-white">{totalRecords}</span> títulos encontrados
              {totalRecords > 0 ? (
                <span className="text-white/30">
                  {" "}
                  · a mostrar {range.from}–{range.to}
                </span>
              ) : null}
            </p>
            <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
              <button
                type="button"
                onClick={() => setMarcarVencidosDialogOpen(true)}
                disabled={marcandoVencidos || refreshing}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-rose-200 transition-all hover:bg-rose-500/20 disabled:pointer-events-none disabled:opacity-50"
              >
                <CalendarClock
                  size={14}
                  className={cn("shrink-0", marcandoVencidos && "animate-pulse")}
                />
                {marcandoVencidos ? "A processar…" : "Marcar vencidos"}
              </button>
              <button
                type="button"
                onClick={() => void load(true)}
                disabled={refreshing || marcandoVencidos}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white/70 transition-all hover:bg-white/10 disabled:pointer-events-none disabled:opacity-50"
              >
                <RefreshCw size={14} className={cn("shrink-0", refreshing && "animate-spin")} />
                Atualizar
              </button>
            </div>
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
              <label
                htmlFor="titulo-venc-de"
                className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35"
              >
                Vencimento de
              </label>
              <input
                id="titulo-venc-de"
                type="date"
                value={filterVencimentoDe}
                onChange={(e) => setFilterVencimentoDe(e.target.value)}
                className={FILTER_DATE_CLASS}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="titulo-venc-ate"
                className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35"
              >
                Vencimento até
              </label>
              <input
                id="titulo-venc-ate"
                type="date"
                value={filterVencimentoAte}
                onChange={(e) => setFilterVencimentoAte(e.target.value)}
                className={FILTER_DATE_CLASS}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="titulo-emissao-de"
                className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35"
              >
                Emissão de
              </label>
              <input
                id="titulo-emissao-de"
                type="date"
                value={filterEmissaoDe}
                onChange={(e) => setFilterEmissaoDe(e.target.value)}
                className={FILTER_DATE_CLASS}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="titulo-emissao-ate"
                className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35"
              >
                Emissão até
              </label>
              <input
                id="titulo-emissao-ate"
                type="date"
                value={filterEmissaoAte}
                onChange={(e) => setFilterEmissaoAte(e.target.value)}
                className={FILTER_DATE_CLASS}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={FILTER_DATE_CLASS}
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

        {selectedTitulos.length > 0 ? (
          <div className="flex flex-col gap-3 rounded-[1.25rem] border border-emerald-500/20 bg-emerald-500/[0.06] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-white/70">
              <span className="font-bold text-emerald-300">{selectedTitulos.length}</span> título
              {selectedTitulos.length === 1 ? "" : "s"} selecionado
              {selectedTitulos.length === 1 ? "" : "s"}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedTitulos([])}
                disabled={actionLoading || selecionandoTodos}
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white/60 transition hover:bg-white/10 disabled:opacity-50"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={() => void selecionarTodosDoFiltro()}
                disabled={actionLoading || selecionandoTodos}
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white/70 transition hover:bg-white/10 disabled:opacity-50"
              >
                {selecionandoTodos ? "A carregar…" : "Rascunhos do filtro"}
              </button>
              <button
                type="button"
                onClick={() => void selecionarTodosWhatsAppDoFiltro()}
                disabled={actionLoading || selecionandoTodos}
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white/70 transition hover:bg-white/10 disabled:opacity-50"
              >
                {selecionandoTodos ? "A carregar…" : "Emitidos (WhatsApp)"}
              </button>
              <button
                type="button"
                onClick={abrirRegistrarLote}
                disabled={
                  actionLoading || selecionandoTodos || titulosRegistraveisSelecionados.length === 0
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500 disabled:opacity-50"
              >
                <FileCheck size={14} />
                Registrar em lote
              </button>
              <button
                type="button"
                onClick={abrirEmailLote}
                disabled={
                  actionLoading || selecionandoTodos || titulosWhatsAppSelecionados.length === 0
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-sky-200 transition hover:bg-sky-500/20 disabled:opacity-50"
              >
                <Mail size={14} />
                Enviar e-mail
              </button>
              <button
                type="button"
                onClick={abrirWhatsAppLote}
                disabled={
                  actionLoading || selecionandoTodos || titulosWhatsAppSelecionados.length === 0
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-emerald-200 transition hover:bg-emerald-500/20 disabled:opacity-50"
              >
                <MessageCircle size={14} />
                Enviar WhatsApp
              </button>
              <button
                type="button"
                onClick={abrirPdfLote}
                disabled={
                  actionLoading || selecionandoTodos || titulosPdfSelecionados.length === 0
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-amber-200 transition hover:bg-amber-500/20 disabled:opacity-50"
              >
                <Download size={14} />
                Baixar PDF em lote
              </button>
            </div>
          </div>
        ) : null}

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
            scrollable
            tableStyle={{ minWidth: "64rem" }}
            responsiveLayout="scroll"
            className={DASHBOARD_DATATABLE_CLASS}
            pt={TABLE_PT}
            rowHover
            selection={selectedTitulos}
            selectionMode="checkbox"
            onSelectionChange={(e) => {
              const next = (e.value ?? []) as TituloCobranca[];
              if (next.length > LOTE_MAX) {
                toast.error(`Selecione no máximo ${LOTE_MAX} títulos por operação.`);
                return;
              }
              setSelectedTitulos(next.filter((t) => tituloSelecionavel(t.status)));
            }}
            isDataSelectable={(e) => tituloSelecionavel((e.data as TituloCobranca).status)}
          >
            <Column selectionMode="multiple" headerStyle={{ width: "3rem" }} />
            {!embedded ? (
              <Column
                header="Contrato"
                body={(row: TituloCobranca) =>
                  dashboardCellMono(formatContratoRef(row.numeroContrato, row.contratoId))
                }
                style={{ width: "6.5rem", maxWidth: "6.5rem" }}
              />
            ) : null}
            <Column
              field="numeroParcela"
              header="Parc."
              style={{ width: "3.5rem", maxWidth: "3.5rem" }}
            />
            <Column
              header="Nosso nº"
              body={(row: TituloCobranca) => dashboardCellMono(row.nossoNumero)}
              style={{ width: "7.5rem", maxWidth: "7.5rem" }}
            />
            <Column
              header="Emissão"
              body={(row: TituloCobranca) => dashboardCellText(formatDate(row.cadastroEm))}
              style={{ width: "6rem", maxWidth: "6rem" }}
            />
            <Column
              header="Usuário"
              body={(row: TituloCobranca) =>
                dashboardCellText(row.usuarioNome?.trim() || "—", {
                  title: row.usuarioNome ?? undefined,
                })
              }
              style={{ width: "9rem", maxWidth: "9rem" }}
            />
            {embedded ? (
              <Column
                header="Convênio"
                body={(row: TituloCobranca) => dashboardCellText(row.convenioNome || "—")}
                style={{ width: "8rem", maxWidth: "8rem" }}
              />
            ) : null}
            <Column
              header="Vencimento"
              body={(row: TituloCobranca) => dashboardCellText(formatDate(row.vencimento))}
              style={{ width: "6rem", maxWidth: "6rem" }}
            />
            <Column
              header="Valor"
              body={(row: TituloCobranca) => dashboardCellText(formatMoney(row.valorNominal))}
              style={{ width: "7rem", maxWidth: "7rem" }}
            />
            <Column
              header="Status"
              body={(row: TituloCobranca) => dashboardStatusBadge(row.status, STATUS_TONES)}
              style={{ width: "7.5rem", maxWidth: "7.5rem" }}
            />
            <Column
              header="Ações"
              body={actionBodyTemplate}
              align="right"
              style={{ width: "4rem", maxWidth: "4rem" }}
            />
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
          convenioNome={tituloParaRegistrar?.convenioNome}
          onConfirm={() => void confirmarRegistrar()}
          loading={actionLoading}
        />

        <TituloRegistrarLoteDialog
          visible={registrarLoteDialogOpen}
          onHide={fecharRegistrarLoteDialog}
          titulos={titulosRegistraveisSelecionados}
          resultado={registrarLoteResultado}
          onConfirm={() => void confirmarRegistrarLote()}
          loading={actionLoading}
        />

        <TituloEmailLoteDialog
          visible={emailLoteDialogOpen}
          onHide={fecharEmailLoteDialog}
          titulos={titulosWhatsAppSelecionados}
          resultado={emailLoteResultado}
          onConfirm={() => void confirmarEmailLote()}
          loading={actionLoading}
        />

        <TituloWhatsAppLoteDialog
          visible={whatsappLoteDialogOpen}
          onHide={fecharWhatsAppLoteDialog}
          titulos={titulosWhatsAppSelecionados}
          resultado={whatsappLoteResultado}
          onConfirm={() => void confirmarWhatsAppLote()}
          loading={actionLoading}
        />

        <TituloPdfLoteDialog
          visible={pdfLoteDialogOpen}
          onHide={fecharPdfLoteDialog}
          titulos={titulosPdfSelecionados}
          resultado={pdfLoteResultado}
          onConfirm={() => void confirmarPdfLote()}
          loading={actionLoading}
        />
      </div>

      {!embedded && onShowNovoChange ? (
      <DashboardDialog
        header={
          novoTituloStep === "confirm"
            ? "Confirmar geração de títulos"
            : "Novo título de cobrança"
        }
        visible={showNovo}
        onHide={() => {
          onShowNovoChange(false);
          resetNovoForm();
        }}
        className={cn(
          "w-full border border-white/10 bg-[#071C33] shadow-2xl",
          novoTituloStep === "confirm" ? "max-w-lg" : "max-w-md",
        )}
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
            {novoTituloStep === "form" ? (
              <>
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
                  disabled={
                    !contexto ||
                    contextoLoading ||
                    !!contexto?.avisoConvenio ||
                    maxParcelasPermitidas < 1 ||
                    quantidadeParcelas < 1 ||
                    (contexto?.primeiroTituloLote && !dataPrimeiraParcela)
                  }
                  onClick={irParaConfirmacao}
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500 disabled:pointer-events-none disabled:opacity-50"
                >
                  Revisar
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setNovoTituloStep("form")}
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white/60 transition hover:border-white/15 hover:bg-white/[0.08] hover:text-white/90 disabled:pointer-events-none disabled:opacity-50"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  disabled={saving || !contexto || !previewLote || !!contexto.avisoConvenio}
                  onClick={() => void confirmarCriacaoTitulos()}
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500 disabled:pointer-events-none disabled:opacity-50"
                >
                  {saving
                    ? "A criar…"
                    : previewLote && previewLote.quantidade > 1
                      ? `Confirmar ${previewLote.quantidade} títulos`
                      : "Confirmar título"}
                </button>
              </>
            )}
          </div>
        }
        modal
        draggable={false}
      >
        <div className="flex flex-col gap-5">
          {novoTituloStep === "form" ? (
            <>
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
                  Próxima parcela
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
              {contexto.primeiroTituloLote ? (
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
                    Data da 1ª parcela
                  </label>
                  <p className="text-xs text-white/40">
                    Valor do contrato; pode ajustar antes de gerar. As parcelas seguintes vencem no dia{" "}
                    {contexto.diaVencimentoMensal} de cada mês (dia útil se cair em fim de semana).
                  </p>
                  <Calendar
                    value={dataPrimeiraParcela}
                    onChange={(e) => setDataPrimeiraParcela(e.value ?? null)}
                    dateFormat="dd/mm/yy"
                    showIcon
                    className="w-full"
                    inputClassName="w-full border-white/10 bg-white/[0.05] p-3 text-white placeholder:text-white/25"
                  />
                </div>
              ) : null}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
                  Quantidade de parcelas
                </label>
                <p className="text-xs text-white/40">
                  Vencimento no dia {contexto.diaVencimentoMensal} de cada mês (conforme contrato).
                  Se cair em fim de semana, usa a segunda-feira seguinte.
                  {maxParcelasPermitidas > 0 ? (
                    <>
                      {" "}
                      Máximo de {maxParcelasPermitidas} parcela(s) até a {ultimaParcelaEmitivel}ª (a{" "}
                      {parcelaReajusteLimite}ª só após reajuste IPCA).
                    </>
                  ) : null}
                </p>
                {maxParcelasPermitidas < 1 ? (
                  <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs text-amber-200/90">
                    A próxima parcela ({parcelaReajusteLimite}) exige reajuste IPCA antes da emissão.
                    Não é possível gerar títulos em lote neste momento.
                  </p>
                ) : (
                  <InputNumber
                    value={quantidadeParcelas}
                    onValueChange={(e) => {
                      const raw = e.value ?? 1;
                      setQuantidadeParcelas(Math.min(Math.max(1, raw), maxParcelasPermitidas));
                    }}
                    min={1}
                    max={maxParcelasPermitidas}
                    className="w-full"
                    inputClassName="w-full border-white/10 bg-white/[0.05] p-3 text-white placeholder:text-white/25 focus:border-emerald-500/40"
                    useGrouping={false}
                    disabled={contextoLoading}
                  />
                )}
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
                  Convênio (empreendimento)
                </label>
                {contexto.avisoConvenio ? (
                  <p className="mt-2 text-sm text-amber-300/90">{contexto.avisoConvenio}</p>
                ) : (
                  <p className="mt-1 text-sm font-medium text-white/80">
                    {contexto.convenioNome ?? "—"}
                  </p>
                )}
              </div>
            </>
          )}
            </>
          ) : contexto && previewLote ? (
            <div className="flex flex-col gap-5">
              <p className="text-sm text-white/50">
                Confira os dados abaixo antes de gerar os títulos em rascunho.
              </p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                    Lote
                  </dt>
                  <dd className="mt-0.5 text-white/80">
                    {selectedEmpreendimento} · Q{contexto.quadra} L{contexto.lote}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                    Contrato
                  </dt>
                  <dd className="mt-0.5 text-white/80">
                    {formatContratoRef(contexto.numeroContrato, contexto.contratoId)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                    Convênio
                  </dt>
                  <dd className="mt-0.5 text-white/80">
                    {contexto.avisoConvenio
                      ? "—"
                      : (contexto.convenioNome ?? "—")}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                    Dia de vencimento
                  </dt>
                  <dd className="mt-0.5 text-white/80">Dia {contexto.diaVencimentoMensal}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                    Total nominal
                  </dt>
                  <dd className="mt-0.5 font-semibold text-emerald-300">
                    {formatMoney(previewLote.valorTotal)}
                  </dd>
                </div>
              </dl>
              <div className="overflow-hidden rounded-xl border border-white/10">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-[#0a2540] text-[10px] font-bold uppercase tracking-widest text-white/40">
                      <tr>
                        <th className="px-4 py-3">Parcela</th>
                        <th className="px-4 py-3">Vencimento</th>
                        <th className="px-4 py-3 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06] text-white/70">
                      {previewLote.itensRevisao.map((item) => (
                        <tr
                          key={item.parcela}
                          className={cn(
                            "bg-white/[0.02]",
                            item.excedente &&
                              "bg-violet-500/[0.08] ring-1 ring-inset ring-violet-500/25 opacity-80",
                            !item.excedente &&
                              item.ajustadoPorDiaUtil &&
                              "bg-amber-500/[0.08] ring-1 ring-inset ring-amber-500/25",
                          )}
                        >
                          <td className="px-4 py-2.5 font-mono">
                            <span className={cn(item.excedente && "text-violet-200/90")}>
                              {item.parcela}
                            </span>
                            {item.excedente ? (
                              <span className="ml-2 text-[10px] font-medium text-violet-300/90">
                                {item.parcelaReajuste
                                  ? "Reajuste IPCA — não será gerada"
                                  : "Fora deste lote — não será gerada"}
                              </span>
                            ) : null}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex flex-col gap-1">
                              <span
                                className={cn(
                                  item.excedente && "text-violet-200/70 line-through decoration-violet-400/40",
                                  !item.excedente &&
                                    item.ajustadoPorDiaUtil &&
                                    "font-medium text-amber-100",
                                )}
                              >
                                {formatDate(item.vencimento)}
                              </span>
                              {!item.excedente && item.ajustadoPorDiaUtil ? (
                                <span className="text-[10px] font-medium text-amber-300/90">
                                  Seria {formatDate(item.vencimentoBruto)} (
                                  {diaSemanaCurto(parseIsoDate(item.vencimentoBruto))}) — fim de semana
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td
                            className={cn(
                              "px-4 py-2.5 text-right",
                              item.excedente && "text-violet-200/50 line-through decoration-violet-400/40",
                            )}
                          >
                            {formatMoney(item.valor)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {previewLote.ajustadosPorDiaUtil > 0 ? (
                <p className="text-xs text-amber-300/90">
                  {previewLote.ajustadosPorDiaUtil} vencimento(s) em destaque caíam em fim de semana e
                  foram ajustados para a segunda-feira seguinte.
                </p>
              ) : null}
              {previewLote.itensExcedentes.length > 0 ? (
                <p className="text-xs text-violet-300/90">
                  {previewLote.itensExcedentes.length} parcela(s) em destaque violeta não entram neste
                  lote
                  {previewLote.itensExcedentes.some((i) => i.parcelaReajuste)
                    ? ` (a ${previewLote.parcelaReajusteLimite}ª exige reajuste IPCA antes da emissão)`
                    : ""}
                  .
                </p>
              ) : null}
              <p className="text-xs text-white/35">
                Emissão em lote até a parcela {previewLote.ultimaParcelaEmitivel}. A parcela{" "}
                {previewLote.parcelaReajusteLimite} só pode ser gerada após reajuste IPCA.
              </p>
              <p className="text-xs text-white/35">
                {previewLote.quantidade} título(s) serão criados com status{" "}
                <span className="text-white/50">Rascunho</span>.
              </p>
            </div>
          ) : null}
        </div>
      </DashboardDialog>
      ) : null}

      <DashboardConfirmDialog
        visible={marcarVencidosDialogOpen}
        onHide={() => setMarcarVencidosDialogOpen(false)}
        onConfirm={() => void confirmarMarcarVencidos()}
        header="Marcar títulos vencidos"
        tone="warning"
        confirmLabel="Marcar vencidos"
        loading={marcandoVencidos}
        message={
          <p>
            Todos os títulos com status <span className="font-semibold text-white">Emitido</span> e data de
            vencimento anterior a hoje passarão para{" "}
            <span className="font-semibold text-rose-300">Vencido</span>.
          </p>
        }
      />
    </>
  );
}
