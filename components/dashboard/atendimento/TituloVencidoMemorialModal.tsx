"use client";

import { useEffect, useState } from "react";
import { DashboardDialog } from "@/components/dashboard/DashboardDialog";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { dashboardStatusBadge } from "@/lib/dashboard-datatable";
import {
  calcularMemorialTitulo,
  fetchBoletoEncargosConfig,
  type MemorialCalculoResult,
} from "@/lib/fin-memorial-calculo";
import { finService, type TituloCobranca } from "@/lib/fin-service";
import type { AtendimentoTituloResumo } from "@/lib/atendimento-service";

const DIALOG_PT = {
  header: {
    className:
      "border-b border-white/[0.06] bg-transparent px-6 py-5 font-[family-name:var(--font-playfair)] text-xl font-semibold text-white",
  },
  content: { className: "bg-transparent px-6 py-6" },
  footer: { className: "border-t border-white/[0.06] bg-transparent px-6 py-5" },
  mask: { className: "backdrop-blur-sm bg-black/40" },
};

function formatMoney(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string): string {
  try {
    return new Date(iso + (iso.length === 10 ? "T12:00:00" : "")).toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
}

function formatPercent(v: number): string {
  return `${v.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}%`;
}

function DetalheRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/[0.06] py-2.5 last:border-0">
      <span className="text-[10px] font-bold uppercase tracking-widest text-white/35">{label}</span>
      <span className="text-sm font-medium text-white">{value}</span>
    </div>
  );
}

type TituloVencidoMemorialModalProps = {
  visible: boolean;
  onHide: () => void;
  resumo: AtendimentoTituloResumo | null;
  numeroContrato?: string | null;
  imovelLabel?: string;
};

export function TituloVencidoMemorialModal({
  visible,
  onHide,
  resumo,
  numeroContrato,
  imovelLabel,
}: TituloVencidoMemorialModalProps) {
  const [loading, setLoading] = useState(false);
  const [titulo, setTitulo] = useState<TituloCobranca | null>(null);
  const [memorial, setMemorial] = useState<MemorialCalculoResult | null>(null);

  useEffect(() => {
    if (!visible || !resumo) {
      setTitulo(null);
      setMemorial(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [encargos, detalhe] = await Promise.all([
          fetchBoletoEncargosConfig(),
          finService.getTitulo(resumo.id),
        ]);
        if (cancelled) return;
        setTitulo(detalhe);
        setMemorial(
          calcularMemorialTitulo(
            {
              valorNominal: resumo.valorNominal,
              vencimento: resumo.vencimento,
            },
            encargos,
          ),
        );
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Erro ao carregar memorial.");
          onHide();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, resumo, onHide]);

  return (
    <DashboardDialog
      header="Detalhes do título · Memorial de cálculo"
      visible={visible}
      onHide={onHide}
      className="w-full max-w-lg border border-white/10 bg-[#071C33] shadow-2xl"
      pt={DIALOG_PT}
      footer={
        <button
          type="button"
          onClick={onHide}
          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white/70 transition hover:bg-white/[0.08] hover:text-white"
        >
          Fechar
        </button>
      }
    >
      {loading || !resumo || !memorial ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-white/40">
          <Loader2 size={18} className="animate-spin" />
          A calcular…
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <section>
            <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
              Identificação
            </h3>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4">
              <DetalheRow label="Contrato" value={numeroContrato ?? "—"} />
              <DetalheRow label="Imóvel" value={imovelLabel ?? "—"} />
              <DetalheRow label="Parcela" value={String(resumo.numeroParcela)} />
              <DetalheRow
                label="Status"
                value={dashboardStatusBadge(resumo.status, {
                  VENCIDO: "border-rose-500/25 bg-rose-500/15 text-rose-300",
                })}
              />
              {titulo?.nossoNumero ? (
                <DetalheRow label="Nosso número" value={titulo.nossoNumero} />
              ) : null}
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
              Memorial de cálculo (valor presente)
            </h3>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4">
              <DetalheRow label="Valor do título" value={formatMoney(memorial.valorNominal)} />
              <DetalheRow label="Vencimento original" value={formatDate(memorial.vencimento)} />
              <DetalheRow label="Data do cálculo" value={formatDate(memorial.dataCalculo)} />
              <DetalheRow
                label="Dias em atraso"
                value={memorial.diasAtraso > 0 ? String(memorial.diasAtraso) : "0"}
              />
              <DetalheRow
                label={`Multa (${formatPercent(memorial.multaPercentual)} sobre o valor)`}
                value={formatMoney(memorial.valorMulta)}
              />
              <DetalheRow
                label={`Juros (${formatPercent(memorial.jurosMensalPercentual)} a.m. pro-rata × ${memorial.diasAtraso} dia(s))`}
                value={formatMoney(memorial.valorJuros)}
              />
              <div className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-200/80">
                  Valor atualizado
                </span>
                <span
                  className={cn(
                    "font-[family-name:var(--font-playfair)] text-xl font-bold",
                    memorial.diasAtraso > 0 ? "text-amber-200" : "text-white",
                  )}
                >
                  {formatMoney(memorial.valorAtualizado)}
                </span>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-white/35">
              Multa e juros conforme parâmetros{" "}
              <span className="text-white/50">FIN_BOLETO_MULTA_PERCENTUAL</span> e{" "}
              <span className="text-white/50">FIN_BOLETO_JUROS_MENSAL</span>. Juros calculados
              com pro-rata de 30 dias sobre o valor nominal (mesma base dos boletos Asaas/Unicred).
            </p>
          </section>
        </div>
      )}
    </DashboardDialog>
  );
}
