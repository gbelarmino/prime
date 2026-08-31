"use client";

import { useEffect, useMemo, useState } from "react";
import { InputNumber } from "primereact/inputnumber";
import { toast } from "sonner";
import { DashboardDialog } from "@/components/dashboard/DashboardDialog";
import { DashboardCalendar } from "@/lib/dashboard-calendar";
import {
  calcularMemorialTitulo,
  fetchBoletoEncargosConfig,
  type MemorialCalculoResult,
} from "@/lib/fin-memorial-calculo";
import { normalizarDataCalendario } from "@/lib/fin-vencimento";

const FORM_LABEL_CLASS = "text-[10px] font-bold uppercase tracking-[0.2em] text-white/35";
const FORM_INPUT_CLASS =
  "w-full rounded-xl border border-white/10 bg-white/[0.05] p-3 text-sm text-white placeholder:text-white/25";

const DIALOG_PT = {
  root: { className: "border border-white/10 bg-[#12141a] text-white shadow-2xl" },
  header: { className: "border-b border-white/10 bg-transparent text-white" },
  content: { className: "bg-transparent text-white" },
  footer: { className: "border-t border-white/10 bg-transparent" },
};

function formatDateIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

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

  useEffect(() => {
    if (!visible) return;
    setPrincipal(principalInicial != null && principalInicial > 0 ? principalInicial : null);
    setVencimentoOriginal(null);
    setResultado(null);
    void fetchBoletoEncargosConfig().then((c) => {
      setEncargosLabel(
        `Multa ${c.multaPercentual}% · Juros ${c.jurosMensalPercentual}% a.m. (pro rata 30 dias)`,
      );
    });
  }, [visible, principalInicial]);

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
          vencimento: formatDateIso(vencimentoOriginal),
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
      onHide={onHide}
      header="Calculadora de valor presente"
      modal
      draggable={false}
      className="w-full max-w-lg"
      pt={DIALOG_PT}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-bold uppercase tracking-widest text-white/70 hover:bg-white/[0.08]"
            onClick={onHide}
          >
            Descartar valor
          </button>
          <button
            type="button"
            disabled={!resultado}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-emerald-500 disabled:opacity-40"
            onClick={usarValor}
          >
            Usar valor
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-white/50 leading-relaxed">
          Informe o valor principal e o vencimento original da dívida. O sistema calcula multa e
          juros de mora até hoje ({encargosLabel}) e sugere o total do boleto avulso.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className={FORM_LABEL_CLASS}>Valor principal</label>
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
              inputClassName={FORM_INPUT_CLASS}
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
            />
          </div>
        </div>
        <div>
          <button
            type="button"
            disabled={!podeCalcular || calculando}
            onClick={() => void calcular()}
            className="rounded-xl border border-blue-400/40 bg-blue-500/15 px-4 py-2 text-xs font-bold uppercase tracking-widest text-blue-100 hover:bg-blue-500/25 disabled:opacity-40"
          >
            {calculando ? "Calculando…" : "Calcular valor presente"}
          </button>
        </div>
        {resultado ? (
          <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35 mb-2">
              Memória de cálculo
            </p>
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
