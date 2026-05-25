"use client";

import { DashboardDialog } from "@/components/dashboard/DashboardDialog";

const DIALOG_PT = {
  header: {
    className:
      "border-b border-white/[0.06] bg-transparent px-6 py-5 font-[family-name:var(--font-playfair)] text-xl font-semibold text-white",
  },
  content: { className: "bg-transparent px-6 py-6" },
  footer: { className: "border-t border-white/[0.06] bg-transparent px-6 py-5" },
  mask: { className: "backdrop-blur-sm bg-black/40" },
};

type TituloRegistrarConvenioDialogProps = {
  visible: boolean;
  onHide: () => void;
  tituloResumo?: string | null;
  convenioNome?: string | null;
  avisoConvenio?: string | null;
  onConfirm: () => void;
  loading?: boolean;
};

export function TituloRegistrarConvenioDialog({
  visible,
  onHide,
  tituloResumo,
  convenioNome,
  avisoConvenio,
  onConfirm,
  loading = false,
}: TituloRegistrarConvenioDialogProps) {
  const podeRegistrar = !avisoConvenio && Boolean(convenioNome);

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
            disabled={loading || !podeRegistrar}
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
            O boleto de <span className="font-medium text-white/80">{tituloResumo}</span> será
            emitido no convênio atrelado ao empreendimento.
          </p>
        ) : (
          <p className="text-sm text-white/50">
            O título será registrado no convênio atrelado ao empreendimento do contrato.
          </p>
        )}
        {avisoConvenio ? (
          <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200/90">
            {avisoConvenio}
          </p>
        ) : (
          <p className="text-sm font-medium text-white/85">Convênio: {convenioNome ?? "—"}</p>
        )}
      </div>
    </DashboardDialog>
  );
}
