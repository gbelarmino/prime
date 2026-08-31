"use client";

import { useMemo, useState } from "react";
import { InputNumber } from "primereact/inputnumber";
import { toast } from "sonner";
import { DashboardDialog } from "@/components/dashboard/DashboardDialog";
import {
  DASHBOARD_CALENDAR_INPUT_CLASS,
  DASHBOARD_FORM_INPUT_CLASS,
  DashboardCalendar,
} from "@/lib/dashboard-calendar";
import {
  calcularMemorialTitulo,
  fetchBoletoEncargosConfig,
  type MemorialCalculoResult,
} from "@/lib/fin-memorial-calculo";
import { formatIsoDate, normalizarDataCalendario } from "@/lib/fin-vencimento";

const FORM_LABEL_CLASS = "text-[10px] font-bold uppercase tracking-[0.2em] text-white/35";

const DIALOG_PT = {
  header: {
    className:
      "border-b border-white/[0.06] bg-transparent px-6 py-5 font-[family-name:var(--font-playfair)] text-xl font-semibold text-white",
  },
  content: { className: "bg-transparent px-6 py-6" },
  footer: { className: "border-t border-white/[0.06] bg-transparent px-6 py-5" },
  mask: { className: "backdrop-blur-sm bg-black/40" },
};

function formatMoney(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export type TituloAvulsoMemorialAplicacao = {
  valorTotal: number;
  valorJuros: number;
  valorMulta: number;
  valorPrincipal: number;
  diasAtraso: number;
};

type TituloAvulsoMemorialDialogProps = {
  visible: boolean;
  onHide: () => void;
  onUsarValor: (aplicacao: TituloAvulsoMemorialAplicacao) => void;
  principalInicial?: number | null;
};

export function TituloAvulsoMemorialDialog({
  visible,
  onHide,
  onUsarValor,
  principalInicial,
}: TituloAvulsoMemorialDialogProps) {
  const [principal, setPrincipal] = useState<number | null>(null);
  const [vencimentoOriginal, setVencimentoOriginal] = useState<Date | null>(null);
  const [resultado, setResultado] = useState<MemorialCalculoResult | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [encargosLabel, setEncargosLabel] = useState("Multa 2% · Juros 1% a.m.");

  const podeCalcular =
    principal != null && principal >= 0.01 && vencimentoOriginal != null;

  const memoriaLinhas = useMemo(() => {
    if (!resultado) return [];
    return [
      `Principal: ${formatMoney(resultado.valorNominal)}`,
      `Vencimento original: ${resultado.vencimento}`,
      `Data do cálculo: ${resultado.dataCalculo}`,
      `Dias em atraso: ${resultado.diasAtraso}`,
      `Multa (${resultado.multaPercentual}%): ${formatMoney(resultado.valorMulta)}`,
      `Juros (${resultado.jurosMensalPercentual}% a.m.): ${formatMoney(resultado.valorJuros)}`,
      `Valor presente / total do boleto: ${formatMoney(resultado.valorAtualizado)}`,
    ];
  }, [resultado]);

  async function calcular() {
    if (!podeCalcular || !vencimentoOriginal || principal == null) return;
    setCalculando(true);
    try {
      const encargos = await fetchBoletoEncargosConfig();
      const r = calcularMemorialTitulo(
        {
          valorNominal: principal,
          vencimento: formatIsoDate(vencimentoOriginal),
        },
        encargos,
      );
      if (r.diasAtraso <= 0) {
        toast.warning(
          "A data de vencimento não está em atraso em relação a hoje — multa e juros ficam zerados.",
        );
      }
      setResultado(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao calcular valor presente.");
    } finally {
      setCalculando(false);
    }
  }

  function usarValor() {
    if (!resultado) return;
    onUsarValor({
      valorTotal: resultado.valorAtualizado,
      valorJuros: resultado.valorJuros,
      valorMulta: resultado.valorMulta,
      valorPrincipal: resultado.valorNominal,
      diasAtraso: resultado.diasAtraso,
    });
    onHide();
  }

  return (
    <DashboardDialog
      visible={visible}
      onShow={() => {
        setPrincipal(principalInicial != null && principalInicial > 0 ? principalInicial : null);
        setVencimentoOriginal(null);
        setResultado(null);
        void fetchBoletoEncargosConfig().then((c) => {
          setEncargosLabel(
            `Multa ${c.multaPercentual}% · Juros ${c.jurosMensalPercentual}% a.m. (pro rata 30 dias)`,
          );
        });
      }}
      onHide={onHide}
      header="Calculadora de valor presente"
      modal
      draggable={false}
      className="w-full max-w-lg border border-white/10 bg-[#071C33] shadow-2xl"
      pt={DIALOG_PT}
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onHide}
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white/60 transition hover:border-white/15 hover:bg-white/[0.08] hover:text-white/90"
          >
            Descartar valor
          </button>
          <button
            type="button"
            disabled={!resultado}
            onClick={usarValor}
            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500 disabled:pointer-events-none disabled:opacity-50"
          >
            Usar valor
          </button>
        </div>
      }
    >
      <p className="mb-5 text-sm leading-relaxed text-white/45">
        Informe o valor principal e o vencimento original da dívida. O sistema calcula multa e juros
        de mora até hoje ({encargosLabel}) e sugere o total do boleto avulso.
      </p>

      <div className="flex flex-col gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className={FORM_LABEL_CLASS}>Valor principal (R$)</label>
            <InputNumber
              value={principal}
              onValueChange={(e) => {
                setResultado(null);
                setPrincipal(e.value ?? null);
              }}
              mode="currency"
              currency="BRL"
              locale="pt-BR"
              minFractionDigits={2}
              min={0.01}
              className="w-full"
              inputClassName={DASHBOARD_FORM_INPUT_CLASS}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className={FORM_LABEL_CLASS}>Vencimento original</label>
            <DashboardCalendar
              value={vencimentoOriginal}
              onChange={(e) => {
                setResultado(null);
                setVencimentoOriginal(normalizarDataCalendario(e.value));
              }}
              placeholder="00/00/0000"
              mask="99/99/9999"
              className="w-full"
              inputClassName={DASHBOARD_CALENDAR_INPUT_CLASS}
            />
          </div>
        </div>

        <div>
          <button
            type="button"
            disabled={!podeCalcular || calculando}
            onClick={() => void calcular()}
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white/70 transition hover:border-white/15 hover:bg-white/[0.08] hover:text-white/90 disabled:pointer-events-none disabled:opacity-50"
          >
            {calculando ? "A calcular…" : "Calcular valor presente"}
          </button>
        </div>

        {resultado ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 space-y-1.5">
            <p className={FORM_LABEL_CLASS + " mb-2"}>Memória de cálculo</p>
            {memoriaLinhas.map((linha) => (
              <p key={linha} className="text-sm text-white/75 font-mono">
                {linha}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </DashboardDialog>
  );
}
