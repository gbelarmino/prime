"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable, type DataTablePageEvent } from "primereact/datatable";
import { Column } from "primereact/column";
import { DashboardDialog } from "@/components/dashboard/DashboardDialog";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { TabPanel, TabView } from "primereact/tabview";
import { toast } from "sonner";
import { Link2, PlusCircle, RefreshCw, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardDataTableShell } from "@/components/dashboard/DashboardDataTableShell";
import {
  DASHBOARD_DATATABLE_CLASS,
  DASHBOARD_DATATABLE_INSET_SHELL_CLASS,
  DASHBOARD_TABVIEW_CLASS,
  dashboardCellMono,
  dashboardCellText,
  dashboardDataTablePt,
  dashboardStatusBadge,
  dashboardTabHeader,
  dashboardTabViewPt,
} from "@/lib/dashboard-datatable";
import {
  finService,
  type ConvenioBanco,
  type TituloCobranca,
  type TituloContextoLote,
  type UnicredWebhookConciliacaoDetalhe,
  type UnicredWebhookConciliacaoResumo,
  type UnicredWebhookConciliacaoStatus,
} from "@/lib/fin-service";
import type { SpringPage } from "@/lib/spring-page";
import { springPageDisplayRange } from "@/lib/spring-page";
import { notifyUnicredWebhookPendentesChanged } from "@/hooks/use-unicred-webhook-pendentes";

const STATUS_OPTIONS: { label: string; value: UnicredWebhookConciliacaoStatus | "" }[] = [
  { label: "Pendentes", value: "PENDENTE" },
  { label: "Automático", value: "AUTO" },
  { label: "Vinculados", value: "VINCULADO" },
  { label: "Criados", value: "CRIADO" },
  { label: "Ignorados", value: "IGNORADO" },
  { label: "Não aplicável", value: "NAO_APLICAVEL" },
];

const STATUS_TONES: Record<string, string> = {
  PENDENTE: "border-amber-500/25 bg-amber-500/15 text-amber-300",
  AUTO: "border-emerald-500/25 bg-emerald-500/15 text-emerald-300",
  VINCULADO: "border-blue-500/25 bg-blue-500/15 text-blue-300",
  CRIADO: "border-violet-500/25 bg-violet-500/15 text-violet-300",
  IGNORADO: "border-white/15 bg-white/5 text-white/50",
  NAO_APLICAVEL: "border-white/10 bg-white/[0.03] text-white/40",
};

const STATUS_LABELS: Record<string, string> = {
  PENDENTE: "Pendente",
  AUTO: "Automático",
  VINCULADO: "Vinculado",
  CRIADO: "Criado",
  IGNORADO: "Ignorado",
  NAO_APLICAVEL: "Não aplicável",
};

const FORM_LABEL_CLASS = "text-[10px] font-bold uppercase tracking-[0.2em] text-white/35";
const FORM_INPUT_CLASS =
  "w-full rounded-xl border border-white/10 bg-white/[0.05] p-3 text-sm text-white placeholder:text-white/25";

const DIALOG_PT = {
  header: {
    className:
      "border-b border-white/[0.06] bg-transparent px-6 py-5 font-[family-name:var(--font-playfair)] text-xl font-semibold text-white",
  },
  content: { className: "bg-transparent px-6 py-6" },
  footer: { className: "border-t border-white/[0.06] bg-transparent px-6 py-5" },
  mask: { className: "backdrop-blur-sm bg-black/40" },
};

const DROPDOWN_PT = {
  input: { className: FORM_INPUT_CLASS },
};

const TABVIEW_PT = dashboardTabViewPt();
const PAGE_SIZE = 20;
const TABLE_PT = dashboardDataTablePt();

const BTN_SECONDARY =
  "inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white/60 transition hover:border-white/15 hover:bg-white/[0.08] hover:text-white/90 disabled:opacity-50";

const BTN_PRIMARY =
  "inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500 disabled:pointer-events-none disabled:opacity-50";

function formatMoney(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

export function UnicredWebhookConciliacaoWorkspace() {
  const router = useRouter();
  const [statusFiltro, setStatusFiltro] = useState<UnicredWebhookConciliacaoStatus | "">("PENDENTE");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageData, setPageData] = useState<SpringPage<UnicredWebhookConciliacaoResumo> | null>(null);
  const [pendentes, setPendentes] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<UnicredWebhookConciliacaoDetalhe | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTabIndex, setDialogTabIndex] = useState(0);
  const [tituloSelecionado, setTituloSelecionado] = useState<TituloCobranca | null>(null);
  const [tituloIdManual, setTituloIdManual] = useState("");
  const [observacao, setObservacao] = useState("");
  const [convenios, setConvenios] = useState<ConvenioBanco[]>([]);
  const [criarContratoId, setCriarContratoId] = useState<number | null>(null);
  const [criarParcela, setCriarParcela] = useState<number | null>(null);
  const [criarConvenioId, setCriarConvenioId] = useState<string | null>(null);
  const [criarValor, setCriarValor] = useState<number | null>(null);
  const [criarVencimento, setCriarVencimento] = useState("");
  const [empreendimento, setEmpreendimento] = useState("");
  const [quadra, setQuadra] = useState("");
  const [lote, setLote] = useState<number | null>(null);
  const [contextoLote, setContextoLote] = useState<TituloContextoLote | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const carregarLista = useCallback(async () => {
    setLoading(true);
    try {
      const [lista, cont] = await Promise.all([
        finService.listUnicredWebhookConciliacao(
          pageIndex,
          PAGE_SIZE,
          statusFiltro || "PENDENTE",
          { skipLoading: true },
        ),
        finService.contagemUnicredWebhookPendentes(),
      ]);
      setPageData(lista);
      setPendentes(cont.pendentes);
      notifyUnicredWebhookPendentesChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar fila");
    } finally {
      setLoading(false);
    }
  }, [statusFiltro, pageIndex]);

  useEffect(() => {
    void carregarLista();
  }, [carregarLista]);

  useEffect(() => {
    finService
      .listConvenios()
      .then((lista) => setConvenios(lista.filter((c) => c.tipoIntegracao === "UNICRED")))
      .catch(() => {});
  }, []);

  const abrirDetalhe = async (id: string) => {
    setSelectedId(id);
    setDialogOpen(true);
    setTituloSelecionado(null);
    setTituloIdManual("");
    setDialogTabIndex(0);
    setObservacao("");
    try {
      const d = await finService.getUnicredWebhookConciliacao(id, { skipLoading: true });
      setDetalhe(d);
      const r = d.resumo;
      setCriarValor(r.valorTitulo ?? r.valorRecebido ?? null);
      setCriarVencimento(r.dataLiquidacao?.slice(0, 10) ?? "");
      const unicred = convenios.find((c) => c.tipoIntegracao === "UNICRED");
      if (unicred) setCriarConvenioId(unicred.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao abrir detalhe");
      setDialogOpen(false);
    }
  };

  const buscarContextoLote = async () => {
    if (!quadra.trim() || lote == null) {
      toast.error("Informe quadra e lote");
      return;
    }
    try {
      const ctx = await finService.contextoLote(empreendimento.trim(), quadra.trim(), lote);
      setContextoLote(ctx);
      setCriarContratoId(ctx.contratoId);
      setCriarParcela(ctx.numeroParcela);
      if (ctx.valorNominal != null && criarValor == null) setCriarValor(ctx.valorNominal);
      if (ctx.vencimentoSugerido && !criarVencimento) setCriarVencimento(ctx.vencimentoSugerido);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lote não encontrado");
      setContextoLote(null);
    }
  };

  const fecharDialog = () => {
    setDialogOpen(false);
    setSelectedId(null);
    setDetalhe(null);
  };

  const executarVincular = async () => {
    const tituloId = tituloSelecionado?.id ?? tituloIdManual.trim();
    if (!selectedId || !tituloId) {
      toast.error("Selecione um título ou informe o UUID");
      return;
    }
    setActionLoading(true);
    try {
      const titulo = await finService.vincularUnicredWebhook(selectedId, {
        tituloId,
        observacao: observacao.trim() || undefined,
      });
      toast.success("Webhook vinculado e movimento aplicado");
      fecharDialog();
      await carregarLista();
      router.push(`/dashboard/financeiro/titulos/detalhe?id=${titulo.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao vincular");
    } finally {
      setActionLoading(false);
    }
  };

  const executarCriar = async () => {
    if (!selectedId || criarContratoId == null || criarParcela == null) {
      toast.error("Informe contrato e parcela (use busca por lote)");
      return;
    }
    setActionLoading(true);
    try {
      const titulo = await finService.criarTituloUnicredWebhook(selectedId, {
        contratoId: criarContratoId,
        numeroParcela: criarParcela,
        convenioId: criarConvenioId ?? undefined,
        valorNominal: criarValor ?? undefined,
        vencimento: criarVencimento || undefined,
        observacao: observacao.trim() || undefined,
      });
      toast.success("Título criado e evento aplicado");
      fecharDialog();
      await carregarLista();
      router.push(`/dashboard/financeiro/titulos/detalhe?id=${titulo.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao criar título");
    } finally {
      setActionLoading(false);
    }
  };

  const executarIgnorar = async () => {
    if (!selectedId) return;
    setActionLoading(true);
    try {
      await finService.ignorarUnicredWebhook(selectedId, observacao.trim() || undefined);
      toast.success("Evento ignorado");
      fecharDialog();
      await carregarLista();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao ignorar");
    } finally {
      setActionLoading(false);
    }
  };

  const executarReprocessar = async () => {
    if (!selectedId) return;
    setActionLoading(true);
    try {
      const titulo = await finService.reprocessarUnicredWebhook(selectedId);
      toast.success("Reprocessado com sucesso");
      fecharDialog();
      await carregarLista();
      router.push(`/dashboard/financeiro/titulos/detalhe?id=${titulo.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível reprocessar");
    } finally {
      setActionLoading(false);
    }
  };

  const statusBody = (row: UnicredWebhookConciliacaoResumo) =>
    dashboardStatusBadge(
      STATUS_LABELS[row.statusConciliacao ?? "PENDENTE"] ?? row.statusConciliacao ?? "—",
      STATUS_TONES,
    );

  const movimentoBody = (row: UnicredWebhookConciliacaoResumo) => (
    <div>
      <p className="text-sm text-white">{row.codigoMovimentoDescricao ?? row.codigoMovimento}</p>
      {row.liquidacao ? (
        <p className="text-[10px] uppercase tracking-wider text-emerald-400/80">Liquidação</p>
      ) : null}
    </div>
  );

  const rows = pageData?.content ?? [];
  const totalRecords = pageData?.totalElements ?? 0;
  const range = pageData ? springPageDisplayRange(pageData) : { from: 0, to: 0 };

  const onPage = (e: DataTablePageEvent) => {
    setPageIndex(e.page ?? 0);
  };

  const isPendente = detalhe?.resumo.statusConciliacao === "PENDENTE";
  const sugestoesCount = detalhe?.sugestoesTitulos.length ?? 0;
  const podeVincular = Boolean(tituloSelecionado?.id || tituloIdManual.trim());

  const dialogFooter = !detalhe ? undefined : isPendente ? (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={actionLoading} onClick={fecharDialog} className={BTN_SECONDARY}>
          Cancelar
        </button>
        <button
          type="button"
          disabled={actionLoading}
          onClick={() => void executarIgnorar()}
          className={BTN_SECONDARY}
        >
          Ignorar
        </button>
        <button
          type="button"
          disabled={actionLoading}
          onClick={() => void executarReprocessar()}
          className={BTN_SECONDARY}
        >
          Reprocessar
        </button>
      </div>
      {dialogTabIndex === 0 ? (
        <button
          type="button"
          disabled={actionLoading || !podeVincular}
          onClick={() => void executarVincular()}
          className={BTN_PRIMARY}
        >
          {actionLoading ? "A aplicar…" : "Vincular e aplicar"}
        </button>
      ) : (
        <button
          type="button"
          disabled={actionLoading || criarContratoId == null}
          onClick={() => void executarCriar()}
          className={BTN_PRIMARY}
        >
          {actionLoading ? "A criar…" : "Criar título e aplicar"}
        </button>
      )}
    </div>
  ) : (
    <div className="flex justify-end">
      <button type="button" onClick={fecharDialog} className={BTN_SECONDARY}>
        Fechar
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 px-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
              Situação
            </label>
            <Dropdown
              value={statusFiltro}
              options={STATUS_OPTIONS}
              optionLabel="label"
              optionValue="value"
              onChange={(e) => {
                setStatusFiltro(e.value);
                setPageIndex(0);
              }}
              className="w-48"
            />
          </div>
          <button
            type="button"
            onClick={() => void carregarLista()}
            disabled={loading}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-white hover:bg-white/10"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Atualizar
          </button>
        </div>
        <p className="text-sm text-white/40">
          <span className="font-bold text-white">{totalRecords}</span> evento(s) nesta situação
          {totalRecords > 0 ? (
            <span className="text-white/30">
              {" "}
              · a mostrar {range.from}–{range.to}
            </span>
          ) : null}
          <span className="mx-2 text-white/20">·</span>
          <span className="text-amber-300/90">
            <span className="font-mono font-semibold tabular-nums">{pendentes}</span> pendente(s)
          </span>
        </p>
      </div>

      <DashboardDataTableShell>
        <DataTable
          value={rows}
          dataKey="id"
          lazy
          paginator
          rows={PAGE_SIZE}
          totalRecords={totalRecords}
          first={pageIndex * PAGE_SIZE}
          onPage={onPage}
          loading={loading}
          className={DASHBOARD_DATATABLE_CLASS}
          pt={TABLE_PT}
          rowHover
          onRowClick={(e) => void abrirDetalhe(e.data.id)}
          emptyMessage="Nenhum evento nesta situação."
        >
          <Column
            header="Recebido"
            body={(r: UnicredWebhookConciliacaoResumo) =>
              dashboardCellText(formatDateTime(r.dataRecebimento))
            }
          />
          <Column header="Movimento" body={movimentoBody} />
          <Column
            header="Valor"
            body={(r: UnicredWebhookConciliacaoResumo) =>
              dashboardCellMono(formatMoney(r.valorRecebido ?? r.valorTitulo))
            }
          />
          <Column
            header="Pagador"
            body={(r: UnicredWebhookConciliacaoResumo) =>
              dashboardCellText(r.pagadorNome ?? r.pagadorDocumento ?? "—")
            }
          />
          <Column
            header="UUID Unicred"
            body={(r: UnicredWebhookConciliacaoResumo) =>
              dashboardCellMono(r.uuidTituloExterno?.slice(0, 12) ?? "—")
            }
          />
          <Column header="Situação" body={statusBody} />
        </DataTable>
      </DashboardDataTableShell>

      <DashboardDialog
        visible={dialogOpen}
        onHide={fecharDialog}
        header="Conciliar webhook Unicred"
        className="w-full max-w-2xl border border-white/10 bg-[#071C33] shadow-2xl"
        pt={DIALOG_PT}
        modal
        draggable={false}
        dismissableMask
        footer={dialogFooter}
      >
        {!detalhe ? (
          <p className="text-sm text-white/40 animate-pulse">A carregar evento…</p>
        ) : (
          <div className="flex flex-col gap-5 text-white">
            <p className="text-sm text-white/50">
              Liquidação recebida sem título correspondente no sistema. Vincule a um título existente
              ou crie um registro retroativo.
            </p>

            <div
              className={cn(
                DASHBOARD_DATATABLE_INSET_SHELL_CLASS,
                "grid gap-4 p-4 sm:grid-cols-2",
              )}
            >
              <div className="flex flex-col gap-1">
                <span className={FORM_LABEL_CLASS}>Movimento</span>
                <span className="text-sm text-white/90">
                  {detalhe.resumo.codigoMovimentoDescricao ?? "—"}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className={FORM_LABEL_CLASS}>Valor recebido</span>
                <span className="font-mono text-sm tabular-nums text-white/90">
                  {formatMoney(detalhe.resumo.valorRecebido)}
                </span>
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <span className={FORM_LABEL_CLASS}>Pagador</span>
                <span className="text-sm text-white/90">
                  {detalhe.resumo.pagadorNome ?? "—"}
                  {detalhe.resumo.pagadorDocumento
                    ? ` · ${detalhe.resumo.pagadorDocumento}`
                    : ""}
                </span>
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <span className={FORM_LABEL_CLASS}>UUID título (Unicred)</span>
                <span className="break-all font-mono text-xs text-white/70">
                  {detalhe.resumo.uuidTituloExterno ?? "—"}
                </span>
              </div>
            </div>

            {isPendente ? (
              <>
                <TabView
                  className={DASHBOARD_TABVIEW_CLASS}
                  pt={TABVIEW_PT}
                  activeIndex={dialogTabIndex}
                  onTabChange={(e) => setDialogTabIndex(e.index)}
                >
                  <TabPanel
                    header={dashboardTabHeader(
                      "Vincular existente",
                      sugestoesCount,
                      <Link2 />,
                    )}
                  >
                    <div className="flex flex-col gap-4">
                      <p className="text-sm text-white/45">
                        Títulos sugeridos com base no payload do webhook.
                      </p>
                      <div
                        className={cn(
                          DASHBOARD_DATATABLE_INSET_SHELL_CLASS,
                          "max-h-52 overflow-y-auto p-2",
                        )}
                      >
                        {sugestoesCount === 0 ? (
                          <p className="px-3 py-6 text-center text-sm text-white/40">
                            Nenhuma sugestão automática com os dados recebidos.
                          </p>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {detalhe.sugestoesTitulos.map((t) => (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => {
                                  setTituloSelecionado(t);
                                  setTituloIdManual(t.id);
                                }}
                                className={cn(
                                  "w-full rounded-xl border px-3 py-2.5 text-left text-sm transition",
                                  tituloSelecionado?.id === t.id
                                    ? "border-emerald-500/40 bg-emerald-500/10"
                                    : "border-white/[0.06] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.05]",
                                )}
                              >
                                <span className="font-mono text-white/85">{t.numeroContrato}</span>
                                <span className="text-white/45"> · P{t.numeroParcela}</span>
                                <span className="ml-2 tabular-nums text-white/75">
                                  {formatMoney(t.valorNominal)}
                                </span>
                                <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-white/35">
                                  {t.status}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className={FORM_LABEL_CLASS}>Ou informe o UUID do título</label>
                        <InputText
                          value={tituloIdManual}
                          placeholder="UUID do título no sistema"
                          className={cn(FORM_INPUT_CLASS, "font-mono")}
                          onChange={(e) => {
                            const id = e.target.value;
                            setTituloIdManual(id);
                            const trimmed = id.trim();
                            if (!trimmed) {
                              setTituloSelecionado(null);
                              return;
                            }
                            const found = detalhe.sugestoesTitulos.find((t) => t.id === trimmed);
                            setTituloSelecionado(found ?? ({ id: trimmed } as TituloCobranca));
                          }}
                        />
                      </div>
                    </div>
                  </TabPanel>
                  <TabPanel
                    header={dashboardTabHeader("Criar título", contextoLote ? 1 : 0, <PlusCircle />)}
                  >
                    <div className="flex flex-col gap-4">
                      <p className="text-sm text-white/45">
                        Busque o lote para preencher contrato e parcela, depois ajuste valor e
                        vencimento se necessário.
                      </p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-2 sm:col-span-2">
                          <label className={FORM_LABEL_CLASS}>Empreendimento</label>
                          <InputText
                            placeholder="Opcional"
                            value={empreendimento}
                            onChange={(e) => setEmpreendimento(e.target.value)}
                            className={FORM_INPUT_CLASS}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className={FORM_LABEL_CLASS}>Quadra</label>
                          <InputText
                            value={quadra}
                            onChange={(e) => setQuadra(e.target.value)}
                            className={FORM_INPUT_CLASS}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className={FORM_LABEL_CLASS}>Lote</label>
                          <InputNumber
                            value={lote}
                            onValueChange={(e) => setLote(e.value ?? null)}
                            className="w-full"
                            inputClassName={FORM_INPUT_CLASS}
                          />
                        </div>
                        <div className="flex items-end sm:col-span-2">
                          <button
                            type="button"
                            onClick={() => void buscarContextoLote()}
                            className={cn(BTN_SECONDARY, "w-full gap-2 sm:w-auto")}
                          >
                            <Search className="h-4 w-4" />
                            Buscar lote
                          </button>
                        </div>
                        {contextoLote ? (
                          <p className="sm:col-span-2 text-sm text-emerald-300/90">
                            Contrato {contextoLote.numeroContrato} · parcela sugerida{" "}
                            {contextoLote.numeroParcela}
                          </p>
                        ) : null}
                        <div className="flex flex-col gap-2">
                          <label className={FORM_LABEL_CLASS}>Nº parcela</label>
                          <InputNumber
                            value={criarParcela}
                            onValueChange={(e) => setCriarParcela(e.value ?? null)}
                            className="w-full"
                            inputClassName={FORM_INPUT_CLASS}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className={FORM_LABEL_CLASS}>Valor nominal</label>
                          <InputNumber
                            value={criarValor}
                            onValueChange={(e) => setCriarValor(e.value ?? null)}
                            mode="currency"
                            currency="BRL"
                            locale="pt-BR"
                            minFractionDigits={2}
                            className="w-full"
                            inputClassName={FORM_INPUT_CLASS}
                          />
                        </div>
                        <div className="flex flex-col gap-2 sm:col-span-2">
                          <label className={FORM_LABEL_CLASS}>Vencimento</label>
                          <InputText
                            type="date"
                            value={criarVencimento}
                            onChange={(e) => setCriarVencimento(e.target.value)}
                            className={FORM_INPUT_CLASS}
                          />
                        </div>
                        <div className="flex flex-col gap-2 sm:col-span-2">
                          <label className={FORM_LABEL_CLASS}>Convênio</label>
                          <Dropdown
                            value={criarConvenioId}
                            options={convenios.filter((c) => c.tipoIntegracao === "UNICRED")}
                            optionLabel="nome"
                            optionValue="id"
                            placeholder="Selecione Unicred"
                            onChange={(e) => setCriarConvenioId(e.value)}
                            className="w-full"
                            pt={DROPDOWN_PT}
                          />
                        </div>
                      </div>
                    </div>
                  </TabPanel>
                </TabView>

                <div className="flex flex-col gap-2">
                  <label className={FORM_LABEL_CLASS}>Observação (opcional)</label>
                  <InputTextarea
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    rows={2}
                    placeholder="Motivo do vínculo ou criação retroativa"
                    className={FORM_INPUT_CLASS}
                  />
                </div>
              </>
            ) : (
              <p className="text-sm text-white/50">
                Este evento já foi tratado (
                {STATUS_LABELS[detalhe.resumo.statusConciliacao ?? ""] ?? "—"}).
                {detalhe.resumo.tituloVinculadoId ? (
                  <>
                    {" "}
                    <button
                      type="button"
                      className="font-medium text-emerald-400 underline-offset-2 hover:underline"
                      onClick={() =>
                        router.push(
                          `/dashboard/financeiro/titulos/detalhe?id=${detalhe.resumo.tituloVinculadoId}`,
                        )
                      }
                    >
                      Ver título vinculado
                    </button>
                  </>
                ) : null}
              </p>
            )}
          </div>
        )}
      </DashboardDialog>
    </div>
  );
}
