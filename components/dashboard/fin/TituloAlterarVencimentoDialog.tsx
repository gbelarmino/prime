"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardDialog } from "@/components/dashboard/DashboardDialog";
import { Calendar } from "primereact/calendar";
import { InputTextarea } from "primereact/inputtextarea";
import type { TituloCobranca } from "@/lib/fin-service";
import { formatBusinessDate } from "@/lib/format-datetime";

export type TituloAlterarVencimentoPayload = {
  novaDataVencimento: string;
  observacao?: string;
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

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

type TituloAlterarVencimentoDialogProps = {
  visible: boolean;
  titulo: TituloCobranca | null;
  loading?: boolean;
  onHide: () => void;
  onConfirm: (payload: TituloAlterarVencimentoPayload) => void | Promise<void>;
};

export function TituloAlterarVencimentoDialog({
  visible,
  titulo,
  loading = false,
  onHide,
  onConfirm,
}: TituloAlterarVencimentoDialogProps) {
  const [novaData, setNovaData] = useState<Date | null>(null);
  const [observacao, setObservacao] = useState("");

  const vencimentoAtual = titulo?.vencimento ? parseIsoDate(titulo.vencimento) : null;

  const minDate = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    if (!vencimentoAtual) return hoje;
    const diaAposVencimento = new Date(vencimentoAtual);
    diaAposVencimento.setDate(diaAposVencimento.getDate() + 1);
    return diaAposVencimento > hoje ? diaAposVencimento : hoje;
  }, [vencimentoAtual]);

  const maxDate = useMemo(() => {
    if (!titulo?.cadastroEm) return undefined;
    const base = new Date(titulo.cadastroEm);
    base.setFullYear(base.getFullYear() + 10);
    return base;
  }, [titulo?.cadastroEm]);

  useEffect(() => {
    if (!visible) return;
    setNovaData(minDate);
    setObservacao("");
  }, [visible, minDate, titulo?.id]);

  const confirmDisabled = !novaData || loading;

  return (
    <DashboardDialog
      visible={visible}
      onHide={onHide}
      header="Alterar vencimento (Unicred)"
      pt={DIALOG_PT}
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="rounded-xl border border-white/10 px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white/60 transition hover:bg-white/5"
            onClick={onHide}
            disabled={loading}
          >
            Voltar
          </button>
          <button
            type="button"
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-blue-500 disabled:opacity-50"
            disabled={confirmDisabled}
            onClick={() => {
              if (!novaData) return;
              void onConfirm({
                novaDataVencimento: toIsoDate(novaData),
                observacao: observacao.trim() || undefined,
              });
            }}
          >
            Solicitar alteração
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <p className="text-sm text-white/50">
          A Unicred processa a instrução de forma assíncrona. O vencimento local só muda após
          confirmação via webhook ou &quot;Sincronizar status&quot;.
        </p>
        {titulo ? (
          <p className="text-sm text-white/70">
            Vencimento atual:{" "}
            <span className="font-medium text-white">{formatBusinessDate(titulo.vencimento)}</span>
          </p>
        ) : null}
        <div>
          <label className={FORM_LABEL_CLASS}>Nova data de vencimento</label>
          <Calendar
            value={novaData}
            onChange={(e) => setNovaData((e.value as Date | null) ?? null)}
            dateFormat="dd/mm/yy"
            minDate={minDate}
            maxDate={maxDate}
            showIcon
            className="w-full"
            inputClassName={FORM_INPUT_CLASS}
            disabled={loading}
          />
        </div>
        <div>
          <label className={FORM_LABEL_CLASS}>Observação (opcional)</label>
          <InputTextarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            rows={3}
            className={FORM_INPUT_CLASS}
            disabled={loading}
          />
        </div>
      </div>
    </DashboardDialog>
  );
}

export function tituloPodeAlterarVencimentoUnicred(
  t: Pick<
    TituloCobranca,
    | "idExternoBanco"
    | "legado"
    | "status"
    | "codigoInstrucaoBaixa"
    | "codigoInstrucaoAlteracaoVencimento"
  >,
): boolean {
  if (t.legado) return false;
  if (!t.idExternoBanco?.trim()) return false;
  if (t.codigoInstrucaoBaixa?.trim() || t.codigoInstrucaoAlteracaoVencimento?.trim()) return false;
  if (t.status === "BAIXA_SOLICITADA") return false;
  return t.status === "EMITIDO" || t.status === "REGISTRADO" || t.status === "VENCIDO";
}
