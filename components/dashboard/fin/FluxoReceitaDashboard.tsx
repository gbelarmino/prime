"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Accordion, AccordionTab } from "primereact/accordion";
import { Card } from "primereact/card";
import {
  AlertCircle,
  Banknote,
  BarChart3,
  Minus,
  Percent,
  Plus,
  Receipt,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { DASHBOARD_DATATABLE_SHELL_CLASS } from "@/lib/dashboard-datatable";
import { cn } from "@/lib/utils";
import {
  FLUXO_RECEITA_SERIES,
  FluxoReceitaGroupedChart,
  formatMesLabel,
} from "@/components/dashboard/fin/FluxoReceitaGroupedChart";
import { finService, type FinFluxoReceita, type FinFluxoReceitaMes } from "@/lib/fin-service";

function formatMoney(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatMesRange(de?: string | null, ate?: string | null): string {
  if (!de || !ate) return "";
  if (de === ate) return formatMesLabel(de);
  return `${formatMesLabel(de)} — ${formatMesLabel(ate)}`;
}

function totaisMes(meses: FinFluxoReceitaMes[]) {
  return meses.reduce(
    (acc, m) => ({
      recebidoLiquido: acc.recebidoLiquido + (m.recebidoLiquido ?? 0),
      emitido: acc.emitido + (m.emitido ?? 0),
      inadimplencia: acc.inadimplencia + (m.inadimplencia ?? 0),
      taxas: acc.taxas + (m.taxas ?? 0),
    }),
    { recebidoLiquido: 0, emitido: 0, inadimplencia: 0, taxas: 0 },
  );
}

/** YYYY-MM do mês corrente (fuso local) — a vencer não existe em meses anteriores. */
function mesReferenciaAtual(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Só meses com alguma métrica — evita colunas vazias de APIs antigas com gap-fill. */
function mesesComMovimento(meses: FinFluxoReceitaMes[]): FinFluxoReceitaMes[] {
  return meses.filter((m) => {
    const total =
      Math.abs(m.recebidoLiquido ?? 0) +
      Math.abs(m.emitido ?? 0) +
      Math.abs(m.inadimplencia ?? 0) +
      Math.abs(m.taxas ?? 0);
    return total > 0.000_001;
  });
}

const FLUXO_METRIC_ICONS: Record<
  (typeof FLUXO_RECEITA_SERIES)[number]["key"],
  { icon: LucideIcon; color: string }
> = {
  recebidoLiquido: { icon: Banknote, color: "text-emerald-400/80" },
  emitido: { icon: Receipt, color: "text-blue-400/80" },
  inadimplencia: { icon: AlertCircle, color: "text-rose-400/80" },
  taxas: { icon: Percent, color: "text-amber-400/80" },
};

function DashboardResumoCard({
  label,
  value,
  icon: Icon,
  iconClassName,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  iconClassName: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
        <Icon size={14} className={iconClassName} />
        {label}
      </div>
      <p className="font-[family-name:var(--font-playfair)] text-2xl font-bold tabular-nums text-white">
        {value}
      </p>
    </div>
  );
}

const FLUXO_ACCORDION_PT = {
  root: { className: "flex flex-col gap-4" },
  accordiontab: {
    root: {
      className: cn(DASHBOARD_DATATABLE_SHELL_CLASS),
    },
    header: { className: "border-none bg-transparent" },
    headerAction: {
      className:
        "flex w-full flex-row-reverse items-center gap-3 border-none bg-transparent px-6 py-5 font-bold text-white no-underline shadow-none transition hover:bg-white/[0.04] focus:shadow-none md:px-8",
    },
    headerTitle: { className: "flex min-w-0 flex-1 items-center" },
    headerIcon: { className: "ml-1 shrink-0 text-white/50" },
    toggleableContent: { className: "border-none bg-transparent" },
    content: {
      className:
        "border-t border-white/10 bg-transparent px-6 pb-6 pt-6 md:px-8 md:pb-8 md:pt-8",
    },
  },
};

export function FluxoReceitaDashboard() {
  const hasLoadedRef = useRef(false);
  const [data, setData] = useState<FinFluxoReceita | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accordionIndex, setAccordionIndex] = useState<number[]>([]);

  const empreendimentosGrafico = useMemo(() => {
    if (!data?.empreendimentos.length) return [];
    const mesAtual = mesReferenciaAtual();
    return data.empreendimentos
      .map((emp) => {
        const mesesAtivos = mesesComMovimento(emp.meses);
        if (mesesAtivos.length === 0) return null;
        const mesesGrafico = mesesAtivos.map((m) => ({
          ...m,
          emitido: m.mes < mesAtual ? 0 : (m.emitido ?? 0),
        }));
        const mesInicial = mesesGrafico[0]!.mes;
        const mesFinal = mesesGrafico[mesesGrafico.length - 1]!.mes;
        const labels = mesesGrafico.map((m) => m.mes);
        const series = FLUXO_RECEITA_SERIES.map((def) => ({
          ...def,
          values: mesesGrafico.map((m) => {
            switch (def.key) {
              case "recebidoLiquido":
                return m.recebidoLiquido ?? 0;
              case "emitido":
                return m.emitido ?? 0;
              case "inadimplencia":
                return m.inadimplencia ?? 0;
              case "taxas":
                return m.taxas ?? 0;
              default:
                return 0;
            }
          }),
        }));
        return {
          empreendimento: emp.empreendimento,
          mesInicial,
          mesFinal,
          mesesAtivos: mesesGrafico,
          labels,
          series,
          totais: totaisMes(mesesGrafico),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item != null);
  }, [data]);

  useEffect(() => {
    setAccordionIndex(empreendimentosGrafico.map((_, i) => i));
  }, [empreendimentosGrafico]);

  const load = useCallback(async (background = false) => {
    const skipLoading = background || hasLoadedRef.current;
    if (skipLoading) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await finService.fluxoReceita({ skipLoading });
      setData(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar fluxo de receita.");
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
      hasLoadedRef.current = true;
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-6 px-4">
        <div className="h-40 animate-pulse rounded-[2rem] bg-white/5" />
        <div className="h-80 animate-pulse rounded-[2rem] bg-white/5" />
      </div>
    );
  }

  if (!data?.empreendimentos.length) {
    return (
      <Card className="mx-4 border-white/10 bg-white/5" pt={{ body: { className: "p-12 text-center" } }}>
        <p className="text-sm text-white/40">Nenhum empreendimento com títulos encontrado.</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-8 px-4 pb-20">
      <Card className="border-white/10 bg-white/5" pt={{ body: { className: "p-6" } }}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-white/50">
              {data.empreendimentos.length}{" "}
              {data.empreendimentos.length === 1 ? "empreendimento" : "empreendimentos"} · cada
              gráfico com seu próprio período
            </p>
            <p className="mt-1 text-xs text-white/30">
              Recebido líquido = caixa (mês do pagamento) · A vencer = vencimento a partir de{" "}
              {formatMesLabel(mesReferenciaAtual())} · Inadimplência = vencidos e atrasados (mês
              do vencimento) · Inclui carteira legada importada
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white/70 transition hover:bg-white/10 disabled:opacity-50 md:self-auto"
          >
            <RefreshCw size={14} className={cn(refreshing && "animate-spin")} />
            Atualizar
          </button>
        </div>
      </Card>

      <Card className="border-white/10 bg-white/5" pt={{ body: { className: "px-6 py-4" } }}>
        <div className="flex flex-wrap gap-4">
          {FLUXO_RECEITA_SERIES.map((s) => (
            <div key={s.key} className="flex items-center gap-2 text-xs text-white/60">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: s.color }}
              />
              {s.label}
            </div>
          ))}
        </div>
      </Card>

      <Accordion
        multiple
        activeIndex={accordionIndex}
        onTabChange={(e) => {
          const index = e.index;
          if (index == null) setAccordionIndex([]);
          else if (Array.isArray(index)) setAccordionIndex(index);
          else setAccordionIndex([index]);
        }}
        expandIcon={<Plus size={18} strokeWidth={2} className="text-white/50" />}
        collapseIcon={<Minus size={18} strokeWidth={2} className="text-white/50" />}
        pt={FLUXO_ACCORDION_PT}
      >
        {empreendimentosGrafico.map((item) => (
          <AccordionTab
            key={item.empreendimento}
            header={
              <div className="flex w-full min-w-0 items-center gap-3 pr-2">
                <div className="rounded-lg bg-white/5 p-2 text-blue-400">
                  <BarChart3 size={18} />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <span className="block truncate font-[family-name:var(--font-playfair)] text-lg font-bold text-white">
                    {item.empreendimento}
                  </span>
                  <span className="mt-0.5 block text-xs font-normal text-white/35">
                    {formatMesRange(item.mesInicial, item.mesFinal)} · {item.mesesAtivos.length}{" "}
                    {item.mesesAtivos.length === 1 ? "mês" : "meses"} com movimento
                  </span>
                </div>
              </div>
            }
          >
            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {FLUXO_RECEITA_SERIES.map((s) => {
                const meta = FLUXO_METRIC_ICONS[s.key];
                const valor =
                  s.key === "recebidoLiquido"
                    ? item.totais.recebidoLiquido
                    : s.key === "emitido"
                      ? item.totais.emitido
                      : s.key === "inadimplencia"
                        ? item.totais.inadimplencia
                        : item.totais.taxas;
                return (
                  <DashboardResumoCard
                    key={s.key}
                    label={s.label}
                    value={formatMoney(valor)}
                    icon={meta.icon}
                    iconClassName={meta.color}
                  />
                );
              })}
            </div>

            <FluxoReceitaGroupedChart labels={item.labels} series={item.series} />
          </AccordionTab>
        ))}
      </Accordion>
    </div>
  );
}
