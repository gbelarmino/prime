"use client";

import { useMemo } from "react";
import { DashboardDialog } from "@/components/dashboard/DashboardDialog";
import { cn } from "@/lib/utils";
import {
  formatContratoRef,
  type TituloCobranca,
  type TituloWhatsAppCobrancaLoteResult,
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

const WHATSAPP_LOTE_MAX = 50;

type TituloWhatsAppLoteDialogProps = {
  visible: boolean;
  onHide: () => void;
  titulos: TituloCobranca[];
  resultado?: TituloWhatsAppCobrancaLoteResult | null;
  onConfirm: () => void;
  loading?: boolean;
};

export function TituloWhatsAppLoteDialog({
  visible,
  onHide,
  titulos,
  resultado,
  onConfirm,
  loading = false,
}: TituloWhatsAppLoteDialogProps) {
  const confirmando = !resultado;

  const resumo = useMemo(() => {
    const porContrato = new Map<number, TituloCobranca[]>();
    for (const t of titulos) {
      const list = porContrato.get(t.contratoId) ?? [];
      list.push(t);
      porContrato.set(t.contratoId, list);
    }
    return [...porContrato.entries()].map(([contratoId, items]) => ({
      contratoId,
      numeroContrato: items[0]?.numeroContrato,
      parcelas: items
        .slice()
        .sort((a, b) => a.numeroParcela - b.numeroParcela)
        .map((t) => t.numeroParcela),
    }));
  }, [titulos]);

  const mensagensPrevistas = resumo.length;

  return (
    <DashboardDialog
      header={confirmando ? "Enviar cobrança por WhatsApp" : "Resultado do envio"}
      visible={visible}
      onHide={onHide}
      className={cn(
        "w-full border border-white/10 bg-[#071C33] shadow-2xl",
        confirmando ? "max-w-lg" : "max-w-xl",
      )}
      pt={DIALOG_PT}
      modal
      draggable={false}
      footer={
        <div className="flex justify-end gap-3">
          {confirmando ? (
            <>
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
                disabled={loading || titulos.length === 0 || titulos.length > WHATSAPP_LOTE_MAX}
                onClick={onConfirm}
                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500 disabled:pointer-events-none disabled:opacity-50"
              >
                {loading
                  ? "A enfileirar…"
                  : `Enfileirar ${mensagensPrevistas} envio${mensagensPrevistas === 1 ? "" : "s"}`}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onHide}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500"
            >
              Fechar
            </button>
          )}
        </div>
      }
    >
      {confirmando ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-white/50">
            Apenas títulos na situação <span className="text-white/75">Emitido</span>. Títulos do
            mesmo contrato (quadra/lote) geram{" "}
            <span className="text-white/75">um único WhatsApp</span> com PDF mesclado e lista de
            parcelas no corpo.
          </p>
          {titulos.length > WHATSAPP_LOTE_MAX ? (
            <p className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200/90">
              Selecione no máximo {WHATSAPP_LOTE_MAX} títulos por operação.
            </p>
          ) : null}
          <div className="max-h-64 overflow-y-auto rounded-xl border border-white/10">
            {resumo.map((grupo) => (
              <div
                key={grupo.contratoId}
                className="border-b border-white/[0.06] px-4 py-3 last:border-b-0"
              >
                <p className="text-xs font-bold uppercase tracking-widest text-white/40">
                  {formatContratoRef(grupo.numeroContrato, grupo.contratoId)} · 1 envio
                </p>
                <p className="mt-1 text-sm text-white/75">Parcelas: {grupo.parcelas.join(", ")}</p>
              </div>
            ))}
          </div>
        </div>
      ) : resultado ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-white/60">
            <span className="font-semibold text-emerald-300">
              {resultado.mensagensEnfileiradas}
            </span>{" "}
            de {resultado.grupos.length} envio(s) enfileirado(s)
            {resultado.mensagensFalhas > 0 ? (
              <>
                {" "}
                · <span className="font-semibold text-rose-300">{resultado.mensagensFalhas}</span>{" "}
                falha(s)
              </>
            ) : null}
            {resultado.titulosIgnorados > 0 ? (
              <>
                {" "}
                · <span className="text-white/45">{resultado.titulosIgnorados}</span> título(s)
                ignorado(s)
              </>
            ) : null}
          </p>
          <div className="max-h-72 overflow-y-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-[#0a2540] text-[10px] font-bold uppercase tracking-widest text-white/40">
                <tr>
                  <th className="px-4 py-3">Contrato</th>
                  <th className="px-4 py-3">Parcelas</th>
                  <th className="px-4 py-3">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-white/70">
                {resultado.grupos.map((grupo) => {
                  const ref = titulos.find((t) => t.contratoId === grupo.contratoId);
                  return (
                    <tr key={grupo.contratoId} className="bg-white/[0.02]">
                      <td className="px-4 py-2.5 font-mono">
                        {formatContratoRef(ref?.numeroContrato, grupo.contratoId)}
                      </td>
                      <td className="px-4 py-2.5">{grupo.quantidadeTitulos}</td>
                      <td
                        className={cn(
                          "px-4 py-2.5",
                          grupo.enfileirado ? "text-emerald-300/90" : "text-rose-300/90",
                        )}
                      >
                        {grupo.enfileirado ? "Enfileirado" : grupo.mensagem ?? "Erro"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </DashboardDialog>
  );
}
