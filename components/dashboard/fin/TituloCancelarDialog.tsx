"use client";

import { useState } from "react";
import { DashboardDialog } from "@/components/dashboard/DashboardDialog";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputTextarea } from "primereact/inputtextarea";
import type { TituloCobranca } from "@/lib/fin-service";

export type TituloCancelarPayload = {
  motivo?: string;
  justificativa?: "RECEBIDO" | "NAO_RECEBIDO" | "NAO_INFORMADO";
  valorRecebido?: number;
};

const JUSTIFICATIVA_OPTS = [
  { label: "Não informado", value: "NAO_INFORMADO" as const },
  { label: "Recebido", value: "RECEBIDO" as const },
  { label: "Não recebido", value: "NAO_RECEBIDO" as const },
];

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

type TituloCancelarDialogProps = {
  visible: boolean;
  titulo: TituloCobranca | null;
  loading?: boolean;
  onHide: () => void;
  onConfirm: (payload: TituloCancelarPayload) => void | Promise<void>;
};

export function TituloCancelarDialog({
  visible,
  titulo,
  loading = false,
  onHide,
  onConfirm,
}: TituloCancelarDialogProps) {
  const [motivo, setMotivo] = useState("Cancelado pelo operador");
  const [justificativa, setJustificativa] =
    useState<TituloCancelarPayload["justificativa"]>("NAO_INFORMADO");
  const [valorRecebido, setValorRecebido] = useState<number | null>(null);

  const exigeValor = justificativa === "RECEBIDO";
  const confirmDisabled = loading || (exigeValor && (valorRecebido == null || valorRecebido <= 0));

  return (
    <DashboardDialog
      visible={visible}
      onShow={() => {
        if (titulo) setValorRecebido(titulo.valorNominal);
      }}
      onHide={onHide}
      header="Cancelar título"
      modal
      draggable={false}
      className="w-full max-w-md"
      pt={DIALOG_PT}
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={onHide}
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white/70 transition hover:bg-white/10 disabled:opacity-50"
          >
            Voltar
          </button>
          <button
            type="button"
            disabled={confirmDisabled}
            onClick={() =>
              void onConfirm({
                motivo: motivo.trim() || undefined,
                justificativa,
                valorRecebido: exigeValor ? valorRecebido ?? undefined : undefined,
              })
            }
            className="inline-flex items-center justify-center rounded-xl bg-rose-600 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-rose-900/30 transition hover:bg-rose-500 disabled:pointer-events-none disabled:opacity-50"
          >
            {loading ? "A processar…" : "Solicitar baixa"}
          </button>
        </div>
      }
    >
      <p className="mb-4 text-sm text-white/50">
        Para convênio Unicred, a baixa é solicitada no banco e só conclui após confirmação (webhook ou
        sincronizar status). O título deve estar aberto na carteira.
      </p>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className={FORM_LABEL_CLASS}>Motivo (histórico)</label>
          <InputTextarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={2}
            className={FORM_INPUT_CLASS}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className={FORM_LABEL_CLASS}>Justificativa (Unicred)</label>
          <Dropdown
            value={justificativa}
            options={JUSTIFICATIVA_OPTS}
            onChange={(e) => setJustificativa(e.value)}
            className="w-full"
            pt={DROPDOWN_PT}
          />
        </div>
        {exigeValor ? (
          <div className="flex flex-col gap-2">
            <label className={FORM_LABEL_CLASS}>Valor recebido</label>
            <InputNumber
              value={valorRecebido}
              onValueChange={(e) => setValorRecebido(e.value ?? null)}
              mode="currency"
              currency="BRL"
              locale="pt-BR"
              minFractionDigits={2}
              className="w-full"
              inputClassName={FORM_INPUT_CLASS}
            />
          </div>
        ) : null}
      </div>
    </DashboardDialog>
  );
}
