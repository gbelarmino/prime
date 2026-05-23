"use client";

import { DashboardDialog } from "@/components/dashboard/DashboardDialog";
import { Dropdown } from "primereact/dropdown";
import { convenioDropdownOptions } from "@/lib/convenio-label";
import type { ConvenioBanco } from "@/lib/fin-service";

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

type TituloRegistrarConvenioDialogProps = {
  visible: boolean;
  onHide: () => void;
  tituloResumo?: string | null;
  convenios: ConvenioBanco[];
  convenioId: string | null;
  onConvenioIdChange: (id: string | null) => void;
  onConfirm: () => void;
  loading?: boolean;
};

export function TituloRegistrarConvenioDialog({
  visible,
  onHide,
  tituloResumo,
  convenios,
  convenioId,
  onConvenioIdChange,
  onConfirm,
  loading = false,
}: TituloRegistrarConvenioDialogProps) {
  const options = convenioDropdownOptions(convenios);

  return (
    <DashboardDialog
      header="Registrar boleto"
      visible={visible}
      onHide={onHide}
      className="w-full max-w-md border border-white/10 bg-[#071C33] shadow-2xl"
      pt={DIALOG_PT}
      modal
      draggable={false}
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onHide}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white/60 transition hover:border-white/15 hover:bg-white/[0.08] hover:text-white/90 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={loading || !convenioId}
            onClick={onConfirm}
            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500 disabled:pointer-events-none disabled:opacity-50"
          >
            {loading ? "A registrar…" : "Registrar"}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {tituloResumo ? (
          <p className="text-sm text-white/50">
            Escolha o convênio para emitir o boleto de{" "}
            <span className="font-medium text-white/80">{tituloResumo}</span>.
          </p>
        ) : (
          <p className="text-sm text-white/50">Escolha o convênio bancário para registrar o título.</p>
        )}
        <div className="flex flex-col gap-2">
          <label className={FORM_LABEL_CLASS}>Convênio</label>
          <Dropdown
            value={convenioId}
            options={options}
            onChange={(e) => onConvenioIdChange((e.value as string) ?? null)}
            placeholder="Selecione Asaas ou Unicred"
            className="w-full"
            pt={DROPDOWN_PT}
          />
        </div>
      </div>
    </DashboardDialog>
  );
}
