"use client";

import { DashboardDialog } from "@/components/dashboard/DashboardDialog";
import { cn } from "@/lib/utils";
import {
  formatContratoRef,
  formatTituloParcelaLabel,
  type TituloCobranca,
  type TituloSmsReguaPreview,
} from "@/lib/fin-service";

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

function formatDateBr(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

type TituloSmsReguaDialogProps = {
  visible: boolean;
  onHide: () => void;
  titulo: TituloCobranca | null;
  preview: TituloSmsReguaPreview | null;
  previewLoading?: boolean;
  previewError?: string | null;
  onConfirm: () => void;
  loading?: boolean;
};

export function TituloSmsReguaDialog({
  visible,
  onHide,
  titulo,
  preview,
  previewLoading = false,
  previewError,
  onConfirm,
  loading = false,
}: TituloSmsReguaDialogProps) {
  const podeConfirmar =
    preview != null && !preview.smsPendenteFila && !previewLoading && !previewError && !loading;

  return (
    <DashboardDialog
      header="Notificar por SMS (régua)"
      visible={visible}
      onHide={onHide}
      className={cn("w-full max-w-2xl border border-white/10 bg-[#071C33] shadow-2xl")}
      pt={DIALOG_PT}
      modal
      draggable={false}
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onHide}
            disabled={loading}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white/60 transition hover:bg-white/[0.08] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!podeConfirmar}
            onClick={onConfirm}
            className="rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500 disabled:pointer-events-none disabled:opacity-50"
          >
            {loading ? "A enfileirar…" : "Confirmar envio"}
          </button>
        </div>
      }
    >
      {titulo ? (
        <div className="flex flex-col gap-5 text-sm text-white/70">
          <p className="text-white/45">
            Contrato{" "}
            <span className="font-medium text-white/85">
              {formatContratoRef(titulo.numeroContrato, titulo.contratoId)}
            </span>
            {" · "}
            parcela{" "}
            <span className="font-medium text-white/85">{formatTituloParcelaLabel(titulo)}</span>
          </p>

          {previewLoading ? (
            <p className="animate-pulse text-white/40">A gerar prévia do SMS…</p>
          ) : null}

          {previewError ? (
            <p className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-rose-200/90">
              {previewError}
            </p>
          ) : null}

          {preview ? (
            <>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm">
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-widest text-white/35">Cliente</dt>
                  <dd className="mt-1 text-white/85">{preview.nomeCliente ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-widest text-white/35">Telefone</dt>
                  <dd className="mt-1 font-mono text-xs text-white/75">{preview.telefone}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                    Empreendimento
                  </dt>
                  <dd className="mt-1 text-white/85">{preview.empreendimento ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-widest text-white/35">Lote</dt>
                  <dd className="mt-1 text-white/85">
                    {preview.quadra ? `Q.${preview.quadra}` : "—"}
                    {preview.lote != null ? ` Lt.${preview.lote}` : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-widest text-white/35">Valor</dt>
                  <dd className="mt-1 text-white/85">{formatMoney(preview.valorNominal)}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-widest text-white/35">Vencimento</dt>
                  <dd className="mt-1 text-white/85">{formatDateBr(preview.vencimento)}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-widest text-white/35">Atraso</dt>
                  <dd className="mt-1 text-amber-200/90">{preview.diasAtraso} dia(s)</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-widest text-white/35">Etapa régua</dt>
                  <dd className="mt-1 text-white/85">
                    {preview.etapaNome} (D+{preview.offsetEtapaDias})
                  </dd>
                </div>
              </dl>

              {preview.aviso ? (
                <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-100/90">
                  {preview.aviso}
                </p>
              ) : null}

              {preview.smsPendenteFila ? (
                <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-amber-200/90">
                  Já existe SMS de cobrança pendente na fila para este título.
                </p>
              ) : null}

              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/35">
                  Prévia da mensagem
                </p>
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-black/25 p-4 font-sans text-sm leading-relaxed text-white/90">
                  {preview.mensagem}
                </pre>
                <p className="mt-2 text-xs text-white/35">
                  Envio manual: usa o modelo SMS da régua conforme os dias de atraso, mesmo com a régua
                  automática desactivada. O SMS entra na fila com agendamento anti-ban.
                </p>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </DashboardDialog>
  );
}
