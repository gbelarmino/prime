"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Banknote,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClockAlert,
  Calculator,
  Download,
  Eye,
  Headset,
  MessageSquarePlus,
  Percent,
  Receipt,
  RefreshCw,
} from "lucide-react";
import { Accordion, AccordionTab } from "primereact/accordion";
import { Button } from "primereact/button";
import { DashboardDialog } from "@/components/dashboard/DashboardDialog";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputTextarea } from "primereact/inputtextarea";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Menu } from "primereact/menu";
import type { MenuItem } from "primereact/menuitem";
import { TabView, TabPanel } from "primereact/tabview";
import { DashboardDataTableShell } from "@/components/dashboard/DashboardDataTableShell";
import {
  ATENDIMENTO_CANAL_LABELS,
  ATENDIMENTO_MODO_COBRANCA_LABELS,
  ATENDIMENTO_STATUS_FINANCEIRO_TONES,
  atendimentoService,
  type AtendimentoCanal,
  type AtendimentoModoCobranca,
  type AtendimentoOcorrencia,
  type AtendimentoResumoFinanceiro,
  type AtendimentoTituloResumo,
} from "@/lib/atendimento-service";
import { podeBaixarPdfBoleto } from "@/lib/baixar-boleto-pdf";
import {
  DASHBOARD_DATATABLE_CLASS,
  DASHBOARD_TABVIEW_CLASS,
  dashboardActionMenuItem,
  dashboardActionsMenuPt,
  dashboardCellMono,
  dashboardCellText,
  dashboardDataTablePt,
  dashboardRowActionsCell,
  dashboardStatusBadge,
  dashboardTabHeader,
  dashboardTabViewPt,
} from "@/lib/dashboard-datatable";
import { TituloVencidoMemorialModal } from "@/components/dashboard/atendimento/TituloVencidoMemorialModal";
import { formatCpfDisplay } from "@/lib/format-cpf";
import { formatBusinessDateTime } from "@/lib/format-datetime";
import { cn } from "@/lib/utils";
import { addDiasIso, hojeNegocioIso } from "@/lib/app-business-date";

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

function imovelTitulo(p: AtendimentoResumoFinanceiro): string {
  const parts = [p.empreendimento];
  if (p.quadra) parts.push(`Quadra ${p.quadra}`);
  if (p.lote != null) parts.push(`Lote ${p.lote}`);
  return parts.join(" · ");
}

function ResumoCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Banknote;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
        <Icon size={14} className="text-blue-400/80" />
        {label}
      </div>
      <p className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

const CANAL_OPTIONS = (Object.keys(ATENDIMENTO_CANAL_LABELS) as AtendimentoCanal[]).map((k) => ({
  label: ATENDIMENTO_CANAL_LABELS[k],
  value: k,
}));

const MODO_OPTIONS = (Object.keys(ATENDIMENTO_MODO_COBRANCA_LABELS) as AtendimentoModoCobranca[]).map(
  (k) => ({
    label: ATENDIMENTO_MODO_COBRANCA_LABELS[k],
    value: k,
  }),
);

const PAGE_SIZE = 10;
const TABLE_PT = dashboardDataTablePt({ density: "compact" });
const TABVIEW_PT = dashboardTabViewPt();
const PAGINATOR_TEMPLATE =
  "FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport";

const PAINEL_ACCORDION_PT = {
  root: { className: "flex flex-col gap-3" },
  accordiontab: {
    root: {
      className: "overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.03]",
    },
    header: { className: "border-none bg-transparent" },
    headerAction: {
      className:
        "flex w-full flex-row-reverse items-center justify-between gap-3 border-none bg-transparent px-5 py-4 font-bold text-white no-underline shadow-none transition hover:bg-white/[0.04] focus:shadow-none",
    },
    headerTitle: { className: "flex w-full justify-end text-base font-bold text-white text-right" },
    headerIcon: { className: "text-white/45" },
    toggleableContent: { className: "border-none bg-transparent" },
    content: { className: "border-none bg-transparent px-5 pb-5 pt-4" },
  },
};

const COBRANCA_FORM_LABEL_CLASS =
  "text-[10px] font-bold uppercase tracking-[0.2em] text-white/35";

const COBRANCA_FORM_INPUT_CLASS =
  "w-full border-white/10 bg-white/[0.05] p-3 text-white placeholder:text-white/25";

const COBRANCA_DIALOG_PT = {
  header: {
    className:
      "border-b border-white/[0.06] bg-transparent px-6 py-5 font-[family-name:var(--font-playfair)] text-xl font-semibold text-white",
  },
  content: { className: "bg-transparent px-6 py-6" },
  footer: { className: "border-t border-white/[0.06] bg-transparent px-6 py-5" },
  mask: { className: "backdrop-blur-sm bg-black/40" },
};

const COBRANCA_DROPDOWN_PT = {
  input: { className: COBRANCA_FORM_INPUT_CLASS },
};

export function AtendimentoPainel({ contratoId }: { contratoId: number }) {
  const router = useRouter();
  const menuRef = useRef<Menu>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [painel, setPainel] = useState<AtendimentoResumoFinanceiro | null>(null);
  const [ocorrencias, setOcorrencias] = useState<AtendimentoOcorrencia[]>([]);
  const [ocorrenciasIndisponiveis, setOcorrenciasIndisponiveis] = useState(false);

  const [novaOcorrencia, setNovaOcorrencia] = useState("");
  const [canal, setCanal] = useState<AtendimentoCanal>("TELEFONE");
  const [salvandoOcorrencia, setSalvandoOcorrencia] = useState(false);

  const [cobrancaOpen, setCobrancaOpen] = useState(false);
  const [modo, setModo] = useState<AtendimentoModoCobranca>("BOLETO_UNICO");
  const [valorTotal, setValorTotal] = useState<number | null>(null);
  const [valorEntrada, setValorEntrada] = useState<number | null>(null);
  const [quantidadeParcelas, setQuantidadeParcelas] = useState<number | null>(2);
  const [primeiroVencimento, setPrimeiroVencimento] = useState("");
  const [observacao, setObservacao] = useState("");
  const [selectedTitulos, setSelectedTitulos] = useState<AtendimentoTituloResumo[]>([]);
  const [gerandoCobranca, setGerandoCobranca] = useState(false);
  const [painelAccordionIndex, setPainelAccordionIndex] = useState<number[]>([0, 1]);
  const [acaoTitulo, setAcaoTitulo] = useState<AtendimentoTituloResumo | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [memorialTitulo, setMemorialTitulo] = useState<AtendimentoTituloResumo | null>(null);

  const titulosPendentes = useMemo(() => {
    if (!painel) return [];
    return [...painel.titulosVencidos, ...painel.titulosAbertos];
  }, [painel]);

  const titulosPagos = useMemo(() => painel?.titulosPagos ?? [], [painel]);

  const load = useCallback(async (background = false) => {
    if (background) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const p = await atendimentoService.getPainel(contratoId);
      setPainel(p);

      try {
        const o = await atendimentoService.listOcorrencias(contratoId);
        setOcorrencias(o);
        setOcorrenciasIndisponiveis(false);
      } catch {
        // Legado ou ambiente sem tabela de ocorrências: painel financeiro segue utilizável.
        setOcorrencias([]);
        setOcorrenciasIndisponiveis(true);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar painel.");
      if (!background) setPainel(null);
    } finally {
      if (background) setRefreshing(false);
      else setLoading(false);
    }
  }, [contratoId]);

  useEffect(() => {
    void load();
  }, [load]);

  const abrirCobranca = () => {
    if (!painel) return;
    const sel = titulosPendentes.filter((t) =>
      selectedTitulos.some((s) => s.id === t.id),
    );
    const soma = sel.length
      ? sel.reduce((acc, t) => acc + Number(t.valorNominal), 0)
      : painel.valorInadimplente || painel.saldoDevedor;
    setValorTotal(Math.round(soma * 100) / 100);
    setModo("BOLETO_UNICO");
    setQuantidadeParcelas(2);
    setValorEntrada(null);
    setObservacao("");
    setPrimeiroVencimento(addDiasIso(hojeNegocioIso(), 7));
    setCobrancaOpen(true);
  };

  const salvarOcorrencia = async () => {
    const texto = novaOcorrencia.trim();
    if (!texto) {
      toast.error("Descreva a ocorrência.");
      return;
    }
    setSalvandoOcorrencia(true);
    try {
      const criada = await atendimentoService.criarOcorrencia(contratoId, { texto, canal });
      setOcorrencias((prev) => [criada, ...prev]);
      setNovaOcorrencia("");
      toast.success("Ocorrência registrada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao registrar ocorrência.");
    } finally {
      setSalvandoOcorrencia(false);
    }
  };

  const gerarCobranca = async () => {
    if (valorTotal == null || valorTotal <= 0) {
      toast.error("Informe o valor total.");
      return;
    }
    if (!primeiroVencimento) {
      toast.error("Informe o primeiro vencimento.");
      return;
    }
    if (painel?.avisoConvenio) {
      toast.error(painel.avisoConvenio);
      return;
    }
    if (modo === "PARCELADO" && (!quantidadeParcelas || quantidadeParcelas < 1)) {
      toast.error("Informe a quantidade de parcelas.");
      return;
    }
    if (modo === "ENTRADA_PARCELAS" && (valorEntrada == null || valorEntrada <= 0)) {
      toast.error("Informe o valor de entrada.");
      return;
    }

    setGerandoCobranca(true);
    try {
      const result = await atendimentoService.renegociar(contratoId, {
        modo,
        valorTotal,
        valorEntrada: modo === "ENTRADA_PARCELAS" ? valorEntrada : undefined,
        quantidadeParcelas: modo !== "BOLETO_UNICO" ? quantidadeParcelas : undefined,
        primeiroVencimento,
        titulosOrigemIds: selectedTitulos.map((t) => t.id),
        observacao: observacao.trim() || undefined,
      });
      toast.success(`${result.titulos.length} boleto(s) gerado(s).`);
      setCobrancaOpen(false);
      setSelectedTitulos([]);
      await load(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar cobrança.");
    } finally {
      setGerandoCobranca(false);
    }
  };

  const downloadPdf = async (tituloId: string, status: string) => {
    setActionLoading(true);
    try {
      await atendimentoService.downloadPdf(tituloId, { status });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao baixar PDF.");
    } finally {
      setActionLoading(false);
    }
  };

  const getTituloActionItems = (row: AtendimentoTituloResumo): MenuItem[] => {
    const items: MenuItem[] = [
      dashboardActionMenuItem({
        label: "Ver detalhes",
        icon: <Eye size={16} className="text-blue-400 transition-transform group-hover:scale-110" />,
        onClick: () =>
          router.push(
            `/dashboard/atendimento/titulos/detalhe?id=${row.id}&contratoId=${contratoId}`,
          ),
      }),
    ];
    if (podeBaixarPdfBoleto(row.status)) {
      items.push(
        dashboardActionMenuItem({
          label: "Baixar PDF",
          icon: (
            <Download size={16} className="text-amber-400 transition-transform group-hover:scale-110" />
          ),
          onClick: () => void downloadPdf(row.id, row.status),
          disabled: actionLoading,
        }),
      );
    }
    return items;
  };

  const acoesParcelaBody = (row: AtendimentoTituloResumo, comMemorial: boolean) => (
    <div className="flex items-center justify-end gap-1">
      {comMemorial && row.status === "VENCIDO" ? (
        <button
          type="button"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-none bg-rose-500/15 text-rose-300 transition hover:bg-rose-500/25"
          onClick={() => setMemorialTitulo(row)}
          title="Memorial de cálculo (multa e juros)"
          aria-label="Memorial de cálculo"
        >
          <Calculator size={15} strokeWidth={2} aria-hidden />
        </button>
      ) : null}
      {dashboardRowActionsCell((e) => {
        setAcaoTitulo(row);
        menuRef.current?.toggle(e);
      })}
    </div>
  );

  if (loading && !painel) {
    return (
      <div className="px-4 py-16 text-center text-sm font-medium text-white/30 animate-pulse">
        Carregando painel de atendimento…
      </div>
    );
  }

  if (!painel) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-16">
        <div className="max-w-sm rounded-[2rem] border border-rose-500/20 bg-rose-500/10 p-8 text-center">
          <p className="mb-2 font-[family-name:var(--font-playfair)] text-xl font-bold text-rose-200">
            Contrato não encontrado
          </p>
          <Link
            href="/dashboard/atendimento"
            className="inline-block rounded-xl bg-white/10 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white no-underline transition hover:bg-white/20"
          >
            Voltar à consulta
          </Link>
        </div>
      </div>
    );
  }


  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 px-4">
        <Link
          href="/dashboard/atendimento"
          className="inline-flex w-fit items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40 transition hover:text-white/70"
        >
          <ArrowLeft size={14} />
          Consulta
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.4em] text-blue-400">
              <Headset size={14} />
              Painel de atendimento
            </div>
            <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-white">
              {painel.contratanteNome}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/40">
              Contrato{" "}
              <span className="font-mono text-white/70">{painel.numeroContrato}</span>
              {" · "}
              {imovelTitulo(painel)}
              {" · "}
              CPF {formatCpfDisplay(painel.cpf)}
              {painel.celular ? ` · ${painel.celular}` : ""}
            </p>
            <div className="mt-3">
              {dashboardStatusBadge(
                painel.statusFinanceiro,
                ATENDIMENTO_STATUS_FINANCEIRO_TONES,
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => void load(true)}
              disabled={refreshing}
              className="border border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-60"
            >
              <RefreshCw size={14} className={cn("mr-2", refreshing && "animate-spin")} />
              Atualizar
            </Button>
            <Button
              type="button"
              onClick={abrirCobranca}
              disabled={painel.statusFinanceiro === "QUITADO"}
              className="border-none bg-blue-600 hover:bg-blue-500"
            >
              <Receipt size={14} className="mr-2" />
              Nova cobrança
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4">
        <Accordion
          multiple
          activeIndex={painelAccordionIndex}
          onTabChange={(e) => {
            const index = e.index;
            if (index == null) setPainelAccordionIndex([]);
            else if (Array.isArray(index)) setPainelAccordionIndex(index);
            else setPainelAccordionIndex([index]);
          }}
          expandIcon={<ChevronDown size={18} className="text-white/45" />}
          collapseIcon={<ChevronUp size={18} className="text-white/45" />}
          pt={PAINEL_ACCORDION_PT}
        >
          <AccordionTab
            header={
              <span className="flex w-full items-center justify-end gap-2">
                <Banknote size={16} className="text-blue-400" />
                Resumo financeiro
              </span>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <ResumoCard label="Valor total" value={formatMoney(painel.valorTotalContrato)} icon={Banknote} />
              <ResumoCard label="Total pago" value={formatMoney(painel.totalPago)} icon={Banknote} />
              <ResumoCard
                label="Saldo devedor"
                value={
                  painel.memoriaSaldoDevedor?.trim() ??
                  formatMoney(painel.saldoDevedor)
                }
                icon={Receipt}
              />
              <ResumoCard
                label="Inadimplência"
                value={formatMoney(painel.valorInadimplente)}
                icon={Receipt}
              />
              <ResumoCard
                label="Quitação"
                value={`${painel.percentualQuitacao}% (${painel.parcelasPagas}/${painel.parcelasTotal})`}
                icon={Percent}
              />
              <ResumoCard
                label="Parcelas"
                value={`${painel.parcelasPagas} / ${painel.parcelasTotal}`}
                icon={Receipt}
              />
              <ResumoCard label="Em atraso" value={String(painel.parcelasEmAtraso)} icon={Receipt} />
              <ResumoCard
                label="Próximo vencimento"
                value={formatDate(painel.proximoVencimento)}
                icon={Calendar}
              />
            </div>
          </AccordionTab>

          <AccordionTab
            header={
              <span className="flex w-full flex-wrap items-center justify-end gap-2">
                <Receipt size={16} className="text-blue-400" />
                Parcelas do contrato
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/45">
                  {titulosPendentes.length} aberto · {titulosPagos.length} pagas
                </span>
              </span>
            }
          >
            <div className="overflow-hidden rounded-[1.25rem] border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5">
              <TabView className={DASHBOARD_TABVIEW_CLASS} pt={TABVIEW_PT}>
            <TabPanel
              header={dashboardTabHeader(
                "Em aberto / vencidos",
                titulosPendentes.length,
                <ClockAlert />,
                "danger",
              )}
            >
            <p className="mb-3 text-sm text-white/40">
              Selecione títulos para substituir na renegociação (opcional).
            </p>
            <DashboardDataTableShell>
              <DataTable
                value={titulosPendentes}
                selection={selectedTitulos}
                selectionMode="checkbox"
                onSelectionChange={(e) =>
                  setSelectedTitulos((e.value ?? []) as AtendimentoTituloResumo[])
                }
                dataKey="id"
                paginator
                rows={PAGE_SIZE}
                paginatorTemplate={PAGINATOR_TEMPLATE}
                currentPageReportTemplate="{first}–{last} de {totalRecords}"
                className={DASHBOARD_DATATABLE_CLASS}
                pt={TABLE_PT}
                emptyMessage="Nenhum título em aberto ou vencido."
              >
                <Column selectionMode="multiple" headerStyle={{ width: "3rem" }} />
                <Column
                  header="Parcela"
                  body={(row: AtendimentoTituloResumo) =>
                    dashboardCellMono(String(row.numeroParcela), { size: "parcela" })
                  }
                />
                <Column
                  header="Vencimento"
                  body={(row: AtendimentoTituloResumo) =>
                    dashboardCellMono(formatDate(row.vencimento))
                  }
                />
                <Column
                  header="Valor"
                  body={(row: AtendimentoTituloResumo) =>
                    dashboardCellMono(formatMoney(row.valorNominal))
                  }
                />
                <Column
                  header="Status"
                  body={(row: AtendimentoTituloResumo) =>
                    dashboardStatusBadge(row.status, {
                      VENCIDO: "border-rose-500/25 bg-rose-500/15 text-rose-300",
                      EMITIDO: "border-amber-500/25 bg-amber-500/15 text-amber-300",
                      REGISTRADO: "border-blue-500/25 bg-blue-500/15 text-blue-300",
                    })
                  }
                />
                <Column
                  header="Ações"
                  body={(row: AtendimentoTituloResumo) => acoesParcelaBody(row, true)}
                  align="right"
                  style={{ width: "7rem" }}
                />
              </DataTable>
            </DashboardDataTableShell>
            </TabPanel>
            <TabPanel
              header={dashboardTabHeader(
                "Parcelas pagas",
                titulosPagos.length,
                <CheckCircle2 />,
              )}
            >
            <DashboardDataTableShell>
              <DataTable
                value={titulosPagos}
                dataKey="id"
                paginator
                rows={PAGE_SIZE}
                paginatorTemplate={PAGINATOR_TEMPLATE}
                currentPageReportTemplate="{first}–{last} de {totalRecords}"
                className={DASHBOARD_DATATABLE_CLASS}
                pt={TABLE_PT}
                emptyMessage="Nenhuma parcela paga registrada."
              >
                <Column
                  header="Parcela"
                  body={(row: AtendimentoTituloResumo) =>
                    dashboardCellMono(String(row.numeroParcela), { size: "parcela" })
                  }
                />
                <Column
                  header="Vencimento"
                  body={(row: AtendimentoTituloResumo) =>
                    dashboardCellMono(formatDate(row.vencimento))
                  }
                />
                <Column
                  header="Valor"
                  body={(row: AtendimentoTituloResumo) =>
                    dashboardCellMono(formatMoney(row.valorNominal))
                  }
                />
                <Column
                  header="Status"
                  body={(row: AtendimentoTituloResumo) =>
                    dashboardStatusBadge(row.status, {
                      PAGO: "border-emerald-500/25 bg-emerald-500/15 text-emerald-300",
                    })
                  }
                />
                <Column
                  header="Ações"
                  body={(row: AtendimentoTituloResumo) => acoesParcelaBody(row, false)}
                  align="right"
                  style={{ width: "5rem" }}
                />
              </DataTable>
            </DashboardDataTableShell>
            </TabPanel>
              </TabView>
              <Menu
                model={acaoTitulo ? getTituloActionItems(acaoTitulo) : []}
                popup
                ref={menuRef}
                pt={dashboardActionsMenuPt()}
              />
            </div>
          </AccordionTab>
        </Accordion>
      </div>

      <div className="flex flex-col gap-4 px-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-white">
          <MessageSquarePlus size={18} className="text-blue-400" />
          Ocorrências
        </h2>
        {ocorrenciasIndisponiveis && (
          <p className="text-sm text-amber-300/80">
            Histórico de ocorrências indisponível neste ambiente. O resumo financeiro e a cobrança
            continuam funcionando; contratos legados normalmente não têm registos anteriores.
          </p>
        )}
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
          <div className="flex flex-col gap-4">
            <InputTextarea
              value={novaOcorrencia}
              onChange={(e) => setNovaOcorrencia(e.target.value)}
              rows={5}
              autoResize={false}
              placeholder="Registre ligação, negociação ou contato com o cliente…"
              className="w-full min-h-[8.5rem] resize-y border-white/10 bg-white/5 text-white"
            />
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
              <div className="w-full sm:w-auto">
                <Dropdown
                  value={canal}
                  options={CANAL_OPTIONS}
                  onChange={(e) => setCanal(e.value as AtendimentoCanal)}
                  className="w-full border-white/10 bg-white/5 sm:min-w-[12rem]"
                />
              </div>
              <Button
                type="button"
                onClick={() => void salvarOcorrencia()}
                loading={salvandoOcorrencia}
                disabled={ocorrenciasIndisponiveis}
                className="shrink-0 border-none bg-emerald-600 px-6 hover:bg-emerald-500 disabled:opacity-40"
              >
                Registrar
              </Button>
            </div>
          </div>
        </div>

        {ocorrencias.length === 0 ? (
          <p className="text-sm text-white/35">Nenhuma ocorrência registrada.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {ocorrencias.map((o) => (
              <div
                key={o.id}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/40">
                  <span>{ATENDIMENTO_CANAL_LABELS[o.canal]}</span>
                  <span>·</span>
                  <span>{formatBusinessDateTime(o.dataHora)}</span>
                  {o.usuarioNome && (
                    <>
                      <span>·</span>
                      <span>{o.usuarioNome}</span>
                    </>
                  )}
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">{o.texto}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <DashboardDialog
        header="Nova cobrança / renegociação"
        visible={cobrancaOpen}
        onHide={() => {
          if (gerandoCobranca) return;
          setCobrancaOpen(false);
        }}
        className="w-full max-w-lg border border-white/10 bg-[#071C33] shadow-2xl mx-4"
        pt={COBRANCA_DIALOG_PT}
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setCobrancaOpen(false)}
              disabled={gerandoCobranca}
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white/60 transition hover:border-white/15 hover:bg-white/[0.08] hover:text-white/90 disabled:pointer-events-none disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={gerandoCobranca}
              onClick={() => void gerarCobranca()}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500 disabled:pointer-events-none disabled:opacity-50"
            >
              {gerandoCobranca ? "A gerar…" : "Gerar boletos"}
            </button>
          </div>
        }
        modal
        draggable={false}
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className={COBRANCA_FORM_LABEL_CLASS}>Modo</label>
            <Dropdown
              value={modo}
              options={MODO_OPTIONS}
              onChange={(e) => setModo(e.value as AtendimentoModoCobranca)}
              className="w-full"
              pt={COBRANCA_DROPDOWN_PT}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className={COBRANCA_FORM_LABEL_CLASS}>Valor total</label>
            <InputNumber
              value={valorTotal}
              onValueChange={(e) => setValorTotal(e.value ?? null)}
              mode="currency"
              currency="BRL"
              locale="pt-BR"
              className="w-full"
              inputClassName={COBRANCA_FORM_INPUT_CLASS}
            />
          </div>
          {modo === "ENTRADA_PARCELAS" && (
            <div className="flex flex-col gap-2">
              <label className={COBRANCA_FORM_LABEL_CLASS}>Entrada</label>
              <InputNumber
                value={valorEntrada}
                onValueChange={(e) => setValorEntrada(e.value ?? null)}
                mode="currency"
                currency="BRL"
                locale="pt-BR"
                className="w-full"
                inputClassName={COBRANCA_FORM_INPUT_CLASS}
              />
            </div>
          )}
          {modo !== "BOLETO_UNICO" && (
            <div className="flex flex-col gap-2">
              <label className={COBRANCA_FORM_LABEL_CLASS}>Parcelas</label>
              <InputNumber
                value={quantidadeParcelas}
                onValueChange={(e) => setQuantidadeParcelas(e.value ?? null)}
                min={1}
                className="w-full"
                inputClassName={COBRANCA_FORM_INPUT_CLASS}
              />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <label htmlFor="atendimento-primeiro-vencimento" className={COBRANCA_FORM_LABEL_CLASS}>
              1º vencimento
            </label>
            <input
              id="atendimento-primeiro-vencimento"
              type="date"
              value={primeiroVencimento}
              onChange={(e) => setPrimeiroVencimento(e.target.value)}
              className={`${COBRANCA_FORM_INPUT_CLASS} rounded-xl`}
            />
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className={COBRANCA_FORM_LABEL_CLASS}>Convênio (empreendimento)</p>
            {painel?.avisoConvenio ? (
              <p className="mt-2 text-sm text-amber-300/90">{painel.avisoConvenio}</p>
            ) : (
              <p className="mt-1 text-sm font-medium text-white/80">
                {painel?.convenioNome ?? "—"}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className={COBRANCA_FORM_LABEL_CLASS}>Observação</label>
            <InputTextarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={3}
              autoResize
              className={`${COBRANCA_FORM_INPUT_CLASS} rounded-xl`}
            />
          </div>
          {selectedTitulos.length > 0 && (
            <div className="rounded-xl border border-amber-500/10 bg-amber-500/5 p-4 text-[11px] font-bold uppercase tracking-wider text-amber-500/80">
              {selectedTitulos.length} título(s) selecionado(s) serão cancelados e substituídos.
            </div>
          )}
        </div>
      </DashboardDialog>

      <TituloVencidoMemorialModal
        visible={memorialTitulo != null}
        onHide={() => setMemorialTitulo(null)}
        resumo={memorialTitulo}
        numeroContrato={painel?.numeroContrato}
        imovelLabel={painel ? imovelTitulo(painel) : undefined}
      />
    </div>
  );
}
