"use client";

import { useState } from "react";
import { DashboardDialog } from "@/components/dashboard/DashboardDialog";
import { InputTextarea } from "primereact/inputtextarea";
import type { RenegociacaoConsultaItem } from "@/lib/renegociacao-types";
import { MODALIDADE_OPTIONS, STATUS_RENEGOCIACAO_LABEL } from "@/lib/renegociacao-types";

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

type RenegociacaoCancelarDialogProps = {
  visible: boolean;
  row: RenegociacaoConsultaItem | null;
  loading?: boolean;
  onHide: () => void;
  onConfirm: (motivo: string) => void | Promise<void>;
};

export function RenegociacaoCancelarDialog({
  visible,
  row,
  loading = false,
  onHide,
  onConfirm,
}: RenegociacaoCancelarDialogProps) {
  const [motivo, setMotivo] = useState("Cancelado pelo operador");
  const confirmDisabled = loading || !motivo.trim();

  const modalidadeLabel =
    row &&
    (MODALIDADE_OPTIONS.find((o) => o.value === row.modalidade)?.label ?? row.modalidade);

  return (
    <DashboardDialog
      visible={visible}
      onHide={onHide}
      header="Cancelar renegociação"
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
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white/70 hover:bg-white/10 disabled:opacity-50"
          >
            Voltar
          </button>
          <button
            type="button"
            disabled={confirmDisabled}
            onClick={() => void onConfirm(motivo.trim())}
            className="rounded-xl border border-rose-500/30 bg-rose-600/20 px-4 py-2 text-xs font-bold uppercase tracking-widest text-rose-200 hover:bg-rose-600/30 disabled:opacity-50"
          >
            {loading ? "Cancelando…" : "Confirmar cancelamento"}
          </button>
        </div>
      }
    >
      {row ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-white/55">
            A renegociação <span className="font-bold text-white">#{row.id}</span>
            {modalidadeLabel ? (
              <>
                {" "}
                ({modalidadeLabel}) ficará com status{" "}
                <span className="font-bold text-white">
                  {STATUS_RENEGOCIACAO_LABEL.CANCELADO}
                </span>
                . Esta ação não se aplica a processos já efetivados.
              </>
            ) : (
              " será cancelada."
            )}
          </p>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="reneg-cancel-motivo" className={FORM_LABEL_CLASS}>
              Motivo
            </label>
            <InputTextarea
              id="reneg-cancel-motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              className={FORM_INPUT_CLASS}
              autoResize
            />
          </div>
        </div>
      ) : null}
    </DashboardDialog>
  );
}
