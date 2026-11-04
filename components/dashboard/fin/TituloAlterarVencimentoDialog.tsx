"use client";

import { useMemo, useState } from "react";
import { DashboardDialog } from "@/components/dashboard/DashboardDialog";
import { InputTextarea } from "primereact/inputtextarea";
import type { TituloCobranca } from "@/lib/fin-service";
import { formatBusinessDate } from "@/lib/format-datetime";
import {
  DashboardCalendar,
  DASHBOARD_CALENDAR_INPUT_CLASS,
  DASHBOARD_FORM_INPUT_CLASS,
} from "@/lib/dashboard-calendar";

export type TituloAlterarVencimentoPayload = {
  novaDataVencimento: string;
  observacao?: string;
};

const FORM_LABEL_CLASS = "text-[10px] font-bold uppercase tracking-[0.2em] text-white/35";

const DIALOG_PT = {
  header: {
    className:
      "border-b border-white/[0.06] bg-transparent px-6 py-5 font-[family-name:var(--font-playfair)] text-xl font-semibold text-white",
  },
  content: { className: "bg-transparent overflow-visible px-6 py-6" },
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

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function resolverMinDate(vencimentoIso: string | null | undefined): Date {
  const hoje = startOfDay(new Date());
  if (!vencimentoIso) return hoje;
  const diaAposVencimento = parseIsoDate(vencimentoIso);
  diaAposVencimento.setDate(diaAposVencimento.getDate() + 1);
  return diaAposVencimento > hoje ? diaAposVencimento : hoje;
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

  const minDate = useMemo(
    () => resolverMinDate(titulo?.vencimento),
    [titulo?.vencimento],
  );

  const maxDate = useMemo(() => {
    if (!titulo?.cadastroEm) return undefined;
    const base = startOfDay(new Date(titulo.cadastroEm));
    base.setFullYear(base.getFullYear() + 10);
    return base;
  }, [titulo?.cadastroEm]);

  const confirmDisabled = !novaData || loading;

  return (
    <DashboardDialog
      visible={visible}
      onShow={() => {
        if (!titulo) return;
        setNovaData(resolverMinDate(titulo.vencimento));
        setObservacao("");
      }}
      onHide={onHide}
      header="Alterar vencimento (Unicred)"
      modal
      draggable={false}
      className="w-full max-w-md border border-white/10 bg-[#071C33] shadow-2xl"
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
            onClick={() => {
              if (!novaData) return;
              void onConfirm({
                novaDataVencimento: toIsoDate(novaData),
                observacao: observacao.trim() || undefined,
              });
            }}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-blue-900/30 transition hover:bg-blue-500 disabled:pointer-events-none disabled:opacity-50"
          >
            {loading ? "A processar…" : "Solicitar alteração"}
          </button>
        </div>
      }
    >
      <p className="mb-4 text-sm text-white/50">
        A Unicred processa a instrução de forma assíncrona. O vencimento local só muda após
        confirmação via webhook ou &quot;Sincronizar status&quot;.
      </p>
      <div className="flex flex-col gap-4">
        {titulo ? (
          <p className="text-sm text-white/70">
            Vencimento atual:{" "}
            <span className="font-medium text-white">{formatBusinessDate(titulo.vencimento)}</span>
          </p>
        ) : null}
        <div className="relative z-20 flex flex-col gap-2">
          <label className={FORM_LABEL_CLASS}>Nova data de vencimento</label>
          <DashboardCalendar
            value={novaData}
            onChange={(e) => setNovaData((e.value as Date | null) ?? null)}
            minDate={minDate}
            maxDate={maxDate}
            placeholder="00/00/0000"
            mask="99/99/9999"
            appendTo="self"
            panelClassName="z-[2000]"
            className="w-full"
            inputClassName={DASHBOARD_CALENDAR_INPUT_CLASS}
            disabled={loading}
          />
          <p className="text-[11px] text-white/35">
            Mínimo {formatBusinessDate(toIsoDate(minDate))} (dia seguinte ao vencimento atual).
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <label className={FORM_LABEL_CLASS}>Observação (opcional)</label>
          <InputTextarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            rows={2}
            className={DASHBOARD_FORM_INPUT_CLASS}
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
